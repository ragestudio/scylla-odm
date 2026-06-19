import { defineConfig } from "tsdown"

export default defineConfig([
	{
		entry: ["src/**/*.ts"],
		format: "esm",
		platform: "node",
		dts: true,
		clean: true,
		sourcemap: false,
		unbundle: true,
		treeshake: true,
		outExtensions({ format, pkgType }) {
			return {
				js: ".js",
				dts: ".d.ts",
			}
		},
		minify: {
			mangle: {
				keepNames: true,
			},
		},
	},
])
