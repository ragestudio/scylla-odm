import type { QueryOptions } from "../types"
import type Model from "../model"
import queryParser from "../utils/queryParser"

export default function (this: Model, query: any, options?: QueryOptions) {
	query = queryParser(this, query)

	const operation = async () => {
		let result = await this.mapper.get(query)

		if (!result) {
			return null
		}

		result = this._wrap(result)

		if (options?.raw === true) {
			return result.toRaw()
		}

		return result
	}

	return this.client.executeWithRetry(operation, `findOne on ${this.name}`)
}
