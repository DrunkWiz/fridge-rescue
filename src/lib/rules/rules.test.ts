import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Item } from '../types.ts';
import { creatureMood } from './creature.ts';
import { addDays } from './dates.ts';
import {
  DONATION_MIN_DAYS_TO_EXPIRY,
  estimateMeals,
  findDonationCandidates,
  STALE_AFTER_DAYS,
} from './surplus.ts';
import { historyToCsv, monthlyHistory } from './impact.ts';
import { findRescueCandidates, RESCUE_WINDOW_DAYS } from './urgency.ts';

const NOW = new Date(2026, 8, 23, 12, 0, 0);
const inDays = (d: number) => addDays(NOW, d).toISOString();

let nextId = 0;
function item(overrides: Partial<Item>): Item {
  return {
    id: String(nextId++),
    name: 'Chickpeas',
    category: 'tinned',
    shelfStable: true,
    quantity: 1,
    addedAt: inDays(-1),
    expiresAt: inDays(400),
    opened: false,
    status: 'active',
    ...overrides,
  };
}

describe('findDonationCandidates', () => {
  it('flags long-dated shelf-stable food held in quantity', () => {
    const [c] = findDonationCandidates([item({ quantity: 5 })], NOW);
    assert.deepEqual(c.reasons, ['quantity']);
    assert.equal(c.suggestedQuantity, 3);
  });

  it('never suggests donating perishables, however much you have', () => {
    const yoghurt = item({ name: 'Yoghurt', category: 'dairy', shelfStable: false, quantity: 6, expiresAt: inDays(2) });
    assert.equal(findDonationCandidates([yoghurt], NOW).length, 0);
  });

  it('rejects shelf-stable food too close to expiry for a food bank', () => {
    const shortDated = item({ quantity: 6, expiresAt: inDays(DONATION_MIN_DAYS_TO_EXPIRY) });
    assert.equal(findDonationCandidates([shortDated], NOW).length, 0);
    const justOver = item({ quantity: 6, expiresAt: inDays(DONATION_MIN_DAYS_TO_EXPIRY + 1) });
    assert.equal(findDonationCandidates([justOver], NOW).length, 1);
  });

  it('rejects opened packets', () => {
    assert.equal(findDonationCandidates([item({ quantity: 6, opened: true })], NOW).length, 0);
  });

  it('requires a surplus signal — one fresh tin is not surplus', () => {
    assert.equal(findDonationCandidates([item({})], NOW).length, 0);
  });

  it('flags stale items as a whole', () => {
    const [c] = findDonationCandidates([item({ quantity: 2, addedAt: inDays(-(STALE_AFTER_DAYS + 1)) })], NOW);
    assert.deepEqual(c.reasons, ['stale']);
    assert.equal(c.suggestedQuantity, 2);
  });

  it('flags the newer entry of a duplicate, not the original', () => {
    const original = item({ name: 'Pasta', category: 'dried', addedAt: inDays(-10) });
    const dupe = item({ name: '  pasta ', category: 'dried', addedAt: inDays(-2) });
    const candidates = findDonationCandidates([dupe, original], NOW);
    assert.deepEqual(candidates.map((c) => c.item.id), [dupe.id]);
    assert.deepEqual(candidates[0].reasons, ['duplicate']);
  });

  it('ignores items that are already resolved', () => {
    assert.equal(findDonationCandidates([item({ quantity: 6, status: 'donated' })], NOW).length, 0);
  });
});

describe('estimateMeals', () => {
  it('matches the "7 items is about 5 meals" copy', () => {
    assert.equal(estimateMeals(7), 5);
  });
});

describe('findRescueCandidates', () => {
  const perishable = (days: number) =>
    item({ name: `milk ${days}`, category: 'dairy', shelfStable: false, expiresAt: inDays(days) });

  it('returns perishables inside the rescue window, soonest first', () => {
    const result = findRescueCandidates([perishable(RESCUE_WINDOW_DAYS), perishable(0), perishable(10)], NOW);
    assert.deepEqual(result.map((i) => i.name), ['milk 0', `milk ${RESCUE_WINDOW_DAYS}`]);
  });

  it('excludes food that has already expired', () => {
    assert.equal(findRescueCandidates([perishable(-1)], NOW).length, 0);
  });

  it('excludes shelf-stable food even when short-dated', () => {
    assert.equal(findRescueCandidates([item({ expiresAt: inDays(1) })], NOW).length, 0);
  });
});

describe('creatureMood', () => {
  const resolved = (status: Item['status'], daysAgo: number) =>
    item({ shelfStable: false, category: 'produce', status, resolvedAt: inDays(-daysAgo) });

  it('is content with an empty fridge', () => {
    assert.equal(creatureMood([], NOW), 'content');
  });

  it('gets hungry when something needs rescuing', () => {
    const urgent = item({ category: 'dairy', shelfStable: false, expiresAt: inDays(1) });
    assert.equal(creatureMood([urgent], NOW), 'hungry');
  });

  it('thrives after several rescues', () => {
    assert.equal(creatureMood([resolved('used', 1), resolved('used', 2), resolved('used', 3)], NOW), 'thriving');
  });

  it('wilts when waste outpaces rescues', () => {
    assert.equal(creatureMood([resolved('wasted', 1), resolved('wasted', 2), resolved('used', 1)], NOW), 'wilting');
  });

  it('celebrates a recent donation above everything else', () => {
    assert.equal(creatureMood([resolved('wasted', 1), resolved('donated', 1)], NOW), 'celebrating');
  });

  it('stops celebrating once the donation is old news', () => {
    assert.equal(creatureMood([resolved('donated', 5)], NOW), 'content');
  });
});

describe('impact history', () => {
  const done = (name: string, status: Item['status'], resolvedAt: Date, extra: Partial<Item> = {}) =>
    item({ name, status, resolvedAt: resolvedAt.toISOString(), ...extra });

  it('groups resolved items by month, newest first, counting units', () => {
    const history = monthlyHistory([
      done('Beans', 'donated', new Date(2026, 8, 20), { quantity: 3 }),
      done('Milk', 'used', new Date(2026, 8, 2)),
      done('Bread', 'wasted', new Date(2026, 7, 30)),
      item({ name: 'Still in the fridge' }),
    ]);
    assert.deepEqual(
      history.map((m) => [m.month, m.rescued, m.donated, m.wasted]),
      [
        ['2026-09', 1, 3, 0],
        ['2026-08', 0, 0, 1],
      ],
    );
  });

  it('exports CSV with escaping and the drop-off name', () => {
    const csv = historyToCsv([done('Beans, butter', 'donated', new Date(2026, 8, 20), { donatedTo: 'The "Pantry"' })]);
    assert.equal(csv.split('\n')[1], '2026-09-20,"Beans, butter",tinned,1,donated,"The ""Pantry"""');
  });
});
