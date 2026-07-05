import { useAppStore } from '&/useAppStore'
import { useViewStore } from '&/useViewStore'
import { useQueryClient } from '@tanstack/react-query'
import { listen } from '@tauri-apps/api/event'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ADVANCED_GROUP_FORM_LABEL,
  DATE_RANGE_PICKER_LABEL,
  GROUP_FORM_LABEL,
  showOverlay,
} from '@/lib/overlayManager'
import { getPriorityOptions } from '@/lib/priorityOptions'
import { getScreenRect } from '@/lib/screenRect'
import { safeUnlisten } from '@/lib/safeUnlisten'
import { runAfterTaskCompletionDelay } from '@/lib/tasks/taskCompletionDelay'
import { matchAdvancedGroup } from '@/lib/tasks/taskFiltering'
import { isTaskCompletedForFilter } from '@/lib/tasks/taskStatus'
import { DEFAULT_STATUS_VIEW_SETTINGS, getStatusViewSettings } from '@/lib/tasks/taskViewSettings'
import { getLocalToday } from '@/lib/taskHelpers'
import {
  useAllTasks,
  useAtomTag,
  useCompleteRecurringTask,
  useCreateList,
  useCreateStep,
  useCreateTask,
  useCreateTaskTemplate,
  useDeleteList,
  useDeleteTask,
  useIncrementTemplateUsage,
  useLists,
  useSaveListSettings,
  useTags,
  useTasks,
  useTaskTemplates,
  useToggleTaskCompletion,
  useUpdateList,
  useUpdateTask,
  useUpdateTaskTemplate,
} from '@/queries/useTaskQueries'
import type { PendingAttachment } from '@/types/attachment'
import type { TaskTemplate } from '@/types/taskTemplate'
import type {
  GroupBy,
  List,
  ListSettings,
  Priority,
  Task,
  TaskFilterStatus,
  TaskStatusViewSettings,
} from '@/types/task'
import { ResizeHandle } from '%/ResizeHandle'
import TaskForm from '%/tasks/TaskForm'
import TaskDetailPanel from '%/tasks/detail/TaskDetailPanel'
import TaskListPane from '%/tasks/list/TaskListPane'
import ListContextMenu, { type ListContextMenuState } from '%/tasks/menus/ListContextMenu'
import TaskContextMenu, { type TaskContextMenuState, type TaskMenuPanel } from '%/tasks/menus/TaskContextMenu'
import TaskSidebar from '%/tasks/sidebar/TaskSidebar'

type TaskStatus3 = TaskFilterStatus

const ICON_KEY_TO_EMOJI: Record<string, string> = {
  book: '📖',
  briefcase: '💼',
  fire: '🔥',
  flag: '🚩',
  folder: '📁',
  heart: '❤️',
  home: '🏠',
  inbox: '📥',
  lightning: '⚡',
  star: '⭐',
  target: '🎯',
}

function resolveIcon(icon?: string): string {
  if (!icon) {
    return '📁'
  }
  return ICON_KEY_TO_EMOJI[icon] || icon
}

import type { AdvancedGroup } from '&/useAppStore'

