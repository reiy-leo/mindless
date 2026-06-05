// Countdown types

export type EventType = 'countdown' | 'countup';

export interface Countdown {
  id: string;
  name: string;
  title?: string;
  description: string;
  icon: string;
  color: string;
  targetDate: string;   // YYYY-MM-DD
  targetTime?: string;  // HH:mm:ss
  eventType: EventType;
  reminderEnabled: boolean;
  reminderDaysBefore: number;
  reminderTime?: string;
  isRecurring: boolean;
  recurrenceRule?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCountdownParams {
  name: string;
  targetDate: string;
  reminderEnabled?: boolean;
}
