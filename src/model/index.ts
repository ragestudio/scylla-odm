import Client from ".."
import { Document } from "../document"

import fillDefaults from "../utils/fillDefaults"

import { mapping } from "../driver/mapping"
import type { Query, FindQueryOptions, InferDoc, Doc } from "../types"
import type { Schema } from "../schema"

import findOneOP from "../operations/findOne"
import findOP from "../operations/find"
import updateOP from "../operations/update"
import deleteOP from "../operations/delete"
import countAllOP from "../operations/countAll"

import tableExistsOP from "../operations/tableExists"
import syncOP from "../operations/sync"

export class Model<
	TSchema extends Schema<any> = Schema<any>,
	TDoc = InferDoc<TSchema>,
> {
	name: string
	schema: TSchema

	get client(): Client {
		return globalThis.__scylla_client
	}

	get mapper(): mapping.ModelMapper {
		if (!globalThis.__scylla_client?.mapper) {
			throw new Error("No mapper available")
		}

		return globalThis.__scylla_client.mapper.forModel(this.name)
	}

	constructor(name: string, schema: TSchema) {
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
	obj = (data: Partial<TDoc>) => this._wrap(data)

	find: {
		(
			query: Query<TDoc>,
			options: FindQueryOptions<TDoc> & { raw: true },
		): Promise<TDoc[]>
		(
			query?: Query<TDoc>,
			options?: FindQueryOptions<TDoc>,
		): Promise<Doc<TDoc>[]>
	} = (findOP as Function).bind(this) as any

	findOne: {
		(
			query: Query<TDoc>,
			options: FindQueryOptions<TDoc> & { raw: true },
		): Promise<TDoc | null>
		(
			query?: Query<TDoc>,
			options?: FindQueryOptions<TDoc>,
		): Promise<Doc<TDoc> | null>
	} = (findOneOP as Function).bind(this) as any

	update: (query: Query<TDoc>) => Promise<Doc<TDoc>> = (
		updateOP as Function
	).bind(this) as any

	delete: (query: Query<TDoc>) => Promise<mapping.Result> = (
		deleteOP as Function
	).bind(this) as any

	countAll: () => Promise<number> = (countAllOP as Function).bind(this) as any

	_sync: typeof syncOP = (syncOP as Function).bind(this) as any
	_tableExists: typeof tableExistsOP = (tableExistsOP as Function).bind(
		this,
	) as any

	_wrap(row: any): Doc<TDoc> {
		return new Document<TDoc>(
			fillDefaults(this.schema, row),
			this,
		) as Doc<TDoc>
	}
}

export default Model
