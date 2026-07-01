import { useAppStore } from '&/useAppStore'
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
import { PRIORITY } from '@/lib/constants'
import { formatDisplayDate, formatTime } from '@/lib/formatUtils'
import { getLocalToday } from '@/lib/taskHelpers'
import type { Tag } from '@/types/tag'
import type { Priority, Task, UpdateTaskParams } from '@/types/task'
import CheckNow from '%/common/CheckNow'

interface EisenhowerMatrixViewProps {
  allTags: Tag[]
  onSelectTask: (id: string | null) => void
  onToggleTask: (id: string, isCompleted: boolean) => void
  onUpdateTask: (id: string, params: Partial<UpdateTaskParams>) => void
  selectedTaskId: string | null
  tasks: Task[]
}

type Quadrant = 'q1' | 'q2' | 'q3' | 'q4'

const QUADRANT_DROP_ID_PREFIX = 'matrix-quadrant-'

function classifyTask(task: Task): Quadrant {
  const priority = task.priority
  if (priority >= 7) return 'q1'
  if (priority >= 4) return 'q2'
  if (priority >= 1) return 'q3'
  return 'q4'
}

function getPriorityForQuadrant(quadrant: Quadrant): Priority {
  switch (quadrant) {
    case 'q1':
      return PRIORITY.HIGH as Priority
    case 'q2':
      return PRIORITY.MEDIUM as Priority
    case 'q3':
      return PRIORITY.LOW as Priority
    case 'q4':
      return PRIORITY.NONE as Priority
  }
}

function getQuadrantDropId(quadrant: Quadrant): string {
  return `${QUADRANT_DROP_ID_PREFIX}${quadrant}`
}

function getQuadrantFromDropId(id: string | number | undefined): Quadrant | null {
  if (typeof id !== 'string' || !id.startsWith(QUADRANT_DROP_ID_PREFIX)) return null
  const quadrant = id.slice(QUADRANT_DROP_ID_PREFIX.length)
  if (quadrant === 'q1' || quadrant === 'q2' || quadrant === 'q3' || quadrant === 'q4') return quadrant
  return null
}

interface QuadrantConfig {
  accentColor: string
  bodyBg: string
  bodyBgDark: string
  headerBg: string
  headerText: string
  hintKey: string
  key: Quadrant
  labelKey: string
  overBodyBg: string
  overBodyBgDark: string
  ringColor: string
}

const QUADRANT_CONFIGS: QuadrantConfig[] = [
  {
    accentColor: '#EF4444',
    bodyBg: 'bg-red-50/50',
    bodyBgDark: 'dark:bg-red-950/20',
    headerBg: 'bg-red-500',
    headerText: 'text-white',
    hintKey: 'tasks.matrix.do_first_hint',
    key: 'q1',
    labelKey: 'tasks.matrix.do_first',
    overBodyBg: 'bg-red-100',
    overBodyBgDark: 'dark:bg-red-900',
    ringColor: 'ring-red-300 dark:ring-red-700',
  },
  {
    accentColor: '#3B82F6',
    bodyBg: 'bg-sky-50/50',
    bodyBgDark: 'dark:bg-sky-950/20',
    headerBg: 'bg-sky-500',
    headerText: 'text-white',
    hintKey: 'tasks.matrix.schedule_hint',
    key: 'q2',
    labelKey: 'tasks.matrix.schedule',
    overBodyBg: 'bg-sky-100',
    overBodyBgDark: 'dark:bg-sky-900',
    ringColor: 'ring-sky-300 dark:ring-sky-700',
  },
  {
    accentColor: '#F59E0B',
    bodyBg: 'bg-yellow-50/50',
    bodyBgDark: 'dark:bg-yellow-950/20',
    headerBg: 'bg-yellow-500',
    headerText: 'text-white',
    hintKey: 'tasks.matrix.delegate_hint',
    key: 'q3',
    labelKey: 'tasks.matrix.delegate',
    overBodyBg: 'bg-yellow-100',
    overBodyBgDark: 'dark:bg-yellow-900',
    ringColor: 'ring-yellow-300 dark:ring-yellow-700',
  },
  {
    accentColor: '#9CA3AF',
    bodyBg: 'bg-slate-50/50',
    bodyBgDark: 'dark:bg-slate-900/40',
    headerBg: 'bg-slate-400',
    headerText: 'text-white',
    hintKey: 'tasks.matrix.eliminate_hint',
    key: 'q4',
    labelKey: 'tasks.matrix.eliminate',
    overBodyBg: 'bg-slate-100',
    overBodyBgDark: 'dark:bg-slate-900',
    ringColor: 'ring-slate-300 dark:ring-slate-600',
  },
]

