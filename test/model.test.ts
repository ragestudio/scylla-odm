import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import {
	Client,
	Batch,
	Model,
	Schema,
	Result,
	makeModel,
	setupFakeClient,
	mockResult,
	mockModelMapper,
} from "./helpers"

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
// Model
// ---------------------------------------------------------------------------

describe("Model", () => {
	it("should create a model with name and schema", () => {
		const model = makeModel()

		expect(model.name).toBe("test")
		expect(model.schema.table_name).toBe("test")
		expect(model.schema.keys).toEqual(["key"])
	})

	it("should throw if schema has no fields", () => {
		const schema = new Schema(
			{ table_name: "t", keys: ["k"] },
			undefined as any,
		)

		expect(() => new Model("bad", schema)).toThrow(
			'[bad] model has missing or invalid "fields"',
		)
	})

	it("should wrap data with create method returning a Result", () => {
		const model = makeModel()
		const doc = model.create({ key: "mykey", value: "myval" })

		expect(doc).toBeInstanceOf(Result)
		expect(doc.key).toBe("mykey")
		expect(doc.value).toBe("myval")
	})

	it("should wrap data with obj method returning a Result", () => {
		const model = makeModel()
		const doc = model.obj({ key: "k", value: "v" })

		expect(doc).toBeInstanceOf(Result)
		expect(doc.key).toBe("k")
	})

	it("should return undefined from client getter before initialization", () => {
		const model = makeModel()

		expect(model.client).toBeUndefined()
	})

	it("should throw when accessing mapper before initialization", () => {
		const model = makeModel()

		expect(() => model.mapper).toThrow("No mapper available")
	})

	it("should have countAll method", async () => {
		const model = makeModel()
		setupFakeClient()

		getAdapter().countAll.mockResolvedValue(3)

		const count = await model.countAll()

		expect(getAdapter().countAll).toHaveBeenCalled()
		expect(count).toBe(3)
	})
})

// ---------------------------------------------------------------------------
// Model typing
// ---------------------------------------------------------------------------

describe("Model typing", () => {
	it("should wrap data preserving field types", () => {
		const model = makeModel()
		const doc = model.obj({ key: "pk", value: "val" })

		expect(typeof doc.key).toBe("string")
		expect(typeof doc.value).toBe("string")
	})

	it("should allow partial data in obj/create", () => {
		const model = makeModel()
		const doc = model.obj({ key: "pk" })

		expect(doc.key).toBe("pk")
		expect(doc.value).toBeUndefined()
	})

	it("toRaw should return a plain object", () => {
		const model = makeModel()
		const doc = model.obj({ key: "k", value: "v" })
		const raw = doc.toRaw()

		expect(raw).toEqual({ key: "k", value: "v" })
		expect(raw).not.toBeInstanceOf(Result)
	})
})

// ---------------------------------------------------------------------------
// Model.find
// ---------------------------------------------------------------------------

describe("Model.find", () => {
	it("should call adapter.find and return wrapped documents", async () => {
		const model = makeModel()
		setupFakeClient()

		getAdapter().find.mockResolvedValue([
			{ key: "k1", value: "v1" },
			{ key: "k2", value: "v2" },
		])

		const results = await model.find({ key: "k1" })

		expect(getAdapter().find).toHaveBeenCalled()
		expect(results).toHaveLength(2)
		expect(results[0]).toBeInstanceOf(Result)
		expect(results[0].key).toBe("k1")
		expect(results[1].key).toBe("k2")
	})

	it("should return raw objects when raw option is true", async () => {
		const model = makeModel()
		setupFakeClient()

		getAdapter().find.mockResolvedValue([{ key: "k1", value: "v1" }])

		const results = await model.find({ key: "k1" }, { raw: true })

		expect(results[0]).not.toBeInstanceOf(Result)
		expect(results[0]).toEqual({ key: "k1", value: "v1" })
	})

	it("should return empty array for no results", async () => {
		const model = makeModel()
		setupFakeClient()

		getAdapter().find.mockResolvedValue([])

		const results = await model.find({ key: "nonexistent" })

		expect(results).toEqual([])
	})

	it("should pass orderBy and limit options to adapter", async () => {
		const model = makeModel()
		setupFakeClient()

		getAdapter().find.mockResolvedValue([])

		await model.find(
			{ key: "k1" },
			{ orderBy: { value: "desc" }, limit: 10 },
		)

		expect(getAdapter().find).toHaveBeenCalledWith(
			model,
			expect.objectContaining({ key: "k1" }),
			expect.objectContaining({ orderBy: { value: "desc" }, limit: 10 }),
		)
	})
})

// ---------------------------------------------------------------------------
// Model.findOne
// ---------------------------------------------------------------------------

describe("Model.findOne", () => {
	it("should call adapter.findOne and return a wrapped document", async () => {
		const model = makeModel()
		setupFakeClient()

		getAdapter().findOne.mockResolvedValue({ key: "k1", value: "v1" })

		const doc = await model.findOne({ key: "k1" })

		expect(getAdapter().findOne).toHaveBeenCalled()
		expect(doc).toBeInstanceOf(Result)
		expect(doc!.key).toBe("k1")
	})

	it("should return null when no document found", async () => {
		const model = makeModel()
		setupFakeClient()

		getAdapter().findOne.mockResolvedValue(null)

		const doc = await model.findOne({ key: "nonexistent" })

		expect(doc).toBeNull()
	})

	it("should return raw object when raw option is true", async () => {
		const model = makeModel()
		setupFakeClient()

		getAdapter().findOne.mockResolvedValue({ key: "k1", value: "v1" })

		const doc = await model.findOne({ key: "k1" }, { raw: true })

		expect(doc).not.toBeInstanceOf(Result)
		expect(doc).toEqual({ key: "k1", value: "v1" })
	})
})

