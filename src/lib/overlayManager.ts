import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { emit } from '@tauri-apps/api/event';

interface OverlayDef {
  label: string;
  route: string;
  width: number;
  height: number;
}

const OVERLAYS: OverlayDef[] = [
  { label: 'date-picker-overlay', route: '/overlay/date-picker', width: 240, height: 435 },
  { label: 'date-range-picker-overlay', route: '/overlay/date-range-picker', width: 250, height: 400 },
  { label: 'timezone-picker-overlay', route: '/overlay/timezone-picker', width: 320, height: 400 },
];

const overlays = new Map<string, WebviewWindow>();

export async function initOverlayWebviews(baseUrl: string) {
  for (const def of OVERLAYS) {
    if (overlays.has(def.label)) continue;

    const existing = await WebviewWindow.getByLabel(def.label);
    if (existing) {
      overlays.set(def.label, existing);
      continue;
    }

    const wv = new WebviewWindow(def.label, {
      url: `${baseUrl}${def.route}`,
      width: def.width,
      height: def.height,
      resizable: false,
      decorations: false,
      transparent: true,
      visible: false,
      alwaysOnTop: true,
    });

    wv.once('tauri://error', (e) => {
      console.error(`Failed to create overlay ${def.label}:`, e);
    });

    overlays.set(def.label, wv);
  }
}

export async function showOverlay(label: string, _x: number, _y: number, payload: Record<string, unknown>) {
  const wv = overlays.get(label);
  if (!wv) return;

  try {
    await wv.show();
    await wv.setFocus();
    await emit(`${label}:show`, payload);
  } catch (e) {
    console.error(`Failed to show overlay ${label}:`, e);
  }
}

export async function hideOverlay(label: string) {
  const wv = overlays.get(label);
  if (!wv) return;
  try {
    await wv.hide();
  } catch {
    // already closed
  }
}

export const DATE_PICKER_LABEL = 'date-picker-overlay';
export const DATE_RANGE_PICKER_LABEL = 'date-range-picker-overlay';
export const TIMEZONE_PICKER_LABEL = 'timezone-picker-overlay';
