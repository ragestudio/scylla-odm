import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { Result, makeModel, setupFakeClient } from "./helpers"

beforeEach(() => {
	vi.clearAllMocks()
	// @ts-ignore
	delete globalThis.__scylla_client
})

afterEach(() => {
	// @ts-ignore
	delete globalThis.__scylla_client
})

function getAdapter() {
	return (globalThis.__scylla_client as any).adapter
}

// ---------------------------------------------------------------------------
// Result
// ---------------------------------------------------------------------------

describe("Result", () => {
	it("should create a document from data and model", () => {
		const model = makeModel()
		const doc = new Result({ key: "k", value: "v" }, model as any)

		// @ts-ignore
		expect(doc.key).toBe("k")
		// @ts-ignore
		expect(doc.value).toBe("v")
	})

	it("should throw when creating with null data", () => {
		const model = makeModel()

		expect(() => new Result(null as any, model as any)).toThrow(
			"Cannot create Document with null or undefined data",
		)
	})

	it("should throw when creating with undefined data", () => {
		const model = makeModel()

		expect(() => new Result(undefined as any, model as any)).toThrow(
			"Cannot create Document with null or undefined data",
		)
	})

	it("should throw when creating with array data", () => {
		const model = makeModel()

		expect(() => new Result([1, 2, 3] as any, model as any)).toThrow(
			"Document data must be an object",
		)
	})

	it("should hide _model property (non-enumerable)", () => {
		const model = makeModel()
		const doc = new Result({ key: "k", value: "v" }, model as any)

		expect(doc._model).toBe(model)
		expect(Object.keys(doc)).not.toContain("_model")
		expect(Object.getOwnPropertyDescriptor(doc, "_model")?.enumerable).toBe(
			false,
		)
	})
})

// ---------------------------------------------------------------------------
// Result.toRaw
// ---------------------------------------------------------------------------

describe("Result.toRaw", () => {
	it("should return a plain object without _model", () => {
		const model = makeModel()
		const doc = new Result({ key: "k", value: "v" }, model as any)

		const raw = doc.toRaw()

		expect(raw).toEqual({ key: "k", value: "v" })
		expect(raw).not.toHaveProperty("_model")
		expect(raw).not.toBeInstanceOf(Result)
	})

	it("should handle nested objects", () => {
		const model = makeModel()
		const doc = new Result(
			{ key: "k", value: "v", extra: { nested: true } },
			model as any,
		)

		const raw = doc.toRaw()

		expect(raw).toEqual({ key: "k", value: "v", extra: { nested: true } })
	})

	it("should not include non-enumerable properties", () => {
		const model = makeModel()
		const doc = new Result({ key: "k", value: "v" }, model as any)

		Object.defineProperty(doc, "hidden", {
			value: "secret",
			enumerable: false,
		})

		const raw = doc.toRaw()

		expect(raw).not.toHaveProperty("hidden")
	})
})

// ---------------------------------------------------------------------------
// Result.save
// ---------------------------------------------------------------------------

describe("Result.save", () => {
	it("should call model.update with the raw document", async () => {
		const model = makeModel()
		setupFakeClient()

		getAdapter().update.mockResolvedValue([{ key: "k", value: "saved" }])

		const doc = model.obj({ key: "k", value: "saved" })
		const result = await doc.save()

		expect(getAdapter().update).toHaveBeenCalledWith(
			model,
			expect.objectContaining({ key: "k", value: "saved" }),
			undefined,
		)
		expect(result).toHaveLength(1)
		expect(result[0]).toBeInstanceOf(Result)
	})

	it("should throw if model.update fails", async () => {
		const model = makeModel()
		setupFakeClient()

		// @ts-ignore
		globalThis.__scylla_client.executeWithRetry = async () => {
			throw new Error("db error")
		}

		const doc = model.obj({ key: "k", value: "v" })

		await expect(doc.save()).rejects.toThrow("Failed to save document")
	})
})

// ---------------------------------------------------------------------------
// Result.delete
// ---------------------------------------------------------------------------

describe("Result.delete", () => {
	it("should call model.delete with the raw document", async () => {
		const model = makeModel()
		setupFakeClient()

		getAdapter().remove.mockResolvedValue({ key: "k", value: "v" })

		const doc = model.obj({ key: "k", value: "v" })
		const result = await doc.delete()

		expect(getAdapter().remove).toHaveBeenCalledWith(
			model,
			expect.objectContaining({ key: "k", value: "v" }),
			undefined,
		)
		expect(result).toBeInstanceOf(Result)
	})

	it("should throw if model.delete fails", async () => {
		const model = makeModel()
		setupFakeClient()

		// @ts-ignore
		globalThis.__scylla_client.executeWithRetry = async () => {
			throw new Error("delete error")
		}

		const doc = model.obj({ key: "k", value: "v" })

		await expect(doc.delete()).rejects.toThrow("Failed to delete document")
	})
})

// ---------------------------------------------------------------------------
// Result.getChangedFields
// ---------------------------------------------------------------------------

describe("Result.getChangedFields", () => {
	it("should detect changed fields", () => {
		const model = makeModel()
		const doc = new Result({ key: "k", value: "new" }, model as any)

		const changed = doc.getChangedFields({ key: "k", value: "old" })

		expect(changed).toContain("value")
		expect(changed).not.toContain("key")
	})

	it("should detect new fields not in original", () => {
		const model = makeModel()
		const doc = new Result(
			{ key: "k", value: "v", extra: "new-field" },
			model as any,
		)

		const changed = doc.getChangedFields({ key: "k", value: "v" })

		expect(changed).toContain("extra")
	})

	it("should return empty array when nothing changed", () => {
		const model = makeModel()
		const doc = new Result({ key: "k", value: "v" }, model as any)

		const changed = doc.getChangedFields({ key: "k", value: "v" })

		expect(changed).toEqual([])
	})
})
