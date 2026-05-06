type KeyspaceCreateOptions = {
	keyspace: string
	replication?: {
		strategy: string
		options: Record<string, string>
	}
}

export default function createKeyspace(options: KeyspaceCreateOptions): string {
	let clause = {}

	if (options.replication) {
		clause = options.replication
	} else {
		clause = {
			strategy: "SimpleStrategy",
			options: { replication_factor: "1" },
		}
	}

	return `CREATE KEYSPACE IF NOT EXISTS ${options.keyspace} WITH REPLICATION = ${JSON.stringify(clause)};`
}
