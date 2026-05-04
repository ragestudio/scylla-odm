export default (map) => {
	return map.reduce((obj, { name, schema }) => {
		return {
			...obj,
			[name]: {
				tables: [schema.table_name],
			},
		}
	}, {})
}
