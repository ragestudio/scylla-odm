import Client, { Batch } from "../index.js"
import { Document } from "../document/index.js"

import fillDefaults from "../utils/fillDefaults.js"

import type { mapping } from "../driver/mapping/index.js"
import type {
	Query,
	FindQueryOptions,
	InferDoc,
	Doc,
	UpdateQueryOptions,
	InsertQueryOptions,
	DeleteQueryOptions,
} from "../types.js"
import type { Schema } from "../schema/index.js"

import findOneOP from "../operations/findOne.js"
import findOP from "../operations/find.js"
import updateOP from "../operations/update.js"
import deleteOP from "../operations/delete.js"
import countAllOP from "../operations/countAll.js"

import tableExistsOP from "../operations/tableExists.js"
import syncOP from "../operations/sync.js"
import insertOP from "../operations/insert.js"

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

		return globalThis.__scylla_client.mapper.forModel(
			this.schema.table_name,
		)
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

	create = (data: TDoc) => this._wrap(data)
	obj = (data: TDoc) => this._wrap(data)

	batch = {
		update: (
			batch: Batch,
			query: Query<TDoc>,
			options: UpdateQueryOptions<TDoc> = {},
		) => {
			batch.add(
				this.update(query, {
					...options,
					batch: true,
				}),
			)
		},
		insert: (
			batch: Batch,
			query: Query<TDoc>,
			options: InsertQueryOptions<TDoc> = {},
		) => {
			batch.add(
				this.insert(query, {
					...options,
					batch: true,
				}),
			)
		},
		delete: (
			batch: Batch,
			query: Query<TDoc>,
			options: DeleteQueryOptions<TDoc> = {},
		) => {
			batch.add(
				this.delete(query, {
					...options,
					batch: true,
				}),
			)
		},
	}

	find: {
		(
			query: Query<TDoc>,
			options: FindQueryOptions<TDoc> & { raw: true },
		): Promise<TDoc[]>
		(
			query: Query<TDoc>,
			options?: FindQueryOptions<TDoc>,
		): Promise<Doc<TDoc>[]>
	} = (findOP as Function).bind(this) as any

	findOne: {
		(
			query: Query<TDoc>,
			options: FindQueryOptions<TDoc> & { raw: true },
		): Promise<TDoc | null>
		(
			query: Query<TDoc>,
			options?: FindQueryOptions<TDoc>,
		): Promise<Doc<TDoc> | null>
	} = (findOneOP as Function).bind(this) as any

	update: {
		(
			query: Query<TDoc>,
			options: UpdateQueryOptions<TDoc> & { batch: true },
		): mapping.ModelBatchItem
		(
			query: Query<TDoc>,
			options: UpdateQueryOptions<TDoc> & { raw: true },
		): Promise<TDoc[]>
		(
			query: Query<TDoc>,
			options?: UpdateQueryOptions<TDoc>,
		): Promise<Doc<TDoc>[]>
	} = (updateOP as Function).bind(this) as any

	insert: {
		(
			query: Query<TDoc>,
			options: InsertQueryOptions<TDoc> & { batch: true },
		): mapping.ModelBatchItem
		(
			query: Query<TDoc>,
			options: InsertQueryOptions<TDoc> & { raw: true },
		): Promise<TDoc[]>
		(
			query: Query<TDoc>,
			options?: InsertQueryOptions<TDoc>,
		): Promise<Doc<TDoc>[]>
	} = (insertOP as Function).bind(this) as any

	delete: {
		(
			query: Query<TDoc>,
			options: DeleteQueryOptions<TDoc> & { batch: true },
		): mapping.ModelBatchItem
		(
			query: Query<TDoc>,
			options: DeleteQueryOptions<TDoc> & { raw: true },
		): Promise<TDoc[]>
		(
			query: Query<TDoc>,
			options?: DeleteQueryOptions<TDoc>,
		): Promise<Doc<TDoc>[]>
	} = (deleteOP as Function).bind(this) as any

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
