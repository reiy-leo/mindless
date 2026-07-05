import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { emit, listen } from '@tauri-apps/api/event'
import { useEffect } from 'react'
import * as api from '@/lib/api'
import type { CreateTaskParams, List, ListSettings, UpdateTaskParams } from '@/types/task'

function notifyTagsChanged() {
  emit('tags:changed').catch((err) => console.warn('Failed to emit tags:changed:', err))
}

const LISTS_EVENT_SOURCE = globalThis.crypto?.randomUUID?.() ?? `lists-${Date.now()}-${Math.random()}`

function notifyListsChanged(source?: string) {
  emit('lists:changed', source ? { source } : undefined).catch((err) =>
    console.warn('Failed to emit lists:changed:', err),
  )
}

// ==================== Queries ====================

export function useTasks() {
  return useQuery({
    queryFn: () => api.getTasks(),
    queryKey: ['tasks'],
  })
}

export function useAllTasks() {
  return useQuery({
    queryFn: () => api.getAllTasks(),
    queryKey: ['allTasks'],
  })
}

export function useTask(id: string) {
  return useQuery({
    enabled: !!id,
    queryFn: () => api.getTaskById(id),
    queryKey: ['task', id],
  })
}

export function useLists() {
  const queryClient = useQueryClient()

  useEffect(() => {
    const unlisten = listen<{ source?: string }>('lists:changed', (event) => {
      if (event.payload?.source === LISTS_EVENT_SOURCE) {
        return
      }
      queryClient.invalidateQueries({ queryKey: ['lists'] })
    })

    return () => {
      unlisten.then((fn) => fn()).catch(() => {})
    }
  }, [queryClient])

  return useQuery({
    queryFn: () => api.getLists(),
    queryKey: ['lists'],
  })
}

export function useTags() {
  return useQuery({
    queryFn: () => api.getTags(),
    queryKey: ['tags'],
  })
}

export function useAtomTag(name: string) {
  return useQuery({
    queryFn: () => api.getAtomTag(name),
    queryKey: ['atom-tag', name],
  })
}

export function useSubtasks(taskId: string) {
  return useQuery({
    enabled: !!taskId,
    queryFn: () => api.getSubtasks(taskId),
    queryKey: ['subtasks', taskId],
  })
}

export function useAllSubtasks(taskIds: string[]) {
  return useQuery({
    enabled: taskIds.length > 0,
    queryFn: () => api.getAllSubtasks(taskIds),
    queryKey: ['all-subtasks', ...taskIds.sort()],
  })
}

export function useSteps(taskId: string) {
  return useQuery({
    enabled: !!taskId,
    queryFn: () => api.getSteps(taskId),
    queryKey: ['steps', taskId],
  })
}

// ==================== Task Mutations ====================

export function useCreateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (params: CreateTaskParams) => api.createTask(params),
    onError: (error) => {
      console.error('Failed to create task:', error)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['allTasks'] })
    },
  })
}

export function useUpdateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, ...params }: UpdateTaskParams & { id: string }) => api.updateTask(id, params),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['allTasks'] })
      queryClient.invalidateQueries({ queryKey: ['task', variables.id] })
    },
  })
}

export function useDeleteTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => api.deleteTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['allTasks'] })
    },
  })
}

export function useToggleTaskCompletion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, isCompleted }: { id: string; isCompleted: boolean }) => api.updateTask(id, { isCompleted }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['allTasks'] })
      queryClient.invalidateQueries({ queryKey: ['task', variables.id] })
    },
  })
}

export function useCompleteRecurringTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => api.completeRecurringTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['allTasks'] })
    },
  })
}

export function useReorderTasks() {
  const queryClient = useQueryClient()
  return useMutation<void, Error, { id: string; sortOrder: number }[], { previousTasks?: unknown[] }>({
    mutationFn: (items: { id: string; sortOrder: number }[]) => api.reorderTasks(items),
    onError: (_err, _items, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(['tasks'], context.previousTasks)
      }
    },
    onMutate: async (items) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] })
      const previousTasks = queryClient.getQueryData<unknown[]>(['tasks'])
      queryClient.setQueryData(['tasks'], (old: any[] | undefined) => {
        if (!old) return old
        const orderMap = new Map(items.map((item, idx) => [item.id, idx]))
        return [...old].sort((a, b) => {
          const aOrder = orderMap.get(a.id) ?? a.sortOrder ?? 0
          const bOrder = orderMap.get(b.id) ?? b.sortOrder ?? 0
          return aOrder - bOrder
        })
      })
      return { previousTasks }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['allTasks'] })
    },
  })
}

