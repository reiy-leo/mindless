import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/stores/useAppStore';
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';
import { checkAndNotify } from '@/services/notificationService';
import { useCalendarEvents, useImportCalendarEvents, useClearAllCalendarEvents } from '@/queries/useTaskQueries';
import Select from '@/components/Select';

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
    setTheme, setThemeColor, setLanguage, setPriorityMode, setNotificationEnabled, setFontSize, setSidebarMode,
  } = useAppStore();
  const [activeTab, setActiveTab] = useState<'general' | 'theme'>('general');
  const [permStatus, setPermStatus] = useState<string | null>(null);

  const { data: calendarEvents = [] } = useCalendarEvents();
  const importMutation = useImportCalendarEvents();
  const clearMutation = useClearAllCalendarEvents();
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const tabBase = 'px-4 py-2 text-sm font-medium rounded-lg transition-all cursor-pointer';

  return (
    <div className="flex-1 overflow-auto px-8 py-4">
      <h1 data-tauri-drag-region className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6">{t('navigation.settings')}</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('general')}
          className={`${tabBase} ${
            activeTab === 'general'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          {t('settings.tabs.general')}
        </button>
        <button
          onClick={() => setActiveTab('theme')}
          className={`${tabBase} ${
            activeTab === 'theme'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          {t('settings.tabs.theme')}
        </button>
      </div>

      {/* General Tab */}
      {activeTab === 'general' && (
        <div className="space-y-6 max-w-2xl">
          {/* Language */}
          <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {t('settings.language')}
            </h2>
            <Select
              value={language}
              onChange={(val) => {
                const lang = val as 'zh' | 'en' | 'ja';
                setLanguage(lang);
                i18n.changeLanguage(lang);
              }}
              options={[
                { value: 'zh', label: '中文' },
                { value: 'en', label: 'English' },
                { value: 'ja', label: '日本語' },
              ]}
            />
          </section>

          {/* Appearance (light/dark/system) */}
          <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {t('settings.theme')}
            </h2>
            <div className="space-y-2">
              {[
                { value: 'light', label: t('settings.theme.light') },
                { value: 'dark', label: t('settings.theme.dark') },
                { value: 'system', label: t('settings.theme.system') },
              ].map((option) => (
                <label key={option.value} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="theme"
                    value={option.value}
                    checked={theme === option.value}
                    onChange={() => setTheme(option.value as any)}
                    className="w-4 h-4 text-blue-500"
                  />
                  <span className="text-gray-700 dark:text-gray-300">{option.label}</span>
                </label>
              ))}
            </div>
          </section>

          {/* Font size */}
          <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {t('settings.font_size')}
            </h2>
            <div className="space-y-2">
              {[
                { value: 'small', label: t('settings.font_size.small'), description: '14px' },
                { value: 'default', label: t('settings.font_size.default'), description: '16px' },
                { value: 'large', label: t('settings.font_size.large'), description: '18px' },
                { value: 'xlarge', label: t('settings.font_size.xlarge'), description: '20px' },
              ].map((option) => (
                <label
                  key={option.value}
                  className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <input
                    type="radio"
                    name="fontSize"
                    value={option.value}
                    checked={fontSize === option.value}
                    onChange={() => setFontSize(option.value as any)}
                    className="w-4 h-4 text-blue-500"
                  />
                  <div>
                    <div className="text-gray-900 dark:text-gray-100 font-medium">{option.label}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{option.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </section>

          {/* Sidebar display mode */}
          <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {t('settings.sidebar_mode')}
            </h2>
            <div className="space-y-2">
              {[
                { value: 'icon', label: t('settings.sidebar_mode.icon') },
                { value: 'text', label: t('settings.sidebar_mode.text') },
                { value: 'both', label: t('settings.sidebar_mode.both') },
              ].map((option) => (
                <label key={option.value} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="sidebarMode"
                    value={option.value}
                    checked={sidebarMode === option.value}
                    onChange={() => setSidebarMode(option.value as any)}
                    className="w-4 h-4 text-blue-500"
                  />
                  <span className="text-gray-700 dark:text-gray-300">{option.label}</span>
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

            <div className="grid grid-cols-10 gap-4">
              {THEME_COLORS.map((color) => {
                const isSelected = themeColor === color.hex;
                return (
                  <button
                    key={color.hex}
                    onClick={() => setThemeColor(color.hex)}
                    className="flex flex-col items-center gap-2 group"
                  >
                    <div
                      className={`w-7 h-7 rounded-lg transition-all ${
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
  );
}
