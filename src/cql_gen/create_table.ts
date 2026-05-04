import type Model from "../model"

export default function (model: Model): string {
	const desc = model.schema
	const tableName = desc.table_name
	const keyspace = model.client.config.keyspace
	const fields = desc.fields
	const key = desc.keys
	const clusteringOrder = desc.clustering_order

	let columnsDef = ""

	for (const fieldName in fields) {
		const field = fields[fieldName]
		const typeStr = typeof field === "string" ? field : (field as any)?.type

		if (!typeStr) {
			throw new Error(
				`Invalid field type for "${fieldName}" in model "${tableName}"`,
			)
		}

		columnsDef += `"${fieldName}" ${typeStr.toUpperCase()}, `
	}

	let pkDef = ""

	if (typeof key === "string") {
		pkDef = `"${key}"`
	} else if (Array.isArray(key) && key.length > 0) {
		const first = key[0]

		if (Array.isArray(first)) {
			pkDef = `(${first.map((k) => `"${k}"`).join(", ")})`
		} else {
			pkDef = `"${first}"`
		}

		for (let i = 1; i < key.length; i++) {
			pkDef += `, "${key[i]}"`
		}
	} else {
		throw new Error(
			`Missing or invalid primary key in model "${tableName}"`,
		)
	}

	let clusterClause = ""

	if (clusteringOrder) {
		let orderDef = ""

		for (const col in clusteringOrder) {
			if (orderDef !== "") {
				orderDef += ", "
			}

			orderDef += `"${col}" ${(clusteringOrder[col] as string).toUpperCase()}`
		}
		if (orderDef !== "") {
			clusterClause = ` WITH CLUSTERING ORDER BY (${orderDef})`
		}
	}

	return `CREATE TABLE IF NOT EXISTS ${keyspace}.${tableName} (${columnsDef}PRIMARY KEY (${pkDef}))${clusterClause}`
}
