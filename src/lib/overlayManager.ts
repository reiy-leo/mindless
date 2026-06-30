import { LogicalPosition, LogicalSize } from '@tauri-apps/api/dpi'
import { emit, listen } from '@tauri-apps/api/event'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { bindHideOnUnfocus, suppressNextHideOnUnfocus } from '@/lib/overlayLifecycle'

export interface OverlayDef {
  height: number
  label: string
  route: string
  waitForReady?: boolean
  width: number
}

export const OVERLAYS: OverlayDef[] = [
  { height: 440, label: 'date-picker-overlay', route: '/overlay/date-picker', waitForReady: true, width: 240 },
  { height: 490, label: 'date-range-picker-overlay', route: '/overlay/date-range-picker', waitForReady: true, width: 250 },
  { height: 400, label: 'timezone-picker-overlay', route: '/overlay/timezone-picker', waitForReady: true, width: 240 },
  { height: 50, label: 'tag-list-picker-overlay', route: '/overlay/tag-list-picker', waitForReady: true, width: 200 },
  { height: 140, label: 'group-form-overlay', route: '/overlay/group-form', waitForReady: true, width: 280 },
  { height: 700, label: 'advanced-group-form-overlay', route: '/overlay/advanced-group-form', waitForReady: true, width: 320 },
  { height: 230, label: 'tw22-color-picker-overlay', route: '/overlay/tw22-color-picker', waitForReady: true, width: 310 },
  { height: 380, label: 'emoji-picker-overlay', route: '/overlay/emoji-picker', waitForReady: true, width: 270 },
  { height: 420, label: 'unit-selector-overlay', route: '/overlay/unit-selector', waitForReady: true, width: 160 },
  { height: 660, label: 'countdown-form-overlay', route: '/overlay/countdown-form', waitForReady: true, width: 420 },
]

export const OVERLAY_SIZES: Record<string, { w: number; h: number }> = {
  'advanced-group-form-overlay': { h: 700, w: 320 },
  'date-picker-overlay': { h: 440, w: 240 },
  'date-range-picker-overlay': { h: 490, w: 250 },
  'countdown-form-overlay': { h: 660, w: 420 },
  'emoji-picker-overlay': { h: 380, w: 270 },
  'group-form-overlay': { h: 140, w: 280 },
  'tag-list-picker-overlay': { h: 0, w: 200 },
  'timezone-picker-overlay': { h: 400, w: 240 },
  'tw22-color-picker-overlay': { h: 230, w: 310 },
  'unit-selector-overlay': { h: 420, w: 160 },
}

const overlays = new Map<string, WebviewWindow>()
const overlayHandles = new Map<string, Promise<OverlayHandle | null>>()
const overlayReady = new Set<string>()
const overlayReadyPromises = new Map<string, Promise<void>>()
const OVERLAY_PRELOAD_SESSION_KEY = 'mindless:overlay-preload-complete'
let baseUrl = ''

export function shouldPreloadOverlayWebviews(currentLabel: string, preloadMarker: string | null) {
  return !OVERLAYS.some((overlay) => overlay.label === currentLabel) && preloadMarker !== '1'
}

export function initOverlayWebviews(base: string) {
  baseUrl = base
  if (!shouldPreloadOverlayWebviews(getCurrentWindow().label, window.sessionStorage.getItem(OVERLAY_PRELOAD_SESSION_KEY))) {
    return
  }
  window.sessionStorage.setItem(OVERLAY_PRELOAD_SESSION_KEY, '1')
  void preloadOverlayWebviews()
}

export async function preloadOverlayWebviews() {
  for (const overlay of OVERLAYS) {
    await getOrCreateOverlay(overlay.label)
  }
}

export function bindCurrentOverlayHideOnUnfocus() {
  const currentWindow = getCurrentWindow()
  const label = currentWindow.label
  if (!OVERLAYS.some((overlay) => overlay.label === label)) return

  bindHideOnUnfocus(currentWindow, label)
}

export function suppressCurrentOverlayHideOnUnfocus() {
  const label = getCurrentWindow().label
  if (!OVERLAYS.some((overlay) => overlay.label === label)) return

  suppressNextHideOnUnfocus(label)
}

interface OverlayHandle {
  ready: Promise<void>
  wv: WebviewWindow
}

function waitForOverlayReady(label: string) {
  if (overlayReady.has(label)) return Promise.resolve()
  const pending = overlayReadyPromises.get(label)
  if (pending) return pending

  const ready = new Promise<void>((resolve) => {
    let settled = false
    let unlisten: (() => void) | undefined

    listen(`${label}:ready`, () => {
      if (settled) return
      settled = true
      overlayReady.add(label)
      overlayReadyPromises.delete(label)
      unlisten?.()
      resolve()
    }).then((fn) => {
      if (settled) {
        fn()
      } else {
        unlisten = fn
      }
    }).catch(() => {
      if (settled) return
      settled = true
      overlayReadyPromises.delete(label)
      resolve()
    })
  })
  overlayReadyPromises.set(label, ready)
  return ready
}

async function getOrCreateOverlay(label: string): Promise<OverlayHandle | null> {
  const creating = overlayHandles.get(label)
  if (creating) return creating

  const handle = createOverlayHandle(label)
  overlayHandles.set(label, handle)
  return handle
}

