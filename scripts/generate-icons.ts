/**
 * Renders the app icon, Android adaptive icon layers, splash image and favicon
 * from Sprout's pixel sprite, so the icon always matches the in-app art.
 *
 *   node scripts/generate-icons.ts
 *
 * No image libraries: a sprite is a grid of solid squares, so we write the PNGs
 * directly (RGBA, zlib from Node).
 */
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

import { buildSprout, HEIGHT, palette, WIDTH } from '../src/components/creature/sprites.ts';

type RGBA = [number, number, number, number];

const hex = (h: string): RGBA => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16), 255];
const PAPER = hex('#F5F5F1');
const CLEAR: RGBA = [0, 0, 0, 0];

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function png(size: number, pixel: (x: number, y: number) => RGBA): Buffer {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    const row = y * (size * 4 + 1);
    raw[row] = 0; // filter: none
    for (let x = 0; x < size; x++) raw.set(pixel(x, y), row + 1 + x * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** Sprout centred on a square canvas, `scale` px per sprite pixel. */
function sproutImage(size: number, scale: number, background: RGBA, mono?: RGBA): Buffer {
  const grid = buildSprout('thriving', 3, []);
  const colors = palette('thriving');
  const ox = Math.floor((size - WIDTH * scale) / 2);
  const oy = Math.floor((size - HEIGHT * scale) / 2);
  return png(size, (x, y) => {
    const gx = Math.floor((x - ox) / scale);
    const gy = Math.floor((y - oy) / scale);
    const key = gx >= 0 && gx < WIDTH && gy >= 0 && gy < HEIGHT ? grid[gy][gx] : '.';
    if (key === '.') return background;
    return mono ?? hex(colors[key]);
  });
}

const out = (name: string, data: Buffer) => {
  writeFileSync(new URL(`../assets/images/${name}`, import.meta.url), data);
  console.log(`wrote assets/images/${name}`);
};

// Store icon: full-bleed paper background (stores round the corners themselves).
out('icon.png', sproutImage(1024, 40, PAPER));
// Android adaptive icon: foreground must sit in the central ~66% safe zone.
out('android-icon-foreground.png', sproutImage(1024, 28, CLEAR));
out('android-icon-background.png', png(1024, () => PAPER));
out('android-icon-monochrome.png', sproutImage(1024, 28, CLEAR, [0, 0, 0, 255]));
// Splash: Sprout alone; the background colour comes from app.json.
out('splash-icon.png', sproutImage(512, 20, CLEAR));
out('favicon.png', sproutImage(48, 2, PAPER));
