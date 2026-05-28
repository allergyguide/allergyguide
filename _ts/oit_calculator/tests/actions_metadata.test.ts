import { beforeEach, describe, expect, it } from "vitest";
import { workspace } from "../state/instances";
import { DosingStrategy, FoodAStrategy, FoodType, SourceType } from "../types";
import { selectCustomFood, selectFoodA, selectFoodB, selectProtocol } from "../ui/actions";

describe("UI Actions with Metadata", () => {
    beforeEach(() => {
        workspace.getActive().setProtocol(null, "Reset");
    });

    it("selectFoodA should retain metadata", () => {
        const mockFoodData = {
            name: "Test Food",
            type: FoodType.SOLID,
            gramsInServing: 10,
            servingSize: 100,
            source: SourceType.BRAND,
            id: "brand-123",
            source_url: "https://example.com"
        };
        selectFoodA(mockFoodData as any);
        const food = workspace.getActive().getProtocol()?.foodA;
        expect(food?.source).toBe(SourceType.BRAND);
        expect(food?.id).toBe("brand-123");
        expect(food?.source_url).toBe("https://example.com");
    });

    it("selectFoodB should retain metadata", () => {
        // First select Food A
        selectFoodA({
            name: "A", type: FoodType.SOLID, gramsInServing: 1, servingSize: 1, source: SourceType.GENERIC
        } as any);

        const mockFoodData = {
            name: "Test Food B",
            type: FoodType.SOLID,
            gramsInServing: 20,
            servingSize: 100,
            source: SourceType.BRAND,
            id: "brand-456",
            source_url: "https://example.com/b"
        };
        selectFoodB(mockFoodData as any);
        const foodB = workspace.getActive().getProtocol()?.foodB;
        expect(foodB?.source).toBe(SourceType.BRAND);
        expect(foodB?.id).toBe("brand-456");
        expect(foodB?.source_url).toBe("https://example.com/b");
    });

    it("selectCustomFood should use USER source", () => {
        selectCustomFood("My Custom", "food-a-search");
        const food = workspace.getActive().getProtocol()?.foodA;
        expect(food?.source).toBe(SourceType.USER);
    });

    it("selectProtocol should retain food metadata", () => {
        const mockProtocolData = {
            name: "Mock Protocol",
            dosing_strategy: DosingStrategy.STANDARD,
            food_a: {
                name: "Food A",
                type: FoodType.SOLID,
                gramsInServing: 10,
                servingSize: 100,
                source: SourceType.GENERIC
            },
            food_a_strategy: FoodAStrategy.DILUTE_NONE,
            di_threshold: 0.5,
            table: []
        };
        selectProtocol(mockProtocolData as any);
        const p = workspace.getActive().getProtocol();
        expect(p?.foodA.source).toBe(SourceType.GENERIC);
    });
});
