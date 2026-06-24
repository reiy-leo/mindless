import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '@/lib/api';
import type { CreateTaskParams, UpdateTaskParams, ListSettings } from '@/types/task';

// ==================== Queries ====================

export function useTasks() {
  return useQuery({
    queryKey: ['tasks'],
    queryFn: () => api.getTasks(),
  });
}

export function useAllTasks() {
  return useQuery({
    queryKey: ['allTasks'],
    queryFn: () => api.getAllTasks(),
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

export function useAtomTag(name: string) {
  return useQuery({
    queryKey: ['atom-tag', name],
    queryFn: () => api.getAtomTag(name),
  });
}

export function useSubtasks(taskId: string) {
  return useQuery({
    queryKey: ['subtasks', taskId],
    queryFn: () => api.getSubtasks(taskId),
    enabled: !!taskId,
  });
}

export function useAllSubtasks(taskIds: string[]) {
  return useQuery({
    queryKey: ['all-subtasks', ...taskIds.sort()],
    queryFn: () => api.getAllSubtasks(taskIds),
    enabled: taskIds.length > 0,
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
    onError: (error) => {
      console.error('Failed to create task:', error);
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

export function useCompleteRecurringTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.completeRecurringTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useReorderTasks() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (items: { id: string; sortOrder: number }[]) => api.reorderTasks(items),
    onMutate: async (items) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      const previousTasks = queryClient.getQueryData<any[]>(['tasks']);
      queryClient.setQueryData(['tasks'], (old: any[] | undefined) => {
        if (!old) return old;
        const orderMap = new Map(items.map((item, idx) => [item.id, idx]));
        return [...old].sort((a, b) => {
          const aOrder = orderMap.get(a.id) ?? a.sortOrder ?? 0;
          const bOrder = orderMap.get(b.id) ?? b.sortOrder ?? 0;
          return aOrder - bOrder;
        });
      });
      return { previousTasks };
    },
    onError: (_err, _items, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(['tasks'], context.previousTasks);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useReorderSubtasks() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (items: { id: string; sortOrder: number }[]) => api.reorderSubtasks(items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subtasks'], exact: false });
    },
  });
}

export function useReorderSteps() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (items: { id: string; sortOrder: number }[]) => api.reorderSteps(items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['steps'] });
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
      queryClient.invalidateQueries({ queryKey: ['all-subtasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
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
      queryClient.invalidateQueries({ queryKey: ['all-subtasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useDeleteSubtask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { id: string; taskId: string }) =>
      api.deleteSubtask(params.id, params.taskId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['subtasks', variables.taskId] });
      queryClient.invalidateQueries({ queryKey: ['all-subtasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

// ==================== Step Mutations ====================

export function useCreateStep() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { taskId: string; description: string; dueDate?: string; dueTime?: string }) =>
      api.createStep(params),
    onSuccess: (newStep, variables) => {
      queryClient.setQueryData(['steps', variables.taskId], (old: any[] | undefined) => {
        if (!old) return [newStep];
        return [...old, newStep];
      });
    },
    onSettled: (_data, _error, variables) => {
      if (variables) {
        queryClient.invalidateQueries({ queryKey: ['steps', variables.taskId] });
        queryClient.invalidateQueries({ queryKey: ['task', variables.taskId] });
      }
    },
    onError: (error) => {
      console.error('Failed to create step:', error);
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

// ==================== List Mutations ====================

export function useCreateList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { name: string; color?: string; icon?: string }) =>
      api.createList(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lists'] });
    },
  });
}

export function useUpdateList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...params }: { id: string; name?: string; color?: string; icon?: string; sortOrder?: number; isPinned?: boolean; isArchived?: boolean }) =>
      api.updateList(id, params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lists'] });
    },
  });
}

export function useDeleteList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.deleteList(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lists'] });
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

export function useMoveTags() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (items: { id: string; parentId?: string | null; level?: number; sortOrder?: number }[]) =>
      api.moveTags(items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
  });
}

// ==================== Calendar Event Queries ====================

export function useCalendarEvents() {
  return useQuery({
    queryKey: ['calendar-events'],
    queryFn: () => api.getCalendarEvents(),
  });
}

export function useCalendarEventsByRange(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['calendar-events', startDate, endDate],
    queryFn: () => api.getCalendarEventsByRange(startDate, endDate),
    enabled: !!startDate && !!endDate,
  });
}

export function useImportCalendarEvents() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { events: { title: string; eventDate: string; eventType?: string; color?: string; isLunar?: boolean }[]; source?: string }) =>
      api.importCalendarEvents(params.events, params.source),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
    },
  });
}

export function useClearAllCalendarEvents() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.clearAllCalendarEvents(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
    },
  });
}

// List Settings
export function useListSettings(listId: string | null) {
  return useQuery({
    queryKey: ['list-settings', listId],
    queryFn: () => api.getListSettings(listId!),
    enabled: !!listId,
    staleTime: Infinity,
  });
}

export function useSaveListSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (settings: ListSettings) => api.saveListSettings(settings),
    onSuccess: (_data, variables) => {
      queryClient.setQueryData(['list-settings', variables.listId], variables);
    },
  });
}

// ==================== Attachment Queries ====================

export function useAttachments(taskId: string) {
  return useQuery({
    queryKey: ['attachments', taskId],
    queryFn: () => api.getAttachmentsByTask(taskId),
    enabled: !!taskId,
  });
}

export function useCreateAttachment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { taskId: string; originalFilename: string; fileBytes: number[] }) =>
      api.createAttachment(params),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['attachments', variables.taskId] });
    },
  });
}

export function useDeleteAttachment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteAttachment(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['attachments', data.taskId] });
    },
  });
}


export function useAllAttachments() {
  return useQuery({
    queryKey: ['all-attachments'],
    queryFn: () => api.getAllAttachments(),
  });
}

export function useUpdateAttachmentFilename() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { id: string; originalFilename: string }) =>
      api.updateAttachmentFilename(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-attachments'] });
    },
  });
}

export function useDeleteAttachmentLocalCache() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteAttachmentLocalCache(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-attachments'] });
    },
  });
}

export function useTaskLinkedItems(taskId: string | undefined) {
  return useQuery({
    queryKey: ['taskLinkedItems', taskId],
    queryFn: () => api.getTaskLinkedItems(taskId!),
    enabled: !!taskId,
  });
}

export function useLinkTaskItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, linkedType, linkedId }: { taskId: string; linkedType: string; linkedId: string }) =>
      api.linkTaskItem(taskId, linkedType, linkedId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskLinkedItems'] });
    },
  });
}

export function useUnlinkTaskItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.unlinkTaskItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskLinkedItems'] });
    },
  });
}
