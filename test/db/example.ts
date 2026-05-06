import { Model, Schema, ColumnTypes } from "../../src"
import type { Column } from "../../src/types"

export const schema = new Schema(
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

export const model = new Model("test", schema)

export default model
