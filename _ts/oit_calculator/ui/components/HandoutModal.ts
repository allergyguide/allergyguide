import { html, render } from "lit-html";
import { workspace } from "../../state/instances";
import type { Protocol, Tab } from "../../types";
import { triggerPatientHandoutGeneration } from "../exports";

export interface HandoutSelection {
	tabId: string;
	protocol: Protocol;
	stepIndex: number;
}

let isOpen = false;
let selections: Record<string, boolean> = {}; // tabId -> isSelected
let stepSelections: Record<string, number> = {}; // tabId -> stepIndex
let startDate = new Date().toISOString().split("T")[0]; // default today

export function renderHandoutModal() {
	const mount = document.getElementById("oit-handout-modal-mount");
	if (!mount) return;

	if (!isOpen) {
		mount.style.display = "none";
		render(html``, mount);
		return;
	}

	mount.style.display = "flex";

	const tabs = workspace.getTabs();
	const activeTabs = tabs.filter((t) => t.state.getProtocol() !== null);

	render(handoutTemplate(activeTabs), mount);
}

export function showHandoutModal() {
	isOpen = true;
	document.body.style.overflow = "hidden";

	// Initialize defaults
	const tabs = workspace.getTabs();
	const activeTabs = tabs.filter((t) => t.state.getProtocol() !== null);

	selections = {};
	stepSelections = {};
	startDate = new Date().toISOString().split("T")[0];

	for (const tab of activeTabs) {
		selections[tab.id] = true; // all active foods checked by default
		const protocol = tab.state.getProtocol();
		if (protocol && protocol.steps.length > 0) {
			// default to first step
			stepSelections[tab.id] = protocol.steps[0].stepIndex;
		}
	}

	const mount = document.getElementById("oit-handout-modal-mount");
	if (mount) mount.style.display = "flex";

	renderHandoutModal();
	document.addEventListener("keydown", handleEscapeKey);
}

function handleEscapeKey(e: KeyboardEvent) {
	if (e.key === "Escape" && isOpen) {
		hideHandoutModal();
	}
}

function hideHandoutModal() {
	isOpen = false;
	document.body.style.overflow = "";
	document.removeEventListener("keydown", handleEscapeKey);
	renderHandoutModal();
}

function handleGenerate() {
	const tabs = workspace.getTabs();
	const selectedData: HandoutSelection[] = [];

	for (const tab of tabs) {
		if (selections[tab.id]) {
			const protocol = tab.state.getProtocol();
			if (protocol) {
				selectedData.push({
					tabId: tab.id,
					protocol,
					stepIndex: stepSelections[tab.id] || 1,
				});
			}
		}
	}

	if (selectedData.length === 0) {
		alert("Please select at least one food.");
		return;
	}

	triggerPatientHandoutGeneration(selectedData, startDate);
}

const handoutTemplate = (activeTabs: Tab[]) => html`
	<div class="core-modal-overlay" @click=${hideHandoutModal}>
		<div class="core-modal-content oit-library-modal core-modal-md" @click=${(e: Event) => e.stopPropagation()}>
			<div class="oit-modal-header">
				<h2>Create Single-Step Patient Guide</h2>
				<button 
					class="oit-modal-close" 
					@click=${hideHandoutModal} 
					aria-label="Close modal"
				>×</button>
			</div>

			<div class="oit-modal-body">
				<p class="modal-description">
					Select the foods and the active steps you want to include in the handout.
				</p>

				<div class="oit-modal-settings">
					<div>
						<label for="handout-start-date">Start Date (Optional)</label>
						<p>Defaults to today. Used to date the printout.</p>
					</div>
					<input 
						id="handout-start-date"
						type="date" 
						class="core-input" 
						.value=${startDate}
						@change=${(e: Event) => {
							startDate = (e.target as HTMLInputElement).value;
							renderHandoutModal();
						}}
					/>
				</div>

				<h3>Active Protocols</h3>
				<div class="handout-food-list">
					${activeTabs.length === 0 ? html`<p class="subtle-text">No active protocols loaded in the workspace.</p>` : ""}
					${activeTabs.map((tab) => {
						const protocol = tab.state.getProtocol();
						if (!protocol) return html``;
						const isSelected = selections[tab.id] || false;
						const currentStepIndex = stepSelections[tab.id] || 1;

						return html`
						<div class="handout-food-row ${isSelected ? "is-selected" : ""}">
							<label>
								<input 
									type="checkbox" 
									.checked=${isSelected}
									@change=${(e: Event) => {
										selections[tab.id] = (e.target as HTMLInputElement).checked;
										renderHandoutModal();
									}}
								/>
								<div class="food-title">${tab.title}</div>
							</label>
							${
								isSelected
									? html`
							<div class="step-selector">
								<label for="handout-step-${tab.id}">Active Step for ${tab.title}</label>
								<select 
									id="handout-step-${tab.id}"
									class="core-input" 
									.value=${currentStepIndex.toString()}
									@change=${(e: Event) => {
										stepSelections[tab.id] = parseInt(
											(e.target as HTMLSelectElement).value,
											10,
										);
										renderHandoutModal();
									}}
								>
									${protocol.steps.map((step) => {
										const foodName =
											step.food === "A"
												? protocol.foodA.name
												: protocol.foodB?.name || "Food B";
										return html`
										<option value=${step.stepIndex}>
											Step ${step.stepIndex} - ${step.targetMg}mg (${foodName})
										</option>
										`;
									})}
								</select>
							</div>
							`
									: ""
							}
						</div>
						`;
					})}
				</div>
			</div>

			<div class="oit-modal-buttons">
				<button class="btn-secondary" @click=${hideHandoutModal}>Cancel</button>
				<button class="btn-export" @click=${handleGenerate} ?disabled=${!Object.values(selections).some((v) => v)}>Generate PDF</button>
			</div>
		</div>
	</div>
`;
