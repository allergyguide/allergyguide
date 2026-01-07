import { ALLERGENS } from "./spt_generator_constants.js";
import { wrapText, buildAllergenOrderMap } from "./spt_generator_utils.js";

const allergenOrderMap = buildAllergenOrderMap(ALLERGENS);

/**
 * Generate formatted ASCII table from allergen entries
 * @param {Object[]} entryList - Allergen entries ({ allergen, diameter, note })
 * @param {boolean} useCol - Enable two-column format
 * @param {boolean} sort - Sort by ALLERGENS hierarchy first, then alphabetically
 * @returns {string} Formatted table with optional notes wrapping and column layout
 */
export function getTable(entryList, useCol, sort) {
  if (entryList.length === 0) return "";

  // Create a copy to avoid mutating the original array
  let processedEntries = [...entryList];

  if (sort) {
    const orderMap = allergenOrderMap;
    const unknownEntries = [];
    const knownEntries = [];
    for (const entry of processedEntries) {
      if (orderMap.has(entry.allergen)) {
        knownEntries.push(entry);
      } else {
        unknownEntries.push(entry);
      }
    }
    unknownEntries.sort((a, b) => a.allergen.localeCompare(b.allergen));
    knownEntries.sort((a, b) => {
      const keyA = orderMap.get(a.allergen);
      const keyB = orderMap.get(b.allergen);
      for (let i = 0; i < Math.min(keyA.length, keyB.length); i++) {
        const diff = keyA[i] - keyB[i];
        if (diff !== 0) return diff;
      }
      return keyA.length - keyB.length;
    });
    processedEntries = [...unknownEntries, ...knownEntries];
  }

  const fixedWidth = 30;
  const separator = "||   ";
  const noteWrapWidth = fixedWidth - 4;

  function formatCell(ent) {
    if (!ent) return { line1: "", noteLines: [] };
    let line1 = `${ent.allergen !== "" ? ent.allergen : "Enter allergen"} -- ${ent.diameter != null && (!isNaN(ent.diameter) || ent.diameter == "") ? ent.diameter + 'mm' : 'Enter #'}`;
    let noteLines = [];
    if (ent.note) {
      const wrapped = wrapText(ent.note, noteWrapWidth);
      if (wrapped.length === 1) {
        noteLines.push("  [" + wrapped[0] + "]");
      } else {
        noteLines.push("  [" + wrapped[0]);
        for (let i = 1; i < wrapped.length - 1; i++) {
          noteLines.push("    " + wrapped[i]);
        }
        noteLines.push("    " + wrapped[wrapped.length - 1] + "]");
      }
    }
    return { line1, noteLines };
  }

  if (!useCol || processedEntries.length < 4) {
    let lines = [];
    for (const ent of processedEntries) {
      let cell = formatCell(ent);
      let entryLine = cell.line1;
      if (ent.note) {
        entryLine += ` [${ent.note}]`;
      }
      lines.push(entryLine.padEnd(fixedWidth));
    }
    return lines.join("\n");
  }

  const rows = Math.ceil(processedEntries.length / 2);
  const leftEntries = processedEntries.slice(0, rows);
  const rightEntries = processedEntries.slice(rows);
  while (rightEntries.length < rows) {
    rightEntries.push(null);
  }

  const leftCells = leftEntries.map(formatCell);
  const rightCells = rightEntries.map(formatCell);

  let outputLines = [];
  for (let i = 0; i < rows; i++) {
    const leftCell = leftCells[i];
    const rightCell = rightCells[i];

    let firstLine =
      leftCell.line1.padEnd(fixedWidth) +
      separator +
      rightCell.line1.padEnd(fixedWidth);
    outputLines.push(firstLine);

    const numNoteLines = Math.max(leftCell.noteLines.length, rightCell.noteLines.length);
    for (let j = 0; j < numNoteLines; j++) {
      const leftNote = leftCell.noteLines[j] || "";
      const rightNote = rightCell.noteLines[j] || "";
      let noteLine =
        leftNote.padEnd(fixedWidth) +
        separator +
        rightNote.padEnd(fixedWidth);
      outputLines.push(noteLine);
    }
  }
  let horizontalTableLen = outputLines[0].length;
  let roughTable = outputLines.join("\n");

  return "-".repeat(horizontalTableLen - 10) + "\n" + roughTable + "\n" + "-".repeat(horizontalTableLen - 10);
}

