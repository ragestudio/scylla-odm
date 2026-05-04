import { TableKeys } from "../types"

export class Schema<T> {
	public readonly table_name: string
	public readonly clustering_order: any
	public readonly keys: TableKeys
	public readonly fields: T

	constructor(params: any, fields: T) {
		this.table_name = params.table_name
		this.keys = params.keys
		this.fields = fields
	}
}

export default Schema
