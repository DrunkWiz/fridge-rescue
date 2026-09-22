import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { addDays } from '@/lib/rules/dates';
import type { Item } from '@/lib/types';

/** Reminders go out the evening before, when there's still time to plan tomorrow's dinner. */
export const REMINDER_HOUR = 18;
const CHANNEL_ID = 'expiry';
/** Stay well under OS limits on pending notifications. */
const MAX_REMINDERS = 20;

const supported = Platform.OS !== 'web';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

export async function ensureNotificationPermission(): Promise<boolean> {
  if (!supported) return false;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Expiry reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

function reminderText(names: string[]): { title: string; body: string } {
  const list = names.length <= 2 ? names.join(' and ') : `${names.slice(0, 2).join(', ')} and ${names.length - 2} more`;
  return {
    title: 'Sprout is getting hungry 🌱',
    body: `${list} ${names.length === 1 ? 'expires' : 'expire'} tomorrow. Rescue ${names.length === 1 ? 'it' : 'them'} and keep your streak alive!`,
  };
}

/**
 * One reminder per expiry day, grouping everything perishable that expires
 * then. Rescheduled from scratch whenever the fridge changes.
 */
export async function rescheduleExpiryReminders(items: Item[]): Promise<void> {
  if (!supported) return;
  if (!(await Notifications.getPermissionsAsync()).granted) return;
  await Notifications.cancelAllScheduledNotificationsAsync();

  const byDay = new Map<string, { at: Date; names: string[] }>();
  const now = Date.now();
  for (const item of items) {
    if (item.status !== 'active' || item.shelfStable) continue;
    const expires = new Date(item.expiresAt);
    const at = addDays(new Date(expires.getFullYear(), expires.getMonth(), expires.getDate(), REMINDER_HOUR), -1);
    if (at.getTime() <= now) continue;
    const key = at.toDateString();
    const entry = byDay.get(key) ?? { at, names: [] };
    entry.names.push(item.name);
    byDay.set(key, entry);
  }

  const upcoming = [...byDay.values()].sort((a, b) => a.at.getTime() - b.at.getTime()).slice(0, MAX_REMINDERS);
  for (const { at, names } of upcoming) {
    await Notifications.scheduleNotificationAsync({
      content: reminderText(names),
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, channelId: CHANNEL_ID },
    });
  }
}
