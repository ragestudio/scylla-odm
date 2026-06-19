import type { Client } from "./client"

declare global {
	var __scylla_client: Client
}

export {}
