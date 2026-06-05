import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '@/lib/api';
import type { CreateTaskParams, UpdateTaskParams } from '@/types/task';

// ==================== Queries ====================

export function useTasks() {
  return useQuery({
    queryKey: ['tasks'],
    queryFn: () => api.getTasks(),
  });
}

export function useTask(id: string) {
  return useQuery({
    queryKey: ['task', id],
    queryFn: () => api.getTaskById(id),
    enabled: !!id,
  });
}

export function useLists() {
  return useQuery({
    queryKey: ['lists'],
    queryFn: () => api.getLists(),
  });
}

export function useTags() {
  return useQuery({
    queryKey: ['tags'],
    queryFn: () => api.getTags(),
  });
}

export function useSubtasks(taskId: string) {
  return useQuery({
    queryKey: ['subtasks', taskId],
    queryFn: () => api.getSubtasks(taskId),
    enabled: !!taskId,
  });
}

export function useSteps(taskId: string) {
  return useQuery({
    queryKey: ['steps', taskId],
    queryFn: () => api.getSteps(taskId),
    enabled: !!taskId,
  });
}

// ==================== Task Mutations ====================

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: CreateTaskParams) => api.createTask(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...params }: UpdateTaskParams & { id: string }) =>
      api.updateTask(id, params),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', variables.id] });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.deleteTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useToggleTaskCompletion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isCompleted }: { id: string; isCompleted: boolean }) =>
      api.updateTask(id, { isCompleted }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', variables.id] });
    },
  });
}

// ==================== Subtask Mutations ====================

export function useCreateSubtask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { taskId: string; title: string; parentSubtaskId?: string; level?: number }) =>
      api.createSubtask(params),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['subtasks', variables.taskId] });
      queryClient.invalidateQueries({ queryKey: ['task', variables.taskId] });
    },
  });
}

export function useUpdateSubtask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, taskId, ...params }: { id: string; taskId: string; title?: string; isCompleted?: boolean }) =>
      api.updateSubtask(id, params),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['subtasks', variables.taskId] });
    },
  });
}

export function useDeleteSubtask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { id: string; taskId: string }) =>
      api.deleteSubtask(params.id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['subtasks', variables.taskId] });
    },
  });
}

// ==================== Step Mutations ====================

export function useCreateStep() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { taskId: string; description: string; dueDate?: string; dueTime?: string }) =>
      api.createStep(params),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['steps', variables.taskId] });
      queryClient.invalidateQueries({ queryKey: ['task', variables.taskId] });
    },
  });
}

export function useUpdateStep() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, taskId, ...params }: { id: string; taskId: string; description?: string; dueDate?: string; dueTime?: string; isCompleted?: boolean }) =>
      api.updateStep(id, params),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['steps', variables.taskId] });
    },
  });
}

export function useDeleteStep() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { id: string; taskId: string }) =>
      api.deleteStep(params.id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['steps', variables.taskId] });
    },
  });
}

// ==================== Tag Mutations ====================

export function useCreateTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { name: string; color?: string; emoji?: string; parentId?: string; level?: number }) =>
      api.createTag(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
  });
}

export function useUpdateTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...params }: { id: string; name?: string; color?: string; emoji?: string }) =>
      api.updateTag(id, params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
  });
}

export function useDeleteTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.deleteTag(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
  });
}
