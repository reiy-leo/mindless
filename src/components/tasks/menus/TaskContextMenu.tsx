import {
  Calendar,
  ChevronRight,
  ClipboardCheck,
  Columns,
  CornerDownRight,
  CornerUpLeft,
  Flag,
  Inbox,
  Search,
  Sun,
  Trash2,
  X,
} from 'lucide-react'
import { type Dispatch, type SetStateAction, useLayoutEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { PriorityOption } from '@/lib/priorityOptions'
import type { PriorityMode } from '@/types'
import type { Tag } from '@/types/tag'
import type { List, Task, TaskStatus, UpdateTaskParams } from '@/types/task'
import OxygenNotIncludedPriorityPicker from '%/tasks/controls/OxygenNotIncludedPriorityPicker'

export type TaskMenuPanel = 'parent' | 'subtask' | 'priority' | 'status' | 'list'

export interface TaskContextMenuState {
  taskId: string
  x: number
  y: number
}

interface TaskContextMenuProps {
  allLists: List[]
  menu: TaskContextMenuState
  onClose: () => void
  onDeleteTask: (taskId: string) => void
  onSaveAsTemplate: (task: Task) => void | Promise<void>
  onSetDate: (taskId: string, task: Task | undefined, fallback: { x: number; y: number }) => void | Promise<void>
  onToggleTodayTag: (taskId: string) => void
  onUpdateTask: (params: { id: string } & UpdateTaskParams) => void
  panel: TaskMenuPanel | null
  priorityMode: PriorityMode
  priorityOptions: PriorityOption[]
  search: string
  setPanel: Dispatch<SetStateAction<TaskMenuPanel | null>>
  setSearch: Dispatch<SetStateAction<string>>
  tasks: Task[]
  todayAtomTag?: Tag
}

const TASK_STATUSES: { key: TaskStatus; color: string }[] = [
  { color: '#9CA3AF', key: 'pending' },
  { color: '#3B82F6', key: 'in_progress' },
  { color: '#F59E0B', key: 'today' },
  { color: '#10B981', key: 'completed' },
  { color: '#6B7280', key: 'closed' },
]

const SYSTEM_LIST_IDS = ['inbox', 'today', 'tomorrow', 'next7days', 'thismonth', 'recent']

export default function TaskContextMenu({
  allLists,
  menu,
  onClose,
  onDeleteTask,
  onSaveAsTemplate,
  onSetDate,
  onToggleTodayTag,
  onUpdateTask,
  panel,
  priorityMode,
  priorityOptions,
  search,
  setPanel,
  setSearch,
  tasks,
  todayAtomTag,
}: TaskContextMenuProps) {
  const { t } = useTranslation('common')
  const menuRef = useRef<HTMLDivElement>(null)
  const [flipY, setFlipY] = useState(false)
  const sidePanelMaxHeight = Math.max(160, (flipY ? menu.y : window.innerHeight - menu.y) - 12)
  const currentTask = tasks.find((t) => t.id === menu.taskId)

  useLayoutEffect(() => {
    if (!menuRef.current) {
      return
    }
    const rect = menuRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - menu.y
    setFlipY(rect.height > spaceBelow && menu.y > spaceBelow)
  }, [menu.y, panel])

  const closeMenu = () => {
    onClose()
    setFlipY(false)
  }

  const togglePanel = (nextPanel: TaskMenuPanel) => {
    setPanel((current) => (current === nextPanel ? null : nextPanel))
    if (nextPanel === 'parent' || nextPanel === 'subtask' || nextPanel === 'list') {
      setSearch('')
    }
  }

  const renderTodayButton = () => {
    if (!todayAtomTag || !currentTask) {
      return null
    }
    const hasToday = currentTask.tagIds?.split(',').includes(todayAtomTag.id)
    const now = new Date()
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    const matchesDate = currentTask.dueDate === todayStr
    const matchesRange =
      currentTask.startDate && currentTask.endDate
        ? currentTask.startDate <= todayStr && currentTask.endDate >= todayStr
        : false
    if (!hasToday && (matchesDate || matchesRange)) {
      return null
    }
    return (
      <button
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-theme-700 dark:text-theme-300 hover:bg-theme-100 dark:hover:bg-theme-700 transition-colors"
        onClick={() => {
          onToggleTodayTag(menu.taskId)
          closeMenu()
        }}
        type="button"
      >
        <Sun className="w-4 h-4" />
        {hasToday ? t('tasks.context.remove_today') : t('tasks.context.add_today')}
      </button>
    )
  }

  const renderSearchInput = () => (
    <div className="px-2 pb-1">
      <div className="relative">
        <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-theme-400" />
        <input
          className="w-full pl-7 pr-2 py-1 text-xs bg-theme-50 dark:bg-theme-700 border border-theme-200 dark:border-theme-600 rounded focus:outline-none focus:ring-1 focus:ring-theme-500 text-theme-900 dark:text-theme-100"
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('tasks.search_placeholder')}
          type="text"
          value={search}
        />
      </div>
    </div>
  )

  const renderSidePanel = () => {
    if (!panel) {
      return null
    }

    if (panel === 'priority') {
      return (
        <div
          className="bg-white dark:bg-theme-800 rounded-lg shadow-2xl border border-theme-900 dark:border-theme-100 py-1 overflow-y-auto ml-0.5"
          style={{ maxHeight: sidePanelMaxHeight }}
        >
          {priorityMode === 'OxygenNotIncluded' ? (
            <OxygenNotIncludedPriorityPicker
              onSelect={(priority) => {
                onUpdateTask({ id: menu.taskId, priority })
                closeMenu()
              }}
              options={priorityOptions}
              selectedPriority={currentTask?.priority}
            />
          ) : (
            <div className="w-45">
              {priorityOptions.map((p) => (
                <button
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                    currentTask?.priority === p.value
                      ? 'bg-theme-100 dark:bg-theme-700 font-medium'
                      : 'text-theme-700 dark:text-theme-300 hover:bg-theme-50 dark:hover:bg-theme-700'
                  }`}
                  key={p.value}
                  onClick={() => {
                    onUpdateTask({ id: menu.taskId, priority: p.value })
                    closeMenu()
                  }}
                  type="button"
                >
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color.bg }} />
                  {p.label}
                  {currentTask?.priority === p.value && <span className="ml-auto text-xs">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      )
    }

    if (panel === 'status') {
      return (
        <div
          className="bg-white dark:bg-theme-800 rounded-lg shadow-2xl border border-theme-200 dark:border-theme-700 py-1 w-45 overflow-y-auto ml-0.5"
          style={{ maxHeight: sidePanelMaxHeight }}
        >
          {TASK_STATUSES.map((s) => (
            <button
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                (currentTask?.status || 'pending') === s.key
                  ? 'bg-theme-100 dark:bg-theme-700 font-medium'
                  : 'text-theme-700 dark:text-theme-300 hover:bg-theme-50 dark:hover:bg-theme-700'
              }`}
              key={s.key}
              onClick={() => {
                onUpdateTask({ id: menu.taskId, status: s.key })
                closeMenu()
              }}
              type="button"
            >
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
              {t(`tasks.status.${s.key}`)}
              {(currentTask?.status || 'pending') === s.key && <span className="ml-auto text-xs">✓</span>}
            </button>
          ))}
        </div>
      )
    }

    if (panel === 'list') {
      const lists = allLists.filter((l) => !SYSTEM_LIST_IDS.includes(l.id))
      const query = search.toLowerCase().trim()
      const filteredLists = query ? lists.filter((l) => l.name.toLowerCase().includes(query)) : lists
      return (
        <div className="bg-white dark:bg-theme-800 rounded-lg shadow-2xl border border-theme-200 dark:border-theme-700 py-1 w-55 ml-0.5">
          {renderSearchInput()}
          <div className="max-h-75 overflow-auto">
            <button
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                !currentTask?.listId
                  ? 'bg-theme-100 dark:bg-theme-700 font-medium'
                  : 'text-theme-700 dark:text-theme-300 hover:bg-theme-50 dark:hover:bg-theme-700'
              }`}
              onClick={() => {
                onUpdateTask({ id: menu.taskId, listId: undefined })
                closeMenu()
              }}
              type="button"
            >
              <Inbox className="w-3.5 h-3.5" />
              {t('lists.inbox')}
              {!currentTask?.listId && <span className="ml-auto text-xs">✓</span>}
            </button>
            {filteredLists.map((l) => (
              <button
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left truncate transition-colors ${
                  currentTask?.listId === l.id
                    ? 'bg-theme-100 dark:bg-theme-700 font-medium'
                    : 'text-theme-700 dark:text-theme-300 hover:bg-theme-50 dark:hover:bg-theme-700'
                }`}
                key={l.id}
                onClick={() => {
                  onUpdateTask({ id: menu.taskId, listId: l.id })
                  closeMenu()
                }}
                type="button"
              >
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: l.color || '#3B82F6' }} />
                <span className="truncate">{l.name}</span>
                {currentTask?.listId === l.id && <span className="ml-auto text-xs shrink-0">✓</span>}
              </button>
            ))}
          </div>
        </div>
      )
    }

    const incompleteTasks = tasks.filter((tk) => !tk.isCompleted && tk.id !== menu.taskId)
    const query = search.toLowerCase().trim()
    const filtered = query ? incompleteTasks.filter((tk) => tk.title.toLowerCase().includes(query)) : incompleteTasks

    return (
      <div className="bg-white dark:bg-theme-800 rounded-lg shadow-2xl border border-theme-100 dark:border-theme-900 py-1 w-55 ml-0.5">
        {renderSearchInput()}
        <div className="max-h-75 overflow-auto">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-theme-400">{t('tasks.context.no_candidates')}</div>
          ) : (
            filtered.map((tk) => {
              const isLinked =
                panel === 'parent' ? currentTask?.parentTaskId === tk.id : tk.parentTaskId === menu.taskId
              return (
                <button
                  className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left truncate transition-colors ${
                    isLinked
                      ? 'bg-theme-50 dark:bg-theme-900/20 font-medium'
                      : 'text-theme-700 dark:text-theme-300 hover:bg-theme-50 dark:hover:bg-theme-700'
                  }`}
                  key={tk.id}
                  onClick={() => {
                    if (panel === 'parent') {
                      onUpdateTask({ id: menu.taskId, level: 1, parentTaskId: tk.id })
                    } else {
                      onUpdateTask({ id: tk.id, level: 1, parentTaskId: menu.taskId })
                    }
                    closeMenu()
                  }}
                  type="button"
                >
                  <span className="truncate">{tk.title}</span>
                  {isLinked && <span className="ml-auto text-xs shrink-0 text-theme-500">✓</span>}
                </button>
              )
            })
          )}
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="fixed inset-0 z-50" onMouseDown={closeMenu} />
      <div
        className="fixed z-50 flex items-start"
        ref={menuRef}
        style={{
          left: menu.x,
          ...(flipY ? { bottom: window.innerHeight - menu.y } : { top: menu.y }),
        }}
      >
        <div className="bg-white dark:bg-theme-800 rounded-lg shadow-2xl border border-theme-100 dark:border-theme-900 py-1 min-w-45">
          {renderTodayButton()}
          <button
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-theme-700 dark:text-theme-300 hover:bg-theme-100 dark:hover:bg-theme-700 transition-colors"
            onClick={() => togglePanel('priority')}
            type="button"
          >
            <Flag className="w-4 h-4" />
            {t('tasks.context.set_priority')}
            <ChevronRight className="w-3 h-3 ml-auto" />
          </button>
          <button
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-theme-700 dark:text-theme-300 hover:bg-theme-100 dark:hover:bg-theme-700 transition-colors"
            onClick={() => onSetDate(menu.taskId, currentTask, { x: menu.x, y: menu.y })}
            type="button"
          >
            <Calendar className="w-4 h-4" />
            {t('tasks.context.set_date')}
          </button>
          <button
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-theme-700 dark:text-theme-300 hover:bg-theme-100 dark:hover:bg-theme-700 transition-colors"
            onClick={() => togglePanel('status')}
            type="button"
          >
            <Columns className="w-4 h-4" />
            {t('tasks.context.set_status')}
            <ChevronRight className="w-3 h-3 ml-auto" />
          </button>
          <button
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-theme-700 dark:text-theme-300 hover:bg-theme-100 dark:hover:bg-theme-700 transition-colors"
            onClick={() => togglePanel('parent')}
            type="button"
          >
            <CornerUpLeft className="w-4 h-4" />
            {t('tasks.context.link_parent')}
            <ChevronRight className="w-3 h-3 ml-auto" />
          </button>
          <button
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-theme-700 dark:text-theme-300 hover:bg-theme-100 dark:hover:bg-theme-700 transition-colors"
            onClick={() => togglePanel('subtask')}
            type="button"
          >
            <CornerDownRight className="w-4 h-4" />
            {t('tasks.context.link_subtask')}
            <ChevronRight className="w-3 h-3 ml-auto" />
          </button>
          <button
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-theme-700 dark:text-theme-300 hover:bg-theme-100 dark:hover:bg-theme-700 transition-colors"
            onClick={() => togglePanel('list')}
            type="button"
          >
            <Inbox className="w-4 h-4" />
            {t('tasks.context.set_list')}
            <ChevronRight className="w-3 h-3 ml-auto" />
          </button>
          <div className="border-t border-theme-200 dark:border-theme-700 my-1" />
          <button
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-theme-700 dark:text-theme-300 hover:bg-theme-100 dark:hover:bg-theme-700 transition-colors"
            onClick={async () => {
              if (currentTask) {
                await onSaveAsTemplate(currentTask)
              }
              closeMenu()
            }}
            type="button"
          >
            <ClipboardCheck className="w-4 h-4" />
            {t('tasks.save_as_template')}
          </button>
          <button
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-theme-700 dark:text-theme-300 hover:bg-theme-100 dark:hover:bg-theme-700 transition-colors"
            onClick={() => {
              onUpdateTask({ id: menu.taskId, status: 'closed' })
              closeMenu()
            }}
            type="button"
          >
            <X className="w-4 h-4" />
            {t('tasks.context.abandon')}
          </button>
          <button
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            onClick={() => {
              onDeleteTask(menu.taskId)
              closeMenu()
            }}
            type="button"
          >
            <Trash2 className="w-4 h-4" />
            {t('common.delete')}
          </button>
        </div>
        {renderSidePanel()}
      </div>
    </>
  )
}
