import { vi } from "vitest"

import Client_, {
	Model as Model_,
	Schema as Schema_,
	Result as Result_,
	Batch as Batch_,
	ColumnTypes as ColumnTypes_,
} from "../src/index"
import type { Column as Column_ } from "../src/types"

export const Client = Client_
export const Model = Model_
export const Schema = Schema_
export const Result = Result_
export const Batch = Batch_
export const ColumnTypes = ColumnTypes_
export type Column<T> = Column_<T>

function m() {
	return globalThis.__scylla_mocks
}

export const mockLoadModels: ReturnType<typeof vi.fn> = m().mockLoadModels
export const mockDriverClient: Record<string, ReturnType<typeof vi.fn>> = m()
	.mockDriverClient
export const mockMapper: Record<string, ReturnType<typeof vi.fn>> = m()
	.mockMapper
export const mockModelMapper: Record<string, any> = m().mockModelMapper
export const mockAdapter: Record<string, any> = m().mockAdapter

export interface TestDoc {
	key: string
	value: string
}

export function makeSchema() {
	return new Schema_(
		{ table_name: "test", keys: ["key"] },
		{
			key: { type: ColumnTypes_.Text } as Column_<string>,
			value: { type: ColumnTypes_.Text } as Column_<string>,
		},
	)
}

export function makeModel(name: string = "test") {
	return new Model_<Schema_<any>, TestDoc>(name, makeSchema())
}

export function setupFakeClient() {
	const mm = m()
	const adapter = mm.mockAdapter
	// @ts-ignore
	globalThis.__scylla_client = {
		config: { keyspace: "test_ks", driver: "cassandra" },
		mapper: mm.mockMapper,
		driver: {
			execute: vi.fn().mockResolvedValue({
				rows: [{ count: { toNumber: () => 3 } }],
			}),
		},
		executeWithRetry: async (op: Function) => op(),
		adapter,
	}
}

export function mockResult<T>(rows: T[], applied: boolean = true) {
	// @ts-ignore
	return globalThis.__scylla_mockResult<T>(rows, applied)
}
