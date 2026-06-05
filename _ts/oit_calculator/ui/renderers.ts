/**
 * @module
 *
 * DOM Rendering logic
 */

import { html, nothing, render, type TemplateResult } from "lit-html";
import { showFeedbackModal } from "../../core/ui/feedback-modal";
import {
	type CoreToolbarProps,
	coreToolbarTemplate,
} from "../../core/ui/toolbar";
import { validateProtocol } from "../core/validator";
import { workspace } from "../state/instances";
import type {
	Protocol,
	ReadableHistoryPayload,
	ReadableWarning,
	Tab,
	Warning,
} from "../types";
import { DosingStrategy } from "../types";
import { escapeHtml } from "../utils";
import {
	renameActiveProtocol,
	saveActiveProtocol,
} from "./actions/vaultActions";
import { showLibraryModal } from "./components/LibraryModal";
import { ProtocolTable } from "./components/ProtocolTable";
import { WarningsSidebar } from "./components/WarningsSidebar";

// Need global commit hash
declare const __COMMIT_HASH__: string;

// ============================================
// MODULE SPECIFIC INTERFACES
// ============================================

/**
 * Renders the interactive toolbar into the mount point.
 * Replaces the static skeleton loader.
 *
 * @param props - properties for the toolbar
 */
export function renderToolbar(props: CoreToolbarProps): void {
	const mount = document.getElementById("core-toolbar-mount");
	if (mount) {
		const activeTab = workspace.getActive();
		const p = activeTab.getProtocol();
		const isDirty = activeTab.isDirty();

		const oitExtra: TemplateResult | typeof nothing = props.isLoggedIn
			? html`
			<div class="oit-toolbar-actions">
				${
					p
						? html`
					${
						p.id && p.name
							? html`
						<span class="oit-protocol-name" title="Rename Protocol" @click=${() => renameActiveProtocol()}>
							${p.name}
						</span>
					`
							: nothing
					}
					<button 
						class="oit-save-btn ${isDirty ? "dirty" : "clean"}"
						@click=${() => saveActiveProtocol()}
						title="${isDirty ? "Save changes to Vault" : "Saved"}"
					>
						<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" class="bi bi-cloud-check" viewBox="0 0 16 16">
							<path d="M10.354 6.146a.5.5 0 1 0-.708-.708L7 8.086 5.854 6.94a.5.5 0 1 0-.708.708l1.5 1.5a.5.5 0 0 0 .708 0l3-3z"/>
							<path d="M4.406 3.342A5.53 5.53 0 0 1 8 2c2.69 0 4.923 2 5.166 4.579C14.758 6.804 16 8.137 16 9.773 16 11.569 14.502 13 12.687 13H3.781C1.708 13 0 11.366 0 9.318c0-1.763 1.266-3.223 2.942-3.593.143-.863.698-1.723 1.464-2.383zm.653.757c-.757.653-1.153 1.44-1.153 2.056v.448l-.445.049C2.064 6.805 1 7.952 1 9.318 1 10.785 2.23 12 3.781 12h8.906C13.98 12 15 10.988 15 9.773c0-1.216-1.02-2.228-2.313-2.228h-.5v-.5C12.188 4.825 10.328 3 8 3a4.53 4.53 0 0 0-2.941 1.1z"/>
						</svg>
						${isDirty ? "Save" : "Saved"}
					</button>
					<button 
						class="oit-save-btn clean"
						@click=${() => saveActiveProtocol(true)}
						title="Save as a new Protocol"
					>
						Save As...
					</button>
				`
						: nothing
				}
				<button class="oit-library-btn" @click=${showLibraryModal}>
					My Library
				</button>
			</div>
		`
			: nothing;

		render(
			coreToolbarTemplate({
				...props,
				extraContent: oitExtra as TemplateResult,
				showFeedback: true,
				onFeedback: () =>
					showFeedbackModal({
						headerMessage:
							"Questions or concerns about the OIT calculator? Let us know!",
					}),
			}),
			mount,
		);

		// Hide skeleton on first successful render
		const skeleton = document.getElementById("oit-toolbar-skeleton");
		if (skeleton) {
			skeleton.style.display = "none";
		}
	}
}

