import type { ListSettings, TaskFilterStatus, TaskStatusViewSettings } from '@/types/task'

export const DEFAULT_STATUS_VIEW_SETTINGS: Record<TaskFilterStatus, TaskStatusViewSettings> = {
  active: { groupBy: 'none', sortBy: 'dueDate', sortOrder: 'asc' },
  all: { groupBy: 'none', sortBy: 'dueDate', sortOrder: 'asc' },
  completed: { groupBy: 'none', sortBy: 'completedAt', sortOrder: 'desc' },
}

export function getStatusViewSettings(
  settings: ListSettings | null,
  status: TaskFilterStatus,
): TaskStatusViewSettings {
  const explicit = settings?.statusSettings?.[status]
  if (explicit) {
    return explicit
  }
  if (settings && status === 'all') {
    return {
      groupBy: settings.groupBy,
      sortBy: settings.sortBy,
      sortOrder: settings.sortOrder,
    }
  }
  return DEFAULT_STATUS_VIEW_SETTINGS[status]
}
