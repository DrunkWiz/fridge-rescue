import { PixelGrid } from '@/components/pixel-grid';

/** 9 × 9 one-colour tab icons, drawn in the same pixel style as Sprout. */
const ICONS = {
  fridge: [
    '.#######.',
    '.#.....#.',
    '.#.#...#.',
    '.#######.',
    '.#.....#.',
    '.#.#...#.',
    '.#.....#.',
    '.#######.',
    '..#...#..',
  ],
  sprout: [
    '.##...##.',
    '###...###',
    '.###.###.',
    '...###...',
    '....#....',
    '..#####..',
    '.#.....#.',
    '.#.....#.',
    '..#####..',
  ],
  shop: [
    '...###...',
    '..#...#..',
    '..#...#..',
    '#########',
    '#.......#',
    '#..#.#..#',
    '#.......#',
    '#.......#',
    '#########',
  ],
  impact: [
    '.......##',
    '.......##',
    '....##.##',
    '....##.##',
    '.##.##.##',
    '.##.##.##',
    '.##.##.##',
    '.##.##.##',
    '#########',
  ],
} as const;

export type PixelIconName = keyof typeof ICONS;

export function PixelIcon({ name, color, pixel = 3 }: { name: PixelIconName; color: string; pixel?: number }) {
  return <PixelGrid grid={ICONS[name].map((row) => [...row])} palette={{ '#': color }} pixel={pixel} />;
}
