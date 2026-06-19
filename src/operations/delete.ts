import type Model from "../model"
import { DeleteQueryOptions, Query } from "../types"
import queryParser from "../utils/queryParser"

export default function deleteOP<T>(
	this: Model<any, T>,
	query: Query<T>,
	options?: DeleteQueryOptions<T>,
) {
	query = queryParser(this, query)

	if (options?.batch) {
		return this.client.adapter.createBatchRemove(this, query, options)
	}

	const operation = async () => {
		const result = await this.client.adapter.remove(this, query, options)

		if (options?.raw === true) {
			return result
		}

		return this._wrap(result)
	}

	return this.client.executeWithRetry(operation, `delete on ${this.name}`)
}
