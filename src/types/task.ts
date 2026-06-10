// Task types
import type { Tag } from './tag';

export type PriorityMode = 'simple' | 'detailed';
export type Priority = 0 | 1 | 2 | 3; // 4级优先级: 0=无, 1=低, 2=中, 3=高
export type SortBy = 'sortOrder' | 'dueDate' | 'startDate' | 'priority' | 'createdAt';
export type GroupBy = 'none' | 'priority' | 'list';

export interface Task {
  id: string;
  title: string;
  description: string;
  isCompleted: boolean;
  priority: Priority;           // 0-3 或 0-10 (取决于设置)
  dueDate?: string;             // ISO date
  dueTime?: string;             // HH:mm
  endDate?: string;             // ISO date (end of range)
  endTime?: string;             // HH:mm (end of range)
  startDate?: string;
  reminderTime?: string;        // ISO datetime
  recurrenceRule?: string;
  recurrenceEndDate?: string;
  listId?: string;
  tagIds?: string;              // 逗号分隔的标签ID字符串
  tags?: Tag[];                 // 关联的标签对象 (可选)
  sortBy: SortBy;               // 排序字段
  groupBy: GroupBy;             // 分组字段
  parentTaskId?: string;        // 父任务ID (null = 顶级任务)
  level: number;                // 嵌套层级 (0-3)
  subtasks?: Subtask[];         // 子任务列表 (可选)
  steps?: Step[];               // 步骤列表 (可选)
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  deletedAt?: string;
  sortOrder: number;
}

export interface CreateTaskParams {
  title: string;
  description?: string;
  priority?: number;
  dueDate?: string;
  dueTime?: string;
  endDate?: string;
  endTime?: string;
  startDate?: string;
  listId?: string;
  recurrenceRule?: string;
  recurrenceEndDate?: string;
}

export interface UpdateTaskParams {
  title?: string;
  description?: string;
  isCompleted?: boolean;
  priority?: number;
  dueDate?: string;
  dueTime?: string;
  endDate?: string;
  endTime?: string;
  startDate?: string;
  listId?: string;
  recurrenceRule?: string;
  recurrenceEndDate?: string;
}

// Subtask is now just a Task with parentTaskId set
export type Subtask = Task;

export interface Step {
  id: string;
  taskId: string;
  description: string;          // 富文本描述 (支持加粗、斜体、下划线、链接)
  dueDate?: string;             // 步骤截止日期
  dueTime?: string;             // 步骤截止时间
  isCompleted: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface List {
  id: string;
  name: string;
  color: string;
  icon: string;
  sortOrder: number;
  isPinned: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ListSettings {
  listId: string;
  sortBy: SortBy;
  sortOrder: 'asc' | 'desc';
  groupBy: GroupBy;
  filterStatus: 'all' | 'active' | 'completed';
  viewMode: 'list' | 'calendar' | 'kanban' | 'matrix';
}

export interface CalendarEvent {
  id: string;
  title: string;
  eventDate: string;      // YYYY-MM-DD
  eventType: string;       // 'holiday' | 'lunar' | 'custom'
  color: string;
  source: string;
  isLunar: boolean;
  createdAt: string;
}
