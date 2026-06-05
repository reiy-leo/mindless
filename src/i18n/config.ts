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

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'zh', // default language
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
