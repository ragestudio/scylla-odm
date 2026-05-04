import ScyllaClient from ".."
import { Result } from "../result"

import fillDefaults from "../utils/fillDefaults"

import { mapping } from "cassandra-driver/lib/mapping"
import type { DocumentResult, Query, QueryOptions } from "../types"
import type { Schema } from "../schema"

import findOneOP from "../operations/findOne"
import findOP from "../operations/find"
import updateOP from "../operations/update"
import deleteOP from "../operations/delete"
import countAllOP from "../operations/countAll"

import tableExistsOP from "../operations/tableExists"
import syncOP from "../operations/sync"

export class Model<TDoc = any> {
	name: string
	schema: Schema<any>

	get driver(): ScyllaClient {
		return globalThis.__scylla_client?.driver
	}

	get mapper(): mapping.ModelMapper {
		return globalThis.__scylla_client?.mapper
	}

	constructor(name: string, schema: Schema<any>) {
		this.name = name
		this.schema = schema

		if (!Array.isArray(this.schema.keys)) {
			throw new Error(`[${this.name}] model has missing "keys" array`)
		}
		if (!this.schema.table_name) {
			throw new Error(`[${this.name}] model has missing "table_name"`)
		}
		if (!this.schema.fields || typeof this.schema.fields !== "object") {
			throw new Error(
				`[${this.name}] model has missing or invalid "fields"`,
			)
		}
	}

	create = (data: Partial<TDoc>) => this._wrap(data)

	find: {
		(
			query: Query<TDoc>,
			options: QueryOptions & { raw: true },
		): Promise<TDoc[]>
		(
			query?: Query<TDoc>,
			options?: QueryOptions,
		): Promise<DocumentResult<TDoc>[]>
	} = findOP.bind(this)

	findOne: {
		(
			query: Query<TDoc>,
			options: QueryOptions & { raw: true },
		): Promise<TDoc>
		(
			query?: Query<TDoc>,
			options?: QueryOptions,
		): Promise<DocumentResult<TDoc>>
	} = findOneOP.bind(this)

	update: (query: Query<TDoc>) => Promise<DocumentResult<TDoc>> =
		updateOP.bind(this)

	delete: (query: Query<TDoc>) => Promise<mapping.Result> =
		deleteOP.bind(this)

	countAll: () => Promise<number> = countAllOP.bind(this)

	_sync: typeof syncOP = syncOP.bind(this)
	_tableExists: typeof tableExistsOP = tableExistsOP.bind(this)

	_wrap(row: any): DocumentResult<TDoc> | null {
		if (!row) {
			return null
		}

		row = fillDefaults(this.schema, row)

		return new Result<TDoc>(row, this) as DocumentResult<TDoc>
	}
}

export default Model
