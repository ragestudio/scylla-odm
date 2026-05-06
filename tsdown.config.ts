import { defineConfig } from "tsdown"

export default defineConfig({
	entry: ["src/**/*.ts"],
	format: "esm",
	dts: true,
	clean: true,
	sourcemap: false,
	platform: "node",
	unbundle: true,
	minify: true,
	outExtensions({ format, pkgType }) {
		return {
			js: ".js",
			dts: ".d.ts",
		}
	},
})
