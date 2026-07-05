import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { listen } from '@tauri-apps/api/event';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { getCurrentWindow } from '@tauri-apps/api/window';
import i18n from '@/i18n/config';
import * as api from '@/lib/api';

const openingDialogLabels = new Set<string>();

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

async function openDialog(label: string, url: string, width: number, height: number) {
  if (openingDialogLabels.has(label)) {
    return;
  }
  openingDialogLabels.add(label);

  try {
    const existing = await WebviewWindow.getByLabel(label).catch(() => null);
    if (existing) {
      try {
        await existing.setFocus();
        return;
      } catch {
        await existing.destroy().catch(() => {});
        await waitForWindowClose(label);
      }
    }

    const mainWindow = getCurrentWindow();
    const win = new WebviewWindow(label, {
      alwaysOnTop: true,
      closable: false,
      decorations: true,
      height,
      hiddenTitle: true,
      maximizable: false,
      minimizable: false,
      parent: mainWindow,
      resizable: false,
      title: '',
      titleBarStyle: 'overlay',
      url,
      width,
    });
    win.once('tauri://error', (e) => {
      console.error(`Failed to create ${label} window:`, e);
    }).catch(() => {});
    win.once('tauri://focus', async () => {
      await win.setShadow(true).catch(() => {});
    }).catch(() => {});
  } catch (err) {
    console.error(`Error creating ${label} window:`, err);
  } finally {
    openingDialogLabels.delete(label);
  }
}

export function useMenuEvents() {
  const navigate = useNavigate();
  useEffect(() => {
    const unlisteners: Promise<() => void>[] = [];

    unlisteners.push(
      listen<string>('menu:navigate', (event) => {
        const target = event.payload;
        switch (target) {
          case '/tasks':
          case '/habits':
          case '/countdowns':
          case '/notes':
          case '/items':
            navigate(target);
            break;
          case 'manage_tags':
            openDialog('tag-management', '/dialog/tag-management', 640, 640);
            break;
          case 'manage_task_templates':
            openDialog('task-template-management', '/dialog/task-template-management', 640, 500);
            break;
          case 'manage_attachments':
            openDialog('attachment-management', '/dialog/attachment-management', 720, 560);
            break;
          case 'new_task':
            navigate('/tasks');
            setTimeout(() => window.dispatchEvent(new CustomEvent('mindless:new-task')), 100);
            break;
          case 'new_note':
            navigate('/notes');
            setTimeout(() => window.dispatchEvent(new CustomEvent('mindless:new-note')), 100);
            break;
          case 'global_search':
            window.dispatchEvent(new CustomEvent('mindless:global-search'));
            break;
          case 'preferences':
            openDialog('settings', '/dialog/settings', 800, 600);
            break;
          case 'check_update':
            break;
          case 'help_center':
            window.dispatchEvent(new CustomEvent('mindless:help'));
            break;
        }
      })
    );

    unlisteners.push(
      listen<number>('menu:priority', (event) => {
        window.dispatchEvent(new CustomEvent('menu:priority', { detail: event.payload }));
      })
    );

    unlisteners.push(
      listen<string>('menu:task_action', (event) => {
        window.dispatchEvent(new CustomEvent('menu:task_action', { detail: event.payload }));
      })
    );

    return () => {
      unlisteners.forEach((p) => p.then((fn) => fn()).catch(() => {}));
    };
  }, [navigate]);
}

export function syncMenuLanguage() {
  const labels = buildMenuLabels();
  api.updateMenuLanguage(labels).catch(console.error);
}

function buildMenuLabels(): api.MenuLabels {
  const t = i18n.getFixedT(null, 'common');
  return {
    appMenu: t('app.name'),
    about: t('menu.about', { appName: t('app.name') }),
    preferences: t('menu.preferences'),
    checkUpdate: t('menu.check_update'),
    services: t('menu.services'),
    hideApp: t('menu.hide_app', { appName: t('app.name') }),
    hideOthers: t('menu.hide_others'),
    quit: t('menu.quit', { appName: t('app.name') }),
    fileMenu: t('menu.file'),
    newTask: t('menu.new_task'),
    newNote: t('menu.new_note'),
    globalSearch: t('menu.global_search'),
    tasksMenu: t('menu.tasks'),
    priorityMenu: t('menu.set_priority'),
    priorityTraditional: t('menu.priority_traditional'),
    priorityAnoxia: t('menu.priority_anoxia'),
    priorityUrgent: t('menu.priority_urgent'),
    setDate: t('menu.set_date'),
    markCompleted: t('menu.mark_completed'),
    markClosed: t('menu.mark_closed'),
    addToToday: t('menu.add_to_today'),
    navMenu: t('menu.navigation'),
    navTasks: t('menu.switch_tasks'),
    navHabits: t('menu.switch_habits'),
    navCountdowns: t('menu.switch_countdowns'),
    navNotes: t('menu.switch_notes'),
    navItems: t('menu.switch_items'),
    manageTags: t('menu.manage_tags'),
    manageTaskTemplates: t('menu.manage_templates'),
    manageAttachments: t('menu.manage_attachments'),
    editMenu: t('menu.edit'),
    windowMenu: t('menu.window'),
    minimize: t('menu.minimize'),
    closeWindow: t('menu.close_window'),
    fillWindow: t('menu.fill_window'),
    centerWindow: t('menu.center_window'),
    reloadWindow: t('menu.reload_window'),
    showMainWindow: t('menu.show_main_window'),
    mainWindow: t('menu.main_window'),
    bringAllFront: t('menu.bring_all_front'),
    fullscreen: t('menu.fullscreen'),
    helpMenu: t('menu.help'),
    helpCenter: t('menu.help_center'),
  };
}

export function useMenuLanguageSync() {
  useEffect(() => {
    // Initial sync
    syncMenuLanguage();

    // Listen for language changes from the i18n instance
    const onLangChanged = () => syncMenuLanguage();
    i18n.on('languageChanged', onLangChanged);

    return () => {
      i18n.off('languageChanged', onLangChanged);
    };
  }, []);
}
