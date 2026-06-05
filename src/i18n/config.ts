import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import translation files
import zhCommon from './locales/zh/common.json';
import enCommon from './locales/en/common.json';
import jaCommon from './locales/ja/common.json';

const resources = {
  zh: {
    common: zhCommon,
  },
  en: {
    common: enCommon,
  },
  ja: {
    common: jaCommon,
  },
};

// Read persisted language from Zustand store (localStorage)
function getPersistedLanguage(): string {
  try {
    const raw = localStorage.getItem('mindless-app-settings');
    if (raw) {
      const parsed = JSON.parse(raw);
      const state = parsed?.state;
      if (state?.language && ['zh', 'en', 'ja'].includes(state.language)) {
        return state.language;
      }
    }
  } catch {
    // Ignore parse errors
  }
  return 'zh';
}

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: getPersistedLanguage(),
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
