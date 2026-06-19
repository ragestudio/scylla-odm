import type {
	DriverAdapter,
	BatchItem,
	BatchOptions,
	QueryOperators,
} from "../../../src/adapter/types"
import type { Model } from "../../../src/model"
import type {
	Query,
	FindQueryOptions,
	InsertQueryOptions,
	UpdateQueryOptions,
	DeleteQueryOptions,
} from "../../../src/types"

// lazy load mssql to avoid requiring it for cassandra users
async function loadMssql(): Promise<any> {
	try {
		// @ts-ignore - mssql is an optional peer dependency
		return await import("mssql")
	} catch (error) {
		throw new Error(
			`mssql driver failed to load: ${(error as Error).message}`,
		)
	}
}

// query operator helpers that translate to SQL
export const mssqlOperators: QueryOperators = {
	notEq(value: any) {
		return { $ne: value }
	},
	in_(values: any[]) {
		return { $in: values }
	},
	gt(value: any) {
		return { $gt: value }
	},
	gte(value: any) {
		return { $gte: value }
	},
	lt(value: any) {
		return { $lt: value }
	},
	lte(value: any) {
		return { $lte: value }
	},
	and(...conditions: any[]) {
		return { $and: conditions }
	},
}

function sqlTypeFromField(field: any): string {
	if (!field) return "NVARCHAR(MAX)"

	if (typeof field === "string") {
		const typeMap: Record<string, string> = {
			text: "NVARCHAR(MAX)",
			varchar: "NVARCHAR(MAX)",
			ascii: "VARCHAR(MAX)",
			int: "INT",
			bigint: "BIGINT",
			smallint: "SMALLINT",
			tinyint: "TINYINT",
			boolean: "BIT",
			double: "FLOAT",
			float: "FLOAT",
			decimal: "DECIMAL(18,6)",
			timestamp: "DATETIME2",
			date: "DATE",
			time: "TIME",
			uuid: "UNIQUEIDENTIFIER",
			blob: "VARBINARY(MAX)",
			inet: "NVARCHAR(50)",
			duration: "NVARCHAR(100)",
			counter: "BIGINT",
			timeuuid: "UNIQUEIDENTIFIER",
			varint: "DECIMAL(38,0)",
		}
		return typeMap[field.toLowerCase()] ?? "NVARCHAR(MAX)"
	}

	if (typeof field === "object" && field.type) {
		return sqlTypeFromField(field.type)
	}

	return "NVARCHAR(MAX)"
}

function buildWhereClause(filter: Record<string, any>, params: any[]): string {
	if (!filter || Object.keys(filter).length === 0) {
		return ""
	}

	const clauses: string[] = []

	for (const [key, value] of Object.entries(filter)) {
		if (value === null || value === undefined) {
			clauses.push(`[${key}] IS NULL`)
		} else if (typeof value === "object" && value !== null) {
			if (value.$ne !== undefined) {
				params.push(value.$ne)
				clauses.push(`[${key}] != @p${params.length}`)
			} else if (value.$in !== undefined) {
				const inParams = value.$in.map((v: any) => {
					params.push(v)
					return `@p${params.length}`
				})
				clauses.push(`[${key}] IN (${inParams.join(", ")})`)
			} else if (value.$gt !== undefined) {
				params.push(value.$gt)
				clauses.push(`[${key}] > @p${params.length}`)
			} else if (value.$gte !== undefined) {
				params.push(value.$gte)
				clauses.push(`[${key}] >= @p${params.length}`)
			} else if (value.$lt !== undefined) {
				params.push(value.$lt)
				clauses.push(`[${key}] < @p${params.length}`)
			} else if (value.$lte !== undefined) {
				params.push(value.$lte)
				clauses.push(`[${key}] <= @p${params.length}`)
			} else if (value.$and !== undefined) {
				const subClauses: string[] = []
				for (const sub of value.$and) {
					const subWhere = buildWhereClause(sub, params)
					if (subWhere) {
						subClauses.push(`(${subWhere})`)
					}
				}
				if (subClauses.length) {
					clauses.push(`(${subClauses.join(" AND ")})`)
				}
			}
		} else {
			params.push(value)
			clauses.push(`[${key}] = @p${params.length}`)
		}
	}

	return clauses.length ? clauses.join(" AND ") : ""
}

