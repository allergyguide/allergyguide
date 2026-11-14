import { render } from "lit-html";
import { describe, expect, it, vi } from "vitest";
import {
	filterCoverageForProvince,
	medCardTemplate,
	startingIndication,
} from "../components";
import { type Medication, MedicationSchema } from "../schema";

// Parse through the real schema so defaults and transforms match what the build ships
const makeMed = (overrides: Record<string, unknown>): Medication =>
	MedicationSchema.parse({
		display_name: "Testamine",
		otc: "no",
		moa: "H1 antagonist",
		pregnancy: "Avoid",
		side_effects_summary: "Well tolerated",
		...overrides,
	});

const renderCard = (med: Medication, province = "All") => {
	const el = document.createElement("div");
	render(medCardTemplate(med, province, undefined, "All", undefined, true), el);
	return el;
};

const text = (el: Element | null | undefined) =>
	(el?.textContent ?? "").replace(/\s+/g, " ").trim();

describe("dose table", () => {
	const med = makeMed({
		doses: [
			{
				indication: "CSU",
				patient_age: "≥12y",
				dose: "10 mg OD",
				sample_rx: "RX-A",
				adjustments: [
					{ condition: "Renal", dose: "5 mg OD" },
					{ condition: "Hepatic", dose: "No change" },
				],
			},
			{
				indication: "CSU",
				patient_age: "6-11y",
				dose: "5 mg OD",
				sample_rx: "RX-A",
				adjustments: [
					{ condition: "Renal", dose: "5 mg OD" },
					{ condition: "Hepatic", dose: "No change" },
				],
			},
			{
				indication: "CSU",
				patient_age: "2-5y",
				dose: "2.5 mg OD",
				sample_rx: "RX-B",
				adjustments: [{ condition: "Hepatic", dose: "No change" }],
			},
		],
	});
	const el = renderCard(med);
	const rows = Array.from(el.querySelectorAll(".med-doses tbody tr"));
	const doseCell = (i: number) => rows[i]?.querySelectorAll("td")[1];

	it("numbers an adjustment only on the rows it applies to", () => {
		expect(rows).toHaveLength(3);
		const supsOf = (i: number) =>
			Array.from(doseCell(i)?.querySelectorAll("sup:not(.rx-sup)") ?? []).map(
				(s) => s.textContent,
			);
		// Renal applies to rows 0-1 → footnote 1; Hepatic applies to all rows → no footnote
		expect(supsOf(0)).toEqual(["1"]);
		expect(supsOf(1)).toEqual(["1"]);
		expect(supsOf(2)).toEqual([]);

		const adjustments = Array.from(
			el.querySelectorAll(".med-adjustments p"),
		).map(text);
		expect(adjustments).toEqual(["1 Renal: 5 mg OD", "Hepatic: No change"]);
	});

	it("numbers distinct sample Rx per row", () => {
		expect(text(doseCell(0)?.querySelector(".rx-sup"))).toBe("[Rx1]");
		expect(text(doseCell(1)?.querySelector(".rx-sup"))).toBe("[Rx1]");
		expect(text(doseCell(2)?.querySelector(".rx-sup"))).toBe("[Rx2]");
		expect(
			Array.from(el.querySelectorAll(".med-sample-rxs code")).map(text),
		).toEqual(["Sample Rx 1: RX-A", "Sample Rx 2: RX-B"]);
	});
});

describe("coverage table", () => {
	const med = makeMed({
		coverage: [
			{ province: "BC", status: "Open" },
			{ province: ["ON", "QC"], status: "Restricted" },
			{ status: "Not Covered" },
		],
	});
	const rowsFor = (province: string) =>
		Array.from(
			renderCard(med, province).querySelectorAll(".coverage-tables tbody tr"),
		).map((tr) => [
			text(tr.querySelector("td")),
			text(tr.querySelector(".tag")),
		]);

	it("shows every rule for All provinces", () => {
		expect(rowsFor("All")).toEqual([
			["BC", "Open"],
			["ON, QC", "Restricted"],
			["All", "Not Covered"],
		]);
	});

	it("lets a province rule override the general rule for one province", () => {
		expect(rowsFor("ON")).toEqual([["ON", "Restricted"]]);
	});

	it("keeps the general rule where no province rule exists", () => {
		expect(rowsFor("AB")).toEqual([["All", "Not Covered"]]);
	});
});

describe("markdown rendering", () => {
	it("renders markdown inside link text and opens links in a new tab", () => {
		const el = renderCard(
			makeMed({ pearls: ["See [**PI**](https://example.org)"] }),
		);
		const link = el.querySelector(".pearls-list a");
		expect(link?.getAttribute("target")).toBe("_blank");
		expect(link?.getAttribute("rel")).toBe("noopener noreferrer");
		expect(link?.querySelector("strong")?.textContent).toBe("PI");
	});

	it("renders the AE summary as markdown in the static row too", () => {
		const el = renderCard(makeMed({ side_effects_summary: "Mostly **mild**" }));
		expect(
			el.querySelector("details.med-accordion .ae-inline-summary"),
		).toBeNull();
		expect(
			el.querySelector(".summary-static .ae-inline-summary strong")
				?.textContent,
		).toBe("mild");
	});

	it("strips script from markdown fields", () => {
		const el = renderCard(
			makeMed({ pearls: ["<img src=x onerror=alert(1)>"] }),
		);
		expect(
			el.querySelector(".pearls-list img")?.getAttribute("onerror"),
		).toBeNull();
	});
});

