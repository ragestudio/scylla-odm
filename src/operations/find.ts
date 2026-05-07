import type { Query, FindQueryOptions } from "../types"
import type Model from "../model"
import queryParser from "../utils/queryParser"
import { mapping } from "../driver/mapping"

export default async function findOP<TDoc>(
	this: Model<any, TDoc>,
	query: Query<TDoc> = {},
	options?: FindQueryOptions<TDoc>,
) {
	query = queryParser(this, query)

	const mapperOptions: mapping.FindDocInfo = {
		fields: options?.fields,
		orderBy: options?.orderBy,
		limit: options?.limit,
	}

	const operation = async () => {
		const result = await this.mapper.find(query, mapperOptions)
		const rows = result.toArray()

		if (options?.raw === true) {
			return rows
		}

		return rows.map((row) => this._wrap(row))
	}

	return this.client.executeWithRetry(operation, `find on ${this.name}`)
}
