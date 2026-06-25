import DOMPurify from "dompurify";
import fuzzysort from "fuzzysort";
import { html, nothing, type TemplateResult } from "lit-html";
import { repeat } from "lit-html/directives/repeat.js";
import { unsafeHTML } from "lit-html/directives/unsafe-html.js";
import { marked } from "marked";
import type {
	Dose,
	DoseAdjustment,
	Medication,
	MedicationDatabase,
} from "./schema";

/**
 * Render a reusable details/summary accordion component
 *
 * @param title - The title text or template for the accordion summary
 * @param content - The Lit-html template to render inside the accordion
 * @returns {TemplateResult} The accordion component
 */
const Accordion = (
	title: string | TemplateResult,
	content: TemplateResult,
) => html`
	<details class="med-accordion">
		<summary>
			<span class="title">${title}</span>
			<span class="chevron">▼</span>
		</summary>
		<div class="accordion-content">
			${content}
		</div>
	</details>
`;

/**
 * Render sanitized inline Markdown
 *
 * @param text - Raw markdown string
 * @returns {TemplateResult | typeof nothing} Sanitized HTML or nothing if empty
 */
function renderMarkdown(
	text: string | undefined,
): TemplateResult | typeof nothing {
	if (!text) return nothing;
	const rawHtml = marked.parseInline(text) as string;
	const cleanHtml = DOMPurify.sanitize(rawHtml);
	return html`${unsafeHTML(cleanHtml)}`;
}

/**
 * Render a sanitized Markdown block (allows block-level elements like paragraphs)
 *
 * @param text - Raw markdown string
 * @returns {TemplateResult | typeof nothing} Sanitized HTML or nothing if empty
 */
function renderMarkdownBlock(
	text: string | undefined,
): TemplateResult | typeof nothing {
	if (!text) return nothing;
	const rawHtml = marked.parse(text) as string;
	const cleanHtml = DOMPurify.sanitize(rawHtml);
	return html`${unsafeHTML(cleanHtml)}`;
}

/**
 * Format a raw monograph URL into a clean, human-readable title
 *
 * @param url - The path to the monograph PDF
 * @returns {string} Formatted monograph name
 */
function formatMonographName(url: string): string {
	try {
		const filename = url.substring(url.lastIndexOf("/") + 1);
		const basename = filename.split(".")[0] || filename;
		const parts = basename.split("_");
		if (parts.length === 1) return parts[0];

		const title = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
		const rest = parts.slice(1).join(" - ");
		return `${title} (${rest})`;
	} catch (_e) {
		return "Monograph Link";
	}
}

/**
 * Render the full medication card
 *
 * @param med - The Medication data object
 * @returns {TemplateResult} The complete medication card template
 */
