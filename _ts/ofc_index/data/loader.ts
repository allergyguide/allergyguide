/**
 * Handles fetching and parsing of food data from both public assets and secure API endpoints
 */
import {
	type Food,
	FoodDataSchema,
	FoodType,
	SourceType,
	type UserLoadResult,
} from "../types";
import { fetchOFCBootstrap } from "./api";

/**
 * Loads the public food database from the Canadian Nutrient File (CNF) asset
 *
 * @returns {Promise<Food[]>} A promise resolving to an array of validated food items
 * @throws {Error} If the asset fails to load or contains invalid data
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

	// skip items that don't fail the zod schema and flag in console
	return raw
		.map((item: unknown) => {
			try {
				const parsed = FoodDataSchema.parse(item);
				return {
					...parsed,
					group: parsed.group || "Unknown",
					source: SourceType.GENERIC,
				} as Food;
			} catch (e) {
				console.error("Skipping invalid public food entry:", item, e);
				return null;
			}
		})
		.filter((f): f is Food => f !== null);
}

/**
 * Orchestrates the loading of user-specific provisioned data and authentication status
 *
 * @returns {Promise<UserLoadResult>} A promise resolving to the user's data and status
 */
export async function handleUserLoad(): Promise<UserLoadResult> {
	try {
		const userData = await fetchOFCBootstrap();
		if (userData) {
			const provisionedFoods: Food[] = (userData.provisioned_foods || [])
				.map((f: unknown) => {
					try {
						const parsed = FoodDataSchema.parse(f);

						// if is_active is absent (ie in CNF foods) default true
						// then filter out inactive foods
						const is_active = parsed.is_active ?? true;

						// similarly, it doesn't make sense for this tool to handle capsule foods
						const is_capsule = parsed.type === FoodType.CAPSULE;

						if (is_active && !is_capsule) {
							return {
								...parsed,
								group: parsed.group || "Unknown",
								source: parsed.source || SourceType.PROVISIONED, // provisioned by default, but hopefully this never runs
							} as Food;
						} else return null;
					} catch (e) {
						console.error("Invalid provisioned food data:", f, e);
						return null;
					}
				})
				.filter((f: unknown): f is Food => f !== null);

			return {
				foods: provisionedFoods,
				username: userData.username,
				isLoggedIn: true,
			};
		}
	} catch (e) {
		console.error("Failed to load user data", e);
	}
	return {
		foods: [],
		username: null,
		isLoggedIn: false,
	};
}
