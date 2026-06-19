export class Logger {
	prefix: string = "scylla"

	log(...args: any[]) {
		console.log(`[${this.prefix}]:`, ...args)
	}

	error(...args: any[]) {
		console.error(`[${this.prefix}]:`, ...args)
	}

	warn(...args: any[]) {
		console.error(`[${this.prefix}]:`, ...args)
	}
}

export default Logger