/**
 * Updates the disabled/enabled state of the Undo and Redo buttons.
 *
 * @param canUndo - Whether there is a state in history to revert to.
 * @param canRedo - Whether there is a state in the future stack to restore.
 */
export function updateUndoRedoButtons(
	canUndo: boolean,
	canRedo: boolean,
): void {
	const undoBtn = document.getElementById("btn-undo") as HTMLButtonElement;
	const redoBtn = document.getElementById("btn-redo") as HTMLButtonElement;

	if (undoBtn) undoBtn.disabled = !canUndo;
	if (redoBtn) redoBtn.disabled = !canRedo;
}

/**
 * Make dosing container and warnings container visible (after init of calc); also make +/- step controls visible
 *
 * @returns void
 */
export function showProtocolUI(): void {
	const dosingContainer = document.querySelector(
		".dosing-strategy-container",
	) as HTMLElement;
	const warningsContainer = document.querySelector(
		".warnings-container",
	) as HTMLElement;
	const stepBtnHintContainer = document.querySelector(
		".step-controls-footer",
	) as HTMLElement;

	if (dosingContainer) {
		dosingContainer.classList.remove("oit-hidden-on-init");
	}
	if (warningsContainer) {
		warningsContainer.classList.remove("oit-hidden-on-init");
	}
	if (stepBtnHintContainer) {
		stepBtnHintContainer.classList.remove("oit-hidden-on-init");
	}
}

/**
 * Updates the enabled/disabled state of the Food B settings section.
 * Food B selection is only permitted after a Food A has been selected.
 *
 * @param protocol - current protocol state
 */
export function updateFoodBDisabledState(protocol: Protocol | null): void {
	const foodBContainer = document.querySelector(
		".food-b-container",
	) as HTMLElement;
	if (!foodBContainer) return;

	const hasFoodA = protocol?.foodA;

	if (hasFoodA) {
		foodBContainer.classList.remove("disabled");
		const searchInput = document.getElementById(
			"food-b-search",
		) as HTMLInputElement;
		const clearBtn = document.getElementById(
			"clear-food-b",
		) as HTMLButtonElement;
		if (searchInput) {
			searchInput.disabled = false;
		}
		if (clearBtn) {
			clearBtn.disabled = false;
		}
	} else {
		foodBContainer.classList.add("disabled");
		const searchInput = document.getElementById(
			"food-b-search",
		) as HTMLInputElement;
		const clearBtn = document.getElementById(
			"clear-food-b",
		) as HTMLButtonElement;
		if (searchInput) {
			searchInput.disabled = true;
			searchInput.value = "";
		}
		if (clearBtn) {
			clearBtn.disabled = true;
		}
	}
}

/**
 * Renders the Tab Bar with active state and status indicators.
 * Each tab represents an independent protocol workspace.
 *
 * @param tabs - Array of current tab metadata from WorkspaceManager
 * @param activeId - The ID of the currently active tab to highlight
 */
export function renderTabs(tabs: Tab[], activeId: string): void {
	const container = document.getElementById("oit-tabs-list");
	if (!container) return;

	let html = "";
	tabs.forEach((tab) => {
		const isActive = tab.id === activeId;
		const activeClass = isActive ? "active" : "";

		// Determine Status Dot Color based on validation severity
		let statusClass = "";
		let statusTitle = "";
		const protocol = tab.state.getProtocol();
		if (protocol) {
			// Internal validation check for the status dot
			const warnings = validateProtocol(protocol);
			if (warnings.some((w: Warning) => w.severity === "red")) {
				statusClass = "status-red";
				statusTitle = "Critical Warnings";
			} else if (warnings.some((w: Warning) => w.severity === "yellow")) {
				statusClass = "status-yellow";
				statusTitle = "Cautionary Warnings";
			} else {
				statusClass = "status-green";
				statusTitle = "No Warnings";
			}
		}

		html += `
      <div class="oit-tab ${activeClass}" data-tab-id="${tab.id}">
        <span class="status-dot ${statusClass}" title="${statusTitle}"></span>
        <span class="tab-title">${escapeHtml(tab.title)}</span>
        <span class="oit-tab-close" data-tab-close="${tab.id}" title="Close Tab">×</span>
      </div>
    `;
	});

	// Always add the "+" button if under the tab limit
	if (tabs.length < 5) {
		html += `<div class="oit-tab-add" title="Add New Tab">+</div>`;
	}

	container.innerHTML = html;
}

