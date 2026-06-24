import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Language, PriorityMode, Theme } from '@/types'

export type ThemeColor = string
export type SidebarMode = 'icon' | 'text' | 'both'
type SortBy = 'sortOrder' | 'dueDate' | 'startDate' | 'priority' | 'createdAt'
type SortOrder = 'asc' | 'desc'
type GroupBy = 'none' | 'priority' | 'list'
export type FontSize = 'small' | 'default' | 'large' | 'xlarge'
export type TimeFormat = 'cn_natural' | 'cn_24h' | 'cn_12h' | 'en_12h' | '24h'
export type DateFormat = 'relative' | 'yyyy_slash_mm_dd' | 'yyyy_dash_mm_dd' | 'mm_dd_yyyy' | 'mm_dd'
export type TimezoneFormat = 'short_offset' | 'iana' | 'compact' | 'gmt' | 'utc_colon' | 'iso_colon' | 'cn_zone'
export type ViewModeSimple = 'grid' | 'list'

interface SmartGroupVisibility {
  recent7days: boolean
  thisMonth: boolean
  tomorrow: boolean
}

export interface AdvancedGroupFilter {
  dateFrom?: string
  dateFutureDays?: number
  dateMode?: 'absolute' | 'relative'
  datePastDays?: number
  dateTo?: string
  dateType?: 'due' | 'created'
  listIds?: string[]
  priorities?: number[]
  tagIds?: string[]
  titleRegex?: string
}

export interface AdvancedGroup {
  color: string
  filters: AdvancedGroupFilter
  icon: string
  id: string
  isPinned?: boolean
  name: string
}

interface AppState {
  addAdvancedGroup: (group: AdvancedGroup) => void
  advancedGroups: AdvancedGroup[]
  dateFormat: DateFormat
  deleteAdvancedGroup: (id: string) => void
  detailPanelWidth: number
  fontSize: FontSize
  groupsPanelWidth: number
  habitGroupsPanelWidth: number
  habitGroupViewModes: Record<string, 'list' | 'card'>
  language: Language
  mediaDetailPanelWidth: number
  mediaSidebarWidth: number
  mediaViewMode: ViewModeSimple
  noteGroupsPanelWidth: number
  notificationEnabled: boolean
  personGroupsPanelWidth: number
  priorityMode: PriorityMode
  selectedHabitGroupId: string
  selectedTimezone: string
  setDateFormat: (fmt: DateFormat) => void
  setDetailPanelWidth: (width: number | ((prev: number) => number)) => void
  setFontSize: (size: FontSize) => void
  setGroupsPanelWidth: (width: number | ((prev: number) => number)) => void
  setHabitGroupsPanelWidth: (width: number | ((prev: number) => number)) => void
  setHabitGroupViewMode: (groupId: string, mode: 'list' | 'card') => void
  setLanguage: (lang: Language) => void
  setMediaDetailPanelWidth: (width: number) => void
  setMediaSidebarWidth: (width: number) => void
  setMediaViewMode: (mode: 'grid' | 'list') => void
  setNoteGroupsPanelWidth: (width: number | ((prev: number) => number)) => void
  setNotificationEnabled: (enabled: boolean) => void
  setPersonGroupsPanelWidth: (width: number | ((prev: number) => number)) => void
  setPriorityMode: (mode: PriorityMode) => void
  setSelectedHabitGroupId: (id: string) => void
  setSelectedTimezone: (tz: string) => void
  setShowLunar: (show: boolean) => void
  setShowTimezone: (show: boolean) => void
  setSidebarMode: (mode: SidebarMode) => void
  setSmartGroupVisibility: (key: keyof SmartGroupVisibility, visible: boolean) => void
  setTaskGroupBy: (by: GroupBy) => void
  setTaskSortBy: (by: SortBy) => void
  setTaskSortOrder: (order: SortOrder) => void

