import {
  Calendar,
  ChevronDown,
  ChevronRight,
  Clipboard,
  ClipboardCheck,
  ClipboardList,
  Clock,
  Columns,
  Flag,
  List as ListIcon,
  type LucideIcon,
  MoreVertical,
  Paperclip,
  Send,
  Table2,
  Tag as TagIconLucide,
} from 'lucide-react'
import { type Dispatch, type KeyboardEvent, type MutableRefObject, type RefObject, type SetStateAction } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import type { PriorityMode } from '@/types'
import { VIEW_MODES } from '@/lib/constants'
import { DATE_RANGE_PICKER_LABEL, showOverlay, TAG_LIST_PICKER_LABEL } from '@/lib/overlayManager'
import type { PriorityOption } from '@/lib/priorityOptions'
import { getScreenRect } from '@/lib/screenRect'
import type { PendingAttachment } from '@/types/attachment'
import type { ListSettings, Priority, SortBy, Task, TaskFilterStatus } from '@/types/task'
import type { Tag } from '@/types/tag'
import type { TaskTemplate } from '@/types/taskTemplate'
import OxygenNotIncludedPriorityPicker from '%/tasks/controls/OxygenNotIncludedPriorityPicker'
import { TaskGroupControls } from '%/tasks/controls/TaskGroupControls'
import { TaskSortControls } from '%/tasks/controls/TaskSortControls'
import TaskRow from '%/tasks/list/TaskRow'
import type { TaskMenuPanel } from '%/tasks/menus/TaskContextMenu'
import CalendarView from '%/tasks/views/CalendarView'
import EisenhowerMatrixView from '%/tasks/views/EisenhowerMatrixView'
import KanbanView from '%/tasks/views/KanbanView'

type TaskStatus3 = TaskFilterStatus
type ViewMode = keyof typeof VIEW_MODES

export interface FlatTaskGroup {
  id: string
  items: { task: Task; type: 'task' }[]
  tasks: Task[]
  title: string
}

const TASK_VIEW_OPTIONS: {
  icon: LucideIcon
  labelKey: (typeof VIEW_MODES)[keyof typeof VIEW_MODES]
  value: ViewMode
}[] = [
  { icon: Calendar, labelKey: VIEW_MODES.calendar, value: 'calendar' },
  { icon: Columns, labelKey: VIEW_MODES.kanban, value: 'kanban' },
  { icon: ListIcon, labelKey: VIEW_MODES.list, value: 'list' },
  { icon: Table2, labelKey: VIEW_MODES.matrix, value: 'matrix' },
]

const TASK_STATUS_OPTIONS: { icon: LucideIcon; labelKey: string; value: TaskStatus3 }[] = [
  { icon: ClipboardList, labelKey: 'tasks.status.all', value: 'all' },
  { icon: Clock, labelKey: 'tasks.status.active', value: 'active' },
  { icon: ClipboardCheck, labelKey: 'tasks.status.completed', value: 'completed' },
]

interface TaskListPaneProps {
  allTags: Tag[]
  allTemplates: TaskTemplate[]
  collapsedTaskGroups: Record<string, boolean>
  dateButtonRef: RefObject<HTMLButtonElement>
  dateExplicitlySetRef: MutableRefObject<boolean>
  detailPanelWidth: number
  filterStatus: TaskStatus3
  filteredTasks: Task[]
  flatItemGroups: FlatTaskGroup[]
  handleAttachmentClick: () => void
  handleCreateInline: (onSuccess?: (task: Task) => void) => void
  handleInlineClipboardPaste: () => void
  handleInlineKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void
  handleSetFilterStatus: (status: TaskStatus3) => void
  handleSetTaskGroupBy: (groupBy: string) => void
  handleSetViewMode: (mode: ViewMode) => void
  handleToggleTask: (id: string, isCompleted: boolean) => void
  handleUpdateTaskInline: (id: string, params: unknown) => void
  headerTitle: string
  inlineDateOpenedRef: MutableRefObject<boolean>
  isTaskGroupGroupingDisabled: boolean
  newTaskDueDate: string
  newTaskDueTime: string
  newTaskPriority: Priority
  newTaskTagIds: string[]
  newTaskTitle: string
  onApplyTemplate: (template: TaskTemplate) => void
  pendingAttachments: PendingAttachment[]
  persistSettings: (settings: Partial<ListSettings>) => void
  priorityMode: PriorityMode
  priorityOptions: PriorityOption[]
  selectedSubtaskId: string | null
  selectedTaskId: string | null
  setCollapsedTaskGroups: Dispatch<SetStateAction<Record<string, boolean>>>
  setNewTaskPriority: Dispatch<SetStateAction<Priority>>
  setNewTaskTitle: Dispatch<SetStateAction<string>>
  setPendingAttachments: Dispatch<SetStateAction<PendingAttachment[]>>
  setSelectedTaskId: Dispatch<SetStateAction<string | null>>
  setSelectedSubtaskId: Dispatch<SetStateAction<string | null>>
  setShowPriorityPicker: Dispatch<SetStateAction<boolean>>
  setShowSettings: Dispatch<SetStateAction<boolean>>
  setShowTemplatePicker: Dispatch<SetStateAction<boolean>>
  setTaskMenuPanel: Dispatch<SetStateAction<TaskMenuPanel | null>>
  setTaskSortBy: (sortBy: SortBy) => void
  setTaskSortOrder: (sortOrder: 'asc' | 'desc') => void
  setTaskContextMenu: Dispatch<SetStateAction<{ taskId: string; x: number; y: number } | null>>
  showPriorityPicker: boolean
  showSettings: boolean
  showTemplatePicker: boolean
  tagButtonRef: RefObject<HTMLButtonElement>
  taskGroupBy: string
  templateButtonRef: RefObject<HTMLButtonElement>
  viewMode: ViewMode
}

