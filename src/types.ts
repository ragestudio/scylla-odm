import type { DriverAdapter } from "./adapter/types"
import Document from "./document"
import { Schema } from "./schema"

export type ClientConfig = {
	modelsPath?: string
	driver?: "cassandra" | "mssql"
	adapter?: DriverAdapter
	maxRetries?: number
	retryDelay?: number
	// cassandra
	contactPoints?: string[]
	localDataCenter?: string
	keyspace?: string
	port?: number
	pooling?: {
		coreConnectionsPerHost?: Record<string, number>
		maxRequestsPerConnection?: number
	}
	// mssql
	server?: string
	database?: string
	user?: string
	password?: string
	mssqlOptions?: Record<string, any>
}

export enum ColumnTypes {
	Ascii = "ascii",
	Bigint = "bigint",
	Blob = "blob",
	Boolean = "boolean",
	Counter = "counter",
	Date = "date",
	Decimal = "decimal",
	Double = "double",
	Duration = "duration",
	Float = "float",
	Frozen = "frozen",
	Inet = "inet",
	Int = "int",
	List = "list",
	Map = "map",
	Set = "set",
	Smallint = "smallint",
	Text = "text",
	Time = "time",
	Timestamp = "timestamp",
	Timeuuid = "timeuuid",
	Tinyint = "tinyint",
	Tuple = "tuple",
	Uuid = "uuid",
	Varchar = "varchar",
	Varint = "varint",
}

export type TableKeys<T> = (keyof T | TableKeys<T>)[]
export type TableClusteringOrder<T> = Partial<Record<keyof T, "asc" | "desc">>

// export interface Column<T> {
// 	type?: ColumnTypes | string
// 	required?: boolean
// }

export interface Column<T, Required extends boolean = false> {
	type?: ColumnTypes | string
	required?: Required
}

//
// QUERY
//
export type QueryOperators<T> = {
	$eq?: T
	$ne?: T
	$in?: T[]
	$gt?: T
	$gte?: T
	$lt?: T
	$lte?: T
	$and?: Query<T>[]
	__v?: number
}

export type Query<T> = {
	[K in keyof T]?: T[K] | QueryOperators<T[K]>
}

export type FindQueryOptions<T> = {
	raw?: boolean
	fields?: string[]
	orderBy?: { [K in keyof T]?: "asc" | "desc" }
	limit?: number
}

export type UpdateQueryOptions<T> = {
	batch?: boolean
	raw?: boolean
	fields?: string[]
	orderBy?: { [K in keyof T]?: "asc" | "desc" }
	limit?: number
	ttl?: number
	ifExists?: boolean
	when?: { [K in keyof T]?: any }
	deleteOnlyColumns?: boolean
}

export type InsertQueryOptions<T> = {
	batch?: boolean
	raw?: boolean
	fields?: string[]
	ttl?: number
	ifNotExists?: boolean
}

export type DeleteQueryOptions<T> = {
	batch?: boolean
	raw?: boolean
	fields?: string[]
	ttl?: number
	ifExists?: boolean
	when?: { [K in keyof T]?: any }
	deleteOnlyColumns?: boolean
}

//
// DOCUMENT
//
export type Doc<TDoc = any> = Document<TDoc> & TDoc

type Prettify<T> = {
	[K in keyof T]: T[K]
} & {}

export type InferDoc<S> =
	S extends Schema<infer T>
		? Prettify<
				{
					[K in keyof T as K extends `$${string}`
						? never
						: T[K] extends Column<any, true>
							? K
							: never]: T[K] extends Column<infer U, any>
						? U
						: T[K]
				} & {
					[K in keyof T as K extends `$${string}`
						? never
						: T[K] extends Column<any, true>
							? never
							: K]?: T[K] extends Column<infer U, any> ? U : T[K]
				}
			>
		: any

export const defineColumn =
	<T>() =>
	<R extends boolean = false>(config: {
		type: any
		required?: R
	}): Column<T, R> => {
		return config as any
	}
