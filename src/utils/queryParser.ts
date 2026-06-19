import type { Model } from "../model"
import type { QueryOperators } from "../adapter/types"

import isPlainObject from "./isPlainObject"

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

function getOperators(model: Model<any>): QueryOperators {
	return model.client.adapter.operators
}

function buildOperator(
	operators: QueryOperators,
	operator: string,
	opValue: any,
): any {
	if (!VALID_OPERATORS.has(operator)) {
		throw new Error(`Invalid operator: ${operator}`)
	}

	switch (operator) {
		case "$eq":
			return opValue

		case "$ne":
			requireNotNull(opValue, "$ne")
			return operators.notEq(opValue)

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
			return operators.in_(opValue)

		case "$gt":
			requireNotNull(opValue, "$gt")
			return operators.gt(opValue)

		case "$gte":
			requireNotNull(opValue, "$gte")
			return operators.gte(opValue)

		case "$lt":
			requireNotNull(opValue, "$lt")
			return operators.lt(opValue)

		case "$lte":
			requireNotNull(opValue, "$lte")
			return operators.lte(opValue)
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

	const operators = getOperators(model)
	const parsedQuery: Record<string, any> = {}

	for (const fieldKey of Object.keys(query)) {
		const value = query[fieldKey]

		if (!isValidFieldName(model.schema.fields, fieldKey)) {
			throw new Error(
				`Invalid field name: [${fieldKey}] or it does not exist in schema`,
			)
		}

		if (isPlainObject(value)) {
			parsedQuery[fieldKey] = parseField(operators, value)
		} else {
			parsedQuery[fieldKey] = value
		}
	}

	return parsedQuery
}

function parseField(operators: QueryOperators, value: any): any {
	const operatorKeys = Object.keys(value)
	const compiledOps = operatorKeys.map((op) =>
		buildOperator(operators, op, value[op]),
	)

	return compiledOps.length === 1
		? compiledOps[0]
		: operators.and(...compiledOps)
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
