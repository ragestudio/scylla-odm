import type {
	Client as T_CassandraClient,
	ClientOptions as T_CassandraClientOptions,
	mapping as T_CassandraMapping,
} from "./driver"
import type { ClientConfig } from "./types"

//@ts-ignore
import path from "node:path"
//@ts-ignore
import Cassandra from "./driver"
import Model from "./model"
import Logger from "./logger"

import loadModels from "./utils/loadModels"
import buildMapper from "./utils/buildMapper"
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

		this.config = {
			modelsPath: path.resolve(process.cwd(), "db"),
			contactPoints: config.contactPoints ??
				SCYLLA_CONTACT_POINTS?.split(",") ?? ["127.0.0.1"],
			localDataCenter:
				config.localDataCenter ??
				SCYLLA_LOCAL_DATA_CENTER ??
				"datacenter1",
			keyspace: config.keyspace ?? SCYLLA_KEYSPACE ?? "default_keyspace",
			port: 9042,
			maxRetries: DEFAULT_MAX_RETRIES,
			retryDelay: DEFAULT_RETRY_DELAY,
			...config,
		}

		const clientOptions: T_CassandraClientOptions = {
			contactPoints: this.config.contactPoints,
			localDataCenter: this.config.localDataCenter,
			keyspace: this.config.keyspace,
			protocolOptions: {
				port: this.config.port,
			},
		}

		if (this.config.pooling) {
			clientOptions.pooling = this.config.pooling
		}

		this.driver = new Cassandra.Client(clientOptions)
	}

	config: ClientConfig
	driver: T_CassandraClient
	mapper!: T_CassandraMapping.Mapper
	models: Map<string, Model<any>> = new Map()

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

		this.mapper = new Cassandra.mapping.Mapper(this.driver, {
			models: buildMapper(models),
		})

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
			await this.driver.shutdown()
			this.logger.log("connection closed")

			// @ts-ignore
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
				await this.driver.connect()
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
			`Failed to connect to ScyllaDB after ${this.config.maxRetries} attempts: ${lastError?.message}`,
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

				// check if error is retryable
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

				// if not retryable or last attempt, throw
				throw error
			}
		}

		throw new Error(
			`Operation ${operationName} failed after ${this.config.maxRetries} attempts: ${lastError?.message}`,
		)
	}

	private isRetryableError(error: any): boolean {
		// retry on network errors, timeouts, and certain ScyllaDB errors
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
