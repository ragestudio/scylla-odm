import type Model from "../model"
import fillDefaults from "../utils/fillDefaults"
import queryParser from "../utils/queryParser"

export default async function updateOP<TDoc>(
	this: Model<any, TDoc>,
	query: any,
) {
	query = fillDefaults(this.schema, query)
	query = queryParser(this, query)

	if (typeof query.__v !== "undefined") {
		if (Number.isNaN(query.__v)) {
			query.__v = 0
		} else {
			query.__v = query.__v + 1
		}
	}

	const operation = async () => {
		await this.mapper.update(query)
		return this._wrap(query)
	}

	return this.client.executeWithRetry(operation, `update on ${this.name}`)
}
