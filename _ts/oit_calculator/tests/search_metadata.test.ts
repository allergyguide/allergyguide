import fuzzysort from "fuzzysort";
import { describe, expect, it } from "vitest";
import { performSearch } from "../core/search";
import { FoodType, SourceType } from "../types";

describe("performSearch with Metadata and Weighting", () => {
    // Helper to prepare mock data
    const prepareFoods = (foods: any[]) => {
        return foods.map(f => {
            const surrogate = `${f.name} ${f.keywords?.join(" ") || ""}`.trim();
            return {
                ...f,
                prepared: fuzzysort.prepare(surrogate)
            };
        });
    };

    const prepareProtocols = (protocols: any[]) => {
        return protocols.map(p => ({
            ...p,
            prepared: fuzzysort.prepare(p.name)
        }));
    };

    const mockFoodsRaw = [
        { name: "Peanut", type: FoodType.SOLID, gramsInServing: 20, servingSize: 100, source: SourceType.GENERIC, keywords: ["PB"] },
        { name: "Bamba", type: FoodType.SOLID, gramsInServing: 3, servingSize: 30, source: SourceType.BRAND, keywords: ["Peanut", "Snack"] },
        { name: "My Peanut", type: FoodType.SOLID, gramsInServing: 20, servingSize: 100, source: SourceType.USER, id: "user-1" }
    ];

    const mockFoods = prepareFoods(mockFoodsRaw);

    const mockProtocols = prepareProtocols([
        { name: "Peanut Standard", source: SourceType.GENERIC }
    ]);

    it("should return structured results (protocols and foods)", () => {
        const results = performSearch("Peanut", "protocol", mockFoods as any, mockProtocols as any);
        expect(results).toHaveProperty("protocols");
        expect(results).toHaveProperty("foods");
        expect(Array.isArray(results.protocols)).toBe(true);
        expect(Array.isArray(results.foods)).toBe(true);
    });

    it("should find foods using surrogate keys (name + keywords)", () => {
        // "PB" is a keyword for Peanut but not in the name
        const results = performSearch("PB", "food", mockFoods as any, []);
        expect(results.foods.some(r => r.data.name === "Peanut")).toBe(true);
    });

    it("should apply source weighting only as a tie-breaker between near-equal matches", () => {
        // "My Peanut" (USER) and "Peanut" (GENERIC) score almost the same, so USER wins the tie.
        // "Bamba" only has "Peanut" as a keyword: a clearly weaker match, so BRAND weight doesn't lift it.
        const results = performSearch("Peanut", "food", mockFoods as any, []);

        expect(results.foods.map((r) => (r.data as any).source)).toEqual([
            SourceType.USER,
            SourceType.GENERIC,
            SourceType.BRAND,
        ]);
    });

    it("should cap protocols and foods independently", () => {
        const results = performSearch("Peanut", "protocol", mockFoods as any, mockProtocols as any);
        expect(results.protocols.length).toBeLessThanOrEqual(5);
        expect(results.foods.length).toBeLessThanOrEqual(50);
    });
});
