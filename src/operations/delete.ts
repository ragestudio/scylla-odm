import type { mapping } from "../driver/index.js"
import type Model from "../model/index.js"
import { DeleteQueryOptions, Query } from "../types.js"
import queryParser from "../utils/queryParser.js"

export default function deleteOP<T>(
	this: Model<any, T>,
	query: Query<T>,
	options?: DeleteQueryOptions<T>,
) {
	query = queryParser(this, query)

	const mapperOptions: mapping.RemoveDocInfo = {
		fields: options?.fields,
		ttl: options?.ttl,
		ifExists: options?.ifExists,
		when: options?.when,
		deleteOnlyColumns: options?.deleteOnlyColumns,
	}

	if (options?.batch) {
		return this.mapper.batching.remove(query, mapperOptions)
	}

	const operation = async () => {
		const result = await this.mapper.remove(query, mapperOptions)

		if (options?.raw === true) {
			return result
		}

		return this._wrap(result)
	}

	return this.client.executeWithRetry(operation, `delete on ${this.name}`)
}