export function useReorderSubtasks() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (items: { id: string; sortOrder: number }[]) => api.reorderSubtasks(items),
    onSuccess: () => {
      queryClient.invalidateQueries({ exact: false, queryKey: ['subtasks'] })
    },
  })
}

export function useReorderSteps() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (items: { id: string; sortOrder: number }[]) => api.reorderSteps(items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['steps'] })
    },
  })
}

// ==================== Subtask Mutations ====================

export function useCreateSubtask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (params: { taskId: string; title: string; parentSubtaskId?: string; level?: number }) =>
      api.createSubtask(params),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['subtasks', variables.taskId] })
      queryClient.invalidateQueries({ queryKey: ['all-subtasks'] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

export function useUpdateSubtask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, taskId, ...params }: { id: string; taskId: string; title?: string; isCompleted?: boolean }) =>
      api.updateSubtask(id, params),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['subtasks', variables.taskId] })
      queryClient.invalidateQueries({ queryKey: ['all-subtasks'] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

export function useDeleteSubtask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (params: { id: string; taskId: string }) => api.deleteSubtask(params.id, params.taskId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['subtasks', variables.taskId] })
      queryClient.invalidateQueries({ queryKey: ['all-subtasks'] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

// ==================== Step Mutations ====================

export function useCreateStep() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (params: { taskId: string; description: string; dueDate?: string; dueTime?: string }) =>
      api.createStep(params),
    onError: (error) => {
      console.error('Failed to create step:', error)
    },
    onSettled: (_data, _error, variables) => {
      if (variables) {
        queryClient.invalidateQueries({ queryKey: ['steps', variables.taskId] })
        queryClient.invalidateQueries({ queryKey: ['task', variables.taskId] })
      }
    },
    onSuccess: (newStep, variables) => {
      queryClient.setQueryData(['steps', variables.taskId], (old: any[] | undefined) => {
        if (!old) return [newStep]
        return [...old, newStep]
      })
    },
  })
}

export function useUpdateStep() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      taskId,
      ...params
    }: {
      id: string
      taskId: string
      description?: string
      dueDate?: string
      dueTime?: string
      isCompleted?: boolean
    }) => api.updateStep(id, params),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['steps', variables.taskId] })
    },
  })
}

export function useDeleteStep() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (params: { id: string; taskId: string }) => api.deleteStep(params.id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['steps', variables.taskId] })
    },
  })
}

// ==================== List Mutations ====================

export function useCreateList() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (params: { name: string; color?: string; icon?: string }) => api.createList(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lists'] })
      notifyListsChanged()
    },
  })
}

export function useUpdateList() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      ...params
    }: {
      id: string
      name?: string
      color?: string
      icon?: string
      sortOrder?: number
      isPinned?: boolean
      isArchived?: boolean
    }) => api.updateList(id, params),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ['lists'] })
      const previousLists = queryClient.getQueryData<List[]>(['lists'])
      queryClient.setQueryData<List[]>(['lists'], (current) =>
        current?.map((item) =>
          item.id === variables.id
            ? {
                ...item,
                isArchived: variables.isArchived ?? item.isArchived,
                isPinned: variables.isPinned ?? item.isPinned,
                color: variables.color ?? item.color,
                icon: variables.icon ?? item.icon,
                name: variables.name ?? item.name,
                sortOrder: variables.sortOrder ?? item.sortOrder,
              }
            : item,
        ),
      )
      return { previousLists }
    },
    onError: (_error, _variables, context) => {
      if (context?.previousLists) {
        queryClient.setQueryData(['lists'], context.previousLists)
      }
    },
    onSuccess: (updatedList, variables) => {
      queryClient.setQueryData<List[]>(['lists'], (current) =>
        current?.map((item) => (item.id === variables.id ? updatedList : item)),
      )
      notifyListsChanged(LISTS_EVENT_SOURCE)
    },
  })
}

export function useDeleteList() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => api.deleteList(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lists'] })
      notifyListsChanged()
    },
  })
}

// ==================== Tag Mutations ====================

