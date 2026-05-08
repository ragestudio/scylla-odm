import { describe, it, expect } from "vitest"
import { makeSchema, Schema } from "./helpers"

describe("Schema", () => {
	it("should create a schema with table_name, keys and fields", () => {
		const schema = makeSchema()

		expect(schema.table_name).toBe("test")
		expect(schema.keys).toEqual(["key"])
		expect(schema.fields).toHaveProperty("key")
		expect(schema.fields).toHaveProperty("value")
	})

	it("should throw if schema has no params", () => {
		// @ts-expect-error
		expect(() => new Schema()).toThrow("params must be an object")
	})

	it("should throw if schema has no keys", () => {
		expect(
			() => new Schema({ table_name: "t", keys: undefined as any }, {}),
		).toThrow("keys is required to be an array")
	})

	it("should throw if schema has keys but not an array", () => {
		expect(
			() =>
				new Schema(
					{ table_name: "t", keys: "not-an-array" as any },
					{},
				),
		).toThrow("keys is required to be an array")
	})

	it("should throw if schema has no table_name", () => {
		// @ts-expect-error
		expect(() => new Schema({ keys: ["k"] }, {})).toThrow(
			"table_name is required",
		)
	})
})
