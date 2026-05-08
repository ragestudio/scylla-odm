import { describe, it, expect } from "vitest"
import { makeSchema } from "./helpers"

describe("Schema", () => {
	it("should create a schema with table_name, keys and fields", () => {
		const schema = makeSchema()

		expect(schema.table_name).toBe("test")
		expect(schema.keys).toEqual(["key"])
		expect(schema.fields).toHaveProperty("key")
		expect(schema.fields).toHaveProperty("value")
	})
})
