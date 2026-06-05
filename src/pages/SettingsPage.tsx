import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/stores/useAppStore';
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';
import { checkAndNotify } from '@/services/notificationService';

export default function SettingsPage() {
  const { t, i18n } = useTranslation('common');
  const { theme, language, priorityMode, notificationEnabled, setTheme, setLanguage, setPriorityMode, setNotificationEnabled } = useAppStore();
  const [permStatus, setPermStatus] = useState<string | null>(null);

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

  return (
    <div className="flex-1 overflow-auto p-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-8">{t('navigation.settings')}</h1>

      <div className="space-y-6 max-w-2xl">
        {/* Language settings */}
        <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            {t('settings.language')}
          </h2>
          <select
            value={language}
            onChange={(e) => {
              const lang = e.target.value as 'zh' | 'en' | 'ja';
              setLanguage(lang);
              i18n.changeLanguage(lang);
            }}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="zh">中文</option>
            <option value="en">English</option>
            <option value="ja">日本語</option>
          </select>
        </section>

        {/* Theme settings */}
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

        {/* Priority mode settings */}
        <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            {t('settings.priority_mode')}
          </h2>
          <div className="space-y-2">
            {[
              {
                value: 'simple',
                label: t('settings.priority_mode.simple'),
                description: t('settings.priority_mode.simple_desc'),
              },
              {
                value: 'detailed',
                label: t('settings.priority_mode.detailed'),
                description: t('settings.priority_mode.detailed_desc'),
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
                  onChange={() => setPriorityMode(option.value as any)}
                  className="w-4 h-4 text-blue-500 mt-1"
                />
                <div>
                  <div className="text-gray-900 dark:text-gray-100 font-medium">{option.label}</div>
                  <div className="text-sm text-gray-500 mt-1">{option.description}</div>
                </div>
              </label>
            ))}
          </div>
        </section>

        {/* Notification settings */}
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
                <div className="text-sm text-gray-500 mt-1">
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

        {/* About section */}
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
    </div>
  );
}
