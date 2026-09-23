import type { CreatureMood } from '@/lib/rules/creature';
import type { AccessoryId } from '@/lib/rules/progress';

/**
 * Sprout as 1-bit-style pixel art: a 16 × 20 grid. Rows 0–5 hold foliage (and
 * tall hats); rows 6–19 are the body. Each mood is the same body with a
 * different face and fill; each growth level adds foliage; accessories are
 * small pixel maps drawn on top. One character per pixel; '.' is transparent.
 */
export const WIDTH = 16;
export const HEIGHT = 20;

export type Grid = string[][];

const BODY = [
  '......kkkk......',
  '....kkggggkk....',
  '...kggggggggk...',
  '..kggggggggggk..',
  '..kggggggggggk..',
  '.kggggggggggggk.',
  '.kggggggggggggk.',
  '.kggggggggggggk.',
  '.kggggggggggggk.',
  '.kggggggggggggk.',
  '..kggggggggggk..',
  '..kggggggggggk..',
  '...kkggggggkk...',
  '.....kkkkkk.....',
];

const EYE_ROW = 11;
const MOUTH_ROW = 14;

type Px = [row: number, col: number, color: string];

const FACES: Record<CreatureMood, Px[]> = {
  // ^ ^  wide grin
  celebrating: [
    [EYE_ROW, 5, 'k'], [EYE_ROW, 10, 'k'], [EYE_ROW + 1, 4, 'k'], [EYE_ROW + 1, 6, 'k'], [EYE_ROW + 1, 9, 'k'], [EYE_ROW + 1, 11, 'k'],
    [MOUTH_ROW, 5, 'k'], [MOUTH_ROW, 6, 'k'], [MOUTH_ROW, 7, 'k'], [MOUTH_ROW, 8, 'k'], [MOUTH_ROW, 9, 'k'], [MOUTH_ROW, 10, 'k'],
    [MOUTH_ROW + 1, 6, 'r'], [MOUTH_ROW + 1, 7, 'r'], [MOUTH_ROW + 1, 8, 'r'], [MOUTH_ROW + 1, 9, 'r'], [MOUTH_ROW + 2, 7, 'k'], [MOUTH_ROW + 2, 8, 'k'],
  ],
  // ^ ^  smile
  thriving: [
    [EYE_ROW, 5, 'k'], [EYE_ROW, 10, 'k'], [EYE_ROW + 1, 4, 'k'], [EYE_ROW + 1, 6, 'k'], [EYE_ROW + 1, 9, 'k'], [EYE_ROW + 1, 11, 'k'],
    [MOUTH_ROW, 6, 'k'], [MOUTH_ROW, 9, 'k'], [MOUTH_ROW + 1, 7, 'k'], [MOUTH_ROW + 1, 8, 'k'],
  ],
  // | |  small smile
  content: [
    [EYE_ROW, 5, 'k'], [EYE_ROW + 1, 5, 'k'], [EYE_ROW, 10, 'k'], [EYE_ROW + 1, 10, 'k'],
    [MOUTH_ROW, 6, 'k'], [MOUTH_ROW, 9, 'k'], [MOUTH_ROW + 1, 7, 'k'], [MOUTH_ROW + 1, 8, 'k'],
  ],
  // | |  o
  hungry: [
    [EYE_ROW, 5, 'k'], [EYE_ROW + 1, 5, 'k'], [EYE_ROW, 10, 'k'], [EYE_ROW + 1, 10, 'k'],
    [MOUTH_ROW, 7, 'k'], [MOUTH_ROW, 8, 'k'], [MOUTH_ROW + 1, 7, 'k'], [MOUTH_ROW + 1, 8, 'k'],
  ],
  // - -  frown
  wilting: [
    [EYE_ROW + 1, 4, 'k'], [EYE_ROW + 1, 5, 'k'], [EYE_ROW + 1, 6, 'k'], [EYE_ROW + 1, 9, 'k'], [EYE_ROW + 1, 10, 'k'], [EYE_ROW + 1, 11, 'k'],
    [MOUTH_ROW, 7, 'k'], [MOUTH_ROW, 8, 'k'], [MOUTH_ROW + 1, 6, 'k'], [MOUTH_ROW + 1, 9, 'k'],
  ],
};

