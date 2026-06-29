import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import CheckNow from '@/components/common/CheckNow'
import { formatDisplayDate, formatTime } from '@/lib/formatUtils'
import { getTaskTags } from '@/lib/taskHelpers'
import { useAppStore } from '@/stores/useAppStore'
import type { Tag } from '@/types/tag'
import type { Task, TaskStatus, UpdateTaskParams } from '@/types/task'

interface KanbanViewProps {
  allTags: Tag[]
  onSelectTask: (id: string | null) => void
  onToggleTask: (id: string, isCompleted: boolean) => void
  onUpdateTask: (id: string, params: Partial<UpdateTaskParams>) => void
  selectedTaskId: string | null
  tasks: Task[]
}

const STATUS_COLUMNS: { key: TaskStatus; color: string }[] = [
  { color: '#9CA3AF', key: 'pending' },
  { color: '#3B82F6', key: 'in_progress' },
  { color: '#F59E0B', key: 'today' },
  { color: '#10B981', key: 'completed' },
  { color: '#6B7280', key: 'closed' },
]

const KANBAN_DROP_ID_PREFIX = 'kanban-status-'

function getStatusDropId(status: TaskStatus): string {
  return `${KANBAN_DROP_ID_PREFIX}${status}`
}

function getStatusFromDropId(id: string | number | undefined): TaskStatus | null {
  if (typeof id !== 'string' || !id.startsWith(KANBAN_DROP_ID_PREFIX)) return null
  const status = id.slice(KANBAN_DROP_ID_PREFIX.length)
  if (
    status === 'pending' ||
    status === 'in_progress' ||
    status === 'today' ||
    status === 'completed' ||
    status === 'closed'
  ) {
    return status
  }
  return null
}

interface KanbanTaskCardProps {
  allTags: Tag[]
  dateFormat: ReturnType<typeof useAppStore.getState>['dateFormat']
  onKeyMove: (e: React.KeyboardEvent, task: Task) => void
  onSelectTask: (id: string | null) => void
  onToggleTask: (id: string, isCompleted: boolean) => void
  selectedTaskId: string | null
  t: ReturnType<typeof useTranslation<'common'>>['t']
  task: Task
  timeFormat: ReturnType<typeof useAppStore.getState>['timeFormat']
}

interface KanbanTaskCardContentProps extends KanbanTaskCardProps {
  isDragging?: boolean
  isOverlay?: boolean
}

