import { render } from "lit-html";
import { describe, expect, it } from "vitest";
import { medCardTemplate } from "../components";
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

	it("keeps matching and province-less rules for one province", () => {
		expect(rowsFor("ON")).toEqual([
			["ON", "Restricted"],
			["All", "Not Covered"],
		]);
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
	it("labels a monograph by its date", () => {
		const el = renderCard(
			makeMed({
				monograph_links: [
					"https://assets.allergyguide.ca/monographs/cetirizine-2025-03.pdf",
				],
			}),
		);
		expect(text(el.querySelector(".pharm-item a"))).toBe("2025-03");
	});
});
