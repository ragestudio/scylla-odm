import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import {
	Client,
	Batch,
	mockLoadModels,
	mockDriverClient,
	makeModel,
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
// Client
// ---------------------------------------------------------------------------

describe("Client", () => {
	it("should create a client with default config", () => {
		const client = new Client()

		expect(client.config.contactPoints).toEqual(["127.0.0.1"])
		expect(client.config.localDataCenter).toBe("datacenter1")
		expect(client.config.keyspace).toBe("default_keyspace")
		expect(client.config.port).toBe(9042)
		expect(client.config.maxRetries).toBe(3)
		expect(client.config.retryDelay).toBe(1000)
	})

	it("should create a client with custom config", () => {
		const client = new Client({
			contactPoints: ["10.0.0.1", "10.0.0.2"],
			localDataCenter: "dc2",
			keyspace: "my_keyspace",
			port: 9043,
		})

		expect(client.config.contactPoints).toEqual(["10.0.0.1", "10.0.0.2"])
		expect(client.config.localDataCenter).toBe("dc2")
		expect(client.config.keyspace).toBe("my_keyspace")
		expect(client.config.port).toBe(9043)
	})

	it("should create a client with pooling config", () => {
		const client = new Client({
			pooling: {
				coreConnectionsPerHost: { "1": 2 },
				maxRequestsPerConnection: 100,
			},
		})

		expect(client.config.pooling).toBeDefined()
		expect(client.config.pooling!.coreConnectionsPerHost).toEqual({
			"1": 2,
		})
		expect(client.config.pooling!.maxRequestsPerConnection).toBe(100)
	})

	it("should throw if a client instance already exists", () => {
		// @ts-ignore
		globalThis.__scylla_client = {}

		expect(() => new Client()).toThrow(
			"An instance of Scylla Client is already initialized",
		)
	})

	it("should expose a models map", () => {
		const client = new Client()

		expect(client.models).toBeInstanceOf(Map)
		expect(client.models.size).toBe(0)
	})

	it("should return undefined for unknown model", () => {
		const client = new Client()

		expect(client.model("nonexistent")).toBeUndefined()
	})

	it("should create a batch instance", () => {
		const client = new Client()
		const batch = client.batch()

		expect(batch).toBeInstanceOf(Batch)
	})

	it("should create a logged batch by default", () => {
		const client = new Client()
		const batch = client.batch()

		expect(batch.size).toBe(0)
	})

	it("should shutdown and clean up global client", async () => {
		const client = new Client()
		// @ts-ignore
		globalThis.__scylla_client = client

		await client.shutdown()

		expect(mockDriverClient.shutdown).toHaveBeenCalled()
		// @ts-ignore
		expect(globalThis.__scylla_client).toBeUndefined()
	})

	it("should have a logger instance", () => {
		const client = new Client()
		expect(client.logger).toBeDefined()
		expect(typeof client.logger.log).toBe("function")
		expect(typeof client.logger.warn).toBe("function")
		expect(typeof client.logger.error).toBe("function")
	})
})

// ---------------------------------------------------------------------------
// Client.initialize
// ---------------------------------------------------------------------------

describe("Client.initialize", () => {
	it("should load models and connect to the driver", async () => {
		const model = makeModel()
		mockLoadModels.mockResolvedValue([model])

		const client = new Client()
		await client.initialize()

		expect(mockLoadModels).toHaveBeenCalled()
		expect(mockDriverClient.connect).toHaveBeenCalled()
		expect(client.models.has("test")).toBe(true)
		expect(client.models.get("test")).toBe(model)
		// @ts-ignore
		expect(globalThis.__scylla_client).toBe(client)
	})

	it("should skip non-Model instances from loaded models", async () => {
		const model = makeModel()
		const notAModel = { name: "not-a-model" }
		mockLoadModels.mockResolvedValue([model, notAModel])

		const client = new Client()
		await client.initialize()

		expect(client.models.has("test")).toBe(true)
		expect(client.models.has("not-a-model")).toBe(false)
	})

	it("should throw if loadModels fails", async () => {
		mockLoadModels.mockRejectedValue(new Error("load error"))

		const client = new Client()

		await expect(client.initialize()).rejects.toThrow(
			"Failed to load models",
		)
	})

	it("should sync models when sync option is true", async () => {
		const model = makeModel()
		mockLoadModels.mockResolvedValue([model])

		const syncSpy = vi.spyOn(model, "_sync").mockResolvedValue(undefined)

		const client = new Client()
		await client.initialize({ sync: true })

		expect(syncSpy).toHaveBeenCalled()
	})
})

// ---------------------------------------------------------------------------
// Client.executeWithRetry
// ---------------------------------------------------------------------------

describe("Client.executeWithRetry", () => {
	it("should execute operation successfully on first try", async () => {
		const client = new Client()
		const operation = vi.fn().mockResolvedValue("success")

		const result = await client.executeWithRetry(operation, "test-op")

		expect(result).toBe("success")
		expect(operation).toHaveBeenCalledTimes(1)
	})

	it("should retry on retryable error", async () => {
		const client = new Client()
		const operation = vi
			.fn()
			.mockRejectedValueOnce(new Error("connection timeout"))
			.mockResolvedValueOnce("success-after-retry")

		const result = await client.executeWithRetry(operation, "test-op")

		expect(result).toBe("success-after-retry")
		expect(operation).toHaveBeenCalledTimes(2)
	})

	it("should not retry on non-retryable error", async () => {
		const client = new Client()
		const operation = vi
			.fn()
			.mockRejectedValue(new Error("validation error"))

		await expect(
			client.executeWithRetry(operation, "test-op"),
		).rejects.toThrow("validation error")
		expect(operation).toHaveBeenCalledTimes(1)
	})
})
