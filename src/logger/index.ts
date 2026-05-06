export class Logger {
	prefix: string = "scylla"

	log(...args) {
		console.log(`[${this.prefix}]:`, ...args)
	}

	error(...args) {
		console.error(`[${this.prefix}]:`, ...args)
	}

	warn(...args) {
		console.error(`[${this.prefix}]:`, ...args)
	}
}

export default Logger
