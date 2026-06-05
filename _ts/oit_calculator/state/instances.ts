/**
 * @module
 * Singleton instances of state managers.
 */
import type { FoodData, ProtocolData } from "../types";
import { AppState } from "./appState";
import { WorkspaceManager } from "./workspaceManager";

export const workspace = new WorkspaceManager();

export let appState: AppState;

/**
 * Utility to initialize the appState singleton.
 * Should only be called once during app initialization.
 */
export function initializeAppState(
	publicData: {
		foods: FoodData[];
		protocols: ProtocolData[];
	},
	warningsUrl: string,
) {
	appState = new AppState(publicData, warningsUrl);
	return appState;
}
