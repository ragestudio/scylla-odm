import type { Model } from "../model"
import type {
	Query,
	FindQueryOptions,
	InsertQueryOptions,
	UpdateQueryOptions,
	DeleteQueryOptions,
} from "../types"

export interface DriverAdapter {
	// connection
	connect(): Promise<void>
	shutdown(): Promise<void>

	// crud
	find<T>(
		model: Model<any, T>,
		query: Query<T>,
		options?: FindQueryOptions<T>,
	): Promise<T[]>

	findOne<T>(
		model: Model<any, T>,
		query: Query<T>,
		options?: FindQueryOptions<T>,
	): Promise<T | null>

	insert<T>(
		model: Model<any, T>,
		data: Record<string, any>,
		options?: InsertQueryOptions<T>,
	): Promise<T[]>

	update<T>(
		model: Model<any, T>,
		query: Query<T>,
		options?: UpdateQueryOptions<T>,
	): Promise<T[]>

	remove<T>(
		model: Model<any, T>,
		query: Query<T>,
		options?: DeleteQueryOptions<T>,
	): Promise<any>

	countAll(model: Model<any, any>): Promise<number>

	// schema
	tableExists(model: Model<any, any>): Promise<boolean>
	sync(model: Model<any, any>): Promise<void>

	// batch
	batch(items: BatchItem[], options?: BatchOptions): Promise<any[]>

	createBatchInsert<T>(
		model: Model<any, T>,
		data: Record<string, any>,
		options?: InsertQueryOptions<T>,
	): BatchItem

	createBatchUpdate<T>(
		model: Model<any, T>,
		query: Query<T>,
		options?: UpdateQueryOptions<T>,
	): BatchItem

	createBatchRemove<T>(
		model: Model<any, T>,
		query: Query<T>,
		options?: DeleteQueryOptions<T>,
	): BatchItem

	// query operators
	operators: QueryOperators
}

export interface BatchItem {
	model: string
	operation: "insert" | "update" | "remove"
	data?: Record<string, any>
	query?: Record<string, any>
	options?: Record<string, any>
}

export interface BatchOptions {
	logged?: boolean
	timestamp?: number
}

export interface QueryOperators {
	notEq(value: any): any
	in_(values: any[]): any
	gt(value: any): any
	gte(value: any): any
	lt(value: any): any
	lte(value: any): any
	and(...conditions: any[]): any
}

export interface DriverConfig {
	type: "cassandra" | "mssql"
	// cassandra
	contactPoints?: string[]
	localDataCenter?: string
	keyspace?: string
	port?: number
	pooling?: Record<string, any>
	// mssql
	server?: string
	database?: string
	user?: string
	password?: string
	options?: Record<string, any>
}
