// Countdown types

export type EventType = 'countdown' | 'countup';

export type RecurrenceRule = 'none' | 'yearly' | 'monthly' | 'custom';

export type DisplayMode = 'year' | 'year_decimal' | 'month' | 'month_decimal' | 'day';

export interface Countdown {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  targetDate: string;     // YYYY-MM-DD
  targetTime?: string;    // HH:mm:ss
  eventType: EventType;
  reminderEnabled: boolean;
  reminderDaysBefore: number;
  reminderTime?: string;
  isRecurring: boolean;
  recurrenceRule?: RecurrenceRule;
  recurrenceInterval?: number; // For custom: every N years
  displayMode: DisplayMode;
  groupId?: string;
  isFavorite: boolean;
  isCompleted: boolean;
  isLunar: boolean;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CountdownGroup {
  id: string;
  name: string;
  color: string;
  icon: string;
  isPreset: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CountdownGroupWithCount extends CountdownGroup {
  count: number;
}

export interface CreateCountdownParams {
  title: string;
  description?: string;
  icon?: string;
  color?: string;
  targetDate: string;
  targetTime?: string;
  eventType?: EventType;
  reminderEnabled?: boolean;
  reminderDaysBefore?: number;
  reminderTime?: string;
  isRecurring?: boolean;
  recurrenceRule?: RecurrenceRule;
  recurrenceInterval?: number;
  displayMode?: DisplayMode;
  groupId?: string;
  isLunar?: boolean;
}

export interface UpdateCountdownParams {
  title?: string;
  description?: string;
  icon?: string;
  color?: string;
  targetDate?: string;
  targetTime?: string;
  eventType?: EventType;
  reminderEnabled?: boolean;
  reminderDaysBefore?: number;
  reminderTime?: string;
  isRecurring?: boolean;
  recurrenceRule?: RecurrenceRule;
  recurrenceInterval?: number;
  displayMode?: DisplayMode;
  groupId?: string;
  isLunar?: boolean;
}
