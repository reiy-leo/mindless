import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark' | 'system';
type Language = 'zh' | 'en' | 'ja';
type SortBy = 'sortOrder' | 'dueDate' | 'startDate' | 'priority' | 'createdAt';
type SortOrder = 'asc' | 'desc';
type GroupBy = 'none' | 'priority' | 'list';
export type FontSize = 'small' | 'default' | 'large' | 'xlarge';

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
  dateMode?: 'absolute' | 'relative';
  dateFrom?: string;
  dateTo?: string;
  datePastDays?: number;
  dateFutureDays?: number;
  priorities?: number[];
}

export interface AdvancedGroup {
  id: string;
  name: string;
  color: string;
  icon: string;
  isPinned?: boolean;
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
  groupsPanelWidth: number;
  detailPanelWidth: number;

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
  setGroupsPanelWidth: (width: number | ((prev: number) => number)) => void;
  setDetailPanelWidth: (width: number | ((prev: number) => number)) => void;
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
      groupsPanelWidth: 192,
      detailPanelWidth: 400,

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
      setGroupsPanelWidth: (width) =>
        set((state) => ({
          groupsPanelWidth: typeof width === 'function' ? width(state.groupsPanelWidth) : width,
        })),
      setDetailPanelWidth: (width) =>
        set((state) => ({
          detailPanelWidth: typeof width === 'function' ? width(state.detailPanelWidth) : width,
        })),
    }),
    {
      name: 'mindless-app-settings',
      partialize: (state) => ({
        theme: state.theme,
        language: state.language,
        sidebarCollapsed: state.sidebarCollapsed,
        priorityMode: state.priorityMode,
        notificationEnabled: state.notificationEnabled,
        weekStartDay: state.weekStartDay,
        fontSize: state.fontSize,
        smartGroupVisibility: state.smartGroupVisibility,
        advancedGroups: state.advancedGroups,
        groupsPanelWidth: state.groupsPanelWidth,
        detailPanelWidth: state.detailPanelWidth,
      }),
    }
  )
);
