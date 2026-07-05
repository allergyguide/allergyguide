/**
 * Portion Reference Table component
 * Purely a reference for common portion sizes from literature
 */
import { html, nothing, type TemplateResult } from "lit-html";
import { live } from "lit-html/directives/live.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A single row from ofc_amounts.json */
interface OfcAmountRow {
	allergen: string;
	food: string;
	protein: string;
	age4_11mo: string;
	age1_3y: string;
	age4_8y: string;
	age9_18y: string;
	age19plus: string;
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

// Bundled at build time by esbuild (.json extension is resolved natively)
import rawAmounts from "../data/ofc_amounts.json";

/** Footnote characters from the original paper */
const FOOTNOTE_RE = /[*†‡§¶\\]/g;

/** Strip footnote markers from a food name */
function stripFootnotes(s: string): string {
	return s.replace(FOOTNOTE_RE, "").trim();
}

/** Normalised rows with footnotes removed */
const AMOUNTS: OfcAmountRow[] = (rawAmounts as OfcAmountRow[]).map((row) => ({
	...row,
	food: stripFootnotes(row.food),
}));

// ---------------------------------------------------------------------------
// Module-level reactive state (no AppState dependency by design)
// ---------------------------------------------------------------------------

let filterQuery = "";
let renderCallback: (() => void) | null = null;

/**
 * Register a re-render callback so the table can trigger parent re-renders when its internal filter state changes
 *
 * @param cb - Function that triggers a parent render cycle
 */
export function registerPortionTableRenderer(cb: () => void): void {
	renderCallback = cb;
}

function setFilter(value: string): void {
	filterQuery = value;
	renderCallback?.();
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Display value for an empty cell */
const EMPTY_CELL = "—";

function cellValue(s: string): string {
	return s.trim() === "" ? EMPTY_CELL : s;
}

/** Case-insensitive search across allergen and food columns */
function matchesFilter(row: OfcAmountRow, query: string): boolean {
	if (!query) return true;
	const q = query.toLowerCase();
	return (
		row.allergen.toLowerCase().includes(q) || row.food.toLowerCase().includes(q)
	);
}

/** Collect unique allergen names for grouping */
function allergenLabel(name: string): string {
	return name;
}

// ---------------------------------------------------------------------------
// Column definitions
// ---------------------------------------------------------------------------

interface AgeColumn {
	key: keyof OfcAmountRow;
	label: string;
}

const AGE_COLUMNS: AgeColumn[] = [
	{ key: "age4_11mo", label: "4–11 mo" },
	{ key: "age1_3y", label: "1–3 y" },
	{ key: "age4_8y", label: "4–8 y" },
	{ key: "age9_18y", label: "9–18 y" },
	{ key: "age19plus", label: "19+ y" },
];

// ---------------------------------------------------------------------------
// Template
// ---------------------------------------------------------------------------

/**
 * Main template for the OFC Portion Reference Table section.
 *
 * @returns {TemplateResult} lit-html template
 */
export function portionTableTemplate(): TemplateResult {
	const filtered = AMOUNTS.filter((row) => matchesFilter(row, filterQuery));

	// Group consecutive rows by allergen for visual banding
	let lastAllergen = "";

	return html`
		<div class="ofc-portion-section">
			<div class="ofc-portion-header">
				<div class="ofc-portion-intro">
					<p>
						Age-appropriate portion sizes for common OFC foods, adapted from
						<a
							class="ofc-portion-citation-link"
							href="https://pubmed.ncbi.nlm.nih.gov/31950914/"
							target="_blank"
							rel="noopener noreferrer"
						>Bird et al. (2020)</a>.
					</p>
				</div>

				<!-- Filter bar -->
				<div class="ofc-portion-filter search-box">
					<input
						id="ofc-portion-filter-input"
						type="text"
						class="ofc-search-input"
						placeholder="Filter by allergen or food…"
						.value=${live(filterQuery)}
						@input=${(e: InputEvent) =>
							setFilter((e.target as HTMLInputElement).value)}
						autocomplete="off"
					/>
					${
						filterQuery
							? html`<button
								class="ofc-clear-btn"
								@click=${() => setFilter("")}
								aria-label="Clear filter"
							>×</button>`
							: nothing
					}
				</div>
			</div>

			<!-- Table -->
			<div class="ofc-portion-table-wrapper">
				${
					filtered.length === 0
						? html`<div class="ofc-no-results">
							No items match "${filterQuery}".
						</div>`
						: html`
						<table class="ofc-portion-table" aria-label="OFC Portion Reference">
							<thead>
								<tr>
									<th class="col-allergen">Allergen</th>
									<th class="col-food">Food</th>
									<th class="col-protein">Protein / serving</th>
									${AGE_COLUMNS.map(
										(col) => html`<th class="col-age">${col.label}</th>`,
									)}
								</tr>
							</thead>
							<tbody>
								${filtered.map((row) => {
									const isNewGroup = row.allergen !== lastAllergen;
									lastAllergen = row.allergen;
									return html`
										<tr class="ofc-portion-row ${isNewGroup ? "ofc-group-start" : ""}">
											<td class="col-allergen">
												${
													isNewGroup
														? html`<span class="ofc-allergen-badge">${allergenLabel(row.allergen)}</span>`
														: nothing
												}
											</td>
											<td class="col-food">${row.food}</td>
											<td class="col-protein">${cellValue(row.protein)}</td>
											${AGE_COLUMNS.map(
												(col) =>
													html`<td class="col-age">${cellValue(row[col.key] as string)}</td>`,
											)}
										</tr>
									`;
								})}
							</tbody>
						</table>
					`
				}
			</div>
		</div>
	`;
}
