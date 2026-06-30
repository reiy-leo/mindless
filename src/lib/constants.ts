// Priority constants
export const PRIORITY = {
  URGENT: 10, // 十万火急
  HIGH: 9, // 高优先级
  LOW: 3, // 低优先级
  MEDIUM: 6, // 中等优先级
  NONE: 0, // 无优先级
} as const

// Priority colors
export const PRIORITY_COLORS: Record<number, string> = {
  [PRIORITY.NONE]: '#9CA3AF', // gray
  [PRIORITY.LOW]: '#3B82F6', // blue
  [PRIORITY.MEDIUM]: '#F59E0B', // yellow
  [PRIORITY.HIGH]: '#EF4444', // red
  [PRIORITY.URGENT]: '#F43F5E', // rose
}
export const PRIORITY_COLOR_FALLBACK = '#9CA3AF'

// View modes
export const VIEW_MODES = {
  calendar: 'tasks.views.calendar',
  kanban: 'tasks.views.kanban',
  list: 'tasks.views.list',
  matrix: 'tasks.views.matrix',
} as const

// Languages
export const LANGUAGES = {
  EN: 'en',
  JA: 'ja',
  ZH: 'zh',
} as const

// Themes
export const THEMES = {
  DARK: 'dark',
  LIGHT: 'light',
  SYSTEM: 'system',
} as const
