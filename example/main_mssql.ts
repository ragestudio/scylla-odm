import Client from "../dist/client.js"
import { Model, Schema, ColumnTypes } from "../dist/index.js"
import type { Column } from "../dist/types"

import { MssqlAdapter } from "../drivers/mssql/src/mssql.js"

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
	const client = new Client({
		// queryOptions: {
		// 	logged: true,
		// 	traceQuery: true,
		// },
		adapter: MssqlAdapter,
	})

	console.time("client.initialize")
	await client.initialize({
		sync: true,
	})
	console.timeEnd("client.initialize")

	console.time("Example.obj")
	const newObj = model.obj({
		key: "test",
		value: new Date().toISOString(),
	})
	console.timeEnd("Example.obj")

	console.time("newObj.save")
	await newObj.save()
	console.timeEnd("newObj.save")

	console.time("newObj.toRaw")
	const raw = newObj.toRaw()
	console.timeEnd("newObj.toRaw")

	console.log(raw.key, raw.value)
	console.log(newObj.key, newObj.value)

	console.time("Example.findOne")
	const finded = await model.findOne({ key: "test" })
	console.timeEnd("Example.findOne")

	if (!finded) {
		console.log("not found")
		return
	}

	console.log(finded)
}

main()
