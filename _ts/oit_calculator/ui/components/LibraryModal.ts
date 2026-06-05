import fuzzysort from "fuzzysort";
import { html, nothing, render } from "lit-html";
import { repeat } from "lit-html/directives/repeat.js";
import { appState, workspace } from "../../state/instances";
import { type FoodData, FoodType, type ProtocolData } from "../../types";
import { formatDate, getMeasuringUnit } from "../../utils";
import { selectFoodA, selectProtocol } from "../actions";
import { deleteUserDocument } from "../actions/vaultActions";

let searchQuery = "";
let confirmDeleteId: string | null = null;
let searchTimeout: number | null = null; // for search debounce

/**
 * render function for the Library Modal
 * Called initially and on every state change (search, delete confirmation)
 */
export function renderLibraryModal() {
	const mount = document.getElementById("oit-library-modal-mount");
	if (!mount) return;

	const userProtocols = appState.getUserProtocols();
	const userFoods = appState.getUserFoods();

	// Sorting: Most recent first
	const sortedProtocols = userProtocols.sort((a, b) =>
		(b.last_updated || "").localeCompare(a.last_updated || ""),
	);
	const sortedFoods = userFoods.sort((a, b) =>
		((b as { last_updated?: string }).last_updated || "").localeCompare(
			(a as { last_updated?: string }).last_updated || "",
		),
	);

	// Live Filtering using fuzzysort for typo tolerance
	let filteredProtocols = sortedProtocols;
	let filteredFoods = sortedFoods;

	if (searchQuery.trim()) {
		filteredProtocols = fuzzysort
			.go(searchQuery, sortedProtocols, { key: "name", threshold: -10000 })
			.map((r) => r.obj);
		filteredFoods = fuzzysort
			.go(searchQuery, sortedFoods, {
				key: "name",
				threshold: -10000,
			})
			.map((r) => r.obj);
	}

	render(libraryTemplate(filteredProtocols, filteredFoods), mount);
}

/**
 * Shows the Library Modal and locks body scrolling
 */
export function showLibraryModal() {
	const mount = document.getElementById("oit-library-modal-mount");
	if (mount) {
		mount.style.display = "flex";
		document.body.style.overflow = "hidden";
		renderLibraryModal();
	}
}

/**
 * Hides the Library Modal and restores state
 */
function hideLibraryModal() {
	const mount = document.getElementById("oit-library-modal-mount");
	if (mount) {
		mount.style.display = "none";
		document.body.style.overflow = "";
		searchQuery = "";
		confirmDeleteId = null;
	}
}

/**
 * Top-level modal template
 */
const libraryTemplate = (protocols: ProtocolData[], foods: FoodData[]) => html`
	<div class="core-modal-overlay" @click=${hideLibraryModal}>
		<div class="core-modal-content oit-library-modal" @click=${(e: Event) => e.stopPropagation()}>
			<div class="oit-modal-header">
				<h2>My Library</h2>
				<button class="oit-modal-close" @click=${hideLibraryModal}>×</button>
			</div>

			<div class="oit-library-search">
				<input 
					type="text" 
					class="core-input"
					placeholder="Search protocols and foods..." 
					.value=${searchQuery}
					@input=${(e: Event) => {
						const val = (e.target as HTMLInputElement).value;
						if (searchTimeout) window.clearTimeout(searchTimeout);
						searchTimeout = window.setTimeout(() => {
							searchQuery = val;
							renderLibraryModal();
						}, 150);
					}}
				/>
			</div>

			<div class="oit-library-split-pane">
				<div class="oit-library-column">
					<h3>Protocols</h3>
					<div class="oit-library-list">
						${protocols.length === 0 ? html`<p class="subtle-text">No matching protocols.</p>` : nothing}
						${repeat(
							protocols,
							(p) => p.id,
							(p) => renderProtocolRow(p),
						)}
					</div>
				</div>
				<div class="oit-library-column">
					<h3>Foods</h3>
					<div class="oit-library-list">
						${foods.length === 0 ? html`<p class="subtle-text">No matching foods.</p>` : nothing}
						${repeat(
							foods,
							(f) => (f as { id?: string }).id,
							(f) => renderFoodRow(f),
						)}
					</div>
				</div>
			</div>
		</div>
	</div>
`;

