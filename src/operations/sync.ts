import type Model from "../model"

export default async function syncOP(this: Model<any, any>) {
	const exists = await this.client.adapter.tableExists(this)

	if (exists) {
		return
	}

	try {
		await this.client.adapter.sync(this)

		console.log(`Table "${this.schema.table_name}" created successfully`)
	} catch (error) {
		console.error(
			`Failed to create table "${this.schema.table_name}":`,
			error,
		)
		throw error
	}
}
