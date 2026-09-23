import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Item } from '../types.ts';
import { moneySaved, moneyWasted, UNIT_VALUE } from './money.ts';

const base: Item = {
  id: '1',
  name: 'Chicken',
  category: 'meat',
  shelfStable: false,
  quantity: 2,
  addedAt: '2026-09-20T12:00:00.000Z',
  expiresAt: '2026-09-25T12:00:00.000Z',
  opened: false,
  status: 'active',
};

describe('moneySaved', () => {
  it('counts eaten, donated and frozen food once each', () => {
    const items: Item[] = [
      { ...base, status: 'used' },
      { ...base, id: '2', category: 'tinned', quantity: 3, status: 'donated' },
      { ...base, id: '3', frozenAt: '2026-09-22T12:00:00.000Z' },
      { ...base, id: '4', frozenAt: '2026-09-22T12:00:00.000Z', status: 'used' },
      { ...base, id: '5' },
    ];
    const expected = 2 * UNIT_VALUE.meat + 3 * UNIT_VALUE.tinned + 2 * UNIT_VALUE.meat + 2 * UNIT_VALUE.meat;
    assert.equal(moneySaved(items), Math.round(expected));
  });

  it('tracks waste separately', () => {
    assert.equal(moneyWasted([{ ...base, status: 'wasted' }]), 2 * UNIT_VALUE.meat);
    assert.equal(moneySaved([{ ...base, status: 'wasted' }]), 0);
  });
});
