import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		// Emulate browser environment (provides 'window' and 'document')
		environment: "jsdom",

		// Run this file before every test suite to polyfill WebCrypto and Globals
		setupFiles: ["./_ts/setup-tests.ts"],

		include: ["**/*.{test,spec}.{js,mjs,ts,mts}"],

		// Don't run tests on compiled outputs
		exclude: [
			"node_modules",
			"public",
			"static",
			"netlify/functions/node_modules",
		],

		mockReset: true,
		reporters: "dot",
		silent: true,
	},
});
