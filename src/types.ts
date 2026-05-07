import { ClientOptions } from "./driver"
import Document from "./document"
import { Schema } from "./schema"
import type { mapping } from "./driver/lib/mapping"

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
} & ClientOptions

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

export type TableKeys = (string | TableKeys)[]

export interface Column<T> {
	type?: ColumnTypes | string
	required?: boolean
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
}

export type Query<T> = {
	[K in keyof T]?: T[K] | QueryOperators<T[K]>
}

export type FindQueryOptions<T> = {
	raw?: boolean
	orderBy?: { [K in keyof T]?: "asc" | "desc" }
} & mapping.FindDocInfo

//
// DOCUMENT
//
export type Doc<TDoc = any> = Document<TDoc> & TDoc

export type InferDoc<S> =
	S extends Schema<infer T>
		? {
				[K in keyof T as K extends `$${string}`
					? never
					: K]: T[K] extends Column<infer U> ? U : T[K]
			}
		: any
