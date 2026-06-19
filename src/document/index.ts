import type { Model } from "../model/index.js"
//import typeChecker from "../utils/typeChecker"

export class Document<TDoc = any> {
	constructor(data: TDoc, model: Model<any, TDoc>) {
		if (data == null) {
			throw new Error(
				"Cannot create Document with null or undefined data",
			)
		}

		if (typeof data !== "object" || Array.isArray(data)) {
			throw new Error("Document data must be an object")
		}

		Object.assign(this, data)

		Object.defineProperty(this, "_model", {
			value: model,
			enumerable: false,
			writable: false,
			configurable: false,
		})
	}

	_model!: Model<any, TDoc>

	async save() {
		try {
			const data = this.toRaw()

			//typeChecker(this._model, data)

			return await this._model.update(data as any)
		} catch (error: any) {
			throw new Error(`Failed to save document: ${error.message}`)
		}
	}

	async delete() {
		try {
			return await this._model.delete(this.toRaw() as any)
		} catch (error: any) {
			throw new Error(`Failed to delete document: ${error.message}`)
		}
	}

	toRaw(): TDoc {
		const raw: any = {}

		for (const key in this) {
			if (key === "_model") continue

			if (this.propertyIsEnumerable(key)) {
				const value = (this as any)[key]

				try {
					JSON.stringify(value)
					raw[key] = value
				} catch (error) {
					raw[key] = String(value)
				}
			}
		}

		return raw as TDoc
	}

	isValid(): boolean {
		try {
			//typeChecker(this._model, this.toRaw())
			return true
		} catch {
			return false
		}
	}

	getChangedFields(original: Partial<TDoc>): (keyof TDoc)[] {
		const current = this.toRaw() as Record<string, any>
		const changed: (keyof TDoc)[] = []

		for (const key in current) {
			if (!(key in original) || current[key] !== (original as any)[key]) {
				changed.push(key as keyof TDoc)
			}
		}

		return changed
	}
}

export default Document
