import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { listen } from '@tauri-apps/api/event';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useTranslation } from 'react-i18next';
import * as api from '@/lib/api';

async function openDialog(label: string, url: string, width: number, height: number) {
  try {
    const existing = await WebviewWindow.getByLabel(label);
    if (existing) {
      await existing.setFocus();
      return;
    }
  } catch {}

  try {
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
    });
    win.once('tauri://focus', async () => {
      await win.setShadow(true);
    });
  } catch (err) {
    console.error(`Error creating ${label} window:`, err);
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
            navigate(target);
            break;
          case 'manage_tags':
            openDialog('tag-management', '/dialog/tag-management', 640, 640);
            break;
          case 'manage_attachments':
            openDialog('attachment-management', '/dialog/attachment-management', 720, 560);
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
      unlisteners.forEach((p) => p.then((fn) => fn()));
    };
  }, [navigate]);
}

export function useMenuLanguageSync() {
  const { t, i18n } = useTranslation('common');

  useEffect(() => {
    const updateMenu = () => {
      const labels: api.MenuLabels = {
        appMenu: t('app.name'),
        quit: t('menu.quit', { appName: t('app.name') }),
        tasksMenu: t('menu.tasks'),
        priorityMenu: t('menu.set_priority'),
        priorityTraditional: t('menu.priority_traditional'),
        priorityAnoxia: t('menu.priority_anoxia'),
        setDate: t('menu.set_date'),
        markCompleted: t('menu.mark_completed'),
        markClosed: t('menu.mark_closed'),
        addToToday: t('menu.add_to_today'),
        navMenu: t('menu.navigation'),
        navTasks: t('menu.switch_tasks'),
        navHabits: t('menu.switch_habits'),
        navCountdowns: t('menu.switch_countdowns'),
        navNotes: t('menu.switch_notes'),
        manageTags: t('menu.manage_tags'),
        manageAttachments: t('menu.manage_attachments'),
        editMenu: t('menu.edit'),
      };
      api.updateMenuLanguage(labels).catch(console.error);
    };

    updateMenu();
    i18n.on('languageChanged', updateMenu);
    return () => {
      i18n.off('languageChanged', updateMenu);
    };
  }, [t, i18n]);
}
