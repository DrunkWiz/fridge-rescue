import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Item } from '../types.ts';
import { addDays } from './dates.ts';
import {
  challengeSeeds,
  currentChallenge,
  dailyStars,
  dayKey,
  diffProgress,
  inSeason,
  recapText,
  shopStock,
  weeklyRecap,
  earnedBadges,
  growth,
  seedsEarned,
  seedsSpent,
  snapshot,
  STAGES,
  totalXp,
  unlockedAccessories,
  wasteFreeStreak,
  XP_PER_DONATED_UNIT,
  XP_PER_FROZEN_UNIT,
  EXPIRED_GRACE_DAYS,
  awaitingAnswer,
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

  it('asks before counting expired food as waste', () => {
    const justExpired = item({ addedAt: at(-40), expiresAt: at(-EXPIRED_GRACE_DAYS) });
    assert.equal(wasteFreeStreak([justExpired], NOW), 40);
    assert.deepEqual(awaitingAnswer([justExpired], NOW).map((i) => i.id), [justExpired.id]);
  });

  it('counts it as waste once the grace period passes unanswered', () => {
    const days = EXPIRED_GRACE_DAYS + 2;
    assert.equal(wasteFreeStreak([item({ addedAt: at(-40), expiresAt: at(-days) })], NOW), days);
  });

  it('is zero for a brand-new user', () => {
    assert.equal(wasteFreeStreak([], NOW), 0);
  });
});

describe('freezing', () => {
  it('earns a little XP and counts as a save for the day', () => {
    const frozen = item({ frozenAt: at(0), expiresAt: at(60) });
    assert.equal(totalXp([frozen]), XP_PER_FROZEN_UNIT);
    assert.equal(dailyStars([frozen], [], NOW, 1)[0].stars, 2);
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

describe('wasteFreeStreak with a start date', () => {
  it('never counts from before the user started, even with backdated items', () => {
    assert.equal(wasteFreeStreak([item({ addedAt: at(-45) })], NOW, at(-2)), 2);
  });

  it('still resets on waste after the start date', () => {
    assert.equal(wasteFreeStreak([item({ addedAt: at(-45) }), binned(1)], NOW, at(-5)), 1);
  });
});

describe('seeds and daily stars', () => {
  it('earns seeds from saves, check-ins and badges; spends them in the shop', () => {
    const items = [rescued(1, { quantity: 2 }), donated(1)];
    assert.equal(seedsEarned(items, ['first-rescue'], ['2026-09-22', '2026-09-22', '2026-09-23']), 2 * 2 + 5 + 2 + 10);
    assert.equal(seedsSpent(['heart', 'cap']), 15);
  });

  it('only counts bought items that are actually for sale', () => {
    assert.deepEqual(unlockedAccessories([], false, ['heart', 'crown']), ['heart']);
  });

  it('gives one star for a check-in and two for a day with a save', () => {
    const stars = dailyStars([rescued(0)], [dayKey(addDays(NOW, -1))], NOW, 3).map((d) => d.stars);
    assert.deepEqual(stars, [0, 1, 2]);
  });
});

describe('weekly challenges', () => {
  it('rotates weekly and is the same for everyone', () => {
    const a = currentChallenge([], NOW).challenge.id;
    const nextWeek = currentChallenge([], addDays(NOW, 7)).challenge.id;
    assert.notEqual(a, nextWeek);
    assert.equal(currentChallenge([], addDays(NOW, 1)).challenge.id, a);
  });

  it('tracks progress from this week and pays out once complete', () => {
    const c = currentChallenge([], NOW).challenge;
    // Build items that satisfy whatever this week's challenge is.
    const fit = (i: number): Item =>
      c.id === 'box-it'
        ? donated(0)
        : rescued(0, { category: c.id === 'dairy-duo' ? 'dairy' : c.id === 'protein' ? 'meat' : c.id === 'leftover-legend' ? 'leftovers' : 'produce', name: `x${i}` });
    const items = Array.from({ length: c.goal }, (_, i) => fit(i));
    assert.equal(currentChallenge(items, NOW).done, true);
    assert.equal(challengeSeeds(items, NOW, at(-1)), c.reward);
    assert.equal(challengeSeeds(items, NOW, null), 0);
  });
});

describe('seasonal shop', () => {
  it('sells seasonal items only in their window, including across the new year', () => {
    assert.ok(shopStock(new Date(2026, 8, 23)).some((a) => a.id === 'pumpkin'));
    assert.ok(!shopStock(new Date(2026, 5, 1)).some((a) => a.id === 'pumpkin'));
    assert.ok(inSeason({ name: 'winter', from: '12-20', to: '01-05' }, new Date(2027, 0, 2)));
    assert.ok(!inSeason({ name: 'winter', from: '12-20', to: '01-05' }, new Date(2027, 1, 2)));
  });
});

describe('weekly recap', () => {
  it('counts the last 7 days and stays kind', () => {
    const recap = weeklyRecap([rescued(1, { quantity: 2 }), donated(3), binned(2), rescued(9)], NOW);
    assert.deepEqual(recap, { rescued: 2, donated: 1, frozen: 0, wasted: 1 });
    assert.match(recapText(recap, 'pip'), /2 rescued, 1 donated, 1 binned\. more saved than binned/);
    assert.match(recapText({ rescued: 0, donated: 0, frozen: 0, wasted: 0 }, 'pip'), /quiet week/);
  });
});
