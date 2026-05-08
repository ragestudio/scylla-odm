import { vi } from "vitest"

const mocks = vi.hoisted(() => {
	const mockResult = <T>(rows: T[] = [], applied: boolean = true) => ({
		toArray: () => rows,
		first: () => rows[0] ?? null,
		wasApplied: () => applied,
		forEach: (cb: Function) =>
			rows.forEach((r: any, i: number) => cb(r, i)),
		[Symbol.iterator]: () => rows[Symbol.iterator](),
	})

	const mockQ = {
		in_: (arr: any[]) => ({ __op: "$in", value: arr }),
		gt: (v: any) => ({ __op: "$gt", value: v }),
		gte: (v: any) => ({ __op: "$gte", value: v }),
		lt: (v: any) => ({ __op: "$lt", value: v }),
		lte: (v: any) => ({ __op: "$lte", value: v }),
		notEq: (v: any) => ({ __op: "$ne", value: v }),
		and: (...conditions: any[]) => ({
			__op: "$and",
			value: conditions,
		}),
		incr: (v: any) => ({ __op: "incr", value: v }),
		decr: (v: any) => ({ __op: "decr", value: v }),
		append: (v: any) => ({ __op: "append", value: v }),
		prepend: (v: any) => ({ __op: "prepend", value: v }),
		remove: (v: any) => ({ __op: "remove", value: v }),
	}

	const mockModelMapper = {
		name: "test",
		batching: {
			insert: vi.fn(),
			remove: vi.fn(),
			update: vi.fn(),
		},
		get: vi.fn(),
		find: vi.fn(),
		findAll: vi.fn(),
		insert: vi.fn(),
		update: vi.fn(),
		remove: vi.fn(),
		mapWithQuery: vi.fn(),
	}

	const mockMapper = {
		forModel: vi.fn().mockReturnValue(mockModelMapper),
		batch: vi.fn().mockResolvedValue(mockResult([])),
	}

	const mockDriverClient = {
		connect: vi.fn().mockResolvedValue(undefined),
		shutdown: vi.fn().mockResolvedValue(undefined),
		execute: vi.fn().mockResolvedValue(mockResult([])),
	}

	const mockLoadModels = vi.fn().mockResolvedValue([])

	const mockDriverModule = {
		Client: vi.fn(function () {
			return mockDriverClient
		}),
		mapping: {
			Mapper: vi.fn(function () {
				return mockMapper
			}),
			q: mockQ,
		},
	}

	return {
		mockDriverClient,
		mockMapper,
		mockModelMapper,
		mockQ,
		mockLoadModels,
		mockDriverModule,
	}
})

vi.mock("../src/driver", () => ({
	default: mocks.mockDriverModule,
	mapping: mocks.mockDriverModule.mapping,
}))

vi.mock("../src/driver/mapping", () => ({
	mapping: mocks.mockDriverModule.mapping,
}))

vi.mock("../src/utils/loadModels", () => ({
	default: mocks.mockLoadModels,
}))

// expose mocks globally so test files can access them
declare global {
	var __scylla_mocks: typeof mocks
}

globalThis.__scylla_mocks = mocks

// also expose a mockResult helper on global
globalThis.__scylla_mockResult = <T>(rows: T[], applied: boolean = true) => ({
	toArray: () => rows,
	first: () => rows[0] ?? null,
	wasApplied: () => applied,
	forEach: (cb: Function) => rows.forEach((r: any, i: number) => cb(r, i)),
	[Symbol.iterator]: () => rows[Symbol.iterator](),
})
