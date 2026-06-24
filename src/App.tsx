import { listen } from '@tauri-apps/api/event'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import ErrorBoundary from './components/ErrorBoundary'
import GlobalSearchDialog from './components/GlobalSearchDialog'
import AppLayout from './components/layout/AppLayout'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import * as api from './lib/api'
import { initOverlayWebviews } from './lib/overlayManager'
import CountdownsPage from './pages/CountdownsPage'
import AdvancedGroupFormDialogPage from './pages/dialogs/AdvancedGroupFormDialogPage'
import CountdownFormDialogPage from './pages/dialogs/CountdownFormDialogPage'
import EmojiPickerDialogPage from './pages/dialogs/EmojiPickerDialogPage'
import ListFormDialogPage from './pages/dialogs/ListFormDialogPage'
import SettingsDialogPage from './pages/dialogs/SettingsDialogPage'
import TagManagementDialogPage from './pages/dialogs/TagManagementDialogPage'
import UnitSelectorDialogPage from './pages/dialogs/UnitSelectorDialogPage'
import HabitsPage from './pages/HabitsPage'
import HomePage from './pages/HomePage'
import MediaPage from './pages/MediaPage'
import NotesPage from './pages/NotesPage'
import DatePickerOverlayPage from './pages/overlays/DatePickerOverlayPage'
import DateRangePickerOverlayPage from './pages/overlays/DateRangePickerOverlayPage'
import TagListPickerOverlayPage from './pages/overlays/TagListPickerOverlayPage'
import TimezonePickerOverlayPage from './pages/overlays/TimezonePickerOverlayPage'
import PeoplePage from './pages/PeoplePage'
import SettingsPage from './pages/SettingsPage'
import TagsPage from './pages/TagsPage'
import TasksPage from './pages/TasksPage'
import { ensurePermission, startNotificationService, stopNotificationService } from './services/notificationService'
import { type DateFormat, type FontSize, type TimeFormat, type TimezoneFormat, useAppStore } from './stores/useAppStore'
import type { Language, PriorityMode, Theme } from './types'

function ThemeManager() {
  const theme = useAppStore((s) => s.theme)

  useEffect(() => {
    const root = document.documentElement

    const applyTheme = (isDark: boolean) => {
      if (isDark) {
        root.classList.add('dark')
      } else {
        root.classList.remove('dark')
      }
    }

    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      applyTheme(mq.matches)
      const handler = (e: MediaQueryListEvent) => applyTheme(e.matches)
      mq.addEventListener('change', handler)
      return () => mq.removeEventListener('change', handler)
    } else {
      applyTheme(theme === 'dark')
    }
  }, [theme])

  return null
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = hex.replace('#', '').match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i)
  if (!m) {
    return null
  }
  return { b: parseInt(m[3], 16), g: parseInt(m[2], 16), r: parseInt(m[1], 16) }
}

function ThemeColorManager() {
  const themeColor = useAppStore((s) => s.themeColor)
  const theme = useAppStore((s) => s.theme)

  useEffect(() => {
    const root = document.documentElement
    const rgb = hexToRgb(themeColor)
    if (rgb) {
      root.style.setProperty('--theme-color', themeColor)
      root.style.setProperty('--theme-r', String(rgb.r))
      root.style.setProperty('--theme-g', String(rgb.g))
      root.style.setProperty('--theme-b', String(rgb.b))
    }
  }, [themeColor])

  useEffect(() => {
    const applyColors = (isDark: boolean) => {
      const root = document.documentElement
      root.style.setProperty(
        '--theme-bg-70',
        isDark ? `color-mix(in srgb, ${themeColor} 70%, #1f2937)` : `color-mix(in srgb, ${themeColor} 70%, white)`,
      )
      root.style.setProperty(
        '--theme-bg-50',
        isDark ? `color-mix(in srgb, ${themeColor} 50%, #1f2937)` : `color-mix(in srgb, ${themeColor} 50%, white)`,
      )
      root.style.setProperty(
        '--theme-bg-30',
        isDark ? `color-mix(in srgb, ${themeColor} 30%, #1f2937)` : `color-mix(in srgb, ${themeColor} 30%, white)`,
      )
      root.style.setProperty(
        '--theme-bg-20',
        isDark ? `color-mix(in srgb, ${themeColor} 20%, #1f2937)` : `color-mix(in srgb, ${themeColor} 20%, white)`,
      )
      root.style.setProperty(
        '--theme-bg-2',
        isDark ? `color-mix(in srgb, ${themeColor} 2%, #1f2937)` : `color-mix(in srgb, ${themeColor} 2%, white)`,
      )
      root.style.setProperty(
        '--theme-text-70',
        isDark ? `color-mix(in srgb, ${themeColor} 70%, #f3f4f6)` : `color-mix(in srgb, ${themeColor} 70%, #111827)`,
      )
      root.style.setProperty(
        '--theme-text-30',
        isDark ? `color-mix(in srgb, ${themeColor} 30%, #f3f4f6)` : `color-mix(in srgb, ${themeColor} 30%, #111827)`,
      )
    }

    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      applyColors(mq.matches)
      const handler = (e: MediaQueryListEvent) => applyColors(e.matches)
      mq.addEventListener('change', handler)
      return () => mq.removeEventListener('change', handler)
    } else {
      applyColors(theme === 'dark')
    }
  }, [themeColor, theme])

  return null
}

