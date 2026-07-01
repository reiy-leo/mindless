import type { AdvancedGroup } from '&/useAppStore'
import type { Task } from '@/types/task'
import { getLocalToday } from '../taskHelpers.ts'

export function addLocalDays(dateStr: string, days: number): string {
  const date = new Date(`${dateStr}T00:00:00`)
  date.setDate(date.getDate() + days)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function formatLocalDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function getLocalMonthRange(todayStr: string, offset: number): [string, string] {
  const today = new Date(`${todayStr}T00:00:00`)
  const start = new Date(today.getFullYear(), today.getMonth() + offset, 1)
  const end = new Date(today.getFullYear(), today.getMonth() + offset + 1, 0)
  return [formatLocalDate(start), formatLocalDate(end)]
}

export function getLocalWeekRange(todayStr: string, offset: number): [string, string] {
  const today = new Date(`${todayStr}T00:00:00`)
  const mondayOffset = (today.getDay() + 6) % 7
  const start = addLocalDays(todayStr, -mondayOffset + offset * 7)
  return [start, addLocalDays(start, 6)]
}

export function getTaskDateRange(task: Task): [string, string] | null {
  if (task.startDate || task.endDate) {
    const start = task.startDate || task.endDate
    const end = task.endDate || task.startDate
    return start && end ? [start <= end ? start : end, start <= end ? end : start] : null
  }
  return task.dueDate ? [task.dueDate, task.dueDate] : null
}

export function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart <= bEnd && aEnd >= bStart
}

export function matchAdvancedGroup(task: Task, group: AdvancedGroup, todayStr = getLocalToday()): boolean {
  const f = group.filters
  if (f.listIds?.length) {
    const taskListId = task.listId || 'inbox'
    if (!f.listIds.includes(taskListId)) {
      return false
    }
  }
  if (f.tagIds?.length) {
    const taskTagIds = task.tagIds ? task.tagIds.split(',').filter(Boolean) : []
    if (!f.tagIds.some((tid) => taskTagIds.includes(tid))) {
      return false
    }
  }
  if (f.titleRegex) {
    try {
      if (!new RegExp(f.titleRegex).test(task.title)) {
        return false
      }
    } catch {
      return false
    }
  }
  if (f.datePreset && f.datePreset !== 'all') {
    const taskRange = getTaskDateRange(task)
    if (f.datePreset === 'none') {
      if (taskRange) {
        return false
      }
    } else {
      if (!taskRange) {
        return false
      }
      const [taskStart, taskEnd] = taskRange
      let filterRange: [string, string] | null = null
      switch (f.datePreset) {
        case 'overdue':
          if (taskEnd >= todayStr) {
            return false
          }
          break
        case 'today':
          filterRange = [todayStr, todayStr]
          break
        case 'tomorrow': {
          const tomorrow = addLocalDays(todayStr, 1)
          filterRange = [tomorrow, tomorrow]
          break
        }
        case 'thisWeek':
          filterRange = getLocalWeekRange(todayStr, 0)
          break
        case 'nextWeek':
          filterRange = getLocalWeekRange(todayStr, 1)
          break
        case 'thisMonth':
          filterRange = getLocalMonthRange(todayStr, 0)
          break
        case 'nextMonth':
          filterRange = getLocalMonthRange(todayStr, 1)
          break
        case 'absoluteRange': {
          const start = f.dateFrom || f.dateTo
          const end = f.dateTo || f.dateFrom
          filterRange = start && end ? [start <= end ? start : end, start <= end ? end : start] : null
          break
        }
        case 'relativeRange': {
          const from = Math.max(-32, Math.min(32, f.dateRelativeFrom ?? 0))
          const to = Math.max(-32, Math.min(32, f.dateRelativeTo ?? 0))
          filterRange = [addLocalDays(todayStr, Math.min(from, to)), addLocalDays(todayStr, Math.max(from, to))]
          break
        }
      }
      if (filterRange && !rangesOverlap(taskStart, taskEnd, filterRange[0], filterRange[1])) {
        return false
      }
    }
  } else if (f.dateType) {
    const dateVal = f.dateType === 'due' ? task.dueDate : task.createdAt?.split('T')[0]
    if (!dateVal) {
      return false
    }
    if ((f.dateMode || 'absolute') === 'absolute') {
      if (f.dateFrom && dateVal < f.dateFrom) {
        return false
      }
      if (f.dateTo && dateVal > f.dateTo) {
        return false
      }
    } else {
      const pastDays = f.datePastDays ?? 7
      const futureDays = f.dateFutureDays ?? 7
      const minStr = addLocalDays(todayStr, -pastDays)
      const maxStr = addLocalDays(todayStr, futureDays)
      if (dateVal < minStr || dateVal > maxStr) {
        return false
      }
    }
  }
  if (f.priorities?.length) {
    if (!f.priorities.includes(task.priority)) {
      return false
    }
  }
  return true
}
