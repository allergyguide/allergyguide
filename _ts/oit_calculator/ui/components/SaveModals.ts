import { html, nothing, render } from "lit-html";
import { appState } from "../../state/instances";
import { type Food, FoodType, SourceType } from "../../types";
import { getMeasuringUnit } from "../../utils";

interface SaveModalOptions {
	title: string;
	defaultName: string;
	onSave: (name: string) => void;
	onCancel: () => void;
}

/**
 * Renders a simple naming modal for Save/Save As operations for Protocols
 */
export function showSaveModal(options: SaveModalOptions) {
	const mount = document.getElementById("oit-library-modal-mount"); // Reuse the same overlay mount
	if (!mount) return;

	let currentName =
		options.defaultName !== "" ? options.defaultName : "untitled";
	let errorMsg = "";

	const validateName = (name: string): string => {
		const trimmed = name.trim();
		if (trimmed.length === 0) return "Name cannot be empty.";
		return "";
	};

	// Initial validation
	errorMsg = validateName(currentName);

	const renderModal = () => {
		const template = () => html`
		<div class="core-modal-overlay" @click=${options.onCancel}>
			<div class="core-modal-content core-modal-sm" @click=${(e: Event) => e.stopPropagation()}>
				<div class="oit-modal-header">
					<h2>${options.title}</h2>
				</div>
				
				<div class="oit-form-group compact-modal-spacing">
					<label>Protocol Name</label>
					<input 
						type="text" 
						id="save-modal-name-input"
						class="core-input ${errorMsg ? "oit-input-error" : ""}" 
						.value=${currentName}
						@input=${(e: Event) => {
							currentName = (e.target as HTMLInputElement).value;
							errorMsg = validateName(currentName);
							renderModal();
						}}
						@keydown=${(e: KeyboardEvent) => {
							currentName = (e.target as HTMLInputElement).value;
							errorMsg = validateName(currentName);
							if (e.key === "Enter" && errorMsg === "")
								options.onSave(currentName);
							if (e.key === "Escape") options.onCancel();
						}}
						placeholder="Enter protocol name..."
						autocomplete="off"
					/>
					${errorMsg ? html`<div class="oit-error-message">${errorMsg}</div>` : nothing}
				</div>

				<div class="core-auth-modal-buttons">
					<button class="core-btn core-btn-secondary" @click=${options.onCancel}>Cancel</button>
					<button
							class="core-btn core-btn-primary"
							?disabled=${errorMsg !== ""}
							@click=${() => options.onSave(currentName)}
						>
						Save
					</button>
				</div>
			</div>
		</div>
	`;
		render(template(), mount);
	};

	renderModal();
	mount.style.display = "flex";
	document.body.style.overflow = "hidden";

	// Auto-focus input
	setTimeout(() => {
		const input = document.getElementById(
			"save-modal-name-input",
		) as HTMLInputElement;
		if (input) {
			input.focus();
			input.select();
		}
	}, 0);
}

export function hideSaveModal() {
	const mount = document.getElementById("oit-library-modal-mount");
	if (mount) {
		mount.style.display = "none";
		document.body.style.overflow = "";
	}
}

interface SaveFoodModalOptions {
	food: Food;
	saveAsNew: boolean;
	onSave: (name: string) => void;
	onCancel: () => void;
}

/**
 * Specialized modal for saving or updating custom foods.
 */
export function showSaveFoodModal(options: SaveFoodModalOptions) {
	const mount = document.getElementById("oit-library-modal-mount");
	if (!mount) return;

	let shouldPrefix = false;
	if (
		options.saveAsNew &&
		options.food.source === SourceType.USER &&
		options.food.id
	) {
		const originalFood = appState.foodsById.get(options.food.id);
		if (originalFood && originalFood.name.trim() === options.food.name.trim()) {
			shouldPrefix = true;
		}
	}

	let currentName = shouldPrefix
		? `Copy of ${options.food.name}`
		: options.food.name;
	let errorMsg = "";

	const validateName = (name: string): string => {
		const trimmed = name.trim();
		if (trimmed.length === 0) return "Name cannot be empty.";

		const idToExclude = options.saveAsNew ? undefined : options.food.id;

		const isDuplicate = appState
			.getUserFoods()
			.some(
				(f) =>
					f.name.toLowerCase() === trimmed.toLowerCase() &&
					(f as { id?: string }).id !== idToExclude,
			);
		if (isDuplicate) return "A food with this name already exists.";

		return "";
	};

	// Initial validation
	errorMsg = validateName(currentName);

	const renderModal = () => {
		const template = () => html`
		<div class="core-modal-overlay" @click=${options.onCancel}>
			<div class="core-modal-content core-modal-sm" @click=${(e: Event) => e.stopPropagation()}>
				<div class="oit-modal-header">
					<h2>Save Food to Library as:</h2>
				</div>

				<div class="oit-form-group compact-modal-spacing">
					<label>Food Name</label>
					<input 
						type="text" 
						id="save-food-name-input"
						class="core-input ${errorMsg ? "oit-input-error" : ""}" 
						.value=${currentName}
						@input=${(e: Event) => {
							currentName = (e.target as HTMLInputElement).value;
							errorMsg = validateName(currentName);
							renderModal();
						}}
						@keydown=${(e: KeyboardEvent) => {
							currentName = (e.target as HTMLInputElement).value;
							errorMsg = validateName(currentName);
							if (e.key === "Enter" && errorMsg === "")
								options.onSave(currentName);
							if (e.key === "Escape") options.onCancel();
						}}
						placeholder="Enter food name..."
						autocomplete="off"
					/>
					${errorMsg ? html`<div class="oit-error-message">${errorMsg}</div>` : nothing}
				</div>

				<div class="oit-food-summary">
					<div class="food-chars">
							${
								options.food.type !== FoodType.CAPSULE
									? html`<div><strong>Protein:</strong> ${options.food.gramsInServing} g per ${options.food.servingSize} ${getMeasuringUnit(options.food)}</div>`
									: nothing
							}							
						<div>
							<strong>Form:</strong> ${options.food.type.charAt(0) + options.food.type.slice(1).toLowerCase()}
						</div>
					</div>
				</div>

				<div class="core-auth-modal-buttons">
					<button class="core-btn core-btn-secondary" @click=${options.onCancel}>Cancel</button>
					<button 
						class="core-btn core-btn-primary" 
						?disabled=${errorMsg !== ""}
						@click=${() => options.onSave(currentName)}>
						Save to Library
					</button>
				</div>
			</div>
		</div>
	`;
		render(template(), mount);
	};

	renderModal();
	mount.style.display = "flex";
	document.body.style.overflow = "hidden";

	// Auto-focus input
	setTimeout(() => {
		const input = document.getElementById(
			"save-food-name-input",
		) as HTMLInputElement;
		if (input) {
			input.focus();
			input.select();
		}
	}, 0);
}