const FONT_SIZE_MAP: Record<string, string> = {
  default: '16px',
  large: '18px',
  small: '14px',
  xlarge: '20px',
}

function FontSizeManager() {
  const fontSize = useAppStore((s) => s.fontSize)

  useEffect(() => {
    document.documentElement.style.fontSize = FONT_SIZE_MAP[fontSize] || FONT_SIZE_MAP.default
  }, [fontSize])

  return null
}

/**
 * Loads settings from SQLite on mount, syncs to Zustand store + i18n,
 * and writes settings back to SQLite whenever they change.
 */
function SettingsSync() {
  const { i18n } = useTranslation()
  const {
    theme,
    themeColor,
    language,
    priorityMode,
    notificationEnabled,
    weekStartDay,
    fontSize,
    taskSortBy,
    taskSortOrder,
    taskGroupBy,
    showLunar,
    showTimezone,
    selectedTimezone,
    timeFormat,
    dateFormat,
    timezoneFormat,
    setTheme,
    setThemeColor,
    setLanguage,
    setPriorityMode,
    setNotificationEnabled,
    setWeekStartDay,
    setShowLunar,
    setShowTimezone,
    setSelectedTimezone,
    setTimeFormat,
    setDateFormat,
    setTimezoneFormat,
  } = useAppStore()
  const isInitialLoad = useRef(true)

  // Load settings from SQLite on mount
  useEffect(() => {
    api
      .getSettings()
      .then((entries) => {
        const map = new Map(entries)
        const dbTheme = map.get('theme') as 'light' | 'dark' | 'system' | undefined
        const dbLang = map.get('language') as 'zh' | 'en' | 'ja' | undefined
        const dbPriority = map.get('priority_mode') as PriorityMode | undefined
        const dbNotif = map.get('notification_enabled')
        const dbWeekStart = map.get('week_start_day')
        const dbTaskSortBy = map.get('task_sort_by') as
          | 'sortOrder'
          | 'dueDate'
          | 'startDate'
          | 'priority'
          | 'createdAt'
          | undefined
        const dbTaskSortOrder = map.get('task_sort_order') as 'asc' | 'desc' | undefined
        const dbTaskGroupBy = map.get('task_group_by') as 'none' | 'priority' | 'list' | undefined
        const dbFontSize = map.get('font_size') as 'small' | 'default' | 'large' | 'xlarge' | undefined
        const dbThemeColor = map.get('theme_color')

        if (dbTheme && ['light', 'dark', 'system'].includes(dbTheme)) {
          setTheme(dbTheme)
        }
        if (dbThemeColor && /^#[0-9a-fA-F]{6}$/.test(dbThemeColor)) {
          setThemeColor(dbThemeColor)
        }
        if (dbLang && ['zh', 'en', 'ja'].includes(dbLang)) {
          setLanguage(dbLang)
          i18n.changeLanguage(dbLang)
        }
        if (dbPriority && ['Traditional', 'OxygenNotIncluded'].includes(dbPriority)) {
          setPriorityMode(dbPriority)
        }
        if (dbNotif !== undefined) {
          setNotificationEnabled(dbNotif === '1')
        }
        if (dbWeekStart !== undefined) {
          const val = parseInt(dbWeekStart, 10)
          if (val >= 0 && val <= 6) {
            setWeekStartDay(val)
          }
        }
        const dbShowLunar = map.get('show_lunar')
        const dbShowTimezone = map.get('show_timezone')
        const dbSelectedTimezone = map.get('selected_timezone')
        const dbTimeFormat = map.get('time_format')
        const dbDateFormat = map.get('date_format')
        const dbTimezoneFormat = map.get('timezone_format')
        if (dbShowLunar !== undefined) {
          setShowLunar(dbShowLunar === '1')
        }
        if (dbShowTimezone !== undefined) {
          setShowTimezone(dbShowTimezone === '1')
        }
        if (dbSelectedTimezone && typeof dbSelectedTimezone === 'string') {
          setSelectedTimezone(dbSelectedTimezone)
        }
        if (dbTimeFormat && ['cn_natural', 'cn_24h', 'cn_12h', 'en_12h', '24h'].includes(dbTimeFormat)) {
          setTimeFormat(dbTimeFormat as TimeFormat)
        }
        if (
          dbDateFormat &&
          ['relative', 'yyyy_slash_mm_dd', 'yyyy_dash_mm_dd', 'mm_dd_yyyy', 'mm_dd'].includes(dbDateFormat)
        ) {
          setDateFormat(dbDateFormat as DateFormat)
        }
        if (
          dbTimezoneFormat &&
          ['short_offset', 'iana', 'compact', 'gmt', 'utc_colon', 'iso_colon', 'cn_zone'].includes(dbTimezoneFormat)
        ) {
          setTimezoneFormat(dbTimezoneFormat as TimezoneFormat)
        }
        if (dbTaskSortBy && ['sortOrder', 'dueDate', 'startDate', 'priority', 'createdAt'].includes(dbTaskSortBy)) {
          useAppStore.getState().setTaskSortBy(dbTaskSortBy)
        }
        if (dbTaskSortOrder && ['asc', 'desc'].includes(dbTaskSortOrder)) {
          useAppStore.getState().setTaskSortOrder(dbTaskSortOrder)
        }
        if (dbTaskGroupBy && ['none', 'priority', 'list'].includes(dbTaskGroupBy)) {
          useAppStore.getState().setTaskGroupBy(dbTaskGroupBy)
        }
        if (dbFontSize && ['small', 'default', 'large', 'xlarge'].includes(dbFontSize)) {
          useAppStore.getState().setFontSize(dbFontSize)
        }
        isInitialLoad.current = false
      })
      .catch((err) => {
        console.warn('Failed to load settings from database:', err)
        isInitialLoad.current = false
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Write settings to SQLite whenever they change (skip initial load)
  useEffect(() => {
    if (isInitialLoad.current) {
      return
    }
    api
      .updateSettings([
        ['theme', theme],
        ['theme_color', themeColor],
        ['language', language],
        ['priority_mode', priorityMode],
        ['notification_enabled', notificationEnabled ? '1' : '0'],
        ['week_start_day', String(weekStartDay)],
        ['show_lunar', showLunar ? '1' : '0'],
        ['show_timezone', showTimezone ? '1' : '0'],
        ['selected_timezone', selectedTimezone],
        ['time_format', timeFormat],
        ['date_format', dateFormat],
        ['timezone_format', timezoneFormat],
        ['task_sort_by', taskSortBy],
        ['task_sort_order', taskSortOrder],
        ['task_group_by', taskGroupBy],
        ['font_size', fontSize],
      ])
      .catch((err) => {
        console.warn('Failed to save settings to database:', err)
      })
  }, [
    theme,
    themeColor,
    language,
    priorityMode,
    notificationEnabled,
    weekStartDay,
    showLunar,
    showTimezone,
    selectedTimezone,
    timeFormat,
    dateFormat,
    timezoneFormat,
    taskSortBy,
    taskSortOrder,
    taskGroupBy,
    fontSize,
  ])

  // Listen for settings changes from other windows (e.g. settings dialog)
  useEffect(() => {
    const unlisten = listen<{ key: string; value: unknown }>('settings:changed', (event) => {
      const { key, value } = event.payload
      const store = useAppStore.getState()
      switch (key) {
        case 'theme':
          store.setTheme(value as Theme)
          break
        case 'themeColor':
          store.setThemeColor(value as string)
          break
        case 'language':
          store.setLanguage(value as Language)
          i18n.changeLanguage(value as string)
          break
        case 'fontSize':
          store.setFontSize(value as FontSize)
          break
        case 'priorityMode':
          store.setPriorityMode(value as any)
          break
        case 'notificationEnabled':
          store.setNotificationEnabled(value as boolean)
          break
        case 'weekStartDay':
          store.setWeekStartDay(value as number)
          break
        case 'showLunar':
          store.setShowLunar(value as boolean)
          break
        case 'showTimezone':
          store.setShowTimezone(value as boolean)
          break
        case 'selectedTimezone':
          store.setSelectedTimezone(value as string)
          break
        case 'timeFormat':
          store.setTimeFormat(value as any)
          break
        case 'dateFormat':
          store.setDateFormat(value as any)
          break
        case 'timezoneFormat':
          store.setTimezoneFormat(value as any)
          break
      }
    })
    return () => {
      unlisten.then((fn) => fn())
    }
  }, [i18n])

  return null
}

/**
 * Manages the notification service lifecycle.
 * Starts/stops periodic checks based on user preference.
 */
function NotificationManager() {
  const notificationEnabled = useAppStore((s) => s.notificationEnabled)

  useEffect(() => {
    if (!notificationEnabled) {
      stopNotificationService()
      return
    }

    let stopped = false

    ensurePermission()
      .then((granted) => {
        if (granted && !stopped) {
          startNotificationService()
        }
      })
      .catch((err) => {
        console.warn('Notification permission request failed:', err)
      })

    return () => {
      stopped = true
      stopNotificationService()
    }
  }, [notificationEnabled])

  return null
}

function KeyboardShortcuts() {
  useKeyboardShortcuts()
  return null
}

function OverlayManager() {
  useEffect(() => {
    initOverlayWebviews(window.location.origin)
  }, [])
  return null
}

function GlobalSearchManager() {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const handler = () => setIsOpen(true)
    window.addEventListener('mindless:global-search', handler)
    return () => window.removeEventListener('mindless:global-search', handler)
  }, [])

  return <GlobalSearchDialog isOpen={isOpen} onClose={() => setIsOpen(false)} />
}

function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <ThemeManager />
        <ThemeColorManager />
        <FontSizeManager />
        <SettingsSync />
        <NotificationManager />
        <KeyboardShortcuts />
        <OverlayManager />
        <GlobalSearchManager />
        <Routes>
          <Route path="/dialog/list-form" element={<ListFormDialogPage />} />
          <Route path="/dialog/advanced-group-form" element={<AdvancedGroupFormDialogPage />} />
          {/* <Route path="/dialog/date-picker" element={<DatePickerDialogPage />} /> */}
          <Route path="/dialog/unit-selector" element={<UnitSelectorDialogPage />} />
          <Route path="/dialog/tag-management" element={<TagManagementDialogPage />} />
          <Route path="/dialog/settings" element={<SettingsDialogPage />} />
          <Route path="/dialog/emoji-picker" element={<EmojiPickerDialogPage />} />
          <Route path="/dialog/countdown-form" element={<CountdownFormDialogPage />} />
          <Route path="/overlay/date-picker" element={<DatePickerOverlayPage />} />
          <Route path="/overlay/date-range-picker" element={<DateRangePickerOverlayPage />} />
          <Route path="/overlay/timezone-picker" element={<TimezonePickerOverlayPage />} />
          <Route path="/overlay/tag-list-picker" element={<TagListPickerOverlayPage />} />
          <Route
            path="*"
            element={
              <AppLayout>
                <Routes>
                  <Route
                    path="/"
                    element={
                      <ErrorBoundary>
                        <HomePage />
                      </ErrorBoundary>
                    }
                  />
                  <Route
                    path="/tasks"
                    element={
                      <ErrorBoundary>
                        <TasksPage />
                      </ErrorBoundary>
                    }
                  />
                  <Route
                    path="/habits"
                    element={
                      <ErrorBoundary>
                        <HabitsPage />
                      </ErrorBoundary>
                    }
                  />
                  <Route
                    path="/countdowns"
                    element={
                      <ErrorBoundary>
                        <CountdownsPage />
                      </ErrorBoundary>
                    }
                  />
                  <Route
                    path="/tags"
                    element={
                      <ErrorBoundary>
                        <TagsPage />
                      </ErrorBoundary>
                    }
                  />
                  <Route
                    path="/notes"
                    element={
                      <ErrorBoundary>
                        <NotesPage />
                      </ErrorBoundary>
                    }
                  />
                  <Route
                    path="/people"
                    element={
                      <ErrorBoundary>
                        <PeoplePage />
                      </ErrorBoundary>
                    }
                  />
                  <Route
                    path="/media"
                    element={
                      <ErrorBoundary>
                        <MediaPage />
                      </ErrorBoundary>
                    }
                  />
                  <Route
                    path="/settings"
                    element={
                      <ErrorBoundary>
                        <SettingsPage />
                      </ErrorBoundary>
                    }
                  />
                </Routes>
              </AppLayout>
            }
          />
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  )
}

export default App
