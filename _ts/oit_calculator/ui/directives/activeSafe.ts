import Decimal from "decimal.js";
import {
	Directive,
	directive,
	type ElementPart,
	type PartInfo,
	PartType,
} from "lit-html/directive.js";

/**
 * activeSafe Directive
 *
 * Prevents disruptive cursor jumps in input fields by only updating the DOM value if it is mathematically different from the current value. Has some 'Formatting Awareness' by cleaning up the input on blur (e.g., snapping "1" to "1.0" for liquid doses).
 *
 * @example
 * html`<input ${activeSafe(value, (v) => v.toFixed(1))}>`
 */
class ActiveSafeDirective extends Directive {
	private element?: HTMLInputElement;
	private lastValue: unknown;
	private formatter?: (v: unknown) => string;

	/**
	 * Initializes the directive and ensures it is used on an element.
	 *
	 * @param partInfo - Metadata about the part where the directive is used.
	 * @throws Error if not used as an element directive.
	 */
	constructor(partInfo: PartInfo) {
		super(partInfo);
		if (partInfo.type !== PartType.ELEMENT) {
			throw new Error(
				`activeSafe must be used as an element directive: <input \${activeSafe(...)}>`,
			);
		}
	}

	/**
	 * Handles update of the host element's value.
	 * Compares the new value with the current DOM value using mathematical equivalence if the element is focused.
	 *
	 * @param part - The element part being updated.
	 * @param props - The value and optional formatter function.
	 * @returns undefined (Element directives do not render content).
	 */
	update(
		part: ElementPart,
		[value, formatter]: [unknown, ((v: unknown) => string)?],
	) {
		this.element = part.element as HTMLInputElement;
		this.lastValue = value;
		this.formatter = formatter;

		const formattedValue = formatter ? formatter(value) : String(value);

		// If the element is currently focused, is the current state === new input mathematically (ie. 1.0 === 1)
		if (document.activeElement === this.element) {
			try {
				const vNew = new Decimal(formattedValue);
				const vCurr = new Decimal(this.element.value || "0");

				if (vNew.equals(vCurr)) {
					// Mathematically equivalent, skip DOM update to preserve cursor/state
					return;
				}
			} catch {
				// If parsing fails while focused => there's an intermediate (ie. "." or "-") that Decimal(x) will throw an err for
				// return here avoids overwriting current input
				return;
			}
		}

		// if not equivalent or not focused, should update
		if (this.element.value !== formattedValue) {
			this.element.value = formattedValue;
		}

		// Attach blur listener once
		// This is a bit dirty but for this purpose it's fine ...
		if (!this.element.dataset.activeSafeInitialized) {
			this.element.addEventListener("blur", () => this.handleBlur());
			this.element.dataset.activeSafeInitialized = "true";
		}

		return this.render(value, formatter);
	}

	/**
	 * Handles blur event to apply final formatting to the input
	 * Ensures the DOM value matches the precisely formatted state value
	 */
	private handleBlur() {
		if (this.element) {
			const cleanValue = this.formatter
				? this.formatter(this.lastValue)
				: String(this.lastValue);
			if (this.element.value !== cleanValue) {
				this.element.value = cleanValue;
			}
		}
	}

	/**
	 * Required render method for Lit directives
	 *
	 * @returns undefined
	 */
	render(_value: unknown, _formatter?: (v: unknown) => string) {
		return undefined;
	}
}

/**
 * Directive that safely manages input field values to prevent cursor jumps during rapid state updates and provides formatting on blur
 */
export const activeSafe = directive(ActiveSafeDirective);