const CHEEKS: Px[] = [
  [MOUTH_ROW - 1, 3, 'p'], [MOUTH_ROW - 1, 4, 'p'], [MOUTH_ROW - 1, 11, 'p'], [MOUTH_ROW - 1, 12, 'p'],
];

/** Foliage per growth level (1–6). Wilting droops the leaves sideways. */
function foliage(level: number, droop: boolean): Px[] {
  const stem: Px[] = [[5, 7, 's'], [4, 7, 's']];
  if (droop) {
    return [...stem, [4, 8, 'l'], [5, 8, 'l'], [5, 9, 'l'], [5, 10, 'l'], ...(level >= 3 ? ([[4, 6, 'l'], [5, 6, 'l'], [5, 5, 'l']] as Px[]) : [])];
  }
  const right: Px[] = [[3, 8, 'l'], [3, 9, 'l'], [2, 9, 'l'], [2, 10, 'l'], [3, 10, 'l']];
  const left: Px[] = [[3, 6, 'l'], [3, 5, 'l'], [2, 5, 'l'], [2, 4, 'l'], [3, 4, 'l']];
  const tall: Px[] = [[3, 7, 's'], [2, 7, 's'], [1, 7, 'l'], [1, 6, 'l'], [1, 8, 'l'], [0, 7, 'l']];
  const flower = (c: string): Px[] => [[0, 7, c], [0, 6, 'w'], [0, 8, 'w'], [1, 7, 'w']];
  switch (level) {
    case 1:
      return [[5, 7, 's'], [4, 7, 'l'], [4, 8, 'l']];
    case 2:
      return [...stem, ...right];
    case 3:
      return [...stem, ...right, ...left];
    case 4:
      return [...stem, ...right, ...left, [3, 7, 's'], [2, 7, 's'], [1, 7, 's'], ...flower('f')];
    case 5:
      return [...stem, ...right, ...left, ...tall, [2, 11, 'l'], [2, 3, 'l']];
    default:
      return [...stem, ...right, ...left, ...tall, [2, 11, 'l'], [2, 3, 'l'], ...flower('y')];
  }
}

const SPARKLES: Px[] = [
  [7, 1, 'y'], [8, 0, 'y'], [8, 2, 'y'], [9, 1, 'y'],
  [15, 14, 'y'], [16, 13, 'y'], [16, 15, 'y'], [17, 14, 'y'],
];