/**
 * Resets all text and numeric input fields in the settings area.
 * Prevents stale data from leaking between tabs.
 */
function resetInputs() {
	const containers = document.querySelectorAll(
		".settings-container, .oit-toolbar",
	);

	containers.forEach((container) => {
		const inputs = container.querySelectorAll(
			'input[type="text"], input[type="number"], input[type="search"], textarea',
		);
		inputs.forEach((input) => {
			(input as HTMLInputElement | HTMLTextAreaElement).value = "";
		});
	});
}

/**
 * Renders the "Empty State" UI when no protocol is loaded.
 * Toggles visibility of the instruction container and mount points.
 */
function renderEmptyState() {
	const emptyStateContainer = document.getElementById("empty-state-container");
	const protocolTableMount = document.getElementById("protocol-table-mount");

	const dosingContainer = document.querySelector(
		".dosing-strategy-container",
	) as HTMLElement;
	const warningsContainer = document.querySelector(
		".warnings-container",
	) as HTMLElement;
	const stepControls = document.querySelector(
		".step-controls-footer",
	) as HTMLElement;
	const bottomSection = document.querySelector(
		".bottom-section",
	) as HTMLElement;

	// Show Zola instructions, Hide Lit table mount
	if (emptyStateContainer) emptyStateContainer.style.display = "block";
	if (protocolTableMount) protocolTableMount.style.display = "none";

	// Hide protocol-specific UI sections
	if (dosingContainer) dosingContainer.classList.add("oit-hidden-on-init");
	if (warningsContainer) warningsContainer.classList.add("oit-hidden-on-init");
	if (stepControls) stepControls.classList.add("oit-hidden-on-init");
	if (bottomSection) bottomSection.classList.add("oit-hidden-on-init");

	// Reset Food A / B inputs to prevent leaking
	resetInputs();
}

/**
 * Renders the dosing strategy toggle buttons.
 *
 * @param protocol - The current protocol state.
 */
export function renderDosingStrategy(protocol: Protocol | null): void {
	if (!protocol) return;

	const container = document.querySelector(
		".dosing-strategy-container",
	) as HTMLElement;

	const html = `
    <h3>Dosing Strategy (resets all steps on change)</h3>
    <div class="setting-row">
      <div class="toggle-group">
        <button class="toggle-btn ${protocol.dosingStrategy === DosingStrategy.STANDARD ? "active" : ""}" data-strategy="STANDARD">Standard</button>
        <button class="toggle-btn ${protocol.dosingStrategy === DosingStrategy.SLOW ? "active" : ""}" data-strategy="SLOW">Slow</button>
      </div>
    </div>
  `;

	container.innerHTML = html;
}

/**
 * Orchestrates the rendering of the interactive protocol table using lit-html.
 * Handles display toggling between the instructional empty state and the active table.
 *
 * @param protocol - The current protocol state.
 * @param customNote - The text content of the custom note.
 * @param warnings - Pre-calculated warnings array.
 */
export function renderProtocolTable(
	protocol: Protocol | null,
	customNote: string,
	warnings: Warning[],
): void {
	const emptyStateContainer = document.getElementById("empty-state-container");
	const protocolTableMount = document.getElementById("protocol-table-mount");

	if (!protocol) {
		renderEmptyState();
		// Update Warnings to clear them
		const warningsContainer = document.querySelector(
			".warnings-container",
		) as HTMLElement;
		if (warningsContainer) render(nothing, warningsContainer);
		return;
	}

	// Ensure UI is visible if protocol exists
	showProtocolUI();

	// Toggle visibility to show the reactive Lit-html table
	if (emptyStateContainer) emptyStateContainer.style.display = "none";
	if (protocolTableMount) protocolTableMount.style.display = "table";

	// Mount/Update the Lit-html component
	if (protocolTableMount) {
		render(ProtocolTable(protocol, warnings), protocolTableMount);
	}

	// Update Notes and Exports (Bottom Section)
	updateBottomSection(customNote);
}

/**
 * Updates the visibility and content of the bottom section (Notes and Exports).
 *
 * @param customNote - Current note text.
 */