/**
 * Helper to avoid overwriting a tab that is already in use
 *
 * If the current active tab has a protocol, and we are under the 5-tab limit, create a new tab before loading the library item
 */
function ensureCleanTab() {
	const activeState = workspace.getActive();
	const currentProtocol = activeState.getProtocol();
	const numTabs = workspace.getTabs().length;

	if (currentProtocol !== null && numTabs < 5) {
		workspace.addTab();
	}
}

/**
 * Template for a single Protocol row
 */
const renderProtocolRow = (p: ProtocolData) => {
	const tabsFull = workspace.getTabs().length >= 5;
	const isConfirming = confirmDeleteId === p.id;

	return html`
		<div class="oit-library-item">
			<div class="item-info">
				<span class="item-name" title="${p.name}">${p.name}</span>
				<span class="item-date">Updated: ${formatDate(p.last_updated)}</span>
			</div>
			<div class="item-actions">
				${
					isConfirming
						? html`
					<div class="action-group">
						<button class="cancel-btn" @click=${() => {
							confirmDeleteId = null;
							renderLibraryModal();
						}}>Cancel</button>
						<button class="confirm-btn" @click=${() => p.id && handleDelete(p.id, "custom_protocol")}>Delete</button>
					</div>
				`
						: html`
					<div class="action-group">
						${
							tabsFull
								? html`<span class="badge">Tabs Full</span>`
								: html`
							<button class="open-btn" @click=${() => {
								ensureCleanTab();
								selectProtocol(p);
								hideLibraryModal();
							}}>Open</button>
						`
						}
						<button class="delete-btn" title="Delete Protocol" @click=${() => {
							if (p.id) {
								confirmDeleteId = p.id;
								renderLibraryModal();
							}
						}}>🗑️</button>
					</div>
				`
				}
			</div>
		</div>
	`;
};

/**
 * Template for a single Food row
 */
const renderFoodRow = (f: FoodData) => {
	const isConfirming = confirmDeleteId === (f as { id?: string }).id;

	return html`
		<div class="oit-library-item">
			<div class="item-info">
				<span class="item-name" title="${f.name}">${f.name}</span>
				<div class="item-metadata-row">
					<span class="item-date">Updated: ${formatDate((f as { last_updated?: string }).last_updated)}</span>
					<span class="item-subinfo">
					${
						f.type !== FoodType.CAPSULE
							? `${f.gramsInServing} g / ${f.servingSize} ${getMeasuringUnit(f)}`
							: "capsule"
					}
					</span>
				</div>
			</div>
			<div class="item-actions">
				${
					isConfirming
						? html`
					<div class="action-group">
						<button class="cancel-btn" @click=${() => {
							confirmDeleteId = null;
							renderLibraryModal();
						}}>Cancel</button>
						<button class="confirm-btn" @click=${() => {
							const fid = (f as { id?: string }).id;
							if (fid) handleDelete(fid, "custom_food");
						}}>Delete</button>
					</div>
				`
						: html`
					<div class="action-group">
						<button class="open-btn" @click=${() => {
							ensureCleanTab();
							selectFoodA(f);
							hideLibraryModal();
						}}>Load</button>
						<button class="delete-btn" title="Delete Food" @click=${() => {
							const fid = (f as { id?: string }).id;
							if (fid) {
								confirmDeleteId = fid;
								renderLibraryModal();
							}
						}}>🗑️</button>
					</div>
				`
				}
			</div>
		</div>
	`;
};

async function handleDelete(
	id: string,
	type: "custom_food" | "custom_protocol",
) {
	try {
		await deleteUserDocument(id, type);
		confirmDeleteId = null;
		renderLibraryModal();
	} catch (err) {
		console.error(err);
		alert(`Failed to delete ${type === "custom_food" ? "food" : "protocol"}.`);
	}
}
