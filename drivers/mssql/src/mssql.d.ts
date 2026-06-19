declare module "mssql" {
	export class ConnectionPool {
		static connect(config: any): Promise<ConnectionPool>
		close(): Promise<void>
		request(): Request
		transaction(): Transaction
	}

	export class Request {
		input(name: string, value: any): Request
		query(query: string): Promise<Result>
	}

	export class Transaction {
		begin(): Promise<void>
		commit(): Promise<void>
		rollback(): Promise<void>
		request(): Request
	}

	export interface Result {
		recordset: any[]
		rowsAffected: number[]
		output: Record<string, any>
	}

	export default {
		ConnectionPool,
		Request,
		Transaction,
	}
}
