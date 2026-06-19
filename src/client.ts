import type { ClientConfig } from "./types"
import type { DriverAdapter } from "./adapter/types"

//@ts-ignore
import path from "node:path"
import Model from "./model"
import Logger from "./logger"

import loadModels from "./utils/loadModels"
import delay from "./utils/delay"
import { Batch } from "./batch"
import {
	migrateModel,
	promptMigration,
	executeMigration,
	promptResetMigration,
	executeResetMigration,
} from "./migrate"

const DEFAULT_MAX_RETRIES = 3
const DEFAULT_RETRY_DELAY = 1000
const { SCYLLA_CONTACT_POINTS, SCYLLA_LOCAL_DATA_CENTER, SCYLLA_KEYSPACE } =
	process.env

export class Client {
	constructor(config: ClientConfig = {}) {
		if (globalThis.__scylla_client) {
			throw new Error(
				"An instance of Scylla Client is already initialized",
			)
		}

		const driverType = config.driver ?? "cassandra"

		this.config = {
			driver: driverType,
			modelsPath: path.resolve(process.cwd(), "db"),
			contactPoints: config.contactPoints ??
				SCYLLA_CONTACT_POINTS?.split(",") ?? ["127.0.0.1"],
			localDataCenter:
				config.localDataCenter ??
				SCYLLA_LOCAL_DATA_CENTER ??
				"datacenter1",
			keyspace: config.keyspace ?? SCYLLA_KEYSPACE ?? "default_keyspace",
			port: 9042,
			server: config.server ?? "localhost",
			database: config.database ?? "default_db",
			user: config.user ?? "sa",
			password: config.password ?? "",
			maxRetries: DEFAULT_MAX_RETRIES,
			retryDelay: DEFAULT_RETRY_DELAY,
			...config,
		}

		// use pre-built adapter if provided, otherwise load lazily
		if (config.adapter) {
			this._adapter = config.adapter
		} else {
			this._adapter = null!
		}
	}

	config: ClientConfig
	private _adapter: DriverAdapter
	driver!: any
	mapper!: any
	models: Map<string, Model<any>> = new Map()

	get adapter(): DriverAdapter {
		if (!this._adapter) {
			throw new Error("adapter not initialized, call initialize() first")
		}
		return this._adapter
	}

	model(name: string): Model<any> | undefined {
		return this.models.get(name)
	}

	logger: Logger = new Logger()

	async initialize(options: { sync?: boolean } = {}) {
		let models: Model<any>[]

		try {
			models = await loadModels(this.config.modelsPath!)
		} catch (error) {
			throw new Error(
				`Failed to load models: ${(error as Error).message}`,
			)
		}

		models = models.filter((schema) => schema instanceof Model)

		globalThis.__scylla_client = this

		this.logger.log("Connecting...")
		await this.connectWithRetry()
		this.logger.log("Connected")

		for (let model of models) {
			this.models.set(model.name, model as Model<typeof model.schema>)

			if (options?.sync === true) {
				await model._sync()
			}
		}
	}

	batch(logged: boolean = true): Batch {
		return new Batch(this, logged)
	}

	async migrate(modelName?: string): Promise<void> {
		if (!this.models.size) {
			throw new Error("no models loaded, call initialize() first")
		}

		if (this.config.driver === "mssql") {
			this.logger.log(
				"migrate is not supported for mssql driver, use sync instead",
			)
			return
		}

		let models: Model<any>[]

		if (modelName) {
			const model = this.models.get(modelName)
			if (!model) {
				throw new Error(
					`model "${modelName}" not found, ` +
						`available: [${[...this.models.keys()].join(", ")}]`,
				)
			}
			models = [model]
		} else {
			models = [...this.models.values()]
		}

		for (const model of models) {
			const result = await migrateModel(model)

			if (result.type === "none") {
				this.logger.log(
					`[${model.name}] schema is up to date, nothing to migrate`,
				)
				continue
			}

			if (result.errors.length) {
				const shouldReset = await promptResetMigration(
					model.name,
					result,
				)

				if (shouldReset) {
					await executeResetMigration(model, result)
					this.logger.log(`[${model.name}] table reset successfully`)
				} else {
					this.logger.log(`[${model.name}] migration skipped`)
				}
				continue
			}

			const shouldApply = await promptMigration(model.name, result)

			if (shouldApply) {
				await executeMigration(model, result)
				this.logger.log(
					`[${model.name}] migration applied successfully`,
				)
			} else {
				this.logger.log(`[${model.name}] migration skipped`)
			}
		}
	}

	async shutdown(): Promise<void> {
		try {
			if (this._adapter) {
				await this._adapter.shutdown()
			}
			this.logger.log("connection closed")

			delete globalThis.__scylla_client
		} catch (error) {
			this.logger.error("error shutting down connection:", error)
			throw error
		}
	}

	private async connectWithRetry(): Promise<void> {
		let lastError: Error | null = null

		for (let attempt = 1; attempt <= this.config.maxRetries!; attempt++) {
			try {
				await this._adapter.connect()
				return
			} catch (error) {
				lastError = error as Error
				this.logger.warn(
					`Connection attempt ${attempt} failed: ${(error as Error).message}`,
				)

				if (attempt < this.config.maxRetries!) {
					this.logger.log(
						`Retrying in ${this.config.retryDelay}ms...`,
					)
					await delay(this.config.retryDelay!)
				}
			}
		}

		throw new Error(
			`Failed to connect to database after ${this.config.maxRetries} attempts: ${lastError?.message}`,
		)
	}

	async executeWithRetry<T>(
		operation: () => Promise<T>,
		operationName: string = "operation",
	): Promise<T> {
		let lastError: Error | null = null

		for (let attempt = 1; attempt <= this.config.maxRetries!; attempt++) {
			try {
				return await operation()
			} catch (error) {
				lastError = error as Error

				if (
					this.isRetryableError(error) &&
					attempt < this.config.maxRetries!
				) {
					this.logger.warn(
						`Operation ${operationName} attempt ${attempt} failed: ${(error as Error).message}`,
					)
					this.logger.log(
						`Retrying in ${this.config.retryDelay}ms...`,
					)

					await delay(this.config.retryDelay!)
					continue
				}

				throw error
			}
		}

		throw new Error(
			`Operation ${operationName} failed after ${this.config.maxRetries} attempts: ${lastError?.message}`,
		)
	}

	private isRetryableError(error: any): boolean {
		const retryableMessages = [
			"timeout",
			"connection",
			"network",
			"unavailable",
			"overloaded",
			"no hosts available",
		]

		const errorMessage = error.message?.toLowerCase() || ""

		return retryableMessages.some((msg) => errorMessage.includes(msg))
	}
}

export default Client