// ==================== Resize Handle ====================
// ==================== Main Page ====================
export default function TasksPage() {
  const { t } = useTranslation('common')
  const { viewMode, filterStatus, selectedListId, setViewMode, setFilterStatus, setSelectedListId } = useViewStore()
  const {
    taskSortBy,
    taskSortOrder,
    taskGroupBy,
    setTaskSortBy,
    setTaskSortOrder,
    setTaskGroupBy,
    groupsPanelWidth,
    detailPanelWidth,
    priorityMode,
    setGroupsPanelWidth,
    setDetailPanelWidth,
  } = useAppStore()
  const priorityOptions = useMemo(() => getPriorityOptions(priorityMode, t), [priorityMode, t])
  const saveListSettings = useSaveListSettings()
  const isLoadingSettings = useRef(false)
  const currentListSettingsRef = useRef<ListSettings | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)

  // Apply defaultTaskOpenView on mount
  const defaultAppliedRef = useRef(false)
  useEffect(() => {
    if (defaultAppliedRef.current) return
    const view = useAppStore.getState().defaultTaskOpenView
    if (view === 'today') {
      defaultAppliedRef.current = true
      setSelectedListId('smart:today')
    } else if (view === 'inbox') {
      defaultAppliedRef.current = true
      setSelectedListId('inbox')
    } else {
      defaultAppliedRef.current = true
    }
  }, [selectedListId])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width)
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (containerWidth <= 0) return
    const available = containerWidth - groupsPanelWidth - 8
    if (available < 600) {
      setDetailPanelWidth(Math.max(200, Math.min(400, available - 300)))
    } else {
      setDetailPanelWidth((w) => Math.max(300, Math.min(400, w)))
    }
  }, [containerWidth, groupsPanelWidth])

  // Load per-list settings when selectedListId changes
  useEffect(() => {
    if (selectedListId === null) {
      return
    }
    isLoadingSettings.current = true
    import('@/lib/api').then(({ getListSettings }) => {
      getListSettings(selectedListId)
        .then((settings) => {
          console.log('list', settings)
          currentListSettingsRef.current = settings ?? null
          if (settings) {
            const status = settings.filterStatus
            const statusViewSettings = getStatusViewSettings(settings, status)
            setTaskSortBy(statusViewSettings.sortBy)
            setTaskSortOrder(statusViewSettings.sortOrder)
            setTaskGroupBy(statusViewSettings.groupBy)
            setFilterStatus(status)
            setViewMode(settings.viewMode)
          }
          // Use setTimeout to ensure stores have been updated before we allow saving
          setTimeout(() => {
            isLoadingSettings.current = false
          }, 0)
        })
        .catch(() => {
          isLoadingSettings.current = false
        })
    })
  }, [selectedListId, setTaskSortBy, setTaskSortOrder, setTaskGroupBy, setFilterStatus, setViewMode])

  // Save current settings to DB when they change
  const persistSettings = useCallback(
    (overrides?: Partial<ListSettings>) => {
      if (isLoadingSettings.current || !selectedListId) {
        return
      }
      const previous = currentListSettingsRef.current
      const status = overrides?.filterStatus ?? filterStatus
      const previousStatusSettings = previous?.statusSettings ?? {}
      const statusSettings: ListSettings['statusSettings'] = {
        ...previousStatusSettings,
        all:
          previousStatusSettings.all ??
          (previous
            ? { groupBy: previous.groupBy, sortBy: previous.sortBy, sortOrder: previous.sortOrder }
            : DEFAULT_STATUS_VIEW_SETTINGS.all),
      }
      const previousCurrentStatus = getStatusViewSettings(previous, status)
      const currentStatusSettings: TaskStatusViewSettings = {
        groupBy: overrides?.groupBy ?? (status === filterStatus ? taskGroupBy : previousCurrentStatus.groupBy),
        sortBy: overrides?.sortBy ?? (status === filterStatus ? taskSortBy : previousCurrentStatus.sortBy),
        sortOrder: overrides?.sortOrder ?? (status === filterStatus ? taskSortOrder : previousCurrentStatus.sortOrder),
      }
      statusSettings[status] = currentStatusSettings
      const current: ListSettings = {
        filterStatus: overrides?.filterStatus ?? filterStatus,
        groupBy: currentStatusSettings.groupBy,
        listId: selectedListId,
        sortBy: currentStatusSettings.sortBy,
        sortOrder: currentStatusSettings.sortOrder,
        statusSettings,
        viewMode: overrides?.viewMode ?? viewMode,
      }
      currentListSettingsRef.current = current
      saveListSettings.mutate(current)
    },
    [selectedListId, taskSortBy, taskSortOrder, taskGroupBy, filterStatus, viewMode, saveListSettings],
  )

  // Wrapper setters that also persist
  const handleSetViewMode = useCallback(
    (mode: 'list' | 'calendar' | 'kanban' | 'matrix') => {
      setViewMode(mode)
      persistSettings({ viewMode: mode })
    },
    [setViewMode, persistSettings],
  )

  const handleSetFilterStatus = useCallback(
    (status: TaskStatus3) => {
      const statusViewSettings = getStatusViewSettings(currentListSettingsRef.current, status)
      setTaskSortBy(statusViewSettings.sortBy)
      setTaskSortOrder(statusViewSettings.sortOrder)
      setTaskGroupBy(statusViewSettings.groupBy)
      setFilterStatus(status)
      persistSettings({
        filterStatus: status,
        groupBy: statusViewSettings.groupBy,
        sortBy: statusViewSettings.sortBy,
        sortOrder: statusViewSettings.sortOrder,
      })
    },
    [setFilterStatus, setTaskGroupBy, setTaskSortBy, setTaskSortOrder, persistSettings],
  )

  const handleSetTaskGroupBy = useCallback(
    (by: string) => {
      setTaskGroupBy(by as GroupBy)
      persistSettings({ groupBy: by as ListSettings['groupBy'] })
    },
    [setTaskGroupBy, persistSettings],
  )
  const isTaskGroupGroupingDisabled = !selectedListId || selectedListId === 'inbox'

  useEffect(() => {
    if (isTaskGroupGroupingDisabled && taskGroupBy === 'list') {
      handleSetTaskGroupBy('none')
    }
  }, [handleSetTaskGroupBy, isTaskGroupGroupingDisabled, taskGroupBy])

  const [showTaskForm, setShowTaskForm] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [selectedSubtaskId, setSelectedSubtaskId] = useState<string | null>(null)
  const [listsExpanded, setListsExpanded] = useState(true)
  const [advListsExpanded, setAdvListsExpanded] = useState(true)
  const [collapsedTaskGroups, setCollapsedTaskGroups] = useState<Record<string, boolean>>({})
  const [editingAdvGroup, setEditingAdvGroup] = useState<AdvancedGroup | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskDescription, setNewTaskDescription] = useState('')
  const [newTaskPriority, setNewTaskPriority] = useState<Priority>(0)
  const [showPriorityPicker, setShowPriorityPicker] = useState(false)
  const [showTemplatePicker, setShowTemplatePicker] = useState(false)
  const templateButtonRef = useRef<HTMLButtonElement>(null)
  const [newTaskTagIds, setNewTaskTagIds] = useState<string[]>([])
  const [focusTitleOnMount, setFocusTitleOnMount] = useState(false)
  const tagButtonRef = useRef<HTMLButtonElement>(null)
  const [newTaskDueDate, setNewTaskDueDate] = useState(() => getLocalToday())
  const [newTaskDueTime, setNewTaskDueTime] = useState('')
  const dateButtonRef = useRef<HTMLButtonElement>(null)
  const inlineDateOpenedRef = useRef(false)
  const dateExplicitlySetRef = useRef(false)
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([])
  const [contextMenu, setContextMenu] = useState<ListContextMenuState | null>(null)

  const [taskContextMenu, setTaskContextMenu] = useState<TaskContextMenuState | null>(null)
  const [taskMenuPanel, setTaskMenuPanel] = useState<TaskMenuPanel | null>(null)
  const [taskPanelSearch, setTaskPanelSearch] = useState('')

  const { data: tasks = [], isLoading } = useTasks()
  const { data: allTasksForCount = [] } = useAllTasks()
  const { data: allTags = [] } = useTags()
  const { data: allLists = [] } = useLists()
  const { data: todayAtomTag } = useAtomTag('today')
  const { data: allTemplates = [] } = useTaskTemplates()
  const createTemplate = useCreateTaskTemplate()
  const updateTaskTemplate = useUpdateTaskTemplate()
  const incrementTemplateUsage = useIncrementTemplateUsage()
  const createTask = useCreateTask()
  const createStep = useCreateStep()
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()
  const toggleTask = useToggleTaskCompletion()
  const completeRecurring = useCompleteRecurringTask()
  const createList = useCreateList()
  const updateList = useUpdateList()
  const deleteList = useDeleteList()

  // Adjust detail panel width when window resizes
  useEffect(() => {
    let prevWidth = window.innerWidth

    const handleResize = () => {
      const newWidth = window.innerWidth
      const delta = newWidth - prevWidth
      prevWidth = newWidth

      if (delta !== 0) {
        setDetailPanelWidth((w) => Math.max(300, Math.min(800, w + delta)))
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [setDetailPanelWidth])

  // Keyboard shortcut listeners
  useEffect(() => {
    const handleNewTask = () => {
      setEditingTask(null)
      setShowTaskForm(true)
    }
    const handleEscape = () => {
      if (showTaskForm) {
        setShowTaskForm(false)
        setEditingTask(null)
      }
      if (selectedSubtaskId) {
        setSelectedSubtaskId(null)
      } else if (selectedTaskId) {
        setSelectedTaskId(null)
      }
    }

    window.addEventListener('mindless:new-task', handleNewTask)
    window.addEventListener('mindless:escape', handleEscape)

    return () => {
      window.removeEventListener('mindless:new-task', handleNewTask)
      window.removeEventListener('mindless:escape', handleEscape)
    }
  }, [showTaskForm, selectedTaskId, selectedSubtaskId])

  // Listen for tag list picker overlay results
  useEffect(() => {
    const unlisten = listen<{ _source?: string; selectedIds: string[] }>('tag-list-picker-overlay:result', (e) => {
      if (e.payload._source !== 'inline-task-form') return
      setNewTaskTagIds(e.payload.selectedIds)
    })
    return safeUnlisten(unlisten)
  }, [])

  // Listen for date picker results for inline form
  useEffect(() => {
    const unlisten = listen<{
      _source?: string
      type: string
      date?: string
      time?: string
      startDate?: string
      startTime?: string
    }>('date-range-picker-overlay:result', (e) => {
      if (e.payload._source !== 'inline-task-form') {
        return
      }
      inlineDateOpenedRef.current = false
      dateExplicitlySetRef.current = true
      const p = e.payload
      if (p.type === 'single') {
        setNewTaskDueDate(p.date || '')
        setNewTaskDueTime(p.time || '')
      } else {
        setNewTaskDueDate(p.startDate || '')
        setNewTaskDueTime(p.startTime || '')
      }
    })
    return safeUnlisten(unlisten)
  }, [])

  const selectedTask = useMemo(() => tasks.find((task) => task.id === selectedTaskId) || null, [tasks, selectedTaskId])

  // Advanced group matching
  const { advancedGroups, addAdvancedGroup, updateAdvancedGroup, deleteAdvancedGroup } = useAppStore()
  const queryClient = useQueryClient()

  useEffect(() => {
    const unlisten = listen('tags:changed', () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] })
    })

    return safeUnlisten(unlisten)
  }, [queryClient])

  // Listen for advanced group dialog results
  useEffect(() => {
    const unlistenAdvGroup = listen<{ action: string; group?: AdvancedGroup }>('dialog:result', (event) => {
      const { action } = event.payload
      if (action === 'submit' && event.payload.group) {
        const group = event.payload.group
        if (editingAdvGroup) {
          updateAdvancedGroup(group)
        } else {
          addAdvancedGroup(group)
        }
      }
      setEditingAdvGroup(null)
    })

    const unlistList = listen<{ action: string }>('dialog:result', (event) => {
      const { action } = event.payload
      if (action === 'submit' || action === 'delete') {
        queryClient.invalidateQueries({ queryKey: ['lists'] })
      }
    })

    const unlistListOverlay = listen<{
      action: string
      name?: string
      icon?: string
      color?: string
      _source?: string
      _listId?: string
    }>('group-form-overlay:result', (event) => {
      const { action, _source, _listId, name, icon, color } = event.payload
      if (_source !== 'list') return
      if (action === 'submit' && name && icon && color) {
        if (_listId) {
          updateList.mutate({ color, icon, id: _listId, name })
        } else {
          createList.mutate({ color, icon, name })
        }
      } else if (action === 'delete' && _listId) {
        deleteList.mutate(_listId)
      }
      if (action !== 'cancel') {
        queryClient.invalidateQueries({ queryKey: ['lists'] })
      }
    })

    return () => {
      unlistenAdvGroup.then((fn) => fn())
      unlistList.then((fn) => fn())
      unlistListOverlay.then((fn) => fn())
    }
  }, [editingAdvGroup, addAdvancedGroup, updateAdvancedGroup, queryClient])

  // Filter and search tasks
  const filteredTasksBase = useMemo(
    () =>
      tasks.filter((task) => {
        const isCompleted = isTaskCompletedForFilter(task)
        if (filterStatus === 'active' && isCompleted) {
          return false
        }
        if (filterStatus === 'completed' && !isCompleted) {
          return false
        }

        // List filtering
        if (selectedListId) {
          const now = new Date()
          const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
            now.getDate(),
          ).padStart(2, '0')}`

          // Advanced groups
          if (selectedListId.startsWith('adv:')) {
            const groupId = selectedListId.slice(4)
            const group = advancedGroups.find((g) => g.id === groupId)
            if (group && !matchAdvancedGroup(task, group)) {
              return false
            }
          } else if (selectedListId === 'smart:today') {
            const matchesDate = task.dueDate === todayStr
            const matchesRange =
              task.startDate && task.endDate ? task.startDate <= todayStr && task.endDate >= todayStr : false
            const matchesAtomTag = todayAtomTag ? (task.tagIds || '').split(',').includes(todayAtomTag.id) : false
            if (!matchesDate && !matchesRange && !matchesAtomTag) {
              return false
            }
          } else if (selectedListId === 'smart:tomorrow') {
            const tomorrow = new Date(now)
            tomorrow.setDate(tomorrow.getDate() + 1)
            const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(
              2,
              '0',
            )}-${String(tomorrow.getDate()).padStart(2, '0')}`
            if (task.dueDate !== tomorrowStr) {
              return false
            }
          } else if (selectedListId === 'smart:recent7days') {
            const next7 = new Date(now)
            next7.setDate(next7.getDate() + 7)
            const next7Str = `${next7.getFullYear()}-${String(next7.getMonth() + 1).padStart(
              2,
              '0',
            )}-${String(next7.getDate()).padStart(2, '0')}`
            if (!task.dueDate || task.dueDate < todayStr || task.dueDate > next7Str) {
              return false
            }
          } else if (selectedListId === 'smart:thisMonth') {
            const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
            const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
            const monthEndStr = `${monthEnd.getFullYear()}-${String(monthEnd.getMonth() + 1).padStart(
              2,
              '0',
            )}-${String(monthEnd.getDate()).padStart(2, '0')}`
            if (!task.dueDate || task.dueDate < monthStart || task.dueDate > monthEndStr) {
              return false
            }
          } else if (selectedListId === 'smart:recent') {
            const recentStart = new Date(now)
            recentStart.setDate(recentStart.getDate() - 30)
            const recentStartStr = `${recentStart.getFullYear()}-${String(recentStart.getMonth() + 1).padStart(
              2,
              '0',
            )}-${String(recentStart.getDate()).padStart(2, '0')}`
            const recentEnd = new Date(now)
            recentEnd.setDate(recentEnd.getDate() + 30)
            const recentEndStr = `${recentEnd.getFullYear()}-${String(recentEnd.getMonth() + 1).padStart(
              2,
              '0',
            )}-${String(recentEnd.getDate()).padStart(2, '0')}`
            if (!task.dueDate || task.dueDate < recentStartStr || task.dueDate > recentEndStr) {
              return false
            }
          } else {
            // Regular list: match listId (inbox = null or 'inbox')
            const taskListId = task.listId || 'inbox'
            if (selectedListId === 'inbox') {
              if (taskListId !== 'inbox') {
                return false
              }
            } else {
              if (task.listId !== selectedListId) {
                return false
              }
            }
          }
        }

        return true
      }),
    [tasks, filterStatus, selectedListId, advancedGroups, matchAdvancedGroup, todayAtomTag],
  )

  // Sort tasks
  const sortedTasks = useMemo(() => {
    const sorted = [...filteredTasksBase].sort((a, b) => {
      let aVal: number | string, bVal: number | string
      switch (taskSortBy) {
        case 'sortOrder':
          aVal = a.sortOrder ?? 0
          bVal = b.sortOrder ?? 0
          break
        case 'dueDate':
          aVal = a.dueDate || ''
          bVal = b.dueDate || ''
          break
        case 'startDate':
          aVal = a.startDate || ''
          bVal = b.startDate || ''
          break
        case 'priority':
          aVal = a.priority
          bVal = b.priority
          break
        case 'createdAt':
          aVal = a.createdAt
          bVal = b.createdAt
          break
        case 'completedAt':
          aVal = a.completedAt || ''
          bVal = b.completedAt || ''
          break
      }
      if (aVal < bVal) {
        return taskSortOrder === 'asc' ? -1 : 1
      }
      if (aVal > bVal) {
        return taskSortOrder === 'asc' ? 1 : -1
      }
      // Tiebreaker: sortOrder (manual order)
      return (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
    })

    return sorted
  }, [filteredTasksBase, taskSortBy, taskSortOrder])

  const taskGroups = useMemo(() => {
    if (taskGroupBy === 'none') {
      return [{ id: 'all', tasks: sortedTasks, title: '' }]
    }

    if (taskGroupBy === 'priority') {
      const groups = new Map<number, Task[]>()
      sortedTasks.forEach((task) => {
        const priority = task.priority || 0
        groups.set(priority, [...(groups.get(priority) || []), task])
      })
      return [...groups.entries()]
        .sort(([a], [b]) => b - a)
        .map(([priority, tasks]) => ({
          id: `priority:${priority}`,
          tasks,
          title:
            priorityOptions.find((option) => option.value === priority)?.label ||
            `${t('tasks.priority.label')} ${priority}`,
        }))
    }

    if (taskGroupBy === 'time') {
      const today = getLocalToday()
      const future7 = new Date(`${today}T00:00:00`)
      future7.setDate(future7.getDate() + 7)
      const future7Str = `${future7.getFullYear()}-${String(future7.getMonth() + 1).padStart(2, '0')}-${String(
        future7.getDate(),
      ).padStart(2, '0')}`
      const groups = [
        { id: 'time:today', tasks: [] as Task[], title: t('tasks.group_time.today') },
        { id: 'time:future7', tasks: [] as Task[], title: t('tasks.group_time.future7') },
        { id: 'time:later', tasks: [] as Task[], title: t('tasks.group_time.later') },
        { id: 'time:overdue', tasks: [] as Task[], title: t('tasks.group_time.overdue') },
      ]
      const groupById = new Map(groups.map((group) => [group.id, group]))

      sortedTasks.forEach((task) => {
        const rangeIncludesToday =
          !!task.startDate && !!task.endDate && task.startDate <= today && task.endDate >= today
        const date = task.dueDate || task.startDate || ''
        const groupId = rangeIncludesToday
          ? 'time:today'
          : task.endDate && task.endDate < today
            ? 'time:overdue'
            : task.dueDate && task.dueDate < today
              ? 'time:overdue'
              : date === today
                ? 'time:today'
                : date && date <= future7Str
                  ? 'time:future7'
                  : 'time:later'
        groupById.get(groupId)?.tasks.push(task)
      })

      return groups.filter((group) => group.tasks.length > 0)
    }

    if (taskGroupBy === 'list') {
      const groups = new Map<string, Task[]>()
      sortedTasks.forEach((task) => {
        const listId = task.listId || 'inbox'
        groups.set(listId, [...(groups.get(listId) || []), task])
      })
      return [...groups.entries()].map(([listId, tasks]) => ({
        id: `list:${listId}`,
        tasks,
        title: listId === 'inbox' ? t('lists.inbox') : allLists.find((list) => list.id === listId)?.name || listId,
      }))
    }

    return [{ id: 'all', tasks: sortedTasks, title: '' }]
  }, [allLists, priorityOptions, sortedTasks, taskGroupBy, t])

  const filteredTasks = useMemo(() => taskGroups.flatMap((group) => group.tasks), [taskGroups])
  const previousSelectedListIdRef = useRef<string | null>(selectedListId)

  useEffect(() => {
    if (previousSelectedListIdRef.current === selectedListId) {
      return
    }
    previousSelectedListIdRef.current = selectedListId
    setSelectedSubtaskId(null)
    setSelectedTaskId(null)
  }, [selectedListId])

  type FlatItem = { type: 'task'; task: Task }
  const flatItemGroups = useMemo(() => {
    return taskGroups.map((group) => ({
      ...group,
      items: group.tasks.map((task): FlatItem => ({ task, type: 'task' })),
    }))
  }, [taskGroups])

  const handleAttachmentClick = async () => {
    const { open } = await import('@tauri-apps/plugin-dialog')
    const selected = await open({
      //   filters: [{ extensions: ['*'], name: 'All Files' }],
      directory: false,
      multiple: false,
    })
    if (!selected) {
      return
    }

    const filePath = typeof selected === 'string' ? selected : selected
    const fileName = filePath.split('/').pop() || filePath.split('\\').pop() || 'unknown'

    const bytes = await import('@/lib/api').then((api) => api.readFileBytes(filePath))
    if (bytes.length > 30 * 1024 * 1024) {
      const { message } = await import('@tauri-apps/plugin-dialog')
      await message(t('tasks.attachment_too_large'), { kind: 'error' })
      return
    }

    setPendingAttachments((prev) => [...prev, { fileBytes: bytes, originalFilename: fileName, size: bytes.length }])
  }

  const handleInlineClipboardPaste = async () => {
    try {
      const bytes = await import('@/lib/api').then((a) => a.readClipboardImage())
      if (!bytes) {
        const { message } = await import('@tauri-apps/plugin-dialog')
        await message(t('tasks.clipboard_no_image'), { kind: 'warning' })
        return
      }
      const now = new Date()
      const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`
      const fileName = `剪贴板-${ts}.png`

      if (bytes.length > 30 * 1024 * 1024) {
        const { message } = await import('@tauri-apps/plugin-dialog')
        await message(t('tasks.attachment_too_large'), { kind: 'error' })
        return
      }

      setPendingAttachments((prev) => [...prev, { fileBytes: bytes, originalFilename: fileName, size: bytes.length }])
    } catch (e) {
      console.error('Clipboard paste failed:', e)
    }
  }

  const handleCreateInline = (onSuccess?: (task: Task) => void) => {
    if (!newTaskTitle.trim()) {
      return
    }
    const currentAttachments = [...pendingAttachments]
    createTask.mutate(
      {
        description: newTaskDescription.trim() || undefined,
        dueDate: newTaskDueDate || undefined,
        dueTime: newTaskDueTime || undefined,
        listId:
          selectedListId && !selectedListId.startsWith('smart:') && !selectedListId.startsWith('adv:')
            ? selectedListId
            : undefined,
        priority: newTaskPriority,
        tagIds: newTaskTagIds.length > 0 ? newTaskTagIds.join(',') : undefined,
        title: newTaskTitle.trim(),
      },
      {
        onSuccess: async (newTask) => {
          setNewTaskTitle('')
          setNewTaskDescription('')
          setNewTaskPriority(0)
          setNewTaskTagIds([])
          setNewTaskDueDate(getLocalToday())
          setNewTaskDueTime('')
          setPendingAttachments([])
          dateExplicitlySetRef.current = false

          if (newTask && currentAttachments.length > 0) {
            const bytesToBase64 = (bytes: number[]) => {
              const chunks: string[] = []
              for (let i = 0; i < bytes.length; i += 8192) {
                chunks.push(String.fromCharCode(...bytes.slice(i, i + 8192)))
              }
              return btoa(chunks.join(''))
            }
            const api = await import('@/lib/api')
            const { getActiveProvider } = await import('@/lib/sync')
            const activeProvider = await getActiveProvider()

            for (const att of currentAttachments) {
              try {
                const attachment = await api.createAttachment({
                  fileBytes: att.fileBytes,
                  originalFilename: att.originalFilename,
                  taskId: newTask.id,
                })

                if (activeProvider) {
                  const { provider, info } = activeProvider
                  await api.updateAttachmentSyncStatus({
                    id: attachment.id,
                    syncProvider: info.provider,
                    syncStatus: 'syncing',
                  })

                  try {
                    const base64Content = bytesToBase64(att.fileBytes)
                    const path = `attachments/${attachment.filename}`
                    await provider.uploadBinaryFile(
                      info.owner,
                      info.repo,
                      path,
                      base64Content,
                      `Mindless: add attachment ${attachment.originalFilename}`,
                    )

                    const syncUrl = localStorage.getItem(`mindless-sync-url-${info.provider}`)
                    let rawUrl: string | null = null
                    if (syncUrl) {
                      const m = syncUrl.trim().match(/^https?:\/\/([^/]+)\/([^/]+)\/([^/]+?)(?:\.git)?(?:\/)?$/)
                      if (m) {
                        const domain = m[1]
                        const owner = m[2]
                        const repo = m[3]
                        if (domain === 'github.com') {
                          rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/main/attachments/${attachment.filename}`
                        } else if (domain === 'gitlab.com' || domain.includes('gitlab.')) {
                          rawUrl = `https://${domain}/${owner}/${repo}/-/raw/main/attachments/${attachment.filename}`
                        } else if (domain === 'gitee.com') {
                          rawUrl = `https://${domain}/${owner}/${repo}/raw/main/attachments/${attachment.filename}`
                        }
                      }
                    }
                    await api.updateAttachmentSyncStatus({
                      id: attachment.id,
                      rawUrl: rawUrl || undefined,
                      syncProvider: info.provider,
                      syncStatus: 'synced',
                      uploadedTo: path,
                    })
                  } catch (syncErr) {
                    console.error(`Failed to sync attachment "${att.originalFilename}":`, syncErr)
                    await api.updateAttachmentSyncStatus({
                      id: attachment.id,
                      syncError: syncErr instanceof Error ? syncErr.message : 'Unknown error',
                      syncProvider: info.provider,
                      syncStatus: 'failed',
                    })
                  }
                }
              } catch (err) {
                console.error(`Failed to create attachment "${att.originalFilename}":`, err)
              }
            }
          }

          if (newTask && onSuccess) {
            onSuccess(newTask)
          }
        },
      },
    )
  }

  const handleApplyTemplate = useCallback(
    (template: TaskTemplate) => {
      createTask.mutate(
        {
          description: template.description || undefined,
          dueDate: newTaskDueDate || undefined,
          dueTime: newTaskDueTime || undefined,
          listId:
            selectedListId && !selectedListId.startsWith('smart:') && !selectedListId.startsWith('adv:')
              ? selectedListId
              : undefined,
          priority: 0,
          tagIds: template.tagIds || undefined,
          title: template.title || template.name,
        },
        {
          onSuccess: (newTask) => {
            if (!newTask) {
              return
            }
            if (template.steps) {
              try {
                const stepDescriptions: string[] = JSON.parse(template.steps)
                for (const desc of stepDescriptions) {
                  if (desc?.trim()) {
                    createStep.mutate({ description: desc, taskId: newTask.id })
                  }
                }
              } catch {}
            }
            setSelectedTaskId(newTask.id)
            setFocusTitleOnMount(true)
          },
        },
      )
      incrementTemplateUsage.mutate(template.id)
      setShowTemplatePicker(false)
    },
    [createStep, createTask, incrementTemplateUsage, newTaskDueDate, newTaskDueTime, selectedListId],
  )

  const handleInlineKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setNewTaskTitle('')
      setNewTaskDescription('')
      setNewTaskPriority(0)
      setPendingAttachments([])
    }
  }

  const closeForm = () => {
    setShowTaskForm(false)
    setEditingTask(null)
  }

  const handleCreateTask = (taskData: {
    title: string
    description?: string
    priority: Priority
    dueDate?: string
    dueTime?: string
    endDate?: string
    endTime?: string
    startDate?: string
    listId?: string
    recurrenceRule?: string
    recurrenceEndDate?: string
  }) => {
    createTask.mutate(taskData, { onSuccess: closeForm })
  }

  const handleUpdateTask = (taskData: {
    title: string
    description?: string
    priority: Priority
    dueDate?: string
    dueTime?: string
    endDate?: string
    endTime?: string
    startDate?: string
    listId?: string
    recurrenceRule?: string
    recurrenceEndDate?: string
  }) => {
    if (editingTask) {
      updateTask.mutate({ id: editingTask.id, ...taskData }, { onSuccess: closeForm })
    }
  }

  const handleToggleTask = (id: string, isCompleted: boolean) => {
    const task = tasks.find((t) => t.id === id)
    // If completing a recurring task, generate the next occurrence
    void runAfterTaskCompletionDelay(() => {
      if (!isCompleted && task?.recurrenceRule) {
        completeRecurring.mutate(id)
      } else {
        toggleTask.mutate({ id, isCompleted: !isCompleted })
      }
    })
  }

  const handleDeleteTask = (id: string) => {
    if (!window.confirm(t('tasks.delete_confirm'))) {
      return
    }
    deleteTask.mutate(id)
    if (selectedTaskId === id) {
      setSelectedTaskId(null)
    }
  }

  const handleToggleTodayTag = useCallback(
    (taskId: string) => {
      if (!todayAtomTag) {
        return
      }
      const task = tasks.find((t) => t.id === taskId)
      if (!task) {
        return
      }
      const currentIds = task.tagIds ? task.tagIds.split(',').filter(Boolean) : []
      const hasToday = currentIds.includes(todayAtomTag.id)
      const newIds = hasToday ? currentIds.filter((id) => id !== todayAtomTag.id) : [...currentIds, todayAtomTag.id]
      updateTask.mutate({ id: taskId, tagIds: newIds.join(',') })
    },
    [todayAtomTag, tasks, updateTask],
  )

  const handleCloseTaskContextMenu = useCallback(() => {
    setTaskContextMenu(null)
    setTaskMenuPanel(null)
  }, [])

  const handleSetTaskDateFromMenu = useCallback(
    async (taskId: string, task: Task | undefined, fallback: { x: number; y: number }) => {
      handleCloseTaskContextMenu()
      const btn = document.querySelector(`[data-task-row="${taskId}"]`) as HTMLElement
      const rect = btn ? await getScreenRect(btn) : { height: 0, x: fallback.x, y: fallback.y }
      await showOverlay(DATE_RANGE_PICKER_LABEL, rect.x, rect.y + rect.height + 4, {
        _source: 'task-context-menu',
        anchorH: rect.height,
        anchorX: rect.x,
        anchorY: rect.y,
        date: task?.dueDate || undefined,
        mode: 'single',
        startDate: task?.dueDate || undefined,
        startTime: task?.dueTime || undefined,
        time: task?.dueTime || undefined,
      })
      const unlisten = listen<{
        _source?: string
        date?: string
        startDate?: string
        startTime?: string
      time?: string
      type: string
    }>('date-range-picker-overlay:result', (e) => {
      if (e.payload._source !== 'task-context-menu') {
        return
        }
        const p = e.payload
        if (p.type === 'single') {
          updateTask.mutate({
            dueDate: p.date ?? '',
            dueTime: p.time ?? '',
            id: taskId,
          })
        } else {
          updateTask.mutate({
            dueDate: p.startDate ?? '',
            dueTime: p.startTime ?? '',
            id: taskId,
        })
      }
      cleanup()
    })
    const cleanup = safeUnlisten(unlisten)
  },
    [handleCloseTaskContextMenu, updateTask],
  )

  const handleSaveTaskAsTemplate = useCallback(
    async (task: Task) => {
      let stepsJson: string | undefined
      try {
        const { getSteps } = await import('@/lib/api')
        const taskSteps = await getSteps(task.id)
        if (taskSteps && taskSteps.length > 0) {
          stepsJson = JSON.stringify(taskSteps.map((s) => s.description))
        }
      } catch {}
      const existing = allTemplates.find((tpl) => tpl.name === task.title)
      if (existing) {
        if (!window.confirm(t('template_mgmt.overwrite_confirm', { name: task.title }))) {
          return
        }
        updateTaskTemplate.mutate({
          description: task.description || undefined,
          id: existing.id,
          steps: stepsJson,
          tagIds: task.tagIds || undefined,
          title: task.title,
        })
      } else {
        createTemplate.mutate({
          description: task.description || undefined,
          name: task.title,
          steps: stepsJson,
          tagIds: task.tagIds || undefined,
          title: task.title,
        })
      }
    },
    [allTemplates, createTemplate, t, updateTaskTemplate],
  )

  const handleUpdateTaskField = useCallback(
    // biome-ignore lint:noExplicitAny
    (params: any) => {
      const targetId = selectedSubtaskId || selectedTask?.id
      if (targetId) {
        updateTask.mutate({ id: targetId, ...params })
      }
    },
    [selectedSubtaskId, selectedTask?.id, updateTask],
  )

  const handleUpdateTaskInline = useCallback(
    // biome-ignore lint:noExplicitAny
    (id: string, params: any) => {
      updateTask.mutate({ id, ...params })
    },
    [updateTask],
  )

  // Task groups (smart lists + user lists)
  const SMART_LISTS = [
    { iconKey: 'inbox', id: 'inbox', labelKey: 'lists.inbox', required: true },
    { iconKey: 'calendar', id: 'smart:today', labelKey: 'lists.today', required: true },
    { iconKey: 'clock', id: 'smart:tomorrow', labelKey: 'lists.tomorrow', required: false },
    { iconKey: 'recent7days', id: 'smart:recent7days', labelKey: 'lists.next_7_days', required: false },
    { iconKey: 'thisMonth', id: 'smart:thisMonth', labelKey: 'lists.this_month', required: false },
    { iconKey: 'recent', id: 'smart:recent', labelKey: 'lists.recent', required: true },
  ] as const

  const visibleSmartLists = SMART_LISTS

  const seedIds = new Set(['inbox', 'today', 'tomorrow', 'next7days', 'thismonth', 'recent'])
  const pinnedLists = useMemo(
    () => allLists.filter((l) => !seedIds.has(l.id) && l.isArchived !== true && l.isPinned),
    [allLists],
  )
  const pinnedAdvGroups = useMemo(() => advancedGroups.filter((g) => g.isPinned), [advancedGroups])
  const userLists = useMemo(
    () =>
      allLists
        .filter((l) => !seedIds.has(l.id) && l.isArchived !== true)
        .sort((a, b) => {
          if (a.isPinned && !b.isPinned) {
            return -1
          }
          if (!a.isPinned && b.isPinned) {
            return 1
          }
          return a.sortOrder - b.sortOrder
        }),
    [allLists],
  )

  const listTaskCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    const now = new Date()
    const todayAtomTagId = todayAtomTag?.id
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate(),
    ).padStart(2, '0')}`

    // Tomorrow
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(
      tomorrow.getDate(),
    ).padStart(2, '0')}`

    // Next 7 days
    const next7 = new Date(now)
    next7.setDate(next7.getDate() + 7)
    const next7Str = `${next7.getFullYear()}-${String(next7.getMonth() + 1).padStart(2, '0')}-${String(
      next7.getDate(),
    ).padStart(2, '0')}`

    // This month (natural month)
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    const monthEndStr = `${monthEnd.getFullYear()}-${String(monthEnd.getMonth() + 1).padStart(2, '0')}-${String(
      monthEnd.getDate(),
    ).padStart(2, '0')}`

    // Recent (±30 days)
    const recentStart = new Date(now)
    recentStart.setDate(recentStart.getDate() - 30)
    const recentStartStr = `${recentStart.getFullYear()}-${String(recentStart.getMonth() + 1).padStart(
      2,
      '0',
    )}-${String(recentStart.getDate()).padStart(2, '0')}`
    const recentEnd = new Date(now)
    recentEnd.setDate(recentEnd.getDate() + 30)
    const recentEndStr = `${recentEnd.getFullYear()}-${String(recentEnd.getMonth() + 1).padStart(2, '0')}-${String(
      recentEnd.getDate(),
    ).padStart(2, '0')}`

    allTasksForCount.forEach((task) => {
      if (isTaskCompletedForFilter(task)) return
      const lid = task.listId || 'inbox'
      counts[lid] = (counts[lid] || 0) + 1
      if (
        task.dueDate === todayStr ||
        (task.startDate && task.endDate && task.startDate <= todayStr && task.endDate >= todayStr) ||
        (todayAtomTagId && (task.tagIds || '').split(',').includes(todayAtomTagId))
      ) {
        counts['smart:today'] = (counts['smart:today'] || 0) + 1
      }
      if (task.dueDate === tomorrowStr) {
        counts['smart:tomorrow'] = (counts['smart:tomorrow'] || 0) + 1
      }
      if (task.dueDate && task.dueDate >= todayStr && task.dueDate <= next7Str) {
        counts['smart:recent7days'] = (counts['smart:recent7days'] || 0) + 1
      }
      if (task.dueDate && task.dueDate >= monthStart && task.dueDate <= monthEndStr) {
        counts['smart:thisMonth'] = (counts['smart:thisMonth'] || 0) + 1
      }
      if (task.dueDate && task.dueDate >= recentStartStr && task.dueDate <= recentEndStr) {
        counts['smart:recent'] = (counts['smart:recent'] || 0) + 1
      }
    })
    return counts
  }, [allTasksForCount, todayAtomTag])

  // Advanced group task counts
  const advGroupCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    advancedGroups.forEach((group) => {
      counts[group.id] = allTasksForCount.filter(
        (task) => !isTaskCompletedForFilter(task) && matchAdvancedGroup(task, group),
      ).length
    })
    return counts
  }, [allTasksForCount, advancedGroups, matchAdvancedGroup])

  const handleAdvGroupClick = (groupId: string) => {
    setSelectedListId(selectedListId === `adv:${groupId}` ? null : `adv:${groupId}`)
  }

  const handleCreateAdvGroup = async (e: React.MouseEvent) => {
    setEditingAdvGroup(null)
    const rect = await getScreenRect(e.currentTarget as HTMLElement)
    await showOverlay(ADVANCED_GROUP_FORM_LABEL, rect.x, rect.y, {
      anchorH: rect.height,
      anchorX: rect.x,
      anchorY: rect.y,
    })
  }

  const openAdvGroupEditor = async (group: AdvancedGroup, rect: { height: number; x: number; y: number }) => {
    setEditingAdvGroup(group)
    await showOverlay(ADVANCED_GROUP_FORM_LABEL, rect.x, rect.y, {
      anchorH: rect.height,
      anchorX: rect.x,
      anchorY: rect.y,
      group,
      groupId: group.id,
    })
  }

  const handleEditAdvGroup = async (e: React.MouseEvent, group: AdvancedGroup) => {
    e.stopPropagation()
    const target = e.currentTarget as HTMLElement | null
    if (!target) return
    await openAdvGroupEditor(group, await getScreenRect(target))
  }

  const handleContextMenu = (e: React.MouseEvent, type: 'list' | 'advGroup', id: string) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ id, type, x: e.clientX, y: e.clientY })
  }

  const handlePinList = (listId: string) => {
    const list = allLists.find((l) => l.id === listId)
    if (list) {
      updateList.mutate({ id: listId, isPinned: !list.isPinned })
    }
    setContextMenu(null)
  }

  const handleArchiveList = (listId: string) => {
    const list = allLists.find((l) => l.id === listId)
    if (list) {
      updateList.mutate({ id: listId, isArchived: !list.isArchived })
    }
    setContextMenu(null)
  }

  const handleDeleteList = (listId: string) => {
    deleteList.mutate(listId)
    setContextMenu(null)
  }

  const handlePinAdvGroup = (groupId: string) => {
    const group = advancedGroups.find((g) => g.id === groupId)
    if (group) {
      updateAdvancedGroup({ ...group, isPinned: !group.isPinned })
    }
    setContextMenu(null)
  }

  const handleDeleteAdvGroup = (groupId: string) => {
    deleteAdvancedGroup(groupId)
    setContextMenu(null)
  }

  const handleListClick = (listId: string) => {
    setSelectedListId(selectedListId === listId ? null : listId)
  }

  const handleCreateList = async (e?: React.MouseEvent) => {
    const el = e?.currentTarget as HTMLElement | undefined
    const rect = el ? await getScreenRect(el) : null
    await showOverlay(GROUP_FORM_LABEL, rect?.x ?? 0, rect?.y ?? 0, {
      _source: 'list',
      anchorH: rect?.height ?? 0,
      anchorX: rect?.x ?? 0,
      anchorY: rect?.y ?? 0,
      color: '#3B82F6',
      icon: '📁',
      isEditing: false,
      name: '',
      showDelete: false,
    })
  }

  const openListEditor = async (list: List, rect: { height: number; x: number; y: number }) => {
    await showOverlay(GROUP_FORM_LABEL, rect.x, rect.y + rect.height + 4, {
      _listId: list.id,
      _source: 'list',
      anchorH: rect.height,
      anchorX: rect.x,
      anchorY: rect.y,
      color: list.color || '#3B82F6',
      icon: resolveIcon(list.icon),
      isEditing: true,
      name: list.name,
      showDelete: true,
    })
  }

  const handleEditList = async (e: React.MouseEvent, list: List) => {
    e.stopPropagation()
    const target = e.currentTarget as HTMLElement | null
    if (!target) return
    await openListEditor(list, await getScreenRect(target))
  }

  // Compute header title based on selected list
  const headerTitle = useMemo(() => {
    if (!selectedListId) {
      return t('navigation.tasks')
    }
    if (selectedListId.startsWith('adv:')) {
      const groupId = selectedListId.slice(4)
      const group = advancedGroups.find((g) => g.id === groupId)
      return group?.name || t('navigation.tasks')
    }
    if (selectedListId === 'smart:today') {
      return t('lists.today')
    }
    if (selectedListId === 'smart:tomorrow') {
      return t('lists.tomorrow')
    }
    if (selectedListId === 'smart:recent7days') {
      return t('lists.next_7_days')
    }
    if (selectedListId === 'smart:thisMonth') {
      return t('lists.this_month')
    }
    if (selectedListId === 'smart:recent') {
      return t('lists.recent')
    }
    if (selectedListId === 'inbox') {
      return t('lists.inbox')
    }
    const list = allLists.find((l) => l.id === selectedListId)
    return list?.name || t('navigation.tasks')
  }, [selectedListId, allLists, advancedGroups, t])

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-theme-500 dark:text-theme-800">{t('common.loading')}</div>
      </div>
    )
  }
  return (
    <div className="flex-1 flex overflow-hidden" ref={containerRef}>
      <TaskSidebar
        advGroupCounts={advGroupCounts}
        advListsExpanded={advListsExpanded}
        advancedGroups={advancedGroups}
        groupsPanelWidth={groupsPanelWidth}
        handleAdvGroupClick={handleAdvGroupClick}
        handleContextMenu={handleContextMenu}
        handleCreateAdvGroup={handleCreateAdvGroup}
        handleCreateList={handleCreateList}
        handleEditAdvGroup={handleEditAdvGroup}
        handleEditList={handleEditList}
        handleListClick={handleListClick}
        listTaskCounts={listTaskCounts}
        listsExpanded={listsExpanded}
        pinnedAdvGroups={pinnedAdvGroups}
        pinnedLists={pinnedLists}
        resolveIcon={resolveIcon}
        selectedListId={selectedListId}
        setAdvListsExpanded={setAdvListsExpanded}
        setListsExpanded={setListsExpanded}
        userLists={userLists}
        visibleSmartLists={visibleSmartLists}
      />

      {/* Resize handle: groups <-> list */}
      <ResizeHandle onResize={(delta) => setGroupsPanelWidth((w) => Math.max(215, Math.min(315, w + delta)))} />

      <TaskListPane
        allTags={allTags}
        allTemplates={allTemplates}
        collapsedTaskGroups={collapsedTaskGroups}
        dateButtonRef={dateButtonRef}
        dateExplicitlySetRef={dateExplicitlySetRef}
        detailPanelWidth={detailPanelWidth}
        filterStatus={filterStatus}
        filteredTasks={filteredTasks}
        flatItemGroups={flatItemGroups}
        handleAttachmentClick={handleAttachmentClick}
        handleCreateInline={handleCreateInline}
        handleInlineClipboardPaste={handleInlineClipboardPaste}
        handleInlineKeyDown={handleInlineKeyDown}
        handleSetFilterStatus={handleSetFilterStatus}
        handleSetTaskGroupBy={handleSetTaskGroupBy}
        handleSetViewMode={handleSetViewMode}
        handleToggleTask={handleToggleTask}
        handleUpdateTaskInline={handleUpdateTaskInline}
        headerTitle={headerTitle}
        inlineDateOpenedRef={inlineDateOpenedRef}
        isTaskGroupGroupingDisabled={isTaskGroupGroupingDisabled}
        newTaskDueDate={newTaskDueDate}
        newTaskDueTime={newTaskDueTime}
        newTaskPriority={newTaskPriority}
        newTaskTagIds={newTaskTagIds}
        newTaskTitle={newTaskTitle}
        onApplyTemplate={handleApplyTemplate}
        pendingAttachments={pendingAttachments}
        persistSettings={persistSettings}
        priorityMode={priorityMode}
        priorityOptions={priorityOptions}
        selectedTaskId={selectedTaskId}
        selectedSubtaskId={selectedSubtaskId}
        setCollapsedTaskGroups={setCollapsedTaskGroups}
        setNewTaskPriority={setNewTaskPriority}
        setNewTaskTitle={setNewTaskTitle}
        setPendingAttachments={setPendingAttachments}
        setSelectedTaskId={setSelectedTaskId}
        setSelectedSubtaskId={setSelectedSubtaskId}
        setShowPriorityPicker={setShowPriorityPicker}
        setShowSettings={setShowSettings}
        setShowTemplatePicker={setShowTemplatePicker}
        setTaskContextMenu={setTaskContextMenu}
        setTaskMenuPanel={setTaskMenuPanel}
        setTaskSortBy={setTaskSortBy}
        setTaskSortOrder={setTaskSortOrder}
        showPriorityPicker={showPriorityPicker}
        showSettings={showSettings}
        showTemplatePicker={showTemplatePicker}
        tagButtonRef={tagButtonRef}
        taskGroupBy={taskGroupBy}
        templateButtonRef={templateButtonRef}
        viewMode={viewMode}
      />

      {viewMode === 'list' && (
        <>
          {/* Resize handle: list <-> detail */}
          <ResizeHandle
            onResize={(delta) => {
              setDetailPanelWidth((w) => Math.max(300, Math.min(400, w + delta)))
            }}
          />

          {/* Task Detail Panel */}
          <div className="flex-1 overflow-hidden" style={{ backgroundColor: 'var(--theme-bg-2)' }}>
            {selectedTask ? (
              <TaskDetailPanel
                allTags={allTags}
                focusTitleOnMount={focusTitleOnMount}
                inlineDateOpenedRef={inlineDateOpenedRef}
                onClose={() => {
                  setSelectedTaskId(null)
                  setSelectedSubtaskId(null)
                }}
                onDelete={() => handleDeleteTask(selectedSubtaskId || selectedTask.id)}
                onFocusTitleDone={() => setFocusTitleOnMount(false)}
                onSubtaskBack={() => setSelectedSubtaskId(null)}
                onSubtaskClick={(id) => setSelectedSubtaskId(id)}
                onUpdateTask={handleUpdateTaskField}
                selectedSubtaskId={selectedSubtaskId}
                task={selectedTask}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-theme-400 dark:text-theme-500">
                <p className="text-sm">{t('tasks.select_task')}</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Task Form Dialog */}
      <TaskForm
        isOpen={showTaskForm}
        onClose={() => {
          setShowTaskForm(false)
          setEditingTask(null)
        }}
        onSubmit={editingTask ? handleUpdateTask : handleCreateTask}
        task={editingTask}
      />

      {contextMenu && (
        <ListContextMenu
          advancedGroups={advancedGroups}
          allLists={allLists}
          menu={contextMenu}
          onArchiveList={handleArchiveList}
          onClose={() => setContextMenu(null)}
          onDeleteAdvancedGroup={handleDeleteAdvGroup}
          onDeleteList={handleDeleteList}
          onEditAdvancedGroup={openAdvGroupEditor}
          onEditList={openListEditor}
          onPinAdvancedGroup={handlePinAdvGroup}
          onPinList={handlePinList}
        />
      )}

      {taskContextMenu && (
        <TaskContextMenu
          allLists={allLists}
          menu={taskContextMenu}
          onClose={handleCloseTaskContextMenu}
          onDeleteTask={handleDeleteTask}
          onSaveAsTemplate={handleSaveTaskAsTemplate}
          onSetDate={handleSetTaskDateFromMenu}
          onToggleTodayTag={handleToggleTodayTag}
          onUpdateTask={(params) => {
            if (params.status === 'closed') {
              void runAfterTaskCompletionDelay(() => updateTask.mutate(params))
              return
            }
            updateTask.mutate(params)
          }}
          panel={taskMenuPanel}
          priorityMode={priorityMode}
          priorityOptions={priorityOptions}
          search={taskPanelSearch}
          setPanel={setTaskMenuPanel}
          setSearch={setTaskPanelSearch}
          tasks={tasks}
          todayAtomTag={todayAtomTag || undefined}
        />
      )}
    </div>
  )
}
