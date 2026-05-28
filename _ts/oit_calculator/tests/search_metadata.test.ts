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

    it("should apply source weighting as a tie-breaker (USER > BRAND > GENERIC)", () => {
        // Query "Peanut" should match all three.
        // Scores should be identical or very close.
        const results = performSearch("Peanut", "food", mockFoods as any, []);
        
        expect(results.foods.length).toBeGreaterThanOrEqual(2);
        const first = results.foods[0].data;
        const second = results.foods[1].data;
        
        // Assert on FoodData directly (cast if needed to resolve narrowing)
        expect((first as any).source).toBe(SourceType.USER);
        expect((second as any).source).toBe(SourceType.BRAND);
    });

    it("should cap protocols and foods independently", () => {
        const results = performSearch("Peanut", "protocol", mockFoods as any, mockProtocols as any);
        expect(results.protocols.length).toBeLessThanOrEqual(5);
        expect(results.foods.length).toBeLessThanOrEqual(50);
    });
});
