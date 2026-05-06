import fs from "node:fs"
import path from "node:path"

export default async (fromPath: string): Promise<any[]> => {
	if (typeof fromPath !== "string") {
		return []
	}

	if (!fs.existsSync(fromPath)) {
		console.warn(
			`Cannot load models from [${fromPath}] case this path does not exist`,
		)
		return []
	}

	let mods: any[] = []

	let files = await fs.promises.readdir(fromPath)

	files = files.filter((file) => file.endsWith(".js") || file.endsWith(".ts"))

	for await (const file of files) {
		const name = file.replace(".js", "")
		const file_path = path.join(fromPath, file)

		try {
			let mod = await import(file_path)

			mod = mod.default

			mods.push(mod)
		} catch (error) {
			console.error(`Failed to load model [${name}]:`, error)
			continue
		}
	}

	return mods
}
