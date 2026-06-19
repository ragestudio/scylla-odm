import type Model from "../model"

export default async function (this: Model<any, any>) {
	try {
		return await this.client.adapter.tableExists(this)
	} catch (error) {
		console.error(
			`Failed to check if table "${this.schema.table_name}" exists:`,
			error,
		)
		return false
	}
}
