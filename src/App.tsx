import { useEffect, useRef, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AppLayout from './components/layout/AppLayout';
import ErrorBoundary from './components/ErrorBoundary';
import GlobalSearchDialog from './components/GlobalSearchDialog';
import HomePage from './pages/HomePage';
import TasksPage from './pages/TasksPage';
import HabitsPage from './pages/HabitsPage';
import CountdownsPage from './pages/CountdownsPage';
import TagsPage from './pages/TagsPage';
import NotesPage from './pages/NotesPage';
import PeoplePage from './pages/PeoplePage';
import SettingsPage from './pages/SettingsPage';
import ListFormDialogPage from './pages/dialogs/ListFormDialogPage';
import AdvancedGroupFormDialogPage from './pages/dialogs/AdvancedGroupFormDialogPage';
import DatePickerDialogPage from './pages/dialogs/DatePickerDialogPage';
import UnitSelectorDialogPage from './pages/dialogs/UnitSelectorDialogPage';
import { useAppStore } from './stores/useAppStore';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import * as api from './lib/api';
import { startNotificationService, stopNotificationService, ensurePermission } from './services/notificationService';

function ThemeManager() {
  const theme = useAppStore((s) => s.theme);

  useEffect(() => {
    const root = document.documentElement;

    const applyTheme = (isDark: boolean) => {
      if (isDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      applyTheme(mq.matches);
      const handler = (e: MediaQueryListEvent) => applyTheme(e.matches);
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    } else {
      applyTheme(theme === 'dark');
    }
  }, [theme]);

  return null;
}

const FONT_SIZE_MAP: Record<string, string> = {
  small: '14px',
  default: '16px',
  large: '18px',
  xlarge: '20px',
};

function FontSizeManager() {
  const fontSize = useAppStore((s) => s.fontSize);

  useEffect(() => {
    document.documentElement.style.fontSize = FONT_SIZE_MAP[fontSize] || FONT_SIZE_MAP.default;
  }, [fontSize]);

  return null;
}

/**
 * Loads settings from SQLite on mount, syncs to Zustand store + i18n,
 * and writes settings back to SQLite whenever they change.
 */
function SettingsSync() {
  const { i18n } = useTranslation();
  const { theme, language, priorityMode, notificationEnabled, weekStartDay, fontSize, taskSortBy, taskSortOrder, taskGroupBy, setTheme, setLanguage, setPriorityMode, setNotificationEnabled, setWeekStartDay } = useAppStore();
  const isInitialLoad = useRef(true);

  // Load settings from SQLite on mount
  useEffect(() => {
    api.getSettings().then((entries) => {
      const map = new Map(entries);
      const dbTheme = map.get('theme') as 'light' | 'dark' | 'system' | undefined;
      const dbLang = map.get('language') as 'zh' | 'en' | 'ja' | undefined;
      const dbPriority = map.get('priority_mode') as 'simple' | 'detailed' | undefined;
      const dbNotif = map.get('notification_enabled');
      const dbWeekStart = map.get('week_start_day');
      const dbTaskSortBy = map.get('task_sort_by') as 'sortOrder' | 'dueDate' | 'startDate' | 'priority' | 'createdAt' | undefined;
      const dbTaskSortOrder = map.get('task_sort_order') as 'asc' | 'desc' | undefined;
      const dbTaskGroupBy = map.get('task_group_by') as 'none' | 'priority' | 'list' | undefined;
      const dbFontSize = map.get('font_size') as 'small' | 'default' | 'large' | 'xlarge' | undefined;

      if (dbTheme && ['light', 'dark', 'system'].includes(dbTheme)) {
        setTheme(dbTheme);
      }
      if (dbLang && ['zh', 'en', 'ja'].includes(dbLang)) {
        setLanguage(dbLang);
        i18n.changeLanguage(dbLang);
      }
      if (dbPriority && ['simple', 'detailed'].includes(dbPriority)) {
        setPriorityMode(dbPriority);
      }
      if (dbNotif !== undefined) {
        setNotificationEnabled(dbNotif === '1');
      }
      if (dbWeekStart !== undefined) {
        const val = parseInt(dbWeekStart, 10);
        if (val === 0 || val === 1) setWeekStartDay(val);
      }
      if (dbTaskSortBy && ['sortOrder', 'dueDate', 'startDate', 'priority', 'createdAt'].includes(dbTaskSortBy)) {
        useAppStore.getState().setTaskSortBy(dbTaskSortBy);
      }
      if (dbTaskSortOrder && ['asc', 'desc'].includes(dbTaskSortOrder)) {
        useAppStore.getState().setTaskSortOrder(dbTaskSortOrder);
      }
      if (dbTaskGroupBy && ['none', 'priority', 'list'].includes(dbTaskGroupBy)) {
        useAppStore.getState().setTaskGroupBy(dbTaskGroupBy);
      }
      if (dbFontSize && ['small', 'default', 'large', 'xlarge'].includes(dbFontSize)) {
        useAppStore.getState().setFontSize(dbFontSize);
      }
      isInitialLoad.current = false;
    }).catch((err) => {
      console.warn('Failed to load settings from database:', err);
      isInitialLoad.current = false;
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Write settings to SQLite whenever they change (skip initial load)
  useEffect(() => {
    if (isInitialLoad.current) return;
    api.updateSettings([
      ['theme', theme],
      ['language', language],
      ['priority_mode', priorityMode],
      ['notification_enabled', notificationEnabled ? '1' : '0'],
      ['week_start_day', String(weekStartDay)],
      ['task_sort_by', taskSortBy],
      ['task_sort_order', taskSortOrder],
      ['task_group_by', taskGroupBy],
      ['font_size', fontSize],
    ]).catch((err) => {
      console.warn('Failed to save settings to database:', err);
    });
  }, [theme, language, priorityMode, notificationEnabled, weekStartDay, taskSortBy, taskSortOrder, taskGroupBy, fontSize]);

  return null;
}

/**
 * Manages the notification service lifecycle.
 * Starts/stops periodic checks based on user preference.
 */
function NotificationManager() {
  const notificationEnabled = useAppStore((s) => s.notificationEnabled);

  useEffect(() => {
    if (!notificationEnabled) {
      stopNotificationService();
      return;
    }

    let stopped = false;

    ensurePermission().then((granted) => {
      if (granted && !stopped) {
        startNotificationService();
      }
    }).catch((err) => {
      console.warn('Notification permission request failed:', err);
    });

    return () => {
      stopped = true;
      stopNotificationService();
    };
  }, [notificationEnabled]);

  return null;
}

function KeyboardShortcuts() {
  useKeyboardShortcuts();
  return null;
}

function GlobalSearchManager() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handler = () => setIsOpen(true);
    window.addEventListener('mindless:global-search', handler);
    return () => window.removeEventListener('mindless:global-search', handler);
  }, []);

  return <GlobalSearchDialog isOpen={isOpen} onClose={() => setIsOpen(false)} />;
}

function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <ThemeManager />
        <FontSizeManager />
        <SettingsSync />
        <NotificationManager />
        <KeyboardShortcuts />
        <GlobalSearchManager />
        <Routes>
          <Route path="/dialog/list-form" element={<ListFormDialogPage />} />
          <Route path="/dialog/advanced-group-form" element={<AdvancedGroupFormDialogPage />} />
          <Route path="/dialog/date-picker" element={<DatePickerDialogPage />} />
          <Route path="/dialog/unit-selector" element={<UnitSelectorDialogPage />} />
          <Route path="*" element={
            <AppLayout>
              <Routes>
                <Route path="/" element={<ErrorBoundary><HomePage /></ErrorBoundary>} />
                <Route path="/tasks" element={<ErrorBoundary><TasksPage /></ErrorBoundary>} />
                <Route path="/habits" element={<ErrorBoundary><HabitsPage /></ErrorBoundary>} />
                <Route path="/countdowns" element={<ErrorBoundary><CountdownsPage /></ErrorBoundary>} />
                <Route path="/tags" element={<ErrorBoundary><TagsPage /></ErrorBoundary>} />
                <Route path="/notes" element={<ErrorBoundary><NotesPage /></ErrorBoundary>} />
                <Route path="/people" element={<ErrorBoundary><PeoplePage /></ErrorBoundary>} />
                <Route path="/settings" element={<ErrorBoundary><SettingsPage /></ErrorBoundary>} />
              </Routes>
            </AppLayout>
          } />
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  );
}

export default App;