interface MatrixTaskCardProps {
  dateFormat: ReturnType<typeof useAppStore.getState>['dateFormat']
  onSelectTask: (id: string | null) => void
  onToggleTask: (id: string, isCompleted: boolean) => void
  selectedTaskId: string | null
  t: ReturnType<typeof useTranslation<'common'>>['t']
  task: Task
  timeFormat: ReturnType<typeof useAppStore.getState>['timeFormat']
  todayStr: string
}

interface MatrixTaskCardContentProps extends MatrixTaskCardProps {
  isDragging?: boolean
  isOverlay?: boolean
}

function MatrixTaskCardContent({
  dateFormat,
  onSelectTask,
  onToggleTask,
  selectedTaskId,
  task,
  t,
  timeFormat,
  todayStr,
  isDragging = false,
  isOverlay = false,
}: MatrixTaskCardContentProps) {
  return (
    <div
      onClick={() => onSelectTask(selectedTaskId === task.id ? null : task.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelectTask(selectedTaskId === task.id ? null : task.id)
        }
      }}
      className={`rounded-md shadow-sm cursor-grab active:cursor-grabbing transition-color focus:outline-none focus-visible:bg-theme-100/50 ${
        selectedTaskId === task.id ? 'bg-theme-100' : 'bg-theme-50/50 border-theme-50'
      } ${isDragging ? 'opacity-80' : ''} ${isOverlay ? 'ring-1 ring-black/5 dark:ring-white/10' : ''}`}
    >
      <div className="flex items-start gap-2 p-2">
        <CheckNow
          checked={false}
          hasSteps={!!(task.steps && task.steps.length > 0)}
          color1="var(--theme-color)"
          color2="var(--theme-bg-70)"
          className="mt-0.5 shrink-0"
          onClick={(e) => {
            e.stopPropagation()
            onToggleTask(task.id, task.isCompleted)
          }}
        />
        <div className="flex flex-row flex-1 min-w-0">
          <h4 className="flex-1 text-sm text-theme-900 dark:text-theme-100 truncate">{task.title}</h4>
          <div className="items-center gap-2 mt-1.5 flex-wrap">
            {task.dueDate && (
              <span
                className={`text-xs flex items-center gap-1 ${
                  isOverdue(task.dueDate, todayStr)
                    ? 'text-red-500 dark:text-red-400 font-medium'
                    : 'text-gray-400 dark:text-gray-500'
                }`}
              >
                {formatDisplayDate(task.dueDate, dateFormat, t)}
                {task.dueTime && <span>{formatTime(task.dueTime, timeFormat)}</span>}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function MatrixTaskCard(props: MatrixTaskCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: props.task.id })

  return (
    <div ref={setNodeRef} {...attributes} {...listeners}>
      <MatrixTaskCardContent {...props} isDragging={isDragging} />
    </div>
  )
}

interface QuadrantPanelProps {
  allTags: Tag[]
  config: QuadrantConfig
  dateFormat: MatrixTaskCardProps['dateFormat']
  onSelectTask: (id: string | null) => void
  onToggleTask: (id: string, isCompleted: boolean) => void
  qTasks: Task[]
  selectedTaskId: string | null
  t: MatrixTaskCardProps['t']
  timeFormat: MatrixTaskCardProps['timeFormat']
  todayStr: string
}

function QuadrantPanel({
  config,
  dateFormat,
  onSelectTask,
  onToggleTask,
  qTasks,
  selectedTaskId,
  t,
  timeFormat,
  todayStr,
}: QuadrantPanelProps) {
  const { setNodeRef, isOver } = useDroppable({ id: getQuadrantDropId(config.key) })

  return (
    <div
      className={`min-h-0 flex flex-col rounded-md overflow-hidden transition-all ${config.bodyBg} ${config.bodyBgDark} ${
        isOver ? ` ring-2 ${config.ringColor} ${config.overBodyBg} ${config.overBodyBgDark}` : ''
      }`}
    >
      {/* Quadrant header */}
      <div className={`${config.headerBg} ${config.headerText} shrink-0 px-4 py-2.5 flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm">{t(config.labelKey)}</h3>
          <span className="text-xs opacity-80 bg-white/20 px-2 py-0.5 rounded-full">{qTasks.length}</span>
        </div>
        <span className="text-xs opacity-75 hidden sm:inline">{t(config.hintKey)}</span>
      </div>

      {/* Quadrant body */}
      <div ref={setNodeRef} className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1.5">
        {qTasks.length === 0 && (
          <p className="text-xs text-theme-800 dark:text-theme-200 text-center py-8 italic">
            {t('tasks.views.empty_column')}
          </p>
        )}
        {qTasks.map((task) => (
          <MatrixTaskCard
            dateFormat={dateFormat}
            key={task.id}
            onSelectTask={onSelectTask}
            onToggleTask={onToggleTask}
            selectedTaskId={selectedTaskId}
            task={task}
            t={t}
            timeFormat={timeFormat}
            todayStr={todayStr}
          />
        ))}
      </div>
    </div>
  )
}

export default function EisenhowerMatrixView({
  tasks,
  allTags,
  selectedTaskId,
  onSelectTask,
  onToggleTask,
  onUpdateTask,
}: EisenhowerMatrixViewProps) {
  const { t } = useTranslation('common')
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))
  const dateFormat = useAppStore((s) => s.dateFormat)
  const timeFormat = useAppStore((s) => s.timeFormat)

  const todayStr = getLocalToday()

  // Classify tasks into quadrants
  const quadrants = useMemo(() => {
    const map = new Map<Quadrant, Task[]>()
    map.set('q1', [])
    map.set('q2', [])
    map.set('q3', [])
    map.set('q4', [])

    tasks.forEach((task) => {
      if (task.isCompleted) return // Hide completed tasks in matrix
      const q = classifyTask(task)
      map.get(q)?.push(task)
    })

    // Sort: by due date ascending within each quadrant
    map.forEach((list) => {
      list.sort((a, b) => {
        if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate)
        if (a.dueDate) return -1
        if (b.dueDate) return 1
        return b.priority - a.priority // Higher priority first when no dates
      })
    })

    return map
  }, [tasks])

  const activeTask = activeTaskId ? tasks.find((task) => task.id === activeTaskId) : null

  const handleDragStart = (event: DragStartEvent) => {
    setActiveTaskId(String(event.active.id))
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTaskId(null)
    const taskId = String(event.active.id)
    const targetQuadrant = getQuadrantFromDropId(event.over?.id)
    if (!targetQuadrant) return

    const task = tasks.find((tk) => tk.id === taskId)
    if (!task) return

    const targetPriority = getPriorityForQuadrant(targetQuadrant)
    if (task.priority === targetPriority) return

    onUpdateTask(taskId, { priority: targetPriority })
  }

  const handleDragCancel = () => {
    setActiveTaskId(null)
  }

  // Empty state
  if (tasks.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
        <p className="text-lg">{t('tasks.no_tasks')}</p>
        <p className="text-sm mt-2">{t('tasks.create_first')}</p>
      </div>
    )
  }

  return (
    <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
      <DndContext
        onDragCancel={handleDragCancel}
        onDragEnd={handleDragEnd}
        onDragStart={handleDragStart}
        sensors={sensors}
      >
        <div className="flex-1 min-h-0 grid sm:grid-cols-1 md:grid-cols-2 sm:grid-rows-4 md:grid-rows-2 sm:gap-1 md:gap-2 p-2">
          {QUADRANT_CONFIGS.map((config) => (
            <QuadrantPanel
              allTags={allTags}
              config={config}
              dateFormat={dateFormat}
              key={config.key}
              onSelectTask={onSelectTask}
              onToggleTask={onToggleTask}
              qTasks={quadrants.get(config.key) || []}
              selectedTaskId={selectedTaskId}
              t={t}
              timeFormat={timeFormat}
              todayStr={todayStr}
            />
          ))}
        </div>
        <DragOverlay dropAnimation={null}>
          {activeTask && (
            <div>
              <MatrixTaskCardContent
                dateFormat={dateFormat}
                isOverlay
                onSelectTask={onSelectTask}
                onToggleTask={onToggleTask}
                selectedTaskId={selectedTaskId}
                task={activeTask}
                t={t}
                timeFormat={timeFormat}
                todayStr={todayStr}
              />
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  )
}

// ==================== Helpers ====================

function isOverdue(dueDateStr: string, todayStr: string): boolean {
  return dueDateStr < todayStr
}
