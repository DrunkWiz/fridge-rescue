import type { Category } from '@/lib/types';

export type ProductLookup = { name: string; category: Category | null };

const PRODUCT_URL = 'https://world.openfoodfacts.org/api/v2/product';

/**
 * Open Food Facts category tags → our categories. First match wins, so the
 * specific storage-relevant tags (tinned, UHT, frozen) come before broad ones.
 */
const TAG_RULES: [RegExp, Category][] = [
  [/canned|tinned/, 'tinned'],
  [/uht|long-life|shelf-stable-milk/, 'uht'],
  [/frozen/, 'frozen'],
  [/pastas|rices|dried|legumes|cereals|flours|noodles/, 'dried'],
  [/jams|spreads|sauces|condiments|pickles|honeys/, 'jarred'],
  [/snacks|biscuits|crackers|chips|crisps|confectioneries|chocolates/, 'packaged'],
  [/cheeses|yogurts|yoghurts|milks|dairies|butters|creams/, 'dairy'],
  [/fishes|seafood/, 'fish'],
  [/meats|poultry|sausages|hams/, 'meat'],
  [/breads|bakery|pastries/, 'bakery'],
  [/fruits|vegetables|salads|fresh-produce/, 'produce'],
];

export function categoryFromTags(tags: string[]): Category | null {
  const joined = tags.join(' ');
  for (const [pattern, category] of TAG_RULES) {
    if (pattern.test(joined)) return category;
  }
  return null;
}

/** Barcode → product name and best-guess category. Keyless; returns null if unknown. */
export async function lookupBarcode(barcode: string): Promise<ProductLookup | null> {
  const res = await fetch(`${PRODUCT_URL}/${encodeURIComponent(barcode)}.json?fields=product_name,brands,categories_tags`);
  if (!res.ok) return null;
  const json = (await res.json()) as {
    status: number;
    product?: { product_name?: string; brands?: string; categories_tags?: string[] };
  };
  if (json.status !== 1 || !json.product?.product_name) return null;
  const { product_name, categories_tags = [] } = json.product;
  return { name: product_name.trim(), category: categoryFromTags(categories_tags) };
}