export function medCardTemplate(med: Medication): TemplateResult {
	return html`
		<div class="med-card">
			<div class="med-header">
				<div class="med-header-content">
					<div class="med-header-left">
						<div class="med-title-row">
							<h2>${med.display_name}</h2>
							<div class="med-badges">
								${med.otc === "yes" ? html`<span class="badge otc">OTC</span>` : nothing}
								${med.otc === "no" ? html`<span class="badge rx">Rx</span>` : nothing}
								${med.otc === "both" ? html`<span class="badge rx-otc">Rx/OTC</span>` : nothing}
								${med.draft ? html`<span class="badge draft">WIP</span>` : nothing}
								${med.abbreviations ? html`<span class="abbr-tooltip" data-tooltip="${med.abbreviations}">ⓘ</span>` : nothing}
							</div>
						</div>
						${
							med.brand_names.length > 0
								? html`<div class="med-subtitle">Brands: ${med.brand_names.join(", ")}</div>`
								: nothing
						}
						${med.moa ? html`<div class="med-subtitle">MoA: ${med.moa}</div>` : nothing}
					</div>

					${
						med.contraindications || med.ix_before || med.ix_ongoing
							? html`
					<div class="med-header-right">
						${
							med.contraindications
								? html`<div class="alert-contra">
										<span><strong>Contraindications:</strong> ${renderMarkdown(med.contraindications)}</span>
									</div>`
								: nothing
						}
						${
							med.ix_before || med.ix_ongoing
								? html`<div class="alert-monitoring">
										<span><strong>Monitoring:</strong> 
											${med.ix_before && med.ix_ongoing ? "Before + Ongoing" : med.ix_before ? "Before" : "Ongoing"}
										</span>
									</div>`
								: nothing
						}
					</div>`
							: nothing
					}
				</div>
			</div>

			<div class="med-doses">
				${renderDoses(med)}
			</div>

			${
				(med.pearls && med.pearls.length > 0) || med.ix_before || med.ix_ongoing
					? html`
				<div class="med-pearls">
					<div class="pearls-title"><strong>${med.pearls && med.pearls.length > 0 ? (med.ix_before || med.ix_ongoing ? "Clinical Pearls & Monitoring" : "Clinical Pearls") : "Monitoring"}</strong></div>
					
					${
						med.pearls && med.pearls.length > 0
							? html`
						<ul class="pearls-list">
							${med.pearls.map((p) => html`<li>${renderMarkdown(p)}</li>`)}
						</ul>
					`
							: nothing
					}

					${
						med.ix_before || med.ix_ongoing
							? html`
						<div class="monitoring-details">
							${med.ix_before ? html`<p><strong>Before starting:</strong> ${renderMarkdown(med.ix_before)}</p>` : nothing}
							${med.ix_ongoing ? html`<p><strong>Ongoing:</strong> ${renderMarkdown(med.ix_ongoing)}</p>` : nothing}
						</div>
					`
							: nothing
					}
				</div>
			`
					: nothing
			}

			<div class="med-accordions">
				${
					med.severe_side_effects ||
					(med.side_effects && med.side_effects.length > 0)
						? Accordion(
								html`Adverse Events <span class="ae-inline-summary">— ${renderMarkdown(med.side_effects_summary) || "See details"}</span>`,
								html`
					${med.severe_side_effects ? html`<div class="ae-severe"><strong>Severe:</strong> ${renderMarkdown(med.severe_side_effects)}</div>` : nothing}
					${
						med.side_effects && med.side_effects.length > 0
							? html`
						<div class="table-responsive-wrapper">
						<table class="ae-table">
							<thead>
								<tr>
									<th>Symptom</th>
									<th>Indication</th>
									<th>Drug</th>
									<th>${med.side_effects[0]?.comparator_name || "Placebo"}</th>
								</tr>
							</thead>
							<tbody>
								${med.side_effects.map((se) =>
									se.rates.map(
										(rate, idx) => html`
										<tr>
											${idx === 0 ? html`<td rowspan="${se.rates.length}"><strong>${se.symptom}</strong>${se.notes ? html`<br><span class="text-muted" style="font-size: 0.8em; font-weight: normal">${renderMarkdown(se.notes)}</span>` : nothing}</td>` : nothing}
											<td>${rate.indication}</td>
											<td>${rate.drug}</td>
											<td>${rate.comparator || "-"}</td>
										</tr>
									`,
									),
								)}
							</tbody>
						</table>
						</div>
						${med.side_effects_source ? html`<div class="text-muted" style="font-size: 0.85rem; margin-top: 0.5rem; font-style: italic;">Source: ${renderMarkdown(med.side_effects_source)}</div>` : nothing}
					`
							: nothing
					}
				`,
							)
						: med.side_effects_summary
							? html`
					<div class="med-accordion no-content">
						<div class="summary-static">
							<span class="title">Adverse Events <span class="ae-inline-summary">— ${med.side_effects_summary}</span></span>
						</div>
					</div>
				`
							: nothing
				}

				${
					med.severe_interactions
						? Accordion(
								med.interactions_summary
									? html`Severe Interactions <span class="ae-inline-summary">— ${med.interactions_summary}</span>`
									: "Severe Interactions",
								html`
					<div class="markdown-body">
						${renderMarkdownBlock(med.severe_interactions)}
					</div>
				`,
							)
						: med.interactions_summary
							? html`
					<div class="med-accordion no-content">
						<div class="summary-static">
							<span class="title">Severe Interactions <span class="ae-inline-summary">— ${med.interactions_summary}</span></span>
						</div>
					</div>
				`
							: nothing
				}



				${
					med.estimated_cost || (med.coverage && med.coverage.length > 0)
						? Accordion(
								"Coverage & Pricing (CAD)",
								html`
					${med.estimated_cost ? html`<p class="coverage-cost"><strong>Estimated Cost:</strong> ${med.estimated_cost}</p>` : nothing}
					${
						med.coverage && med.coverage.length > 0
							? html`
						<div class="coverage-grid">
							${med.coverage.map(
								(cov) => html`
								<div class="coverage-item">
									<div class="cov-header">
										<strong>${cov.province}</strong>
										<span class="tag ${cov.status.toLowerCase().replace(/[^a-z0-9]/g, "-")}">${cov.status}</span>
									</div>
									<div class="cov-details">${renderMarkdownBlock(cov.details)}</div>
								</div>
							`,
							)}
						</div>
					`
							: nothing
					}
				`,
							)
						: nothing
				}

				${
					med.pregnancy ||
					med.half_life ||
					med.abbreviations ||
					(med.monograph_links && med.monograph_links.length > 0)
						? Accordion(
								"Misc",
								html`
					<div class="pharm-grid">
						${med.pregnancy ? html`<div class="pharm-item"><strong>Pregnancy:</strong> ${renderMarkdown(med.pregnancy)}</div>` : nothing}
						${med.half_life ? html`<div class="pharm-item"><strong>Half-life:</strong> ${renderMarkdown(med.half_life)}</div>` : nothing}
						${
							med.monograph_links && med.monograph_links.length > 0
								? html`<div class="pharm-item"><strong>Monographs:</strong> 
							${med.monograph_links.map((link, idx) => html`<a href="${link}" target="_blank" rel="noopener noreferrer">${formatMonographName(link)}</a>${idx < med.monograph_links.length - 1 ? " | " : ""}`)}
						</div>`
								: nothing
						}
					</div>
				`,
							)
						: nothing
				}
			</div>
			${
				med.authors
					? html`<div class="med-footer">
						${med.authors.primary ? html`<span>Updated by: ${med.authors.primary}</span>` : nothing}
						${med.authors.editors ? html`<span> | Ed: ${med.authors.editors}</span>` : nothing}
					</div>`
					: nothing
			}
		</div>
	`;
}

