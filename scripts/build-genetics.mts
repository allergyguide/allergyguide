import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
	fetchBlueprintPanelGenes,
	fetchInvitaePanelGenes,
} from "../_ts/genetics_reference/genetics_fetcher.mjs";

interface PanelConfig {
	name: string;
	url: string;
	source: Source;
}

interface PanelData {
	name: string;
	url: string;
	source: Source;
	genes: string[];
	lastUpdated: string;
}

/**
Genetics vendor. Options include:
- BLUEPRINT
- GENEDX
- INVITAE
*/
enum Source {
	BLUEPRINT = "BLUEPRINT",
	GENEDX = "GENEDX",
	INVITAE = "INVITAE",
}

const CONFIG_PATH = resolve("_ts/genetics_reference/panels_config.json");
const OUTPUT_DIR = resolve("static/tool_assets/genetics_reference");
const OUTPUT_FILE = resolve(OUTPUT_DIR, "genetic_panels.json");

/**
 * Builds the genetics panel data by fetching URLs defined in the config.
 */
export async function buildGenetics() {
	console.log("Starting genetics panel fetcher...");

	if (!existsSync(CONFIG_PATH)) {
		console.warn(`Genetics config not found at ${CONFIG_PATH}. Skipping.`);
		return;
	}

	const config: PanelConfig[] = JSON.parse(readFileSync(CONFIG_PATH, "utf-8"));
	const results: PanelData[] = [];

	if (!existsSync(OUTPUT_DIR)) {
		mkdirSync(OUTPUT_DIR, { recursive: true });
	}

	// rn this is rate limited, but im not fetching much; could change to a promise eventually and do async
	for (const panel of config) {
		switch (panel.source) {
			case Source.BLUEPRINT: {
				const genes = await fetchBlueprintPanelGenes(panel.url);
				results.push({
					name: panel.name,
					url: panel.url,
					source: panel.source,
					genes: genes,
					lastUpdated: new Date().toISOString(),
				});

				// Rate limit: wait 0.5 second between requests
				console.log(`Successfully fetched ${genes.length} genes`);
				await new Promise((r) => setTimeout(r, 500));
				break;
			}
			case Source.INVITAE: {
				const genes = await fetchInvitaePanelGenes(panel.url);
				results.push({
					name: panel.name,
					url: panel.url,
					source: panel.source,
					genes: genes,
					lastUpdated: new Date().toISOString(),
				});

				// Rate limit: wait 0.5 second between requests
				console.log(`Successfully fetched ${genes.length} genes`);
				await new Promise((r) => setTimeout(r, 500));
				break;
			}
			case Source.GENEDX:
				// TODO!
				console.log("TBD");
				break;
			default:
				throw new Error(`Source (${panel.source}) was not found.`);
		}
	}

	writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));
	console.log(`Genetics panel data saved to ${OUTPUT_FILE}`);
}

// if needing to run standalone:
// `npx tsx scripts/build-genetics.mts`
if (import.meta.url.endsWith(process.argv[1])) {
	buildGenetics().catch(console.error);
}
