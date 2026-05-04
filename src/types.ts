import Result from "./result"
import { Schema } from "./schema"

export type ClientConfig = {
	modelsPath?: string
	contactPoints?: string[]
	localDataCenter?: string
	keyspace?: string
	port?: number
	maxRetries?: number
	retryDelay?: number
	pooling?: {
		coreConnectionsPerHost?: Record<string, number>
		maxRequestsPerConnection?: number
	}
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

export type QueryOperators<TValue> = {
	$eq?: TValue
	$ne?: TValue
	$in?: TValue[]
	$gt?: TValue
	$gte?: TValue
	$lt?: TValue
	$lte?: TValue
}

export type TableKeys = (string | TableKeys)[]

export interface Column<T> {
	type?: ColumnTypes | string
	required?: boolean
}

export type InferRawData<T> = {
	[K in keyof T as K extends `$${string}` ? never : K]: T[K] extends Column<
		infer U
	>
		? U
		: T[K]
}

export type InferDocument<S> =
	S extends Schema<infer T> ? InferRawData<T> : never

export type DocumentResult<TDoc> = Result<TDoc> & TDoc

export type QueryOptions = {
	raw?: boolean
}

export type OrderBy<TDoc> = { [K in keyof TDoc]?: "asc" | "desc" }

export type Query<TDoc> = {
	[K in keyof TDoc]?: TDoc[K] | QueryOperators<TDoc[K]>
} & {
	$and?: Query<TDoc>[]
	$limit?: number
	$orderby?: OrderBy<TDoc>
}