/**
 * Handle clicking a dose indication filter pill (All or specific indication)
 * Note: Directly manipulates DOM styles. State loss may occur if parent re-renders.
 *
 * @param e - The click event
 * @param selectedIndication - The indication string to filter by
 */
function handleDoseFilterClick(e: Event, selectedIndication: string) {
	e.preventDefault();
	const btn = e.currentTarget as HTMLElement;
	const container = btn.closest(".med-doses") as HTMLElement;

	const pills = container.querySelectorAll(".pill");
	pills.forEach((p) => {
		p.classList.remove("active");
	});
	btn.classList.add("active");

	const groups = container.querySelectorAll(".med-indication-group");
	groups.forEach((g) => {
		if (selectedIndication === "All") {
			(g as HTMLElement).style.display = "";
		} else {
			const groupInd = g.getAttribute("data-indication");
			(g as HTMLElement).style.display =
				groupInd === selectedIndication ? "" : "none";
		}
	});
}

/**
 * Render the doses section including indication tabs and dose tables
 *
 * @param med - The Medication data object
 * @returns {TemplateResult} The rendered doses template
 */
function renderDoses(med: Medication): TemplateResult {
	const indications = new Set(med.doses.map((d) => d.indication));
	const indicationTabs = Array.from(indications);
	const showPills = indicationTabs.length >= 4;

	return html`
		${
			med.available_forms && med.available_forms.length > 0
				? html`<div class="med-forms"><strong>Available Forms:</strong> ${med.available_forms.join(", ")}</div>`
				: nothing
		}
		${
			showPills
				? html`
			<div class="med-dosing-pills">
				<button class="pill active" @click=${(e: Event) => handleDoseFilterClick(e, "All")}>View All</button>
				${indicationTabs.map((ind) => html`<button class="pill" @click=${(e: Event) => handleDoseFilterClick(e, ind)}>${ind}</button>`)}
			</div>
		`
				: nothing
		}

		${indicationTabs.map((ind) => {
			const dosesForInd = med.doses.filter((d) => d.indication === ind);
			return html`
				<div class="med-indication-group" data-indication="${ind}" id="dose-${ind.replace(/\s+/g, "-")}">
					<h4>${ind}</h4>
					${dosesForInd.length === 1 ? renderSingleDose(dosesForInd[0]) : renderDoseTable(dosesForInd)}
				</div>
			`;
		})}
	`;
}

