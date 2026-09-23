import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { CATEGORIES } from '../categories.ts';
import { sanitizeScan } from './scan.ts';

describe('sanitizeScan', () => {
  it('tidies shouty receipt names and keeps good values', () => {
    assert.deepEqual(sanitizeScan([{ name: 'ORGANIC  BANANAS', category: 'produce', quantity: 2, daysUntilExpiry: 5 }]), [
      { name: 'Organic bananas', category: 'produce', quantity: 2, daysUntilExpiry: 5 },
    ]);
  });

  it('keeps sizes and units as printed', () => {
    assert.equal(sanitizeScan([{ name: 'SEMI SKIMMED MILK 2L', category: 'dairy' }])[0].name, 'Semi skimmed milk 2L');
  });

  it('drops non-food receipt lines', () => {
    const out = sanitizeScan([{ name: 'Carrier bag' }, { name: 'SUBTOTAL' }, { name: 'Milk', category: 'dairy' }]);
    assert.deepEqual(out.map((i) => i.name), ['Milk']);
  });

  it('falls back to "other" and the category default for bad values', () => {
    const [item] = sanitizeScan([{ name: 'Mystery', category: 'spaceship', quantity: 'lots', daysUntilExpiry: null }]);
    assert.equal(item.category, 'other');
    assert.equal(item.quantity, 1);
    assert.equal(item.daysUntilExpiry, CATEGORIES.other.defaultShelfLifeDays);
  });

  it('clamps quantities and days', () => {
    const [item] = sanitizeScan([{ name: 'Eggs', category: 'dairy', quantity: 9999, daysUntilExpiry: -3 }]);
    assert.equal(item.quantity, 50);
    assert.equal(item.daysUntilExpiry, 0);
  });

  it('merges duplicate lines into one item', () => {
    const out = sanitizeScan([
      { name: 'Chopped tomatoes', category: 'tinned', quantity: 1 },
      { name: 'CHOPPED TOMATOES', category: 'tinned', quantity: 2 },
    ]);
    assert.equal(out.length, 1);
    assert.equal(out[0].quantity, 3);
  });
});
