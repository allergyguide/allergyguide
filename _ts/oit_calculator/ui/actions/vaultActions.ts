import { deleteSupaDocument, saveSupaDocument } from "../../../core/data/db";
import { appState, workspace } from "../../state/instances";
import {
	type Food,
	type FoodData,
	type Protocol,
	SourceType,
} from "../../types";
import { serializeProtocol } from "../../utils";
import {
	hideSaveModal,
	showSaveFoodModal,
	showSaveModal,
} from "../components/SaveModals";

/**
 * saves the active protocol to Supabase.
 * Handles "Save" (update) and "Save As" (new entry)
 *
 * @param saveAsNew - If true, forces a new entry even if an ID exists
 */
export async function saveActiveProtocol(saveAsNew = false): Promise<void> {
	if (!appState.isLoggedIn) return;

	const activeTab = workspace.getActive();
	const p = activeTab.getProtocol();
	if (!p) return;

	// Skip save if already clean and not forcing a new entry
	if (!saveAsNew && p.id && !activeTab.isDirty()) {
		// console.debug("Save skipped: Protocol is already up to date.");
		return;
	}

	// If saving as new or it's a brand new protocol without an ID, prompt for name first
	if (saveAsNew || !p.id) {
		const promptTitle = saveAsNew
			? "Save Protocol As"
			: "Name this protocol to save it";
		const defaultName = saveAsNew
			? `Copy of ${p.name || "Untitled"}`
			: p.name || "";

		showSaveModal({
			title: promptTitle,
			defaultName: defaultName,
			onSave: (newName) => {
				executeSave(newName.trim() || "Untitled", true);
				hideSaveModal();
			},
			onCancel: () => hideSaveModal(),
		});
	} else {
		// Silent Update
		executeSave(p.name || "Untitled", false);
	}

	async function executeSave(name: string, isNew: boolean) {
		const protocolData = serializeProtocol(
			p as Protocol,
			activeTab.getCustomNote(),
		);

		if (isNew) {
			protocolData.id = crypto.randomUUID();
			protocolData.name = name;
			protocolData.source = SourceType.USER;
		}

		protocolData.last_updated = new Date().toISOString();

		try {
			await saveSupaDocument(
				protocolData.id as string,
				"custom_protocol",
				protocolData,
			);

			// Update local memory for the Library/Search
			appState.upsertUserProtocol(protocolData);

			// Update the active tab's runtime protocol with the new identity (ID, Source, Name)
			// addToHistory: false to avoid creating a new undo step for the save itself
			// NOTE: This uses 'p' captured from the closure before the async save began; if the user made edits while the save was in flight, this will cause a 'snap back' to the pre-save state. This is acceptable given the short duration of the save
			activeTab.setProtocol(
				{
					...p,
					id: protocolData.id,
					name: protocolData.name,
					source: SourceType.USER,
					last_updated: protocolData.last_updated,
				} as Protocol,
				`Saved Protocol: ${protocolData.name}`,
				{ addToHistory: false },
			);

			// Reset baseline so it's no longer "dirty"
			activeTab.setBaseline();
		} catch (err) {
			console.error("Failed to save protocol:", err);
			alert(
				"Database Error: Could not save protocol. Are you connected to the Internet?",
			);
		}
	}
}

/**
 * Renames the active protocol in Supabase
 */
export async function renameActiveProtocol(): Promise<void> {
	const activeTab = workspace.getActive();
	const p = activeTab.getProtocol();
	if (!p?.id) return;

	const id = p.id;

	showSaveModal({
		title: "Rename Protocol",
		defaultName: p.name || "",
		onSave: async (newName) => {
			const cleanedName = newName.trim() || "Untitled";
			if (cleanedName === p.name) {
				hideSaveModal();
				return;
			}

			const protocolData = serializeProtocol(
				p as Protocol,
				activeTab.getCustomNote(),
			);
			protocolData.name = cleanedName;
			protocolData.last_updated = new Date().toISOString();

			try {
				await saveSupaDocument(id, "custom_protocol", protocolData);
				appState.upsertUserProtocol(protocolData);

				// Update the active tab's runtime protocol with the new name
				// NOTE: This uses 'p' captured from the closure before the async save began; if the user made edits while the save was in flight, this will cause a 'snap back' to the pre-save state. This is acceptable given the short duration of the save
				activeTab.setProtocol(
					{
						...p,
						name: cleanedName,
						last_updated: protocolData.last_updated,
					} as Protocol,
					`Renamed Protocol to: ${cleanedName}`,
					{ addToHistory: false },
				);
				activeTab.setBaseline();
				hideSaveModal();
			} catch (err) {
				console.error("Failed to rename protocol:", err);
				alert(
					"Database Error: Could not rename protocol. Are you connected to the internet?",
				);
			}
		},
		onCancel: () => hideSaveModal(),
	});
}

