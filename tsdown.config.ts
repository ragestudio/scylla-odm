import { defineConfig } from "tsdown"

export default defineConfig({
	entry: ["src/**/*.ts"],
	format: "esm",
	dts: true,
	clean: true,
	sourcemap: true,
	platform: "node",
	unbundle: true,
})