  setTheme: (theme: Theme) => void
  setThemeColor: (color: ThemeColor) => void
  setTimeFormat: (fmt: TimeFormat) => void
  setTimezoneFormat: (fmt: TimezoneFormat) => void
  setWeekStartDay: (day: number) => void
  showLunar: boolean
  showTimezone: boolean
  sidebarCollapsed: boolean
  sidebarMode: SidebarMode
  smartGroupVisibility: SmartGroupVisibility
  taskGroupBy: GroupBy
  taskSortBy: SortBy
  taskSortOrder: SortOrder
  theme: Theme
  themeColor: ThemeColor
  timeFormat: TimeFormat
  timezoneFormat: TimezoneFormat
  toggleSidebar: () => void
  updateAdvancedGroup: (group: AdvancedGroup) => void
  weekStartDay: number
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      addAdvancedGroup: (group) => set((state) => ({ advancedGroups: [...state.advancedGroups, group] })),
      advancedGroups: [],
      dateFormat: 'relative',
      deleteAdvancedGroup: (id) =>
        set((state) => ({ advancedGroups: state.advancedGroups.filter((g) => g.id !== id) })),
      detailPanelWidth: 400,
      fontSize: 'default',
      groupsPanelWidth: 192,
      habitGroupsPanelWidth: 192,
      habitGroupViewModes: {},
      language: 'zh',
      mediaDetailPanelWidth: 320,
      mediaSidebarWidth: 240,
      mediaViewMode: 'grid',
      noteGroupsPanelWidth: 192,
      notificationEnabled: true,
      personGroupsPanelWidth: 192,
      priorityMode: 'Traditional',
      selectedHabitGroupId: 'all',
      selectedTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      setDateFormat: (dateFormat) => set({ dateFormat }),
      setDetailPanelWidth: (width) =>
        set((state) => ({
          detailPanelWidth: typeof width === 'function' ? width(state.detailPanelWidth) : width,
        })),
      setFontSize: (fontSize) => set({ fontSize }),
      setGroupsPanelWidth: (width) =>
        set((state) => ({
          groupsPanelWidth: typeof width === 'function' ? width(state.groupsPanelWidth) : width,
        })),
      setHabitGroupsPanelWidth: (width) =>
        set((state) => ({
          habitGroupsPanelWidth: typeof width === 'function' ? width(state.habitGroupsPanelWidth) : width,
        })),
      setHabitGroupViewMode: (groupId, mode) =>
        set((state) => ({
          habitGroupViewModes: { ...state.habitGroupViewModes, [groupId]: mode },
        })),
      setLanguage: (language) => set({ language }),
      setMediaDetailPanelWidth: (width) => set({ mediaDetailPanelWidth: width }),
      setMediaSidebarWidth: (width) => set({ mediaSidebarWidth: width }),
      setMediaViewMode: (mode) => set({ mediaViewMode: mode }),
      setNoteGroupsPanelWidth: (width) =>
        set((state) => ({
          noteGroupsPanelWidth: typeof width === 'function' ? width(state.noteGroupsPanelWidth) : width,
        })),
      setNotificationEnabled: (notificationEnabled) => set({ notificationEnabled }),
      setPersonGroupsPanelWidth: (width) =>
        set((state) => ({
          personGroupsPanelWidth: typeof width === 'function' ? width(state.personGroupsPanelWidth) : width,
        })),
      setPriorityMode: (priorityMode) => set({ priorityMode }),
      setSelectedHabitGroupId: (id) => set({ selectedHabitGroupId: id }),
      setSelectedTimezone: (selectedTimezone) => set({ selectedTimezone }),
      setShowLunar: (showLunar) => set({ showLunar }),
      setShowTimezone: (showTimezone) => set({ showTimezone }),
      setSidebarMode: (sidebarMode) => set({ sidebarMode }),
      setSmartGroupVisibility: (key, visible) =>
        set((state) => ({
          smartGroupVisibility: { ...state.smartGroupVisibility, [key]: visible },
        })),
      setTaskGroupBy: (taskGroupBy) => set({ taskGroupBy }),
      setTaskSortBy: (taskSortBy) => set({ taskSortBy }),
      setTaskSortOrder: (taskSortOrder) => set({ taskSortOrder }),

      setTheme: (theme) => set({ theme }),
      setThemeColor: (themeColor) => set({ themeColor }),
      setTimeFormat: (timeFormat) => set({ timeFormat }),
      setTimezoneFormat: (timezoneFormat) => set({ timezoneFormat }),
      setWeekStartDay: (weekStartDay) => set({ weekStartDay }),
      showLunar: true,
      showTimezone: true,
      sidebarCollapsed: false,
      sidebarMode: 'both',
      smartGroupVisibility: { recent7days: true, thisMonth: true, tomorrow: true },
      taskGroupBy: 'none',
      taskSortBy: 'dueDate',
      taskSortOrder: 'asc',
      theme: 'system',
      themeColor: '#6B8E23',
      timeFormat: '24h',
      timezoneFormat: 'short_offset',
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      updateAdvancedGroup: (group) =>
        set((state) => ({
          advancedGroups: state.advancedGroups.map((g) => (g.id === group.id ? group : g)),
        })),
      weekStartDay: 1,
    }),
    {
      name: 'mindless-app-settings',
      partialize: (state) => ({
        advancedGroups: state.advancedGroups,
        dateFormat: state.dateFormat,
        detailPanelWidth: state.detailPanelWidth,
        fontSize: state.fontSize,
        groupsPanelWidth: state.groupsPanelWidth,
        habitGroupsPanelWidth: state.habitGroupsPanelWidth,
        habitGroupViewModes: state.habitGroupViewModes,
        language: state.language,
        mediaDetailPanelWidth: state.mediaDetailPanelWidth,
        mediaSidebarWidth: state.mediaSidebarWidth,
        mediaViewMode: state.mediaViewMode,
        noteGroupsPanelWidth: state.noteGroupsPanelWidth,
        notificationEnabled: state.notificationEnabled,
        personGroupsPanelWidth: state.personGroupsPanelWidth,
        priorityMode: state.priorityMode,
        selectedHabitGroupId: state.selectedHabitGroupId,
        selectedTimezone: state.selectedTimezone,
        showLunar: state.showLunar,
        showTimezone: state.showTimezone,
        sidebarCollapsed: state.sidebarCollapsed,
        sidebarMode: state.sidebarMode,
        smartGroupVisibility: state.smartGroupVisibility,
        theme: state.theme,
        themeColor: state.themeColor,
        timeFormat: state.timeFormat,
        timezoneFormat: state.timezoneFormat,
        weekStartDay: state.weekStartDay,
      }),
    },
  ),
)
