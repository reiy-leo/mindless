import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark' | 'system';
type Language = 'zh' | 'en' | 'ja';
type SortBy = 'dueDate' | 'startDate' | 'priority' | 'createdAt';
type SortOrder = 'asc' | 'desc';
type GroupBy = 'none' | 'priority' | 'list';
type FontSize = 'small' | 'default' | 'large' | 'xlarge';

interface AppState {
  theme: Theme;
  language: Language;
  sidebarCollapsed: boolean;
  priorityMode: 'simple' | 'detailed';
  notificationEnabled: boolean;
  weekStartDay: 0 | 1;
  taskSortBy: SortBy;
  taskSortOrder: SortOrder;
  taskGroupBy: GroupBy;
  fontSize: FontSize;

  setTheme: (theme: Theme) => void;
  setLanguage: (lang: Language) => void;
  toggleSidebar: () => void;
  setPriorityMode: (mode: 'simple' | 'detailed') => void;
  setNotificationEnabled: (enabled: boolean) => void;
  setWeekStartDay: (day: 0 | 1) => void;
  setTaskSortBy: (by: SortBy) => void;
  setTaskSortOrder: (order: SortOrder) => void;
  setTaskGroupBy: (by: GroupBy) => void;
  setFontSize: (size: FontSize) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      theme: 'system',
      language: 'zh',
      sidebarCollapsed: false,
      priorityMode: 'simple',
      notificationEnabled: true,
      weekStartDay: 0,
      taskSortBy: 'dueDate',
      taskSortOrder: 'asc',
      taskGroupBy: 'none',
      fontSize: 'default',

      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setPriorityMode: (priorityMode) => set({ priorityMode }),
      setNotificationEnabled: (notificationEnabled) => set({ notificationEnabled }),
      setWeekStartDay: (weekStartDay) => set({ weekStartDay }),
      setTaskSortBy: (taskSortBy) => set({ taskSortBy }),
      setTaskSortOrder: (taskSortOrder) => set({ taskSortOrder }),
      setTaskGroupBy: (taskGroupBy) => set({ taskGroupBy }),
      setFontSize: (fontSize) => set({ fontSize }),
    }),
    {
      name: 'mindless-app-settings',
    }
  )
);
