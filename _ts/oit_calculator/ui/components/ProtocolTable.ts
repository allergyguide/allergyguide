import { html, type TemplateResult, noChange } from "lit-html";
import { repeat } from "lit-html/directives/repeat.js";
import {
	directive,
	Directive,
	PartType,
	type ElementPart,
	type PartInfo,
} from "lit-html/directive.js";
import { activeSafe } from "../directives/activeSafe";
import {
	Method,
	type Protocol,
	type Step,
	type Warning,
	type Unit,
} from "../../types";
import { formatNumber, formatAmount, getMeasuringUnit } from "../../utils";
import {
	updateStepTargetMg,
	updateStepDailyAmount,
	updateStepMixFoodAmount,
	addStepAfter,
	removeStep,
} from "../../core/protocol";
import { workspace } from "../../state/instances";
import Decimal from "decimal.js";

/**
 * focusMe Directive
 *
 * Focuses the element once when it is rendered. Useful for automatically selecting the input of a newly created row.
 */
class FocusMeDirective extends Directive {
	constructor(partInfo: PartInfo) {
		super(partInfo);
		if (partInfo.type !== PartType.ELEMENT) {
			throw new Error("focusMe must be used on an element");
		}
	}

	/**
	 * leave the element's existing content and attributes alone
	 */
	render() {
		return noChange;
	}

	/**
	 * Orchestrates the focus operation.
	 *
	 * @param part - The element part to focus.
	 */
	update(part: ElementPart) {
		const el = part.element as HTMLElement;
		// Timeout to ensure it happens after the DOM is fully updated/attached
		window.setTimeout(() => {
			el.focus();
			// allows highlight of all text within input for ease of use
			if (el instanceof HTMLInputElement) {
				el.select();
			}
		}, 0);
		return noChange;
	}
}

/**
 * Directive that focuses the host element immediately upon mounting.
 */
const focusMe = directive(FocusMeDirective);

// Local state for focus tracking
let nextFocusId: string | null = null;

/**
 * Table row types
 */
type TableRow =
	| { type: "header"; text: string; id: string }
	| { type: "step"; step: Step };

/**
 * ProtocolTable Component
 *
 * Renders the interactive protocol table using lit-html.
 * - Stable row rendering using the repeat() directive keyed by stable step IDs.
 * - Cursor-safe input updates using the activeSafe directive.
 * - Automatic focus management for newly added steps.
 * - Unit-aware formatting for grams vs. milligrams.
 *
 * @param protocol - The current protocol data structure.
 * @param warnings - List of validation warnings to highlight in the UI.
 * @returns A lit-html TemplateResult.
 */
export const ProtocolTable = (
	protocol: Protocol,
	warnings: Warning[],
): TemplateResult => {
	const stepWarnings = new Map<number, "red" | "yellow">();
	for (const warning of warnings) {
		if (warning.stepIndex !== undefined) {
			const existing = stepWarnings.get(warning.stepIndex);
			if (!existing || (warning.severity === "red" && existing === "yellow")) {
				stepWarnings.set(warning.stepIndex, warning.severity);
			}
		}
	}

	// what's the intent for this specific render cycle?
	const currentFocusId = nextFocusId;
	nextFocusId = null; // prevent leakage to future renders

	// Pre-process rows to include section headers
	const rows: TableRow[] = [];
	let lastWasFoodA = true;
	for (const step of protocol.steps) {
		const isStepFoodB = step.food === "B";
		// if you're at the transition point A -> B
		if (isStepFoodB && lastWasFoodA) {
			rows.push({
				type: "header",
				text: protocol.foodB!.name,
				id: "header-food-b",
			});
			lastWasFoodA = false;
		} else if (!isStepFoodB && step.stepIndex === 1) {
			rows.push({
				type: "header",
				text: protocol.foodA.name,
				id: "header-food-a",
			});
		}
		rows.push({ type: "step", step });
	}

	return html`
    <thead>
      <tr>
        <th>Step</th>
        <th>Protein (mg)</th>
        <th>Method</th>
        <th>Amount for mixture</th>
        <th>Water for mixture</th>
        <th>Daily amount</th>
      </tr>
    </thead>
    <tbody>
      ${repeat(
				rows,
				(row) => (row.type === "header" ? row.id : row.step.id),
				(row) => {
					// return header row
					if (row.type === "header") {
						return html`
            <tr class="food-section-header">
              <td colspan="6">${row.text}</td>
            </tr>
          `;
					}

					// construct actual row
					const step = row.step;
					const warningClass = stepWarnings.get(step.stepIndex);
					const rowClass = warningClass
						? `warning-highlight-${warningClass}`
						: "";
					const food = step.food === "B" ? protocol.foodB! : protocol.foodA;
					const mixUnit: Unit = getMeasuringUnit(food);

					const isNewStep = step.id === currentFocusId;

					return html`
          <tr class="${rowClass}">
            <td class="col-actions">
              <div class="actions-cell">
                <button class="btn-add-step" @click=${() => handleAddStep(step.stepIndex)}>+</button>
                <button class="btn-remove-step" @click=${() => handleRemoveStep(step.stepIndex)}>−</button>
                <span class="step-number">${step.stepIndex}</span>
              </div>
            </td>

            <td class="col-protein">
              <input
                class="editable"
                type="number"
                step="0.1"
                min="0"
                ${isNewStep ? focusMe() : ""}
                ${activeSafe(step.targetMg.toNumber(), (v) => new Decimal(v as number).toFixed(1))}
                @input=${(e: Event) => handleInput(e, step.stepIndex, "targetMg")}
                @keydown=${(e: KeyboardEvent) => handleKeydown(e)}
              />
            </td>

            <td class="col-method">${step.method}</td>

            ${
							step.method === Method.DILUTE
								? html`
              <td class="col-mix-food">
                <input
                  class="editable"
                  type="number"
                  step="${getMeasuringUnit(food) === "g" ? 0.01 : 0.1}"
                  min="0"
                  ${activeSafe(step.mixFoodAmount!.toNumber(), (v) => new Decimal(v as number).toFixed(getMeasuringUnit(food) === "g" ? 2 : 1))}
                  @input=${(e: Event) => handleInput(e, step.stepIndex, "mixFoodAmount")}
                  @keydown=${(e: KeyboardEvent) => handleKeydown(e)}
                />
                <span> ${mixUnit}</span>
              </td>
              <td class="non-editable col-mix-water">
                ${formatAmount(step.mixWaterAmount!, "ml")} ml
                <span style="color: var(--oit-text-secondary); font-size: 0.85rem;">
                  (${formatNumber(step.servings!, 1)} servings)
                </span>
              </td>
            `
								: html`
              <td class="na-cell col-mix-food">n/a</td>
              <td class="na-cell col-mix-water">n/a</td>
            `
						}

            <td class="col-daily-amount">
              ${
								step.method === Method.CAPSULE
									? html`
                <span class="non-editable">Capsule</span>
              `
									: html`
                <input
                  class="editable"
                  type="number"
                  step="${step.dailyAmountUnit === "g" ? 0.01 : 0.1}"
                  min="0"
                  ${activeSafe(step.dailyAmount.toNumber(), (v) => new Decimal(v as number).toFixed(step.dailyAmountUnit === "g" ? 2 : 1))}
                  @input=${(e: Event) => handleInput(e, step.stepIndex, "dailyAmount")}
                  @keydown=${(e: KeyboardEvent) => handleKeydown(e)}
                />
                <span> ${step.dailyAmountUnit}</span>
              `
							}
            </td>
          </tr>
        `;
				},
			)}
    </tbody>
  `;
};

