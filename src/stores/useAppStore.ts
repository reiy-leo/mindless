import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark' | 'system';
type Language = 'zh' | 'en' | 'ja';
type SortBy = 'sortOrder' | 'dueDate' | 'startDate' | 'priority' | 'createdAt';
type SortOrder = 'asc' | 'desc';
type GroupBy = 'none' | 'priority' | 'list';
type FontSize = 'small' | 'default' | 'large' | 'xlarge';

interface SmartGroupVisibility {
  tomorrow: boolean;
  recent7days: boolean;
  thisMonth: boolean;
}

export interface AdvancedGroupFilter {
  listIds?: string[];
  tagIds?: string[];
  titleRegex?: string;
  dateType?: 'due' | 'created';
  dateFrom?: string;
  dateTo?: string;
  priorities?: number[];
}

export interface AdvancedGroup {
  id: string;
  name: string;
  color: string;
  icon: string;
  filters: AdvancedGroupFilter;
}

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
  smartGroupVisibility: SmartGroupVisibility;
  advancedGroups: AdvancedGroup[];

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
  setSmartGroupVisibility: (key: keyof SmartGroupVisibility, visible: boolean) => void;
  addAdvancedGroup: (group: AdvancedGroup) => void;
  updateAdvancedGroup: (group: AdvancedGroup) => void;
  deleteAdvancedGroup: (id: string) => void;
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
      smartGroupVisibility: { tomorrow: true, recent7days: true, thisMonth: true },
      advancedGroups: [],

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
      setSmartGroupVisibility: (key, visible) =>
        set((state) => ({
          smartGroupVisibility: { ...state.smartGroupVisibility, [key]: visible },
        })),
      addAdvancedGroup: (group) =>
        set((state) => ({ advancedGroups: [...state.advancedGroups, group] })),
      updateAdvancedGroup: (group) =>
        set((state) => ({
          advancedGroups: state.advancedGroups.map((g) => (g.id === group.id ? group : g)),
        })),
      deleteAdvancedGroup: (id) =>
        set((state) => ({ advancedGroups: state.advancedGroups.filter((g) => g.id !== id) })),
    }),
    {
      name: 'mindless-app-settings',
    }
  )
);
