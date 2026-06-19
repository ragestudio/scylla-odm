import type Model from "../model"

export default async function (
	this: Model<any, any>,
	_timeoutMs: number = 60000,
) {
	const operation = async () => {
		return await this.client.adapter.countAll(this)
	}

	return this.client.executeWithRetry(operation, `countAll on ${this.name}`)
}
