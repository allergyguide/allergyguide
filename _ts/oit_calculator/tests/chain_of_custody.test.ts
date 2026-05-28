import Decimal from "decimal.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FoodType, SourceType } from "../types";
import { handleFoodANameChange, handleFoodAProteinChange, handleFoodAServingSizeChange } from "../ui/actions/settingsActions";

describe("Chain of Custody Logic", () => {
    let mockProtocol: any;
    let mockState: any;

    beforeEach(() => {
        mockProtocol = {
            foodA: {
                name: "Brand Peanut",
                type: FoodType.SOLID,
                gramsInServing: new Decimal(10),
                servingSize: new Decimal(100),
                source: SourceType.BRAND,
                id: "brand-123",
                source_url: "https://example.com",
                last_updated: "2024-05-24T00:00:00Z"
            },
            steps: []
        };

        mockState = {
            getProtocol: () => mockProtocol,
            setProtocol: vi.fn((p) => { mockProtocol = p; })
        };
    });

    it("should flip to USER and strip metadata when name is meaningfully changed", () => {
        handleFoodANameChange(mockState, "New Name");
        const food = mockProtocol.foodA;
        expect(food.source).toBe(SourceType.USER);
        expect(food.id).toBeUndefined();
        expect(food.source_url).toBeUndefined();
    });

    it("should NOT flip to USER when name change is just whitespace", () => {
        handleFoodANameChange(mockState, " Brand Peanut ");
        const food = mockProtocol.foodA;
        expect(food.source).toBe(SourceType.BRAND);
        expect(food.id).toBe("brand-123");
    });

    it("should flip to USER and strip metadata when protein is changed", () => {
        handleFoodAProteinChange(mockState, "11");
        const food = mockProtocol.foodA;
        expect(food.source).toBe(SourceType.USER);
        expect(food.id).toBeUndefined();
    });

    it("should NOT flip to USER when protein change is mathematically equivalent", () => {
        handleFoodAProteinChange(mockState, "10.00");
        const food = mockProtocol.foodA;
        expect(food.source).toBe(SourceType.BRAND);
        expect(food.id).toBe("brand-123");
    });

    it("should flip to USER and strip metadata when serving size is changed", () => {
        handleFoodAServingSizeChange(mockState, "101");
        const food = mockProtocol.foodA;
        expect(food.source).toBe(SourceType.USER);
        expect(food.id).toBeUndefined();
    });
});
