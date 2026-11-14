import DOMPurify from "dompurify";
import fuzzysort from "fuzzysort";
import { html, nothing, render, type TemplateResult } from "lit-html";
import { repeat } from "lit-html/directives/repeat.js";
import { unsafeHTML } from "lit-html/directives/unsafe-html.js";
import { marked } from "marked";
import {
	getSavedProvince,
	PROVINCE_EVENT,
	PROVINCES,
	STATUS_CSS_MAP,
	setProvince,
} from "./constants";
import type {
	Dose,
	DoseAdjustment,
	Medication,
	MedicationCoverage,
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
 * Render a titled card section: an accordion when there is a body, a static row when there is only a summary, nothing otherwise
 *
 * @param title - Section title
 * @param summary - Inline summary shown after the title (pass rendered markdown or a plain string)
 * @param body - Accordion content; omit for a static row
 */
const Section = (
	title: string,
	summary: string | TemplateResult | typeof nothing | undefined,
	body?: TemplateResult,
) => {
	const hasSummary = !!summary && summary !== nothing;
	const label = html`${title}${hasSummary ? html` <span class="ae-inline-summary">— ${summary}</span>` : nothing}`;
	if (body) return Accordion(label, body);
	if (!hasSummary) return nothing;
	return html`
		<div class="med-accordion no-content">
			<div class="summary-static">
				<span class="title">${label}</span>
			</div>
		</div>
	`;
};

// Configure marked to render all links with target="_blank" and rel="noopener noreferrer"
marked.use({
	renderer: {
		link({ href, title, tokens }) {
			// Render the link text from its tokens: `text` is raw markdown, so `[**x**](url)` would show the asterisks
			const inner = this.parser.parseInline(tokens);
			const cleanHref = href || "";
			const titleAttr = title ? ` title="${title}"` : "";
			return `<a href="${cleanHref}" target="_blank" rel="noopener noreferrer"${titleAttr}>${inner}</a>`;
		},
	},
});

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
	const cleanHtml = DOMPurify.sanitize(rawHtml, { ADD_ATTR: ["target"] });
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
	const cleanHtml = DOMPurify.sanitize(rawHtml, { ADD_ATTR: ["target"] });
	return html`${unsafeHTML(cleanHtml)}`;
}

/**
 * Format a raw monograph URL into a clean, human-readable date string
 * Expected format: [drugname]-[YYYY]-[MM].pdf or [drugname]-[YYYY]-[MM]-[suffix].pdf (drug names may contain hyphens)
 *
 * @param url - The path to the monograph PDF
 * @returns {string} Formatted date (e.g. "2025-01" or "2025-01 (v2)"), or the file name if it doesn't match
 */
function formatMonographName(url: string): string {
	const filename = url.substring(url.lastIndexOf("/") + 1);
	const match = filename.match(/-(\d{4}-\d{2})(?:-([^.]+))?\.pdf$/i);
	if (!match) return filename.replace(/\.pdf$/i, "");
	return match[2] ? `${match[1]} (${match[2]})` : match[1];
}

/**
 * Render the full medication card
 *
 * @param med - The Medication data object
 * @param selectedProvince - The currently selected province filter
 * @param onProvinceChange - Callback fired when province selection changes
 * @param selectedIndication - The currently selected indication filter ('All' or a canonical indication string)
 * @param onIndicationChange - Callback fired when indication selection changes
 * @param isStandalone - Whether the card is rendered as a standalone island
 * @returns {TemplateResult} The complete medication card template
 */
