import { readFileSync } from "node:fs";
import { MedicationSchema } from "../_ts/medications/schema";

export function validateMedications() {
	console.log("Validating medications.json against Zod schema...");
	try {
		const jsonData = readFileSync("./static/toml/medications.json", "utf-8");
		const parsed = JSON.parse(jsonData);
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
			console.error("\nBuild failed due to invalid medication JSON data.\n");
			process.exit(1);
		}
		console.log("All medications passed Zod validation!");
	} catch (e) {
		console.error("Failed to parse JSON file", e);
		process.exit(1);
	}
}
