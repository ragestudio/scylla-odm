import type { Client } from "./client.js"

declare global {
	var __scylla_client: Client
}

export {}
