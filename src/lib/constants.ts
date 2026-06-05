// Priority constants
export const PRIORITY = {
  NONE: 0,    // 无优先级
  LOW: 1,     // 低优先级
  MEDIUM: 2,  // 中等优先级
  HIGH: 3,    // 高优先级
} as const;

// Priority labels
export const PRIORITY_LABELS: Record<number, string> = {
  [PRIORITY.NONE]: '无',
  [PRIORITY.LOW]: '低',
  [PRIORITY.MEDIUM]: '中',
  [PRIORITY.HIGH]: '高',
};

// Priority colors
export const PRIORITY_COLORS: Record<number, string> = {
  [PRIORITY.NONE]: '#9CA3AF', // gray
  [PRIORITY.LOW]: '#3B82F6',  // blue
  [PRIORITY.MEDIUM]: '#F59E0B', // yellow
  [PRIORITY.HIGH]: '#EF4444',  // red
};

// View modes
export const VIEW_MODES = {
  list: 'tasks.views.list',
  calendar: 'tasks.views.calendar',
  kanban: 'tasks.views.kanban',
  grid: 'tasks.views.grid',
} as const;

// Languages
export const LANGUAGES = {
  ZH: 'zh',
  EN: 'en',
  JA: 'ja',
} as const;

// Themes
export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system',
} as const;
