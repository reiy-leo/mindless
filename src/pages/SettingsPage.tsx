import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/stores/useAppStore';
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';
import { checkAndNotify } from '@/services/notificationService';
import { useCalendarEvents, useImportCalendarEvents, useClearAllCalendarEvents } from '@/queries/useTaskQueries';
import { Settings, Palette, Sun, Moon, Laptop, LayoutGrid, Type, Layers, Clock } from 'lucide-react';
import { emit, listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { showOverlay, TIMEZONE_PICKER_LABEL } from '@/lib/overlayManager';
import { formatTime, formatDisplayDate, formatTimezoneOffset } from '@/lib/formatUtils';
import { getScreenRect } from '@/lib/screenRect';
import type { TimeFormat, DateFormat, TimezoneFormat } from '@/stores/useAppStore';

const THEME_COLORS = [
  { name: 'Slate', hex: '#64748B' },
  { name: 'Gray', hex: '#6B7280' },
  { name: 'Zinc', hex: '#71717A' },
  { name: 'Neutral', hex: '#737373' },
  { name: 'Stone', hex: '#78716C' },
  { name: 'Red', hex: '#EF4444' },
  { name: 'Orange', hex: '#F97316' },
  { name: 'Amber', hex: '#F59E0B' },
  { name: 'Yellow', hex: '#EAB308' },
  { name: 'Lime', hex: '#84CC16' },
  { name: 'Green', hex: '#22C55E' },
  { name: 'Emerald', hex: '#10B981' },
  { name: 'Teal', hex: '#14B8A6' },
  { name: 'Cyan', hex: '#06B6D4' },
  { name: 'Sky', hex: '#0EA5E9' },
  { name: 'Blue', hex: '#3B82F6' },
  { name: 'Indigo', hex: '#6366F1' },
  { name: 'Violet', hex: '#8B5CF6' },
  { name: 'Purple', hex: '#A855F7' },
  { name: 'Fuchsia', hex: '#D946EF' },
  { name: 'Pink', hex: '#EC4899' },
  { name: 'Rose', hex: '#F43F5E' },
  { name: 'Olive', hex: '#6B8E23' },
];

export default function SettingsPage() {
  const { t, i18n } = useTranslation('common');
  const {
    theme, themeColor, language, priorityMode, notificationEnabled, fontSize, sidebarMode,
    weekStartDay, showLunar, showTimezone, selectedTimezone, timeFormat, dateFormat, timezoneFormat,
    setTheme, setThemeColor, setLanguage, setPriorityMode, setNotificationEnabled, setFontSize, setSidebarMode,
    setWeekStartDay, setShowLunar, setShowTimezone, setSelectedTimezone, setTimeFormat, setDateFormat, setTimezoneFormat,
  } = useAppStore();

  useEffect(() => {
    emit('settings:changed', { key: 'theme', value: theme });
  }, [theme]);
  useEffect(() => {
    emit('settings:changed', { key: 'themeColor', value: themeColor });
  }, [themeColor]);
  useEffect(() => {
    emit('settings:changed', { key: 'fontSize', value: fontSize });
  }, [fontSize]);
  useEffect(() => {
    emit('settings:changed', { key: 'language', value: language });
  }, [language]);
  useEffect(() => {
    emit('settings:changed', { key: 'weekStartDay', value: weekStartDay });
  }, [weekStartDay]);
  useEffect(() => {
    emit('settings:changed', { key: 'showLunar', value: showLunar });
  }, [showLunar]);
  useEffect(() => {
    emit('settings:changed', { key: 'showTimezone', value: showTimezone });
  }, [showTimezone]);
  useEffect(() => {
    emit('settings:changed', { key: 'selectedTimezone', value: selectedTimezone });
  }, [selectedTimezone]);
  useEffect(() => {
    emit('settings:changed', { key: 'timeFormat', value: timeFormat });
  }, [timeFormat]);
  useEffect(() => {
    emit('settings:changed', { key: 'dateFormat', value: dateFormat });
  }, [dateFormat]);
  useEffect(() => {
    emit('settings:changed', { key: 'timezoneFormat', value: timezoneFormat });
  }, [timezoneFormat]);

  const [activeTab, setActiveTab] = useState<'general' | 'theme' | 'datetime'>('general');
  const [permStatus, setPermStatus] = useState<string | null>(null);

  const { data: calendarEvents = [] } = useCalendarEvents();
  const importMutation = useImportCalendarEvents();
  const clearMutation = useClearAllCalendarEvents();
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timezoneButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const unlisten = listen<{ timezone?: string }>('timezone-picker-overlay:result', (e) => {
      if (e.payload.timezone !== undefined) {
        setSelectedTimezone(e.payload.timezone);
      }
    });
    return () => { unlisten.then((fn) => fn()); };
  }, [setSelectedTimezone]);

  const handleOpenTimezonePicker = async () => {
    const button = timezoneButtonRef.current;
    if (!button) return;
    const rect = await getScreenRect(button);
    await showOverlay(TIMEZONE_PICKER_LABEL, rect.x, rect.y + rect.height + 4, {
      timezone: selectedTimezone,
      anchorX: rect.x,
      anchorY: rect.y,
      anchorH: rect.height,
    });
  };

  const eventCount = calendarEvents.length;

  function parseICS(content: string): { title: string; eventDate: string; eventType: string }[] {
    const events: { title: string; eventDate: string; eventType: string }[] = [];
    const blocks = content.split('BEGIN:VEVENT');
    for (const block of blocks.slice(1)) {
      const summaryMatch = block.match(/SUMMARY:(.*?)(?:\r?\n)/);
      const dtStartMatch = block.match(/DTSTART(?:;[^:]*)?:(.*?)(?:\r?\n)/);
      if (summaryMatch && dtStartMatch) {
        const title = summaryMatch[1].trim();
        const dtRaw = dtStartMatch[1].trim();
        let dateStr = '';
        if (dtRaw.length >= 8) {
          dateStr = `${dtRaw.slice(0, 4)}-${dtRaw.slice(4, 6)}-${dtRaw.slice(6, 8)}`;
        }
        if (dateStr) {
          events.push({ title, eventDate: dateStr, eventType: 'holiday' });
        }
      }
    }
    return events;
  }

  const handleImportICS = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportStatus(null);
    try {
      const text = await file.text();
      const events = parseICS(text);
      if (events.length === 0) {
        setImportStatus(t('settings.calendar.import_empty'));
      } else {
        const count = await importMutation.mutateAsync({ events, source: file.name });
        setImportStatus(t('settings.calendar.import_success', { count }));
      }
    } catch (err) {
      setImportStatus(String(err));
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleClearEvents = () => {
    clearMutation.mutate();
    setImportStatus(null);
  };

  const handleToggleNotification = async (enabled: boolean) => {
    if (enabled) {
      const granted = await isPermissionGranted();
      if (!granted) {
        const result = await requestPermission();
        if (result !== 'granted') {
          setPermStatus(t('settings.notifications.denied'));
          return;
        }
      }
      setPermStatus(t('settings.notifications.granted'));
    } else {
      setPermStatus(null);
    }
    setNotificationEnabled(enabled);
  };

  const handleTestNotification = () => {
    sendNotification({
      title: t('settings.notifications.test_title'),
      body: t('settings.notifications.test_body'),
    });
  };

  const handleCheckNow = () => {
    checkAndNotify().then(() => {
      setPermStatus(t('settings.notifications.checked'));
    }).catch((err) => {
      setPermStatus(String(err));
    });
  };

  const tabs = [
    { id: 'general' as const, label: t('settings.tabs.general'), icon: Settings },
    { id: 'datetime' as const, label: t('settings.tabs.datetime'), icon: Clock },
    { id: 'theme' as const, label: t('settings.tabs.theme'), icon: Palette },
  ];

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div data-tauri-drag-region className="w-[150px] shrink-0 border-r border-white/10 flex flex-col gap-1" style={{ background: 'linear-gradient(to bottom, color-mix(in srgb, var(--theme-color) 30%, white), color-mix(in srgb, var(--theme-color) 20%, white)' }}>
      <div data-tauri-drag-region className='p-3 flex items-center gap-1.5 h-8' aria-label='window-controls'>
        <button
          onClick={async () => { await getCurrentWindow().close() }}
          className="w-3 h-3 rounded-full bg-[#898989] hover:bg-[#FF3B30] transition-colors group relative"
          title="Close"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-2.5 h-2.5 m-auto opacity-0 group-hover:opacity-100">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              style={{
                color: `hsl(from var(--theme-color) h s calc(l - 20))`
              }}
              onClick={() => setActiveTab(tab.id)}
              className={`text-slate-500 text-sm flex flex-row items-center gap-1.5 px-2.5 py-3 transition-all cursor-pointer ${
                isActive
                  ? 'bg-white/25'
                  : 'hover:bg-white/15'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-8 py-6">

      {/* General Tab */}
      {activeTab === 'general' && (
        <div className="space-y-6 max-w-2xl">
          {/* Language */}
          <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {t('settings.language')}
            </h2>
            <div className="flex gap-2">
              {[
                { value: 'zh', label: '中' },
                { value: 'en', label: 'En' },
                { value: 'ja', label: '日' },
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
                      const lang = option.value as 'zh' | 'en' | 'ja';
                      setLanguage(lang);
                      i18n.changeLanguage(lang);
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
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {t('settings.theme')}
            </h2>
            <div className="flex gap-2">
              {[
                { value: 'light', label: t('settings.theme.light'), icon: Sun },
                { value: 'dark', label: t('settings.theme.dark'), icon: Moon },
                { value: 'system', label: t('settings.theme.system'), icon: Laptop },
              ].map((option) => {
                const Icon = option.icon;
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
                      onChange={() => setTheme(option.value as any)}
                      className="sr-only"
                    />
                    <Icon className="w-5 h-5" />
                    {option.label}
                  </label>
                );
              })}
            </div>
          </section>

          {/* Font size */}
          <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {t('settings.font_size')}
            </h2>
            <div className="flex gap-2">
              {[
                { value: 'small', iconSize: 'w-4 h-4', label: '14px' },
                { value: 'default', iconSize: 'w-5 h-5', label: '16px' },
                { value: 'large', iconSize: 'w-6 h-6', label: '18px' },
                { value: 'xlarge', iconSize: 'w-7 h-7', label: '20px' },
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
                    onChange={() => setFontSize(option.value as any)}
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
                { value: 'icon', label: t('settings.sidebar_mode.icon'), icon: LayoutGrid },
                { value: 'text', label: t('settings.sidebar_mode.text'), icon: Type },
                { value: 'both', label: t('settings.sidebar_mode.both'), icon: Layers },
              ].map((option) => {
                const Icon = option.icon;
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
                      onChange={() => setSidebarMode(option.value as any)}
                      className="sr-only"
                    />
                    <Icon className="w-5 h-5" />
                    {option.label}
                  </label>
                );
              })}
            </div>
          </section>

          {/* Priority mode */}
          <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {t('settings.priority_mode')}
            </h2>
            <div className="space-y-2">
              {[
                { value: 'simple', label: t('settings.priority_mode.simple'), description: t('settings.priority_mode.simple_desc') },
                { value: 'detailed', label: t('settings.priority_mode.detailed'), description: t('settings.priority_mode.detailed_desc') },
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
                    onChange={() => setPriorityMode(option.value as any)}
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
                  onClick={() => handleToggleNotification(!notificationEnabled)}
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
                    onClick={handleTestNotification}
                    className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    {t('settings.notifications.test')}
                  </button>
                  <button
                    onClick={handleCheckNow}
                    className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    {t('settings.notifications.check_now')}
                  </button>
                </div>
              )}

              {permStatus && (
                <p className="text-sm text-gray-500 dark:text-gray-400 italic">{permStatus}</p>
              )}
            </div>
          </section>

          {/* Calendar */}
          <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {t('settings.calendar.title')}
            </h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  {t('settings.calendar.ics_desc')}
                </p>
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
                {importStatus && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{importStatus}</p>
                )}
              </div>
            </div>
          </section>

          {/* About */}
          <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {t('settings.about')}
            </h2>
            <div className="text-gray-600 dark:text-gray-400">
              <p className="mb-2">
                <strong>Mindless</strong> - {t('app.name')}
              </p>
              <p className="text-sm">{t('settings.version')}: 1.0.0</p>
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
                { value: 0, key: 'sunday' },
                { value: 1, key: 'monday' },
                { value: 2, key: 'tuesday' },
                { value: 3, key: 'wednesday' },
                { value: 4, key: 'thursday' },
                { value: 5, key: 'friday' },
                { value: 6, key: 'saturday' },
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
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {t('settings.datetime.time_format_desc')}
            </p>
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
                  <span className="text-sm text-gray-400 dark:text-gray-500 ml-auto">
                    {formatTime('15:12', fmt)}
                  </span>
                </label>
              ))}
            </div>
          </section>

          {/* Date Format */}
          <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-1">
              {t('settings.datetime.date_format')}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {t('settings.datetime.date_format_desc')}
            </p>
            <div className="space-y-2">
              {(['relative', 'yyyy_slash_mm_dd', 'yyyy_dash_mm_dd', 'mm_dd_yyyy', 'mm_dd'] as DateFormat[]).map((fmt) => (
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
              ))}
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
              {(['short_offset', 'iana', 'compact', 'gmt', 'utc_colon', 'iso_colon', 'cn_zone'] as TimezoneFormat[]).map((fmt) => (
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
                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                  {t('settings.datetime.timezone_picker')}
                </label>
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
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              {t('settings.theme_color.description')}
            </p>

            <div className="grid grid-cols-12 gap-4">
              {THEME_COLORS.map((color) => {
                const isSelected = themeColor === color.hex;
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
                      style={{
                        backgroundColor: color.hex,
                        '--tw-ring-color': isSelected ? color.hex : undefined,
                      } as React.CSSProperties}
                    />
                    <span className={`text-xs transition-colors ${
                      isSelected
                        ? 'text-gray-900 dark:text-gray-100 font-medium'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {color.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

        </div>
      )}

      </div>
    </div>
  );
}
