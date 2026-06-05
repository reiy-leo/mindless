import { useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AppLayout from './components/layout/AppLayout';
import HomePage from './pages/HomePage';
import TasksPage from './pages/TasksPage';
import HabitsPage from './pages/HabitsPage';
import CountdownsPage from './pages/CountdownsPage';
import TagsPage from './pages/TagsPage';
import SettingsPage from './pages/SettingsPage';
import { useAppStore } from './stores/useAppStore';
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

/**
 * Loads settings from SQLite on mount, syncs to Zustand store + i18n,
 * and writes settings back to SQLite whenever they change.
 */
function SettingsSync() {
  const { i18n } = useTranslation();
  const { theme, language, priorityMode, notificationEnabled, setTheme, setLanguage, setPriorityMode, setNotificationEnabled } = useAppStore();
  const isInitialLoad = useRef(true);

  // Load settings from SQLite on mount
  useEffect(() => {
    api.getSettings().then((entries) => {
      const map = new Map(entries);
      const dbTheme = map.get('theme') as 'light' | 'dark' | 'system' | undefined;
      const dbLang = map.get('language') as 'zh' | 'en' | 'ja' | undefined;
      const dbPriority = map.get('priority_mode') as 'simple' | 'detailed' | undefined;
      const dbNotif = map.get('notification_enabled');

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
    ]).catch((err) => {
      console.warn('Failed to save settings to database:', err);
    });
  }, [theme, language, priorityMode, notificationEnabled]);

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

function App() {
  return (
    <BrowserRouter>
      <ThemeManager />
      <SettingsSync />
      <NotificationManager />
      <AppLayout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/habits" element={<HabitsPage />} />
          <Route path="/countdowns" element={<CountdownsPage />} />
          <Route path="/tags" element={<TagsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  );
}

export default App;
