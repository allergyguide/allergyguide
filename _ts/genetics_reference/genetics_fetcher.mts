import { JSDOM } from "jsdom";

/**
 * Fetches gene names from a Blueprint Genetics panel page.
 * @param url The URL of the panel page.
 * @returns An array of gene names.
 */
export async function fetchBlueprintPanelGenes(url: string): Promise<string[]> {
	console.log(`Fetching ${url}...`);
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
	}
	const html = await response.text();
	const dom = new JSDOM(html);
	const document = dom.window.document;

	// Locate the "Panel Content" Section
	const buttons = Array.from(document.querySelectorAll("button"));
	const panelContentButton = buttons.find(
		(button) => button.textContent?.trim() === "Panel Content",
	);

	if (!panelContentButton) {
		throw new Error(
			`Could not find "Panel Content" button at ${url}. The website structure may have changed.`,
		);
	}

	const targetId = panelContentButton.getAttribute("data-bs-target");
	if (!targetId) {
		throw new Error(
			`Could not find "data-bs-target" on "Panel Content" button at ${url}.`,
		);
	}

	// data-bs-target might be "#id", so we remove the "#"
	const contentDiv = document.querySelector(targetId);
	if (!contentDiv) {
		throw new Error(
			`Could not find content div with ID "${targetId}" at ${url}.`,
		);
	}

	// Extract the Table Data
	const genes: string[] = [];
	const table = contentDiv.querySelector("table");
	if (!table) {
		throw new Error(
			`Could not find table inside "Panel Content" section at ${url}.`,
		);
	}

	const rows = Array.from(table.querySelectorAll("tr"));

	// figure out which column contains the gene
	const headerCells = Array.from(rows[0]?.querySelectorAll("th, td") || []);
	let geneColumnIndex = headerCells.findIndex((cell) => {
		const text = cell.textContent?.trim().toLowerCase();
		return text === "gene" || text === "gene symbol";
	});

	// Fallback if no header found or index is -1; assume first column
	if (geneColumnIndex === -1) {
		geneColumnIndex = 0;
	}

	// Start from index 1 if there was a header, or 0 if not
	// If we found a header cell, we skip the first row
	const startRow = headerCells.length > 0 ? 1 : 0;

	for (let i = startRow; i < rows.length; i++) {
		const cells = Array.from(rows[i].querySelectorAll("td"));
		if (cells[geneColumnIndex]) {
			const geneName = cells[geneColumnIndex].textContent?.trim();
			if (geneName && geneName !== "-") {
				genes.push(geneName);
			}
		}
	}

	return genes;
}

/**
 * Fetches gene names from an Invitae panel page.
 * @param url The URL of the panel page.
 * @returns An array of gene names.
 */
export async function fetchInvitaePanelGenes(url: string): Promise<string[]> {
	console.log(`Fetching ${url}...`);
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
	}
	const html = await response.text();
	const dom = new JSDOM(html);
	const document = dom.window.document;

	// For Invitae, genes are in <meta name="genes" content="...">
	const metaGenes = document.querySelector('meta[name="genes"]');
	if (!metaGenes) {
		throw new Error(`Could not find meta tag with name="genes" at ${url}.`);
	}

	const content = metaGenes.getAttribute("content");
	if (!content) {
		throw new Error(
			`Meta tag name="genes" has no content attribute at ${url}.`,
		);
	}

	// Split by comma and trim
	const genes = content
		.split(",")
		.map((g) => g.trim())
		.filter((g) => g.length > 0);

	return genes;
}

// Example usage if run directly
// `npx tsx genetics_fetcher.mts`
if (import.meta.url.endsWith(process.argv[1])) {
	const testUrl =
		"https://www.blueprintgenetics.com/tests/panels/hematology/comprehensive-immune-and-cytopenia-panel/";
	fetchBlueprintPanelGenes(testUrl)
		.then((genes) => {
			console.log(`Found ${genes.length} genes:`);
			console.log(genes.join(", "));
		})
		.catch((err) => console.error(err));
}
