import { type MouseEvent, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { PRIORITY_COLORS } from '@/lib/constants'
import { isTaskAbandoned, isTaskCompletedForFilter } from '@/lib/tasks/taskStatus'
import { useLists, useSteps } from '@/queries/useTaskQueries'
import type { Step as StepType, Task } from '@/types/task'
import CheckNow from '%/common/CheckNow'

function calcStepsProgress(steps: StepType[]): { completed: number; total: number } | null {
  if (steps.length === 0) {
    return null
  }
  const completed = steps.filter((s) => s.isCompleted).length
  return { completed, total: steps.length }
}

export function shouldSelectTaskFromMouseDown(e: Pick<MouseEvent, 'button' | 'ctrlKey'>): boolean {
  return e.button === 0 && !e.ctrlKey
}

export default function TaskRow({
  task,
  isSelected,
  onSelect,
  onToggle,
  onContextMenu,
  progressStyle = 'bar',
}: {
  task: Task
  isSelected: boolean
  onSelect: () => void
  onToggle: () => void
  onContextMenu?: (e: MouseEvent) => void
  progressStyle?: 'bar' | 'circle' | 'pie'
}) {
  const { t } = useTranslation('common')
  const { data: allLists = [] } = useLists()
  const { data: taskSteps = [] } = useSteps(task.id)
  const rowProgress = useMemo(() => calcStepsProgress(taskSteps), [taskSteps])
  const listColor = useMemo(() => {
    if (!task.listId) return undefined
    return allLists.find((l) => l.id === task.listId)?.color
  }, [allLists, task.listId])

  const percent = rowProgress ? Math.round((rowProgress.completed / rowProgress.total) * 100) : 0
  const isComplete = rowProgress && rowProgress.completed === rowProgress.total

  const renderProgress = () => {
    if (!rowProgress || rowProgress.total === 0) {
      return null
    }

    if (progressStyle === 'circle') {
      const r = 7
      const circumference = 2 * Math.PI * r
      const offset = circumference - (percent / 100) * circumference
      return (
        <svg className="shrink-0" height="18" width="18">
          <title>progress circle</title>
          <circle
            className="text-theme-200 dark:text-theme-600"
            cx="9"
            cy="9"
            fill="none"
            r={r}
            stroke="currentColor"
            strokeWidth="2"
          />
          <circle
            className="transition-all"
            cx="9"
            cy="9"
            fill="none"
            r={r}
            stroke={isComplete ? 'var(--theme-color)' : 'var(--theme-bg-70)'}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            strokeWidth="2"
            transform="rotate(-90 9 9)"
          />
        </svg>
      )
    }

    if (progressStyle === 'pie') {
      const r = 7
      const cx = 9
      const cy = 9
      if (percent >= 100) {
        return (
          <svg className="shrink-0" height="18" width="18">
            <title>progress pie</title>
            <circle cx={cx} cy={cy} fill="var(--theme-color)" r={r} />
          </svg>
        )
      }
      if (percent <= 0) {
        return (
          <svg className="shrink-0" height="18" width="18">
            <title>progress bar</title>
            <circle
              className="text-theme-200 dark:text-theme-600"
              cx={cx}
              cy={cy}
              fill="none"
              r={r}
              stroke="currentColor"
              strokeWidth="2"
            />
          </svg>
        )
      }
      const angle = (percent / 100) * 360
      const rad = (angle - 90) * (Math.PI / 180)
      const endX = cx + r * Math.cos(rad)
      const endY = cy + r * Math.sin(rad)
      const largeArc = angle > 180 ? 1 : 0
      const pathD = `M${cx},${cy} L${cx},${cy - r} A${r},${r} 0 ${largeArc},1 ${endX},${endY} Z`
      return (
        <svg className="shrink-0" height="18" width="18">
          <title>progress empty</title>
          <circle
            className="text-theme-200 dark:text-theme-600"
            cx={cx}
            cy={cy}
            fill="none"
            r={r}
            stroke="currentColor"
            strokeWidth="2"
          />
          <path d={pathD} fill={isComplete ? 'var(--theme-color)' : 'var(--theme-bg-70)'} />
        </svg>
      )
    }

    return (
      <div className="w-10 h-1.5 bg-theme-200 dark:bg-theme-600 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{
            backgroundColor: isComplete ? 'var(--theme-color)' : 'var(--theme-bg-70)',
            width: `${percent}%`,
          }}
        />
      </div>
    )
  }

  return (
    <div
      className={`group flex items-center gap-3 px-2 py-2 rounded-md transition-shadow cursor-pointer ${
        isSelected ? 'bg-theme-100/30 dark:bg-theme-800/30' : ''
      }`}
      onContextMenu={(e) => {
        e.preventDefault()
        onContextMenu?.(e)
      }}
      onMouseDown={(e) => {
        if (shouldSelectTaskFromMouseDown(e)) {
          onSelect()
        }
      }}
    >
      <CheckNow
        abandoned={isTaskAbandoned(task)}
        checked={task.isCompleted}
        className="shrink-0"
        color1={listColor || 'var(--theme-color)'}
        color2={task.priority > 0 ? PRIORITY_COLORS[task.priority] : undefined}
        hasSteps={!!(rowProgress && rowProgress.total > 0)}
        onClick={(e) => {
          e.stopPropagation()
          onToggle()
        }}
      />
      <span
        className={`flex-1 truncate text-sm ${
          isTaskCompletedForFilter(task)
            ? 'line-through text-theme-700 dark:text-theme-200'
            : 'text-theme-900 dark:text-theme-100'
        }`}
      >
        {task.title}
      </span>
      <div
        className="flex items-center gap-1 shrink-0"
        title={`${rowProgress?.completed ?? 0}/${rowProgress?.total ?? 0}`}
      >
        {renderProgress()}
      </div>
      {task.dueDate &&
        (() => {
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          const due = new Date(`${task.dueDate}T00:00:00`)
          const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
          const isOverdue = diffDays < 0
          const absDays = Math.abs(diffDays)
          const unit = t('dashboard.days_left')
          const label = diffDays === 0 ? t('tasks.today') : isOverdue ? `-${absDays}${unit}` : `+${absDays}${unit}`
          return (
            <span
              className={`text-xs font-medium shrink-0 ${isOverdue ? 'text-red-500 dark:text-red-500' : 'text-green-500 dark:text-green-500'}`}
            >
              {label}
            </span>
          )
        })()}
    </div>
  )
}
