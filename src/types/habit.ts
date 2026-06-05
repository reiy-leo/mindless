// Habit types

export type TargetType = 'binary' | 'count' | 'duration';
export type HabitFrequency = 'daily' | 'weekly' | 'monthly';

export interface Habit {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  targetType: TargetType;
  targetValue: number;
  frequency: HabitFrequency;
  frequencyDays?: number[]; // 0-6 (Sun-Sat)
  reminderTime?: string;
  reminderEnabled: boolean;
  streak: number;
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
  frequency: HabitFrequency;
  reminderEnabled?: boolean;
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
