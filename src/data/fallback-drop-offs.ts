import type { DropOff } from '@/lib/api/overpass';

/**
 * Hand-verified drop-off points, used where OpenStreetMap has no food banks
 * tagged. Only add places whose address and donation policy you have checked
 * on their own website — note the date checked next to each entry.
 *
 * TODO(before demo): add 3–5 real drop-off points near where the video is filmed.
 */
export const FALLBACK_DROP_OFFS: Omit<DropOff, 'distanceKm' | 'source'>[] = [];
