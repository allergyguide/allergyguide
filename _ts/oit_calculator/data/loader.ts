/**
 * @module
 * Orchestrates loading of public food databases and user-specific config and secure assets.
 */
import type { z } from "zod";
import { appState } from "../state/instances";
import {
	type FoodData,
	FoodDataSchema,
	HttpError,
	type OITBootstrapResponse,
	type ProtocolData,
	ProtocolDataSchema,
	type PublicData,
	SourceType,
} from "../types";
import { SAMPLE_PROTOCOL } from "../utils";
import { fetchOITBootstrap } from "./api";

/**
 * Validates an array of raw data items against a Zod schema
 * If any raw data item is invalid it will be skipped and the user will be prominently alerted to this
 *
 * @template T - The TypeScript type inferred from the Zod schema
 * @param {unknown} list - The raw input data (expected to be an array of objects)
 * @param {z.ZodType<T>} schema - The Zod schema definition for a single item
 * @param {string} itemName - A label for the data type (e.g., "Protocol", "CNF Food") used in error logging
 * @param {Function} [transformer] - Optional function to transform each item before validation
 * @returns {T[]} A strongly-typed array of validated items
 * @throws {Error} If the input is not an array
 */
function validateList<T>(
	list: unknown,
	schema: z.ZodSchema<T>,
	itemName: string,
	transformer?: (item: Record<string, unknown>) => Record<string, unknown>,
): T[] {
	if (!Array.isArray(list)) {
		console.error(`Expected array for ${itemName}, got`, list);
		if (typeof window !== "undefined" && window.alert) {
			window.alert(`Failed to load ${itemName}: Data is not an array.`);
		}
		throw Error(`Expected array for ${itemName}. Check console`);
	}

	const validItems: T[] = [];
	let invalidCount = 0;

	list.forEach((item, index) => {
		const transformed = transformer
			? transformer(item as Record<string, unknown>)
			: item;
		const result = schema.safeParse(transformed);
		if (result.success) {
			validItems.push(result.data);
		} else {
			invalidCount++;
			console.warn(
				`Skipping invalid ${itemName} at index ${index}:`,
				result.error,
			);
		}
	});

	if (invalidCount > 0) {
		const msg = `Warning: Skipped ${invalidCount} malformed ${itemName}(s). Check console for details.`;
		console.warn(msg);
		if (typeof window !== "undefined" && window.alert) {
			window.alert(msg);
		}
	}

	return validItems;
}

/**
 * Normalizes raw food data by determining the correct source based on present fields.
 * This prevents validation failures when legacy data is missing mandatory curated fields.
 *
 * @param {Record<string, unknown>} item - The raw food item to normalize
 * @param {SourceType} defaultSource - The default source to use if no explicit source is provided
 * @returns {Record<string, unknown>} The normalized food item with a determined source
 */
function normalizeFoodData(
	item: Record<string, unknown>,
	defaultSource: SourceType,
): Record<string, unknown> {
	// Use explicit source if provided
	if (item.source) return item;

	// determine source based on present fields
	// NOTE: this is somewhat brittle, based on heuristics
	let source = defaultSource;
	if (item.source_url) {
		source = SourceType.BRAND;
	} else if (item.id) {
		source = SourceType.PROVISIONED;
	}

	// if it's labeled as curated (BRAND/PROV) but lacks an ID, downgraded to GENERIC. Curated features require an ID to function.
	if (
		(source === SourceType.BRAND || source === SourceType.PROVISIONED) &&
		!item.id
	) {
		source = SourceType.GENERIC;
		console.warn(
			`Downgrading ${item.name} from ${source} to GENERIC due to missing ID`,
		);
	}

	return { ...item, source };
}

/**
 * Loads and validates the public databases (CNF foods and protocols).
 * @returns {Promise<PublicData>} A promise that resolves to the loaded and validated public data
 */
export async function loadPublicDatabases(): Promise<PublicData> {
	try {
		const response = await fetch("/tool_assets/cnf_foods.json");
		if (!response.ok)
			throw new Error(`Failed to load CNF foods: ${response.statusText}`);

		const raw = await response.json();

		const foods = validateList<FoodData>(
			raw,
			FoodDataSchema,
			"CNF Food",
			(item) => ({ ...item, source: SourceType.GENERIC }),
		);

		return {
			foods,
			protocols: [ProtocolDataSchema.parse(SAMPLE_PROTOCOL)], // the sample
		};
	} catch (error) {
		console.error("Error loading public database:", error);
		throw error;
	}
}

/**
 * Orchestrates loading the user configuration and consolidated assets via a bootstrap endpoint.
 * Call after auth signal.
 */
export async function loadUserConfiguration(): Promise<OITBootstrapResponse> {
	try {
		// Fetch everything in one go
		const bootstrapData = await fetchOITBootstrap();

		// Basic structure check
		if (!bootstrapData || typeof bootstrapData !== "object") {
			throw new Error("Invalid bootstrap data");
		}

		// Validate Data
		// fallback to [] if the call fails
		const provisioned_foods = validateList<FoodData>(
			bootstrapData.provisioned_foods || [],
			FoodDataSchema,
			"Provisioned Food",
			(item) => normalizeFoodData(item, SourceType.PROVISIONED),
		);
		const provisioned_protocols = validateList<ProtocolData>(
			bootstrapData.provisioned_protocols || [],
			ProtocolDataSchema,
			"Provisioned Protocol",
			(item) => {
				const proto = { ...item };
				// Ensure nested foods are normalized
				// This is basically a fallback for any missing source fields if the backend has made a mistake
				if (proto.food_a) {
					proto.food_a = normalizeFoodData(
						proto.food_a as Record<string, unknown>,
						SourceType.GENERIC,
					);
				}
				if (proto.food_b) {
					proto.food_b = normalizeFoodData(
						proto.food_b as Record<string, unknown>,
						SourceType.GENERIC,
					);
				}
				return proto;
			},
		);

		return {
			username: bootstrapData.username || "Unknown",
			provisioned_foods: provisioned_foods,
			provisioned_protocols: provisioned_protocols,
			handouts: bootstrapData.handouts || [],
		};
	} catch (error) {
		if (error instanceof HttpError) {
			throw error;
		}
		// Generic fallback for other errors
		console.error("Error loading user configuration:", error);
		throw error;
	}
}

/**
 * Shared logic to load user data and update the UI
 * Used on page load (if cookie exists) and after manual login
 */
export async function handleUserLoad(): Promise<boolean> {
	try {
		// load user config and assets
		// This throws if the bootstrap request fails or lacks oit_calculator config
		const userData = await loadUserConfiguration();

		// update state (foods, protocols, and pdf order)
		appState.addProvisionedData(
			userData.provisioned_foods,
			userData.provisioned_protocols,
			userData.handouts,
		);

		appState.setAuthState(true, userData.username);

		return true;
	} catch (e) {
		appState.setAuthState(false, null);

		if (e instanceof HttpError) {
			if (e.statusCode === 401 || e.statusCode === 403) {
				console.debug("No active session or failed to load user config:", e);
			} else {
				console.warn("User load failed (Non-Auth Error):", e);
			}
			return false;
		}

		// non http error, probably something we want more info on...
		console.error("Undefined err in handleUserLoad: ", e);
		return false;
	}
}
