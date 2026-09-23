import { CATEGORIES } from '@/lib/categories';
import type { Item } from '@/lib/types';

import { claude, CLAUDE_MODEL, hasAnthropicKey, jsonText } from './claude';

export type Recipe = {
  title: string;
  minutes: number;
  servings: number;
  ingredients: { name: string; amount: string; fromFridge: boolean }[];
  steps: string[];
  /** 'ai' when Claude wrote it, 'offline' when we fell back to the built-in template. */
  source: 'ai' | 'offline';
};


const RECIPE_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    minutes: { type: 'integer' },
    servings: { type: 'integer' },
    ingredients: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          amount: { type: 'string' },
          fromFridge: { type: 'boolean' },
        },
        required: ['name', 'amount', 'fromFridge'],
        additionalProperties: false,
      },
    },
    steps: { type: 'array', items: { type: 'string' } },
  },
  required: ['title', 'minutes', 'servings', 'ingredients', 'steps'],
  additionalProperties: false,
} as const;

export const hasRecipeApiKey = hasAnthropicKey;

function describe(items: Item[]): string {
  return items
    .map((item) => `- ${item.name} (${CATEGORIES[item.category].label.toLowerCase()}, quantity ${item.quantity}${item.opened ? ', opened' : ''})`)
    .join('\n');
}

/**
 * The one AI call in the app. Uses exactly the items the user picked, plus
 * common pantry staples, so the recipe actually rescues what's expiring.
 */
async function generateWithClaude(items: Item[]): Promise<Recipe> {
  const response = await claude().beta.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 4000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'low', format: { type: 'json_schema', schema: RECIPE_SCHEMA } },
    system:
      'You write short, practical home recipes whose purpose is to use up food before it expires. ' +
      'Use every listed fridge item. You may add common pantry staples (oil, salt, pepper, spices, flour, stock, garlic, onion) — mark those fromFridge: false. ' +
      'Keep it achievable on a weeknight: at most 8 steps, plain language, metric amounts.',
    messages: [{ role: 'user', content: `These need using up in the next few days:\n${describe(items)}` }],
  });

  return { ...(JSON.parse(jsonText(response)) as Omit<Recipe, 'source'>), source: 'ai' };
}

/**
 * Works with no key and no network, so a judge who clones the repo still sees
 * the full rescue flow. Deliberately simple: a one-pan dish from whatever was picked.
 */
export function offlineRecipe(items: Item[]): Recipe {
  const names = items.map((item) => item.name.toLowerCase());
  const hasBread = items.some((item) => item.category === 'bakery');
  const main = items.find((item) => item.category === 'meat' || item.category === 'fish');
  const title = hasBread && items.length <= 3 ? `Loaded toast with ${names.join(' & ')}` : `Rescue skillet: ${names.slice(0, 3).join(', ')}`;

  const steps = [
    'Chop everything into bite-sized pieces.',
    'Warm a splash of oil in a large pan over medium heat and soften a chopped onion and garlic clove.',
    main ? `Add the ${main.name.toLowerCase()} and cook through, 6–8 minutes.` : null,
    'Add the remaining ingredients, season with salt and pepper, and cook until hot and tender.',
    items.some((item) => item.category === 'dairy') ? 'Take off the heat and stir the dairy through at the end so it stays creamy.' : null,
    hasBread ? 'Toast the bread and pile everything on top.' : 'Serve straight from the pan.',
  ].filter((step): step is string => step !== null);

  return {
    title,
    minutes: 20,
    servings: 2,
    ingredients: [
      ...items.map((item) => ({ name: item.name, amount: item.quantity > 1 ? `${item.quantity}` : 'all of it', fromFridge: true })),
      { name: 'Oil, onion, garlic, salt, pepper', amount: 'to taste', fromFridge: false },
    ],
    steps,
    source: 'offline',
  };
}

/** AI recipes are a Pro feature; everyone gets the offline recipe. */
export async function generateRecipe(items: Item[], { ai }: { ai: boolean }): Promise<Recipe> {
  if (!ai || !hasAnthropicKey) return offlineRecipe(items);
  try {
    return await generateWithClaude(items);
  } catch (error) {
    console.warn('Recipe generation failed, using offline recipe', error);
    return offlineRecipe(items);
  }
}
