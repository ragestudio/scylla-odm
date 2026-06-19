import type { Query, FindQueryOptions } from "../types.js"
import type Model from "../model/index.js"
import queryParser from "../utils/queryParser.js"
import type { mapping } from "../driver/mapping/index.js"

export default async function findOneOP<TDoc>(
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
		const result = await this.mapper.get(query, mapperOptions)

		if (!result) {
			return null
		}

		if (options?.raw === true) {
			return result
		}

		return this._wrap(result)
	}

	return this.client.executeWithRetry(operation, `findOne on ${this.name}`)
}
