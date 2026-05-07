import Client, { Model, Schema } from "../dist/index.js"
import { ColumnTypes } from "../dist/types.js"
import type { Column } from "../dist/types"

const schema = new Schema(
	{
		table_name: "test",
		keys: ["key"],
	},
	{
		key: {
			type: ColumnTypes.Text,
		} as Column<string>,
		value: {
			type: ColumnTypes.Text,
		} as Column<string>,
	},
)

const model = new Model("test", schema)

async function main() {
	const client = new Client()
	await client.initialize()

	const batch = client.batch()

	model.batch.update(batch, { key: "test", value: "123" })
	model.batch.update(batch, { key: "test", value: "456" })

	console.time("batch")
	const res = await batch.execute()
	console.timeEnd("batch")

	console.log(await model.findOne({ key: "test" }))
}

main().catch(console.error)
