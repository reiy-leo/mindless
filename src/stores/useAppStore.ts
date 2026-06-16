import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark' | 'system';
type Language = 'zh' | 'en' | 'ja';
export type ThemeColor = string;
export type SidebarMode = 'icon' | 'text' | 'both';
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
  themeColor: ThemeColor;
  language: Language;
  sidebarCollapsed: boolean;
  sidebarMode: SidebarMode;
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
  selectedHabitGroupId: string;
  habitGroupsPanelWidth: number;
  habitGroupViewModes: Record<string, 'list' | 'card'>;
  noteGroupsPanelWidth: number;
  personGroupsPanelWidth: number;
  mediaSidebarWidth: number;
  mediaDetailPanelWidth: number;
  mediaViewMode: 'grid' | 'list';

  setTheme: (theme: Theme) => void;
  setThemeColor: (color: ThemeColor) => void;
  setLanguage: (lang: Language) => void;
  toggleSidebar: () => void;
  setSidebarMode: (mode: SidebarMode) => void;
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
  setSelectedHabitGroupId: (id: string) => void;
  setHabitGroupsPanelWidth: (width: number | ((prev: number) => number)) => void;
  setHabitGroupViewMode: (groupId: string, mode: 'list' | 'card') => void;
  setNoteGroupsPanelWidth: (width: number | ((prev: number) => number)) => void;
  setPersonGroupsPanelWidth: (width: number | ((prev: number) => number)) => void;
  setMediaSidebarWidth: (width: number) => void;
  setMediaDetailPanelWidth: (width: number) => void;
  setMediaViewMode: (mode: 'grid' | 'list') => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      theme: 'system',
      themeColor: '#6B8E23',
      language: 'zh',
      sidebarCollapsed: false,
      sidebarMode: 'both',
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
      selectedHabitGroupId: 'all',
      habitGroupsPanelWidth: 192,
      habitGroupViewModes: {},
      noteGroupsPanelWidth: 192,
      personGroupsPanelWidth: 192,
      mediaSidebarWidth: 240,
      mediaDetailPanelWidth: 320,
      mediaViewMode: 'grid',

      setTheme: (theme) => set({ theme }),
      setThemeColor: (themeColor) => set({ themeColor }),
      setLanguage: (language) => set({ language }),
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarMode: (sidebarMode) => set({ sidebarMode }),
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
      setSelectedHabitGroupId: (id) => set({ selectedHabitGroupId: id }),
      setHabitGroupsPanelWidth: (width) =>
        set((state) => ({
          habitGroupsPanelWidth: typeof width === 'function' ? width(state.habitGroupsPanelWidth) : width,
        })),
      setHabitGroupViewMode: (groupId, mode) =>
        set((state) => ({
          habitGroupViewModes: { ...state.habitGroupViewModes, [groupId]: mode },
        })),
      setNoteGroupsPanelWidth: (width) =>
        set((state) => ({
          noteGroupsPanelWidth: typeof width === 'function' ? width(state.noteGroupsPanelWidth) : width,
        })),
      setPersonGroupsPanelWidth: (width) =>
        set((state) => ({
          personGroupsPanelWidth: typeof width === 'function' ? width(state.personGroupsPanelWidth) : width,
        })),
      setMediaSidebarWidth: (width) => set({ mediaSidebarWidth: width }),
      setMediaDetailPanelWidth: (width) => set({ mediaDetailPanelWidth: width }),
      setMediaViewMode: (mode) => set({ mediaViewMode: mode }),
    }),
    {
      name: 'mindless-app-settings',
      partialize: (state) => ({
        theme: state.theme,
        themeColor: state.themeColor,
        language: state.language,
        sidebarCollapsed: state.sidebarCollapsed,
        sidebarMode: state.sidebarMode,
        priorityMode: state.priorityMode,
        notificationEnabled: state.notificationEnabled,
        weekStartDay: state.weekStartDay,
        fontSize: state.fontSize,
        smartGroupVisibility: state.smartGroupVisibility,
        advancedGroups: state.advancedGroups,
        groupsPanelWidth: state.groupsPanelWidth,
        detailPanelWidth: state.detailPanelWidth,
        selectedHabitGroupId: state.selectedHabitGroupId,
        habitGroupsPanelWidth: state.habitGroupsPanelWidth,
        habitGroupViewModes: state.habitGroupViewModes,
        noteGroupsPanelWidth: state.noteGroupsPanelWidth,
        personGroupsPanelWidth: state.personGroupsPanelWidth,
        mediaSidebarWidth: state.mediaSidebarWidth,
        mediaDetailPanelWidth: state.mediaDetailPanelWidth,
        mediaViewMode: state.mediaViewMode,
      }),
    }
  )
);
