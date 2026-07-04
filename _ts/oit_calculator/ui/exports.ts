/**
 * @module
 *
 * Handle Export buttons (PDF, ASCII) and call actual export module from exports
 */

import { exportASCII, generatePdf } from "../export/exports";
import { generatePatientHandout } from "../export/handout";
import { workspace } from "../state/instances";
import { type ProtocolExportData, SourceType } from "../types";
import { serializeProtocol } from "../utils";
import type { HandoutSelection } from "./components/HandoutModal";
import { showHandoutModal } from "./components/HandoutModal";
import { isClickwrapAccepted, showClickwrapModal } from "./modals";

/**
 * Optimistic async loading of some heavy libraries needed for creation and merging of PDFs
 */
export function prefetchPdfLibraries() {
	// Use requestIdleCallback if available, otherwise setTimeout
	const requestIdle =
		window.requestIdleCallback || ((cb) => setTimeout(cb, 1000));

	requestIdle(() => {
		import("jspdf");
		import("pdf-lib");
		import("jspdf-autotable");
		import("qrcode");
		import("pako");
	});
}

/**
 * Gathers data from all non-empty tabs in the workspace for export.
 */
function getExportDataFromWorkspace(): ProtocolExportData[] {
	const states = workspace.getAllProtocolStates();
	const exportData: ProtocolExportData[] = [];

	for (const state of states) {
		const protocol = state.getProtocol();
		if (protocol) {
			exportData.push({
				protocol,
				customNote: state.getCustomNote(),
				history: state.getHistory(),
			});
		}
	}

	return exportData;
}

/**
 * Initialize event listeners for the export action buttons
 * listen for clicks on:
 * - `#export-ascii`
 * - `#export-pdf`: Checks for a valid clickwrap acceptance token first
 * - If accepted: Immediately triggers the PDF generation workflow
 * - If NOT accepted: Opens the Clickwrap Modal to enforce terms of use acceptance
 */
export function initExportEvents(): void {
	document.addEventListener("click", async (e) => {
		const target = e.target as HTMLElement;
		if (target.id === "export-ascii") {
			const data = getExportDataFromWorkspace();
			if (data.length > 0) {
				exportASCII(data);
			}
		} else if (target.id === "export-pdf") {
			if (isClickwrapAccepted()) {
				await triggerPdfGeneration();
			} else {
				showClickwrapModal();
			}
		} else if (target.id === "export-handout") {
			showHandoutModal();
		}
	});
}

/**
 * Orchestrates the PDF generation workflow with UI feedback and dynamic loading
 *
 * @returns promise that resolves when the generation is complete (or failed)
 */
export async function triggerPdfGeneration(): Promise<void> {
	const pdfBtn = document.getElementById("export-pdf");
	const modalPdfBtn = document.getElementById("clickwrap-generate-btn");

	const data = getExportDataFromWorkspace();
	if (data.length === 0) return;

	if (pdfBtn) {
		pdfBtn.textContent = "Generating...";
		pdfBtn.setAttribute("disabled", "true");
	}
	if (modalPdfBtn) {
		modalPdfBtn.textContent = "Generating...";
		modalPdfBtn.setAttribute("disabled", "true");
	}

	try {
		// dynamic load of libs regardless if its modal or pdfbtn licked
		const { jsPDF } = await import("jspdf");
		const { PDFDocument } = await import("pdf-lib");
		const { applyPlugin } = await import("jspdf-autotable");
		applyPlugin(jsPDF);

		await generatePdf(data, jsPDF, PDFDocument);
	} catch (error) {
		console.error("Failed to load PDF libraries or generate PDF: ", error);
		alert("Error generating PDF. Please check the console for details.");
	} finally {
		const activeStates = workspace
			.getAllProtocolStates()
			.filter((s) => s.getProtocol());
		const label = activeStates.length > 1 ? "Export All (PDF)" : "Export PDF";

		if (pdfBtn) {
			pdfBtn.textContent = label;
			pdfBtn.removeAttribute("disabled");
		}
		if (modalPdfBtn) {
			modalPdfBtn.textContent = "Generate PDF";
		}
	}
}

/**
 * Serializes the active protocol and copies it to the clipboard
 * Useful for generation of provisioned protocol JSONS for the private backend
 */
export async function copyActiveProtocolAsProvisioned(): Promise<void> {
	const activeTab = workspace.getActive();
	const p = activeTab.getProtocol();
	if (!p) {
		alert("No active protocol to export.");
		return;
	}

	// Serialize using standard utility
	const data = serializeProtocol(p, activeTab.getCustomNote());

	// Force identity to PROVISIONED for repo migration
	// would always like a new id
	data.id = crypto.randomUUID();
	data.source = SourceType.PROVISIONED;
	data.last_updated = new Date().toISOString();

	// Stringify and copy
	const json = JSON.stringify(data, null, 2);

	try {
		await navigator.clipboard.writeText(json);
		console.log("Protocol exported as PROVISIONED JSON:", data);
		alert("Copied PROVISIONED JSON to clipboard!");
	} catch (err) {
		console.error("Failed to copy JSON to clipboard:", err);
		alert("Failed to copy JSON to clipboard. See console.");
	}
}

/**
 * Orchestrates the patient handout generation workflow
 */
export async function triggerPatientHandoutGeneration(
	selections: HandoutSelection[],
	startDate: string,
): Promise<void> {
	const handoutBtn = document.getElementById("export-handout");

	if (handoutBtn) {
		handoutBtn.textContent = "Generating...";
		handoutBtn.setAttribute("disabled", "true");
	}

	try {
		const { jsPDF } = await import("jspdf");
		const { PDFDocument } = await import("pdf-lib");
		const { applyPlugin } = await import("jspdf-autotable");
		applyPlugin(jsPDF);

		await generatePatientHandout(selections, startDate, jsPDF, PDFDocument);
	} catch (error) {
		console.error("Failed to generate Handout PDF: ", error);
		alert(
			"Error generating Handout PDF. Please check the console for details.",
		);
	} finally {
		if (handoutBtn) {
			handoutBtn.textContent = "Patient Handout PDF";
			handoutBtn.removeAttribute("disabled");
		}
	}
}
