import type { mapping } from "../driver/mapping/index.js"
import type Model from "../model/index.js"
import { Query, UpdateQueryOptions } from "../types.js"
import fillDefaults from "../utils/fillDefaults.js"
import queryParser from "../utils/queryParser.js"

export default function updateOP<TDoc>(
	this: Model<any, TDoc>,
	query: Query<TDoc>,
	options?: UpdateQueryOptions<TDoc>,
) {
	query = fillDefaults(this.schema, query)
	query = queryParser(this, query)

	const mapperOptions: mapping.UpdateDocInfo = {
		fields: options?.fields,
		orderBy: options?.orderBy,
		limit: options?.limit,
		ttl: options?.ttl,
		ifExists: options?.ifExists,
		when: options?.when,
		deleteOnlyColumns: options?.deleteOnlyColumns,
	}

	// if (typeof query.__v !== "undefined") {
	// 	if (Number.isNaN(query.__v)) {
	// 		query.__v = 0
	// 	} else {
	// 		query.__v = query.__v + 1
	// 	}
	// }

	if (options?.batch) {
		return this.mapper.batching.update(query, mapperOptions)
	}

	const operation = async () => {
		const result = await this.mapper.update(query, mapperOptions)
		const rows = result.toArray()

		if (options?.raw === true) {
			return rows
		}

		return rows.map((row) => this._wrap(row))
	}

	return this.client.executeWithRetry(operation, `update on ${this.name}`)
}
