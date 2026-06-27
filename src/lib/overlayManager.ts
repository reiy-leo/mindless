import { emit } from '@tauri-apps/api/event'
import { LogicalPosition, LogicalSize } from '@tauri-apps/api/dpi'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'

interface OverlayDef {
  height: number
  label: string
  route: string
  width: number
}

const OVERLAYS: OverlayDef[] = [
  { height: 440, label: 'date-picker-overlay', route: '/overlay/date-picker', width: 240 },
  { height: 490, label: 'date-range-picker-overlay', route: '/overlay/date-range-picker', width: 250 },
  { height: 400, label: 'timezone-picker-overlay', route: '/overlay/timezone-picker', width: 240 },
  { height: 50, label: 'tag-list-picker-overlay', route: '/overlay/tag-list-picker', width: 200 },
  { height: 140, label: 'group-form-overlay', route: '/overlay/group-form', width: 280 },
  { height: 230, label: 'tw22-color-picker-overlay', route: '/overlay/tw22-color-picker', width: 310 },
]

const OVERLAY_SIZES: Record<string, { w: number; h: number }> = {
  'date-picker-overlay': { w: 240, h: 440 },
  'date-range-picker-overlay': { w: 250, h: 490 },
  'timezone-picker-overlay': { w: 240, h: 400 },
  'tag-list-picker-overlay': { w: 200, h: 0 },
  'group-form-overlay': { w: 280, h: 140 },
  'tw22-color-picker-overlay': { w: 310, h: 230 },
}

const overlays = new Map<string, WebviewWindow>()

export async function initOverlayWebviews(baseUrl: string) {
  for (const def of OVERLAYS) {
    if (overlays.has(def.label)) continue

    const existing = await WebviewWindow.getByLabel(def.label)
    if (existing) {
      overlays.set(def.label, existing)
      continue
    }

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
  }
}

function computeOverlayPosition(
  anchorX: number,
  anchorY: number,
  anchorH: number,
  overlayW: number,
  overlayH: number,
) {
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

export async function showOverlay(label: string, _x: number, _y: number, payload: Record<string, unknown>) {
  const wv = overlays.get(label)
  if (!wv) return

  try {
    const size = OVERLAY_SIZES[label]
    const anchorX = (payload.anchorX as number) ?? 0
    const anchorY = (payload.anchorY as number) ?? 0
    const anchorH = (payload.anchorH as number) ?? 0
    let overlayW = size?.w ?? 240
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
  } catch (e) {
    console.error(`Failed to show overlay ${label}:`, e)
  }
}

export async function hideOverlay(label: string) {
  const wv = overlays.get(label)
  if (!wv) return
  try {
    await wv.hide()
  } catch {
    // already closed
  }
}

export const DATE_PICKER_LABEL = 'date-picker-overlay'
export const DATE_RANGE_PICKER_LABEL = 'date-range-picker-overlay'
export const TIMEZONE_PICKER_LABEL = 'timezone-picker-overlay'
export const TAG_LIST_PICKER_LABEL = 'tag-list-picker-overlay'
export const GROUP_FORM_LABEL = 'group-form-overlay'
export const TW22_COLOR_PICKER_LABEL = 'tw22-color-picker-overlay'
