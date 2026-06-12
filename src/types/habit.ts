// Habit types

export type TargetType = 'binary' | 'count' | 'duration';
export type HabitFrequency = 'daily' | 'every_x_days' | 'weekly' | 'monthly';

export interface Habit {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  targetType: TargetType;
  targetValue: number;
  targetUnit: string;
  frequency: HabitFrequency;
  frequencyDays?: string;
  reminderTime?: string;
  reminderEnabled: boolean;
  currentStreak: number;
  longestStreak: number;
  totalCompletions: number;
  startDate: string;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
}

export interface CreateHabitParams {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  targetType?: TargetType;
  targetValue?: number;
  targetUnit?: string;
  frequency: HabitFrequency;
  frequencyDays?: string;
  reminderTime?: string;
  reminderEnabled?: boolean;
  startDate?: string;
  groupId?: string;
}

export interface UpdateHabitParams {
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
  targetType?: TargetType;
  targetValue?: number;
  frequency?: HabitFrequency;
  frequencyDays?: string;
  reminderTime?: string;
  reminderEnabled?: boolean;
  startDate?: string;
}

export interface HabitLog {
  id: string;
  habitId: string;
  logDate: string;    // YYYY-MM-DD
  logTime: string;
  completed: boolean;
  value: number;
  note: string;
}

export interface TodayCheckinInfo {
  habitId: string;
  value: number;
}

export interface HabitGroup {
  id: string;
  name: string;
  icon: string;
  color: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}
