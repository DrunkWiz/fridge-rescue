import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Item } from '../types.ts';
import { addDays } from './dates.ts';
import { checkShoppingList, guessCategory, itemsFromList, parseList } from './lists.ts';

const NOW = new Date(2026, 8, 23, 12);

function item(name: string, quantity = 1, days = 30, status: Item['status'] = 'active'): Item {
  return {
    id: name,
    name,
    category: 'tinned',
    shelfStable: true,
    quantity,
    addedAt: NOW.toISOString(),
    expiresAt: addDays(NOW, days).toISOString(),
    opened: false,
    status,
  };
}

describe('parseList', () => {
  it('handles bullets, checkboxes, prices and quantities', () => {
    const text = '- 2 x Milk\n[ ] eggs x6\n• Bananas £1.20\n3 tins chopped tomatoes';
    assert.deepEqual(parseList(text), [
      { name: 'Milk', quantity: 2 },
      { name: 'eggs', quantity: 6 },
      { name: 'Bananas', quantity: 1 },
      { name: 'tins chopped tomatoes', quantity: 3 },
    ]);
  });

  it('splits comma lists', () => {
    assert.deepEqual(parseList('milk, eggs, spinach').map((l) => l.name), ['milk', 'eggs', 'spinach']);
  });
});

describe('checkShoppingList', () => {
  it('finds what you already have, ignoring plurals and "tins of"', () => {
    const items = [item('Chickpeas', 3, 400), item('Chickpeas', 2, 300), item('Milk', 1, 0, 'used')];
    const [chickpeas, milk] = checkShoppingList('tins of chickpeas\nmilk', items, NOW);
    assert.equal(chickpeas.haveQuantity, 5);
    assert.equal(chickpeas.soonestDays, 300);
    assert.equal(milk.have.length, 0, 'used-up items do not count');
  });
});

describe('paste to add', () => {
  it('guesses categories, storage words first', () => {
    assert.equal(guessCategory('Chopped tomatoes (tin)'), 'tinned');
    assert.equal(guessCategory('Cherry tomatoes'), 'produce');
    assert.equal(guessCategory('Oat milk'), 'uht');
    assert.equal(guessCategory('Semi-skimmed milk'), 'dairy');
    assert.equal(guessCategory('Mystery box'), 'other');
  });

  it('builds items with the category shelf life', () => {
    const [bread] = itemsFromList('sourdough loaf');
    assert.equal(bread.name, 'Sourdough loaf');
    assert.equal(bread.category, 'bakery');
    assert.ok(bread.daysUntilExpiry > 0);
    assert.equal(itemsFromList('3 tins of black beans')[0].name, 'Black beans');
  });
});
