import test from 'node:test'
import assert from 'node:assert/strict'

import {
  serializeHighlightText,
  splitHighlightText,
} from './milkdownHighlight.ts'

test('splitHighlightText splits ::text:: into highlight segments', () => {
  assert.deepEqual(splitHighlightText('before ::focus:: after'), [
    { text: 'before ', highlighted: false },
    { text: 'focus', highlighted: true },
    { text: ' after', highlighted: false },
  ])
})

test('splitHighlightText ignores incomplete delimiters', () => {
  assert.deepEqual(splitHighlightText('before ::focus after'), [
    { text: 'before ::focus after', highlighted: false },
  ])
})

test('serializeHighlightText wraps content with :: delimiters', () => {
  assert.equal(serializeHighlightText('focus'), '::focus::')
})