// --- Event Handlers ---

/**
 * Handles adding a new protocol step after the specified index.
 * Sets the focus ID to the new step so it can be focused on the next render.
 *
 * @param stepIndex - The 1-based index after which to add the step.
 */
function handleAddStep(stepIndex: number) {
	const current = workspace.getActive().getProtocol();
	if (current) {
		const updated = addStepAfter(current, stepIndex);
		// Identify the new step (the one with the new ID compared to current) to set focus
		const newStep = updated.steps.find(
			(s) => !current.steps.find((os) => os.id === s.id),
		);
		if (newStep) {
			nextFocusId = newStep.id;
		}
		workspace.getActive().setProtocol(updated, `Added Step after ${stepIndex}`);
	}
}

/**
 * Handles removing the protocol step at the specified index.
 *
 * @param stepIndex - The 1-based index of the step to remove.
 */
function handleRemoveStep(stepIndex: number) {
	const current = workspace.getActive().getProtocol();
	if (current) {
		const updated = removeStep(current, stepIndex);
		workspace.getActive().setProtocol(updated, `Removed Step ${stepIndex}`);
	}
}

/**
 * Keydown handler for input fields.
 * Supports 'enter to blur' only for now
 *
 * @param e - The keyboard event.
 */
function handleKeydown(e: KeyboardEvent) {
	if (e.key === "Enter") {
		(e.target as HTMLInputElement).blur();
	}
}

/**
 * Handles numeric input changes from the table
 * Parses raw string to Decimal, update state
 * Uses debounced history pushing for smoother Undo/Redo behavior
 *
 * @param e - The input event.
 * @param stepIndex - The 1-based index of the step being modified.
 * @param field - The specific field being updated.
 */
function handleInput(
	e: Event,
	stepIndex: number,
	field: "targetMg" | "dailyAmount" | "mixFoodAmount",
) {
	const target = e.target as HTMLInputElement;
	const rawValue = target.value || "0";

	let value: Decimal;

	// parse string into Decimal if possible, else fall back to 0
	try {
		value = new Decimal(rawValue);
		if (value.isNegative()) value = new Decimal(0);
	} catch (e) {
		value = new Decimal(0);
	}

	const current = workspace.getActive().getProtocol();
	if (!current) return;

	let updated: Protocol;
	let label = "";

	switch (field) {
		case "targetMg":
			const oldTarget = current.steps[stepIndex - 1].targetMg; // prev value before the change in the input field
			updated = updateStepTargetMg(current, stepIndex, value);
			label = `Step ${stepIndex} Target: ${oldTarget} -> ${value} mg`;
			break;
		case "dailyAmount":
			const oldDaily = current.steps[stepIndex - 1].dailyAmount;
			updated = updateStepDailyAmount(current, stepIndex, value);
			label = `Step ${stepIndex} Daily Amount: ${oldDaily} -> ${value}`;
			break;
		case "mixFoodAmount":
			const oldMix = current.steps[stepIndex - 1].mixFoodAmount;
			updated = updateStepMixFoodAmount(current, stepIndex, value);
			label = oldMix
				? `Step ${stepIndex} Mix Amount: ${oldMix} -> ${value}`
				: `Step ${stepIndex} Mix Amount: ${value}`;
			break;
		default:
			return;
	}

	// Use debounced history pushing for text input
	workspace.getActive().setProtocol(updated, label, { debounceHistory: true });
}
