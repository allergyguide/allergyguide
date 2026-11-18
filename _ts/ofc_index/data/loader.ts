/**
 * Handles fetching and parsing of food data from both public assets and secure API endpoints
 */
import type { SupaDocument } from "../../core/data/db";
import {
	type Food,
	type FoodData,
	FoodDataSchema,
	FoodType,
	HttpError,
	SourceType,
	type UserLoadResult,
} from "../types";
import { fetchOFCBootstrap } from "./api";

/**
 * Validates raw food entries and converts them to the internal shape
 * Invalid entries are skipped (and logged); inactive and capsule foods are dropped (this tool doesn't handle capsules)
 *
 * @param raws - Raw food entries from any source
 * @param source - Source to stamp on every food; if omitted, the entry's own `source` is kept
 * @returns {Food[]} Valid, active, non-capsule foods
 */
export function toFoods(raws: unknown[], source?: SourceType): Food[] {
	const foods: Food[] = [];
	for (const raw of raws) {
		const result = FoodDataSchema.safeParse(raw);
		if (!result.success) {
			console.error("Skipping invalid food entry:", raw, result.error);
			continue;
		}
		const f = result.data;
		if (!(f.is_active ?? true) || f.type === FoodType.CAPSULE) continue;
		foods.push({
			...f,
			group: f.group || "Unknown",
			source: source ?? f.source,
		});
	}
	return foods;
}

/**
 * Loads the public food database from the Canadian Nutrient File (CNF) asset
 *
 * @returns {Promise<Food[]>} A promise resolving to an array of validated food items
 * @throws {Error} If the asset fails to load or is not an array
 */
export async function loadPublicFoods(): Promise<Food[]> {
	const response = await fetch("/tool_assets/cnf_foods.json");
	if (!response.ok) {
		throw new Error(`Failed to load CNF foods: ${response.statusText}`);
	}
	const raw = await response.json();

	if (!Array.isArray(raw)) {
		throw new Error("Invalid CNF data: expected an array");
	}

	return toFoods(raw, SourceType.GENERIC);
}

/**
 * Loads the user's provisioned foods and email. Call only when a Supabase session exists
 *
 * @returns {Promise<UserLoadResult>} The user's provisioned foods and email
 * @throws {HttpError} 401 if there is no session, 403 if the account lacks access, other codes on server errors
 */
export async function handleUserLoad(): Promise<UserLoadResult> {
	const userData = await fetchOFCBootstrap();
	if (!userData) {
		throw new HttpError("No active session", 401);
	}
	return {
		foods: toFoods(userData.provisioned_foods || []),
		email: userData.email,
	};
}

/**
 * Converts decrypted custom-food documents into foods
 *
 * @param docs - Decrypted `custom_food` documents
 */
export function loadCustomFoods(docs: SupaDocument<FoodData>[]): Food[] {
	return toFoods(
		docs.map((doc) => doc.data),
		SourceType.USER,
	);
}
