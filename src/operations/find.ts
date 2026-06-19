import type { Query, FindQueryOptions } from "../types"
import type Model from "../model"
import queryParser from "../utils/queryParser"

export default async function findOP<TDoc>(
	this: Model<any, TDoc>,
	query: Query<TDoc> = {},
	options?: FindQueryOptions<TDoc>,
) {
	query = queryParser(this, query)

	const operation = async () => {
		const rows = await this.client.adapter.find(this, query, options)

		if (options?.raw === true) {
			return rows
		}

		return rows.map((row) => this._wrap(row))
	}

	return this.client.executeWithRetry(operation, `find on ${this.name}`)
}