function buildOrderClause(orderBy?: Record<string, "asc" | "desc">): string {
	if (!orderBy || Object.keys(orderBy).length === 0) {
		return ""
	}

	const orders: string[] = []
	for (const [key, dir] of Object.entries(orderBy)) {
		orders.push(`[${key}] ${dir === "desc" ? "DESC" : "ASC"}`)
	}

	return `ORDER BY ${orders.join(", ")}`
}

function buildLimitClause(limit?: number): string {
	if (limit != null && limit > 0) {
		return `TOP ${limit}`
	}
	return ""
}

export class MssqlAdapter implements DriverAdapter {
	private pool: any
	private connected: boolean = false
	private config: {
		server: string
		database: string
		user: string
		password: string
		options: Record<string, any>
	}

	operators: QueryOperators = mssqlOperators

	constructor(config: {
		server: string
		database: string
		user?: string
		password?: string
		options?: Record<string, any>
	}) {
		this.config = {
			server: config.server || "localhost",
			database: config.database || "default_db",
			user: config.user || "sa",
			password: config.password || "",
			options: {
				trustServerCertificate: true,
				encrypt: false,
				...config.options,
			},
		}
	}

	async connect(): Promise<void> {
		const sql = await loadMssql()

		const pool = new sql.ConnectionPool({
			server: this.config.server,
			database: this.config.database,
			user: this.config.user,
			password: this.config.password,
			options: this.config.options,
		})
		await pool.connect()
		this.pool = pool
		this.connected = true
	}

	async shutdown(): Promise<void> {
		if (this.pool) {
			await this.pool.close()
			this.connected = false
		}
	}

	private ensureConnected(): void {
		if (!this.connected || !this.pool) {
			throw new Error("not connected to mssql, call connect() first")
		}
	}

	private tableName(model: Model<any, any>): string {
		return `[${model.schema.table_name}]`
	}

	async find<T>(
		model: Model<any, T>,
		query: Query<T>,
		options?: FindQueryOptions<T>,
	): Promise<T[]> {
		this.ensureConnected()

		const params: any[] = []
		const where = buildWhereClause(query as Record<string, any>, params)
		const order = buildOrderClause(options?.orderBy as any)
		const limit = buildLimitClause(options?.limit)

		let sql =
			`SELECT ${options?.fields ? (options.fields as string[]).map((f) => `[${f}]`).join(", ") : "*"} ` +
			`FROM ${this.tableName(model)}`

		if (limit) {
			const innerSql = `SELECT ${limit} * FROM ${this.tableName(model)}`
			let queryStr = innerSql
			if (where) queryStr += ` WHERE ${where}`
			if (order) queryStr += ` ${order}`
			sql = queryStr
		} else {
			sql = `SELECT * FROM ${this.tableName(model)}`
			if (where) sql += ` WHERE ${where}`
			if (order) sql += ` ${order}`
		}

		const request = this.pool.request()
		for (let i = 0; i < params.length; i++) {
			request.input(`p${i + 1}`, params[i])
		}

		const result = await request.query(sql)
		return result.recordset as T[]
	}

	async findOne<T>(
		model: Model<any, T>,
		query: Query<T>,
		options?: FindQueryOptions<T>,
	): Promise<T | null> {
		const results = await this.find(model, query, {
			...options,
			limit: 1,
		})
		return results.length > 0 ? results[0] : null
	}

	async insert<T>(
		model: Model<any, T>,
		data: Record<string, any>,
		options?: InsertQueryOptions<T>,
	): Promise<T[]> {
		this.ensureConnected()

		const keys: string[] = []
		const values: string[] = []
		const params: any[] = []

		for (const [key, value] of Object.entries(data)) {
			if (value !== undefined) {
				keys.push(`[${key}]`)
				params.push(value)
				values.push(`@p${params.length}`)
			}
		}

		let sql =
			`INSERT INTO ${this.tableName(model)} ` +
			`(${keys.join(", ")}) ` +
			`OUTPUT INSERTED.* ` +
			`VALUES (${values.join(", ")})`

		const request = this.pool.request()
		for (let i = 0; i < params.length; i++) {
			request.input(`p${i + 1}`, params[i])
		}

		const result = await request.query(sql)
		return result.recordset as T[]
	}

