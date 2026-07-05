import test from 'node:test'
import assert from 'node:assert/strict'

import { isTaskAbandoned, isTaskCompletedForFilter } from './taskStatus.ts'
import type { Task } from '@/types/task'

const baseTask: Task = {
  completedAt: undefined,
  createdAt: '2026-07-05 09:00:00',
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
  updatedAt: '2026-07-05 09:00:00',
  visibleSections: undefined,
}

function task(overrides: Partial<Task>): Task {
  return { ...baseTask, ...overrides }
}

test('closed tasks count as completed for task filters', () => {
  assert.equal(isTaskCompletedForFilter(task({ isCompleted: false, status: 'closed' })), true)
})

test('only closed tasks are treated as abandoned', () => {
  assert.equal(isTaskAbandoned(task({ isCompleted: true, status: 'closed' })), true)
  assert.equal(isTaskAbandoned(task({ isCompleted: true, status: 'completed' })), false)
})
