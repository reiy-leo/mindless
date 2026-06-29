// Habit types

export type TargetType = 'binary' | 'count' | 'duration'
export type HabitFrequency = 'daily' | 'every_x_days' | 'weekly' | 'monthly'

export interface Habit {
  archivedAt?: string
  color: string
  createdAt: string
  currentStreak: number
  description: string
  frequency: HabitFrequency
  frequencyDays?: string
  icon: string
  id: string
  longestStreak: number
  name: string
  reminderEnabled: boolean
  reminderTime?: string
  startDate: string
  targetType: TargetType
  targetUnit: string
  targetValue: number
  totalCompletions: number
  updatedAt: string
}

export interface CreateHabitParams {
  color?: string
  description?: string
  frequency: HabitFrequency
  frequencyDays?: string
  groupId?: string
  icon?: string
  name: string
  reminderEnabled?: boolean
  reminderTime?: string
  startDate?: string
  targetType?: TargetType
  targetUnit?: string
  targetValue?: number
}

export interface UpdateHabitParams {
  color?: string
  description?: string
  frequency?: HabitFrequency
  frequencyDays?: string
  icon?: string
  name?: string
  reminderEnabled?: boolean
  reminderTime?: string
  startDate?: string
  targetType?: TargetType
  targetValue?: number
}

export interface HabitLog {
  completed: boolean
  habitId: string
  id: string
  logDate: string // YYYY-MM-DD
  logTime: string
  note: string
  value: number
}

export interface TodayCheckinInfo {
  habitId: string
  value: number
}

export interface HabitGroup {
  color: string
  createdAt: string
  icon: string
  id: string
  name: string
  sortOrder: number
  updatedAt: string
}