function KanbanTaskCardContent({
  allTags,
  dateFormat,
  onKeyMove,
  onSelectTask,
  onToggleTask,
  selectedTaskId,
  t,
  task,
  timeFormat,
  isDragging = false,
  isOverlay = false,
}: KanbanTaskCardContentProps) {
  const taskTags = getTaskTags(task, allTags)
  const isDone = task.status === 'completed' || task.status === 'closed'

  return (
    <div
      onClick={() => onSelectTask(selectedTaskId === task.id ? null : task.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelectTask(selectedTaskId === task.id ? null : task.id)
        }
        onKeyMove(e, task)
      }}
      className={`bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
        selectedTaskId === task.id ? 'ring-2 ring-blue-500' : ''
      } ${isDone ? 'opacity-60' : ''} ${isDragging ? 'opacity-35' : ''} ${
        isOverlay ? 'shadow-xl ring-1 ring-black/5 dark:ring-white/10' : ''
      }`}
      title={t('tasks.views.kanban_hint')}
    >
      <div className="flex items-start gap-2">
        <CheckNow
          checked={task.isCompleted}
          hasSteps={!!(task.steps && task.steps.length > 0)}
          color1="var(--theme-color)"
          color2="var(--theme-bg-70)"
          className="mt-0.5 shrink-0"
          onClick={(e) => {
            e.stopPropagation()
            onToggleTask(task.id, task.isCompleted)
          }}
        />
        <div className="flex-1 min-w-0">
          <h4
            className={`text-sm truncate ${
              isDone ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-gray-100'
            }`}
          >
            {task.title}
          </h4>
          {task.description && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">{task.description}</p>
          )}
          {task.dueDate && (
            <div className="flex items-center gap-1 mt-2 text-xs text-gray-400 dark:text-gray-500">
              <span>{formatDisplayDate(task.dueDate, dateFormat, t)}</span>
              {task.dueTime && <span>{formatTime(task.dueTime, timeFormat)}</span>}
            </div>
          )}
          {taskTags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {taskTags.slice(0, 3).map((tag) => (
                <span
                  key={tag.id}
                  className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs text-white"
                  style={{ backgroundColor: tag.color || '#3B82F6' }}
                >
                  {tag.emoji && <span className="mr-0.5">{tag.emoji}</span>}
                  {tag.name}
                </span>
              ))}
              {taskTags.length > 3 && (
                <span className="text-xs text-gray-400 dark:text-gray-500">+{taskTags.length - 3}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function KanbanTaskCard(props: KanbanTaskCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: props.task.id })

  return (
    <div ref={setNodeRef} {...attributes} {...listeners}>
      <KanbanTaskCardContent {...props} isDragging={isDragging} />
    </div>
  )
}

interface KanbanColumnProps {
  allTags: Tag[]
  col: { key: TaskStatus; color: string }
  dateFormat: KanbanTaskCardProps['dateFormat']
  onKeyMove: (e: React.KeyboardEvent, task: Task) => void
  onSelectTask: (id: string | null) => void
  onToggleTask: (id: string, isCompleted: boolean) => void
  selectedTaskId: string | null
  t: KanbanTaskCardProps['t']
  tasks: Task[]
  timeFormat: KanbanTaskCardProps['timeFormat']
}

function KanbanColumn({
  allTags,
  col,
  dateFormat,
  onKeyMove,
  onSelectTask,
  onToggleTask,
  selectedTaskId,
  t,
  tasks,
  timeFormat,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: getStatusDropId(col.key) })

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col rounded-sm overflow-hidden transition-all ${
        isOver
          ? 'bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-300 dark:ring-blue-700'
          : 'bg-gray-50 dark:bg-gray-900'
      }`}
    >
      <div
        className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
        style={{ backgroundColor: col.color }}
      >
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-sm text-gray-900 dark:text-gray-100">{t(`tasks.status.${col.key}`)}</h3>
          <span className="ml-auto text-xs text-gray-400 dark:text-gray-500 bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full">
            {tasks.length}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-2 space-y-2" style={{ backgroundColor: `hsl(from ${col.color} h s 98)` }}>
        {tasks.length === 0 && (
          <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-8">{t('tasks.views.empty_column')}</p>
        )}
        {tasks.map((task) => (
          <KanbanTaskCard
            allTags={allTags}
            dateFormat={dateFormat}
            key={task.id}
            onKeyMove={onKeyMove}
            onSelectTask={onSelectTask}
            onToggleTask={onToggleTask}
            selectedTaskId={selectedTaskId}
            t={t}
            task={task}
            timeFormat={timeFormat}
          />
        ))}
      </div>
    </div>
  )
}

export default function KanbanView({
  tasks,
  allTags,
  selectedTaskId,
  onSelectTask,
  onToggleTask,
  onUpdateTask,
}: KanbanViewProps) {
  const { t } = useTranslation('common')
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))
  const dateFormat = useAppStore((s) => s.dateFormat)
  const timeFormat = useAppStore((s) => s.timeFormat)

  const columns = useMemo(() => {
    const cols: Map<TaskStatus, Task[]> = new Map()
    STATUS_COLUMNS.forEach((s) => {
      cols.set(s.key, [])
    })
    tasks.forEach((task) => {
      const status = task.status || 'pending'
      const col = cols.get(status)
      if (col) col.push(task)
    })
    cols.forEach((col) => {
      col.sort((a, b) => {
        if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate)
        if (a.dueDate) return -1
        if (b.dueDate) return 1
        return 0
      })
    })
    return cols
  }, [tasks])

  const activeTask = activeTaskId ? tasks.find((task) => task.id === activeTaskId) : null

  const handleDragStart = (event: DragStartEvent) => {
    setActiveTaskId(String(event.active.id))
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTaskId(null)
    const taskId = String(event.active.id)
    const targetStatus = getStatusFromDropId(event.over?.id)
    if (!targetStatus) return

    const task = tasks.find((tk) => tk.id === taskId)
    if (task && (task.status || 'pending') !== targetStatus) {
      onUpdateTask(taskId, { status: targetStatus })
    }
  }

  const handleDragCancel = () => {
    setActiveTaskId(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent, task: Task) => {
    const currentIdx = STATUS_COLUMNS.findIndex((s) => s.key === (task.status || 'pending'))
    if (e.key === 'ArrowRight' && currentIdx < STATUS_COLUMNS.length - 1) {
      onUpdateTask(task.id, { status: STATUS_COLUMNS[currentIdx + 1].key })
    }
    if (e.key === 'ArrowLeft' && currentIdx > 0) {
      onUpdateTask(task.id, { status: STATUS_COLUMNS[currentIdx - 1].key })
    }
  }

  if (tasks.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
        <p className="text-lg">{t('tasks.no_tasks')}</p>
        <p className="text-sm mt-2">{t('tasks.create_first')}</p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto p-6">
      <DndContext
        onDragCancel={handleDragCancel}
        onDragEnd={handleDragEnd}
        onDragStart={handleDragStart}
        sensors={sensors}
      >
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 h-full min-h-0">
          {STATUS_COLUMNS.map((col) => (
            <KanbanColumn
              allTags={allTags}
              col={col}
              dateFormat={dateFormat}
              key={col.key}
              onKeyMove={handleKeyDown}
              onSelectTask={onSelectTask}
              onToggleTask={onToggleTask}
              selectedTaskId={selectedTaskId}
              t={t}
              tasks={columns.get(col.key) || []}
              timeFormat={timeFormat}
            />
          ))}
        </div>
        <DragOverlay dropAnimation={null}>
          {activeTask && (
            <div className="w-[min(320px,calc(100vw-2rem))]">
              <KanbanTaskCardContent
                allTags={allTags}
                dateFormat={dateFormat}
                isOverlay
                onKeyMove={handleKeyDown}
                onSelectTask={onSelectTask}
                onToggleTask={onToggleTask}
                selectedTaskId={selectedTaskId}
                t={t}
                task={activeTask}
                timeFormat={timeFormat}
              />
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