// ---------------------------------------------------------------------------
// Model.update
// ---------------------------------------------------------------------------

describe("Model.update", () => {
	it("should call adapter.update and return wrapped documents", async () => {
		const model = makeModel()
		setupFakeClient()

		getAdapter().update.mockResolvedValue([{ key: "k1", value: "updated" }])

		const results = await model.update({ key: "k1", value: "updated" })

		expect(getAdapter().update).toHaveBeenCalled()
		expect(results).toHaveLength(1)
		expect(results[0]).toBeInstanceOf(Result)
		expect(results[0].value).toBe("updated")
	})

	it("should return batch item when batch option is true", () => {
		const model = makeModel()
		setupFakeClient()

		const batchItem = {
			model: "test",
			operation: "update",
			query: { key: "k1" },
		}
		getAdapter().createBatchUpdate.mockReturnValue(batchItem)

		const result = model.update(
			{ key: "k1", value: "updated" },
			{ batch: true },
		) as any

		expect(getAdapter().createBatchUpdate).toHaveBeenCalled()
		expect(result).toBe(batchItem)
	})

	it("should return raw objects when raw option is true", async () => {
		const model = makeModel()
		setupFakeClient()

		getAdapter().update.mockResolvedValue([{ key: "k1", value: "rawval" }])

		const results = await model.update(
			{ key: "k1", value: "rawval" },
			{ raw: true },
		)

		expect(results[0]).not.toBeInstanceOf(Result)
		expect(results[0]).toEqual({ key: "k1", value: "rawval" })
	})
})

// ---------------------------------------------------------------------------
// Model.insert
// ---------------------------------------------------------------------------

describe("Model.insert", () => {
	it("should call adapter.insert and return wrapped documents", async () => {
		const model = makeModel()
		setupFakeClient()

		getAdapter().insert.mockResolvedValue([
			{ key: "newkey", value: "newval" },
		])

		const results = await model.insert({ key: "newkey", value: "newval" })

		expect(getAdapter().insert).toHaveBeenCalled()
		expect(results).toHaveLength(1)
		expect(results[0]).toBeInstanceOf(Result)
	})

	it("should return batch item when batch option is true", () => {
		const model = makeModel()
		setupFakeClient()

		const batchItem = {
			model: "test",
			operation: "insert",
			data: { key: "k1" },
		}
		getAdapter().createBatchInsert.mockReturnValue(batchItem)

		const result = model.insert(
			{ key: "k1", value: "v1" },
			{ batch: true },
		) as any

		expect(getAdapter().createBatchInsert).toHaveBeenCalled()
		expect(result).toBe(batchItem)
	})
})

// ---------------------------------------------------------------------------
// Model.delete
// ---------------------------------------------------------------------------

describe("Model.delete", () => {
	it("should call adapter.remove and return result", async () => {
		const model = makeModel()
		setupFakeClient()

		getAdapter().remove.mockResolvedValue({ key: "k1", value: "v1" })

		const result = await model.delete({ key: "k1" })

		expect(getAdapter().remove).toHaveBeenCalled()
		expect(result).toBeInstanceOf(Result)
	})

	it("should return batch item when batch option is true", () => {
		const model = makeModel()
		setupFakeClient()

		const batchItem = {
			model: "test",
			operation: "remove",
			query: { key: "k1" },
		}
		getAdapter().createBatchRemove.mockReturnValue(batchItem)

		const result = model.delete({ key: "k1" }, { batch: true }) as any

		expect(getAdapter().createBatchRemove).toHaveBeenCalled()
		expect(result).toBe(batchItem)
	})
})

// ---------------------------------------------------------------------------
// Model.batch helpers
// ---------------------------------------------------------------------------

describe("Model.batch", () => {
	it("should add update to batch", () => {
		const client = new Client()
		const model = makeModel()
		const batch = client.batch()
		setupFakeClient()

		const batchItem = { model: "test", operation: "update", query: {} }
		getAdapter().createBatchUpdate.mockReturnValue(batchItem)

		model.batch.update(batch, { key: "k", value: "v" } as any)

		expect(batch.size).toBe(1)
		expect(getAdapter().createBatchUpdate).toHaveBeenCalledWith(
			model,
			expect.objectContaining({ key: "k", value: "v" }),
			expect.anything(),
		)
	})

	it("should add insert to batch", () => {
		const client = new Client()
		const model = makeModel()
		const batch = client.batch()
		setupFakeClient()

		const batchItem = { model: "test", operation: "insert", data: {} }
		getAdapter().createBatchInsert.mockReturnValue(batchItem)

		model.batch.insert(batch, { key: "k", value: "v" } as any)

		expect(batch.size).toBe(1)
		expect(getAdapter().createBatchInsert).toHaveBeenCalledWith(
			model,
			expect.objectContaining({ key: "k", value: "v" }),
			expect.anything(),
		)
	})

	it("should add delete to batch", () => {
		const client = new Client()
		const model = makeModel()
		const batch = client.batch()
		setupFakeClient()

		const batchItem = { model: "test", operation: "remove", query: {} }
		getAdapter().createBatchRemove.mockReturnValue(batchItem)

		model.batch.delete(batch, { key: "k" } as any)

		expect(batch.size).toBe(1)
		expect(getAdapter().createBatchRemove).toHaveBeenCalledWith(
			model,
			expect.objectContaining({ key: "k" }),
			expect.anything(),
		)
	})
})
