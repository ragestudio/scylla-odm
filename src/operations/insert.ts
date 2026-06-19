import type Model from "../model"
import { InsertQueryOptions, Query } from "../types"
import fillDefaults from "../utils/fillDefaults"
import queryParser from "../utils/queryParser"

export default function insertOP<TDoc>(
	this: Model<any, TDoc>,
	query: Query<TDoc>,
	options?: InsertQueryOptions<TDoc>,
) {
	query = fillDefaults(this.schema, query)
	query = queryParser(this, query)

	if (options?.batch) {
		return this.client.adapter.createBatchInsert(
			this,
			query as any,
			options,
		)
	}

	const operation = async () => {
		const rows = await this.client.adapter.insert(
			this,
			query as any,
			options,
		)

		if (options?.raw === true) {
			return rows
		}

		return rows.map((row) => this._wrap(row))
	}

	return this.client.executeWithRetry(operation, `insert on ${this.name}`)
}
