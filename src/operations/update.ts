import type Model from "../model"
import { Query, UpdateQueryOptions } from "../types"
import fillDefaults from "../utils/fillDefaults"
import queryParser from "../utils/queryParser"

export default function updateOP<TDoc>(
	this: Model<any, TDoc>,
	query: Query<TDoc>,
	options?: UpdateQueryOptions<TDoc>,
) {
	query = fillDefaults(this.schema, query)
	query = queryParser(this, query)

	if (options?.batch) {
		return this.client.adapter.createBatchUpdate(this, query, options)
	}

	const operation = async () => {
		const rows = await this.client.adapter.update(this, query, options)

		if (options?.raw === true) {
			return rows
		}

		return rows.map((row) => this._wrap(row))
	}

	return this.client.executeWithRetry(operation, `update on ${this.name}`)
}