/**
 * Render a single dose when there is only one dose for a given indication
 *
 * @param dose - The Dose object
 * @returns {TemplateResult} The rendered single dose template
 */
function renderSingleDose(dose: Dose): TemplateResult {
	return html`
		<div class="med-single-dose">
			<p>
				${dose.patient_age ? html`<strong>Ages ${dose.patient_age}:</strong> ` : nothing}
				${dose.patient_weight ? html`<strong>Weight ${dose.patient_weight}:</strong> ` : nothing}
				${dose.dose}
				${dose.off_label ? html`<span class="tag off-label">(Off-Label)</span>` : nothing}
			</p>
			${dose.notes ? html`<div class="med-dose-notes"><em>Notes:</em> ${renderMarkdown(dose.notes)}</div>` : nothing}
			${dose.sample_rx ? html`<div class="dose-rx"><code>Sample Rx: ${dose.sample_rx}</code></div>` : nothing}
			${
				dose.adjustments.length > 0
					? html`
				<div class="med-adjustments">
					${dose.adjustments.map((adj: DoseAdjustment) => html`<p>${adj.condition}: ${adj.dose}</p>`)}
				</div>
			`
					: nothing
			}
		</div>
	`;
}

/**
 * Render a table of multiple doses for a given indication, aggregating shared adjustments
 *
 * @param doses - Array of Dose objects
 * @returns {TemplateResult} The rendered dose table template
 */
function renderDoseTable(doses: Dose[]): TemplateResult {
	const hasWeight = doses.some((d) => !!d.patient_weight);
	const hasNotes = doses.some((d) => !!d.notes);

	const uniqueRxs = Array.from(
		new Set(doses.map((d) => d.sample_rx).filter(Boolean)),
	) as string[];

	// Smart Aggregate Adjustments
	const uniqueAdjustments = new Map<
		string,
		{ condition: string; dose: string; count: number; id: number }
	>();
	let adjCounter = 1;

	doses.forEach((d) => {
		d.adjustments.forEach((adj: DoseAdjustment) => {
			const key = `${adj.condition}:::${adj.dose}`;
			if (!uniqueAdjustments.has(key)) {
				uniqueAdjustments.set(key, { ...adj, count: 0, id: 0 });
			}
			const existing = uniqueAdjustments.get(key);
			if (existing) {
				existing.count++;
			}
		});
	});

	uniqueAdjustments.forEach((val) => {
		// Only assign a superscript ID if this adjustment doesn't apply to every dose
		if (val.count < doses.length) {
			val.id = adjCounter++;
		}
	});

	return html`
		<div class="table-responsive-wrapper">
		<table class="med-dose-table">
			<thead>
				<tr>
					<th>Age</th>
					${hasWeight ? html`<th>Weight</th>` : nothing}
					<th>Dose</th>
					${hasNotes ? html`<th>Notes</th>` : nothing}
				</tr>
			</thead>
			<tbody>
				${doses.map((dose) => {
					const superscripts = dose.adjustments.map((adj: DoseAdjustment) => {
						const key = `${adj.condition}:::${adj.dose}`;
						const val = uniqueAdjustments.get(key);
						return val && val.id > 0 ? html`<sup>${val.id}</sup>` : nothing;
					});

					let rxSuperscript: TemplateResult | symbol = nothing;
					if (dose.sample_rx) {
						const rxIndex = uniqueRxs.indexOf(dose.sample_rx) + 1;
						rxSuperscript = html`<sup class="rx-sup">[Rx${uniqueRxs.length > 1 ? rxIndex : ""}]</sup>`;
					}

					return html`
						<tr>
							<td>${dose.patient_age}</td>
							${hasWeight ? html`<td>${dose.patient_weight || "-"}</td>` : nothing}
							<td>
								${dose.dose} ${superscripts} ${rxSuperscript}
								${dose.off_label ? html`<span class="tag off-label">(Off-Label)</span>` : nothing}
							</td>
							${hasNotes ? html`<td>${renderMarkdown(dose.notes)}</td>` : nothing}
						</tr>
					`;
				})}
			</tbody>
		</table>
		</div>
		${
			uniqueAdjustments.size > 0
				? html`
			<div class="med-adjustments">
				${Array.from(uniqueAdjustments.values()).map(
					(val) => html`
					<p>${val.id > 0 ? html`<sup>${val.id}</sup>` : nothing} <em>${val.condition}:</em> ${val.dose}</p>
				`,
				)}
			</div>
		`
				: nothing
		}
		${
			uniqueRxs.length > 0
				? html`
			<div class="med-sample-rxs">
				${uniqueRxs.map(
					(rx, idx) => html`
					<div class="dose-rx">
						<code>Sample Rx${uniqueRxs.length > 1 ? ` ${idx + 1}` : ""}: ${rx}</code>
					</div>
				`,
				)}
			</div>
		`
				: nothing
		}
	`;
}

