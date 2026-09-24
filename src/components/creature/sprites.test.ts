import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ACCESSORIES, BADGES, SLOTS, unlockedAccessories, type AccessoryId } from '../../lib/rules/progress.ts';
import { ACCESSORY_PIXELS, BACKDROPS, HEIGHT, OUTFITS, PAL_PIXELS, SCENE_HEIGHT, SCENE_WIDTH, WIDTH } from './sprites.ts';

const ids = Object.keys(ACCESSORIES) as AccessoryId[];

describe('wardrobe', () => {
  it('gives an outfit its matching backdrop', () => {
    assert.ok(unlockedAccessories([], false, ['trex']).includes('volcano'));
    assert.ok(!unlockedAccessories([], false, []).includes('volcano'));
  });

  it('lists every slot, and every item can be earned, bought or unlocked with Pro', () => {
    const slots = new Set(SLOTS.map((s) => s.slot));
    const rewards = new Set(BADGES.map((b) => b.reward));
    const bundled = new Set(ids.map((id) => ACCESSORIES[id].backdrop));
    for (const id of ids) {
      const a = ACCESSORIES[id];
      assert.ok(slots.has(a.slot), `${id} is in an unlisted slot`);
      assert.ok(rewards.has(id) || a.proOnly || a.price !== undefined || bundled.has(id), `${id} can't be obtained`);
      if (a.backdrop) assert.equal(ACCESSORIES[a.backdrop].slot, 'backdrop', `${id}'s backdrop isn't a backdrop`);
    }
  });

  it('has in-bounds pixel art for every item, drawn the way its slot needs', () => {
    for (const id of ids) {
      const { slot } = ACCESSORIES[id];
      if (slot === 'outfit') {
        const outfit = OUTFITS[id];
        assert.ok(outfit?.px.length, `${id} has no outfit art`);
        assert.ok(outfit.px.every(([r, c]) => r >= 0 && r < HEIGHT && c >= 0 && c < WIDTH), `${id} is off the sprite`);
      } else if (slot === 'backdrop') {
        const grid = BACKDROPS[id]?.();
        assert.ok(grid, `${id} has no backdrop`);
        assert.equal(grid.length, SCENE_HEIGHT);
        assert.ok(grid.every((row) => row.length === SCENE_WIDTH && row.every((px) => px !== '.')), `${id} has gaps`);
      } else if (slot === 'pal') {
        const px = PAL_PIXELS[id];
        assert.ok(px?.length, `${id} has no pal art`);
        assert.ok(px.every(([r, c]) => r >= 0 && r < 5 && c >= 0 && c < 5), `${id} leaves its 5 × 5 box`);
      } else {
        const px = ACCESSORY_PIXELS[id];
        assert.ok(px?.length, `${id} has no art`);
        assert.ok(px.every(([r, c]) => r >= 0 && r < HEIGHT && c >= 0 && c < WIDTH), `${id} is off the sprite`);
      }
    }
  });
});
