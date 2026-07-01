import test from 'node:test'
import assert from 'node:assert/strict'

import { getStatusViewSettings } from './taskViewSettings.ts'
import type { ListSettings } from '@/types/task'

const baseSettings: ListSettings = {
  filterStatus: 'all',
  groupBy: 'priority',
  listId: 'inbox',
  sortBy: 'priority',
  sortOrder: 'desc',
  viewMode: 'list',
}

test('all status reuses saved list settings when no explicit status setting exists', () => {
  assert.deepEqual(getStatusViewSettings(baseSettings, 'all'), {
    groupBy: 'priority',
    sortBy: 'priority',
    sortOrder: 'desc',
  })
})

test('explicit status setting overrides list-level settings', () => {
  assert.deepEqual(
    getStatusViewSettings(
      {
        ...baseSettings,
        statusSettings: {
          completed: { groupBy: 'time', sortBy: 'completedAt', sortOrder: 'desc' },
        },
      },
      'completed',
    ),
    { groupBy: 'time', sortBy: 'completedAt', sortOrder: 'desc' },
  )
})

test('active and completed statuses use stable defaults without saved settings', () => {
  assert.deepEqual(getStatusViewSettings(null, 'active'), {
    groupBy: 'none',
    sortBy: 'dueDate',
    sortOrder: 'asc',
  })
  assert.deepEqual(getStatusViewSettings(null, 'completed'), {
    groupBy: 'none',
    sortBy: 'completedAt',
    sortOrder: 'desc',
  })
})
