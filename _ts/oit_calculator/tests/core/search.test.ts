import fuzzysort from "fuzzysort";
import { describe, expect, it } from "vitest";
import { performSearch } from "../../core/search";
import { SourceType } from "../../types";

describe("Core: Search", () => {
	// Helper to prepare data
	const prepare = (list: any[], key: string) => {
		return list.map((item) => ({
			...item,
			prepared: fuzzysort.prepare(item[key]),
		}));
	};

	const foods = [
		{ Food: "Peanut", Type: "SOLID", source: SourceType.GENERIC },
		{ Food: "Milk", Type: "LIQUID", source: SourceType.GENERIC },
		{ Food: "Egg", Type: "SOLID", source: SourceType.GENERIC },
	];

	const protocols = [
		{ name: "Peanut Standard", food_a: { name: "Peanut", source: SourceType.GENERIC }, source: SourceType.GENERIC },
		{ name: "Milk Slow", food_a: { name: "Milk", source: SourceType.GENERIC }, source: SourceType.GENERIC },
	];

	const preparedFoods = prepare(foods, "Food");
	const preparedProtocols = prepare(protocols, "name");

	it("should find foods matching query", () => {
		const results = performSearch(
			"Pea",
			"food",
			preparedFoods,
			preparedProtocols,
		);
		expect(results.foods.length).toBeGreaterThan(0);
		expect(results.foods[0].type).toBe("food");
		expect((results.foods[0].data as any).Food).toBe("Peanut");
	});

	it("should find protocols matching query", () => {
		const results = performSearch(
			"Stand",
			"protocol",
			preparedFoods,
			preparedProtocols,
		);
		expect(results.protocols.length).toBeGreaterThan(0);
		expect(results.protocols[0].type).toBe("protocol");
		expect((results.protocols[0].data as any).name).toBe("Peanut Standard");
	});

	it("should combine results for protocol search type", () => {
		// "Milk" matches both food and protocol
		const results = performSearch(
			"Milk",
			"protocol",
			preparedFoods,
			preparedProtocols,
		);

		const hasFood = results.foods.some(
			(r) => r.type === "food" && (r.data as any).Food === "Milk",
		);
		const hasProtocol = results.protocols.some(
			(r) => r.type === "protocol" && (r.data as any).name === "Milk Slow",
		);

		expect(hasFood).toBe(true);
		expect(hasProtocol).toBe(true);
	});

	it("should return empty array for empty query", () => {
		const results = performSearch(
			"   ",
			"food",
			preparedFoods,
			preparedProtocols,
		);
		expect(results.foods).toEqual([]);
		expect(results.protocols).toEqual([]);
	});
});
