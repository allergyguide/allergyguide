/**
 * @module
 *
 * Fuzzy search capabilities
 */
import fuzzysort from "fuzzysort";
import { PROTOCOL_DISPLAY_LIMIT, SEARCH_DISPLAY_LIMIT } from "../constants";
import {
	type FoodData,
	FoodType,
	type ProtocolData,
	type SearchResult,
	SourceType,
} from "../types";

/**
 * Maps each source type to a weight used in search scoring.
 * In general, user-provided content (USER and PROVISIONED) should be scored higher than generic or brand content.
 */
const SourceWeight: Record<SourceType, number> = {
	[SourceType.USER]: 4,
	[SourceType.PROVISIONED]: 3,
	[SourceType.BRAND]: 2,
	[SourceType.GENERIC]: 1,
};

/**
 * Interface for structured search results
 */
export interface StructuredSearchResults {
	protocols: SearchResult[];
	foods: SearchResult[];
}

/**
 * Run fuzzy search against foods and/or protocol templates.
 *
 * @param query The user's search text
 * @param searchType "food" (foods only) or "protocol" (protocols + foods)
 * @param preparedFoods The array of prepared food objects
 * @param preparedProtocols The array of prepared protocol objects
 * @returns StructuredSearchResults object
 */
export function performSearch(
	query: string,
	searchType: "food" | "protocol",
	preparedFoods: FoodData[],
	preparedProtocols: ProtocolData[],
): StructuredSearchResults {
	if (!query.trim()) return { protocols: [], foods: [] };

	const results: StructuredSearchResults = {
		protocols: [],
		foods: [],
	};

	if (searchType === "protocol") {
		const protocolResults = fuzzysort.go(query, preparedProtocols, {
			key: "prepared",
			limit: PROTOCOL_DISPLAY_LIMIT,
			threshold: -10000,
		});
		results.protocols = protocolResults.map((r) => ({
			type: "protocol" as const,
			data: r.obj as ProtocolData,
		}));
	}

	const foodResults = fuzzysort.go(query, preparedFoods, {
		key: "prepared",
		limit: SEARCH_DISPLAY_LIMIT,
		threshold: -10000,
	});

	// Filter out CAPSULE types and map to SearchResult
	// Plus implement tie-breaker logic
	const mappedFoods = foodResults
		.filter((r) => r.obj.type !== FoodType.CAPSULE)
		.map((r) => ({
			type: "food" as const,
			data: r.obj as FoodData,
			score: r.score,
		}));

	// Source weighting tie-breaker:
	// if scores are within 10 points, sort by source weight
	mappedFoods.sort((a, b) => {
		const scoreDiff = b.score - a.score;
		if (Math.abs(scoreDiff) <= 10) {
			const weightA = SourceWeight[a.data.source] || 0;
			const weightB = SourceWeight[b.data.source] || 0;
			if (weightA !== weightB) return weightB - weightA;
		}
		return scoreDiff;
	});

	results.foods = mappedFoods.map((f) => ({ type: f.type, data: f.data }));

	return results;
}
