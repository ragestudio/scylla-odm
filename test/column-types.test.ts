import { describe, it, expect } from "vitest"
import { ColumnTypes } from "./helpers"

describe("ColumnTypes", () => {
	it("should have all expected column types", () => {
		expect(ColumnTypes.Text).toBe("text")
		expect(ColumnTypes.Int).toBe("int")
		expect(ColumnTypes.Bigint).toBe("bigint")
		expect(ColumnTypes.Boolean).toBe("boolean")
		expect(ColumnTypes.Float).toBe("float")
		expect(ColumnTypes.Double).toBe("double")
		expect(ColumnTypes.Timestamp).toBe("timestamp")
		expect(ColumnTypes.Uuid).toBe("uuid")
		expect(ColumnTypes.Varchar).toBe("varchar")
	})
})