export default function TaskListPane({
  allTags,
  allTemplates,
  collapsedTaskGroups,
  dateButtonRef,
  dateExplicitlySetRef,
  detailPanelWidth,
  filterStatus,
  filteredTasks,
  flatItemGroups,
  handleAttachmentClick,
  handleCreateInline,
  handleInlineClipboardPaste,
  handleInlineKeyDown,
  handleSetFilterStatus,
  handleSetTaskGroupBy,
  handleSetViewMode,
  handleToggleTask,
  handleUpdateTaskInline,
  headerTitle,
  inlineDateOpenedRef,
  isTaskGroupGroupingDisabled,
  newTaskDueDate,
  newTaskDueTime,
  newTaskPriority,
  newTaskTagIds,
  newTaskTitle,
  onApplyTemplate,
  pendingAttachments,
  persistSettings,
  priorityMode,
  priorityOptions,
  selectedTaskId,
  selectedSubtaskId,
  setCollapsedTaskGroups,
  setNewTaskPriority,
  setNewTaskTitle,
  setPendingAttachments,
  setSelectedTaskId,
  setSelectedSubtaskId,
  setShowPriorityPicker,
  setShowSettings,
  setShowTemplatePicker,
  setTaskContextMenu,
  setTaskMenuPanel,
  setTaskSortBy,
  setTaskSortOrder,
  showPriorityPicker,
  showSettings,
  showTemplatePicker,
  tagButtonRef,
  taskGroupBy,
  templateButtonRef,
  viewMode,
}: TaskListPaneProps) {
  const { t } = useTranslation('common')

  return (
    <div
      className={`flex flex-col overflow-hidden ${viewMode === 'list' ? 'min-w-75 max-w-100' : 'flex-1 min-w-0'}`}
      style={{ backgroundColor: 'var(--theme-bg-2)', ...(viewMode === 'list' ? { width: detailPanelWidth } : {}) }}
    >
      <div className="px-2 py-1">
        <div className="flex items-center justify-between" data-tauri-drag-region>
          <h1 className="text-lg font-bold text-theme-900 dark:text-theme-200">{headerTitle}</h1>
          <div className="flex items-center gap-2">
            <div
              className="relative"
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setShowSettings(false)
                }
              }}
              tabIndex={-1}
            >
              <button
                className="p-2 rounded-lg transition-colors hover:bg-theme-100"
                onClick={() => setShowSettings(!showSettings)}
                title={t('tasks.settings')}
                type="button"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {showSettings && (
                <div
                  className="absolute right-0 top-full mt-1 w-72 bg-white dark:bg-theme-800 rounded-lg shadow-xl border border-theme-200 dark:border-theme-700 z-50 p-4 space-y-4"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <div>
                    <div className="text-xs font-semibold text-theme-500 dark:text-theme-400 uppercase tracking-wider mb-1.5 block">
                      {t('tasks.settings_view')}
                    </div>
                    <div className="grid grid-cols-4 gap-1">
                      {TASK_VIEW_OPTIONS.map((opt) => {
                        const Icon = opt.icon
                        return (
                          <button
                            className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded px-1.5 py-1.5 text-xs transition-colors ${
                              viewMode === opt.value
                                ? 'bg-theme-500 text-white'
                                : 'bg-theme-100 text-theme-700 hover:bg-theme-200 dark:bg-theme-700 dark:text-theme-300 dark:hover:bg-theme-600'
                            }`}
                            key={opt.value}
                            onClick={() => {
                              handleSetViewMode(opt.value)
                              setShowSettings(false)
                            }}
                            type="button"
                          >
                            <Icon className="h-4 w-4" />
                            <span className="max-w-full truncate text-[10px] leading-none">{t(opt.labelKey)}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-theme-500 dark:text-theme-400 uppercase tracking-wider mb-1.5 block">
                      {t('tasks.settings_status')}
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      {TASK_STATUS_OPTIONS.map((opt) => {
                        const Icon = opt.icon
                        return (
                          <button
                            className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded px-1.5 py-1.5 text-xs transition-colors ${
                              filterStatus === opt.value
                                ? 'bg-theme-500 text-white'
                                : 'bg-theme-100 text-theme-700 hover:bg-theme-200 dark:bg-theme-700 dark:text-theme-300 dark:hover:bg-theme-600'
                            }`}
                            key={opt.value}
                            onClick={() => handleSetFilterStatus(opt.value)}
                            type="button"
                          >
                            <Icon className="h-4 w-4" />
                            <span className="max-w-full truncate text-[10px] leading-none">{t(opt.labelKey)}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-theme-500 dark:text-theme-400 uppercase tracking-wider mb-1.5 block">
                      {t('tasks.settings_sort')}
                    </div>
                    <TaskSortControls
                      onChange={(sortBy, sortOrder) => {
                        setTaskSortBy(sortBy as SortBy)
                        setTaskSortOrder(sortOrder)
                        persistSettings({
                          sortBy: sortBy as ListSettings['sortBy'],
                          sortOrder,
                        })
                      }}
                    />
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-theme-500 dark:text-theme-400 uppercase tracking-wider mb-1.5 block">
                      {t('tasks.settings_group')}
                    </div>
                    <TaskGroupControls
                      disableTaskGroup={isTaskGroupGroupingDisabled}
                      onChange={(groupBy) => handleSetTaskGroupBy(groupBy)}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {viewMode === 'calendar' ? (
        <CalendarView
          allTags={allTags}
          onSelectTask={(id) => setSelectedTaskId(id === selectedTaskId ? null : id)}
          onToggleTask={handleToggleTask}
          selectedTaskId={selectedTaskId}
          tasks={filteredTasks}
        />
      ) : viewMode === 'kanban' ? (
        <KanbanView
          allTags={allTags}
          onSelectTask={(id) => setSelectedTaskId(id === selectedTaskId ? null : id)}
          onToggleTask={handleToggleTask}
          onUpdateTask={handleUpdateTaskInline}
          selectedTaskId={selectedTaskId}
          tasks={filteredTasks}
        />
      ) : viewMode === 'matrix' ? (
        <EisenhowerMatrixView
          allTags={allTags}
          onSelectTask={(id) => setSelectedTaskId(id === selectedTaskId ? null : id)}
          onToggleTask={handleToggleTask}
          onUpdateTask={handleUpdateTaskInline}
          selectedTaskId={selectedTaskId}
          tasks={filteredTasks}
        />
      ) : (
        <div className="flex-1 overflow-auto p-1">
          <div className="mb-1 bg-theme-100/30 dark:bg-theme-800/30 rounded-lg shadow-sm border border-theme-200 dark:border-theme-800">
            <input
              className="w-full px-4 py-3 text-sm text-theme-900 dark:text-theme-100 bg-transparent focus:outline-none placeholder-gray-400 dark:placeholder-gray-500"
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={handleInlineKeyDown}
              placeholder={t('tasks.inline_placeholder')}
              type="text"
              value={newTaskTitle}
            />
            <div className="flex items-center justify-between px-1 py-1.5">
              <div className="flex items-center gap-1">
                <div className="relative">
                  <button
                    className={`p-1.5 rounded transition-colors ${
                      newTaskPriority > 0
                        ? 'text-orange-500 bg-orange-50 dark:bg-orange-900/20'
                        : 'hover:bg-theme-100 dark:hover:bg-theme-700 text-theme-400 dark:text-theme-500'
                    }`}
                    onClick={() => setShowPriorityPicker(!showPriorityPicker)}
                    title={t('tasks.priority.label')}
                    type="button"
                  >
                    <Flag className="w-4 h-4" />
                  </button>
                  {showPriorityPicker && (
                    <div className="absolute top-full left-0 mt-1 bg-white dark:bg-theme-800 rounded-lg shadow-lg border border-theme-200 dark:border-theme-700 z-50">
                      {priorityMode === 'OxygenNotIncluded' ? (
                        <OxygenNotIncludedPriorityPicker
                          onSelect={(priority) => {
                            setNewTaskPriority(priority)
                            setShowPriorityPicker(false)
                          }}
                          options={priorityOptions}
                          selectedPriority={newTaskPriority}
                        />
                      ) : (
                        <div className="p-1.5 flex flex-col gap-1 items-center w-25">
                          {priorityOptions.map((p) => (
                            <button
                              className={`px-2 py-1 rounded text-xs transition-colors w-full ${
                                newTaskPriority === p.value
                                  ? 'bg-theme-500 text-white'
                                  : 'hover:bg-theme-100 dark:hover:bg-theme-700 text-theme-600 dark:text-theme-400'
                              }`}
                              key={p.value}
                              onClick={() => {
                                setNewTaskPriority(p.value)
                                setShowPriorityPicker(false)
                              }}
                              type="button"
                            >
                              {p.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="relative">
                  <button
                    className={`p-1.5 rounded transition-colors ${
                      newTaskTagIds.length > 0
                        ? 'text-theme-500 bg-theme-50 dark:bg-theme-900/20'
                        : 'hover:bg-theme-100 dark:hover:bg-theme-700 text-theme-400 dark:text-theme-500'
                    }`}
                    onClick={async () => {
                      if (tagButtonRef.current) {
                        const rect = await getScreenRect(tagButtonRef.current)
                        await showOverlay(TAG_LIST_PICKER_LABEL, rect.x, rect.y, {
                          anchorH: rect.height,
                          anchorX: rect.x,
                          anchorY: rect.y,
                          selectedIds: newTaskTagIds,
                          tags: allTags,
                        })
                      }
                    }}
                    ref={tagButtonRef}
                    title={t('tasks.tags.title')}
                    type="button"
                  >
                    <TagIconLucide className="w-4 h-4" />
                  </button>
                </div>
                <button
                  className={`flex items-center gap-1 p-1.5 rounded transition-colors ${
                    dateExplicitlySetRef.current
                      ? 'text-theme-500 bg-theme-50 dark:bg-theme-900/20'
                      : 'hover:bg-theme-100 dark:hover:bg-theme-700 text-theme-400 dark:text-theme-500'
                  }`}
                  onClick={async () => {
                    inlineDateOpenedRef.current = true
                    if (dateButtonRef.current) {
                      const rect = await getScreenRect(dateButtonRef.current)
                      await showOverlay(DATE_RANGE_PICKER_LABEL, rect.x, rect.y + rect.height + 4, {
                        anchorH: rect.height,
                        anchorX: rect.x,
                        anchorY: rect.y,
                        date: newTaskDueDate || undefined,
                        mode: 'single',
                        startDate: newTaskDueDate || undefined,
                        startTime: newTaskDueTime || undefined,
                        time: newTaskDueTime || undefined,
                      })
                    }
                  }}
                  ref={dateButtonRef}
                  title={t('tasks.date_placeholder')}
                  type="button"
                >
                  <Calendar className="w-4 h-4" />
                  {dateExplicitlySetRef.current && (
                    <span className="text-xs">
                      {newTaskDueDate}
                      {newTaskDueTime ? ` ${newTaskDueTime}` : ''}
                    </span>
                  )}
                </button>
                <button
                  className="p-1.5 rounded transition-colors hover:bg-theme-100 dark:hover:bg-theme-700 text-theme-400 dark:text-theme-500"
                  onClick={handleInlineClipboardPaste}
                  title={t('tasks.clipboard_paste')}
                  type="button"
                >
                  <Clipboard className="w-4 h-4" />
                </button>
                <button
                  className={`flex items-center gap-1 p-1.5 rounded transition-colors ${
                    pendingAttachments.length > 0
                      ? 'text-theme-500 bg-theme-50 dark:bg-theme-900/20'
                      : 'hover:bg-theme-100 dark:hover:bg-theme-700 text-theme-400 dark:text-theme-500'
                  }`}
                  onClick={handleAttachmentClick}
                  title={t('tasks.attachment')}
                  type="button"
                >
                  <Paperclip className="w-4 h-4" />
                  {pendingAttachments.length > 0 && <span className="text-xs">{pendingAttachments.length}</span>}
                </button>
                <div className="relative">
                  <button
                    className="p-1.5 rounded transition-colors hover:bg-theme-100 dark:hover:bg-theme-700 text-theme-400 dark:text-theme-500"
                    onClick={() => setShowTemplatePicker(!showTemplatePicker)}
                    ref={templateButtonRef}
                    title={t('tasks.template')}
                    type="button"
                  >
                    <ClipboardList className="w-4 h-4" />
                  </button>
                  {showTemplatePicker &&
                    allTemplates.length > 0 &&
                    createPortal(
                      <div
                        className="bg-white dark:bg-theme-800 rounded-lg shadow-lg border border-theme-200 dark:border-theme-700 py-1 min-w-45 max-h-30 overflow-y-auto"
                        style={{
                          left: templateButtonRef.current?.getBoundingClientRect().left ?? 0,
                          position: 'fixed',
                          top: (templateButtonRef.current?.getBoundingClientRect().bottom ?? 0) + 4,
                          zIndex: 99999,
                        }}
                      >
                        {allTemplates.map((template) => (
                          <button
                            className="w-full text-left px-3 py-1.5 text-sm text-theme-700 dark:text-theme-300 hover:bg-theme-100 dark:hover:bg-theme-700 transition-colors truncate"
                            key={template.id}
                            onClick={() => onApplyTemplate(template)}
                            type="button"
                          >
                            {template.name}
                          </button>
                        ))}
                      </div>,
                      document.body,
                    )}
                </div>
              </div>
              <button
                className="p-1.5 rounded transition-colors hover:bg-theme-100 dark:hover:bg-theme-700 text-theme-400 dark:text-theme-500"
                onClick={() => handleCreateInline((task) => setSelectedTaskId(task.id))}
                title={t('tasks.add')}
                type="button"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            {pendingAttachments.length > 0 && (
              <div className="flex gap-1 flex-col px-2 pb-1.5 w-full">
                {pendingAttachments.map((att, idx) => (
                  <span
                    className="inline-flex items-center gap-1 text-xs bg-theme-50 dark:bg-theme-900/30 text-theme-600 dark:text-theme-400 px-2 py-0.5 rounded"
                    key={`${idx}`}
                  >
                    {att.originalFilename}
                    <button
                      className="hover:text-red-500"
                      onClick={() => setPendingAttachments((prev) => prev.filter((_, i) => i !== idx))}
                      type="button"
                    >
                      x
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {filteredTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-theme-500 dark:text-theme-400">
              <p className="text-lg">{t('tasks.no_tasks')}</p>
            </div>
          ) : (
            <div className="space-y-1">
              {flatItemGroups.map((group) => {
                const isCollapsed = collapsedTaskGroups[group.id] ?? false

                return (
                  <div className="space-y-1" key={group.id}>
                    {taskGroupBy !== 'none' && (
                      <button
                        className="sticky top-0 z-10 flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left text-xs font-medium text-theme-500 transition-colors  dark:bg-theme-900/80 dark:text-theme-400"
                        onClick={() =>
                          setCollapsedTaskGroups((prev) => ({ ...prev, [group.id]: !(prev[group.id] ?? false) }))
                        }
                        type="button"
                      >
                        {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        <span className="min-w-0 flex-1 truncate">{group.title}</span>
                        <span className="shrink-0 text-[11px] text-theme-400 dark:text-theme-500">
                          {group.tasks.length}
                        </span>
                      </button>
                    )}
                    {!isCollapsed &&
                      group.items.map((item) => {
                        const displayTask = item.task

                        return (
                          <TaskRow
                            isSelected={selectedTaskId === displayTask.id && !selectedSubtaskId}
                            key={displayTask.id}
                            onContextMenu={(e) => {
                              setTaskContextMenu({ taskId: displayTask.id, x: e.clientX, y: e.clientY })
                              setTaskMenuPanel(null)
                            }}
                            onSelect={() => {
                              setSelectedTaskId(selectedTaskId === item.task.id ? null : item.task.id)
                              setSelectedSubtaskId(null)
                            }}
                            onToggle={() => {
                              handleToggleTask(item.task.id, item.task.isCompleted)
                            }}
                            progressStyle="circle"
                            task={displayTask}
                          />
                        )
                      })}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
