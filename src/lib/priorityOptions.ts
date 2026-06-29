import { PRIORITY, PRIORITY_COLOR_FALLBACK, PRIORITY_COLORS } from '@/lib/constants'
import type { PriorityMode } from '@/types'
import type { Priority } from '@/types/task'

export interface PriorityOption {
  color: { bg: string; fg: string }
  label: string
  value: Priority
}

const DETAILED_PRIORITY_COLORS: Record<number, { bg: string; fg: string }> = {
  0: { bg: 'bg-slate-300', fg: 'text-white' },
  1: { bg: 'bg-sky-200', fg: 'text-sky-800' },
  2: { bg: 'bg-sky-300', fg: 'text-sky-700' },
  3: { bg: `bg-sky-400`, fg: 'text-white' },
  4: { bg: 'bg-amber-200', fg: 'text-amber-800' },
  5: { bg: 'bg-amber-300', fg: 'text-amber-700' },
  6: { bg: `bg-amber-400`, fg: 'text-amber-100' },
  7: { bg: 'bg-red-200', fg: 'text-red-800' },
  8: { bg: 'bg-red-300', fg: 'text-red-700' },
  9: { bg: `bg-red-400`, fg: 'text-red-100' },
  10: { bg: 'bg-rose-500', fg: 'text-red-50' },
}

export function getPriorityOptions(priorityMode: PriorityMode, t: (key: string) => string): PriorityOption[] {
  if (priorityMode === 'OxygenNotIncluded') {
    return Array.from({ length: 11 }, (_, value) => ({
      color: DETAILED_PRIORITY_COLORS[value] ?? { bg: PRIORITY_COLOR_FALLBACK, fg: '' },
      label:
        value === 0
          ? `0 ${t('tasks.priority.none')}`
          : value === 10
            ? `10 ${t('tasks.priority.xhigh')}`
            : value === 3
              ? `3 ${t('tasks.priority.low')}`
              : value === 6
                ? `6 ${t('tasks.priority.medium')}`
                : value === 9
                  ? `9 ${t('tasks.priority.high')}`
                  : String(value),
      value: value as Priority,
    }))
  }

  return [
    {
      color: { bg: PRIORITY_COLORS[PRIORITY.NONE], fg: 'text-white' },
      label: t('tasks.priority.none'),
      value: PRIORITY.NONE,
    },
    {
      color: { bg: PRIORITY_COLORS[PRIORITY.LOW], fg: 'text-white' },
      label: t('tasks.priority.low'),
      value: PRIORITY.LOW,
    },
    {
      color: { bg: PRIORITY_COLORS[PRIORITY.MEDIUM], fg: 'text-white' },
      label: t('tasks.priority.medium'),
      value: PRIORITY.MEDIUM,
    },
    {
      color: { bg: PRIORITY_COLORS[PRIORITY.HIGH], fg: 'text-white' },
      label: t('tasks.priority.high'),
      value: PRIORITY.HIGH,
    },
  ]
}
