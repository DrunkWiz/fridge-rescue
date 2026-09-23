import Anthropic from '@anthropic-ai/sdk';

const API_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;

export const CLAUDE_MODEL = 'claude-opus-5';
export const hasAnthropicKey = Boolean(API_KEY);

let client: Anthropic | null = null;

/**
 * The key ships in the app bundle — acceptable for a hackathon demo and
 * documented in the README; a production build would proxy these calls
 * through a backend that holds the key.
 */
export function claude(): Anthropic {
  if (!API_KEY) throw new Error('EXPO_PUBLIC_ANTHROPIC_API_KEY is not set');
  client ??= new Anthropic({ apiKey: API_KEY, dangerouslyAllowBrowser: true });
  return client;
}

/** The JSON text of a structured-output response, or an error if the model declined. */
export function jsonText(response: { stop_reason: string | null; content: { type: string }[] }): string {
  if (response.stop_reason === 'refusal') throw new Error('Request was declined');
  const block = response.content.find((b) => b.type === 'text') as { type: 'text'; text: string } | undefined;
  if (!block) throw new Error('No text in response');
  return block.text;
}
