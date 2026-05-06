import type { Model } from "../model"

// @ts-ignore
import cassandra from "../driver"
const { q } = cassandra.mapping

const MAX_QUERY_DEPTH = 3
const MAX_IN_ELEMENTS = 1000

const VALID_OPERATORS = new Set([
	"$eq",
	"$ne",
	"$gt",
	"$gte",
	"$lt",
	"$lte",
	"$in",
])

function requireNotNull(value: any, operator: string): void {
	if (value === null || value === undefined) {
		throw new Error(
			`${operator} operator cannot compare with null or undefined`,
		)
	}
}

function buildOperator(operator: string, opValue: any): any {
	if (!VALID_OPERATORS.has(operator)) {
		throw new Error(`Invalid operator: ${operator}`)
	}

	switch (operator) {
		case "$eq":
			return opValue

		case "$ne":
			requireNotNull(opValue, "$ne")
			return q.notEq(opValue)

		case "$in":
			if (!Array.isArray(opValue)) {
				throw new Error("$in operator requires an array")
			}
			if (opValue.length > MAX_IN_ELEMENTS) {
				throw new Error(
					`$in operator exceeds maximum of ${MAX_IN_ELEMENTS} elements`,
				)
			}
			for (let i = 0; i < opValue.length; i++) {
				if (opValue[i] === null || opValue[i] === undefined) {
					throw new Error(
						`$in array element at index ${i} cannot be null or undefined`,
					)
				}
			}
			return q.in_(opValue)

		case "$gt":
			requireNotNull(opValue, "$gt")
			return q.gt(opValue)

		case "$gte":
			requireNotNull(opValue, "$gte")
			return q.gte(opValue)

		case "$lt":
			requireNotNull(opValue, "$lt")
			return q.lt(opValue)

		case "$lte":
			requireNotNull(opValue, "$lte")
			return q.lte(opValue)
	}
}

export default function queryParser(
	model: Model<any>,
	query: any,
	depth: number = 0,
) {
	if (depth > MAX_QUERY_DEPTH) {
		throw new Error(`Query depth exceeds maximum of ${MAX_QUERY_DEPTH}`)
	}

	if (!query || typeof query !== "object") {
		return query
	}

	const parsedQuery: Record<string, any> = {}
	const fields = model.schema.fields

	for (const field of Object.keys(query)) {
		const value = query[field]

		if (field === "$and") {
			handleAnd(model, value, parsedQuery, depth)
			continue
		}

		if (field === "$or") {
			throw new Error(
				"ScyllaDB does not support OR queries across different columns. Use $in for a single column.",
			)
		}

		if (!isValidFieldName(fields, field)) {
			throw new Error(
				`Invalid field name: [${field}] or it does not exist in schema`,
			)
		}

		parsedQuery[field] = parseField(value)
	}

	return parsedQuery
}

function handleAnd(
	model: Model<any>,
	conditions: any,
	parsedQuery: Record<string, any>,
	depth: number,
) {
	if (!Array.isArray(conditions)) {
		throw new Error("$and operator requires an array")
	}
	if (conditions.length > 10) {
		throw new Error("$and operator exceeds maximum of 10 conditions")
	}

	for (let i = 0; i < conditions.length; i++) {
		const condition = conditions[i]
		if (!condition || typeof condition !== "object") {
			throw new Error(`$and condition at index ${i} must be an object`)
		}

		const parsed = queryParser(model, condition, depth + 1)
		for (const key of Object.keys(parsed)) {
			if (key in parsedQuery) {
				throw new Error(
					`$and conflict: field "${key}" appears in multiple conditions`,
				)
			}
		}
		Object.assign(parsedQuery, parsed)
	}
}

function parseField(value: any): any {
	if (
		value === null ||
		typeof value !== "object" ||
		Array.isArray(value) ||
		value instanceof Date
	) {
		if (Array.isArray(value)) {
			throw new Error(
				"Array values require explicit operator (e.g., $in)",
			)
		}
		return value
	}

	const operators = Object.keys(value)
	const compiledOps = operators.map((op) => buildOperator(op, value[op]))

	return compiledOps.length === 1
		? compiledOps[0]
		: (q.and as any)(...compiledOps)
}

export function isValidFieldName(
	fields: Record<string, any>,
	fieldName: string,
): boolean {
	const invalidPatterns = [
		/^[0-9]/,
		/[^a-zA-Z0-9_]/,
		/^(select|insert|update|delete|drop|create|alter|truncate)$/i,
	]

	for (const pattern of invalidPatterns) {
		if (pattern.test(fieldName)) return false
	}

	return fieldName in fields
}

export function isValidOperator(operator: string): boolean {
	return VALID_OPERATORS.has(operator)
}
