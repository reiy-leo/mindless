import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useViewStore } from '@/stores/useViewStore';

type ViewMode = 'list' | 'calendar' | 'kanban' | 'matrix';

const VIEW_KEYS: Record<string, ViewMode> = {
  '1': 'list',
  '2': 'calendar',
  '3': 'kanban',
  '4': 'matrix',
};

let isOpeningSettingsDialog = false;

async function waitForWindowClose(label: string, timeoutMs = 2000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const win = await WebviewWindow.getByLabel(label).catch(() => null);
    if (!win) return;
    try {
      await win.close();
    } catch {}
    await new Promise(r => setTimeout(r, 50));
  }
}

async function openSettingsDialog() {
  if (isOpeningSettingsDialog) {
    return;
  }
  isOpeningSettingsDialog = true;

  try {
    const existing = await WebviewWindow.getByLabel('settings').catch(() => null);
    if (existing) {
      try {
        await existing.setFocus();
        return;
      } catch {
        await existing.destroy().catch(() => {});
        await waitForWindowClose('settings');
      }
    }

    const mainWindow = getCurrentWindow();
    const mainPos = await mainWindow.outerPosition();
    const mainSize = await mainWindow.outerSize();
    const scaleFactor = await mainWindow.scaleFactor();

    const logicalX = mainPos.x / scaleFactor;
    const logicalY = mainPos.y / scaleFactor;
    const logicalW = mainSize.width / scaleFactor;
    const logicalH = mainSize.height / scaleFactor;

    const winWidth = 800;
    const winHeight = 600;
    const x = Math.round(logicalX + (logicalW - winWidth) / 2);
    const y = Math.round(logicalY + (logicalH - winHeight) / 2);

    const win = new WebviewWindow('settings', {
      alwaysOnTop: true,
      closable: false,
      decorations: true,
      height: winHeight,
      hiddenTitle: true,
      maximizable: false,
      minimizable: false,
      parent: mainWindow,
      resizable: false,
      title: '',
      titleBarStyle: 'overlay',
      url: '/dialog/settings',
      width: winWidth,
      x,
      y,
    });
    win.once('tauri://error', (e) => {
      console.error('Failed to create settings window:', e);
    }).catch(() => {});
  } catch (err) {
    console.error('Error creating settings window:', err);
  } finally {
    isOpeningSettingsDialog = false;
  }
}

async function openTagManagementDialog() {
  try {
    const existing = await WebviewWindow.getByLabel('tag-management');
    if (existing) {
      try {
        await existing.setFocus();
        return;
      } catch {
        await existing.destroy().catch(() => {});
        await waitForWindowClose('tag-management');
      }
    }
  } catch {}

  try {
    const mainWindow = getCurrentWindow();
    const win = new WebviewWindow('tag-management', {
      alwaysOnTop: true,
      closable: false,
      decorations: true,
      height: 640,
      hiddenTitle: true,
      maximizable: false,
      minimizable: false,
      parent: mainWindow,
      resizable: false,
      title: '',
      titleBarStyle: 'overlay',
      url: '/dialog/tag-management',
      width: 640,
    });
    win.once('tauri://error', (e) => {
      console.error('Failed to create tag-management window:', e);
    });
    win.once('tauri://focus', async () => {
      await win.setShadow(true);
    });
  } catch (err) {
    console.error('Error creating tag-management window:', err);
  }
}

async function openAttachmentManagementDialog() {
  try {
    const existing = await WebviewWindow.getByLabel('attachment-management');
    if (existing) {
      try {
        await existing.setFocus();
        return;
      } catch {
        await existing.destroy().catch(() => {});
        await waitForWindowClose('attachment-management');
      }
    }
  } catch {}

  try {
    const mainWindow = getCurrentWindow();
    const win = new WebviewWindow('attachment-management', {
      alwaysOnTop: true,
      closable: false,
      decorations: true,
      height: 560,
      hiddenTitle: true,
      maximizable: false,
      minimizable: false,
      parent: mainWindow,
      resizable: false,
      title: '',
      titleBarStyle: 'overlay',
      url: '/dialog/attachment-management',
      width: 720,
    });
    win.once('tauri://error', (e) => {
      console.error('Failed to create attachment-management window:', e);
    });
    win.once('tauri://focus', async () => {
      await win.setShadow(true);
    });
  } catch (err) {
    console.error('Error creating attachment-management window:', err);
  }
}

