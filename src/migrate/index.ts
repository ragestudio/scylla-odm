import type Model from "../model/index.js"
import type { Column } from "../types.js"
import generateCreateTableCQL from "../cql_gen/create_table.js"
import * as readline from "node:readline"

interface ExistingColumn {
	name: string
	kind: string
	position: number
	type: string
	clustering_order: string
}

interface ExistingSchema {
	columns: Map<string, ExistingColumn>
	partitionKeys: string[]
	clusteringKeys: string[]
	clusteringOrder: Map<string, "asc" | "desc">
}

interface ModelSchema {
	columns: Map<string, { type: string; originalType: string }>
	partitionKeys: string[]
	clusteringKeys: string[]
	clusteringOrder: Map<string, "asc" | "desc">
}

interface MigrationResult {
	type: "create" | "alter" | "none"
	cql: string[]
	errors: string[]
	createCql?: string
}

const SYSTEM_COLUMNS_CQL = `
  SELECT column_name, kind, position, type, clustering_order
  FROM system_schema.columns
  WHERE keyspace_name = ? AND table_name = ?
`

function normalizeType(typeStr: string): string {
	return typeStr
		.trim()
		.toLowerCase()
		.replace(/\s+/g, " ")
		.replace(/,\s*/g, ", ")
}

async function getExistingSchema(
	client: any,
	keyspace: string,
	tableName: string,
): Promise<ExistingSchema | null> {
	const result = await client.driver.execute(
		SYSTEM_COLUMNS_CQL,
		[keyspace, tableName],
		{ prepare: true },
	)

	if (result.rows.length === 0) {
		return null
	}

	const columns = new Map<string, ExistingColumn>()

	for (const row of result.rows) {
		columns.set(row.column_name, {
			name: row.column_name,
			kind: row.kind,
			position: row.position,
			type: normalizeType(row.type),
			clustering_order: row.clustering_order || "none",
		})
	}

	const partitionKeys: string[] = []
	const clusteringKeys: string[] = []
	const clusteringOrder = new Map<string, "asc" | "desc">()

	for (const col of columns.values()) {
		if (col.kind === "partition_key") {
			partitionKeys.push(col.name)
		} else if (col.kind === "clustering") {
			clusteringKeys.push(col.name)
			if (col.clustering_order !== "none") {
				clusteringOrder.set(
					col.name,
					col.clustering_order as "asc" | "desc",
				)
			}
		}
	}

	// Sort by position to maintain order
	partitionKeys.sort(
		(a, b) =>
			(columns.get(a)?.position ?? 0) - (columns.get(b)?.position ?? 0),
	)
	clusteringKeys.sort(
		(a, b) =>
			(columns.get(a)?.position ?? 0) - (columns.get(b)?.position ?? 0),
	)

	return { columns, partitionKeys, clusteringKeys, clusteringOrder }
}

function getModelSchema(model: Model): ModelSchema {
	const fields = model.schema.fields
	const keys = model.schema.keys
	const clusteringOrder = model.schema.clustering_order

	const columns = new Map<string, { type: string; originalType: string }>()

	for (const fieldName in fields) {
		const field = fields[fieldName]
		const rawType =
			typeof field === "string"
				? field
				: (field as Column<any>)?.type || "text"
		const originalType = Array.isArray(rawType)
			? rawType.join(", ")
			: rawType

		columns.set(fieldName, {
			type: normalizeType(originalType),
			originalType,
		})
	}

	const partitionKeys: string[] = []
	const clusteringKeys: string[] = []

	if (typeof keys === "string") {
		partitionKeys.push(keys)
	} else if (Array.isArray(keys) && keys.length > 0) {
		const first = keys[0]

		if (Array.isArray(first)) {
			for (const k of first) {
				partitionKeys.push(String(k))
			}
		} else {
			partitionKeys.push(String(first))
		}

		for (let i = 1; i < keys.length; i++) {
			clusteringKeys.push(String(keys[i]))
		}
	}

	const clusterMap = new Map<string, "asc" | "desc">()
	if (clusteringOrder) {
		for (const col in clusteringOrder) {
			clusterMap.set(
				col,
				(clusteringOrder[col] || "asc").toLowerCase() as "asc" | "desc",
			)
		}
	}

	return {
		columns,
		partitionKeys,
		clusteringKeys,
		clusteringOrder: clusterMap,
	}
}

