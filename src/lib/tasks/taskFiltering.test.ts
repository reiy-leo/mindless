import test from 'node:test'
import assert from 'node:assert/strict'

import { matchAdvancedGroup } from './taskFiltering.ts'
import type { AdvancedGroup } from '&/useAppStore'
import type { Task } from '@/types/task'

const baseTask: Task = {
  completedAt: undefined,
  createdAt: '2026-07-01 09:00:00',
  deletedAt: undefined,
  description: '',
  dueDate: undefined,
  dueTime: undefined,
  endDate: undefined,
  endTime: undefined,
  groupBy: 'none',
  id: 'task-1',
  isCompleted: false,
  level: 0,
  listId: 'inbox',
  parentTaskId: undefined,
  priority: 0,
  recurrenceEndDate: undefined,
  recurrenceRule: undefined,
  reminderTime: undefined,
  sortBy: 'sortOrder',
  sortOrder: 0,
  startDate: undefined,
  status: 'pending',
  tagIds: '',
  title: 'Buy milk',
  updatedAt: '2026-07-01 09:00:00',
  visibleSections: undefined,
}

function task(overrides: Partial<Task>): Task {
  return { ...baseTask, ...overrides }
}

function group(filters: AdvancedGroup['filters']): AdvancedGroup {
  return {
    color: '#3B82F6',
    filters,
    icon: '📁',
    id: 'group-1',
    name: 'Group',
  }
}

test('date preset none matches only tasks without due/start/end dates', () => {
  const advancedGroup = group({ datePreset: 'none' })

  assert.equal(
    matchAdvancedGroup(task({ dueDate: undefined, endDate: undefined, startDate: undefined }), advancedGroup, '2026-07-01'),
    true,
  )
  assert.equal(matchAdvancedGroup(task({ dueDate: '2026-07-01' }), advancedGroup, '2026-07-01'), false)
})

test('date preset today matches overlapping task date ranges', () => {
  const advancedGroup = group({ datePreset: 'today' })

  assert.equal(matchAdvancedGroup(task({ startDate: '2026-06-30', endDate: '2026-07-02' }), advancedGroup, '2026-07-01'), true)
  assert.equal(matchAdvancedGroup(task({ dueDate: '2026-07-02' }), advancedGroup, '2026-07-01'), false)
})

test('relative date preset clamps and matches local-day offsets', () => {
  const advancedGroup = group({ datePreset: 'relativeRange', dateRelativeFrom: -1, dateRelativeTo: 2 })

  assert.equal(matchAdvancedGroup(task({ dueDate: '2026-06-30' }), advancedGroup, '2026-07-01'), true)
  assert.equal(matchAdvancedGroup(task({ dueDate: '2026-07-03' }), advancedGroup, '2026-07-01'), true)
  assert.equal(matchAdvancedGroup(task({ dueDate: '2026-07-04' }), advancedGroup, '2026-07-01'), false)
})

test('legacy relative date filters keep matching saved advanced groups', () => {
  const advancedGroup = group({ dateType: 'due', dateMode: 'relative', datePastDays: 1, dateFutureDays: 1 })

  assert.equal(matchAdvancedGroup(task({ dueDate: '2026-06-30' }), advancedGroup, '2026-07-01'), true)
  assert.equal(matchAdvancedGroup(task({ dueDate: '2026-07-03' }), advancedGroup, '2026-07-01'), false)
})