async function openTemplateManagementDialog() {
  try {
    const existing = await WebviewWindow.getByLabel('task-template-management');
    if (existing) {
      try {
        await existing.setFocus();
        return;
      } catch {
        await existing.destroy().catch(() => {});
        await waitForWindowClose('task-template-management');
      }
    }
  } catch {}

  try {
    const mainWindow = getCurrentWindow();
    const win = new WebviewWindow('task-template-management', {
      alwaysOnTop: true,
      closable: false,
      decorations: true,
      height: 500,
      hiddenTitle: true,
      maximizable: false,
      minimizable: false,
      parent: mainWindow,
      resizable: false,
      title: '',
      titleBarStyle: 'overlay',
      url: '/dialog/task-template-management',
      width: 640,
    });
    win.once('tauri://error', (e) => {
      console.error('Failed to create task-template-management window:', e);
    });
    win.once('tauri://focus', async () => {
      await win.setShadow(true);
    });
  } catch (err) {
    console.error('Error creating task-template-management window:', err);
  }
}

export function useKeyboardShortcuts() {
  const navigate = useNavigate();
  const location = useLocation();
  const setViewMode = useViewStore((s) => s.setViewMode);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      const tag = (e.target as HTMLElement)?.tagName;
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (e.target as HTMLElement)?.isContentEditable;

      if (!meta) {
        if (e.key === 'Escape' && !isInput) {
          window.dispatchEvent(new CustomEvent('mindless:escape'));
          return;
        }

        if (!e.altKey && !e.shiftKey && !isInput && location.pathname === '/tasks') {
          const mode = VIEW_KEYS[e.key];
          if (mode) {
            e.preventDefault();
            setViewMode(mode);
            return;
          }
        }
        return;
      }

      // Cmd+,: Settings dialog
      if (e.key === ',') {
        e.preventDefault();
        openSettingsDialog();
        return;
      }

      // Cmd+N: New task
      if (e.key === 'n') {
        e.preventDefault();
        if (location.pathname !== '/tasks') {
          navigate('/tasks');
        }
        window.dispatchEvent(new CustomEvent('mindless:new-task'));
        return;
      }

      // Cmd+F: Global search
      if (e.key === 'f') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('mindless:global-search'));
        return;
      }

      // Cmd+T: Task template management dialog
      if (e.key === 't') {
        e.preventDefault();
        openTemplateManagementDialog();
        return;
      }

      // Cmd+Shift+T: Tasks (changed from Cmd+T)
      if (e.key === 'T' && e.shiftKey) {
        e.preventDefault();
        navigate('/tasks');
        return;
      }

      // Cmd+H: Habits
      if (e.key === 'h') {
        e.preventDefault();
        navigate('/habits');
        return;
      }

      // Cmd+D: Countdowns
      if (e.key === 'd') {
        e.preventDefault();
        navigate('/countdowns');
        return;
      }

      // Cmd+B: Tags management dialog
      if (e.key === 'b') {
        e.preventDefault();
        openTagManagementDialog();
        return;
      }

      // Cmd+Shift+B: Attachment management dialog
      if (e.key === 'B' && e.shiftKey) {
        e.preventDefault();
        openAttachmentManagementDialog();
        return;
      }

      // Cmd+Y: Media
      if (e.key === 'y') {
        e.preventDefault();
        navigate('/media');
        return;
      }

      // Cmd+P: People
      if (e.key === 'p') {
        e.preventDefault();
        navigate('/people');
        return;
      }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [navigate, location.pathname, setViewMode]);
}
