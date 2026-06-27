import { emit, listen } from '@tauri-apps/api/event'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification'
import {
  DocumentIcon,
  FilmIcon,
  IdentificationIcon,
  PaperClipIcon,
  QueueListIcon,
  TableCellsIcon,
} from '@heroicons/react/24/outline'
import { Clock, Cloud, Command, Laptop, Layers, LayoutGrid, ListTodo, Moon, Palette, Settings, Sun, Type } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { formatDisplayDate, formatTime, formatTimezoneOffset } from '@/lib/formatUtils'
import { showOverlay, TIMEZONE_PICKER_LABEL } from '@/lib/overlayManager'
import { getScreenRect } from '@/lib/screenRect'
import { useCalendarEvents, useClearAllCalendarEvents, useImportCalendarEvents } from '@/queries/useTaskQueries'
import { checkAndNotify } from '@/services/notificationService'
import type { DateFormat, DefaultTaskSections, FontSize, SidebarMode, TimeFormat, TimezoneFormat } from '@/stores/useAppStore'
import { useAppStore } from '@/stores/useAppStore'
import type { PriorityMode, Theme } from '@/types'

const THEME_COLORS = [
  { hex: '#64748B', name: 'Slate' },
  { hex: '#6B7280', name: 'Gray' },
  { hex: '#71717A', name: 'Zinc' },
  { hex: '#737373', name: 'Neutral' },
  { hex: '#78716C', name: 'Stone' },
  { hex: '#EF4444', name: 'Red' },
  { hex: '#F97316', name: 'Orange' },
  { hex: '#F59E0B', name: 'Amber' },
  { hex: '#EAB308', name: 'Yellow' },
  { hex: '#84CC16', name: 'Lime' },
  { hex: '#22C55E', name: 'Green' },
  { hex: '#10B981', name: 'Emerald' },
  { hex: '#14B8A6', name: 'Teal' },
  { hex: '#06B6D4', name: 'Cyan' },
  { hex: '#0EA5E9', name: 'Sky' },
  { hex: '#3B82F6', name: 'Blue' },
  { hex: '#6366F1', name: 'Indigo' },
  { hex: '#8B5CF6', name: 'Violet' },
  { hex: '#A855F7', name: 'Purple' },
  { hex: '#D946EF', name: 'Fuchsia' },
  { hex: '#EC4899', name: 'Pink' },
  { hex: '#F43F5E', name: 'Rose' },
  { hex: '#6B8E23', name: 'Olive' },
]

