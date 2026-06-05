import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark' | 'system';
type Language = 'zh' | 'en' | 'ja';

interface AppState {
  theme: Theme;
  language: Language;
  sidebarCollapsed: boolean;
  priorityMode: 'simple' | 'detailed';
  notificationEnabled: boolean;

  setTheme: (theme: Theme) => void;
  setLanguage: (lang: Language) => void;
  toggleSidebar: () => void;
  setPriorityMode: (mode: 'simple' | 'detailed') => void;
  setNotificationEnabled: (enabled: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      theme: 'system',
      language: 'zh',
      sidebarCollapsed: false,
      priorityMode: 'simple',
      notificationEnabled: true,

      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setPriorityMode: (priorityMode) => set({ priorityMode }),
      setNotificationEnabled: (notificationEnabled) => set({ notificationEnabled }),
    }),
    {
      name: 'mindless-app-settings',
    }
  )
);
