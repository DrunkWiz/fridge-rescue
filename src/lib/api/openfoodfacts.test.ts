import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { categoryFromTags } from './openfoodfacts.ts';

describe('categoryFromTags', () => {
  it('prefers storage-relevant tags over broad food groups', () => {
    assert.equal(categoryFromTags(['en:plant-based-foods', 'en:legumes', 'en:canned-foods']), 'tinned');
    assert.equal(categoryFromTags(['en:dairies', 'en:milks', 'en:uht-milks']), 'uht');
  });

  it('maps common groups', () => {
    assert.equal(categoryFromTags(['en:spreads', 'en:hazelnut-spreads']), 'jarred');
    assert.equal(categoryFromTags(['en:dairies', 'en:yogurts']), 'dairy');
  });

  it('returns null when nothing matches', () => {
    assert.equal(categoryFromTags(['en:beverages']), null);
  });
});