/**
 * Mount and initialize the Medication Index App to a container element
 *
 * @param db - The full MedicationDatabase object
 * @param container - The HTML element to mount the index app onto
 */
export function mountMedIndex(db: MedicationDatabase, container: HTMLElement) {
	let state = {
		query: "",
		category: "All",
	};

	const categories = new Set<string>();
	Object.values(db).forEach((med) => {
		med.categories.forEach((c) => {
			categories.add(c);
		});
	});
	const allCategories = ["All", ...Array.from(categories).sort()];

	// Optimize search by preparing Fuzzysort targets exactly once at startup
	const preparedSearchTargets = Object.entries(db).map(([id, med]) => {
		const textToSearch = [
			med.display_name,
			...(med.brand_names || []),
			med.abbreviations || "",
		].join(" ");

		return {
			id,
			med,
			preparedText: fuzzysort.prepare(textToSearch),
		};
	});

	const update = () => {
		import("lit-html").then(({ render }) => {
			render(
				medIndexTemplate(
					db,
					state,
					allCategories,
					preparedSearchTargets,
					updateState,
				),
				container,
			);
		});
	};

	const updateState = (newState: Partial<typeof state>) => {
		state = { ...state, ...newState };
		update();
	};

	update();
}

/**
 * Render the full Medication Index App (Search, Categories, and Results)
 *
 * @param _db - The full MedicationDatabase object
 * @param state - The current state containing query and category
 * @param categories - Array of unique category names
 * @param preparedSearchTargets - Fuzzysort prepared targets for optimized searching
 * @param updateState - Callback to update state and trigger a re-render
 * @returns {TemplateResult} The medication index template
 */
export function medIndexTemplate(
	_db: MedicationDatabase,
	state: { query: string; category: string },
	categories: string[],
	preparedSearchTargets: {
		id: string;
		med: Medication;
		preparedText: Fuzzysort.Prepared | undefined;
	}[],
	updateState: (s: Partial<{ query: string; category: string }>) => void,
): TemplateResult {
	const handleInput = (e: Event) => {
		updateState({ query: (e.target as HTMLInputElement).value });
	};

	const handleCategoryClick = (cat: string) => {
		updateState({ category: cat });
	};

	const filteredTargets = preparedSearchTargets.filter((target) => {
		if (
			state.category !== "All" &&
			!target.med.categories.includes(state.category)
		)
			return false;
		return true;
	});

	let meds = filteredTargets.map((t) => ({ id: t.id, med: t.med }));

	if (state.query) {
		const results = fuzzysort.go(state.query, filteredTargets, {
			key: "preparedText",
			threshold: -10000,
		});
		meds = results.map((res) => ({ id: res.obj.id, med: res.obj.med }));
	}

	return html`
		<div class="med-index">
			<div class="med-search-bar">
				<input 
					type="text" 
					class="med-search-input" 
					placeholder="Search medications (e.g. Dpl, Dupixent)..." 
					.value=${state.query} 
					@input=${handleInput}
				/>
			</div>
			<div class="med-categories">
				${categories.map(
					(cat) => html`
					<button 
						class="med-category-btn ${state.category === cat ? "active" : ""}" 
						@click=${() => handleCategoryClick(cat)}
					>
						${cat.charAt(0).toUpperCase() + cat.slice(1)}
					</button>
				`,
				)}
			</div>
			
			<div class="med-results">
				${
					meds.length > 0
						? repeat(
								meds,
								(m) => m.id,
								(m) =>
									html`<div class="med-card-wrapper">${medCardTemplate(m.med)}</div>`,
							)
						: html`<div class="med-empty-state">No medications found matching your criteria.</div>`
				}
			</div>
		</div>
	`;
}