/**
 * Orchestrates saving a custom food to Supabase?
 *
 * @param food - The Food object to save
 * @param saveAsNew - If true, generates a new ID
 * @param targetSlot - Optional "A" or "B" slot to strictly target for the update
 */
export async function saveCustomFood(
	food: Food,
	saveAsNew = false,
	targetSlot?: "A" | "B",
): Promise<void> {
	if (saveAsNew) {
		showSaveFoodModal({
			food,
			saveAsNew,
			onSave: (newName) => {
				executeFoodSave(newName.trim() || "Untitled Food", true);
				hideSaveModal();
			},
			onCancel: () => hideSaveModal(),
		});
	} else {
		executeFoodSave(food.name, !food.id);
	}

	async function executeFoodSave(name: string, isNew: boolean) {
		const activeTab = workspace.getActive();
		if (targetSlot) activeTab.setSavingFoodKey(targetSlot);

		const foodData: FoodData = {
			id: isNew ? crypto.randomUUID() : food.id,
			name: name,
			type: food.type,
			gramsInServing: food.gramsInServing.toNumber(),
			servingSize: food.servingSize.toNumber(),
			source: SourceType.USER,
			last_updated: new Date().toISOString(),
		};

		try {
			await saveSupaDocument(foodData.id as string, "custom_food", foodData);
			appState.upsertUserFood(foodData);

			// If the saved food is part of the active protocol, update its ID and NAME there too
			// makes sure that the FoodSettings panel instantly shows the new name chosen in the modal
			const p = activeTab.getProtocol();
			if (p) {
				let updated = false;
				const newP = { ...p };

				// Determine if food A or B is being updated
				// If targetSlot is provided, we strictly update only that slot
				// If not, we have a fallback
				const updateA =
					targetSlot === "A" ||
					(!targetSlot &&
						(newP.foodA.id === food.id || newP.foodA.name === food.name));
				const updateB =
					newP.foodB &&
					(targetSlot === "B" ||
						(!targetSlot &&
							(newP.foodB.id === food.id || newP.foodB.name === food.name)));

				if (updateA) {
					newP.foodA = {
						...newP.foodA,
						id: foodData.id,
						name: foodData.name, // Update name for reactive feedback
						source: SourceType.USER,
					};
					updated = true;
				}
				if (updateB && newP.foodB) {
					newP.foodB = {
						...newP.foodB,
						id: foodData.id,
						name: foodData.name, // Update name for reactive feedback
						source: SourceType.USER,
					};
					updated = true;
				}

				if (updated) {
					activeTab.setProtocol(
						newP,
						`Linked food to library: ${foodData.name}`,
						{ addToHistory: false },
					);

					// Decoupled Baseline: only reset the baseline for the food that was saved
					if (updateA) activeTab.setFoodBaseline("A");
					if (updateB) activeTab.setFoodBaseline("B");
				}
			}
		} catch (err) {
			console.error("Failed to save food:", err);
			alert("Database Error: Could not save food.");
		} finally {
			if (targetSlot) activeTab.setSavingFoodKey(null);
		}
	}
}

/**
 * Deletes a document from Supabase and local memory
 *
 * @param id - Document UUID
 * @param docType - "custom_food" or "custom_protocol"
 */
export async function deleteUserDocument(
	id: string,
	docType: "custom_food" | "custom_protocol",
): Promise<void> {
	try {
		await deleteSupaDocument(id);

		if (docType === "custom_food") {
			appState.deleteUserFood(id);
		} else {
			appState.deleteUserProtocol(id);
		}
	} catch (err) {
		console.error(`Failed to delete ${docType}:`, err);
		throw err;
	}
}
