import test from 'node:test'
import assert from 'node:assert/strict'

import { bindHideOnUnfocus, suppressNextHideOnUnfocus, type FocusHideWindow } from './overlayLifecycle.ts'

class FakeOverlayWindow implements FocusHideWindow {
  handlers: Array<(event: { payload: boolean }) => void> = []
  hideCalls = 0

  async hide() {
    this.hideCalls += 1
  }

  async onFocusChanged(handler: (event: { payload: boolean }) => void) {
    this.handlers.push(handler)
    return () => {}
  }
}

test('bindHideOnUnfocus hides an overlay when it loses focus', async () => {
  const win = new FakeOverlayWindow()

  bindHideOnUnfocus(win)
  await Promise.resolve()

  win.handlers[0]?.({ payload: false })
  await Promise.resolve()

  assert.equal(win.hideCalls, 1)
})

test('bindHideOnUnfocus only binds once per overlay window', async () => {
  const win = new FakeOverlayWindow()

  bindHideOnUnfocus(win)
  bindHideOnUnfocus(win)
  await Promise.resolve()

  assert.equal(win.handlers.length, 1)
})

test('bindHideOnUnfocus skips one hide when the overlay is opening another overlay', async () => {
  const win = new FakeOverlayWindow()

  bindHideOnUnfocus(win, 'parent-overlay')
  suppressNextHideOnUnfocus('parent-overlay')
  await Promise.resolve()

  win.handlers[0]?.({ payload: false })
  await Promise.resolve()

  assert.equal(win.hideCalls, 0)

  win.handlers[0]?.({ payload: false })
  await Promise.resolve()

  assert.equal(win.hideCalls, 0)

  win.handlers[0]?.({ payload: true })
  await Promise.resolve()

  win.handlers[0]?.({ payload: false })
  await Promise.resolve()

  assert.equal(win.hideCalls, 1)
})
