import type Model from "../model"
import type { mapping } from "cassandra-driver/lib/mapping"
import type { Query, QueryOptions } from "../types"
import queryParser from "../utils/queryParser"

export default async function findOP<TDoc>(
	this: Model<TDoc>,
	query: Query<TDoc> = {},
	options?: QueryOptions,
) {
	const { $limit, $orderby, ...rest } = query

	let parsedQuery = queryParser(this, rest)

	const docInfo: mapping.FindDocInfo = {}

	if ($limit !== undefined) {
		if (typeof $limit !== "number" || $limit <= 0) {
			throw new TypeError(
				`{$limit} operator must be a number greater than 0`,
			)
		}
		docInfo.limit = $limit
	}

	if ($orderby !== undefined) {
		docInfo.orderBy = $orderby as Record<string, "asc" | "desc">
	}

	const operation = async () => {
		const result = await this.mapper.find(parsedQuery, docInfo)
		const rows = result.toArray()

		if (options?.raw === true) {
			return rows
		}

		return rows.map((row) => this._wrap(row))
	}

	return this.client.executeWithRetry(operation, `find on ${this.name}`)
}
