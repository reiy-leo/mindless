import test from 'node:test'
import assert from 'node:assert/strict'

import { OVERLAYS, OVERLAY_SIZES } from './overlayManager.ts'

test('overlay manager defines emoji picker and unit selector overlays', () => {
  assert.deepEqual(
    OVERLAYS.find((overlay) => overlay.label === 'emoji-picker-overlay'),
    { height: 380, label: 'emoji-picker-overlay', route: '/overlay/emoji-picker', width: 270 },
  )
  assert.deepEqual(OVERLAY_SIZES['emoji-picker-overlay'], { h: 380, w: 270 })

  assert.deepEqual(
    OVERLAYS.find((overlay) => overlay.label === 'unit-selector-overlay'),
    { height: 420, label: 'unit-selector-overlay', route: '/overlay/unit-selector', width: 160 },
  )
  assert.deepEqual(OVERLAY_SIZES['unit-selector-overlay'], { h: 420, w: 160 })
})

test('tw22 color picker waits for its overlay page before sending show payload', () => {
  assert.equal(
    OVERLAYS.find((overlay) => overlay.label === 'tw22-color-picker-overlay')?.waitForReady,
    true,
  )
})
