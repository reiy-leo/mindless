import type { Task } from '@/types/task'

export function isTaskAbandoned(task: Task): boolean {
  return task.status === 'closed'
}

export function isTaskCompletedForFilter(task: Task): boolean {
  return task.isCompleted || isTaskAbandoned(task)
}
