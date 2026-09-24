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

const row = (r: number, from: number, to: number, color: string): Px[] =>
  Array.from({ length: to - from + 1 }, (_, i): Px => [r, from + i, color]);

/** Worn accessories in grid coordinates (body top is row 6). Pals and backdrops live in the scene around Sprout, below. */
export const ACCESSORY_PIXELS: Partial<Record<AccessoryId, Px[]>> = {
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
  chefhat: [
    ...row(0, 5, 10, 'K'),
    [1, 4, 'K'], ...row(1, 5, 10, 'w'), [1, 11, 'K'],
    [2, 3, 'K'], ...row(2, 4, 11, 'w'), [2, 12, 'K'],
    [3, 3, 'K'], ...row(3, 4, 11, 'w'), [3, 12, 'K'],
    [4, 4, 'K'], ...row(4, 5, 10, 'w'), [4, 11, 'K'],
    [5, 4, 'K'], ...row(5, 5, 10, 'w'), [5, 11, 'K'],
    ...row(6, 4, 11, 'K'),
  ],
  strawhat: [...row(3, 6, 9, 'D'), ...row(4, 5, 10, 'D'), ...row(5, 5, 10, 'r'), ...row(6, 2, 13, 'D'), [6, 1, 'M'], [6, 14, 'M']],
  flowercrown: [
    [6, 5, 'f'], [6, 7, 'y'], [6, 8, 'f'], [6, 10, 'y'],
    [7, 4, 'l'], [7, 5, 'f'], [7, 6, 'l'], [7, 7, 'y'], [7, 8, 'l'], [7, 9, 'f'], [7, 10, 'l'], [7, 11, 'y'],
  ],
  monocle: [
    ...row(EYE_ROW - 1, 9, 11, 'y'), [EYE_ROW, 9, 'y'], [EYE_ROW, 11, 'y'], ...row(EYE_ROW + 1, 9, 11, 'y'),
    [EYE_ROW + 2, 12, 'y'], [EYE_ROW + 3, 12, 'y'], [EYE_ROW + 4, 12, 'y'],
  ],
  heartglasses: [
    [EYE_ROW - 1, 4, 'r'], [EYE_ROW - 1, 6, 'r'], ...row(EYE_ROW, 4, 6, 'r'), [EYE_ROW + 1, 5, 'r'],
    [EYE_ROW - 1, 9, 'r'], [EYE_ROW - 1, 11, 'r'], ...row(EYE_ROW, 9, 11, 'r'), [EYE_ROW + 1, 10, 'r'],
    [EYE_ROW, 7, 'K'], [EYE_ROW, 8, 'K'],
  ],
  mustache: [...row(MOUTH_ROW - 1, 5, 10, 'M'), [MOUTH_ROW, 4, 'M'], [MOUTH_ROW, 11, 'M']],
  apron: [
    [15, 5, 'K'], [15, 10, 'K'],
    ...row(16, 4, 11, 'b'), ...row(17, 4, 11, 'b'), ...row(18, 5, 10, 'b'),
    [17, 7, 'w'], [17, 8, 'w'],
  ],
  tie: [[16, 5, 'w'], [16, 6, 'w'], [16, 9, 'w'], [16, 10, 'w'], [16, 7, 'n'], [16, 8, 'n'], ...row(17, 7, 8, 'b'), ...row(18, 6, 9, 'b'), ...row(19, 7, 8, 'b')],
  pearls: [[16, 3, 'y'], [17, 4, 'y'], [18, 5, 'y'], [18, 6, 'y'], [18, 9, 'y'], [18, 10, 'y'], [17, 11, 'y'], [16, 12, 'y'], [18, 7, 'r'], [18, 8, 'r'], [19, 7, 'r'], [19, 8, 'r']],
  balloon: [
    ...row(0, 13, 14, 'r'), ...row(1, 12, 15, 'r'), ...row(2, 12, 15, 'r'), ...row(3, 13, 14, 'r'), [1, 13, 'w'],
    [4, 13, 'r'], [5, 14, 'K'], [6, 14, 'K'], [7, 13, 'K'], [8, 13, 'K'],
  ],
  note: [[4, 14, 'n'], [4, 15, 'n'], [5, 15, 'n'], [6, 15, 'n'], [7, 15, 'n'], [7, 13, 'n'], [7, 14, 'n'], [8, 13, 'n'], [8, 14, 'n']],
  bee: [[6, 13, 'A'], [6, 14, 'A'], [7, 12, 'K'], [7, 13, 'y'], [7, 14, 'K'], [7, 15, 'y'], [8, 13, 'y'], [8, 14, 'K']],
};

/**
 * Full outfits recolour the whole body (`fill` replaces the body colour) and add
 * features on top. Sprout's face stays visible, so moods still show. While one
 * is on, hats, face and neck items aren't drawn.
 */
