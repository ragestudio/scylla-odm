import type Model from "../model"

export default async function (
	this: Model<any, any>,
	timeoutMs: number = 60000,
) {
	const cql = `SELECT COUNT(1) FROM ${this.client.config.keyspace}.${this.schema.table_name}`

	const queryOptions = {
		prepare: true,
		readTimeout: timeoutMs,
	}

	const operation = async () => {
		const result = await this.client.driver.execute(cql, [], queryOptions)

		return result.rows[0].count.toNumber()
	}

	return this.client.executeWithRetry(operation, `countAll on ${this.name}`)
}
