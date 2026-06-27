import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { emit, listen } from '@tauri-apps/api/event';

export interface AnchorRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface OpenDialogOptions {
  label: string;
  title: string;
  width?: number;
  height?: number;
  url: string;
  anchorRect?: AnchorRect;
  onClose?: () => void;
}

export async function openDialogWindow(options: OpenDialogOptions): Promise<WebviewWindow> {
  const {
    label,
    title,
    width = 480,
    height = 600,
    url,
    anchorRect,
    onClose,
  } = options;

  const existingWindow = await WebviewWindow.getByLabel(label);
  if (existingWindow) {
    try {
      await existingWindow.setFocus();
      return existingWindow;
    } catch {
      await existingWindow.destroy().catch(() => {});
    }
  }

  // Build URL with anchor position params
  let finalUrl = url;
  if (anchorRect) {
    const separator = url.includes('?') ? '&' : '?';
    finalUrl = `${url}${separator}anchorX=${anchorRect.x}&anchorY=${anchorRect.y}&anchorW=${anchorRect.width}&anchorH=${anchorRect.height}&winW=${width}&winH=${height}`;
  }

  const webview = new WebviewWindow(label, {
    url: finalUrl,
    title,
    width,
    height,
    resizable: false,
    decorations: false,
    transparent: true,
    center: !anchorRect,
    alwaysOnTop: true,
  });

  webview.once('tauri://error', (e) => {
    console.error('Failed to create dialog window:', e);
  });

  if (onClose) {
    webview.once('tauri://close-requested', () => {
      onClose();
    });
  }

  return webview;
}

export async function closeDialogWindow(_label: string) {
  const win = await WebviewWindow.getByLabel(_label);
  if (win) {
    await win.close();
  }
}

export async function emitToDialog(_label: string, event: string, payload: unknown) {
  await emit(event, payload);
}

export async function listenFromDialog(event: string, handler: (payload: unknown) => void) {
  return await listen(event, (e) => handler(e.payload));
}