export const OUTFITS: Partial<Record<AccessoryId, { fill: string; px: Px[] }>> = {
  trex: {
    fill: 'X',
    px: [
      [4, 5, 'o'], [5, 5, 'o'], [3, 7, 'o'], [3, 8, 'o'], [4, 7, 'o'], [4, 8, 'o'], [5, 7, 'o'], [5, 8, 'o'], [4, 10, 'o'], [5, 10, 'o'],
      [16, 1, 'X'], [17, 0, 'X'], [17, 1, 'X'], [18, 0, 'X'],
      ...row(16, 5, 10, 'Y'), ...row(17, 5, 10, 'Y'), ...row(18, 6, 9, 'Y'),
    ],
  },
  frog: {
    fill: 'G',
    px: [
      [4, 4, 'k'], [4, 5, 'k'], [5, 3, 'k'], [5, 4, 'w'], [5, 5, 'w'], [5, 6, 'k'], [6, 3, 'k'], [6, 4, 'w'], [6, 5, 'K'], [6, 6, 'k'],
      [4, 10, 'k'], [4, 11, 'k'], [5, 9, 'k'], [5, 10, 'w'], [5, 11, 'w'], [5, 12, 'k'], [6, 9, 'k'], [6, 10, 'K'], [6, 11, 'w'], [6, 12, 'k'],
      ...row(16, 5, 10, 'L'), ...row(17, 5, 10, 'L'), ...row(18, 6, 9, 'L'),
    ],
  },
  penguin: {
    fill: 'n',
    px: [
      ...[10, 11, 12, 13, 14, 15].flatMap((r) => row(r, 4, 11, 'w')),
      ...row(16, 5, 10, 'w'), ...row(17, 5, 10, 'w'), ...row(18, 6, 9, 'w'),
      [13, 7, 'o'], [13, 8, 'o'],
      [19, 4, 'o'], [19, 5, 'o'], [19, 10, 'o'], [19, 11, 'o'],
    ],
  },
  strawberry: {
    fill: 'r',
    px: [
      [3, 7, 's'], [4, 7, 's'], [4, 6, 'G'], [4, 9, 'G'], ...row(5, 5, 10, 'G'), [6, 4, 'G'], [6, 5, 'G'], [6, 10, 'G'], [6, 11, 'G'],
      [8, 6, 'Y'], [8, 9, 'Y'], [10, 3, 'Y'], [10, 12, 'Y'], [15, 2, 'Y'], [16, 4, 'Y'], [16, 11, 'Y'], [17, 7, 'Y'], [18, 9, 'Y'],
    ],
  },
  avocado: {
    fill: 'J',
    px: [
      ...row(8, 5, 10, 'I'), ...row(9, 4, 11, 'I'), ...row(10, 4, 11, 'I'),
      ...[11, 12, 13, 14, 15].flatMap((r) => row(r, 3, 12, 'I')),
      ...row(16, 4, 11, 'I'), ...row(17, 4, 11, 'I'), ...row(18, 6, 9, 'I'),
      [16, 7, 'M'], [16, 8, 'M'], [17, 6, 'M'], [17, 7, 'M'], [17, 8, 'M'], [17, 9, 'M'], [18, 7, 'M'], [18, 8, 'M'],
    ],
  },
  astronaut: {
    fill: 'w',
    px: [
      [3, 7, 'r'], [4, 7, 'H'], [5, 7, 'H'],
      ...row(9, 4, 11, 'H'),
      ...[10, 11, 12, 13, 14, 15].flatMap((r) => row(r, 3, 12, 'A')),
      [10, 3, 'H'], [10, 12, 'H'],
      ...row(16, 3, 12, 'H'),
      [17, 5, 'r'], [17, 6, 'r'], [17, 9, 'b'], [17, 10, 'b'],
    ],
  },
};

/** Pals sit on the ground to Sprout's left, in a 5 × 5 box (local coordinates). */
export const PAL_PIXELS: Partial<Record<AccessoryId, Px[]>> = {
  chick: [...row(1, 1, 3, 'y'), [2, 0, 'y'], [2, 1, 'y'], [2, 2, 'K'], [2, 3, 'y'], [2, 4, 'o'], ...row(3, 0, 3, 'y'), [4, 1, 'o'], [4, 3, 'o']],
  snail: [
    [1, 1, 'o'], [1, 2, 'o'], [1, 4, 'K'], [2, 0, 'o'], [2, 1, 'M'], [2, 2, 'o'], [2, 4, 'D'],
    ...row(3, 0, 2, 'o'), [3, 3, 'D'], [3, 4, 'D'], ...row(4, 0, 4, 'D'),
  ],
  ladybug: [[2, 1, 'r'], [2, 2, 'K'], [2, 3, 'r'], [3, 0, 'K'], [3, 1, 'K'], [3, 2, 'r'], [3, 3, 'K'], [3, 4, 'r'], ...row(4, 1, 3, 'r')],
  cat: [
    [0, 0, 'H'], [0, 4, 'H'], ...row(1, 0, 4, 'H'),
    [2, 0, 'H'], [2, 1, 'K'], [2, 2, 'H'], [2, 3, 'K'], [2, 4, 'H'],
    [3, 0, 'H'], [3, 1, 'H'], [3, 2, 'f'], [3, 3, 'H'], [3, 4, 'H'], ...row(4, 1, 3, 'H'),
  ],
};

