import type { mapping } from "../driver/mapping/index.js"
import type Model from "../model/index.js"
import { InsertQueryOptions, Query } from "../types.js"
import fillDefaults from "../utils/fillDefaults.js"
import queryParser from "../utils/queryParser.js"

export default function insertOP<TDoc>(
	this: Model<any, TDoc>,
	query: Query<TDoc>,
	options?: InsertQueryOptions<TDoc>,
) {
	query = fillDefaults(this.schema, query)
	query = queryParser(this, query)

	const mapperOptions: mapping.InsertDocInfo = {
		fields: options?.fields,
		ttl: options?.ttl,
		ifNotExists: options?.ifNotExists,
	}

	if (options?.batch) {
		return this.mapper.batching.insert(query, mapperOptions)
	}

	const operation = async () => {
		const result = await this.mapper.insert(query, mapperOptions)
		const rows = result.toArray()

		if (options?.raw === true) {
			return rows
		}

		return rows.map((row) => this._wrap(row))
	}

	return this.client.executeWithRetry(operation, `insert on ${this.name}`)
}
