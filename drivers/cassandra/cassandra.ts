// @ts-ignore
import CassandraDriver from "./driver/index"
import type {
	DriverAdapter,
	BatchItem,
	BatchOptions,
	QueryOperators,
} from "../../src/adapter/types"
import type { Model } from "../../src/model"
import type {
	Query,
	FindQueryOptions,
	InsertQueryOptions,
	UpdateQueryOptions,
	DeleteQueryOptions,
} from "../../src/types"

const { q } = CassandraDriver.mapping

export const cassandraOperators: QueryOperators = {
	notEq(value: any) {
		return q.notEq(value)
	},
	in_(values: any[]) {
		return q.in_(values)
	},
	gt(value: any) {
		return q.gt(value)
	},
	gte(value: any) {
		return q.gte(value)
	},
	lt(value: any) {
		return q.lt(value)
	},
	lte(value: any) {
		return q.lte(value)
	},
	and(...conditions: any[]) {
		if (conditions.length === 0) return {}
		if (conditions.length === 1) return conditions[0]
		return (q.and as any)(...conditions)
	},
}

export class CassandraAdapter implements DriverAdapter {
	private driver: any
	private mapper: any

	operators: QueryOperators = cassandraOperators

	constructor(options: {
		contactPoints: string[]
		localDataCenter: string
		keyspace: string
		port?: number
		pooling?: Record<string, any>
	}) {
		const clientOptions: any = {
			contactPoints: options.contactPoints,
			localDataCenter: options.localDataCenter,
			keyspace: options.keyspace,
			protocolOptions: {
				port: options.port ?? 9042,
			},
		}

		if (options.pooling) {
			clientOptions.pooling = options.pooling
		}

		this.driver = new CassandraDriver.Client(clientOptions)
	}

	async connect(): Promise<void> {
		await this.driver.connect()
	}

	async shutdown(): Promise<void> {
		await this.driver.shutdown()
	}

	initMapper(modelsMap: Record<string, { tables: string[] }>): void {
		this.mapper = new CassandraDriver.mapping.Mapper(this.driver, {
			models: modelsMap,
		})
	}

	getModelMapper(modelName: string): any {
		return this.mapper.forModel(modelName)
	}

	private getMapper(model: Model<any, any>): any {
		return this.mapper.forModel(model.name)
	}

	async find<T>(
		model: Model<any, T>,
		query: Query<T>,
		options?: FindQueryOptions<T>,
	): Promise<T[]> {
		const mapperOptions: any = {
			fields: options?.fields,
			orderBy: options?.orderBy,
			limit: options?.limit,
		}

		const result = await this.getMapper(model).find(query, mapperOptions)
		return result.toArray()
	}

	async findOne<T>(
		model: Model<any, T>,
		query: Query<T>,
		options?: FindQueryOptions<T>,
	): Promise<T | null> {
		const mapperOptions: any = {
			fields: options?.fields,
			orderBy: options?.orderBy,
			limit: options?.limit,
		}

		const result = await this.getMapper(model).get(query, mapperOptions)
		return result ?? null
	}

	async insert<T>(
		model: Model<any, T>,
		data: Record<string, any>,
		options?: InsertQueryOptions<T>,
	): Promise<T[]> {
		const mapperOptions: any = {
			fields: options?.fields,
			ttl: options?.ttl,
			ifNotExists: options?.ifNotExists,
		}

		const result = await this.getMapper(model).insert(data, mapperOptions)
		return result.toArray()
	}

	async update<T>(
		model: Model<any, T>,
		query: Query<T>,
		options?: UpdateQueryOptions<T>,
	): Promise<T[]> {
		const mapperOptions: any = {
			fields: options?.fields,
			orderBy: options?.orderBy,
			limit: options?.limit,
			ttl: options?.ttl,
			ifExists: options?.ifExists,
			when: options?.when,
			deleteOnlyColumns: options?.deleteOnlyColumns,
		}

		const result = await this.getMapper(model).update(query, mapperOptions)
		return result.toArray()
	}

