import type { jsPDF } from "jspdf";
import type { PDFDocument } from "pdf-lib";
import type { Food, Step } from "../types";
import { FoodType, Method } from "../types";
import type { HandoutSelection } from "../ui/components/HandoutModal";
import { formatAmount, formatNumber } from "../utils";

export async function generatePatientHandout(
	selections: HandoutSelection[],
	startDate: string,
	JsPdfClass: typeof jsPDF,
	PdfDocClass: typeof PDFDocument,
): Promise<void> {
	const doc = new JsPdfClass({ unit: "pt", format: "letter" });

	// --- PAGE 1: Front Side ---
	let y = 40;
	doc.setFont("helvetica", "bold");
	doc.setFontSize(16);
	doc.text("DAILY OIT DOSING INSTRUCTIONS", 40, y);
	y += 30;

	doc.setFontSize(12);
	doc.setFont("helvetica", "normal");
	doc.text("Name:", 40, y);
	// Field space for name (approx 150pt wide)
	doc.text("Start Date:", 350, y);
	// Field space for start date (approx 150pt wide)
	y += 40;

	doc.setFont("helvetica", "bold");
	doc.text("DOSING AND PREPARATION BY FOOD", 40, y);
	doc.setLineWidth(1);
	doc.line(40, y + 5, 570, y + 5);
	y += 30;

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
			y = 40;
		}

		doc.setFont("helvetica", "bold");
		doc.setFontSize(12);
		doc.text(`${food.name.toUpperCase()} (Step ${step.stepIndex})`, 40, y);
		y += 15;

		doc.setFont("helvetica", "normal");
		doc.setFontSize(10);
		const targetStr = `${formatNumber(step.targetMg, 1)} mg`;
		const doseStr =
			step.method === Method.CAPSULE
				? "Capsule"
				: `${formatAmount(step.dailyAmount, step.dailyAmountUnit)} ${step.dailyAmountUnit}`;
		doc.text(`Target Daily Protein: ${targetStr}`, 40, y);
		doc.text(`Daily Dose: ${doseStr}`, 250, y);
		y += 10;
		doc.setLineWidth(0.5);
		doc.line(40, y, 570, y);
		y += 15;

		y = renderInstructions(doc, y, step, food);
		y += 20;
	}

	// Checklist
	if (y > 610) {
		doc.addPage();
	}
	y = 650;

	doc.setLineWidth(1);
	doc.line(40, y - 15, 570, y - 15);
	doc.setFont("helvetica", "bold");
	doc.setFontSize(12);
	doc.text(
		"PRE-UPDOSE REVIEW CHECKLIST (fill out to review at your next appointment)",
		40,
		y,
	);
	y += 20;

	doc.setFont("helvetica", "normal");
	doc.setFontSize(10);
	doc.text("1. Total missed doses: ________ days", 40, y);
	y += 20;
	doc.text("2. Any mild side effects?", 40, y);
	doc.text("[   ] No    [   ] Yes", 350, y);
	y += 20;
	doc.text("3. Any severe reactions?", 40, y);
	doc.text("[   ] No    [   ] Yes (Record on back)", 350, y);
	y += 20;
	doc.text("4. Epinephrine check:", 40, y);
	y += 15;
	doc.text("   - Is your epinephrine auto-injector up-to-date?", 40, y);
	doc.text("[   ] Yes   [   ] No", 350, y);
	y += 15;
	doc.text("   - Do you need a refill prescription today?", 40, y);
	doc.text("[   ] Yes   [   ] No", 350, y);

	// --- PAGE 2: Back Side ---
	doc.addPage();
	y = 40;

	doc.setFont("helvetica", "bold");
	doc.setFontSize(16);
	doc.text("REACTION LOG", 40, y);
	y += 20;

	doc.setFont("helvetica", "normal");
	doc.setFontSize(10);
	const instructions = doc.splitTextToSize(
		"Use this table to write down any missed doses, mild side effects, or severe reactions. Bring this sheet to your next appointment.",
		530,
	);
	doc.text(instructions, 40, y);
	y += 30;

	// Draw Table (6 empty rows)
	// biome-ignore lint/suspicious/noExplicitAny: jsPDF autotable is not fully typed
	(doc as any).autoTable({
		startY: y,
		head: [
			[
				"Date",
				"Food",
				"Symptoms and circumstances (e.g. exercise, flu)",
				"Action Taken",
			],
		],
		body: Array(9).fill(["", "", "", ""]),
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

	// biome-ignore lint/suspicious/noExplicitAny: jsPDF autotable is not fully typed
	y = (doc as any).lastAutoTable.finalY + 30;

	doc.setFont("helvetica", "bold");
	doc.setFontSize(12);
	doc.text("ADDITIONAL NOTES", 40, y);
	doc.setLineWidth(1);
	doc.line(40, y + 5, 570, y + 5);
	y += 25;

	// Notes space (blank lines)
	doc.setLineWidth(0.5);
	for (let i = 0; i < 4; i++) {
		if (y > 750) break;
		doc.line(40, y + 15, 570, y + 15);
		y += 25;
	}

	const pdfBytes = doc.output("arraybuffer");

	// --- ADD ACROFORMS via PDF-LIB ---
	const pdfDoc = await PdfDocClass.load(pdfBytes);
	const form = pdfDoc.getForm();

	const firstPage = pdfDoc.getPages()[0];

	// Name field
	const nameField = form.createTextField("handout.name");
	nameField.addToPage(firstPage, {
		x: 80,
		y: firstPage.getHeight() - 72,
		width: 250,
		height: 18,
	});

	// Start Date field
	const dateField = form.createTextField("handout.startDate");
	dateField.setText(startDate);
	dateField.addToPage(firstPage, {
		x: 410,
		y: firstPage.getHeight() - 72,
		width: 150,
		height: 18,
	});

	// Form fields on page 1 only
	// (Additional Notes on page 2 is intended for physical writing only)

	const finalBytes = await pdfDoc.save();
	const blob = new Blob([finalBytes as unknown as BlobPart], {
		type: "application/pdf",
	});
	const blobUrl = URL.createObjectURL(blob);

	// Download logic
	const isMobile =
		/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
		(navigator.maxTouchPoints > 0 && window.innerWidth <= 1024);
	if (isMobile) {
		const downloadLink = document.createElement("a");
		downloadLink.href = blobUrl;
		downloadLink.download = "Patient_Handout.pdf";
		downloadLink.style.display = "none";
		document.body.appendChild(downloadLink);
		downloadLink.click();
		document.body.removeChild(downloadLink);
		setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
	} else {
		const w = window.open(blobUrl, "_blank");
		if (!w) {
			const downloadLink = document.createElement("a");
			downloadLink.href = blobUrl;
			downloadLink.download = "Patient_Handout.pdf";
			downloadLink.style.display = "none";
			document.body.appendChild(downloadLink);
			downloadLink.click();
			document.body.removeChild(downloadLink);
		}
		setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
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
		lines.push(`* Direct Dose: No mixing required. Measure fresh daily.`);
	}

	for (const line of lines) {
		const wrapped = doc.splitTextToSize(line, 530);
		for (const w of wrapped) {
			doc.text(w, 40, y);
			y += 14;
		}
	}

	return y;
}
