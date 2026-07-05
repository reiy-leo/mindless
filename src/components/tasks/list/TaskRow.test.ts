import test from 'node:test'
import assert from 'node:assert/strict'

import { shouldSelectTaskFromMouseDown } from './TaskRow.tsx'

test('task row selection responds only to primary mouse button', () => {
  assert.equal(shouldSelectTaskFromMouseDown({ button: 0, ctrlKey: false }), true)
  assert.equal(shouldSelectTaskFromMouseDown({ button: 2, ctrlKey: false }), false)
  assert.equal(shouldSelectTaskFromMouseDown({ button: 0, ctrlKey: true }), false)
})
