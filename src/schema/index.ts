import { TableClusteringOrder, TableKeys } from "../types"

export interface SchemaParams<T> {
	table_name: string
	keys: TableKeys<T>
	clustering_order?: TableClusteringOrder<T>
}

export class Schema<T> {
	public readonly table_name: string
	public readonly keys: TableKeys<T>
	public readonly clustering_order: TableClusteringOrder<T> | undefined

	public readonly fields: T

	constructor(params: SchemaParams<T>, fields: T) {
		if (typeof params !== "object") {
			throw new Error("params must be an object")
		}
		if (typeof params.table_name !== "string") {
			throw new Error("table_name is required")
		}
		if (!Array.isArray(params.keys)) {
			throw new Error("keys is required to be an array")
		}

		this.table_name = params.table_name
		this.clustering_order = params.clustering_order
		this.keys = params.keys

		this.fields = fields
	}
}

export default Schema
