import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// Tasks table (unified tree: tasks with parent_task_id are subtasks)
export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description').default(''),
  isCompleted: integer('is_completed', { mode: 'boolean' }).notNull().default(false),
  priority: integer('priority').notNull().default(0),  // 0-3 or 0-10
  dueDate: text('due_date'),
  dueTime: text('due_time'),
  startDate: text('start_date'),
  reminderTime: text('reminder_time'),
  recurrenceRule: text('recurrence_rule'),
  recurrenceEndDate: text('recurrence_end_date'),
  listId: text('list_id').references(() => lists.id),
  tagIds: text('tag_ids'), // JSON array of tag IDs
  sortBy: text('sort_by').notNull().default('due_date'),
  groupBy: text('group_by').notNull().default('none'),
  parentTaskId: text('parent_task_id'),  // null = top-level task, otherwise = subtask of this task
  level: integer('level').notNull().default(0),  // nesting depth 0-3
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
  completedAt: text('completed_at'),
  deletedAt: text('deleted_at'),
  sortOrder: real('sort_order').notNull().default(0),
});

// Lists table
export const lists = sqliteTable('lists', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  color: text('color').default('#3B82F6'),
  icon: text('icon').default('folder'),
  sortOrder: real('sort_order').notNull().default(0),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
});

// Tags table (hierarchical, max 4 levels)
export const tags = sqliteTable('tags', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  color: text('color').default('#3B82F6'),
  emoji: text('emoji').default(''),
  parentId: text('parent_id').references(() => tags.id),
  level: integer('level').notNull().default(0),  // 0-3
  sortOrder: real('sort_order').notNull().default(0),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
});

// Steps table (task checklist with rich text)
export const steps = sqliteTable('steps', {
  id: text('id').primaryKey(),
  taskId: text('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  description: text('description').notNull(),
  dueDate: text('due_date'),
  dueTime: text('due_time'),
  isCompleted: integer('is_completed', { mode: 'boolean' }).notNull().default(false),
  sortOrder: real('sort_order').notNull().default(0),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
});

// Habits table
export const habits = sqliteTable('habits', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').default(''),
  icon: text('icon').default('star'),
  color: text('color').default('#8B5CF6'),
  targetType: text('target_type').notNull().default('binary'),
  targetValue: integer('target_value').default(1),
  frequency: text('frequency').notNull().default('daily'),
  frequencyDays: text('frequency_days'), // JSON array
  reminderTime: text('reminder_time'),
  reminderEnabled: integer('reminder_enabled', { mode: 'boolean' }).notNull().default(false),
  currentStreak: integer('current_streak').notNull().default(0),
  longestStreak: integer('longest_streak').notNull().default(0),
  totalCompletions: integer('total_completions').notNull().default(0),
  startDate: text('start_date').notNull(),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
  archivedAt: text('archived_at'),
});

// Habit logs table
export const habitLogs = sqliteTable('habit_logs', {
  id: text('id').primaryKey(),
  habitId: text('habit_id').notNull().references(() => habits.id, { onDelete: 'cascade' }),
  logDate: text('log_date').notNull(),
  logTime: text('log_time').notNull().default(sql`(datetime('now'))`),
  completed: integer('completed', { mode: 'boolean' }).notNull().default(true),
  value: integer('value').default(0),
  note: text('note').default(''),
}, (table) => ({
  uniqueIdx: table.habitId, table.logDate,
}));

// Countdowns table
export const countdowns = sqliteTable('countdowns', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description').default(''),
  icon: text('icon').default('flag'),
  color: text('color').default('#EF4444'),
  targetDate: text('target_date').notNull(),
  targetTime: text('target_time'),
  eventType: text('event_type').notNull().default('countdown'),
  reminderEnabled: integer('reminder_enabled', { mode: 'boolean' }).notNull().default(false),
  reminderDaysBefore: integer('reminder_days_before').default(0),
  reminderTime: text('reminder_time'),
  isRecurring: integer('is_recurring', { mode: 'boolean' }).notNull().default(false),
  recurrenceRule: text('recurrence_rule'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
});

// Settings table
export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

// Per-list view settings
export const listSettings = sqliteTable('list_settings', {
  listId: text('list_id').primaryKey(),
  sortBy: text('sort_by').notNull().default('dueDate'),
  sortOrder: text('sort_order').notNull().default('asc'),
  groupBy: text('group_by').notNull().default('none'),
  filterStatus: text('filter_status').notNull().default('all'),
  viewMode: text('view_mode').notNull().default('list'),
});
