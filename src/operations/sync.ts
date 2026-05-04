import type Model from "../model"
import generateCreateTableCQL from "../cql_gen/create_table"

export default async function syncOP(this: Model) {
	const tableExists = await this._tableExists()

	if (tableExists) {
		return
	}

	try {
		await this.driver.client.execute(generateCreateTableCQL(this))

		console.log(`Table "${this.schema.table_name}" created successfully`)
	} catch (error) {
		console.error(
			`Failed to create table "${this.schema.table_name}":`,
			error,
		)
		throw error
	}
}