async function createOverlayHandle(label: string): Promise<OverlayHandle | null> {
  const cached = overlays.get(label)
  if (cached) {
    const def = OVERLAYS.find((d) => d.label === label)
    const ready = def?.waitForReady ? waitForOverlayReady(label) : Promise.resolve()
    return { ready, wv: cached }
  }

  const existing = await WebviewWindow.getByLabel(label).catch(() => null)
  if (existing) {
    overlays.set(label, existing)
    const def = OVERLAYS.find((d) => d.label === label)
    const ready = def?.waitForReady ? waitForOverlayReady(label) : Promise.resolve()
    return { ready, wv: existing }
  }

  const def = OVERLAYS.find((d) => d.label === label)
  if (!def) return null

  const ready = def.waitForReady ? waitForOverlayReady(def.label) : Promise.resolve()
  const wv = new WebviewWindow(def.label, {
    alwaysOnTop: true,
    closable: false,
    decorations: true,
    height: def.height,
    hiddenTitle: true,
    maximizable: false,
    minimizable: false,
    resizable: false,
    shadow: true,
    titleBarStyle: 'overlay',
    url: `${baseUrl}${def.route}`,
    visible: false,
    width: def.width,
  })

  wv.once('tauri://error', (e) => {
    console.error(`Failed to create overlay ${def.label}:`, e)
    overlays.delete(def.label)
    overlayHandles.delete(def.label)
    overlayReady.delete(def.label)
  })

  overlays.set(def.label, wv)
  return { ready, wv }
}

function suppressParentOverlayHideIfOpeningChild(label: string) {
  const openerLabel = getCurrentWindow().label
  if (openerLabel === label) return
  if (!OVERLAYS.some((overlay) => overlay.label === openerLabel)) return

  suppressCurrentOverlayHideOnUnfocus()
}

function computeOverlayPosition(anchorX: number, anchorY: number, anchorH: number, overlayW: number, overlayH: number) {
  const screenW = window.screen.width
  const screenH = window.screen.height
  let finalY = anchorY + anchorH + 4
  if (finalY + overlayH > screenH) finalY = anchorY - overlayH - 4
  if (finalY < 0) finalY = 4
  let finalX = anchorX
  if (finalX + overlayW > screenW) finalX = screenW - overlayW - 8
  if (finalX < 0) finalX = 8
  return { x: Math.round(finalX), y: Math.round(finalY) }
}

async function positionAndShowOverlay(label: string, wv: WebviewWindow, payload: Record<string, unknown>) {
  const size = OVERLAY_SIZES[label]
  const anchorX = (payload.anchorX as number) ?? 0
  const anchorY = (payload.anchorY as number) ?? 0
  const anchorH = (payload.anchorH as number) ?? 0
  const overlayW = size?.w ?? 240
  let overlayH = size?.h ?? 400

  if (label === 'tag-list-picker-overlay' && Array.isArray(payload.tags)) {
    overlayH = Math.min(300, (payload.tags as unknown[]).length * 36 + 16)
  }

  const pos = computeOverlayPosition(anchorX, anchorY, anchorH, overlayW, overlayH)
  await wv.setPosition(new LogicalPosition(pos.x, pos.y))
  await wv.setSize(new LogicalSize(overlayW, overlayH))
  await emitOverlayShowAndWaitForContent(label, payload)
  await wv.show()
  await wv.setFocus()
}

async function emitOverlayShowAndWaitForContent(label: string, payload: Record<string, unknown>) {
  let resolveReady: () => void
  const showReady = new Promise<void>((resolve) => {
    resolveReady = resolve
  })
  const unlisten = await listen(`${label}:show-ready`, () => {
    unlisten()
    resolveReady()
  })
  try {
    await emit(`${label}:show`, payload)
    await showReady
  } catch (error) {
    unlisten()
    throw error
  }
}

export function notifyOverlayReady(label: string) {
  void emit(`${label}:ready`)
}

export function notifyOverlayShowReady(label: string) {
  window.requestAnimationFrame(() => {
    void emit(`${label}:show-ready`)
  })
}

export async function showOverlay(label: string, _x: number, _y: number, payload: Record<string, unknown>) {
  suppressParentOverlayHideIfOpeningChild(label)

  const handle = await getOrCreateOverlay(label)
  if (!handle) return

  try {
    await handle.ready
    await positionAndShowOverlay(label, handle.wv, payload)
  } catch (e) {
    overlays.delete(label)
    overlayReady.delete(label)
    const fresh = await getOrCreateOverlay(label)
    if (!fresh) {
      console.error(`Failed to show overlay ${label}:`, e)
      return
    }
    try {
      await fresh.ready
      await positionAndShowOverlay(label, fresh.wv, payload)
    } catch (retryError) {
      console.error(`Failed to show overlay ${label}:`, retryError)
    }
  }
}

export async function hideOverlay(label: string) {
  const wv = overlays.get(label)
  if (!wv) return
  try {
    await wv.hide()
  } catch {
    overlays.delete(label)
    overlayReady.delete(label)
  }
}

export const DATE_PICKER_LABEL = 'date-picker-overlay'
export const DATE_RANGE_PICKER_LABEL = 'date-range-picker-overlay'
export const TIMEZONE_PICKER_LABEL = 'timezone-picker-overlay'
export const TAG_LIST_PICKER_LABEL = 'tag-list-picker-overlay'
export const GROUP_FORM_LABEL = 'group-form-overlay'
export const TW22_COLOR_PICKER_LABEL = 'tw22-color-picker-overlay'
export const ADVANCED_GROUP_FORM_LABEL = 'advanced-group-form-overlay'
export const EMOJI_PICKER_LABEL = 'emoji-picker-overlay'
export const UNIT_SELECTOR_LABEL = 'unit-selector-overlay'
export const COUNTDOWN_FORM_LABEL = 'countdown-form-overlay'
