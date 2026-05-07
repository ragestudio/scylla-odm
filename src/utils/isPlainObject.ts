export default (value: any): boolean => {
	if (typeof value !== "object" || value === null) {
		return false
	}

	if (Object.prototype.toString.call(value) !== "[object Object]") {
		return false
	}

	const proto = Object.getPrototypeOf(value)

	return proto === null || proto === Object.prototype
}
