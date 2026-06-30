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
  { height: 440, label: 'date-picker-overlay', route: '/overlay/date-picker', width: 240 },
  { height: 490, label: 'date-range-picker-overlay', route: '/overlay/date-range-picker', width: 250 },
  { height: 400, label: 'timezone-picker-overlay', route: '/overlay/timezone-picker', width: 240 },
  { height: 50, label: 'tag-list-picker-overlay', route: '/overlay/tag-list-picker', width: 200 },
  { height: 140, label: 'group-form-overlay', route: '/overlay/group-form', width: 280 },
  { height: 700, label: 'advanced-group-form-overlay', route: '/overlay/advanced-group-form', width: 320 },
  { height: 230, label: 'tw22-color-picker-overlay', route: '/overlay/tw22-color-picker', waitForReady: true, width: 310 },
  { height: 380, label: 'emoji-picker-overlay', route: '/overlay/emoji-picker', width: 270 },
  { height: 420, label: 'unit-selector-overlay', route: '/overlay/unit-selector', width: 160 },
]

export const OVERLAY_SIZES: Record<string, { w: number; h: number }> = {
  'advanced-group-form-overlay': { h: 700, w: 320 },
  'date-picker-overlay': { h: 440, w: 240 },
  'date-range-picker-overlay': { h: 490, w: 250 },
  'emoji-picker-overlay': { h: 380, w: 270 },
  'group-form-overlay': { h: 140, w: 280 },
  'tag-list-picker-overlay': { h: 0, w: 200 },
  'timezone-picker-overlay': { h: 400, w: 240 },
  'tw22-color-picker-overlay': { h: 230, w: 310 },
  'unit-selector-overlay': { h: 420, w: 160 },
}

const overlays = new Map<string, WebviewWindow>()
const overlayReady = new Set<string>()
let baseUrl = ''

export function initOverlayWebviews(base: string) {
  baseUrl = base
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

  return new Promise<void>((resolve) => {
    let settled = false
    let unlisten: (() => void) | undefined
    const timeout = window.setTimeout(() => {
      if (settled) return
      settled = true
      unlisten?.()
      resolve()
    }, 800)

    listen(`${label}:ready`, () => {
      if (settled) return
      settled = true
      overlayReady.add(label)
      window.clearTimeout(timeout)
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
      window.clearTimeout(timeout)
      resolve()
    })
  })
}

async function getOrCreateOverlay(label: string): Promise<OverlayHandle | null> {
  const cached = overlays.get(label)
  if (cached) {
    const existing = await WebviewWindow.getByLabel(label).catch(() => null)
    if (existing) {
      overlays.set(label, existing)
      return { ready: Promise.resolve(), wv: existing }
    }
    overlays.delete(label)
    overlayReady.delete(label)
  }

  const existing = await WebviewWindow.getByLabel(label).catch(() => null)
  if (existing) {
    overlays.set(label, existing)
    return { ready: Promise.resolve(), wv: existing }
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
  if (label === 'tag-list-picker-overlay') {
    await wv.setSize(new LogicalSize(overlayW, overlayH))
  }
  await emit(`${label}:show`, payload)
  await wv.show()
  await wv.setFocus()
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
