import Client from "../dist/client.js"
import { Model, Schema, ColumnTypes } from "../dist/index.js"
import type { Column } from "../dist/types"

const schema = new Schema(
	{
		table_name: "test",
		keys: [["key"], "value"],
	},
	{
		key: {
			type: ColumnTypes.Text,
		} as Column<string>,
		value: {
			type: ColumnTypes.Text,
		} as Column<string>,
		lol: {
			type: ColumnTypes.Text,
		} as Column<string>,
	},
)

const model = new Model("test", schema)

async function main() {
	const client = new Client({
		socketOptions: {
			tcpNoDelay: true,
		},
	})

	await client.initialize()
	client.models.set("test", model)

	await client.migrate()
}

main()
