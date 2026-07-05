import test from 'node:test'
import assert from 'node:assert/strict'

import { TASK_COMPLETION_ACTION_DELAY_MS, runAfterTaskCompletionDelay } from './taskCompletionDelay.ts'

test('task completion actions run after the shared 500ms delay', async () => {
  const calls: string[] = []

  await runAfterTaskCompletionDelay(
    () => {
      calls.push('action')
    },
    (ms) => {
      calls.push(`wait:${ms}`)
      return Promise.resolve()
    },
  )

  assert.deepEqual(calls, [`wait:${TASK_COMPLETION_ACTION_DELAY_MS}`, 'action'])
  assert.equal(TASK_COMPLETION_ACTION_DELAY_MS, 500)
})