/** The scene around Sprout when a pal or backdrop is on. Sprout is inset by SCENE_LEFT / SCENE_TOP. */
export const SCENE_WIDTH = 24;
export const SCENE_HEIGHT = 22;
export const SCENE_LEFT = 5;
export const SCENE_TOP = 2;
/** Where a pal's 5 × 5 box starts in the scene: bottom-left, on the ground. */
export const PAL_ORIGIN = { row: SCENE_HEIGHT - 5, col: 0 };

function fill(color: (r: number, c: number) => string): Grid {
  return Array.from({ length: SCENE_HEIGHT }, (_, r) => Array.from({ length: SCENE_WIDTH }, (_, c) => color(r, c)));
}

function dots(grid: Grid, points: [number, number][], color: string): Grid {
  for (const [r, c] of points) if (grid[r]?.[c] !== undefined) grid[r][c] = color;
  return grid;
}

/** Backdrops: whole scenes drawn behind Sprout. They stay still while Sprout breathes. */
export const BACKDROPS: Partial<Record<AccessoryId, () => Grid>> = {
  meadow: () => {
    const g = fill((r) => (r < 15 ? 'A' : r === 15 ? 'L' : 'G'));
    dots(g, [[2, 3], [3, 2], [3, 3], [3, 4], [4, 1], [4, 2], [4, 3], [4, 4], [4, 5], [4, 18], [5, 17], [5, 18], [5, 19], [5, 20]], 'w');
    dots(g, [[18, 2], [20, 21], [17, 22], [19, 13]], 'f');
    return dots(g, [[19, 4], [17, 20], [21, 1], [20, 8]], 'y');
  },
  kitchen: () => {
    const g = fill((r, c) => (r < 14 ? (((r >> 1) + (c >> 1)) % 2 ? 'T' : 'Q') : r < 16 ? 'E' : 'M'));
    for (let r = 16; r < SCENE_HEIGHT; r++) g[r][12] = 'k';
    return dots(g, [[18, 3], [18, 20]], 'y');
  },
  beach: () => {
    const g = fill((r) => (r < 11 ? 'A' : r < 15 ? 'B' : 'D'));
    dots(g, [[1, 20], [1, 21], [2, 19], [2, 20], [2, 21], [2, 22], [3, 20], [3, 21]], 'y');
    dots(g, [[12, 2], [12, 3], [13, 9], [13, 10], [12, 17], [12, 18], [13, 22]], 'w');
    return dots(g, [[19, 2], [20, 21], [20, 22]], 'f');
  },
  sunset: () => {
    const g = fill((r) => (r < 4 ? 'V' : r < 8 ? 'P' : r < 12 ? 'U' : r < 16 ? 'y' : 'n'));
    return dots(g, [[12, 1], [12, 2], [12, 3], [13, 0], [13, 1], [13, 2], [13, 3], [13, 4], [14, 0], [14, 4], [15, 0], [15, 4]], 'Y');
  },
  night: () => {
    const g = fill((r) => (r < 17 ? 'N' : 'n'));
    dots(g, [[1, 1], [3, 8], [2, 15], [6, 3], [8, 21], [11, 1], [12, 22], [5, 12], [14, 3]], 'w');
    dots(g, [[1, 20], [1, 21], [2, 19], [3, 19], [4, 20], [4, 21]], 'Y');
    return dots(g, [[7, 17], [10, 5]], 'y');
  },
  autumn: () => {
    const g = fill((r) => (r < 16 ? 'Y' : 'M'));
    dots(g, [[2, 3], [5, 20], [9, 1], [12, 22], [16, 2], [17, 21], [19, 4]], 'o');
    return dots(g, [[4, 12], [7, 2], [1, 18], [11, 20], [18, 22], [20, 1]], 'r');
  },
  // Comes with the T-rex outfit.
  volcano: () => {
    const g = fill((r, c) => (r >= 16 ? 'X' : r >= 6 && Math.abs(c - 19) <= r - 6 ? 'M' : 'U'));
    dots(g, [[6, 19], [7, 19], [7, 18], [8, 20]], 'r');
    dots(g, [[4, 18], [4, 20], [3, 19], [5, 17], [2, 21]], 'o');
    return dots(g, [[16, 1], [17, 3], [16, 22], [18, 21], [20, 2]], 'G');
  },
  // Comes with the frog outfit.
  pond: () => {
    const g = fill((r) => (r < 13 ? 'A' : r < 16 ? 'G' : 'B'));
    dots(g, [[3, 3], [3, 4], [2, 4], [3, 5], [4, 18], [4, 19], [3, 19]], 'w');
    dots(g, [[18, 1], [18, 2], [19, 1], [19, 2], [20, 20], [20, 21], [21, 21], [17, 22], [17, 23]], 'L');
    return dots(g, [[18, 2], [20, 20], [12, 1], [12, 22]], 'f');
  },
  snowfall: () => {
    const g = fill((r) => (r < 16 ? 'Z' : 'w'));
    dots(g, [[16, 0], [16, 5], [16, 11], [16, 18], [16, 23]], 'Z');
    return dots(g, [[1, 2], [3, 9], [2, 17], [5, 4], [6, 21], [8, 1], [9, 13], [10, 20], [12, 3], [13, 22], [4, 14]], 'w');
  },
};

