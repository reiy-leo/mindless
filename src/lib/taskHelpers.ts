import type { Task } from '@/types/task';
import type { Tag } from '@/types/tag';

/**
 * Parse a task's comma-separated tagIds string and return matching Tag objects.
 * Uses a Set for O(n+m) lookup instead of Array.includes O(n*m).
 */
export function getTaskTags(task: Task, allTags: Tag[]): Tag[] {
  if (!task.tagIds || task.tagIds.length === 0) return [];
  const ids = new Set(task.tagIds.split(',').filter(Boolean));
  return allTags.filter((tag) => ids.has(tag.id));
}

/**
 * Parse an ISO date string (e.g. "2025-06-15") as a local date.
 * Avoids the UTC midnight issue where `new Date("2025-06-15")` can
 * shift to the previous day in negative UTC-offset timezones.
 */
export function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Get today's date as a local ISO string "YYYY-MM-DD" without UTC conversion.
 */
export function getLocalToday(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
