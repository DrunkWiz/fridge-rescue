import type { Item } from '../types.ts';
import { daysSince, daysUntil } from './dates.ts';
import { lifetimeImpact } from './creature.ts';

/**
 * The game layer. Everything is derived from the item list — there is no
 * separate event log to drift out of sync — and every function takes `now`.
 */

export const XP_PER_RESCUED_UNIT = 10;
/** Donations are the rare, bigger event, so they're worth more. */
export const XP_PER_DONATED_UNIT = 25;
/** Saves (rescue or donate actions) per week that count as "goal met". */
export const WEEKLY_GOAL = 3;

export type Stage = { level: number; name: string; minXp: number };

/** Sprout visibly grows through these. Thresholds are cumulative XP. */
export const STAGES: Stage[] = [
  { level: 1, name: 'Seed', minXp: 0 },
  { level: 2, name: 'Seedling', minXp: 60 },
  { level: 3, name: 'Sapling', minXp: 180 },
  { level: 4, name: 'Blossom', minXp: 400 },
  { level: 5, name: 'Tree', minXp: 800 },
  { level: 6, name: 'Ancient Tree', minXp: 1500 },
];

export function totalXp(items: Item[]): number {
  return items.reduce((xp, item) => {
    if (item.status === 'used') return xp + item.quantity * XP_PER_RESCUED_UNIT;
    if (item.status === 'donated') return xp + item.quantity * XP_PER_DONATED_UNIT;
    return xp;
  }, 0);
}

export type Growth = {
  xp: number;
  stage: Stage;
  next: Stage | null;
  /** 0–1 progress towards the next stage (1 at max level). */
  progress: number;
};

export function growth(xp: number): Growth {
  const index = STAGES.findLastIndex((s) => xp >= s.minXp);
  const stage = STAGES[index];
  const next = STAGES[index + 1] ?? null;
  const progress = next ? (xp - stage.minXp) / (next.minXp - stage.minXp) : 1;
  return { xp, stage, next, progress };
}

/** The day food last went to waste: binned, or a perishable left past its date. */
function lastWasteDay(items: Item[], now: Date): string | null {
  const dates = [
    ...items.filter((i) => i.status === 'wasted' && i.resolvedAt).map((i) => i.resolvedAt!),
    ...items.filter((i) => i.status === 'active' && !i.shelfStable && daysUntil(i.expiresAt, now) < 0).map((i) => i.expiresAt),
  ];
  return dates.length ? dates.reduce((a, b) => (a > b ? a : b)) : null;
}

/**
 * Days in a row without wasting food, counted from the last waste or from when
 * the user started (`startedAt`) — whichever is later, so backdated items
 * can't hand out a streak you didn't earn. Leaving food to expire breaks it too.
 */
export function wasteFreeStreak(items: Item[], now: Date, startedAt?: string | null): number {
  if (items.length === 0) return 0;
  const firstAdded = items.reduce((a, b) => (a.addedAt < b.addedAt ? a : b)).addedAt;
  const start = startedAt && startedAt > firstAdded ? startedAt : firstAdded;
  const lastWaste = lastWasteDay(items, now);
  return Math.max(0, daysSince(lastWaste && lastWaste > start ? lastWaste : start, now));
}