	async update<T>(
		model: Model<any, T>,
		query: Query<T>,
		options?: UpdateQueryOptions<T>,
	): Promise<T[]> {
		this.ensureConnected()

		const whereParams: any[] = []
		const where = buildWhereClause(
			(options?.when as any) ?? {},
			whereParams,
		)

		const setParts: string[] = []
		const setParams: any[] = []

		for (const [key, value] of Object.entries(
			query as Record<string, any>,
		)) {
			if (value !== undefined && !key.startsWith("$")) {
				setParts.push(`[${key}] = @set${setParams.length + 1}`)
				setParams.push(value)
			}
		}

		if (setParts.length === 0) {
			throw new Error("update requires at least one field to set")
		}

		let sql =
			`UPDATE ${this.tableName(model)} ` +
			`SET ${setParts.join(", ")} ` +
			`OUTPUT INSERTED.*`

		if (where) {
			sql += ` WHERE ${where}`
		}

		const request = this.pool.request()
		for (let i = 0; i < setParams.length; i++) {
			request.input(`set${i + 1}`, setParams[i])
		}
		for (let i = 0; i < whereParams.length; i++) {
			request.input(`w${i + 1}`, whereParams[i])
		}

		const result = await request.query(sql)
		return result.recordset as T[]
	}

	async remove<T>(
		model: Model<any, T>,
		query: Query<T>,
		options?: DeleteQueryOptions<T>,
	): Promise<any> {
		this.ensureConnected()

		const params: any[] = []
		const where = buildWhereClause(query as Record<string, any>, params)

		if (!where) {
			throw new Error("delete requires at least one filter condition")
		}

		const sql = `DELETE FROM ${this.tableName(model)} OUTPUT DELETED.* WHERE ${where}`

		const request = this.pool.request()
		for (let i = 0; i < params.length; i++) {
			request.input(`p${i + 1}`, params[i])
		}

		const result = await request.query(sql)
		return result.recordset.length > 0 ? result.recordset[0] : null
	}

	async countAll(model: Model<any, any>): Promise<number> {
		this.ensureConnected()

		const sql = `SELECT COUNT(1) AS count FROM ${this.tableName(model)}`
		const result = await this.pool.request().query(sql)
		return result.recordset[0].count
	}

	async tableExists(model: Model<any, any>): Promise<boolean> {
		this.ensureConnected()

		try {
			const sql = `
				SELECT TABLE_NAME
				FROM INFORMATION_SCHEMA.TABLES
				WHERE TABLE_TYPE = 'BASE TABLE'
				AND TABLE_NAME = @table
			`
			const result = await this.pool
				.request()
				.input("table", model.schema.table_name)
				.query(sql)

			return result.recordset.length > 0
		} catch {
			return false
		}
	}

	async sync(model: Model<any, any>): Promise<void> {
		this.ensureConnected()

		const exists = await this.tableExists(model)
		if (exists) return

		const fields = model.schema.fields
		const columns: string[] = []
		const pkColumns: string[] = []

		const keys = model.schema.keys
		if (typeof keys === "string") {
			pkColumns.push(keys)
		} else if (Array.isArray(keys) && keys.length > 0) {
			const first = keys[0]
			if (Array.isArray(first)) {
				pkColumns.push(...first.map(String))
			} else {
				pkColumns.push(String(first))
			}
			for (let i = 1; i < keys.length; i++) {
				pkColumns.push(String(keys[i]))
			}
		}

		for (const fieldName in fields) {
			const field = fields[fieldName]
			const sqlType = sqlTypeFromField(field)
			const isPk = pkColumns.includes(fieldName)
			const nullable = isPk ? "NOT NULL" : "NULL"

			columns.push(`[${fieldName}] ${sqlType} ${nullable}`)
		}

		let sql =
			`CREATE TABLE ${this.tableName(model)} ` + `(${columns.join(", ")}`

		if (pkColumns.length > 0) {
			sql += `, PRIMARY KEY (${pkColumns.map((k) => `[${k}]`).join(", ")})`
		}

		sql += ")"

		await this.pool.request().query(sql)
	}

