import type Model from "../model"

export default async function (this: Model) {
	const cql = `
			SELECT table_name
			FROM system_schema.tables
			WHERE keyspace_name = ?
			AND table_name = ?
		`

	try {
		const result = await this.driver.client.execute(
			cql,
			[this.driver.config.keyspace, this.schema.table_name],
			{
				prepare: true,
			},
		)

		return result.rows.length > 0
	} catch (error) {
		console.error(
			`Failed to check if table "${this.schema.table_name}" exists:`,
			error,
		)

		return false
	}
}
