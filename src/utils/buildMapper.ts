export type MapSchema = {
	name: string
	schema: {
		table_name: string
		columns: {
			[name: string]: string
		}
	}
}
export default (map: MapSchema[]) => {
	return map.reduce((obj, { name, schema }) => {
		return {
			...obj,
			[schema.table_name]: {
				tables: [schema.table_name],
			},
		}
	}, {})
}