/**
 * Generates a summary of allergen test results.
 * 
 * @param {Entry[]} entryList - List of allergen test entries.
 * @returns {string} A formatted summary of positive, negative, and control test results.
 */
export function getSummary(entryList) {
  // Group non-control entries by allergen
  const grouped = {};
  const positiveControls = [];
  const negativeControls = [];

  for (const entry of entryList) {
    const { allergen, diameter, note } = entry;

    // Handle controls separately
    if (allergen === "(+) control") {
      if (!isNaN(diameter) && diameter !== null) {
        positiveControls.push({ diameter, note });
      }
      continue;
    }
    if (allergen === "(-) control") {
      if (!isNaN(diameter) && diameter !== null) {
        negativeControls.push({ diameter, note });
      }
      continue;
    }

    // Group entries by allergen name
    if (!grouped[allergen]) {
      grouped[allergen] = [];
    }
    grouped[allergen].push({ diameter, note });
  }

  // Determine which allergens are positive (any entry with diameter >= 3)
  const positiveAllergens = {};
  const negativeAllergens = new Set();
  for (const allergen in grouped) {
    const entries = grouped[allergen];
    const anyPositive = entries.some(
      e => !isNaN(e.diameter) && e.diameter >= 3
    );
    if (anyPositive) {
      positiveAllergens[allergen] = entries;
    } else {
      negativeAllergens.add(allergen);
    }
  }

  // Build the hierarchical order map and comparator
  const orderMap = allergenOrderMap;
  const compareAllergens = (a, b) => {
    const orderA = orderMap.get(a);
    const orderB = orderMap.get(b);

    // If one allergen is custom (not in the orderMap) and the other is not, list custom first.
    if (!orderA && orderB) return -1;
    if (orderA && !orderB) return 1;

    // If both are custom, sort them alphabetically.
    if (!orderA && !orderB) return a.localeCompare(b);

    // If both are in the orderMap, sort them based on the hierarchical indices.
    for (let i = 0; i < Math.min(orderA.length, orderB.length); i++) {
      if (orderA[i] !== orderB[i]) return orderA[i] - orderB[i];
    }
    return orderA.length - orderB.length;
  };

  // Sort the allergens using the order map
  const sortedPositiveKeys = Object.keys(positiveAllergens).sort(compareAllergens);
  const sortedNegativeAllergens = Array.from(negativeAllergens).sort(compareAllergens);

  // Helper to format grouped allergen entries
  const formatEntries = (sortedKeys, entries) => {
    return sortedKeys.map(allergen => {
      const data = entries[allergen];
      // Filter out any invalid diameters (NaN) before formatting
      const diameters = data
        .filter(d => !isNaN(d.diameter))
        .map(d => d.diameter + "mm")
        .join(", ");
      const notes = data
        .map(d => d.note)
        .filter(Boolean)
        .join("; ");
      return `${allergen} (${diameters}${notes ? " -- " + notes : ""})`;
    }).join(", ");
  };

  let summary = "";

  // --------- CONSTRUCT SUMMARY ----------
  let currentDate = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  if (sortedPositiveKeys.length > 0 || sortedNegativeAllergens.length > 0) {
    summary += "---- " + currentDate + " ----";
  }

  // Construct the positive results summary using sorted keys
  if (sortedPositiveKeys.length > 0) {
    summary += `\nSkin testing was positive for ${formatEntries(sortedPositiveKeys, positiveAllergens)}.`;
  }

  // Construct the negative results summary using sorted allergens
  if (sortedNegativeAllergens.length > 0) {
    summary += `\nOtherwise, ${sortedNegativeAllergens.join(", ")} were negative.`;
  }

  // Format control entries (unsorted)
  const formatControls = (label, controlsArray) => {
    if (controlsArray.length === 0) return "";
    const diameters = controlsArray
      .filter(c => !isNaN(c.diameter))
      .map(c => `${c.diameter}mm${c.note ? " -- " + c.note : ""}`)
      .join(", ");
    return `${label} (${diameters})`;
  };

  const controls = [];
  if (positiveControls.length > 0) {
    controls.push(formatControls("Positive control", positiveControls));
  }
  if (negativeControls.length > 0) {
    controls.push(formatControls("Negative control", negativeControls));
  }

  if (controls.length > 0) {
    summary += `\n${controls.join(", ")}.`;
  }

  return summary.trim();
}





