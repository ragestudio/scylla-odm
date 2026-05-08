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

	it("should throw if schema has no keys", () => {
		const schema = new Schema(
			{ table_name: "t", keys: undefined as any },
			{},
		)

		expect(() => new Model("bad", schema)).toThrow(
			'[bad] model has missing "keys" array',
		)
	})

	it("should throw if schema has keys but not an array", () => {
		const schema = new Schema(
			{ table_name: "t", keys: "not-an-array" as any },
			{},
		)

		expect(() => new Model("bad", schema)).toThrow(
			'[bad] model has missing "keys" array',
		)
	})

	it("should throw if schema has no table_name", () => {
		const schema = new Schema(
			{ table_name: undefined as any, keys: ["k"] },
			{},
		)

		expect(() => new Model("bad", schema)).toThrow(
			'[bad] model has missing "table_name"',
		)
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

		const count = await model.countAll()

		// countAll runs CQL directly via client.driver.execute
		// @ts-ignore
		const fakeDriver = (globalThis.__scylla_client as any).driver
		expect(fakeDriver.execute).toHaveBeenCalledWith(
			"SELECT COUNT(1) FROM test_ks.test",
			[],
			expect.anything(),
		)
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
	it("should call mapper.find and return wrapped documents", async () => {
		const model = makeModel()
		setupFakeClient()

		mockModelMapper.find.mockResolvedValue(
			mockResult([
				{ key: "k1", value: "v1" },
				{ key: "k2", value: "v2" },
			]),
		)

		const results = await model.find({ key: "k1" })

		expect(mockModelMapper.find).toHaveBeenCalled()
		expect(results).toHaveLength(2)
		expect(results[0]).toBeInstanceOf(Result)
		expect(results[0].key).toBe("k1")
		expect(results[1].key).toBe("k2")
	})

	it("should return raw objects when raw option is true", async () => {
		const model = makeModel()
		setupFakeClient()

		mockModelMapper.find.mockResolvedValue(
			mockResult([{ key: "k1", value: "v1" }]),
		)

		const results = await model.find({ key: "k1" }, { raw: true })

		expect(results[0]).not.toBeInstanceOf(Result)
		expect(results[0]).toEqual({ key: "k1", value: "v1" })
	})

	it("should return empty array for no results", async () => {
		const model = makeModel()
		setupFakeClient()

		mockModelMapper.find.mockResolvedValue(mockResult([]))

		const results = await model.find({ key: "nonexistent" })

		expect(results).toEqual([])
	})

	it("should pass orderBy and limit options to mapper", async () => {
		const model = makeModel()
		setupFakeClient()

		mockModelMapper.find.mockResolvedValue(mockResult([]))

		await model.find(
			{ key: "k1" },
			{ orderBy: { value: "desc" }, limit: 10 },
		)

		expect(mockModelMapper.find).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ orderBy: { value: "desc" }, limit: 10 }),
		)
	})
})

// ---------------------------------------------------------------------------
// Model.findOne
// ---------------------------------------------------------------------------

describe("Model.findOne", () => {
	it("should call mapper.get and return a wrapped document", async () => {
		const model = makeModel()
		setupFakeClient()

		mockModelMapper.get.mockResolvedValue({ key: "k1", value: "v1" })

		const doc = await model.findOne({ key: "k1" })

		expect(mockModelMapper.get).toHaveBeenCalled()
		expect(doc).toBeInstanceOf(Result)
		expect(doc!.key).toBe("k1")
	})

	it("should return null when no document found", async () => {
		const model = makeModel()
		setupFakeClient()

		mockModelMapper.get.mockResolvedValue(null)

		const doc = await model.findOne({ key: "nonexistent" })

		expect(doc).toBeNull()
	})

	it("should return raw object when raw option is true", async () => {
		const model = makeModel()
		setupFakeClient()

		mockModelMapper.get.mockResolvedValue({ key: "k1", value: "v1" })

		const doc = await model.findOne({ key: "k1" }, { raw: true })

		expect(doc).not.toBeInstanceOf(Result)
		expect(doc).toEqual({ key: "k1", value: "v1" })
	})
})

