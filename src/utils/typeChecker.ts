import type { Model } from "../model/index.js"
import { types } from "../driver/types/index.js"
import { isValidFieldName } from "./queryParser.js"

const stringTypes = new Set(["ascii", "text", "varchar", "inet"])
const intTypes = new Set(["int", "smallint", "tinyint"])
const floatTypes = new Set(["double", "float"])
const longTypes = new Set(["bigint", "counter"])

function stripFrozen(raw: string): string {
	let t = raw

	while (t.startsWith("frozen<")) {
		t = t.slice(7, -1)
	}

	return t
}

function isValidValue(value: any, expectedType: string): boolean {
	if (value === null || value === undefined) return true

	const typeName = stripFrozen(expectedType.toLowerCase().trim())

	if (stringTypes.has(typeName)) return typeof value === "string"
	if (intTypes.has(typeName)) return Number.isInteger(value)
	if (floatTypes.has(typeName)) return typeof value === "number"
	if (longTypes.has(typeName)) {
		return (
			typeof value === "bigint" ||
			typeof value === "number" ||
			value instanceof types.Long
		)
	}

	switch (typeName) {
		case "boolean":
			return typeof value === "boolean"
		case "decimal":
			return (
				typeof value === "number" ||
				typeof value === "string" ||
				value instanceof types.BigDecimal
			)
		case "varint":
			return (
				typeof value === "bigint" ||
				typeof value === "number" ||
				value instanceof types.Integer
			)
		case "timestamp":
			return (
				value instanceof Date ||
				typeof value === "number" ||
				typeof value === "string"
			)
		case "date":
			return typeof value === "string" || value instanceof types.LocalDate
		case "time":
			return typeof value === "string" || value instanceof types.LocalTime
		case "uuid":
			return typeof value === "string" || value instanceof types.Uuid
		case "timeuuid":
			return typeof value === "string" || value instanceof types.TimeUuid
		case "blob":
			return Buffer.isBuffer(value) || value instanceof Uint8Array
	}

	if (typeName.startsWith("list<") || typeName.startsWith("set<")) {
		return Array.isArray(value) || value instanceof Set
	}
	if (typeName.startsWith("map<")) {
		return (
			typeof value === "object" && !Array.isArray(value) && value !== null
		)
	}
	if (typeName.startsWith("tuple<")) {
		return Array.isArray(value)
	}

	return false
}

export default function typeChecker(model: Model<any>, data: any): boolean {
	if (!data || typeof data !== "object" || Array.isArray(data)) {
		throw new TypeError(
			`[${model.name}] Validation error: Data payload must be an object`,
		)
	}

	const fields = model.schema.fields

	for (const [key, value] of Object.entries(data)) {
		if (!isValidFieldName(fields, key)) {
			throw new Error(
				`[${model.name}] Validation error: Field '${key}' does not exist in schema`,
			)
		}

		const fieldConfig = fields[key]
		const expectedType = (fieldConfig.type || "text").toLowerCase()

		if (fieldConfig.required && (value === null || value === undefined)) {
			throw new TypeError(
				`[${model.name}] Validation error: Field '${key}' is required but received ${value}`,
			)
		}

		if (!isValidValue(value, expectedType)) {
			const receivedType = Array.isArray(value) ? "array" : typeof value

			throw new TypeError(
				`[${model.name}] Validation error: Invalid type for field '${key}'. ` +
					`Expected[${expectedType}], but received [${receivedType}]`,
			)
		}
	}

	return true
}