/** Accessories in grid coordinates (body top is row 6). */
export const ACCESSORY_PIXELS: Record<AccessoryId, Px[]> = {
  cap: [
    ...[5, 6, 7, 8, 9, 10].map((c): Px => [5, c, 'b']),
    ...[4, 5, 6, 7, 8, 9, 10, 11].map((c): Px => [6, c, 'b']),
    ...[4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map((c): Px => [7, c, 'b']),
    [5, 7, 'w'],
  ],
  crown: [
    [3, 4, 'y'], [3, 7, 'y'], [3, 8, 'y'], [3, 11, 'y'],
    ...[4, 5, 6, 7, 8, 9, 10, 11].map((c): Px => [4, c, 'y']),
    ...[4, 5, 6, 7, 8, 9, 10, 11].map((c): Px => [5, c, 'y']),
    [5, 6, 'r'], [5, 9, 'r'],
  ],
  tophat: [
    ...[1, 2, 3].flatMap((r) => [5, 6, 7, 8, 9, 10].map((c): Px => [r, c, 'K'])),
    ...[5, 6, 7, 8, 9, 10].map((c): Px => [4, c, 'r']),
    ...[5, 6, 7, 8, 9, 10].map((c): Px => [5, c, 'K']),
    ...[3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((c): Px => [6, c, 'K']),
  ],
  headphones: [
    ...[5, 6, 7, 8, 9, 10].map((c): Px => [4, c, 'n']),
    [5, 4, 'n'], [5, 11, 'n'], [6, 3, 'n'], [6, 12, 'n'],
    ...[10, 11, 12].flatMap((r) => [[r, 0, 'n'], [r, 1, 'n'], [r, 14, 'n'], [r, 15, 'n']] as Px[]),
    [7, 2, 'n'], [8, 2, 'n'], [9, 1, 'n'], [7, 13, 'n'], [8, 13, 'n'], [9, 14, 'n'],
  ],
  sunglasses: [
    ...[3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((c): Px => [EYE_ROW, c, 'K']),
    ...[3, 4, 5, 6, 9, 10, 11, 12].map((c): Px => [EYE_ROW + 1, c, 'K']),
    [EYE_ROW, 4, 'w'], [EYE_ROW, 10, 'w'],
  ],
  scarf: [
    ...[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map((c): Px => [16, c, 'r']),
    ...[3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((c): Px => [17, c, 'r']),
    [18, 10, 'r'], [18, 11, 'r'], [19, 10, 'r'], [19, 11, 'r'],
    [16, 4, 'w'], [16, 8, 'w'], [16, 12, 'w'],
  ],
  bow: [
    [16, 5, 'f'], [16, 6, 'f'], [17, 5, 'f'], [17, 6, 'f'], [18, 5, 'f'],
    [16, 9, 'f'], [16, 10, 'f'], [17, 9, 'f'], [17, 10, 'f'], [18, 10, 'f'],
    [17, 7, 'r'], [17, 8, 'r'],
  ],
  flower: [[6, 14, 'f'], [7, 13, 'f'], [7, 14, 'y'], [7, 15, 'f'], [8, 14, 'f']],
  star: [[6, 14, 'y'], [7, 13, 'y'], [7, 14, 'y'], [7, 15, 'y'], [8, 13, 'y'], [8, 15, 'y']],
  butterfly: [[6, 13, 't'], [6, 15, 't'], [7, 14, 'K'], [8, 13, 't'], [8, 15, 't'], [7, 13, 't'], [7, 15, 't']],
  beanie: [
    [3, 7, 'r'], [3, 8, 'r'],
    ...[6, 7, 8, 9].map((c): Px => [4, c, 'o']),
    ...[5, 6, 7, 8, 9, 10].map((c): Px => [5, c, 'o']),
    ...[4, 5, 6, 7, 8, 9, 10, 11].map((c): Px => [6, c, 'r']),
    ...[4, 5, 6, 7, 8, 9, 10, 11].map((c): Px => [7, c, 'o']),
  ],
  partyhat: [
    [0, 7, 'y'], [0, 8, 'y'],
    [1, 7, 'f'], [1, 8, 'f'],
    [2, 6, 'f'], [2, 7, 'y'], [2, 8, 'f'], [2, 9, 'f'],
    [3, 6, 'f'], [3, 7, 'f'], [3, 8, 'y'], [3, 9, 'f'],
    [4, 5, 'y'], [4, 6, 'f'], [4, 7, 'f'], [4, 8, 'f'], [4, 9, 'y'], [4, 10, 'f'],
    [5, 5, 'f'], [5, 6, 'f'], [5, 7, 'y'], [5, 8, 'f'], [5, 9, 'f'], [5, 10, 'f'],
    ...[4, 5, 6, 7, 8, 9, 10, 11].map((c): Px => [6, c, 'y']),
  ],
  glasses: [
    [EYE_ROW - 1, 4, 'K'], [EYE_ROW - 1, 5, 'K'], [EYE_ROW - 1, 6, 'K'], [EYE_ROW - 1, 9, 'K'], [EYE_ROW - 1, 10, 'K'], [EYE_ROW - 1, 11, 'K'],
    [EYE_ROW, 3, 'K'], [EYE_ROW, 7, 'K'], [EYE_ROW, 8, 'K'], [EYE_ROW, 12, 'K'],
    [EYE_ROW + 1, 3, 'K'], [EYE_ROW + 1, 7, 'K'], [EYE_ROW + 1, 8, 'K'], [EYE_ROW + 1, 12, 'K'],
    [EYE_ROW + 2, 4, 'K'], [EYE_ROW + 2, 5, 'K'], [EYE_ROW + 2, 6, 'K'], [EYE_ROW + 2, 9, 'K'], [EYE_ROW + 2, 10, 'K'], [EYE_ROW + 2, 11, 'K'],
  ],
  heart: [[6, 13, 'r'], [6, 15, 'r'], [7, 13, 'r'], [7, 14, 'r'], [7, 15, 'r'], [8, 14, 'r']],
  pumpkin: [
    [1, 7, 's'], [2, 7, 's'], [2, 8, 'l'],
    ...[5, 6, 7, 8, 9, 10].map((c): Px => [3, c, 'o']),
    ...[4, 5, 6, 7, 8, 9, 10, 11].map((c): Px => [4, c, 'o']),
    ...[4, 5, 6, 7, 8, 9, 10, 11].map((c): Px => [5, c, 'o']),
    ...[4, 5, 6, 7, 8, 9, 10, 11].map((c): Px => [6, c, 'o']),
    [4, 6, 'K'], [4, 9, 'K'], [5, 6, 'y'], [5, 9, 'y'],
    [6, 5, 'K'], [6, 7, 'K'], [6, 8, 'K'], [6, 10, 'K'],
  ],
  santa: [
    [0, 12, 'w'], [0, 13, 'w'], [1, 11, 'r'], [1, 12, 'w'],
    ...[9, 10].map((c): Px => [2, c, 'r']),
    ...[7, 8, 9, 10].map((c): Px => [3, c, 'r']),
    ...[6, 7, 8, 9, 10].map((c): Px => [4, c, 'r']),
    ...[5, 6, 7, 8, 9, 10].map((c): Px => [5, c, 'r']),
    ...[4, 5, 6, 7, 8, 9, 10, 11].map((c): Px => [6, c, 'w']),
  ],
  bandana: [
    ...[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map((c): Px => [16, c, 'b']),
    ...[5, 6, 7, 8, 9, 10].map((c): Px => [17, c, 'b']),
    [18, 6, 'b'], [18, 7, 'b'], [18, 8, 'b'], [18, 9, 'b'], [19, 7, 'b'], [19, 8, 'b'],
    [16, 5, 'w'], [17, 8, 'w'], [16, 11, 'w'],
  ],
};

const HEAD_HIDES_FOLIAGE: AccessoryId[] = ['cap', 'crown', 'tophat', 'headphones', 'beanie', 'partyhat', 'pumpkin', 'santa'];

function blank(): Grid {
  return Array.from({ length: HEIGHT }, () => Array.from({ length: WIDTH }, () => '.'));
}

function paint(grid: Grid, pixels: Px[]) {
  for (const [r, c, color] of pixels) if (r >= 0 && r < HEIGHT && c >= 0 && c < WIDTH) grid[r][c] = color;
}

export function buildSprout(mood: CreatureMood, level: number, accessories: AccessoryId[]): Grid {
  const grid = blank();
  BODY.forEach((row, r) => [...row].forEach((ch, c) => (grid[r + 6][c] = ch)));
  if (!accessories.some((a) => HEAD_HIDES_FOLIAGE.includes(a))) paint(grid, foliage(level, mood === 'wilting'));
  paint(grid, CHEEKS);
  paint(grid, FACES[mood]);
  if (mood === 'celebrating') paint(grid, SPARKLES);
  for (const a of accessories) paint(grid, ACCESSORY_PIXELS[a]);
  return grid;
}

/** An accessory on its own, cropped to its bounding box — for shop and wardrobe tiles. */
export function buildAccessory(id: AccessoryId): Grid {
  const px = ACCESSORY_PIXELS[id];
  const rows = px.map(([r]) => r);
  const cols = px.map(([, c]) => c);
  const [r0, c0] = [Math.min(...rows), Math.min(...cols)];
  const h = Math.max(...rows) - r0 + 1;
  const w = Math.max(...cols) - c0 + 1;
  const grid: Grid = Array.from({ length: h }, () => Array.from({ length: w }, () => '.'));
  for (const [r, c, color] of px) grid[r - r0][c - c0] = color;
  return grid;
}

/** Body fill per mood: healthy greens down to a dry, dusty khaki. */
export const BODY_FILL: Record<CreatureMood, string> = {
  celebrating: '#8FE3A8',
  thriving: '#9EDDB0',
  content: '#B8E2C2',
  hungry: '#DCE3A4',
  wilting: '#CFC8AB',
};

export function palette(mood: CreatureMood): Record<string, string> {
  return {
    k: '#1B1B1B',
    K: '#1B1B1B',
    g: BODY_FILL[mood],
    w: '#FFFFFF',
    p: '#F6A8B0',
    s: '#4E7F52',
    l: mood === 'wilting' ? '#A89A6A' : '#3FA65F',
    f: '#FF8FB1',
    y: '#FFC93C',
    r: '#E5484D',
    b: '#3E7BFA',
    n: '#2B2D42',
    t: '#2EC4B6',
    o: '#F28C28',
  };
}
