import type Client from "../client"
import type { BatchItem, BatchOptions } from "../adapter/types"

export type BatchExecutionOptions = BatchOptions & {
	executionProfile?: string
}

export class Batch {
	private _items: BatchItem[] = []
	private _client: Client
	private _logged: boolean

	constructor(client: Client, logged: boolean = true) {
		this._client = client
		this._logged = logged
	}

	add(item: BatchItem): this {
		this._items.push(item)
		return this
	}

	async execute(options?: BatchExecutionOptions): Promise<any[]> {
		if (this._items.length === 0) {
			throw new Error("Cannot execute an empty batch")
		}

		const items = this._items
		this._items = []

		return this._client.executeWithRetry(
			async () =>
				await this._client.adapter.batch(items, {
					logged: options?.logged ?? this._logged,
					timestamp: options?.timestamp,
				}),
			"batch",
		)
	}

	get size(): number {
		return this._items.length
	}

	clear(): void {
		this._items = []
	}

	logged(value: boolean): this {
		this._logged = value
		return this
	}
}

export default Batch