describe("monograph links", () => {
	const labels = (...links: string[]) =>
		Array.from(
			renderCard(makeMed({ monograph_links: links })).querySelectorAll(
				".pharm-item a",
			),
		).map(text);

	it("labels a monograph by its date", () => {
		expect(
			labels(
				"https://assets.allergyguide.ca/monographs/cetirizine-2025-03.pdf",
				"https://assets.allergyguide.ca/monographs/cetirizine-2025-12-v2.pdf",
			),
		).toEqual(["2025-03", "2025-12 (v2)"]);
	});

	it("handles drug names that contain hyphens", () => {
		expect(
			labels(
				"https://assets.allergyguide.ca/monographs/sodium-cromoglycate-2024-01.pdf",
			),
		).toEqual(["2024-01"]);
	});

	it("falls back to the file name when there is no date", () => {
		expect(
			labels("https://assets.allergyguide.ca/monographs/epipen.pdf"),
		).toEqual(["epipen"]);
	});
});

describe("adverse event comparator", () => {
	const header = (el: Element) =>
		text(el.querySelectorAll(".ae-table thead th")[3]);
	const comparatorCells = (el: Element) =>
		Array.from(el.querySelectorAll(".ae-table tbody tr")).map((tr) =>
			text(tr.querySelectorAll("td")[3]),
		);
	const rate = { drug: "10%", comparator: "2%" };

	it("uses the shared comparator as the column header", () => {
		const el = renderCard(
			makeMed({
				side_effects: [
					{ symptom: "A", comparator_name: "Vehicle", rates: [rate] },
					{ symptom: "B", comparator_name: "Vehicle", rates: [rate] },
				],
			}),
		);
		expect(header(el)).toBe("Vehicle");
		expect(comparatorCells(el)).toEqual(["2%", "2%"]);
	});

	it("labels each value when symptoms use different comparators", () => {
		const el = renderCard(
			makeMed({
				side_effects: [
					{ symptom: "A", rates: [rate] },
					{ symptom: "B", comparator_name: "Vehicle", rates: [rate] },
				],
			}),
		);
		expect(header(el)).toBe("Comparator");
		expect(comparatorCells(el)).toEqual(["2% (Placebo)", "2% (Vehicle)"]);
	});
});

describe("footer", () => {
	const footer = (overrides: Record<string, unknown>) =>
		text(renderCard(makeMed(overrides)).querySelector(".med-footer"));

	it("shows reviewer and last-updated date when present", () => {
		expect(
			footer({
				authors: { primary: "JY", staff: "Dr. X" },
				updated: "2025-05",
			}),
		).toBe("Updated by: JY | Reviewed by: Dr. X | Last updated: 2025-05");
	});

	it("renders nothing without credits or date", () => {
		expect(footer({})).toBe("");
	});
});

describe("schema", () => {
	it("rejects an unknown category and a malformed updated date", () => {
		const base = {
			display_name: "X",
			otc: "no",
			moa: "x",
			pregnancy: "x",
			side_effects_summary: "x",
		};
		expect(
			MedicationSchema.safeParse({ ...base, categories: ["Biologic"] }).success,
		).toBe(false);
		expect(
			MedicationSchema.safeParse({ ...base, updated: "May 2025" }).success,
		).toBe(false);
		expect(
			MedicationSchema.safeParse({
				...base,
				categories: ["biologic"],
				updated: "2025-05",
			}).success,
		).toBe(true);
	});
});

describe("coverage override by indication", () => {
	const med = makeMed({
		doses: [
			{ indication: "Asthma", patient_age: "≥12y", dose: "x" },
			{ indication: "CSU", patient_age: "≥12y", dose: "y" },
		],
		coverage: [
			{ status: "Not Covered" },
			{ province: "BC", indication: "Asthma", status: "Restricted" },
		],
	});
	const statuses = (province: string) =>
		filterCoverageForProvince(med.coverage, ["Asthma", "CSU"], province).map(
			(c) => c.status,
		);

	it("keeps the general rule when the province rule covers only some indications", () => {
		// BC overrides Asthma only; the general rule still applies to CSU
		expect(statuses("BC")).toEqual(["Not Covered", "Restricted"]);
	});

	it("drops the general rule once every indication it covers is overridden", () => {
		const full = [
			...med.coverage,
			{
				province: ["BC" as const],
				indication: ["CSU"],
				status: "Open" as const,
			},
		];
		expect(
			filterCoverageForProvince(full, ["Asthma", "CSU"], "BC").map(
				(c) => c.status,
			),
		).toEqual(["Restricted", "Open"]);
	});
});

