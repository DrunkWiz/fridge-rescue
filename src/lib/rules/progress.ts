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
/** Freezing is a smaller save than eating it, but still a save. */
export const XP_PER_FROZEN_UNIT = 5;
/**
 * A perishable past its date isn't counted as waste straight away: the app asks
 * "did you eat it?" first, and only counts it after this many days unanswered.
 */
export const EXPIRED_GRACE_DAYS = 2;

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
    const frozen = item.frozenAt ? item.quantity * XP_PER_FROZEN_UNIT : 0;
    if (item.status === 'used') return xp + frozen + item.quantity * XP_PER_RESCUED_UNIT;
    if (item.status === 'donated') return xp + frozen + item.quantity * XP_PER_DONATED_UNIT;
    return xp + frozen;
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

/** Perishables past their date that the user hasn't said "ate it" or "binned it" about yet. */
export function awaitingAnswer(items: Item[], now: Date): Item[] {
  return items.filter((i) => i.status === 'active' && !i.shelfStable && daysUntil(i.expiresAt, now) < 0);
}

/** The day food last went to waste: binned, or a perishable left unanswered past the grace period. */
function lastWasteDay(items: Item[], now: Date): string | null {
  const dates = [
    ...items.filter((i) => i.status === 'wasted' && i.resolvedAt).map((i) => i.resolvedAt!),
    ...awaitingAnswer(items, now)
      .filter((i) => daysUntil(i.expiresAt, now) < -EXPIRED_GRACE_DAYS)
      .map((i) => i.expiresAt),
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


export type AccessoryId =
  | 'cap' | 'scarf' | 'flower' | 'crown' | 'sunglasses' | 'tophat' | 'bow' | 'star'
  | 'headphones' | 'butterfly'
  | 'beanie' | 'partyhat' | 'glasses' | 'heart' | 'bandana'
  | 'pumpkin' | 'santa'
  | 'chefhat' | 'strawhat' | 'flowercrown'
  | 'monocle' | 'heartglasses' | 'mustache'
  | 'apron' | 'tie' | 'pearls'
  | 'balloon' | 'note' | 'bee'
  | 'chick' | 'snail' | 'ladybug' | 'cat'
  | 'meadow' | 'kitchen' | 'beach' | 'sunset' | 'night' | 'autumn' | 'snowfall'
  | 'trex' | 'frog' | 'penguin' | 'strawberry' | 'avocado' | 'astronaut';
export type Slot = 'outfit' | 'head' | 'face' | 'neck' | 'float' | 'pal' | 'backdrop';

/** Wardrobe and shop groups, in display order. Sprout wears at most one item per slot; a full outfit covers hats, face and neck items. */
export const SLOTS: { slot: Slot; title: string }[] = [
  { slot: 'outfit', title: '🦖 full outfits' },
  { slot: 'head', title: '🎩 hats' },
  { slot: 'face', title: '👓 face' },
  { slot: 'neck', title: '🧣 neck' },
  { slot: 'float', title: '✨ floating' },
  { slot: 'pal', title: '🐾 pals' },
  { slot: 'backdrop', title: '🖼 backdrops' },
];

/** Limited-time shop stock, as inclusive MM-DD dates (may wrap the new year). */
export type Season = { name: string; from: string; to: string };

/** How you get it: a badge reward, Pro, or bought in the shop with seeds (some only in season). */
export type Accessory = { id: AccessoryId; emoji: string; name: string; slot: Slot; proOnly?: boolean; price?: number; season?: Season };

const HARVEST: Season = { name: 'harvest season', from: '09-15', to: '11-01' };
const DECEMBER: Season = { name: 'december', from: '12-01', to: '12-31' };

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
  heart: { id: 'heart', emoji: '❤️', name: 'Heart', slot: 'float', price: 15 },
  beanie: { id: 'beanie', emoji: '🧶', name: 'Beanie', slot: 'head', price: 20 },
  bandana: { id: 'bandana', emoji: '🟥', name: 'Bandana', slot: 'neck', price: 20 },
  glasses: { id: 'glasses', emoji: '👓', name: 'Glasses', slot: 'face', price: 25 },
  partyhat: { id: 'partyhat', emoji: '🥳', name: 'Party hat', slot: 'head', price: 40 },
  pumpkin: { id: 'pumpkin', emoji: '🎃', name: 'Pumpkin hat', slot: 'head', price: 25, season: HARVEST },
  santa: { id: 'santa', emoji: '🎅', name: 'Santa hat', slot: 'head', price: 25, season: DECEMBER },
  chefhat: { id: 'chefhat', emoji: '👨‍🍳', name: 'Chef hat', slot: 'head', price: 30 },
  strawhat: { id: 'strawhat', emoji: '👒', name: 'Straw hat', slot: 'head', price: 25 },
  flowercrown: { id: 'flowercrown', emoji: '💐', name: 'Flower crown', slot: 'head', price: 35 },
  monocle: { id: 'monocle', emoji: '🧐', name: 'Monocle', slot: 'face', price: 30 },
  heartglasses: { id: 'heartglasses', emoji: '😍', name: 'Heart glasses', slot: 'face', price: 35 },
  mustache: { id: 'mustache', emoji: '🥸', name: 'Moustache', slot: 'face', price: 20 },
  apron: { id: 'apron', emoji: '🧑‍🍳', name: 'Apron', slot: 'neck', price: 35 },
  tie: { id: 'tie', emoji: '👔', name: 'Tie', slot: 'neck', price: 25 },
  pearls: { id: 'pearls', emoji: '📿', name: 'Necklace', slot: 'neck', price: 30 },
  balloon: { id: 'balloon', emoji: '🎈', name: 'Balloon', slot: 'float', price: 30 },
  note: { id: 'note', emoji: '🎵', name: 'Music note', slot: 'float', price: 20 },
  bee: { id: 'bee', emoji: '🐝', name: 'Bee', slot: 'float', price: 25 },
  chick: { id: 'chick', emoji: '🐤', name: 'Chick', slot: 'pal', price: 40 },
  snail: { id: 'snail', emoji: '🐌', name: 'Snail', slot: 'pal', price: 30 },
  ladybug: { id: 'ladybug', emoji: '🐞', name: 'Ladybird', slot: 'pal', price: 35 },
  cat: { id: 'cat', emoji: '🐱', name: 'Cat', slot: 'pal', proOnly: true },
  meadow: { id: 'meadow', emoji: '🌼', name: 'Meadow', slot: 'backdrop', price: 30 },
  kitchen: { id: 'kitchen', emoji: '🍳', name: 'Kitchen', slot: 'backdrop', price: 40 },
  beach: { id: 'beach', emoji: '🏖️', name: 'Beach', slot: 'backdrop', price: 50 },
  sunset: { id: 'sunset', emoji: '🌇', name: 'Sunset', slot: 'backdrop', price: 60 },
  night: { id: 'night', emoji: '🌙', name: 'Night sky', slot: 'backdrop', proOnly: true },
  autumn: { id: 'autumn', emoji: '🍂', name: 'Autumn leaves', slot: 'backdrop', price: 40, season: HARVEST },
  trex: { id: 'trex', emoji: '🦖', name: 'T-rex', slot: 'outfit', price: 120 },
  frog: { id: 'frog', emoji: '🐸', name: 'Frog', slot: 'outfit', price: 80 },
  penguin: { id: 'penguin', emoji: '🐧', name: 'Penguin', slot: 'outfit', price: 90 },
  strawberry: { id: 'strawberry', emoji: '🍓', name: 'Strawberry', slot: 'outfit', price: 100 },
  avocado: { id: 'avocado', emoji: '🥑', name: 'Avocado', slot: 'outfit', price: 100 },
  astronaut: { id: 'astronaut', emoji: '👩‍🚀', name: 'Astronaut', slot: 'outfit', proOnly: true },
  snowfall: { id: 'snowfall', emoji: '❄️', name: 'Snowfall', slot: 'backdrop', price: 45, season: DECEMBER },
};

function monthDay(date: Date): string {
  return `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function inSeason(season: Season, now: Date): boolean {
  const today = monthDay(now);
  return season.from <= season.to ? today >= season.from && today <= season.to : today >= season.from || today <= season.to;
}

/** What the shop sells today: permanent stock plus anything in season. Bought items are kept forever. */
export function shopStock(now: Date): Accessory[] {
  return SHOP.filter((a) => !a.season || inSeason(a.season, now));
}

/** Shop stock, cheapest first. */
export const SHOP = (Object.values(ACCESSORIES) as Accessory[]).filter((a) => a.price !== undefined).sort((a, b) => a.price! - b.price!);

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
  challengesDone: number;
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
    challengesDone: completedChallenges(items, now, startedAt).length,
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
  { id: 'hat-trick', title: 'Hat-trick', description: 'Complete 3 weekly challenges', reward: 'bow', earned: (s) => s.challengesDone >= 3 },
  { id: 'big-box', title: 'Big box', description: 'Drop off 10+ items at once', reward: 'star', earned: (s) => s.biggestDropOff >= 10 },
];

export function earnedBadges(items: Item[], now: Date, startedAt?: string | null): BadgeId[] {
  const s = stats(items, now, startedAt);
  return BADGES.filter((b) => b.earned(s)).map((b) => b.id);
}

export function unlockedAccessories(badges: BadgeId[], isPro: boolean, bought: AccessoryId[] = []): AccessoryId[] {
  const fromBadges = BADGES.filter((b) => badges.includes(b.id)).map((b) => b.reward);
  const fromPro = isPro ? (Object.values(ACCESSORIES).filter((a) => a.proOnly).map((a) => a.id) as AccessoryId[]) : [];
  return [...fromBadges, ...fromPro, ...bought.filter((id) => ACCESSORIES[id].price !== undefined)];
}

// ── Seeds: the in-game currency (never bought with money) ───────────────────

export const SEEDS_PER_RESCUED_UNIT = 2;
export const SEEDS_PER_DONATED_UNIT = 5;
export const SEEDS_PER_CHECK_IN = 1;
export const SEEDS_PER_BADGE = 10;
export const SEEDS_PER_FROZEN_UNIT = 1;

/** Local YYYY-MM-DD, the key for daily check-ins. */
export function dayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function seedsEarned(items: Item[], badges: BadgeId[], checkIns: string[]): number {
  const units = (status: Item['status']) => items.filter((i) => i.status === status).reduce((n, i) => n + i.quantity, 0);
  return (
    units('used') * SEEDS_PER_RESCUED_UNIT +
    units('donated') * SEEDS_PER_DONATED_UNIT +
    items.filter((i) => i.frozenAt).reduce((n, i) => n + i.quantity, 0) * SEEDS_PER_FROZEN_UNIT +
    new Set(checkIns).size * SEEDS_PER_CHECK_IN +
    badges.length * SEEDS_PER_BADGE
  );
}

export function seedsSpent(bought: AccessoryId[]): number {
  return bought.reduce((n, id) => n + (ACCESSORIES[id].price ?? 0), 0);
}

// ── Bonus seeds: level-ups, diary photos, and a small log of one-off rewards ─

/** Every growth stage reached pays out once. */
export const SEEDS_PER_STAGE = 20;
/** A photo of a rescued meal in the diary. */
export const SEEDS_PER_DIARY_PHOTO = 3;

export function stageSeeds(xp: number): number {
  return (growth(xp).stage.level - 1) * SEEDS_PER_STAGE;
}

/**
 * One-off rewards the fridge can't derive, so they're logged:
 * - `ad`: watched an opt-in rewarded ad (Pro collects without the ad)
 * - `skipped-buy`: took something off the shopping list because it's already at home
 * - `share`: shared the impact card
 * Each has a cap, so none of them can be farmed.
 */
export type SeedEventKind = 'ad' | 'skipped-buy' | 'share';
export type SeedEvent = { kind: SeedEventKind; at: string };

export const SEED_REWARDS: Record<SeedEventKind, { seeds: number; limit: number; per: 'day' | 'week' }> = {
  ad: { seeds: 10, limit: 3, per: 'day' },
  'skipped-buy': { seeds: 3, limit: 3, per: 'day' },
  share: { seeds: 5, limit: 1, per: 'week' },
};

/** How many more times `kind` can pay out in the current day or week. */
export function rewardsLeft(log: SeedEvent[], kind: SeedEventKind, now: Date): number {
  const { limit, per } = SEED_REWARDS[kind];
  const since = per === 'day' ? new Date(now.getFullYear(), now.getMonth(), now.getDate()) : weekStart(now);
  const used = log.filter((e) => e.kind === kind && new Date(e.at) >= since).length;
  return Math.max(0, limit - used);
}

export function loggedSeeds(log: SeedEvent[]): number {
  return log.reduce((n, e) => n + SEED_REWARDS[e.kind].seeds, 0);
}

// ── Daily stars (one per day, like a habit tracker) ─────────────────────────

/** 0 = nothing, 1 = checked the fridge, 2 = checked in and saved food that day. */
export type DayStar = { day: string; stars: 0 | 1 | 2 };

export function dailyStars(items: Item[], checkIns: string[], now: Date, days = 7): DayStar[] {
  const saved = new Set([
    ...items.filter((i) => (i.status === 'used' || i.status === 'donated') && i.resolvedAt).map((i) => dayKey(new Date(i.resolvedAt!))),
    ...items.filter((i) => i.frozenAt).map((i) => dayKey(new Date(i.frozenAt!))),
  ]);
  const checked = new Set(checkIns);
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1 - i));
    const day = dayKey(d);
    // Saving food counts as checking the fridge.
    const stars = saved.has(day) ? 2 : checked.has(day) ? 1 : 0;
    return { day, stars };
  });
}

export type Snapshot = { xp: number; level: number; badges: BadgeId[]; challengeDone: boolean; challenge: Challenge };

export function snapshot(items: Item[], now: Date, startedAt?: string | null): Snapshot {
  const xp = totalXp(items);
  const { done, challenge } = currentChallenge(items, now);
  return { xp, level: growth(xp).stage.level, badges: earnedBadges(items, now, startedAt), challengeDone: done, challenge };
}

export type Celebration = {
  xpGained: number;
  levelUp: Stage | null;
  newBadges: Badge[];
  /** This week's challenge, if the action just completed it. */
  challenge: Challenge | null;
};

/** What just changed, for the celebration after an action. Null if nothing worth celebrating. */
export function diffProgress(before: Snapshot, after: Snapshot): Celebration | null {
  const xpGained = after.xp - before.xp;
  const levelUp = after.level > before.level ? STAGES[after.level - 1] : null;
  const newBadges = BADGES.filter((b) => after.badges.includes(b.id) && !before.badges.includes(b.id));
  const challenge = after.challengeDone && !before.challengeDone ? after.challenge : null;
  if (xpGained <= 0 && !levelUp && newBadges.length === 0 && !challenge) return null;
  return { xpGained, levelUp, newBadges, challenge };
}

// ── Weekly challenges (a new one every Monday) ──────────────────────────────

export type Challenge = {
  id: string;
  title: string;
  goal: number;
  reward: number;
  /** Counts progress from the items resolved within the week. */
  count: (resolved: Item[]) => number;
};

const rescuedWhere = (pred: (i: Item) => boolean) => (resolved: Item[]) => resolved.filter((i) => i.status === 'used' && pred(i)).length;

export const CHALLENGES: Challenge[] = [
  { id: 'dairy-duo', title: 'rescue 2 dairy items', goal: 2, reward: 15, count: rescuedWhere((i) => i.category === 'dairy') },
  { id: 'veg-hero', title: 'rescue 3 fruit & veg', goal: 3, reward: 15, count: rescuedWhere((i) => i.category === 'produce') },
  { id: 'box-it', title: 'make a donation', goal: 1, reward: 20, count: (r) => (r.some((i) => i.status === 'donated') ? 1 : 0) },
  { id: 'clean-plate', title: 'save 5 items', goal: 5, reward: 20, count: (r) => r.filter((i) => i.status === 'used' || i.status === 'donated').length },
  { id: 'protein', title: 'rescue meat or fish', goal: 1, reward: 10, count: rescuedWhere((i) => i.category === 'meat' || i.category === 'fish') },
  { id: 'leftover-legend', title: 'eat 2 lots of leftovers', goal: 2, reward: 15, count: rescuedWhere((i) => i.category === 'leftovers') },
];

/** Whole weeks since a fixed Monday, so every user sees the same challenge each week. */
function weekIndex(start: Date): number {
  const epoch = new Date(2026, 0, 5); // a Monday
  return Math.round((start.getTime() - epoch.getTime()) / (7 * 24 * 60 * 60 * 1000));
}

function resolvedInWeek(items: Item[], start: Date): Item[] {
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7);
  return items.filter((i) => i.resolvedAt && new Date(i.resolvedAt) >= start && new Date(i.resolvedAt) < end);
}

export type ChallengeStatus = { challenge: Challenge; progress: number; done: boolean };

export function challengeFor(weekStartDate: Date): Challenge {
  const n = CHALLENGES.length;
  return CHALLENGES[((weekIndex(weekStartDate) % n) + n) % n];
}

export function currentChallenge(items: Item[], now: Date): ChallengeStatus {
  const start = weekStart(now);
  const challenge = challengeFor(start);
  const progress = Math.min(challenge.goal, challenge.count(resolvedInWeek(items, start)));
  return { challenge, progress, done: progress >= challenge.goal };
}

/** Every weekly challenge completed since the user started. */
export function completedChallenges(items: Item[], now: Date, startedAt?: string | null): Challenge[] {
  if (!startedAt) return [];
  const done: Challenge[] = [];
  for (let start = weekStart(new Date(startedAt)); start <= now; start = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7)) {
    const c = challengeFor(start);
    if (c.count(resolvedInWeek(items, start)) >= c.goal) done.push(c);
  }
  return done;
}

/** Seeds from every completed weekly challenge since the user started. */
export function challengeSeeds(items: Item[], now: Date, startedAt?: string | null): number {
  return completedChallenges(items, now, startedAt).reduce((n, c) => n + c.reward, 0);
}

// ── Weekly recap (the Sunday-evening notification) ──────────────────────────

export type Recap = { rescued: number; donated: number; frozen: number; wasted: number };

/** Units saved or wasted in the 7 days up to `now`. */
export function weeklyRecap(items: Item[], now: Date): Recap {
  const within = (iso?: string) => Boolean(iso) && daysSince(iso!, now) < 7 && daysSince(iso!, now) >= 0;
  const units = (pred: (i: Item) => boolean) => items.filter(pred).reduce((n, i) => n + i.quantity, 0);
  return {
    rescued: units((i) => i.status === 'used' && within(i.resolvedAt)),
    donated: units((i) => i.status === 'donated' && within(i.resolvedAt)),
    frozen: units((i) => within(i.frozenAt)),
    wasted: units((i) => i.status === 'wasted' && within(i.resolvedAt)),
  };
}

/** One friendly line in the pet's voice; never scolds. */
export function recapText(recap: Recap, pet: string): string {
  const saved = recap.rescued + recap.donated + recap.frozen;
  if (saved === 0 && recap.wasted === 0) return `quiet week. ${pet} misses you — what's in the fridge?`;
  const parts = [
    recap.rescued && `${recap.rescued} rescued`,
    recap.donated && `${recap.donated} donated`,
    recap.frozen && `${recap.frozen} frozen`,
    `${recap.wasted} binned`,
  ].filter(Boolean);
  const mood = recap.wasted === 0 ? `${pet} is proud of you 🌱` : saved > recap.wasted ? `more saved than binned. ${pet} approves.` : `next week will be better. ${pet} believes in you.`;
  return `this week: ${parts.join(', ')}. ${mood}`;
}
