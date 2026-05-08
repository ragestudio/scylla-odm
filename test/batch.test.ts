import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { Client, Batch, mockMapper } from "./helpers"

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
// Batching
// ---------------------------------------------------------------------------

describe("Batching", () => {
	it("should add items and track size", () => {
		const client = new Client()
		const batch = client.batch()

		expect(batch.size).toBe(0)

		const item = { __batch: true }
		batch.add(item)

		expect(batch.size).toBe(1)
	})

	it("should chain add calls", () => {
		const client = new Client()
		const batch = client.batch()

		batch.add({ __batch: 1 }).add({ __batch: 2 }).add({ __batch: 3 })

		expect(batch.size).toBe(3)
	})

	it("should execute batch and clear items", async () => {
		const client = new Client()
		// batch.execute() accesses this._client.mapper directly on the Client instance
		client.mapper = mockMapper as any

		const batch = client.batch()
		batch.add({ __batch: 1 })

		const result = await batch.execute()

		expect(mockMapper.batch).toHaveBeenCalledWith([{ __batch: 1 }], {
			logged: true,
		})
		expect(batch.size).toBe(0)
	})

	it("should throw when executing an empty batch", async () => {
		const client = new Client()
		const batch = client.batch()

		await expect(batch.execute()).rejects.toThrow(
			"Cannot execute an empty batch",
		)
	})

	it("should allow clearing items", () => {
		const client = new Client()
		const batch = client.batch()

		batch.add({ __batch: 1 }).add({ __batch: 2 })
		batch.clear()

		expect(batch.size).toBe(0)
	})

	it("should allow changing logged flag", async () => {
		const client = new Client()
		client.mapper = mockMapper as any

		const batch = client.batch().logged(false)
		batch.add({ __batch: 1 })

		await batch.execute()

		expect(mockMapper.batch).toHaveBeenCalledWith([{ __batch: 1 }], {
			logged: false,
		})
	})

	it("should accept logged flag in constructor", async () => {
		const client = new Client()
		client.mapper = mockMapper as any

		const batch = client.batch(false)
		batch.add({ __batch: 1 })

		await batch.execute()

		expect(mockMapper.batch).toHaveBeenCalledWith([{ __batch: 1 }], {
			logged: false,
		})
	})

	it("should merge execution options", async () => {
		const client = new Client()
		client.mapper = mockMapper as any

		const batch = client.batch()
		batch.add({ __batch: 1 })

		await batch.execute({ logged: false, timestamp: 123456 })

		expect(mockMapper.batch).toHaveBeenCalledWith([{ __batch: 1 }], {
			logged: false,
			timestamp: 123456,
		})
	})
})
