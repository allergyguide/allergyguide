/**
 * @module
 *
 * Void functions that trigger: 1) PDF document to download in new tab 2) copy ASCII protocol to clipboard
 */

import { FoodType, Method, HttpError } from "../types";
import type { Protocol, Unit, Step, Food } from "../types";
import { formatNumber, formatAmount } from "../utils";
import { getFoodAStepCount } from "../core/protocol";
import type { jsPDF } from 'jspdf';
import type { PDFDocument } from 'pdf-lib';
import { protocolState } from "../state/instances";
import { generateUserHistoryPayload } from "../core/minify";
import { appState } from "../main"; // We need access to the global appState
import { loadSecureAsset } from "../data/api";

// Need global commit hash 
// And current tool version
declare const __COMMIT_HASH__: string;
declare const __VERSION_OIT_CALCULATOR__: string;

// ============================================
// HELPER FUNCTIONS
// ============================================

interface ExportRow {
  stepIndex: number;
  targetProtein: string;
  method: Method;
  mixDetails: string;
  dailyAmount: string;
  interval: string;
}

/**
 * Prepares table rows for a subset of steps (Food A or Food B).
 * Shared logic for formatting amounts and mix instructions.
 */
function buildStepRows(steps: Step[], foodType: FoodType, isLastPhase: boolean): ExportRow[] {
  return steps.map((step, index) => {
    let dailyAmountStr = `${formatAmount(step.dailyAmount, step.dailyAmountUnit)} ${step.dailyAmountUnit}`;
    let mixDetails = "N/A";

    if (step.method === Method.DILUTE) {
      const mixUnit: Unit = foodType === FoodType.SOLID ? "g" : "ml";
      mixDetails = `${formatAmount(step.mixFoodAmount!, mixUnit)} ${mixUnit} food + ${formatAmount(step.mixWaterAmount!, "ml")} ml water`;
    }

    const isLastStep = index === steps.length - 1;
    const interval = (isLastStep && isLastPhase) ? "Continue long term" : "2-4 weeks";

    return {
      stepIndex: step.stepIndex,
      targetProtein: `${formatNumber(step.targetMg, 1)} mg`,
      method: step.method,
      mixDetails,
      dailyAmount: dailyAmountStr,
      interval,
    };
  });
}

async function generateCompressedQrCode(): Promise<string | null> {
  try {
    const history = protocolState.getHistory();
    const payload = generateUserHistoryPayload(history);
    if (!payload) return null;

    const [{ default: QRCode }, { deflate }] = await Promise.all([
      import('qrcode'),
      import('pako')
    ]);

    const jsonStr = JSON.stringify(payload);
    const compressed = deflate(jsonStr);

    // Convert Uint8Array to binary string for btoa
    // Using reduce for large arrays can stack overflow, simple loop is safer here
    let binary = '';
    const len = compressed.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(compressed[i]);
    }
    const b64 = btoa(binary);

    return await QRCode.toDataURL(b64, {
      errorCorrectionLevel: 'M',
      width: 800,
      margin: 1
    });
  } catch (e) {
    console.warn("Could not generate QR code", e);
    return null;
  }
}

/**
 * Helper to fetch a PDF as buffer securely.
 * Note: If the file path doesn't look like a file (e.g. "protocol"), this won't be called.
 */
async function fetchSecurePdfBytes(path: string): Promise<ArrayBuffer> {
  // If it's a legacy public path (starts with /), fetch normally, otherwise secure
  if (path.startsWith('/')) {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`Failed to load ${path}`);
    return res.arrayBuffer();
  }

  try {
    const result = await loadSecureAsset(path, 'buffer');
    return result as ArrayBuffer;
  } catch (err) {
    console.error("Unable to fetch secure asset in exports.ts")
    throw err
  }
}

// ============================================
// PDF SECTION RENDERERS
// ============================================
// All renderers receive the doc and current Y, and return the new Y

function renderHeader(doc: jsPDF, y: number): number {
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Oral Immunotherapy Protocol", 40, y);
  return y + 30;
}