export default function SettingsPage() {
  const { t, i18n } = useTranslation('common')
  const {
    theme,
    themeColor,
    language,
    priorityMode,
    notificationEnabled,
    fontSize,
    sidebarMode,
    weekStartDay,
    showLunar,
    showTimezone,
    selectedTimezone,
    timeFormat,
    dateFormat,
    timezoneFormat,
    defaultTaskOpenView,
    todayResetHour,
    setTheme,
    setThemeColor,
    setLanguage,
    setPriorityMode,
    setNotificationEnabled,
    setFontSize,
    setSidebarMode,
    setWeekStartDay,
    setShowLunar,
    setShowTimezone,
    setSelectedTimezone,
    setTimeFormat,
    setDateFormat,
    setTimezoneFormat,
    setDefaultTaskSections,
    setDefaultTaskOpenView,
    setTodayResetHour,
  } = useAppStore()
  const defaultTaskSections = useAppStore((s) => s.defaultTaskSections, (a, b) =>
    a.steps === b.steps && a.subtasks === b.subtasks && a.attachments === b.attachments &&
    a.notes === b.notes && a.persons === b.persons && a.media === b.media
  )

  useEffect(() => {
    emit('settings:changed', { key: 'theme', value: theme })
  }, [theme])
  useEffect(() => {
    emit('settings:changed', { key: 'themeColor', value: themeColor })
  }, [themeColor])
  useEffect(() => {
    emit('settings:changed', { key: 'fontSize', value: fontSize })
  }, [fontSize])
  useEffect(() => {
    emit('settings:changed', { key: 'language', value: language })
  }, [language])
  useEffect(() => {
    emit('settings:changed', { key: 'weekStartDay', value: weekStartDay })
  }, [weekStartDay])
  useEffect(() => {
    emit('settings:changed', { key: 'showLunar', value: showLunar })
  }, [showLunar])
  useEffect(() => {
    emit('settings:changed', { key: 'showTimezone', value: showTimezone })
  }, [showTimezone])
  useEffect(() => {
    emit('settings:changed', { key: 'selectedTimezone', value: selectedTimezone })
  }, [selectedTimezone])
  useEffect(() => {
    emit('settings:changed', { key: 'timeFormat', value: timeFormat })
  }, [timeFormat])
  useEffect(() => {
    emit('settings:changed', { key: 'dateFormat', value: dateFormat })
  }, [dateFormat])
  useEffect(() => {
    emit('settings:changed', { key: 'timezoneFormat', value: timezoneFormat })
  }, [timezoneFormat])
  const prevSectionsRef = useRef(defaultTaskSections)
  useEffect(() => {
    const prev = prevSectionsRef.current
    const curr = defaultTaskSections
    if (
      prev.steps !== curr.steps ||
      prev.subtasks !== curr.subtasks ||
      prev.attachments !== curr.attachments ||
      prev.notes !== curr.notes ||
      prev.persons !== curr.persons ||
      prev.media !== curr.media
    ) {
      prevSectionsRef.current = curr
      emit('settings:changed', { key: 'defaultTaskSections', value: curr })
    }
  }, [defaultTaskSections])
  useEffect(() => {
    emit('settings:changed', { key: 'defaultTaskOpenView', value: defaultTaskOpenView })
  }, [defaultTaskOpenView])

  const [activeTab, setActiveTab] = useState<'general' | 'theme' | 'datetime' | 'sync' | 'shortcuts' | 'tasks'>('general')
  const [permStatus, setPermStatus] = useState<string | null>(null)

  const { data: calendarEvents = [] } = useCalendarEvents()
  const importMutation = useImportCalendarEvents()
  const clearMutation = useClearAllCalendarEvents()
  const [importing, setImporting] = useState(false)
  const [importStatus, setImportStatus] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const timezoneButtonRef = useRef<HTMLButtonElement>(null)

  // Sync state
  const [syncProvider, setSyncProvider] = useState<'github' | 'gitlab' | 'gitee'>(() => (localStorage.getItem('mindless-sync-provider') as 'github' | 'gitlab' | 'gitee') || 'github')
  const [syncUrls, setSyncUrls] = useState<Record<string, string>>(() => ({
    github: localStorage.getItem('mindless-sync-url-github') || '',
    gitlab: localStorage.getItem('mindless-sync-url-gitlab') || '',
    gitee: localStorage.getItem('mindless-sync-url-gitee') || '',
  }))
  const [syncPats, setSyncPats] = useState<Record<string, string>>({ github: '', gitlab: '', gitee: '' })
  const [gitlabProjectId, setGitlabProjectId] = useState(() => localStorage.getItem('mindless-sync-gitlab-project-id') || '')
  const [syncStatus, setSyncStatus] = useState<string | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [syncLoading, setSyncLoading] = useState(false)
  const [syncAction, setSyncAction] = useState<'test' | 'sync' | null>(null)

  const syncUrl = syncUrls[syncProvider] || ''
  const syncPat = syncPats[syncProvider] || ''

  const setSyncUrl = (url: string) => {
    setSyncUrls(prev => ({ ...prev, [syncProvider]: url }))
    localStorage.setItem(`mindless-sync-url-${syncProvider}`, url)
  }

  const setSyncPat = (pat: string) => {
    setSyncPats(prev => ({ ...prev, [syncProvider]: pat }))
  }

  const domainMap: Record<string, string> = {
    github: 'github.com',
    gitlab: 'gitlab.com',
    gitee: 'gitee.com',
  }

  useEffect(() => {
    localStorage.setItem('mindless-sync-provider', syncProvider)
  }, [syncProvider])

  useEffect(() => {
    ;(async () => {
      try {
        const { loadPat } = await import('@/lib/api')
        const results: Record<string, string> = {}
        for (const provider of ['github', 'gitlab', 'gitee']) {
          const pat = await loadPat(domainMap[provider])
          if (pat) results[provider] = pat
        }
        setSyncPats(prev => ({ ...prev, ...results }))
      } catch {}
    })()
  }, [])

  const handleSavePat = async () => {
    if (!syncUrl || !syncPat) return
    try {
      const { savePat } = await import('@/lib/api')
      await savePat(domainMap[syncProvider], syncPat)
    } catch {}
  }

  const handleTest = async () => {
    if (!syncUrl || !syncPat) {
      setSyncStatus('empty_fields')
      return
    }
    setSyncLoading(true)
    setSyncAction('test')
    setSyncStatus(null)
    setSyncError(null)
    try {
      const { testConnection } = await import('@/lib/sync')
      const result = await testConnection(syncPat, syncUrl, syncProvider === 'gitlab' ? gitlabProjectId : undefined)
      if (result.success) {
        setSyncStatus('test_success')
        setSyncError(null)
      } else {
        setSyncStatus('test_failed')
        setSyncError(result.error || 'unknown_error')
      }
    } catch (err: any) {
      setSyncStatus('test_failed')
      setSyncError(err.message || 'unknown_error')
    } finally {
      setSyncLoading(false)
      setSyncAction(null)
    }
  }

  const handleSync = async () => {
    if (!syncUrl || !syncPat) {
      setSyncStatus('empty_fields')
      return
    }
    setSyncLoading(true)
    setSyncAction('sync')
    setSyncStatus(null)
    try {
      const { exportAllData, getDbBase64 } = await import('@/lib/api')
      const { syncToRepo } = await import('@/lib/sync')
      const [exportJson, dbBase64] = await Promise.all([exportAllData(), getDbBase64()])
      const result = await syncToRepo(syncPat, syncUrl, exportJson, dbBase64, syncProvider === 'gitlab' ? gitlabProjectId : undefined)
      setSyncStatus(result.success ? 'sync_success' : 'sync_failed')
    } catch {
      setSyncStatus('sync_failed')
    } finally {
      setSyncLoading(false)
      setSyncAction(null)
    }
  }

  useEffect(() => {
    const unlisten = listen<{ timezone?: string }>('timezone-picker-overlay:result', (e) => {
      if (e.payload.timezone !== undefined) {
        setSelectedTimezone(e.payload.timezone)
      }
    })
    return () => {
      unlisten.then((fn) => fn())
    }
  }, [setSelectedTimezone])

  const handleOpenTimezonePicker = async () => {
    const button = timezoneButtonRef.current
    if (!button) return
    const rect = await getScreenRect(button)
    await showOverlay(TIMEZONE_PICKER_LABEL, rect.x, rect.y + rect.height + 4, {
      anchorH: rect.height,
      anchorX: rect.x,
      anchorY: rect.y,
      timezone: selectedTimezone,
    })
  }

  const eventCount = calendarEvents.length

  function parseICS(content: string): { title: string; eventDate: string; eventType: string }[] {
    const events: { title: string; eventDate: string; eventType: string }[] = []
    const blocks = content.split('BEGIN:VEVENT')
    for (const block of blocks.slice(1)) {
      const summaryMatch = block.match(/SUMMARY:(.*?)(?:\r?\n)/)
      const dtStartMatch = block.match(/DTSTART(?:;[^:]*)?:(.*?)(?:\r?\n)/)
      if (summaryMatch && dtStartMatch) {
        const title = summaryMatch[1].trim()
        const dtRaw = dtStartMatch[1].trim()
        let dateStr = ''
        if (dtRaw.length >= 8) {
          dateStr = `${dtRaw.slice(0, 4)}-${dtRaw.slice(4, 6)}-${dtRaw.slice(6, 8)}`
        }
        if (dateStr) {
          events.push({ eventDate: dateStr, eventType: 'holiday', title })
        }
      }
    }
    return events
  }

  const handleImportICS = () => {
    fileInputRef.current?.click()
  }

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setImportStatus(null)
    try {
      const text = await file.text()
      const events = parseICS(text)
      if (events.length === 0) {
        setImportStatus(t('settings.calendar.import_empty'))
      } else {
        const count = await importMutation.mutateAsync({ events, source: file.name })
        setImportStatus(t('settings.calendar.import_success', { count }))
      }
    } catch (err) {
      setImportStatus(String(err))
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleClearEvents = () => {
    clearMutation.mutate()
    setImportStatus(null)
  }

  const handleToggleNotification = async (enabled: boolean) => {
    if (enabled) {
      const granted = await isPermissionGranted()
      if (!granted) {
        const result = await requestPermission()
        if (result !== 'granted') {
          setPermStatus(t('settings.notifications.denied'))
          return
        }
      }
      setPermStatus(t('settings.notifications.granted'))
    } else {
      setPermStatus(null)
    }
    setNotificationEnabled(enabled)
  }

  const handleTestNotification = () => {
    sendNotification({
      body: t('settings.notifications.test_body'),
      title: t('settings.notifications.test_title'),
    })
  }

  const handleCheckNow = () => {
    checkAndNotify()
      .then(() => {
        setPermStatus(t('settings.notifications.checked'))
      })
      .catch((err) => {
        setPermStatus(String(err))
      })
  }

  const tabs = [
    { icon: Settings, id: 'general' as const, label: t('settings.tabs.general') },
    { icon: ListTodo, id: 'tasks' as const, label: t('settings.tabs.tasks') },
    { icon: Clock, id: 'datetime' as const, label: t('settings.tabs.datetime') },
    { icon: Palette, id: 'theme' as const, label: t('settings.tabs.theme') },
    { icon: Cloud, id: 'sync' as const, label: t('settings.tabs.sync') },
    { icon: Command, id: 'shortcuts' as const, label: t('settings.tabs.shortcuts') },
  ]

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div
        data-tauri-drag-region
        className="w-[150px] shrink-0 border-r border-white/10 flex flex-col gap-1"
        style={{
          background:
            'linear-gradient(to bottom, color-mix(in srgb, var(--theme-color) 30%, white), color-mix(in srgb, var(--theme-color) 20%, white)',
        }}
      >
        <div data-tauri-drag-region className="p-3 flex items-center gap-1.5 h-8">
          <button
            type="button"
            onClick={async () => {
              await getCurrentWindow().close()
            }}
            className="w-3 h-3 rounded-full bg-[#898989] hover:bg-[#FF3B30] transition-colors group relative"
            title="Close"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
              className="w-2.5 h-2.5 m-auto opacity-0 group-hover:opacity-100"
            >
              <title>cross close</title>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              type="button"
              key={tab.id}
              style={{
                color: `hsl(from var(--theme-color) h s calc(l - 20))`,
              }}
              onClick={() => setActiveTab(tab.id)}
              className={`text-slate-500 text-sm flex flex-row items-center gap-1.5 ps-4 px-2.5 py-3 transition-all cursor-pointer ${
                isActive ? 'bg-white/25' : 'hover:bg-white/15'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-medium">{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-8 py-6">
        {/* General Tab */}
        {activeTab === 'general' && (
          <div className="space-y-6 max-w-2xl">
            {/* Language */}
            <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('settings.language')}</h2>
              <div className="flex gap-2">
                {[
                  { label: '中', value: 'zh' },
                  { label: 'En', value: 'en' },
                  { label: '日', value: 'ja' },
                ].map((option) => (
                  <label
                    key={option.value}
                    className={`flex items-center justify-center w-14 h-10 rounded-lg text-sm font-semibold cursor-pointer transition-all ${
                      language === option.value
                        ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 shadow-sm'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="language"
                      value={option.value}
                      checked={language === option.value}
                      onChange={() => {
                        const lang = option.value as 'zh' | 'en' | 'ja'
                        setLanguage(lang)
                        i18n.changeLanguage(lang)
                      }}
                      className="sr-only"
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </section>

            {/* Appearance (light/dark/system) */}
            <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('settings.theme')}</h2>
              <div className="flex gap-2">
                {[
                  { icon: Sun, label: t('settings.theme.light'), value: 'light' },
                  { icon: Moon, label: t('settings.theme.dark'), value: 'dark' },
                  { icon: Laptop, label: t('settings.theme.system'), value: 'system' },
                ].map((option) => {
                  const Icon = option.icon
                  return (
                    <label
                      key={option.value}
                      className={`flex flex-col items-center justify-center gap-1.5 w-20 h-16 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                        theme === option.value
                          ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 shadow-sm'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      <input
                        type="radio"
                        name="theme"
                        value={option.value}
                        checked={theme === option.value}
                        onChange={() => setTheme(option.value as Theme)}
                        className="sr-only"
                      />
                      <Icon className="w-5 h-5" />
                      {option.label}
                    </label>
                  )
                })}
              </div>
            </section>

            {/* Font size */}
            <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('settings.font_size')}</h2>
              <div className="flex gap-2">
                {[
                  { iconSize: 'w-4 h-4', label: '14px', value: 'small' },
                  { iconSize: 'w-5 h-5', label: '16px', value: 'default' },
                  { iconSize: 'w-6 h-6', label: '18px', value: 'large' },
                  { iconSize: 'w-7 h-7', label: '20px', value: 'xlarge' },
                ].map((option) => (
                  <label
                    key={option.value}
                    className={`flex flex-col items-center justify-center gap-1 w-16 h-16 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                      fontSize === option.value
                        ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 shadow-sm'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="fontSize"
                      value={option.value}
                      checked={fontSize === option.value}
                      onChange={() => setFontSize(option.value as FontSize)}
                      className="sr-only"
                    />
                    <Type className={option.iconSize} />
                    {option.label}
                  </label>
                ))}
              </div>
            </section>

            {/* Sidebar display mode */}
            <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                {t('settings.sidebar_mode')}
              </h2>
              <div className="flex gap-2">
                {[
                  { icon: LayoutGrid, label: t('settings.sidebar_mode.icon'), value: 'icon' },
                  { icon: Type, label: t('settings.sidebar_mode.text'), value: 'text' },
                  { icon: Layers, label: t('settings.sidebar_mode.both'), value: 'both' },
                ].map((option) => {
                  const Icon = option.icon
                  return (
                    <label
                      key={option.value}
                      className={`flex flex-col items-center justify-center gap-1.5 w-20 h-16 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                        sidebarMode === option.value
                          ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 shadow-sm'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      <input
                        type="radio"
                        name="sidebarMode"
                        value={option.value}
                        checked={sidebarMode === option.value}
                        onChange={() => setSidebarMode(option.value as SidebarMode)}
                        className="sr-only"
                      />
                      <Icon className="w-5 h-5" />
                      {option.label}
                    </label>
                  )
                })}
              </div>
            </section>

            {/* Notifications */}
            <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                {t('settings.notifications.title')}
              </h2>
              <div className="space-y-4">
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <div className="text-gray-900 dark:text-gray-100 font-medium">
                      {t('settings.notifications.enable')}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {t('settings.notifications.enable_desc')}
                    </div>
                  </div>
                  <button
                    type="button"
                    onMouseDown={() => handleToggleNotification(!notificationEnabled)}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      notificationEnabled ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                        notificationEnabled ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </label>

                {notificationEnabled && (
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleTestNotification}
                      className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      {t('settings.notifications.test')}
                    </button>
                    <button
                      type="button"
                      onClick={handleCheckNow}
                      className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      {t('settings.notifications.check_now')}
                    </button>
                  </div>
                )}

                {permStatus && <p className="text-sm text-gray-500 dark:text-gray-400 italic">{permStatus}</p>}
              </div>
            </section>

            {/* Calendar */}
            <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                {t('settings.calendar.title')}
              </h2>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{t('settings.calendar.ics_desc')}</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".ics"
                    className="hidden"
                    onChange={handleFileSelected}
                  />
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleImportICS}
                      disabled={importing}
                      className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                    >
                      {importing ? t('common.loading') : t('settings.calendar.import_ics')}
                    </button>
                    {eventCount > 0 && (
                      <button
                        onClick={handleClearEvents}
                        className="px-4 py-2 text-sm border border-red-300 dark:border-red-700 text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        {t('settings.calendar.clear_events')} ({eventCount})
                      </button>
                    )}
                  </div>
                  {importStatus && <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{importStatus}</p>}
                </div>
              </div>
            </section>

            {/* About */}
            <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('settings.about')}</h2>
              <div className="text-gray-600 dark:text-gray-400">
                <p className="mb-2">
                  <strong>Mindless</strong> - {t('app.name')}
                </p>
                <p className="text-sm">{t('settings.version')}: 1.0.0</p>
              </div>
            </section>
          </div>
        )}

        {/* Tasks Tab */}
        {activeTab === 'tasks' && (
          <div className="space-y-6 max-w-2xl">
            {/* Default visible sections */}
            <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                {t('settings.tasks.default_sections')}
              </h2>
              <div className="relative flex items-center gap-1">
                {[
                  { icon: QueueListIcon, key: 'steps', label: t('tasks.steps.title') },
                  { icon: TableCellsIcon, key: 'subtasks', label: t('tasks.subtasks.title') },
                  { icon: PaperClipIcon, key: 'attachments', label: t('tasks.attachments') },
                  { icon: DocumentIcon, key: 'notes', label: t('media.linkedNotes') },
                  { icon: IdentificationIcon, key: 'persons', label: t('notes.linked_persons') },
                  { icon: FilmIcon, key: 'media', label: t('notes.linked_media') },
                ].map(({ key, icon: Icon, label }) => (
                  <button
                    className={`relative group p-2 rounded-lg transition-colors ${
                      defaultTaskSections[key as keyof DefaultTaskSections]
                        ? 'bg-theme-100 dark:bg-theme-800 text-theme-600 dark:text-theme-100'
                        : 'text-theme-700 dark:text-theme-500 hover:bg-theme-100 dark:hover:bg-theme-700'
                    }`}
                    key={key}
                    onClick={() =>
                      setDefaultTaskSections({
                        ...defaultTaskSections,
                        [key]: !defaultTaskSections[key as keyof DefaultTaskSections],
                      })
                    }
                    type="button"
                  >
                    <Icon className="w-5 h-5" style={{ strokeWidth: '1.5px' }} />
                    <span className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-theme-900 dark:bg-theme-100 text-white dark:text-theme-900 text-[10px] px-1.5 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-50">
                      {label}
                    </span>
                  </button>
                ))}
              </div>
            </section>

            {/* Default open view */}
            <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                {t('settings.tasks.default_open')}
              </h2>
              <div className="space-y-2">
                {([
                  { label: t('settings.tasks.default_open.last'), value: 'last' },
                  { label: t('settings.tasks.default_open.today'), value: 'today' },
                  { label: t('settings.tasks.default_open.inbox'), value: 'inbox' },
                ] as const).map((option) => (
                  <label
                    key={option.value}
                    className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <input
                      type="radio"
                      name="defaultTaskOpenView"
                      value={option.value}
                      checked={defaultTaskOpenView === option.value}
                      onChange={() => setDefaultTaskOpenView(option.value)}
                      className="w-4 h-4 text-blue-500"
                    />
                    <div className="text-gray-900 dark:text-gray-100 font-medium">{option.label}</div>
                  </label>
                ))}
              </div>
            </section>

            {/* Priority mode */}
            <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                {t('settings.priority_mode')}
              </h2>
              <div className="space-y-2">
                {[
                  {
                    description: t('settings.priority_mode.simple_desc'),
                    label: t('settings.priority_mode.simple'),
                    value: 'simple',
                  },
                  {
                    description: t('settings.priority_mode.detailed_desc'),
                    label: t('settings.priority_mode.detailed'),
                    value: 'detailed',
                  },
                ].map((option) => (
                  <label
                    key={option.value}
                    className="flex items-start gap-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <input
                      type="radio"
                      name="priorityMode"
                      value={option.value}
                      checked={priorityMode === option.value}
                      onChange={() => setPriorityMode(option.value as PriorityMode)}
                      className="w-4 h-4 text-blue-500 mt-1"
                    />
                    <div>
                      <div className="text-gray-900 dark:text-gray-100 font-medium">{option.label}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{option.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </section>

            {/* Today reset hour */}
            <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-1">
                {t('settings.tasks.today_reset')}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                {t('settings.tasks.today_reset_desc')}
              </p>
              <div className="grid grid-cols-4 gap-2">
                {([0, 6, 12, 18] as const).map((hour) => (
                  <button
                    key={hour}
                    type="button"
                    onClick={() => setTodayResetHour(hour)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      todayResetHour === hour
                        ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 shadow-sm'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {String(hour).padStart(2, '0')}:00
                  </button>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* Date & Time Tab */}
        {activeTab === 'datetime' && (
          <div className="space-y-6 max-w-2xl">
            {/* Week Start Day */}
            <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-1">
                {t('settings.datetime.week_start_day')}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                {t('settings.datetime.week_start_day_desc')}
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'sunday', value: 0 },
                  { key: 'monday', value: 1 },
                  { key: 'tuesday', value: 2 },
                  { key: 'wednesday', value: 3 },
                  { key: 'thursday', value: 4 },
                  { key: 'friday', value: 5 },
                  { key: 'saturday', value: 6 },
                ].map((option) => (
                  <label
                    key={option.value}
                    className={`flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-all ${
                      weekStartDay === option.value
                        ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 shadow-sm'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="weekStartDay"
                      value={option.value}
                      checked={weekStartDay === option.value}
                      onChange={() => setWeekStartDay(option.value)}
                      className="sr-only"
                    />
                    {t(`settings.datetime.days.${option.key}`)}
                  </label>
                ))}
              </div>
            </section>

            {/* Time Format */}
            <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-1">
                {t('settings.datetime.time_format')}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{t('settings.datetime.time_format_desc')}</p>
              <div className="space-y-2">
                {(['cn_natural', 'cn_24h', 'cn_12h', 'en_12h', '24h'] as TimeFormat[]).map((fmt) => (
                  <label
                    key={fmt}
                    className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <input
                      type="radio"
                      name="timeFormat"
                      checked={timeFormat === fmt}
                      onChange={() => setTimeFormat(fmt)}
                      className="w-4 h-4 text-blue-500"
                    />
                    <span className="text-gray-900 dark:text-gray-100">
                      {t(`settings.datetime.time_formats.${fmt}`)}
                    </span>
                    <span className="text-sm text-gray-400 dark:text-gray-500 ml-auto">{formatTime('15:12', fmt)}</span>
                  </label>
                ))}
              </div>
            </section>

            {/* Date Format */}
            <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-1">
                {t('settings.datetime.date_format')}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{t('settings.datetime.date_format_desc')}</p>
              <div className="space-y-2">
                {(['relative', 'yyyy_slash_mm_dd', 'yyyy_dash_mm_dd', 'mm_dd_yyyy', 'mm_dd'] as DateFormat[]).map(
                  (fmt) => (
                    <label
                      key={fmt}
                      className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <input
                        type="radio"
                        name="dateFormat"
                        checked={dateFormat === fmt}
                        onChange={() => setDateFormat(fmt)}
                        className="w-4 h-4 text-blue-500"
                      />
                      <span className="text-gray-900 dark:text-gray-100">
                        {t(`settings.datetime.date_formats.${fmt}`)}
                      </span>
                      <span className="text-sm text-gray-400 dark:text-gray-500 ml-auto">
                        {formatDisplayDate('2025-03-24', fmt, t)}
                      </span>
                    </label>
                  ),
                )}
              </div>
            </section>

            {/* Timezone Format */}
            <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-1">
                {t('settings.datetime.timezone_format')}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                {t('settings.datetime.timezone_format_desc')}
              </p>
              <div className="space-y-2">
                {(
                  ['short_offset', 'iana', 'compact', 'gmt', 'utc_colon', 'iso_colon', 'cn_zone'] as TimezoneFormat[]
                ).map((fmt) => (
                  <label
                    key={fmt}
                    className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <input
                      type="radio"
                      name="timezoneFormat"
                      checked={timezoneFormat === fmt}
                      onChange={() => setTimezoneFormat(fmt)}
                      className="w-4 h-4 text-blue-500"
                    />
                    <span className="text-gray-900 dark:text-gray-100">
                      {t(`settings.datetime.timezone_formats.${fmt}`)}
                    </span>
                    <span className="text-sm text-gray-400 dark:text-gray-500 ml-auto">
                      {formatTimezoneOffset(selectedTimezone, fmt)}
                    </span>
                  </label>
                ))}
              </div>
            </section>

            {/* Show Lunar */}
            <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <div className="text-gray-900 dark:text-gray-100 font-medium">
                    {t('settings.datetime.show_lunar')}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {t('settings.datetime.show_lunar_desc')}
                  </div>
                </div>
                <button
                  onClick={() => setShowLunar(!showLunar)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    showLunar ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                      showLunar ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </label>
            </section>

            {/* Show Timezone */}
            <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <label className="flex items-center justify-between cursor-pointer mb-4">
                <div>
                  <div className="text-gray-900 dark:text-gray-100 font-medium">
                    {t('settings.datetime.show_timezone')}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {t('settings.datetime.show_timezone_desc')}
                  </div>
                </div>
                <button
                  onClick={() => setShowTimezone(!showTimezone)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    showTimezone ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                      showTimezone ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </label>
              {showTimezone && (
                <div>
                  <div className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                    {t('settings.datetime.timezone_picker')}
                  </div>
                  <button
                    ref={timezoneButtonRef}
                    type="button"
                    onClick={handleOpenTimezonePicker}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
                  >
                    <span className="truncate">{selectedTimezone.replace(/_/g, ' ')}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                      {formatTimezoneOffset(selectedTimezone, timezoneFormat)}
                    </span>
                  </button>
                </div>
              )}
            </section>
          </div>
        )}

        {/* Theme Tab */}
        {activeTab === 'theme' && (
          <div className="space-y-6 max-w-2xl">
            <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                {t('settings.theme_color.title')}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{t('settings.theme_color.description')}</p>

              <div className="grid grid-cols-12 gap-4">
                {THEME_COLORS.map((color) => {
                  const isSelected = themeColor === color.hex
                  return (
                    <button
                      key={color.hex}
                      onClick={() => setThemeColor(color.hex)}
                      className="flex flex-col items-center gap-2 group"
                    >
                      <div
                        className={`w-5 h-5 rounded-md transition-all ${
                          isSelected
                            ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-800 scale-110'
                            : 'hover:scale-105'
                        }`}
                        style={
                          {
                            '--tw-ring-color': isSelected ? color.hex : undefined,
                            backgroundColor: color.hex,
                          } as React.CSSProperties
                        }
                      />
                      <span
                        className={`text-xs transition-colors ${
                          isSelected
                            ? 'text-gray-900 dark:text-gray-100 font-medium'
                            : 'text-gray-500 dark:text-gray-400'
                        }`}
                      >
                        {color.name}
                      </span>
                    </button>
                  )
                })}
              </div>
            </section>
          </div>
        )}

        {/* Sync Tab */}
        {activeTab === 'sync' && (
          <div className="flex-1 overflow-auto p-6">
            <div className="space-y-6 max-w-2xl">
              <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="flex gap-2 mb-6">
                  {[
                    { label: t('settings.sync.provider_github'), value: 'github' },
                    { label: t('settings.sync.provider_gitlab'), value: 'gitlab' },
                    { label: t('settings.sync.provider_gitee'), value: 'gitee' },
                  ].map((option) => (
                    <label
                      key={option.value}
                      className={`flex items-center justify-center px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer transition-all ${
                        syncProvider === option.value
                          ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 shadow-sm'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      <input
                        type="radio"
                        name="syncProvider"
                        value={option.value}
                        checked={syncProvider === option.value}
                        onChange={() => setSyncProvider(option.value as 'github' | 'gitlab' | 'gitee')}
                        className="sr-only"
                      />
                      {option.label}
                    </label>
                  ))}
                </div>

                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  {t('settings.sync.repo_url')}
                </h3>
                <input
                  type="text"
                  value={syncUrl}
                  onChange={(e) => setSyncUrl(e.target.value)}
                  placeholder={t(`settings.sync.repo_url_placeholder${syncProvider !== 'github' ? `_${syncProvider}` : ''}`)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />

                {syncProvider === 'gitlab' && (
                  <>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mt-4 mb-4">
                      {t('settings.sync.gitlab_project_id')}
                    </h3>
                    <input
                      type="text"
                      value={gitlabProjectId}
                      onChange={(e) => {
                        setGitlabProjectId(e.target.value)
                        localStorage.setItem('mindless-sync-gitlab-project-id', e.target.value)
                      }}
                      placeholder={t('settings.sync.gitlab_project_id_placeholder')}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t('settings.sync.gitlab_project_id_help')}</p>
                  </>
                )}

                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mt-4 mb-4">
                  {t('settings.sync.pat')}
                </h3>
                <input
                  type="password"
                  value={syncPat}
                  onChange={(e) => setSyncPat(e.target.value)}
                  onBlur={handleSavePat}
                  placeholder={t('settings.sync.pat_placeholder')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t('settings.sync.pat_help')}</p>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={handleTest}
                    disabled={syncLoading}
                    className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm disabled:opacity-50"
                  >
                    {syncLoading && syncAction === 'test' ? t('settings.sync.testing') : t('settings.sync.test')}
                  </button>
                  <button
                    onClick={handleSync}
                    disabled={syncLoading}
                    className="px-4 py-2 text-white rounded-lg transition-colors text-sm disabled:opacity-50"
                    style={{ backgroundColor: 'var(--theme-color)' }}
                  >
                    {syncLoading && syncAction === 'sync' ? t('settings.sync.syncing') : t('settings.sync.sync_now')}
                  </button>
                </div>

                {syncStatus && (
                  <div className="mt-4">
                    <p
                      className={`text-sm ${
                        syncStatus === 'test_success' || syncStatus === 'sync_success' ? 'text-green-500' : 'text-red-500'
                      }`}
                    >
                      {t(`settings.sync.${syncStatus}`)}
                    </p>
                    {syncError && (
                      <p className="mt-2 text-xs text-red-400 dark:text-red-500 break-all">
                        {syncError}
                      </p>
                    )}
                  </div>
                )}
              </section>
            </div>
          </div>
        )}

        {/* Shortcuts Tab */}
        {activeTab === 'shortcuts' && (
          <div className="space-y-6 max-w-2xl">
            <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
                {t('settings.shortcuts.title')}
              </h2>

              <div className="space-y-6">
                {/* Navigation */}
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                    {t('settings.shortcuts.navigation')}
                  </h3>
                  <div className="space-y-2">
                    {[
                      { keys: ['⌘', ','], desc: t('settings.shortcuts.open_settings') },
                      { keys: ['⌘', 'T'], desc: t('settings.shortcuts.open_tasks') },
                      { keys: ['⌘', 'H'], desc: t('settings.shortcuts.open_habits') },
                      { keys: ['⌘', 'D'], desc: t('settings.shortcuts.open_countdowns') },
                      { keys: ['⌘', 'B'], desc: t('settings.shortcuts.open_tags') },
                      { keys: ['⌘', 'Y'], desc: t('settings.shortcuts.open_media') },
                      { keys: ['⌘', 'P'], desc: t('settings.shortcuts.open_people') },
                    ].map((item) => (
                      <div
                        key={item.desc}
                        className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        <span className="text-sm text-gray-700 dark:text-gray-300">{item.desc}</span>
                        <div className="flex items-center gap-1">
                          {item.keys.map((key) => (
                            <kbd
                              key={key}
                              className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded shadow-sm"
                            >
                              {key}
                            </kbd>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                    {t('settings.shortcuts.actions')}
                  </h3>
                  <div className="space-y-2">
                    {[
                      { keys: ['⌘', 'N'], desc: t('settings.shortcuts.new_task') },
                      { keys: ['⌘', 'F'], desc: t('settings.shortcuts.global_search') },
                      { keys: ['Esc'], desc: t('settings.shortcuts.close_panel') },
                    ].map((item) => (
                      <div
                        key={item.desc}
                        className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        <span className="text-sm text-gray-700 dark:text-gray-300">{item.desc}</span>
                        <div className="flex items-center gap-1">
                          {item.keys.map((key) => (
                            <kbd
                              key={key}
                              className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded shadow-sm"
                            >
                              {key}
                            </kbd>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Views */}
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                    {t('settings.shortcuts.views')}
                    <span className="ml-2 text-xs font-normal text-gray-400 dark:text-gray-500">
                      ({t('settings.shortcuts.tasks_page_only')})
                    </span>
                  </h3>
                  <div className="space-y-2">
                    {[
                      { keys: ['1'], desc: t('settings.shortcuts.view_list') },
                      { keys: ['2'], desc: t('settings.shortcuts.view_calendar') },
                      { keys: ['3'], desc: t('settings.shortcuts.view_kanban') },
                      { keys: ['4'], desc: t('settings.shortcuts.view_matrix') },
                    ].map((item) => (
                      <div
                        key={item.desc}
                        className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        <span className="text-sm text-gray-700 dark:text-gray-300">{item.desc}</span>
                        <div className="flex items-center gap-1">
                          {item.keys.map((key) => (
                            <kbd
                              key={key}
                              className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded shadow-sm"
                            >
                              {key}
                            </kbd>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  )
}