	async remove<T>(
		model: Model<any, T>,
		query: Query<T>,
		options?: DeleteQueryOptions<T>,
	): Promise<any> {
		const mapperOptions: any = {
			fields: options?.fields,
			ttl: options?.ttl,
			ifExists: options?.ifExists,
			when: options?.when,
			deleteOnlyColumns: options?.deleteOnlyColumns,
		}

		return await this.getMapper(model).remove(query, mapperOptions)
	}

	async countAll(model: Model<any, any>): Promise<number> {
		const cql = `SELECT COUNT(1) FROM ${model.client.config.keyspace}.${model.schema.table_name}`
		const result = await this.driver.execute(cql, [], {
			prepare: true,
			readTimeout: 60000,
		})
		return result.rows[0].count.toNumber()
	}

	async tableExists(model: Model<any, any>): Promise<boolean> {
		const cql = `
			SELECT table_name
			FROM system_schema.tables
			WHERE keyspace_name = ?
			AND table_name = ?
		`

		try {
			const result = await this.driver.execute(
				cql,
				[model.client.config.keyspace, model.schema.table_name],
				{ prepare: true },
			)
			return result.rows.length > 0
		} catch {
			return false
		}
	}

	async sync(model: Model<any, any>): Promise<void> {
		const { default: generateCreateTableCQL } =
			await import("../../src/cql_gen/create_table")
		await this.driver.execute(generateCreateTableCQL(model))
	}

	async executeRaw(cql: string, params?: any[], options?: any): Promise<any> {
		return await this.driver.execute(cql, params, options)
	}

	// batch
	async batch(items: BatchItem[], options?: BatchOptions): Promise<any[]> {
		const batchQueries: any[] = []

		for (const item of items) {
			const mapper = this.mapper.forModel(item.model)

			if (item.operation === "insert") {
				const mapperOptions: any = {
					fields: item.options?.fields,
					ttl: item.options?.ttl,
					ifNotExists: item.options?.ifNotExists,
				}
				batchQueries.push(
					mapper.batching.insert(item.data, mapperOptions),
				)
			} else if (item.operation === "update") {
				const mapperOptions: any = {
					fields: item.options?.fields,
					ttl: item.options?.ttl,
					ifExists: item.options?.ifExists,
					when: item.options?.when,
				}
				batchQueries.push(
					mapper.batching.update(item.query, mapperOptions),
				)
			} else if (item.operation === "remove") {
				const mapperOptions: any = {
					fields: item.options?.fields,
					ttl: item.options?.ttl,
					ifExists: item.options?.ifExists,
					when: item.options?.when,
				}
				batchQueries.push(
					mapper.batching.remove(item.query, mapperOptions),
				)
			}
		}

		const result = await this.mapper.batch(batchQueries, {
			logged: options?.logged,
			timestamp: options?.timestamp,
		})

		return [result]
	}

	createBatchInsert<T>(
		model: Model<any, T>,
		data: Record<string, any>,
		options?: InsertQueryOptions<T>,
	): BatchItem {
		return {
			model: model.name,
			operation: "insert",
			data,
			options: {
				fields: options?.fields,
				ttl: options?.ttl,
				ifNotExists: options?.ifNotExists,
			},
		}
	}

	createBatchUpdate<T>(
		model: Model<any, T>,
		query: Query<T>,
		options?: UpdateQueryOptions<T>,
	): BatchItem {
		return {
			model: model.name,
			operation: "update",
			query,
			options: {
				fields: options?.fields,
				ttl: options?.ttl,
				ifExists: options?.ifExists,
				when: options?.when,
			},
		}
	}

	createBatchRemove<T>(
		model: Model<any, T>,
		query: Query<T>,
		options?: DeleteQueryOptions<T>,
	): BatchItem {
		return {
			model: model.name,
			operation: "remove",
			query,
			options: {
				fields: options?.fields,
				ttl: options?.ttl,
				ifExists: options?.ifExists,
				when: options?.when,
			},
		}
	}
}