/** Monday 00:00 local of the week containing `date`. */
function weekStart(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

function savesInWeek(items: Item[], start: Date): number {
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return items.filter((i) => {
    if ((i.status !== 'used' && i.status !== 'donated') || !i.resolvedAt) return false;
    const t = new Date(i.resolvedAt);
    return t >= start && t < end;
  }).length;
}

export function savesThisWeek(items: Item[], now: Date): number {
  return savesInWeek(items, weekStart(now));
}

/**
 * Consecutive weeks meeting WEEKLY_GOAL. This week counts once it's met; until
 * then the streak is still alive from last week (you have till Sunday).
 */
export function weeklyGoalStreak(items: Item[], now: Date): number {
  let start = weekStart(now);
  let streak = savesInWeek(items, start) >= WEEKLY_GOAL ? 1 : 0;
  for (let i = 0; i < 520; i++) {
    start = new Date(start.getFullYear(), start.getMonth(), start.getDate() - 7);
    if (savesInWeek(items, start) < WEEKLY_GOAL) break;
    streak++;
  }
  return streak;
}

export type AccessoryId = 'cap' | 'scarf' | 'flower' | 'crown' | 'sunglasses' | 'tophat' | 'bow' | 'star' | 'headphones' | 'butterfly';
export type Slot = 'head' | 'face' | 'neck' | 'float';

export type Accessory = { id: AccessoryId; emoji: string; name: string; slot: Slot; proOnly?: boolean };

export const ACCESSORIES: Record<AccessoryId, Accessory> = {
  cap: { id: 'cap', emoji: '🧢', name: 'Cap', slot: 'head' },
  scarf: { id: 'scarf', emoji: '🧣', name: 'Scarf', slot: 'neck' },
  flower: { id: 'flower', emoji: '🌸', name: 'Flower', slot: 'float' },
  crown: { id: 'crown', emoji: '👑', name: 'Crown', slot: 'head' },
  sunglasses: { id: 'sunglasses', emoji: '🕶️', name: 'Sunglasses', slot: 'face' },
  tophat: { id: 'tophat', emoji: '🎩', name: 'Top hat', slot: 'head' },
  bow: { id: 'bow', emoji: '🎀', name: 'Bow', slot: 'neck' },
  star: { id: 'star', emoji: '⭐', name: 'Star', slot: 'float' },
  headphones: { id: 'headphones', emoji: '🎧', name: 'Headphones', slot: 'head', proOnly: true },
  butterfly: { id: 'butterfly', emoji: '🦋', name: 'Butterfly', slot: 'float', proOnly: true },
};

export type BadgeId =
  | 'first-rescue'
  | 'first-donation'
  | 'ten-meals-rescued'
  | 'ten-meals-donated'
  | 'waste-free-week'
  | 'waste-free-month'
  | 'hat-trick'
  | 'big-box';

export type Badge = { id: BadgeId; title: string; description: string; reward: AccessoryId };

type Stats = {
  rescues: number;
  donations: number;
  mealsRescued: number;
  mealsDonated: number;
  streak: number;
  weeklyStreak: number;
  biggestDropOff: number;
};

function stats(items: Item[], now: Date, startedAt?: string | null): Stats {
  const impact = lifetimeImpact(items);
  // A drop-off is every item donated to the same place at the same moment.
  const dropOffs = new Map<string, number>();
  for (const i of items) {
    if (i.status !== 'donated' || !i.resolvedAt) continue;
    const key = `${i.resolvedAt}|${i.donatedTo ?? ''}`;
    dropOffs.set(key, (dropOffs.get(key) ?? 0) + i.quantity);
  }
  return {
    rescues: items.filter((i) => i.status === 'used').length,
    donations: items.filter((i) => i.status === 'donated').length,
    mealsRescued: impact.mealsRescued,
    mealsDonated: impact.mealsDonated,
    streak: wasteFreeStreak(items, now, startedAt),
    weeklyStreak: weeklyGoalStreak(items, now),
    biggestDropOff: Math.max(0, ...dropOffs.values()),
  };
}

/** Each badge unlocks an accessory — cosmetics you earn rather than buy. */
export const BADGES: (Badge & { earned: (s: Stats) => boolean })[] = [
  { id: 'first-rescue', title: 'First rescue', description: 'Cook something before it expires', reward: 'cap', earned: (s) => s.rescues >= 1 },
  { id: 'first-donation', title: 'Good neighbour', description: 'Donate surplus food', reward: 'scarf', earned: (s) => s.donations >= 1 },
  { id: 'ten-meals-rescued', title: 'Home chef', description: 'Rescue 10 meals', reward: 'flower', earned: (s) => s.mealsRescued >= 10 },
  { id: 'ten-meals-donated', title: 'Food bank friend', description: 'Donate 10 meals', reward: 'crown', earned: (s) => s.mealsDonated >= 10 },
  { id: 'waste-free-week', title: 'Waste-free week', description: '7 days without wasting food', reward: 'sunglasses', earned: (s) => s.streak >= 7 },
  { id: 'waste-free-month', title: 'Waste-free month', description: '30 days without wasting food', reward: 'tophat', earned: (s) => s.streak >= 30 },
  { id: 'hat-trick', title: 'Hat-trick', description: `Hit the weekly goal 3 weeks running`, reward: 'bow', earned: (s) => s.weeklyStreak >= 3 },
  { id: 'big-box', title: 'Big box', description: 'Drop off 10+ items at once', reward: 'star', earned: (s) => s.biggestDropOff >= 10 },
];

export function earnedBadges(items: Item[], now: Date, startedAt?: string | null): BadgeId[] {
  const s = stats(items, now, startedAt);
  return BADGES.filter((b) => b.earned(s)).map((b) => b.id);
}

export function unlockedAccessories(badges: BadgeId[], isPro: boolean): AccessoryId[] {
  const fromBadges = BADGES.filter((b) => badges.includes(b.id)).map((b) => b.reward);
  const fromPro = isPro ? (Object.values(ACCESSORIES).filter((a) => a.proOnly).map((a) => a.id) as AccessoryId[]) : [];
  return [...fromBadges, ...fromPro];
}

export type Snapshot = { xp: number; level: number; badges: BadgeId[] };

export function snapshot(items: Item[], now: Date, startedAt?: string | null): Snapshot {
  const xp = totalXp(items);
  return { xp, level: growth(xp).stage.level, badges: earnedBadges(items, now, startedAt) };
}

export type Celebration = {
  xpGained: number;
  levelUp: Stage | null;
  newBadges: Badge[];
};

/** What just changed, for the celebration after an action. Null if nothing worth celebrating. */
export function diffProgress(before: Snapshot, after: Snapshot): Celebration | null {
  const xpGained = after.xp - before.xp;
  const levelUp = after.level > before.level ? STAGES[after.level - 1] : null;
  const newBadges = BADGES.filter((b) => after.badges.includes(b.id) && !before.badges.includes(b.id));
  if (xpGained <= 0 && !levelUp && newBadges.length === 0) return null;
  return { xpGained, levelUp, newBadges };
}
