import type { jsPDF } from "jspdf";
import type { PDFDocument } from "pdf-lib";
import type { Food, HandoutSelection, Step } from "../types";
import { FoodType, Method } from "../types";
import { formatAmount, formatNumber, getMeasuringUnit } from "../utils";

const MARGIN_X = 60;
const PAGE_WIDTH = 612; // letter size is 8.5 x 11 inches, 72 points per inch
const MAX_X = PAGE_WIDTH - MARGIN_X;
const CONTENT_WIDTH = MAX_X - MARGIN_X;

// Layout constants for the name/date fields on page 1
const DATE_FIELD_WIDTH = 150; // width of the AcroForm date input
const DATE_LABEL_WIDTH = 65; // approximate rendered width of "Start Date:" at 12pt

export async function generatePatientHandout(
	selections: HandoutSelection[],
	startDate: string,
	JsPdfClass: typeof jsPDF,
	PdfDocClass: typeof PDFDocument,
): Promise<void> {
	const doc = new JsPdfClass({ unit: "pt", format: "letter" });

	// --- PAGE 1: Front Side ---
	let y = 60;
	doc.setFont("helvetica", "bold");
	doc.setFontSize(16);
	doc.text("DAILY OIT DOSING INSTRUCTIONS", MARGIN_X, y);
	y += 30;

	doc.setFontSize(12);
	doc.setFont("helvetica", "normal");
	doc.text("Name:", MARGIN_X, y);
	// Field space for name (approx 150pt wide)
	doc.text("Start Date:", MAX_X - DATE_FIELD_WIDTH - DATE_LABEL_WIDTH, y);
	// Field space for start date (approx 150pt wide)
	y += 40;

	for (const selection of selections) {
		const step = selection.protocol.steps.find(
			(s) => s.stepIndex === selection.stepIndex,
		);
		if (!step) continue;

		const food =
			step.food === "A" ? selection.protocol.foodA : selection.protocol.foodB;
		if (!food) continue;

		if (y > 600) {
			doc.addPage();
			y = 60;
		}

		doc.setFont("helvetica", "bold");
		doc.setFontSize(12);
		let titleText = `${food.name.toUpperCase()}`;
		if (food.type !== FoodType.CAPSULE) {
			const unit = getMeasuringUnit(food);
			titleText += ` (${formatNumber(food.gramsInServing, 2)}g protein / ${food.servingSize}${unit})`;
		}
		titleText += ` - Step ${step.stepIndex}`;

		doc.text(titleText, MARGIN_X, y);
		y += 18;

		doc.setFont("helvetica", "normal");
		doc.setFontSize(12);
		const targetStr = `${formatNumber(step.targetMg, 1)} mg`;
		const doseStr =
			step.method === Method.CAPSULE
				? "Capsule"
				: `${formatAmount(step.dailyAmount, step.dailyAmountUnit)} ${step.dailyAmountUnit}`;
		doc.text(`Target Daily Protein: ${targetStr}`, MARGIN_X, y);
		doc.text(`Daily Dose: ${doseStr}`, MARGIN_X + 210, y);
		y += 12;
		doc.setLineWidth(0.5);
		doc.line(MARGIN_X, y, MAX_X, y);
		y += 18;

		y = renderInstructions(doc, y, step, food);
		y += 24;
	}

	// --- PAGE 2: Back Side ---
	doc.addPage();
	y = 60;

	// Checklist on Back Side
	doc.setFont("helvetica", "bold");
	doc.setFontSize(12);
	doc.text(
		"PRE-UPDOSE REVIEW CHECKLIST (fill out to review at your next appointment)",
		MARGIN_X,
		y,
	);
	y += 25;

	doc.setFont("helvetica", "normal");
	doc.setFontSize(10);
	doc.text("1. Total missed doses: ________ days", MARGIN_X, y);
	y += 25;
	doc.text("2. Any mild side effects?", MARGIN_X, y);
	doc.text("[   ] No    [   ] Yes", MARGIN_X + 310, y);
	y += 25;
	doc.text("3. Any severe reactions?", MARGIN_X, y);
	doc.text("[   ] No    [   ] Yes (Record below)", MARGIN_X + 310, y);
	y += 25;
	doc.text("4. Epinephrine check:", MARGIN_X, y);
	y += 20;
	doc.text("   - Is your epinephrine auto-injector up-to-date?", MARGIN_X, y);
	doc.text("[   ] Yes   [   ] No", MARGIN_X + 310, y);
	y += 20;
	doc.text("   - Do you need a refill prescription today?", MARGIN_X, y);
	doc.text("[   ] Yes   [   ] No", MARGIN_X + 310, y);

	y += 40;
	doc.setLineWidth(1);
	doc.line(MARGIN_X, y, MAX_X, y);
	y += 25;

	// Reaction Log
	doc.setFont("helvetica", "bold");
	doc.setFontSize(16);
	doc.text("REACTION LOG", MARGIN_X, y);
	y += 20;

	doc.setFont("helvetica", "normal");
	doc.setFontSize(10);
	const instructions = doc.splitTextToSize(
		"Use this table to write down any missed doses, mild side effects, or severe reactions. Bring this sheet to your next appointment.",
		CONTENT_WIDTH,
	);
	doc.text(instructions, MARGIN_X, y);
	y += 30;

	// Draw Table (8 empty rows fits nicely with the added checklist)
	// biome-ignore lint/suspicious/noExplicitAny: jsPDF autotable is not fully typed
	(doc as any).autoTable({
		startY: y,
		margin: { left: MARGIN_X, right: MARGIN_X },
		head: [
			[
				"Date",
				"Food",
				"Symptoms and circumstances (e.g. exercise, flu)",
				"Action Taken",
			],
		],
		body: Array(8).fill(["", "", "", ""]),
		theme: "grid",
		styles: { minCellHeight: 45, fontSize: 10 },
		headStyles: { fillColor: [220, 220, 220], textColor: 0, fontStyle: "bold" },
		columnStyles: {
			0: { cellWidth: 70 },
			1: { cellWidth: 80 },
			2: { cellWidth: "auto" },
			3: { cellWidth: 120 },
		},
	});

	const pdfBytes = doc.output("arraybuffer");

	// --- ADD ACROFORMS via PDF-LIB ---
	const pdfDoc = await PdfDocClass.load(pdfBytes);
	const form = pdfDoc.getForm();

	const firstPage = pdfDoc.getPages()[0];

	// Name field
	const nameField = form.createTextField("handout.name");
	nameField.addToPage(firstPage, {
		x: MARGIN_X + 45,
		y: firstPage.getHeight() - 92, // PDF-lib uses bottom-left origin (8.5x11 inches = 612x792 pt)
		width: 180,
		height: 18,
		borderWidth: 0,
	});

	// Start Date field
	const dateField = form.createTextField("handout.startDate");
	dateField.setText(startDate);
	dateField.addToPage(firstPage, {
		x: MAX_X - 150,
		y: firstPage.getHeight() - 92,
		width: 150,
		height: 18,
		borderWidth: 0,
	});

	const finalBytes = await pdfDoc.save();
	// pdf-lib's save() returns Uint8Array<ArrayBufferLike>; copying it gives
	// Uint8Array<ArrayBuffer> (never SharedArrayBuffer), which BlobPart accepts
	const blob = new Blob([new Uint8Array(finalBytes)], {
		type: "application/pdf",
	});
	const blobUrl = URL.createObjectURL(blob);

	const forceDownload = () => {
		const downloadLink = document.createElement("a");
		downloadLink.href = blobUrl;
		downloadLink.download = "Patient_Handout.pdf";
		downloadLink.style.display = "none";
		document.body.appendChild(downloadLink);
		downloadLink.click();
		document.body.removeChild(downloadLink);
	};

	// Download logic
	const isMobile =
		/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
		(navigator.maxTouchPoints > 0 && window.innerWidth <= 1024);

	if (isMobile) {
		forceDownload();
		// 60s gives the OS download manager time to start reading the blob
		setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
	} else {
		const w = window.open(blobUrl, "_blank");
		if (!w) {
			forceDownload();
		}
		// Keep the URL alive long enough for the browser tab to finish rendering the PDF
		setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
	}
}