export function updateBottomSection(customNote: string) {
	const bottomSection = document.querySelector(".bottom-section");
	if (!bottomSection) return;

	// Ensure the section is visible (handles the oit-hidden-on-init class removal)
	bottomSection.classList.remove("oit-hidden-on-init");

	const activeStates = workspace
		.getAllProtocolStates()
		.filter((s) => s.getProtocol());
	const isBatch = activeStates.length > 1;

	// Delegate to specific renderers
	updatePublicExports(customNote, isBatch);
}

/**
 * Updates text content and labels for public-facing export buttons.
 *
 * @param customNote - New note text to display.
 * @param isBatch - Whether multiple tabs are active.
 * Updates text content and labels for public-facing export buttons.
 */
function updatePublicExports(customNote: string, isBatch: boolean) {
	const textarea = document.getElementById(
		"custom-note",
	) as HTMLTextAreaElement;
	if (textarea && textarea.value !== customNote) {
		textarea.value = customNote;
	}

	const asciiBtn = document.getElementById("export-ascii");
	const pdfBtn = document.getElementById("export-pdf");

	if (asciiBtn) {
		asciiBtn.textContent = isBatch
			? "Copy All (Clipboard)"
			: "Copy to Clipboard";
	}
	if (pdfBtn && pdfBtn.textContent !== "Generating...") {
		pdfBtn.textContent = isBatch ? "Export All (PDF)" : "Export PDF";
	}
}

/**
 * Renders the warnings sidebar, grouping issues by step and severity.
 *
 * @param protocol - The current protocol state.
 * @param rulesURL - Link to the detailed validation rules documentation.
 * @param warnings - Pre-calculated warnings array.
 */
export function updateWarnings(
	protocol: Protocol | null,
	rulesURL: string,
	warnings: Warning[],
): void {
	if (!protocol) return;

	const container = document.querySelector(
		".warnings-container",
	) as HTMLElement;

	if (container) {
		render(WarningsSidebar(warnings, rulesURL), container);
	}
}

/**
 * Renders the decoded debug payload into the debug result container.
 *
 * @param payload - The decoded payload metadata.
 */
export function renderDebugResult(
	payload: ReadableHistoryPayload | null,
): void {
	if (!payload) return;
	const container = document.getElementById("debug-result-container");
	if (!container) return;

	const currentCommit = __COMMIT_HASH__;
	const payloadVersion =
		payload.version || "On dev mode, no version-commit hash yet";
	const isMismatch = !payloadVersion.includes(currentCommit);

	let warningHtml = "";
	if (isMismatch) {
		warningHtml = `
      <div class="version-mismatch-warning">
        <strong>VERSION MISMATCH</strong><br/>
        QR code was generated with a different version of the tool.<br/>
        <strong>Payload Version:</strong> ${escapeHtml(payloadVersion)}<br/>
        <strong>Current tool hash:</strong> ${currentCommit}<br/><br/>
        While the below is good enough for a snapshot, consider switching to the commit hash found in the payload version.
      </div>
    `;
	}

	const html = `
    <div class="debug-result-content">
      ${warningHtml}
      <p><strong>Version:</strong> ${escapeHtml(payload.version)}</p>
      <p><strong>Timestamp:</strong> ${escapeHtml(payload.timestamp)}</p>
      <details>
        <summary>History Log (${payload.historyLog.length} items)</summary>
        <ul class="history-log">
          ${payload.historyLog.map((item: string) => `<li>${escapeHtml(item)}</li>`).join("")}
        </ul>
      </details>
      <details>
        <summary>Full Protocol JSON</summary>
        <pre class="json-log">${escapeHtml(JSON.stringify(payload.protocol, null, 2))}</pre>
      </details>
      ${
				payload.warnings && payload.warnings.length > 0
					? `<details>
            <summary class="warning-summary">Warnings (${payload.warnings.length})</summary>
            <ul class="warnings-log">
              ${payload.warnings.map((w: ReadableWarning) => `<li>${escapeHtml(w.code)} (Step ${w.stepIndex ?? "N/A"})</li>`).join("")}
            </ul>
          </details>`
					: ""
			}
    </div>
  `;
	container.innerHTML = html;
}