function renderFoodSection(doc: jsPDF, y: number, name: string, food: any, rows: ExportRow[], titleMaxWidth?: number): number {
  // Check page break before starting section
  if (y > 650) {
    doc.addPage();
    y = 40;
  }

  // Title
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");

  const splitTitle = doc.splitTextToSize(name, titleMaxWidth || 520);
  // 440 for first food A
  doc.text(splitTitle, 40, y);
  y += (20 * splitTitle.length);

  // Subtitle
  const unit = food.type === FoodType.SOLID ? "g" : "ml";
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Protein: ${formatNumber(food.gramsInServing, 2)} g per ${food.servingSize} ${unit} serving.`,
    40,
    y
  );
  y += 15;

  // Table
  const tableBody = rows.map(r => [
    r.stepIndex,
    r.targetProtein,
    r.method,
    r.mixDetails,
    r.dailyAmount,
    r.interval,
  ]);

  (doc as any).autoTable({
    startY: y,
    head: [["Step", "Protein", "Method", "How to make mix", "Daily Amount", "Interval"]],
    body: tableBody,
    theme: "striped",
    headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 6, overflow: 'linebreak', valign: 'middle', halign: 'left' },
    columnStyles: {
      0: { halign: 'center' },
      1: { halign: 'center' },
      2: { halign: 'center' },
    },
    margin: { left: 40, right: 40 },
  });

  return (doc as any).lastAutoTable.finalY + 20;
}

function renderNotes(doc: jsPDF, y: number, note: string): number {
  if (!note || !note.trim()) return y;

  if (y > 650) {
    doc.addPage();
    y = 40;
  }

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Notes", 40, y);
  y += 15;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");

  const maxWidth = 520;
  const lines = doc.splitTextToSize(note.trim(), maxWidth);

  for (const line of lines) {
    if (y > 730) {
      doc.addPage();
      y = 40;
    }
    doc.text(line, 40, y);
    y += 14;
  }
  return y;
}

function renderFooterAndQR(doc: jsPDF, qrDataUrl: string | null) {
  const pageCount = doc.internal.pages.length;
  for (let i = 1; i < pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(100);
    doc.text(`Always verify calculations before clinical use. Current tool version-hash: v${__VERSION_OIT_CALCULATOR__}-${__COMMIT_HASH__}`, 40, 772);
    doc.setTextColor(0);
  }

  if (qrDataUrl) {
    // Always on Page 1, top right
    doc.setPage(1);
    doc.addImage(qrDataUrl, 'PNG', 493, 10, 80, 80);
  }
}

// --- MAIN EXPORT FUNCTION --



/**
 * Generate a printable PDF of the current protocol using jsPDF + autoTable.
 *
 * Includes:
 * - Food A section (and Food B when present)
 * - step tables with intervals
 * - optional notes section
 * - footer disclaimer
 *
 * Opens in a new tab where possible; falls back to direct download.
 *
 * @param protocol Protocol
 * @param customNote string
 * @param JsPdfClass  - the jsPDF constructor
 * @param PdfDocClass - static class for PDFDocument
 * @returns void
 */
export async function generatePdf(protocol: Protocol | null, customNote: string, JsPdfClass: typeof jsPDF, PdfDocClass: typeof PDFDocument): Promise<void> {
  if (!protocol) return;

  try {
    // GEN THE PROTOCL TGABLE PDF FIRST
    const qrDataUrl = await generateCompressedQrCode();

    // Initialize PDF
    const doc: jsPDF = new JsPdfClass({ unit: "pt", format: "letter" });
    let y = 40;

    // Render Sections Sequentially
    y = renderHeader(doc, y);

    // Calculate Step Counts to determine "Last Phase"
    const foodAStepCount = getFoodAStepCount(protocol);
    const hasFoodBSteps = foodAStepCount < protocol.steps.length;

    // Food A
    const foodASteps = protocol.steps.slice(0, getFoodAStepCount(protocol));
    if (foodASteps.length > 0) {
      const rows = buildStepRows(foodASteps, protocol.foodA.type, !hasFoodBSteps);
      y = renderFoodSection(doc, y, protocol.foodA.name, protocol.foodA, rows, 440);
    }

    // Food B
    const foodBStart = getFoodAStepCount(protocol);
    const foodBSteps = protocol.steps.slice(foodBStart);
    if (protocol.foodB && foodBSteps.length > 0) {
      const rows = buildStepRows(foodBSteps, protocol.foodB.type, true);
      y = renderFoodSection(doc, y, protocol.foodB.name, protocol.foodB, rows);
    }

    // Notes
    y = renderNotes(doc, y, customNote);

    // Footer & QR
    renderFooterAndQR(doc, qrDataUrl);

    // Merge & Download
    await handlePdfMergeAndDownload(doc, PdfDocClass);

  } catch (error) {
    console.error("PDF Generation Failed:", error);
    alert("An error occurred while generating the PDF.");
  }
}


async function fetchBaseTermsSheet(): Promise<ArrayBuffer> {
  const res = await fetch('/tool_assets/oit_calculator/public_oit_patient_resource_terms.pdf');
  if (!res.ok) throw new Error("Failed to load public review sheet PDF");
  return res.arrayBuffer();
}

async function handlePdfMergeAndDownload(doc: jsPDF, PdfDocClass: typeof PDFDocument) {
  const protocolPdfBytes = doc.output('arraybuffer');
  const mergedPdf = await PdfDocClass.create();
  const handoutOrder = appState.pdfHandouts; // e.g. ["alice_header.pdf", "protocol", "alice_footer.pdf"]

  for (const item of handoutOrder) {
    let pdfBytes: ArrayBuffer;

    if (item === "public_terms") {
      pdfBytes = await fetchBaseTermsSheet();
    }
    else if (item === "protocol") {
      pdfBytes = protocolPdfBytes;
    } else {
      // Fetch external PDF (Securely)
      try {
        pdfBytes = await fetchSecurePdfBytes(item);
      } catch (e) {
        console.error(`Could not load handout: ${item}`, e);
        continue; // Skip missing files rather than failing entire export
      }
    }

    // Load and Merge
    const srcDoc = await PdfDocClass.load(pdfBytes);
    const indices = srcDoc.getPageIndices();
    const copiedPages = await mergedPdf.copyPages(srcDoc, indices);
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }

  const mergedPdfBytes = await mergedPdf.save();
  const blob = new Blob([mergedPdfBytes as Uint8Array<ArrayBuffer>], { type: "application/pdf" });
  const blobUrl = URL.createObjectURL(blob);

  // Mobile/Desktop handling
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 0 && window.innerWidth <= 1024);

  if (isMobile) {
    // Mobile: Use download link approach for better compatibility
    const downloadLink = document.createElement("a");
    downloadLink.href = blobUrl;
    downloadLink.download = "protocol.pdf";
    downloadLink.style.display = "none";

    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);

    // Clean up the blob URL after a short delay
    setTimeout(() => {
      URL.revokeObjectURL(blobUrl);
    }, 1000);
  } else {
    // Desktop: Open in new tab (original behavior)
    const w = window.open(blobUrl, "_blank");
    if (!w) {
      // Fallback to download if popup blocked
      const downloadLink = document.createElement("a");
      downloadLink.href = blobUrl;
      downloadLink.download = "protocol.pdf";
      downloadLink.style.display = "none";

      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    }

    // Clean up the blob URL after a delay (longer for new tab scenario)
    setTimeout(() => {
      URL.revokeObjectURL(blobUrl);
    }, 1000);
  }

}

function generateRoughAsciiTableForFood(food: Food, rows: ExportRow[]): string {
  if (!food || !rows) return "";

  let text = "";
  const foodType = food.type;
  const foodUnit = food.type === FoodType.SOLID ? "g" : "ml";
  text += `${food.name} (${foodType}).\nProtein: ${formatNumber(food.gramsInServing, 2)} g per ${food.servingSize} ${foodUnit} serving.\n`;

  for (const row of rows) {
    if (row.method === Method.DILUTE) {
      text += `(${row.stepIndex}): ${row.targetProtein} - ${row.dailyAmount} (Dilution: ${row.mixDetails})\n`;
    } else {
      text += `(${row.stepIndex}): ${row.targetProtein} - ${row.dailyAmount} (Direct)\n`;
    }
  }
  return text;
}

/**
 * Pure function to generate the ASCII string content.
 * Extracted from exportASCII to allow for easier unit testing of output logic.
 *
 * @param protocol Protocol
 * @param customNote string
 * @returns The formatted ASCII string or empty string if protocol is null
 */
export function generateAsciiContent(protocol: Protocol | null, customNote: string): string {
  if (!protocol) return "";
  let text = "";

  // --- Table Generation ---

  // Food A information
  const foodAStepCount = getFoodAStepCount(protocol);
  const hasFoodBSteps = foodAStepCount < protocol.steps.length;
  const foodASteps = protocol.steps.slice(0, foodAStepCount);

  if (foodASteps.length > 0) {
    const foodARows = buildStepRows(foodASteps, protocol.foodA.type, !hasFoodBSteps);
    text += generateRoughAsciiTableForFood(protocol.foodA, foodARows);
  }

  // Food B Table
  const totalSteps = protocol.steps.length;
  if (protocol.foodB && foodAStepCount < totalSteps) {
    if (foodASteps.length > 0) text += `\n--- TRANSITION TO ---\n\n`;

    const foodBSteps = protocol.steps.slice(foodAStepCount);
    const foodBRows = buildStepRows(foodBSteps, protocol.foodB.type, true);

    text += generateRoughAsciiTableForFood(protocol.foodB, foodBRows)
  }

  // --- Notes & Footer ---
  if (customNote && customNote.trim()) {
    text += "\n========================================\n";
    text += "NOTES\n";
    text += "========================================\n";
    text += `${customNote.trim()}\n`;
  }

  text += `\n---\nTool version-hash: v${__VERSION_OIT_CALCULATOR__}-${__COMMIT_HASH__}\n`;

  return text
}

/**
 * Generate and copy an ASCII representation of the protocol to clipboard.
 *
 * Creates separate tables for Food A and Food B, includes mix instructions for dilution steps, and appends custom notes when present. Falls back to alerting the text when clipboard copy fails.
 *
 * @param protocol Protocol
 * @param customNote string
 * @returns void
 */
export function exportASCII(protocol: Protocol | null, customNote: string): void {
  const text = generateAsciiContent(protocol, customNote);
  if (!text) return;

  // --- Copy to Clipboard ---
  navigator.clipboard.writeText(text).catch(() => {
    alert("Failed to copy to clipboard. Please copy manually:\n\n" + text);
  });
}
