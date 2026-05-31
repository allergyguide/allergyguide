/**
 * Shared type definitions and schemas
 */
import { z } from "zod";

/**
 * Physical form of food
 */
export enum FoodType {
	SOLID = "SOLID",
	LIQUID = "LIQUID",
	CAPSULE = "CAPSULE",
}

/**
 * Source classification of the food data.
 */
export enum SourceType {
	/** Publicly available data (basically from the Canadian Nutrient File)  */
	GENERIC = "GENERIC",
	/** Branded food product from private repo */
	BRAND = "BRAND",
	/** Other provisioned clinical data for authenticated users */
	PROVISIONED = "PROVISIONED",
}

/**
 * Zod schema for food data as it arrives from external sources
 */
export const FoodDataSchema = z.object({
	name: z.string(),
	type: z.enum(FoodType),
	/** Protein content in grams per serving size. */
	gramsInServing: z.number(),
	/** The size of the serving (e.g., 100g, 250ml) */
	servingSize: z.number(),
	/** food group field present in CNF */
	group: z.string().optional(),
	source: z.enum(SourceType).optional().default(SourceType.GENERIC),
	source_url: z.url().optional(),
	keywords: z.array(z.string()).optional(),
	is_active: z.boolean().optional(),
});

/**
 * Zod schema for food data as it arrives from external sources
 */
export type FoodData = z.infer<typeof FoodDataSchema>;

/**
 * Measuring unit for patient-facing amounts
 */
export type Unit = "g" | "ml" | "capsule";

/**
 * Internal representation of a food item used within the application state and UI.
 */
export interface Food {
	name: string;
	group: string;
	gramsInServing: number;
	servingSize: number;
	type: FoodType;
	standard_error?: number;
	source: SourceType;
	source_url?: string;
	keywords?: string[];
	/** Prepared key for fuzzysort searching */
	preparedKey?: unknown;
}

/**
 * Result structure for the user data loading process
 */
export interface UserLoadResult {
	/** Array of provisioned food items specific to the user */
	foods: Food[];
	/** The username of the logged-in user, or null if unauthenticated */
	username: string | null;
	/** Boolean flag indicating if the user is currently logged in */
	isLoggedIn: boolean;
}

/**
 * Data structure returned by the OFC bootstrap API endpoint
 */
export interface OfcBootstrapResponse {
	/** The username of the authenticated user */
	username: string;
	/** Array of raw provisioned food data */
	provisioned_foods: unknown[];
}

/**
 * Global application state for the OFC Index.
 */
export interface OfcState {
	/** Authentication status */
	isLoggedIn: boolean;
	/** Username of the authenticated user, if any */
	username: string | null;
	/** List of public food items loaded from the CNF database */
	publicFoods: Food[];
	/** List of securely provisioned food items for the logged-in user */
	provisionedFoods: Food[];
	/** Consolidated list of all foods with search optimizations */
	searchableFoods: Food[];
	/** Current raw search query from the input field */
	searchQuery: string;
	/** Debounced search query used for filtering the results */
	debouncedSearchQuery: string;
	/** The food item currently selected for protocol generation */
	selectedFood: Food | null;

	/** Protein content (g) being used in the current modal calculation */
	modalGramsInServing: number;
	/** Serving size being used in the current modal calculation */
	modalServingSize: number;
	/** Target protein amounts (mg) for the PRACTALL-5 protocol */
	modalSteps5: number[];
	/** Target protein amounts (mg) for the PRACTALL-7 protocol */
	modalSteps7: number[];
}

/**
 * Custom error class for HTTP-related failures.
 */
export class HttpError extends Error {
	public statusCode: number;
	constructor(message: string, statusCode: number) {
		super(message);
		this.statusCode = statusCode;
		this.name = "HttpError";
	}
}
