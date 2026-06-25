import { readFileSync } from "node:fs";
import toml from "fast-toml";
import { MedicationSchema } from "../_ts/medications/schema";

export function validateMedications() {
	console.log("Validating medications.toml against Zod schema...");
	try {
		const tomlData = readFileSync("./static/toml/medications.toml", "utf-8");
		const parsed = toml.parse(tomlData);
		let hasError = false;

		if (typeof parsed !== "object" || parsed === null) {
			console.error("Parsed TOML is not an object.");
			process.exit(1);
		}

		for (const [key, val] of Object.entries(parsed)) {
			const result = MedicationSchema.safeParse(val);
			if (!result.success) {
				console.error(`\nValidation failed for medication [${key}]:`);
				result.error.issues.forEach((issue) => {
					console.error(
						`  - Path: ${issue.path.join(".")} | Error: ${issue.message}`,
					);
				});
				hasError = true;
			}
		}

		if (hasError) {
			console.error("\nBuild failed due to invalid medication TOML data.\n");
			process.exit(1);
		}
		console.log("All medications passed Zod validation!");
	} catch (e) {
		console.error("Failed to parse TOML file", e);
		process.exit(1);
	}
}