export const isBackdrop = (id: AccessoryId) => BACKDROPS[id] !== undefined;

/** Pixel size for shop and wardrobe tiles: backdrops and full outfits are whole pictures, so they draw smaller. */
export function tilePixel(id: AccessoryId, base: number): number {
  return isBackdrop(id) || OUTFITS[id] ? Math.max(2, Math.floor(base / 2)) : base;
}

/** A pal on its own 5 × 5 grid, to lay over the scene at PAL_ORIGIN. */
export function buildPal(id: AccessoryId): Grid | null {
  const px = PAL_PIXELS[id];
  if (!px) return null;
  const grid: Grid = Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => '.'));
  for (const [r, c, color] of px) grid[r][c] = color;
  return grid;
}

const HEAD_HIDES_FOLIAGE: AccessoryId[] = ['cap', 'crown', 'tophat', 'headphones', 'beanie', 'partyhat', 'pumpkin', 'santa', 'chefhat', 'strawhat'];

function blank(): Grid {
  return Array.from({ length: HEIGHT }, () => Array.from({ length: WIDTH }, () => '.'));
}

function paint(grid: Grid, pixels: Px[]) {
  for (const [r, c, color] of pixels) if (r >= 0 && r < HEIGHT && c >= 0 && c < WIDTH) grid[r][c] = color;
}

export function buildSprout(mood: CreatureMood, level: number, accessories: AccessoryId[]): Grid {
  const grid = blank();
  const outfitId = accessories.find((a) => OUTFITS[a]);
  const outfit = outfitId ? OUTFITS[outfitId] : undefined;
  BODY.forEach((line, r) => [...line].forEach((ch, c) => (grid[r + 6][c] = outfit && ch === 'g' ? outfit.fill : ch)));
  if (outfit) paint(grid, outfit.px);
  else if (!accessories.some((a) => HEAD_HIDES_FOLIAGE.includes(a))) paint(grid, foliage(level, mood === 'wilting'));
  paint(grid, CHEEKS);
  paint(grid, FACES[mood]);
  if (mood === 'celebrating') paint(grid, SPARKLES);
  for (const a of accessories) paint(grid, ACCESSORY_PIXELS[a] ?? []);
  return grid;
}

/** An accessory on its own, cropped to its bounding box — for shop and wardrobe tiles. */
export function buildAccessory(id: AccessoryId): Grid {
  const backdrop = BACKDROPS[id];
  if (backdrop) return backdrop();
  if (OUTFITS[id]) return buildSprout('content', 1, [id]);
  const px = ACCESSORY_PIXELS[id] ?? PAL_PIXELS[id] ?? [];
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
    // Scene colours for pals and backdrops
    A: '#BFE6FF', // sky
    B: '#4AA3DF', // sea
    D: '#F2D8A0', // sand, straw
    E: '#B07A4A', // wood
    G: '#7CCB7E', // grass
    H: '#9AA3AD', // grey
    L: '#A8E6A1', // light grass
    M: '#7A4E2D', // brown
    N: '#1D2447', // night
    P: '#FF9BAA', // sunset pink
    Q: '#D6ECF2', // tile
    T: '#F6F3EC', // light tile
    U: '#FFB26B', // sunset orange
    V: '#8E6CCF', // violet
    Y: '#FFF1B8', // pale yellow
    Z: '#DCE9F5', // snowy sky
    // Full outfits
    I: '#D8E8A0', // avocado flesh
    J: '#3F6B2A', // avocado skin
    X: '#3E9B4F', // t-rex green
  };
}
