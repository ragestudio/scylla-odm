import type { Query, FindQueryOptions } from "../types"
import type Model from "../model"
import queryParser from "../utils/queryParser"

export default async function findOneOP<TDoc>(
	this: Model<any, TDoc>,
	query: Query<TDoc> = {},
	options?: FindQueryOptions<TDoc>,
) {
	query = queryParser(this, query)

	const operation = async () => {
		const result = await this.mapper.get(query, options)

		if (!result) {
			return null
		}

		if (options?.raw === true) {
			return result.toRaw()
		}

		return this._wrap(result)
	}

	return this.client.executeWithRetry(operation, `findOne on ${this.name}`)
}