describe("multi-indication doses", () => {
	const med = makeMed({
		doses: [
			{ indication: ["CSU", "AR"], patient_age: "≥12y", dose: "10 mg OD" },
			{ indication: "Asthma", patient_age: "≥12y", dose: "A" },
			{ indication: "EoE", patient_age: "≥12y", dose: "E" },
		],
		side_effects: [
			{
				symptom: "Headache",
				rates: [
					{ indication: "CSU", label: "CSU (high dose)", drug: "5%" },
					{ indication: "AR", drug: "2%" },
					{ indication: ["Asthma", "EoE"], drug: "3%" },
					{ drug: "1%" },
				],
			},
		],
	});

	it("shows a shared dose once, under a combined heading", () => {
		const headings = Array.from(
			renderCard(med).querySelectorAll(".med-indication-group h4"),
		).map(text);
		expect(headings).toEqual(["CSU, AR", "Asthma", "EoE"]);
	});

	it("shows the shared dose under each of its indication pills", () => {
		const el = renderCard(med);
		document.body.appendChild(el);
		const visibleGroups = () =>
			Array.from(el.querySelectorAll<HTMLElement>(".med-indication-group"))
				.filter((g) => g.style.display !== "none")
				.map((g) => text(g.querySelector("h4")));
		const pill = (label: string) =>
			Array.from(
				el.querySelectorAll<HTMLButtonElement>(".med-sticky-pills .pill"),
			).find((b) => text(b) === label);

		pill("AR")?.click();
		expect(visibleGroups()).toEqual(["CSU, AR"]);
		pill("Asthma")?.click();
		expect(visibleGroups()).toEqual(["Asthma"]);
		el.remove();
	});

	it("matches AE rows exactly, labels them, and always shows rows for all indications", () => {
		const el = renderCard(med);
		document.body.appendChild(el);
		const rows = () =>
			Array.from(el.querySelectorAll<HTMLElement>(".ae-table tbody tr"))
				.filter((r) => r.style.display !== "none")
				.map((r) => text(r.querySelectorAll("td")[1]));
		const aePill = (label: string) =>
			Array.from(
				el.querySelectorAll<HTMLButtonElement>(".ae-filter-pills .pill"),
			).find((b) => text(b) === label);

		expect(rows()).toEqual(["CSU (high dose)", "AR", "Asthma, EoE", "All"]);
		aePill("EoE")?.click();
		expect(rows()).toEqual(["Asthma, EoE", "All"]);
		aePill("CSU")?.click();
		expect(rows()).toEqual(["CSU (high dose)", "All"]);
		el.remove();
	});

	it("rejects coverage or AE indications that no dose uses", () => {
		const result = MedicationSchema.safeParse({
			display_name: "X",
			otc: "no",
			moa: "x",
			pregnancy: "x",
			side_effects_summary: "x",
			doses: [{ indication: "CSU", patient_age: "any", dose: "x" }],
			coverage: [{ indication: "Urticaria", status: "Open" }],
			side_effects: [
				{ symptom: "s", rates: [{ indication: "csu", drug: "1%" }] },
			],
		});
		expect(result.success).toBe(false);
		expect(result.error?.issues.map((i) => i.path.join("."))).toEqual([
			"coverage.0.indication",
			"side_effects.0.rates.0.indication",
		]);
	});

	it("starts a popup on the page's indication, for doses and AEs", () => {
		const start = startingIndication(med, "EoE");
		const el = document.createElement("div");
		render(
			medCardTemplate(med, "All", undefined, start, undefined, true, start),
			el,
		);
		const shown = (sel: string) =>
			Array.from(el.querySelectorAll<HTMLElement>(sel)).filter(
				(e) => e.style.display !== "none",
			);
		expect(
			shown(".med-indication-group").map((g) => text(g.querySelector("h4"))),
		).toEqual(["EoE"]);
		expect(text(el.querySelector(".med-sticky-pills .pill.active"))).toBe(
			"EoE",
		);
		expect(text(el.querySelector(".ae-filter-pills .pill.active"))).toBe("EoE");
		const aeRows = shown(".ae-table tbody tr");
		expect(aeRows.map((r) => text(r.querySelectorAll("td")[1]))).toEqual([
			"Asthma, EoE",
			"All",
		]);
		// The first visible row carries the symptom name; the last one closes the border
		const cell = (r: HTMLElement) =>
			r.querySelector(".ae-sym-cell") as HTMLElement;
		expect(cell(aeRows[0]).classList.contains("ae-hide-symptom")).toBe(false);
		expect(cell(aeRows[0]).classList.contains("ae-no-border")).toBe(true);
		expect(cell(aeRows[1]).classList.contains("ae-no-border")).toBe(false);
	});

	it("falls back to All for an indication the drug does not have", () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		expect(startingIndication(med, "eoe")).toBe("All");
		expect(warn).toHaveBeenCalledOnce();
		expect(startingIndication(med, null)).toBe("All");
		expect(startingIndication(med, "AR")).toBe("AR");
	});
});
