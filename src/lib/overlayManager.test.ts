import test from 'node:test'
import assert from 'node:assert/strict'

import { OVERLAYS, OVERLAY_SIZES, shouldPreloadOverlayWebviews } from './overlayManager.ts'

test('overlay manager defines emoji picker and unit selector overlays', () => {
  assert.deepEqual(
    OVERLAYS.find((overlay) => overlay.label === 'emoji-picker-overlay'),
    { height: 380, label: 'emoji-picker-overlay', route: '/overlay/emoji-picker', waitForReady: true, width: 270 },
  )
  assert.deepEqual(OVERLAY_SIZES['emoji-picker-overlay'], { h: 380, w: 270 })

  assert.deepEqual(
    OVERLAYS.find((overlay) => overlay.label === 'unit-selector-overlay'),
    { height: 420, label: 'unit-selector-overlay', route: '/overlay/unit-selector', waitForReady: true, width: 160 },
  )
  assert.deepEqual(OVERLAY_SIZES['unit-selector-overlay'], { h: 420, w: 160 })
})

test('tw22 color picker waits for its overlay page before sending show payload', () => {
  assert.equal(
    OVERLAYS.find((overlay) => overlay.label === 'tw22-color-picker-overlay')?.waitForReady,
    true,
  )
})

test('all managed overlays are preloaded and wait until their page is ready before show', () => {
  assert.deepEqual(
    OVERLAYS.find((overlay) => overlay.label === 'countdown-form-overlay'),
    { height: 660, label: 'countdown-form-overlay', route: '/overlay/countdown-form', waitForReady: true, width: 420 },
  )

  assert.deepEqual(
    OVERLAYS.filter((overlay) => !overlay.waitForReady).map((overlay) => overlay.label),
    [],
  )
})

test('overlay preload starts once from the main app window only', () => {
  assert.equal(shouldPreloadOverlayWebviews('main', null), true)
  assert.equal(shouldPreloadOverlayWebviews('main', '1'), false)
  assert.equal(shouldPreloadOverlayWebviews('date-picker-overlay', null), false)
})
