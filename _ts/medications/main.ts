import { render } from "lit-html";
import { medCardTemplate, mountMedIndex } from "./components";
import { type MedicationDatabase, MedicationSchema } from "./schema";

/**
 * Initializes the medications app by fetching the JSON database once and mounting lit-html components
 */
async function initMedications() {
	let rawData: unknown;
	try {
		const res = await fetch("/toml/medications.json");
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		rawData = await res.json();
	} catch (e) {
		console.error("Failed to load medication JSON data", e);
		return;
	}

	if (typeof rawData !== "object" || rawData === null) {
		console.error("Parsed medication JSON is not an object.");
		return;
	}

	// Validate database
	const db: MedicationDatabase = {};
	for (const [key, val] of Object.entries(rawData as Record<string, unknown>)) {
		const result = MedicationSchema.safeParse(val);
		if (result.success) {
			db[key] = result.data;
		} else {
			console.error(`Validation failed for medication: ${key}`, result.error);
		}
	}

	// Check for the full Index App mount
	const indexMount = document.getElementById("med-index-mount");
	if (indexMount) {
		console.log("Mounting Med Index App");
		mountMedIndex(db, indexMount);
	}

	// Check for Popup Islands
	const islandMounts = document.querySelectorAll(".med-card-mount");
	islandMounts.forEach((mount) => {
		const drugId = mount.getAttribute("data-drug-id");
		if (drugId && db[drugId]) {
			console.log(`Mounting Med Card for ${drugId}`);
			let currentProv = localStorage.getItem("med-province") || "All";
			let currentIndication = "All";

			const renderIsland = () => {
				render(
					medCardTemplate(
						db[drugId],
						currentProv,
						(newProv) => {
							currentProv = newProv;
							localStorage.setItem("med-province", newProv);
							document.dispatchEvent(
								new CustomEvent("med-province-changed", { detail: newProv }),
							);
						},
						currentIndication,
						(newInd) => {
							currentIndication = newInd;
							// This callback exists solely to keep currentIndication in sync
						},
						true,
					),
					mount as HTMLElement,
				);
			};

			document.addEventListener("med-province-changed", (e: Event) => {
				currentProv = (e as CustomEvent).detail;
				renderIsland();
			});

			renderIsland();
		} else if (drugId) {
			console.warn(`Drug ID ${drugId} not found in database.`);
		}
	});
}

document.addEventListener("DOMContentLoaded", initMedications);