function renderInstructions(
	doc: jsPDF,
	y: number,
	step: Step,
	food: Food,
): number {
	const lines: string[] = [];

	if (step.method === Method.CAPSULE) {
		lines.push(
			`1. Mix the contents of one ${step.targetMg} mg capsule with soft food (e.g., applesauce or yogurt).`,
		);
	} else if (step.method === Method.DILUTE) {
		const mixFoodAmountStr = step.mixFoodAmount
			? formatAmount(
					step.mixFoodAmount,
					food.type === FoodType.SOLID ? "g" : "ml",
				)
			: "0";
		const mixUnit = food.type === FoodType.SOLID ? "g" : "ml";
		const mixWaterAmountStr = step.mixWaterAmount
			? formatAmount(step.mixWaterAmount, "ml")
			: "0";
		const drawAmount = formatAmount(step.dailyAmount, step.dailyAmountUnit);

		lines.push(
			`1. Measure ${mixFoodAmountStr} ${mixUnit} of "${food.name}" using ${mixUnit === "g" ? "a scale" : "your syringe(s)"}.`,
		);
		lines.push(
			`2. Mix the ${mixUnit === "g" ? "powder" : "liquid"} into ${mixWaterAmountStr} mL of liquid (water, juice, or milk).`,
		);
		lines.push(`3. Shake or stir thoroughly until fully dissolved.`);
		lines.push(`4. Draw ${drawAmount} mL of the mixture using a syringe.`);
		lines.push(
			`5. Give ${drawAmount} mL directly or mix with soft food (e.g., applesauce or yogurt).`,
		);
		lines.push(
			`* Mixture Lifespan: Discard unused mixture after 3 days (ask your doctor if it can be longer). Store in a clean, sealed container in the refrigerator.`,
		);
	} else {
		const drawAmount = formatAmount(step.dailyAmount, step.dailyAmountUnit);
		const unit = step.dailyAmountUnit;
		lines.push(`1. Measure ${drawAmount} ${unit} of "${food.name}" directly.`);
		lines.push(
			`2. Give ${drawAmount} ${unit} directly or mix with soft food (e.g., applesauce or yogurt).`,
		);
	}

	for (const line of lines) {
		const wrapped = doc.splitTextToSize(line, CONTENT_WIDTH);
		for (const w of wrapped) {
			doc.text(w, MARGIN_X, y);
			y += 16;
		}
	}

	return y;
}
