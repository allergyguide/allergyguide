import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import toml from "fast-toml";

export function buildMedications() {
	console.log("Compiling medication TOML files into JSON...");
	const tomlDir = "./static/toml/medications";
	const files = readdirSync(tomlDir).filter((file) => file.endsWith(".toml"));

	const aggregated: Record<string, unknown> = {};

	for (const file of files) {
		const filePath = join(tomlDir, file);
		const content = readFileSync(filePath, "utf-8");
		let parsed: Record<string, unknown>;
		try {
			parsed = toml.parse(content) as Record<string, unknown>;
		} catch (e) {
			console.error(`Error parsing TOML file: ${filePath}`);
			throw e;
		}

		for (const [key, value] of Object.entries(parsed)) {
			if (aggregated[key]) {
				console.error(`\nDuplicate medication ID found: [${key}] in ${file}`);
				console.error(`ID [${key}] already exists. Build failed.\n`);
				process.exit(1);
			}
			aggregated[key] = value;
		}
	}

	writeFileSync(
		"./static/toml/medications.json",
		JSON.stringify(aggregated, null, 2),
	);
	console.log("Successfully compiled medications into medications.json");
}