export function medCardTemplate(
	med: Medication,
	selectedProvince: string = "All",
	onProvinceChange?: (p: string) => void,
	selectedIndication: string = "All",
	onIndicationChange?: (ind: string) => void,
	isStandalone: boolean = false,
): TemplateResult {
	const indications = Array.from(new Set(med.doses.map((d) => d.indication)));
	const showPills = indications.length >= 4;
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

			${
				showPills
					? renderIndicationPills(
							indications,
							selectedIndication,
							onIndicationChange,
						)
					: nothing
			}

			<div class="med-doses">
				${renderDoses(med, indications, showPills ? selectedIndication : "All")}
			</div>

			${
				med.pearls.length > 0 || med.ix_before || med.ix_ongoing
					? html`
				<div class="med-pearls">
					<div class="pearls-title"><strong>${med.pearls.length > 0 ? (med.ix_before || med.ix_ongoing ? "Clinical Pearls & Monitoring" : "Clinical Pearls") : "Monitoring"}</strong></div>
					
					${
						med.pearls.length > 0
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
				${Section(
					"Adverse Events",
					renderMarkdown(med.side_effects_summary),
					med.severe_side_effects || med.side_effects.length > 0
						? renderAEContent(med, indications)
						: undefined,
				)}

				${Section(
					"Severe Interactions",
					med.interactions_summary,
					med.severe_interactions
						? html`<div class="markdown-body">${renderMarkdownBlock(med.severe_interactions)}</div>`
						: undefined,
				)}

				${Section(
					"Coverage/Pricing",
					med.estimated_cost,
					med.coverage.length > 0
						? renderCoverageTable(
								med.coverage,
								selectedProvince,
								onProvinceChange,
								isStandalone,
							)
						: undefined,
				)}

				${
					med.pregnancy ||
					med.half_life ||
					med.abbreviations ||
					med.monograph_links.length > 0
						? Accordion(
								"Misc",
								html`
					<div class="pharm-grid">
						${med.pregnancy ? html`<div class="pharm-item"><strong>Pregnancy:</strong> ${renderMarkdown(med.pregnancy)}</div>` : nothing}
						${med.half_life ? html`<div class="pharm-item"><strong>Half-life:</strong> ${renderMarkdown(med.half_life)}</div>` : nothing}
						${
							med.monograph_links.length > 0
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
			${renderFooter(med)}
		</div>
	`;
}

/** Credits and last-updated date; each part shows only when present */
function renderFooter(med: Medication): TemplateResult | typeof nothing {
	const parts = [
		med.authors?.primary && `Updated by: ${med.authors.primary}`,
		med.authors?.editors && `Ed: ${med.authors.editors}`,
		med.authors?.staff && `Reviewed by: ${med.authors.staff}`,
		med.updated && `Last updated: ${med.updated}`,
	].filter((p): p is string => !!p);
	if (parts.length === 0) return nothing;
	return html`<div class="med-footer">${parts.map((p, i) => html`<span>${i > 0 ? " | " : ""}${p}</span>`)}</div>`;
}

/** `<option>` list for a province select: "All Provinces" followed by each province */
const provinceOptions = (selected: string) =>
	["All", ...PROVINCES].map(
		(p) =>
			html`<option value="${p}" ?selected=${p === selected}>${p === "All" ? "All Provinces" : p}</option>`,
	);

function renderCoverageTable(
	coverage: MedicationCoverage[],
	selectedProvince: string,
	onProvinceChange?: (p: string) => void,
	isStandalone: boolean = false,
): TemplateResult {
	const filtered =
		selectedProvince === "All"
			? coverage
			: coverage.filter(
					(c: MedicationCoverage) =>
						!c.province || (c.province as string[]).includes(selectedProvince),
				);

	const handleProvChange = (e: Event) => {
		const val = (e.target as HTMLSelectElement).value;
		if (onProvinceChange) onProvinceChange(val);
	};

	const hasSpecificIndications = filtered.some(
		(c: MedicationCoverage) => c.indication && c.indication.length > 0,
	);

	return html`
		${
			isStandalone
				? html`
		<div class="coverage-controls">
			<label><strong>Province:</strong>
				<select @change=${handleProvChange} .value=${selectedProvince}>
					${provinceOptions(selectedProvince)}
				</select>
			</label>
		</div>`
				: nothing
		}
		<div class="coverage-tables">
			<div class="table-responsive-wrapper">
			<table class="med-dose-table">
				<thead>
					<tr>
						<th>Province</th>
						${hasSpecificIndications ? html`<th>Indication</th>` : nothing}
						<th class="status-col">
							Status 
							<span class="status-help-trigger" 
								@mouseenter=${(e: Event) => {
									const trigger = e.target as HTMLElement;
									const container = trigger.closest(".coverage-tables");
									if (container) {
										const tooltip = container.querySelector(
											".fast-tooltip",
										) as HTMLElement;
										if (tooltip) {
											const tRect = trigger.getBoundingClientRect();
											const cRect = container.getBoundingClientRect();
											tooltip.style.left = `${tRect.left - cRect.left + tRect.width / 2}px`;
										}
									}
								}}
							>ⓘ</span>
						</th>
						<th>Notes</th>
					</tr>
				</thead>
				<tbody>
					${filtered.map((cov: MedicationCoverage) => {
						let provsToDisplay = "All";
						if (cov.province && cov.province.length > 0) {
							if (selectedProvince !== "All") {
								// If they filtered for a specific province, just show that one.
								provsToDisplay = selectedProvince;
							} else {
								// Otherwise, show all the provinces this rule applies to.
								provsToDisplay = cov.province.join(", ");
							}
						}

						const indsToDisplay =
							cov.indication && cov.indication.length > 0
								? cov.indication.join(", ")
								: "All";

						return html`
						<tr>
							<td><strong>${provsToDisplay}</strong></td>
							${
								hasSpecificIndications
									? html`<td>${indsToDisplay}</td>`
									: nothing
							}
							<td>
								<span class="tag ${STATUS_CSS_MAP[cov.status]}">
									${cov.status}
								</span>
							</td>
							<td>${renderMarkdownBlock(cov.tips)}</td>
						</tr>
						`;
					})}
				</tbody>
			</table>
			</div>
			
			<div class="fast-tooltip">
				<strong>Open:</strong> General benefit<br>
				<strong>Restricted:</strong> Specific criteria (e.g. Special Auth)<br>
				<strong>Age-Restricted:</strong> Limited by age<br>
				<strong>Not Covered:</strong> Not on formulary
			</div>

			${filtered.length === 0 ? html`<p class="text-muted coverage-empty">No coverage data available for ${selectedProvince}.</p>` : nothing}
		</div>
	`;
}

/**
 * Derive the subset of canonical indication strings (from doses) that have at least one matching adverse-event rate entry. Used to build AE filter pills
 *
 * Matching is done via String.includes() — AE rate labels are freeform sub-labels
 * (e.g. "Asthma (200mg q2w)") that must contain the canonical string.
 *
 * @param med - The Medication data object
 * @param indications - Canonical indication strings, in dose order
 * @returns Ordered array of canonical indication strings that have AE data
 */
function getAEIndications(med: Medication, indications: string[]): string[] {
	return indications.filter((ind) =>
		med.side_effects.some((se) =>
			se.rates.some((rate) => rate.indication.includes(ind)),
		),
	);
}

/**
 * Render the full Adverse Events accordion content, including optional indication filter pills when the drug has ≥4 canonical indications with AE data
 *
 * @param med - The Medication data object
 * @param indications - Canonical indication strings, in dose order
 * @returns {TemplateResult} The AE accordion body
 */
function renderAEContent(
	med: Medication,
	indications: string[],
): TemplateResult {
	// comparator_name is set per symptom; if symptoms use different comparators, label each value instead of trusting one header
	const comparatorOf = (se: Medication["side_effects"][number]) =>
		se.comparator_name || "Placebo";
	const comparatorNames = new Set(med.side_effects.map(comparatorOf));
	const mixedComparators = comparatorNames.size > 1;
	const aeIndications = getAEIndications(med, indications);
	const showAEPills = aeIndications.length >= 4;

	const handleAEFilter = (e: Event, ind: string) => {
		const btn = e.currentTarget as HTMLElement;
		const content = btn.closest(".accordion-content") as HTMLElement;
		if (!content) return;

		// Update active pill styling within this accordion only
		content.querySelectorAll(".ae-filter-pills .pill").forEach((p) => {
			p.classList.remove("active");
		});
		btn.classList.add("active");

		// Filter AE rows using includes() matching per symptom group
		content
			.querySelectorAll(".ae-table tbody.ae-symptom-group")
			.forEach((tbody) => {
				const rows = Array.from(
					tbody.querySelectorAll("tr[data-indication]"),
				) as HTMLElement[];

				// Show/hide rows based on filter
				rows.forEach((row) => {
					const rowInd = row.getAttribute("data-indication") ?? "";
					row.style.display =
						ind === "All" || rowInd.includes(ind) ? "" : "none";
				});

				// Identify visible rows in this symptom group
				const visibleRows = rows.filter((row) => row.style.display !== "none");

				// Update symptom cell content and borders for visible rows
				visibleRows.forEach((row, idx) => {
					const symCell = row.querySelector(".ae-sym-cell") as HTMLElement;
					if (!symCell) return;

					if (idx === 0) {
						symCell.classList.remove("ae-hide-symptom");
					} else {
						symCell.classList.add("ae-hide-symptom");
					}

					if (idx === visibleRows.length - 1) {
						symCell.classList.remove("ae-no-border");
					} else {
						symCell.classList.add("ae-no-border");
					}
				});
			});
	};

	return html`
		${
			med.severe_side_effects
				? html`<div class="ae-severe"><strong>Severe:</strong> ${renderMarkdown(med.severe_side_effects)}</div>`
				: nothing
		}

		${
			showAEPills
				? html`
				<div class="ae-filter-pills">
					<button class="pill active" @click=${(e: Event) => handleAEFilter(e, "All")}>All</button>
					${aeIndications.map(
						(ind) =>
							html`<button class="pill" @click=${(e: Event) => handleAEFilter(e, ind)}>${ind}</button>`,
					)}
				</div>
			`
				: nothing
		}

		${
			med.side_effects.length > 0
				? html`
				<div class="table-responsive-wrapper">
				<table class="med-dose-table ae-table">
					<thead>
						<tr>
							<th>Symptom</th>
							<th>Indication</th>
							<th>Drug</th>
							<th>${mixedComparators ? "Comparator" : (comparatorNames.values().next().value ?? "Placebo")}</th>
						</tr>
					</thead>
					${med.side_effects.map(
						(se) => html`
						<tbody class="ae-symptom-group">
							${se.rates.map((rate, idx) => {
								const isLast = idx === se.rates.length - 1;
								const trClass = idx === 0 ? "ae-row-first" : "ae-row-cont";
								const cellClasses = [
									"ae-sym-cell",
									idx > 0 ? "ae-hide-symptom" : "",
									!isLast ? "ae-no-border" : "",
								]
									.filter(Boolean)
									.join(" ");

								return html`
									<tr data-indication="${rate.indication}" class="${trClass}">
										<td class="${cellClasses}">
											<div class="ae-symptom-content">
												<strong>${se.symptom}</strong>
												${se.notes ? html`<br><span class="text-muted ae-notes">${renderMarkdown(se.notes)}</span>` : nothing}
											</div>
										</td>
										<td>${rate.indication}</td>
										<td>${rate.drug}</td>
										<td>${rate.comparator ? (mixedComparators ? `${rate.comparator} (${comparatorOf(se)})` : rate.comparator) : "-"}</td>
									</tr>
								`;
							})}
						</tbody>
					`,
					)}
				</table>
				</div>
				${
					med.side_effects_source
						? html`<div class="text-muted ae-source">Source: ${renderMarkdown(med.side_effects_source)}</div>`
						: nothing
				}
			`
				: nothing
		}
	`;
}

/**
 * Render the indication filter pills at card level.
 * Pills are only rendered (and made sticky) when a drug has ≥4 indications.
 *
 * @param indications - The ordered list of canonical indication strings for this drug
 * @param selectedIndication - The currently active indication ('All' or a canonical string)
 * @param onIndicationChange - Callback fired when a pill is clicked
 * @returns {TemplateResult} The pill bar template
 */
function renderIndicationPills(
	indications: string[],
	selectedIndication: string,
	onIndicationChange?: (ind: string) => void,
): TemplateResult {
	const handleClick = (e: Event, ind: string) => {
		e.preventDefault();
		const btn = e.currentTarget as HTMLElement;
		const card = btn.closest(".med-card") as HTMLElement;
		if (!card) return;

		// Update active pill styling
		card.querySelectorAll(".med-sticky-pills .pill").forEach((p) => {
			p.classList.remove("active");
		});
		btn.classList.add("active");

		// Filter dose indication groups only.
		// AE filtering is handled independently by the pills inside the AE accordion.
		card.querySelectorAll(".med-indication-group").forEach((g) => {
			const groupInd = g.getAttribute("data-indication");
			(g as HTMLElement).style.display =
				ind === "All" || groupInd === ind ? "" : "none";
		});

		if (onIndicationChange) onIndicationChange(ind);
	};

	return html`
		<div class="med-sticky-pills">
			<button
				class="pill ${selectedIndication === "All" ? "active" : ""}"
				@click=${(e: Event) => handleClick(e, "All")}
			>All</button>
			${indications.map(
				(ind) => html`
					<button
						class="pill ${selectedIndication === ind ? "active" : ""}"
						@click=${(e: Event) => handleClick(e, ind)}
					>${ind}</button>
				`,
			)}
		</div>
	`;
}

/**
 * Render the doses section (indication groups and tables).
 * Pills are now rendered at card level; this function only handles the dose content.
 *
 * @param med - The Medication data object
 * @param indications - Canonical indication strings, in dose order
 * @param selectedIndication - The active indication filter ('All' or a canonical string).
 *   Used to set initial visibility when the card first renders.
 * @returns {TemplateResult} The rendered doses template
 */
function renderDoses(
	med: Medication,
	indications: string[],
	selectedIndication: string = "All",
): TemplateResult {
	return html`
		${
			med.available_forms.length > 0
				? html`<div class="med-forms"><strong>Available Forms:</strong> ${med.available_forms.join(", ")}</div>`
				: nothing
		}

		${indications.map((ind) => {
			const dosesForInd = med.doses.filter((d) => d.indication === ind);
			const isHidden =
				selectedIndication !== "All" && selectedIndication !== ind;
			return html`
				<div
					class="med-indication-group"
					data-indication="${ind}"
					style=${isHidden ? "display:none" : ""}
				>
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

	// De-duplicate notes: if every dose in this indication group has the identical non-empty notes string, render it once below the table instead of per-row.
	const firstNote = doses[0]?.notes;
	const allNotesIdentical =
		hasNotes && !!firstNote && doses.every((d) => d.notes === firstNote);
	const groupNote = allNotesIdentical ? firstNote : undefined;
	// Only show a Notes column when notes differ across rows
	const showNotesColumn = hasNotes && !allNotesIdentical;

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
					${showNotesColumn ? html`<th>Notes</th>` : nothing}
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
					${showNotesColumn ? html`<td>${renderMarkdown(dose.notes)}</td>` : nothing}
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
		${
			groupNote
				? html`<div class="indication-group-note">${renderMarkdown(groupNote)}</div>`
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
		province: getSavedProvince(),
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
			...med.brand_names,
			med.abbreviations || "",
		].join(" ");

		return {
			id,
			med,
			preparedText: fuzzysort.prepare(textToSearch),
		};
	});

	const update = () => {
		render(
			medIndexTemplate(
				state,
				allCategories,
				preparedSearchTargets,
				updateState,
			),
			container,
		);
	};

	const updateState = (newState: Partial<typeof state>) => {
		state = { ...state, ...newState };
		update();
	};

	// Single path for province changes, whether from the index bar or a standalone island (main.ts)
	document.addEventListener(PROVINCE_EVENT, (e: Event) => {
		updateState({ province: (e as CustomEvent<string>).detail });
	});

	update();
}

/**
 * Render the full Medication Index App (Search, Categories, and Results)
 *
 * @param state - The current state containing query and category
 * @param categories - Array of unique category names
 * @param preparedSearchTargets - Fuzzysort prepared targets for optimized searching
 * @param updateState - Callback to update state and trigger a re-render
 * @returns {TemplateResult} The medication index template
 */
export function medIndexTemplate(
	state: { query: string; category: string; province: string },
	categories: string[],
	preparedSearchTargets: {
		id: string;
		med: Medication;
		preparedText: Fuzzysort.Prepared | undefined;
	}[],
	updateState: (
		s: Partial<{ query: string; category: string; province: string }>,
	) => void,
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
			!target.med.categories.some((c) => c === state.category)
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
					placeholder="Search medications by generic or brand (i.e. cetirizine, dupilumab)..." 
					.value=${state.query} 
					@input=${handleInput}
				/>
				<select class="med-province-select" @change=${(e: Event) => {
					setProvince((e.target as HTMLSelectElement).value);
				}} .value=${state.province}>
					${provinceOptions(state.province)}
				</select>
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
									html`<div class="med-card-wrapper">${medCardTemplate(
										m.med,
										state.province,
										undefined, // index cards have no province select; the index bar owns it
										"All",
										undefined,
										false,
									)}</div>`,
							)
						: html`<div class="med-empty-state">No medications found matching your criteria.</div>`
				}
			</div>
		</div>
	`;
}
