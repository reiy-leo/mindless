import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { emit, listen } from '@tauri-apps/api/event';

interface OpenDialogOptions {
  label: string;
  title: string;
  width?: number;
  height?: number;
  url: string;
  onClose?: () => void;
}

export async function openDialogWindow(options: OpenDialogOptions): Promise<WebviewWindow> {
  const {
    label,
    title,
    width = 480,
    height = 600,
    url,
    onClose,
  } = options;

  const existingWindow = await WebviewWindow.getByLabel(label);
  if (existingWindow) {
    await existingWindow.setFocus();
    return existingWindow;
  }

  const webview = new WebviewWindow(label, {
    url,
    title,
    width,
    height,
    resizable: false,
    decorations: true,
    center: true,
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