	// batch operations
	async batch(items: BatchItem[], options?: BatchOptions): Promise<any[]> {
		this.ensureConnected()

		const transaction = this.pool.transaction()
		await transaction.begin()

		try {
			const results: any[] = []

			for (const item of items) {
				let result: any

				switch (item.operation) {
					case "insert":
						result = await this.executeBatchInsert(
							transaction,
							item,
						)
						break
					case "update":
						result = await this.executeBatchUpdate(
							transaction,
							item,
						)
						break
					case "remove":
						result = await this.executeBatchRemove(
							transaction,
							item,
						)
						break
				}

				results.push(result)
			}

			await transaction.commit()
			return results
		} catch (error) {
			await transaction.rollback()
			throw error
		}
	}

	private async executeBatchInsert(tx: any, item: BatchItem): Promise<any> {
		const keys: string[] = []
		const values: string[] = []
		const params: any[] = []

		for (const [key, value] of Object.entries(item.data ?? {})) {
			if (value !== undefined) {
				keys.push(`[${key}]`)
				params.push(value)
				values.push(`@p${params.length}`)
			}
		}

		const sql =
			`INSERT INTO [${item.model}] ` +
			`(${keys.join(", ")}) ` +
			`OUTPUT INSERTED.* ` +
			`VALUES (${values.join(", ")})`

		const request = tx.request()
		for (let i = 0; i < params.length; i++) {
			request.input(`p${i + 1}`, params[i])
		}

		const result = await request.query(sql)
		return result.recordset
	}

	private async executeBatchUpdate(tx: any, item: BatchItem): Promise<any> {
		const setParts: string[] = []
		const setParams: any[] = []

		for (const [key, value] of Object.entries(item.query ?? {})) {
			if (value !== undefined) {
				setParts.push(`[${key}] = @s${setParams.length + 1}`)
				setParams.push(value)
			}
		}

		const whereParams: any[] = []
		const where = buildWhereClause(item.options?.when ?? {}, whereParams)

		let sql =
			`UPDATE [${item.model}] ` +
			`SET ${setParts.join(", ")} ` +
			`OUTPUT INSERTED.*`

		if (where) {
			sql += ` WHERE ${where}`
		}

		const request = tx.request()
		for (let i = 0; i < setParams.length; i++) {
			request.input(`s${i + 1}`, setParams[i])
		}
		for (let i = 0; i < whereParams.length; i++) {
			request.input(`w${i + 1}`, whereParams[i])
		}

		const result = await request.query(sql)
		return result.recordset
	}

	private async executeBatchRemove(tx: any, item: BatchItem): Promise<any> {
		const params: any[] = []
		const where = buildWhereClause(item.query ?? {}, params)

		if (!where) {
			throw new Error("batch remove requires at least one filter")
		}

		const sql = `DELETE FROM [${item.model}] OUTPUT DELETED.* WHERE ${where}`

		const request = tx.request()
		for (let i = 0; i < params.length; i++) {
			request.input(`p${i + 1}`, params[i])
		}

		const result = await request.query(sql)
		return result.recordset
	}

	createBatchInsert<T>(
		model: Model<any, T>,
		data: Record<string, any>,
		_options?: InsertQueryOptions<T>,
	): BatchItem {
		return {
			model: model.schema.table_name,
			operation: "insert",
			data,
		}
	}

	createBatchUpdate<T>(
		model: Model<any, T>,
		query: Query<T>,
		options?: UpdateQueryOptions<T>,
	): BatchItem {
		return {
			model: model.schema.table_name,
			operation: "update",
			query,
			options: {
				when: options?.when,
			},
		}
	}

	createBatchRemove<T>(
		model: Model<any, T>,
		query: Query<T>,
		options?: DeleteQueryOptions<T>,
	): BatchItem {
		return {
			model: model.schema.table_name,
			operation: "remove",
			query,
			options: {
				when: options?.when,
			},
		}
	}
}
