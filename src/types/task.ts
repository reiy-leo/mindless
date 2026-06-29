// Task types
import type { Tag } from './tag'

export type Priority = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10
export type TaskStatus = 'pending' | 'in_progress' | 'today' | 'completed' | 'closed'
export type TaskFilterStatus = 'all' | 'active' | 'completed'
export type SortBy = 'sortOrder' | 'dueDate' | 'startDate' | 'priority' | 'createdAt' | 'completedAt'
export type GroupBy = 'none' | 'priority' | 'list' | 'time'

export interface Task {
  completedAt?: string
  createdAt: string
  deletedAt?: string
  description: string
  dueDate?: string // ISO date
  dueTime?: string // HH:mm
  endDate?: string // ISO date (end of range)
  endTime?: string // HH:mm (end of range)
  groupBy: GroupBy // 分组字段
  id: string
  isCompleted: boolean
  level: number // 嵌套层级 (0-3)
  listId?: string
  parentTaskId?: string // 父任务ID (null = 顶级任务)
  priority: Priority // 0-3 或 0-10 (取决于设置)
  recurrenceEndDate?: string
  recurrenceRule?: string
  reminderTime?: string // ISO datetime
  sortBy: SortBy // 排序字段
  sortOrder: number
  startDate?: string
  status: TaskStatus
  steps?: Step[] // 步骤列表 (可选)
  subtasks?: Subtask[] // 子任务列表 (可选)
  tagIds?: string // 逗号分隔的标签ID字符串
  tags?: Tag[] // 关联的标签对象 (可选)
  title: string
  updatedAt: string
  visibleSections?: string
}

export interface CreateTaskParams {
  description?: string
  dueDate?: string
  dueTime?: string
  endDate?: string
  endTime?: string
  listId?: string
  priority?: number
  recurrenceEndDate?: string
  recurrenceRule?: string
  startDate?: string
  tagIds?: string
  title: string
}

export interface UpdateTaskParams {
  description?: string
  dueDate?: string
  dueTime?: string
  endDate?: string
  endTime?: string
  isCompleted?: boolean
  level?: number
  listId?: string
  parentTaskId?: string
  priority?: number
  recurrenceEndDate?: string
  recurrenceRule?: string
  startDate?: string
  status?: TaskStatus
  tagIds?: string
  title?: string
  visibleSections?: string
}

// Subtask is now just a Task with parentTaskId set
export type Subtask = Task

export interface Step {
  createdAt: string
  description: string // 富文本描述 (支持加粗、斜体、下划线、链接)
  dueDate?: string // 步骤截止日期
  dueTime?: string // 步骤截止时间
  id: string
  isCompleted: boolean
  sortOrder: number
  taskId: string
  updatedAt: string
}

export interface List {
  color: string
  createdAt: string
  icon: string
  id: string
  isArchived: boolean
  isPinned: boolean
  name: string
  sortOrder: number
  updatedAt: string
}

export interface ListSettings {
  filterStatus: TaskFilterStatus
  groupBy: GroupBy
  listId: string
  sortBy: SortBy
  sortOrder: 'asc' | 'desc'
  statusSettings?: Partial<Record<TaskFilterStatus, TaskStatusViewSettings>>
  viewMode: 'list' | 'calendar' | 'kanban' | 'matrix'
}

export interface TaskStatusViewSettings {
  groupBy: GroupBy
  sortBy: SortBy
  sortOrder: 'asc' | 'desc'
}

export interface CalendarEvent {
  color: string
  createdAt: string
  eventDate: string // YYYY-MM-DD
  eventType: string // 'holiday' | 'lunar' | 'custom'
  id: string
  isLunar: boolean
  source: string
  title: string
}
