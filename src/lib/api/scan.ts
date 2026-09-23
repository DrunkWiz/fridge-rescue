import { CATEGORY_KEYS } from '@/lib/categories';
import { sanitizeScan, type RawScannedItem, type ScannedItem } from '@/lib/rules/scan';

import { claude, CLAUDE_MODEL, jsonText } from './claude';

export type ImageMediaType = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';

const SCAN_SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          category: { type: 'string', enum: CATEGORY_KEYS },
          quantity: { type: 'integer' },
          daysUntilExpiry: { type: 'integer' },
        },
        required: ['name', 'category', 'quantity', 'daysUntilExpiry'],
        additionalProperties: false,
      },
    },
  },
  required: ['items'],
  additionalProperties: false,
} as const;

const SYSTEM =
  'You turn a photo of a grocery receipt, or of groceries laid out, into a list of food items for a fridge-tracking app. ' +
  'Rules: include food and drink only (skip bags, discounts, totals, household goods). ' +
  'Expand receipt abbreviations into plain product names a person would say ("ORG BNNA" → "Bananas", "SEMI SKM MLK 2L" → "Semi-skimmed milk"); drop brand names unless they identify the product. ' +
  'quantity is the number of units bought. ' +
  'category must be one of the given values: tinned/dried/jarred/packaged/uht are for shelf-stable goods; dairy/meat/fish/produce/bakery/leftovers/frozen for perishables. ' +
  'daysUntilExpiry is your best estimate of typical shelf life from purchase today if unopened and stored normally (e.g. fresh chicken 2, milk 7, bread 4, bananas 5, canned beans 540, dried pasta 365); if a printed date is clearly visible on a product, use it instead. ' +
  'If the image has no food, return an empty list.';

/**
 * What a real scan of a typical supermarket receipt returns, abbreviations and
 * non-food lines included — so the demo exercises the same cleanup path.
 */
const SAMPLE_RECEIPT: RawScannedItem[] = [
  { name: 'SEMI SKIMMED MILK 2L', category: 'dairy', quantity: 1, daysUntilExpiry: 7 },
  { name: 'Greek yoghurt', category: 'dairy', quantity: 2, daysUntilExpiry: 10 },
  { name: 'Chicken thighs', category: 'meat', quantity: 1, daysUntilExpiry: 2 },
  { name: 'Bananas', category: 'produce', quantity: 6, daysUntilExpiry: 5 },
  { name: 'Baby spinach', category: 'produce', quantity: 1, daysUntilExpiry: 4 },
  { name: 'Sourdough loaf', category: 'bakery', quantity: 1, daysUntilExpiry: 4 },
  { name: 'Chopped tomatoes', category: 'tinned', quantity: 2, daysUntilExpiry: 540 },
  { name: 'CHOPPED TOMATOES', category: 'tinned', quantity: 2, daysUntilExpiry: 540 },
  { name: 'Penne pasta', category: 'dried', quantity: 1, daysUntilExpiry: 365 },
  { name: 'Carrier bag', category: 'other', quantity: 1, daysUntilExpiry: 0 },
];

/** Demo mode for builds without an API key: same review flow, canned result. */
export function sampleScan(): ScannedItem[] {
  return sanitizeScan(SAMPLE_RECEIPT);
}

/**
 * One vision call: photo in, structured item list out. Model output is then
 * cleaned by sanitizeScan (pure, tested) before the user reviews it.
 */
export async function scanGroceries(base64: string, mediaType: ImageMediaType): Promise<ScannedItem[]> {
  const response = await claude().beta.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 8000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'medium', format: { type: 'json_schema', schema: SCAN_SCHEMA } },
    system: SYSTEM,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
          { type: 'text', text: `Today is ${new Date().toDateString()}. List the food items.` },
        ],
      },
    ],
  });
  const parsed = JSON.parse(jsonText(response)) as { items: RawScannedItem[] };
  return sanitizeScan(parsed.items ?? []);
}
