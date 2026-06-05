import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';
import * as api from '@/lib/api';

const CHECK_INTERVAL_MS = 60_000; // Check every 60 seconds
const NOTIFIED_KEY_PREFIX = 'mindless-notified-';

let timer: ReturnType<typeof setInterval> | null = null;

/**
 * Get today's date string for dedup tracking
 */
function todayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/**
 * Get the set of already-notified item IDs for today
 */
function getNotifiedSet(): Set<string> {
  try {
    const raw = sessionStorage.getItem(`${NOTIFIED_KEY_PREFIX}${todayKey()}`);
    if (raw) {
      return new Set(JSON.parse(raw));
    }
  } catch {
    // Ignore
  }
  return new Set<string>();
}

/**
 * Save the notified set
 */
function saveNotifiedSet(set: Set<string>): void {
  // Clean up old days' keys
  const today = todayKey();
  for (let i = sessionStorage.length - 1; i >= 0; i--) {
    const key = sessionStorage.key(i);
    if (key?.startsWith(NOTIFIED_KEY_PREFIX) && key !== `${NOTIFIED_KEY_PREFIX}${today}`) {
      sessionStorage.removeItem(key);
    }
  }
  sessionStorage.setItem(`${NOTIFIED_KEY_PREFIX}${today}`, JSON.stringify([...set]));
}

/**
 * Check if current time matches a reminder time (within 1 minute window)
 */
function isTimeMatch(reminderTime: string | null): boolean {
  if (!reminderTime) return false;

  const now = new Date();
  const [hours, minutes] = reminderTime.split(':').map(Number);
  const targetMinutes = hours * 60 + minutes;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // Match within a 1-minute window
  return currentMinutes === targetMinutes;
}

/**
 * Check and send notifications for all due items
 */
export async function checkAndNotify(): Promise<void> {
  const notified = getNotifiedSet();
  let updated = false;

  // 1. Check due tasks
  try {
    const dueTasks = await api.getDueTasks();
    for (const task of dueTasks) {
      const notifKey = `task-${task.id}-${todayKey()}`;
      if (notified.has(notifKey)) continue;

      // If task has a specific due_time, only notify at that time
      if (task.dueTime && !isTimeMatch(task.dueTime)) continue;

      const isOverdue = task.dueDate && task.dueDate < todayKey();
      const title = isOverdue ? '📋 任务已过期' : '📋 任务到期';
      const body = task.dueTime
        ? `${task.title} — ${task.dueTime}`
        : task.title;

      sendNotification({ title, body });
      notified.add(notifKey);
      updated = true;
    }
  } catch (err) {
    console.warn('Failed to check due tasks:', err);
  }

  // 2. Check habit reminders
  try {
    const habits = await api.getReminderHabits();
    for (const habit of habits) {
      const notifKey = `habit-${habit.id}-${todayKey()}`;
      if (notified.has(notifKey)) continue;

      // If habit has a reminder_time, only notify at that time
      if (habit.reminderTime && !isTimeMatch(habit.reminderTime)) continue;

      const streakText = habit.currentStreak > 0
        ? ` (连续 ${habit.currentStreak} 天)`
        : '';

      sendNotification({
        title: '✅ 习惯打卡提醒',
        body: `${habit.name}${streakText}`,
      });
      notified.add(notifKey);
      updated = true;
    }
  } catch (err) {
    console.warn('Failed to check habit reminders:', err);
  }

  // 3. Check countdown reminders
  try {
    const countdowns = await api.getReminderCountdowns();
    for (const cd of countdowns) {
      const notifKey = `countdown-${cd.id}-${todayKey()}`;
      if (notified.has(notifKey)) continue;

      const daysText = cd.daysRemaining === 0
        ? '今天！'
        : `还有 ${cd.daysRemaining} 天`;

      sendNotification({
        title: '⏳ 倒计时提醒',
        body: `${cd.title} — ${daysText}`,
      });
      notified.add(notifKey);
      updated = true;
    }
  } catch (err) {
    console.warn('Failed to check countdown reminders:', err);
  }

  if (updated) {
    saveNotifiedSet(notified);
  }
}

/**
 * Request notification permission from the user
 */
export async function ensurePermission(): Promise<boolean> {
  const granted = await isPermissionGranted();
  if (granted) return true;

  const permission = await requestPermission();
  return permission === 'granted';
}

/**
 * Start the periodic notification checker
 */
export function startNotificationService(): void {
  if (timer) return; // Already running

  // Do an immediate check
  checkAndNotify().catch(console.warn);

  // Then check periodically
  timer = setInterval(() => {
    checkAndNotify().catch(console.warn);
  }, CHECK_INTERVAL_MS);
}

/**
 * Stop the periodic notification checker
 */
export function stopNotificationService(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
