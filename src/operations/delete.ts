import type Model from "../model"

export default async function (this: Model, query: any) {
	const operation = async () => {
		return await this.mapper.remove(query)
	}

	return this.driver.executeWithRetry(operation, `delete on ${this.name}`)
}
