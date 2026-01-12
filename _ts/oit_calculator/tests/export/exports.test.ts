import { describe, it, expect, vi, beforeAll } from 'vitest';

// Mock main before importing exports
vi.mock('../../main', () => ({
  appState: {
    pdfHandouts: ['public_terms', 'protocol']
  }
}));

import { generateAsciiContent } from '../../export/exports';
import type { ProtocolExportData } from '../../types';
import { FoodType, Method, DosingStrategy, FoodAStrategy } from '../../types';
import Decimal from 'decimal.js';
import type { Protocol } from '../../types';

// Mock build-time globals
beforeAll(() => {
  (globalThis as any).__COMMIT_HASH__ = 'test-hash';
  (globalThis as any).__VERSION_OIT_CALCULATOR__ = '0.0.0';
});

// Helper to create a minimal protocol for testing
const createMockProtocol = (name: string, foodAName: string): Protocol => ({
  dosingStrategy: DosingStrategy.STANDARD,
  foodA: {
    name: foodAName,
    type: FoodType.SOLID,
    gramsInServing: new Decimal(10),
    servingSize: new Decimal(100),
    getMgPerUnit: () => new Decimal(100)
  },
  foodAStrategy: FoodAStrategy.DILUTE_INITIAL,
  diThreshold: new Decimal(0.5),
  steps: [
    {
      stepIndex: 1,
      targetMg: new Decimal(1),
      method: Method.DILUTE,
      dailyAmount: new Decimal(1),
      dailyAmountUnit: 'ml',
      mixFoodAmount: new Decimal(1),
      mixWaterAmount: new Decimal(99),
      servings: new Decimal(100),
      food: 'A'
    },
    {
      stepIndex: 2,
      targetMg: new Decimal(100),
      method: Method.DIRECT,
      dailyAmount: new Decimal(1),
      dailyAmountUnit: 'g',
      food: 'A'
    }
  ],
  config: {} as any
});

describe('Export: ASCII Generation', () => {

  it('should format a single protocol without batch headers', () => {
    const protocol = createMockProtocol("Test Proto", "Peanut");
    const data: ProtocolExportData[] = [{
      protocol,
      customNote: "Sample Note",
      history: []
    }];

    const result = generateAsciiContent(data);

    // Should NOT contain "PROTOCOL 1"
    expect(result).not.toContain("PROTOCOL 1");
    expect(result).not.toContain("=".repeat(30));

    // Should contain food info
    expect(result).toContain("Peanut (SOLID)");
    expect(result).toContain("Protein: 10.00 g per 100 g serving.");

    // Should contain steps
    // formatAmount for ml returns integer if whole number
    expect(result).toContain("(1): 1.0 mg - 1 ml (Dilution: 1.00 g food + 99 ml water)");
    expect(result).toContain("(2): 100.0 mg - 1.00 g (Direct)");

    // Should contain notes
    expect(result).toContain("NOTES");
    expect(result).toContain("Sample Note");

    // Should contain footer
    expect(result).toContain("Tool version-hash");
  });

  it('should format multiple protocols with batch headers and separators', () => {
    const proto1 = createMockProtocol("Proto 1", "Peanut");
    const proto2 = createMockProtocol("Proto 2", "Milk");
    proto2.foodA.type = FoodType.LIQUID;

    const data: ProtocolExportData[] = [
      { protocol: proto1, customNote: "Note 1", history: [] },
      { protocol: proto2, customNote: "Note 2", history: [] }
    ];

    const result = generateAsciiContent(data);

    // Should contain batch headers
    expect(result).toContain("PROTOCOL 1");
    expect(result).toContain("PROTOCOL 2");
    expect(result).toContain("=".repeat(30));

    // Should contain specific food names
    expect(result).toContain("Peanut (SOLID)");
    expect(result).toContain("Milk (LIQUID)");

    // Should contain both notes
    expect(result).toContain("Note 1");
    expect(result).toContain("Note 2");
  });

  it('should handle transition to Food B correctly', () => {
    const protocol = createMockProtocol("Transition Proto", "Milk");
    protocol.foodB = {
      name: "Whole Milk",
      type: FoodType.LIQUID,
      gramsInServing: new Decimal(3.3),
      servingSize: new Decimal(100),
      getMgPerUnit: () => new Decimal(33)
    };
    // Add a Food B step
    protocol.steps.push({
      stepIndex: 3,
      targetMg: new Decimal(300),
      method: Method.DIRECT,
      dailyAmount: new Decimal(9.1),
      dailyAmountUnit: 'ml',
      food: 'B'
    });

    const data: ProtocolExportData[] = [{
      protocol,
      customNote: "",
      history: []
    }];

    const result = generateAsciiContent(data);

    expect(result).toContain("--- TRANSITION TO ---");
    expect(result).toContain("Whole Milk (LIQUID)");
    expect(result).toContain("(3): 300.0 mg - 9.1 ml (Direct)");
  });

  it('should return empty string for empty input', () => {
    expect(generateAsciiContent([])).toBe("");
  });
});
