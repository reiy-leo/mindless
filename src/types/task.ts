// Task types
import type { Tag } from './tag';

export type PriorityMode = 'simple' | 'detailed';
export type Priority = 0 | 1 | 2 | 3; // 4级优先级: 0=无, 1=低, 2=中, 3=高
export type SortBy = 'dueDate' | 'startDate' | 'priority' | 'createdAt';
export type GroupBy = 'none' | 'priority' | 'list';

export interface Task {
  id: string;
  title: string;
  description: string;
  isCompleted: boolean;
  priority: Priority;           // 0-3 或 0-10 (取决于设置)
  dueDate?: string;             // ISO date
  dueTime?: string;             // HH:mm
  startDate?: string;
  reminderTime?: string;        // ISO datetime
  recurrenceRule?: string;
  recurrenceEndDate?: string;
  listId?: string;
  tagIds?: string;              // 逗号分隔的标签ID字符串
  tags?: Tag[];                 // 关联的标签对象 (可选)
  sortBy: SortBy;               // 排序字段
  groupBy: GroupBy;             // 分组字段
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
  startDate?: string;
  listId?: string;
}

export interface UpdateTaskParams {
  title?: string;
  description?: string;
  isCompleted?: boolean;
  priority?: number;
  dueDate?: string;
  dueTime?: string;
  startDate?: string;
  listId?: string;
}

export interface Subtask {
  id: string;
  taskId: string;
  parentSubtaskId?: string;     // 父子任务ID
  title: string;
  isCompleted: boolean;
  sortOrder: number;
  level: number;                // 层级深度 (0-3, 最多4级)
  createdAt: string;
  updatedAt: string;
  children?: Subtask[];         // 子任务 (树形结构)
}

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
  createdAt: string;
  updatedAt: string;
}
