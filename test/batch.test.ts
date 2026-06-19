import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { Client, Batch, mockAdapter } from "./helpers"

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
		const client = new Client({ adapter: mockAdapter as any })
		const batch = client.batch()

		expect(batch.size).toBe(0)

		const item = {
			model: "test",
			operation: "insert" as const,
			data: { x: 1 },
		}
		batch.add(item)

		expect(batch.size).toBe(1)
	})

	it("should chain add calls", () => {
		const client = new Client({ adapter: mockAdapter as any })
		const batch = client.batch()

		batch
			.add({ model: "test", operation: "insert", data: { x: 1 } })
			.add({ model: "test", operation: "insert", data: { x: 2 } })
			.add({ model: "test", operation: "insert", data: { x: 3 } })

		expect(batch.size).toBe(3)
	})

	it("should execute batch and clear items", async () => {
		mockAdapter.batch.mockResolvedValue([{ inserted: true }])
		const client = new Client({ adapter: mockAdapter as any })

		const batch = client.batch()
		batch.add({ model: "test", operation: "insert", data: { x: 1 } })

		const result = await batch.execute()

		expect(mockAdapter.batch).toHaveBeenCalledWith(
			[{ model: "test", operation: "insert", data: { x: 1 } }],
			{ logged: true },
		)
		expect(result).toEqual([{ inserted: true }])
		expect(batch.size).toBe(0)
	})

	it("should throw when executing an empty batch", async () => {
		const client = new Client({ adapter: mockAdapter as any })
		const batch = client.batch()

		await expect(batch.execute()).rejects.toThrow(
			"Cannot execute an empty batch",
		)
	})

	it("should allow clearing items", () => {
		const client = new Client({ adapter: mockAdapter as any })
		const batch = client.batch()

		batch
			.add({ model: "test", operation: "insert", data: { x: 1 } })
			.add({ model: "test", operation: "insert", data: { x: 2 } })
		batch.clear()

		expect(batch.size).toBe(0)
	})

	it("should allow changing logged flag", async () => {
		mockAdapter.batch.mockResolvedValue([])
		const client = new Client({ adapter: mockAdapter as any })

		const batch = client.batch().logged(false)
		batch.add({ model: "test", operation: "insert", data: { x: 1 } })

		await batch.execute()

		expect(mockAdapter.batch).toHaveBeenCalledWith(
			[{ model: "test", operation: "insert", data: { x: 1 } }],
			{ logged: false },
		)
	})

	it("should accept logged flag in constructor", async () => {
		mockAdapter.batch.mockResolvedValue([])
		const client = new Client({ adapter: mockAdapter as any })

		const batch = client.batch(false)
		batch.add({ model: "test", operation: "insert", data: { x: 1 } })

		await batch.execute()

		expect(mockAdapter.batch).toHaveBeenCalledWith(
			[{ model: "test", operation: "insert", data: { x: 1 } }],
			{ logged: false },
		)
	})

	it("should merge execution options", async () => {
		mockAdapter.batch.mockResolvedValue([])
		const client = new Client({ adapter: mockAdapter as any })

		const batch = client.batch()
		batch.add({ model: "test", operation: "insert", data: { x: 1 } })

		await batch.execute({ logged: false, timestamp: 123456 })

		expect(mockAdapter.batch).toHaveBeenCalledWith(
			[{ model: "test", operation: "insert", data: { x: 1 } }],
			{ logged: false, timestamp: 123456 },
		)
	})
})
