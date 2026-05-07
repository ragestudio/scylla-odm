import type Client from "../client"
import type { mapping } from "../driver/mapping"
import type { types } from "../driver/types"

type Long = types.Long

export type BatchExecutionOptions = {
	logged?: boolean
	timestamp?: number | Long
	executionProfile?: string
}

export class Batch {
	private _items: mapping.ModelBatchItem[] = []
	private _client: Client
	private _logged: boolean

	constructor(client: Client, logged: boolean = true) {
		this._client = client
		this._logged = logged
	}

	add(item: mapping.ModelBatchItem): this {
		this._items.push(item)
		return this
	}

	async execute(options?: BatchExecutionOptions): Promise<mapping.Result> {
		if (this._items.length === 0) {
			throw new Error("Cannot execute an empty batch")
		}

		const items = this._items
		this._items = []

		const executionOptions = {
			logged: this._logged,
			...options,
		}

		return this._client.executeWithRetry(
			async () =>
				await this._client.mapper.batch(items, executionOptions),
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