// ---------------------------------------------------------------------------
// Model.update
// ---------------------------------------------------------------------------

describe("Model.update", () => {
	it("should call mapper.update and return wrapped documents", async () => {
		const model = makeModel()
		setupFakeClient()

		mockModelMapper.update.mockResolvedValue(
			mockResult([{ key: "k1", value: "updated" }]),
		)

		const results = await model.update({ key: "k1", value: "updated" })

		expect(mockModelMapper.update).toHaveBeenCalled()
		expect(results).toHaveLength(1)
		expect(results[0]).toBeInstanceOf(Result)
		expect(results[0].value).toBe("updated")
	})

	it("should return batch item when batch option is true", () => {
		const model = makeModel()
		setupFakeClient()

		const batchItem = { __batch: true }
		mockModelMapper.batching.update.mockReturnValue(batchItem)

		const result = model.update(
			{ key: "k1", value: "updated" },
			{ batch: true },
		)

		expect(mockModelMapper.batching.update).toHaveBeenCalled()
		expect(result).toBe(batchItem)
	})

	it("should return raw objects when raw option is true", async () => {
		const model = makeModel()
		setupFakeClient()

		mockModelMapper.update.mockResolvedValue(
			mockResult([{ key: "k1", value: "rawval" }]),
		)

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
	it("should call mapper.insert and return wrapped documents", async () => {
		const model = makeModel()
		setupFakeClient()

		mockModelMapper.insert.mockResolvedValue(
			mockResult([{ key: "newkey", value: "newval" }]),
		)

		const results = await model.insert({ key: "newkey", value: "newval" })

		expect(mockModelMapper.insert).toHaveBeenCalled()
		expect(results).toHaveLength(1)
		expect(results[0]).toBeInstanceOf(Result)
	})

	it("should return batch item when batch option is true", () => {
		const model = makeModel()
		setupFakeClient()

		const batchItem = { __batch_insert: true }
		mockModelMapper.batching.insert.mockReturnValue(batchItem)

		const result = model.insert({ key: "k1", value: "v1" }, { batch: true })

		expect(mockModelMapper.batching.insert).toHaveBeenCalled()
		expect(result).toBe(batchItem)
	})
})

// ---------------------------------------------------------------------------
// Model.delete
// ---------------------------------------------------------------------------

describe("Model.delete", () => {
	it("should call mapper.remove and return result", async () => {
		const model = makeModel()
		setupFakeClient()

		mockModelMapper.remove.mockResolvedValue(
			mockResult([{ key: "k1", value: "v1" }]),
		)

		const result = await model.delete({ key: "k1" })

		expect(mockModelMapper.remove).toHaveBeenCalled()
		expect(result).toBeInstanceOf(Result)
	})

	it("should return batch item when batch option is true", () => {
		const model = makeModel()
		setupFakeClient()

		const batchItem = { __batch_remove: true }
		mockModelMapper.batching.remove.mockReturnValue(batchItem)

		const result = model.delete({ key: "k1" }, { batch: true })

		expect(mockModelMapper.batching.remove).toHaveBeenCalled()
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

		model.batch.update(batch, { key: "k", value: "v" })

		expect(batch.size).toBe(1)
		expect(mockModelMapper.batching.update).toHaveBeenCalledWith(
			expect.objectContaining({ key: "k", value: "v" }),
			expect.anything(),
		)
	})

	it("should add insert to batch", () => {
		const client = new Client()
		const model = makeModel()
		const batch = client.batch()
		setupFakeClient()

		model.batch.insert(batch, { key: "k", value: "v" })

		expect(batch.size).toBe(1)
		expect(mockModelMapper.batching.insert).toHaveBeenCalledWith(
			expect.objectContaining({ key: "k", value: "v" }),
			expect.anything(),
		)
	})

	it("should add delete to batch", () => {
		const client = new Client()
		const model = makeModel()
		const batch = client.batch()
		setupFakeClient()

		model.batch.delete(batch, { key: "k" })

		expect(batch.size).toBe(1)
		expect(mockModelMapper.batching.remove).toHaveBeenCalledWith(
			expect.objectContaining({ key: "k" }),
			expect.anything(),
		)
	})
})