export function useCreateTag() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (params: { name: string; color?: string; emoji?: string; parentId?: string; level?: number }) =>
      api.createTag(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] })
      notifyTagsChanged()
    },
  })
}

export function useUpdateTag() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, ...params }: { id: string; name?: string; color?: string; emoji?: string }) =>
      api.updateTag(id, params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] })
      notifyTagsChanged()
    },
  })
}

export function useDeleteTag() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => api.deleteTag(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] })
      notifyTagsChanged()
    },
  })
}

export function useMoveTags() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (items: { id: string; parentId?: string | null; level?: number; sortOrder?: number }[]) =>
      api.moveTags(items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] })
      notifyTagsChanged()
    },
  })
}

// ==================== Task Template Queries ====================

export function useTaskTemplates() {
  return useQuery({
    queryFn: () => api.getTaskTemplates(),
    queryKey: ['task-templates'],
  })
}

export function useCreateTaskTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (params: { name: string; title?: string; description?: string; steps?: string; tagIds?: string }) =>
      api.createTaskTemplate(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-templates'] })
    },
  })
}

export function useUpdateTaskTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      ...params
    }: {
      id: string
      name?: string
      title?: string
      description?: string
      steps?: string
      tagIds?: string
    }) => api.updateTaskTemplate(id, params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-templates'] })
    },
  })
}

export function useDeleteTaskTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => api.deleteTaskTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-templates'] })
    },
  })
}

export function useIncrementTemplateUsage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => api.incrementTemplateUsage(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-templates'] })
    },
  })
}

// ==================== Calendar Event Queries ====================

export function useCalendarEvents() {
  return useQuery({
    queryFn: () => api.getCalendarEvents(),
    queryKey: ['calendar-events'],
  })
}

export function useCalendarEventsByRange(startDate: string, endDate: string) {
  return useQuery({
    enabled: !!startDate && !!endDate,
    queryFn: () => api.getCalendarEventsByRange(startDate, endDate),
    queryKey: ['calendar-events', startDate, endDate],
  })
}

export function useImportCalendarEvents() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params: {
      events: { title: string; eventDate: string; eventType?: string; color?: string; isLunar?: boolean }[]
      source?: string
    }) => api.importCalendarEvents(params.events, params.source),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] })
    },
  })
}

export function useClearAllCalendarEvents() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.clearAllCalendarEvents(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] })
    },
  })
}

// List Settings
export function useListSettings(listId: string | null) {
  return useQuery({
    enabled: !!listId,
    queryFn: () => api.getListSettings(listId!),
    queryKey: ['list-settings', listId],
    staleTime: Infinity,
  })
}

export function useSaveListSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (settings: ListSettings) => api.saveListSettings(settings),
    onSuccess: (_data, variables) => {
      queryClient.setQueryData(['list-settings', variables.listId], variables)
    },
  })
}

// ==================== Attachment Queries ====================

export function useAttachments(taskId: string) {
  return useQuery({
    enabled: !!taskId,
    queryFn: () => api.getAttachmentsByTask(taskId),
    queryKey: ['attachments', taskId],
  })
}

export function useCreateAttachment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params: { taskId: string; originalFilename: string; fileBytes: number[] }) =>
      api.createAttachment(params),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['attachments', variables.taskId] })
    },
  })
}

export function useDeleteAttachment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.deleteAttachment(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['attachments', data.taskId] })
    },
  })
}

export function useAllAttachments() {
  return useQuery({
    queryFn: () => api.getAllAttachments(),
    queryKey: ['all-attachments'],
  })
}

export function useUpdateAttachmentFilename() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params: { id: string; originalFilename: string }) => api.updateAttachmentFilename(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-attachments'] })
    },
  })
}

export function useDeleteAttachmentLocalCache() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.deleteAttachmentLocalCache(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-attachments'] })
    },
  })
}

export function useTaskLinkedItems(taskId: string | undefined) {
  return useQuery({
    enabled: !!taskId,
    queryFn: () => api.getTaskLinkedItems(taskId!),
    queryKey: ['taskLinkedItems', taskId],
  })
}

export function useLinkTaskItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, linkedType, linkedId }: { taskId: string; linkedType: string; linkedId: string }) =>
      api.linkTaskItem(taskId, linkedType, linkedId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskLinkedItems'] })
    },
  })
}

export function useUnlinkTaskItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.unlinkTaskItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskLinkedItems'] })
    },
  })
}
