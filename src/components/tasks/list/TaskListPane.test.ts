import test from 'node:test'
import assert from 'node:assert/strict'

import { applyTaskFilterStatus } from './TaskListPane.tsx'

test('task filter status selection closes the settings menu', () => {
  const calls: string[] = []

  applyTaskFilterStatus('completed', {
    handleSetFilterStatus: (status) => calls.push(`status:${status}`),
    setShowSettings: (show) => calls.push(`show:${show}`),
  })

  assert.deepEqual(calls, ['status:completed', 'show:false'])
})
