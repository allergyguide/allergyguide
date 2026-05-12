import { html, type TemplateResult } from "lit-html";
import type { Warning } from "../../types";

/**
 * View Model for the entire warnings sidebar.
 */
interface WarningsViewModel {
	global: Warning[];
	steps: { index: number; warnings: Warning[]; severity: "red" | "yellow" }[]; // step index is 1-based
	redCount: number;
	yellowCount: number;
}

/**
 * Helper to transform raw warnings into a structured View Model for the template.
 *
 * @param warnings - Array of validation warnings.
 * @returns WarningsViewModel
 */
export function groupAndSortWarnings(warnings: Warning[]): WarningsViewModel {
	const globalWarnings: Warning[] = [];
	const stepWarningsMap = new Map<number, Warning[]>();

	let redCount = 0;
	let yellowCount = 0;

	warnings.forEach((w) => {
		if (w.severity === "red") redCount++;
		else yellowCount++;

		// Strip redundant prefixes and format message
		const formattedWarning = { ...w, message: formatWarningMessage(w) };

		if (w.stepIndex !== undefined && w.stepIndex !== null) {
			if (!stepWarningsMap.has(w.stepIndex)) {
				stepWarningsMap.set(w.stepIndex, []);
			}
			stepWarningsMap.get(w.stepIndex)!.push(formattedWarning);
		} else {
			globalWarnings.push(formattedWarning);
		}
	});

	const steps = Array.from(stepWarningsMap.entries())
		.sort(([a], [b]) => a - b)
		.map(([index, list]) => {
			// Sort: Red warnings first, then yellow
			list.sort((a, b) => {
				if (a.severity === b.severity) return 0;
				return a.severity === "red" ? -1 : 1;
			});

			const isRed = list.some((w) => w.severity === "red");
			return {
				index,
				warnings: list,
				severity: (isRed ? "red" : "yellow") as "red" | "yellow",
			};
		});

	return {
		global: globalWarnings,
		steps,
		redCount,
		yellowCount,
	};
}

/**
 * Strip prefixes from warning messages.
 *
 * @param w - Warning object.
 * @returns Formatted message string.
 */
function formatWarningMessage(w: Warning): string {
	let msg = w.message;
	const title =
		w.stepIndex !== undefined && w.stepIndex !== null
			? `Step ${w.stepIndex}`
			: "Protocol Issues";
	const prefix = `${title}: `;

	// Remove redundant prefix if present ("Step X: ...")
	if (msg.startsWith(prefix)) {
		msg = msg.substring(prefix.length);
	} else if (msg.startsWith("Step ")) {
		// generic "Step N: " removal if title matched partially
		const parts = msg.split(": ");
		if (parts.length > 1 && parts[0].includes("Step")) {
			msg = parts.slice(1).join(": ");
		}
	}

	// Ensure first char is uppercase
	if (msg.length > 0) {
		msg = msg.charAt(0).toUpperCase() + msg.slice(1);
	}

	return msg;
}

/**
 * Renders a group of warnings (Global or Step-specific)
 */
const renderGroup = (
	title: string,
	warnings: Warning[],
	severity: "red" | "yellow",
) => html`
  <div class="warning-group severity-${severity}">
    <div class="warning-header">${title}</div>
    <ul class="warning-list">
      ${warnings.map(
				(w) => html`
        <li class="${w.severity === "red" ? "item-red" : "item-yellow"}">
          ${w.severity === "red" ? html`<strong>${w.message}</strong>` : w.message}
        </li>
      `,
			)}
    </ul>
  </div>
`;

/**
 * The main WarningsSidebar component template.
 *
 * @param warnings - Current list of validation warnings.
 * @param rulesURL - URL for the validation rules documentation.
 * @returns A lit-html TemplateResult.
 */
export function WarningsSidebar(
	warnings: Warning[],
	rulesURL: string,
): TemplateResult {
	if (warnings.length === 0) {
		return html`
      <div class="no-warnings">
        Protocol passes internal checks: see <a href="${rulesURL}" target="_blank">here</a> for the issues we check for.<br><br>THIS DOES NOT GUARANTEE THE PROTOCOL IS VALID.<br>DOSES MUST STILL BE VERIFIED/REVIEWED.
      </div>
    `;
	}

	const vm = groupAndSortWarnings(warnings);

	return html`
    <div class="warnings-summary-header">
      ${vm.redCount > 0 ? html`<span class="summary-badge red"><strong>${vm.redCount}</strong> Critical</span>` : ""}
      ${vm.yellowCount > 0 ? html`<span class="summary-badge yellow"><strong>${vm.yellowCount}</strong> Caution</span>` : ""}
    </div>

    ${vm.global.length > 0 ? renderGroup("Protocol Issues", vm.global, vm.global.some((w) => w.severity === "red") ? "red" : "yellow") : ""}

    ${vm.steps.map((step) => renderGroup(`Step ${step.index}`, step.warnings, step.severity))}
  `;
}