export async function migrateModel(model: Model): Promise<MigrationResult> {
	const client = model.client
	const keyspace = client.config.keyspace!
	const tableName = model.schema.table_name

	const existing = await getExistingSchema(client, keyspace, tableName)

	if (!existing) {
		return {
			type: "create",
			cql: [generateCreateTableCQL(model)],
			errors: [],
		}
	}

	const modelSchema = getModelSchema(model)
	const errors: string[] = []
	const alterStatements: string[] = []

	// Check partition key changes
	const existingPKs = existing.partitionKeys
	const newPKs = modelSchema.partitionKeys

	if (JSON.stringify(existingPKs) !== JSON.stringify(newPKs)) {
		errors.push(
			`partition key mismatch: existing [${existingPKs.join(", ")}] but model has [${newPKs.join(", ")}]` +
				", cannot alter primary key",
		)
	}

	// Check clustering key changes
	const existingCKs = existing.clusteringKeys
	const newCKs = modelSchema.clusteringKeys

	if (JSON.stringify(existingCKs) !== JSON.stringify(newCKs)) {
		errors.push(
			`clustering key mismatch: existing [${existingCKs.join(", ")}] but model has [${newCKs.join(", ")}]` +
				", cannot alter clustering keys",
		)
	}

	// Check clustering order changes (only if keys match)
	if (!errors.length) {
		for (const ck of newCKs) {
			const existingOrder = existing.clusteringOrder.get(ck) || "asc"
			const newOrder = modelSchema.clusteringOrder.get(ck) || "asc"

			if (existingOrder !== newOrder) {
				errors.push(
					`clustering order mismatch for column "${ck}": existing [${existingOrder}] but model has [${newOrder}]` +
						", cannot alter clustering order",
				)
			}
		}
	}

	// Check for type changes in existing columns
	for (const [colName, newCol] of modelSchema.columns) {
		const existingCol = existing.columns.get(colName)

		if (existingCol) {
			if (existingCol.type !== newCol.type) {
				errors.push(
					`type mismatch for column "${colName}": existing [${existingCol.type}] but model has [${newCol.type}]` +
						", cannot alter column type",
				)
			}
		}
	}

	if (errors.length) {
		return {
			type: "alter",
			cql: [],
			errors,
			createCql: generateCreateTableCQL(model),
		}
	}

	// Generate ADD COLUMN statements for new columns
	for (const [colName, newCol] of modelSchema.columns) {
		if (!existing.columns.has(colName)) {
			alterStatements.push(
				`ALTER TABLE ${keyspace}.${tableName} ADD "${colName}" ${newCol.originalType.toUpperCase()}`,
			)
		}
	}

	// Generate DROP COLUMN statements for removed columns
	for (const [colName] of existing.columns) {
		if (!modelSchema.columns.has(colName)) {
			if (
				existingPKs.includes(colName) ||
				existingCKs.includes(colName)
			) {
				errors.push(
					`cannot drop primary/clustering key column "${colName}"`,
				)
				continue
			}

			alterStatements.push(
				`ALTER TABLE ${keyspace}.${tableName} DROP "${colName}"`,
			)
		}
	}

	if (errors.length) {
		return {
			type: "alter",
			cql: [],
			errors,
			createCql: generateCreateTableCQL(model),
		}
	}

	if (alterStatements.length === 0) {
		return {
			type: "none",
			cql: [],
			errors: [],
		}
	}

	return {
		type: "alter",
		cql: alterStatements,
		errors: [],
	}
}

function ask(rl: readline.Interface, question: string): Promise<string> {
	return new Promise((resolve) => {
		rl.question(question, (answer) => {
			resolve(answer.trim())
		})
	})
}

export async function promptMigration(
	modelName: string,
	result: MigrationResult,
): Promise<boolean> {
	if (result.type === "none") {
		return false
	}

	const action = result.type === "create" ? "CREATE" : "ALTER"

	console.log(`\n[${modelName}] ${action} migration:`)
	for (const cql of result.cql) {
		console.log(`  ${cql}`)
	}

	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	})

	const answer = await ask(rl, "\nApply this migration? [y/N]: ")
	rl.close()
	return answer.toLowerCase() === "y"
}

export async function promptResetMigration(
	modelName: string,
	result: MigrationResult,
): Promise<boolean> {
	if (!result.errors.length) {
		return false
	}

	console.log(`\n[${modelName}] alter migration is not possible:`)
	for (const err of result.errors) {
		console.log(`  - ${err}`)
	}

	if (result.createCql) {
		console.log(`\nnew table would be:\n  ${result.createCql}`)
	}

	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	})

	console.log(
		"\n⚠  warning: this will drop and recreate the table, all data will be lost.",
	)

	const firstAnswer = await ask(rl, "continue? [y/N]: ")
	if (firstAnswer.toLowerCase() !== "y") {
		rl.close()
		return false
	}

	const secondAnswer = await ask(
		rl,
		"are you absolutely sure? this action is irreversible. type 'yes' to confirm: ",
	)
	rl.close()
	return secondAnswer === "yes"
}

export async function executeMigration(
	model: Model,
	result: MigrationResult,
): Promise<void> {
	for (const cql of result.cql) {
		await model.client.driver.execute(cql)
	}
}

export async function executeResetMigration(
	model: Model,
	result: MigrationResult,
): Promise<void> {
	const keyspace = model.client.config.keyspace!
	const tableName = model.schema.table_name

	await model.client.driver.execute(
		`DROP TABLE IF EXISTS ${keyspace}.${tableName}`,
	)

	if (result.createCql) {
		await model.client.driver.execute(result.createCql)
	}
}
