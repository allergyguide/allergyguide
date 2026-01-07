import { describe, it, expect } from 'vitest';
import { performSearch } from '../../core/search';
import fuzzysort from 'fuzzysort';

describe('Core: Search', () => {
  // Helper to prepare data
  const prepare = (list: any[], key: string) => {
    return list.map(item => ({
      ...item,
      prepared: fuzzysort.prepare(item[key])
    }));
  };

  const foods = [
    { Food: 'Peanut', Type: 'SOLID' },
    { Food: 'Milk', Type: 'LIQUID' },
    { Food: 'Egg', Type: 'SOLID' }
  ];

  const protocols = [
    { name: 'Peanut Standard', food_a: { name: 'Peanut' } },
    { name: 'Milk Slow', food_a: { name: 'Milk' } }
  ];

  const preparedFoods = prepare(foods, 'Food');
  const preparedProtocols = prepare(protocols, 'name');

  it('should find foods matching query', () => {
    const results = performSearch('Pea', 'food', preparedFoods, preparedProtocols);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].obj.Food).toBe('Peanut');
  });

  it('should find protocols matching query', () => {
    const results = performSearch('Stand', 'protocol', preparedFoods, preparedProtocols);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].obj.name).toBe('Peanut Standard');
  });

  it('should combine results for protocol search type', () => {
    // "Milk" matches both food and protocol
    const results = performSearch('Milk', 'protocol', preparedFoods, preparedProtocols);

    const hasFood = results.some(r => r.obj.Food === 'Milk');
    const hasProtocol = results.some(r => r.obj.name === 'Milk Slow');

    expect(hasFood).toBe(true);
    expect(hasProtocol).toBe(true);
  });

  it('should return empty array for empty query', () => {
    const results = performSearch('   ', 'food', preparedFoods, preparedProtocols);
    expect(results).toEqual([]);
  });
});
