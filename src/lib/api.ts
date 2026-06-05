import { invoke } from '@tauri-apps/api/core';
import type { Task, Habit, Countdown, Tag, Subtask, Step, List } from '@/types';

// Task APIs
export async function getTasks(): Promise<Task[]> {
  return await invoke<Task[]>('get_tasks');
}

export async function getTaskById(id: string): Promise<Task> {
  return await invoke<Task>('get_task_by_id', { id });
}

export async function createTask(params: {
  title: string;
  description?: string;
  priority?: number;
  dueDate?: string;
  dueTime?: string;
  startDate?: string;
  listId?: string;
  tagIds?: string;
}): Promise<Task> {
  return await invoke<Task>('create_task', params);
}

export async function updateTask(id: string, params: {
  title?: string;
  description?: string;
  isCompleted?: boolean;
  priority?: number;
  dueDate?: string;
  dueTime?: string;
  startDate?: string;
  listId?: string;
  tagIds?: string;
}): Promise<Task> {
  return await invoke<Task>('update_task', { id, ...params });
}

export async function deleteTask(id: string): Promise<void> {
  return await invoke<void>('delete_task', { id });
}

// List APIs
export async function getLists(): Promise<List[]> {
  return await invoke<List[]>('get_lists');
}

// Tag APIs
export async function getTags(): Promise<Tag[]> {
  return await invoke<Tag[]>('get_tags');
}

export async function createTag(params: {
  name: string;
  color?: string;
  emoji?: string;
  parentId?: string;
  level?: number;
}): Promise<Tag> {
  return await invoke<Tag>('create_tag', params);
}

export async function updateTag(id: string, params: {
  name?: string;
  color?: string;
  emoji?: string;
}): Promise<Tag> {
  return await invoke<Tag>('update_tag', { id, ...params });
}

export async function deleteTag(id: string): Promise<void> {
  return await invoke<void>('delete_tag', { id });
}

// Subtask APIs
export async function getSubtasks(taskId: string): Promise<Subtask[]> {
  return await invoke<Subtask[]>('get_subtasks', { taskId });
}

export async function createSubtask(params: {
  taskId: string;
  title: string;
  parentSubtaskId?: string;
  level?: number;
}): Promise<Subtask> {
  return await invoke<Subtask>('create_subtask', params);
}

export async function updateSubtask(id: string, params: {
  title?: string;
  isCompleted?: boolean;
}): Promise<Subtask> {
  return await invoke<Subtask>('update_subtask', { id, ...params });
}

export async function deleteSubtask(id: string): Promise<void> {
  return await invoke<void>('delete_subtask', { id });
}

// Step APIs
export async function getSteps(taskId: string): Promise<Step[]> {
  return await invoke<Step[]>('get_steps', { taskId });
}

export async function createStep(params: {
  taskId: string;
  description: string;
  dueDate?: string;
  dueTime?: string;
}): Promise<Step> {
  return await invoke<Step>('create_step', params);
}

export async function updateStep(id: string, params: {
  description?: string;
  dueDate?: string;
  dueTime?: string;
  isCompleted?: boolean;
}): Promise<Step> {
  return await invoke<Step>('update_step', { id, ...params });
}

export async function deleteStep(id: string): Promise<void> {
  return await invoke<void>('delete_step', { id });
}

// Habit APIs
export async function getHabits(): Promise<Habit[]> {
  return await invoke<Habit[]>('get_habits');
}

export async function getHabitById(id: string): Promise<Habit> {
  return await invoke<Habit>('get_habit_by_id', { id });
}

export async function getHabitLogs(habitId: string, startDate?: string, endDate?: string): Promise<any[]> {
  return await invoke<any[]>('get_habit_logs', { habitId, startDate, endDate });
}

export async function createHabit(params: {
  name: string;
  targetType?: string;
  frequency?: string;
  reminderEnabled?: boolean;
}): Promise<Habit> {
  return await invoke<Habit>('create_habit', params);
}

export async function updateHabit(id: string, params: Partial<Habit>): Promise<Habit> {
  return await invoke<Habit>('update_habit', { id, ...params });
}

export async function deleteHabit(id: string): Promise<void> {
  return await invoke<void>('delete_habit', { id });
}

export async function checkInHabit(habitId: string, date: string): Promise<void> {
  return await invoke<void>('check_in_habit', { habitId, date });
}

// Countdown APIs
export async function getCountdowns(): Promise<Countdown[]> {
  return await invoke<Countdown[]>('get_countdowns');
}

export async function getCountdownById(id: string): Promise<Countdown> {
  return await invoke<Countdown>('get_countdown_by_id', { id });
}

export async function createCountdown(params: {
  name: string;
  targetDate: string;
  reminderEnabled?: boolean;
}): Promise<Countdown> {
  return await invoke<Countdown>('create_countdown', params);
}

export async function updateCountdown(id: string, params: Partial<Countdown>): Promise<Countdown> {
  return await invoke<Countdown>('update_countdown', { id, ...params });
}

export async function deleteCountdown(id: string): Promise<void> {
  return await invoke<void>('delete_countdown', { id });
}
