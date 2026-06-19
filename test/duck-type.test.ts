import { describe, it, expect } from "vitest"
import { q } from "../src/driver/mapping/q.js"

// duck-type checks — mirrors the helpers in query-generator.js and cache.js
// these avoid instanceof failures caused by duplicate class references in bundled output
function isQueryOperator(v: any): boolean {
	return (
		v != null &&
		typeof v === "object" &&
		typeof v.key === "string" &&
		"value" in v
	)
}

function isQueryAssignment(v: any): boolean {
	return (
		v != null &&
		typeof v === "object" &&
		typeof v.sign === "string" &&
		"value" in v
	)
}

describe("duck-type guards for QueryOperator / QueryAssignment", () => {
	// -----------------------------------------------------------------------
	// QueryOperator
	// -----------------------------------------------------------------------

	it("isQueryOperator returns true for real q.gt() objects", () => {
		const op = q.gt(18)
		expect(isQueryOperator(op)).toBe(true)
		expect(op.key).toBe(">")
		expect(op.value).toBe(18)
	})

	it("isQueryOperator returns true for q.in_()", () => {
		const op = q.in_(["a", "b", "c"])
		expect(isQueryOperator(op)).toBe(true)
		expect(op.key).toBe("IN")
		expect(op.isInOperator).toBe(true)
	})

	it("isQueryOperator returns true for q.and()", () => {
		const op = q.and(q.gt(10), q.lt(20))
		expect(isQueryOperator(op)).toBe(true)
		expect(op.key).toBe("AND")
		expect(op.hasChildValues).toBe(true)
	})

	it("isQueryOperator returns true for fake objects (cross-bundle scenario)", () => {
		// simulates the case where instanceof fails because the class reference
		// is duplicated in the bundled ESM/CJS output
		const fake = { key: ">=", value: 42 }
		expect(isQueryOperator(fake)).toBe(true)
	})

	it("isQueryOperator returns false for null, undefined, plain objects", () => {
		expect(isQueryOperator(null)).toBe(false)
		expect(isQueryOperator(undefined)).toBe(false)
		expect(isQueryOperator(0)).toBe(false)
		expect(isQueryOperator("string")).toBe(false)
		expect(isQueryOperator([])).toBe(false)
		expect(isQueryOperator({})).toBe(false) // no 'key' string
		expect(isQueryOperator({ key: 123 })).toBe(false) // key not string
	})

	// -----------------------------------------------------------------------
	// QueryAssignment
	// -----------------------------------------------------------------------

	it("isQueryAssignment returns true for q.incr()", () => {
		const op = q.incr(5)
		expect(isQueryAssignment(op)).toBe(true)
		expect(op.sign).toBe("+")
		expect(op.value).toBe(5)
	})

	it("isQueryAssignment returns true for q.decr()", () => {
		const op = q.decr(3)
		expect(isQueryAssignment(op)).toBe(true)
		expect(op.sign).toBe("-")
	})

	it("isQueryAssignment returns true for q.prepend()", () => {
		const op = q.prepend([1, 2])
		expect(isQueryAssignment(op)).toBe(true)
		expect(op.sign).toBe("+")
		expect(op.inverted).toBe(true)
	})

	it("isQueryAssignment returns true for fake objects (cross-bundle scenario)", () => {
		const fake = { sign: "-", value: 10 }
		expect(isQueryAssignment(fake)).toBe(true)
	})

	it("isQueryAssignment returns false for wrong shapes", () => {
		expect(isQueryAssignment(null)).toBe(false)
		expect(isQueryAssignment(undefined)).toBe(false)
		expect(isQueryAssignment({})).toBe(false)
		expect(isQueryAssignment({ sign: 123 })).toBe(false) // sign not string
		expect(isQueryAssignment({ value: 10 })).toBe(false) // no sign
		expect(isQueryAssignment(q.gt(10))).toBe(false) // QueryOperator, not assignment
	})

	// -----------------------------------------------------------------------
	// Mutual exclusion
	// -----------------------------------------------------------------------

	it("a QueryOperator is not a QueryAssignment", () => {
		expect(isQueryAssignment(q.gt(10))).toBe(false)
		expect(isQueryAssignment(q.lt(20))).toBe(false)
		expect(isQueryAssignment(q.in_([1]))).toBe(false)
		expect(isQueryAssignment(q.and(q.gt(1), q.lt(2)))).toBe(false)
	})

	it("a QueryAssignment is not a QueryOperator", () => {
		expect(isQueryOperator(q.incr(1))).toBe(false)
		expect(isQueryOperator(q.decr(1))).toBe(false)
		expect(isQueryOperator(q.append([1]))).toBe(false)
		expect(isQueryOperator(q.prepend([1]))).toBe(false)
		expect(isQueryOperator(q.remove([1]))).toBe(false)
	})
})
