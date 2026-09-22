import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Item } from '../types.ts';
import { addDays } from './dates.ts';
import {
  diffProgress,
  earnedBadges,
  growth,
  savesThisWeek,
  snapshot,
  STAGES,
  totalXp,
  unlockedAccessories,
  wasteFreeStreak,
  WEEKLY_GOAL,
  weeklyGoalStreak,
  XP_PER_DONATED_UNIT,
  XP_PER_RESCUED_UNIT,
} from './progress.ts';

// Wednesday 23 Sep 2026, midday
const NOW = new Date(2026, 8, 23, 12, 0, 0);
const at = (days: number) => addDays(NOW, days).toISOString();

let nextId = 0;
function item(overrides: Partial<Item>): Item {
  return {
    id: String(nextId++),
    name: 'Spinach',
    category: 'produce',
    shelfStable: false,
    quantity: 1,
    addedAt: at(-1),
    expiresAt: at(3),
    opened: false,
    status: 'active',
    ...overrides,
  };
}
const rescued = (daysAgo: number, extra: Partial<Item> = {}) => item({ status: 'used', resolvedAt: at(-daysAgo), ...extra });
const donated = (daysAgo: number, extra: Partial<Item> = {}) =>
  item({ status: 'donated', resolvedAt: at(-daysAgo), shelfStable: true, category: 'tinned', ...extra });
const binned = (daysAgo: number) => item({ status: 'wasted', resolvedAt: at(-daysAgo) });

describe('XP and growth', () => {
  it('weights donations above rescues and ignores waste', () => {
    const xp = totalXp([rescued(1, { quantity: 2 }), donated(1, { quantity: 3 }), binned(1), item({})]);
    assert.equal(xp, 2 * XP_PER_RESCUED_UNIT + 3 * XP_PER_DONATED_UNIT);
  });

  it('reports stage and progress towards the next one', () => {
    const g = growth(STAGES[1].minXp + (STAGES[2].minXp - STAGES[1].minXp) / 2);
    assert.equal(g.stage.name, STAGES[1].name);
    assert.equal(g.next?.name, STAGES[2].name);
    assert.equal(g.progress, 0.5);
  });

  it('caps at the final stage', () => {
    const g = growth(1_000_000);
    assert.equal(g.stage.level, STAGES.length);
    assert.equal(g.next, null);
    assert.equal(g.progress, 1);
  });
});

describe('wasteFreeStreak', () => {
  it('counts from the first item when nothing was ever wasted', () => {
    assert.equal(wasteFreeStreak([item({ addedAt: at(-12) })], NOW), 12);
  });

  it('resets on binned food', () => {
    assert.equal(wasteFreeStreak([item({ addedAt: at(-40) }), binned(4)], NOW), 4);
  });

  it('also resets when a perishable is left past its date', () => {
    assert.equal(wasteFreeStreak([item({ addedAt: at(-40), expiresAt: at(-2) })], NOW), 2);
  });

  it('is zero for a brand-new user', () => {
    assert.equal(wasteFreeStreak([], NOW), 0);
  });
});

describe('weekly goal', () => {
  it('counts saves since Monday only', () => {
    // NOW is Wednesday: 1 and 2 days ago are this week, 3 days ago is last Sunday.
    assert.equal(savesThisWeek([rescued(1), donated(2), rescued(3)], NOW), 2);
  });

  it('keeps last week’s streak alive until this week is over', () => {
    const lastWeek = Array.from({ length: WEEKLY_GOAL }, () => rescued(5));
    const weekBefore = Array.from({ length: WEEKLY_GOAL }, () => rescued(12));
    assert.equal(weeklyGoalStreak([...lastWeek, ...weekBefore], NOW), 2);
  });

  it('adds this week once the goal is met', () => {
    const thisWeek = Array.from({ length: WEEKLY_GOAL }, () => rescued(1));
    const lastWeek = Array.from({ length: WEEKLY_GOAL }, () => rescued(5));
    assert.equal(weeklyGoalStreak([...thisWeek, ...lastWeek], NOW), 2);
  });

  it('breaks on a missed week', () => {
    const twoWeeksAgo = Array.from({ length: WEEKLY_GOAL }, () => rescued(12));
    assert.equal(weeklyGoalStreak(twoWeeksAgo, NOW), 0);
  });
});

describe('badges and rewards', () => {
  it('awards first rescue and first donation', () => {
    const badges = earnedBadges([item({ addedAt: at(-1) }), rescued(0), donated(0)], NOW);
    assert.ok(badges.includes('first-rescue'));
    assert.ok(badges.includes('first-donation'));
    assert.ok(!badges.includes('waste-free-week'));
  });

  it('counts one drop-off as everything donated to the same place at the same moment', () => {
    const moment = at(-1);
    const box = [donated(1, { quantity: 6, resolvedAt: moment, donatedTo: 'Pantry' }), donated(1, { quantity: 4, resolvedAt: moment, donatedTo: 'Pantry' })];
    assert.ok(earnedBadges(box, NOW).includes('big-box'));
  });

  it('unlocks one accessory per badge, plus Pro-only ones for Pro', () => {
    assert.deepEqual(unlockedAccessories(['first-rescue'], false), ['cap']);
    const pro = unlockedAccessories(['first-rescue'], true);
    assert.ok(pro.includes('headphones') && pro.includes('butterfly'));
  });
});

describe('diffProgress', () => {
  it('reports XP, level-ups and new badges from an action', () => {
    const before = snapshot([item({ addedAt: at(-1) })], NOW);
    const after = snapshot([item({ addedAt: at(-1) }), donated(0, { quantity: 3 })], NOW);
    const c = diffProgress(before, after);
    assert.equal(c?.xpGained, 3 * XP_PER_DONATED_UNIT);
    assert.equal(c?.levelUp?.name, 'Seedling');
    assert.deepEqual(c?.newBadges.map((b) => b.id), ['first-donation']);
  });

  it('returns null when nothing changed', () => {
    const s = snapshot([], NOW);
    assert.equal(diffProgress(s, s), null);
  });
});
