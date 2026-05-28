import { describe, expect, it } from "vitest";
import { DosingStrategy, FoodAStrategy, FoodDataSchema, FoodType, MFoodSchema, ProtocolDataSchema, SourceType } from "../types";

describe("FoodDataSchema with Metadata", () => {
    it("should validate a GENERIC food (no metadata needed)", () => {
        const data = {
            name: "Generic Food",
            type: FoodType.SOLID,
            gramsInServing: 10,
            servingSize: 100,
            source: SourceType.GENERIC
        };
        expect(FoodDataSchema.parse(data)).toEqual(data);
    });

    it("should validate a BRAND food (requires id, source_url, last_updated, is_active)", () => {
        const data = {
            name: "Brand Food",
            type: FoodType.SOLID,
            gramsInServing: 10,
            servingSize: 100,
            source: SourceType.BRAND,
            id: "uuid-123",
            source_url: "https://example.com",
            last_updated: "2024-05-24T00:00:00Z",
            is_active: true
        };
        expect(FoodDataSchema.parse(data)).toEqual(data);
    });

    it("should fail BRAND food if metadata is missing", () => {
        const data = {
            name: "Brand Food",
            type: FoodType.SOLID,
            gramsInServing: 10,
            servingSize: 100,
            source: SourceType.BRAND
            // Missing fields
        };
        expect(() => FoodDataSchema.parse(data)).toThrow();
    });

    it("should validate a USER food (optional metadata)", () => {
        const data = {
            name: "User Food",
            type: FoodType.SOLID,
            gramsInServing: 10,
            servingSize: 100,
            source: SourceType.USER
        };
        expect(FoodDataSchema.parse(data)).toEqual(data);
    });
});

describe("ProtocolDataSchema with Metadata", () => {
    it("should validate protocol with nested food metadata", () => {
        const data = {
            name: "Test Protocol",
            dosing_strategy: DosingStrategy.STANDARD,
            food_a: {
                type: FoodType.SOLID,
                name: "Food A",
                gramsInServing: 10,
                servingSize: 100,
                source: SourceType.GENERIC
            },
            food_a_strategy: FoodAStrategy.DILUTE_NONE,
            di_threshold: 0.5,
            table: []
        };
        expect(ProtocolDataSchema.parse(data)).toEqual(data);
    });
});

describe("MFoodSchema with Source", () => {
    it("should include source (src) field", () => {
        const data = {
            n: "Minified Food",
            t: 0, // SOLID
            p: 10,
            s: 100,
            src: 1 // BRAND
        };
        expect(MFoodSchema.parse(data)).toEqual(data);
    });
});
