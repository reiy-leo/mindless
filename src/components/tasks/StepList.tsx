import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  type Modifier,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Bars3Icon, CalendarIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline'
import { listen } from '@tauri-apps/api/event'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import MilkdownStepEditor from '@/components/MilkdownStepEditor'
import { DATE_PICKER_LABEL, showOverlay } from '@/lib/overlayManager'
import { getScreenRect } from '@/lib/screenRect'
import { useCalendarEvents } from '@/queries/useTaskQueries'

const restrictToVerticalAxis: Modifier = ({ transform }) => ({
  ...transform,
  x: 0,
})

interface Step {
  description: string
  dueDate?: string
  dueTime?: string
  id: string
  isCompleted: boolean
  sortOrder: number
}

interface StepListProps {
  onAdd: (description: string) => void
  onDelete: (id: string) => void
  onInsertAt?: (description: string, afterStepId: string | null, beforeStepId: string | null) => void
  onReorder?: (items: { id: string; sortOrder: number }[]) => void
  onToggle: (id: string) => void
  onUpdateDescription: (id: string, description: string) => void
  onUpdateDueDate: (id: string, dueDate?: string) => void
  onUpdateDueTime: (id: string, dueTime?: string) => void
  steps: Step[]
  taskDueDate?: string
}

function formatStepDate(date?: string, time?: string, taskDueDate?: string): string {
  if (!date) return ''
  const parts = date.split('-')
  if (parts.length !== 3) return ''
  const [, m, d] = parts
  if (date === taskDueDate && time) return time
  if (date === taskDueDate) return `${m}-${d}`
  return time ? `${m}-${d} ${time}` : `${m}-${d}`
}

function InlineAddInput({
  placeholder,
  onCancel,
  onSubmit,
}: {
  placeholder: string
  onCancel: () => void
  onSubmit: (description: string) => void
}) {
  const [value, setValue] = useState('')
  const submittedRef = useRef(false)

  const handleSubmit = (desc: string) => {
    if (submittedRef.current) return
    submittedRef.current = true
    onSubmit(desc)
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (value.trim()) {
        handleSubmit(value.trim())
        setValue('')
      }
    } else if (e.key === 'Escape') {
      onCancel()
    }
  }

  const handleBlur = () => {
    if (!submittedRef.current && value.trim()) handleSubmit(value.trim())
    else if (!submittedRef.current) onCancel()
  }

  return (
    <div className="flex gap-0">
      <div className="flex items-start justify-center pe-2 py-1">
        <input
          className="mt-2 w-4 h-4 rounded text-blue-500 focus:ring-blue-500 flex-shrink-0"
          style={{
            accentColor: `var(--theme-color)`,
          }}
          type="checkbox"
        />
      </div>
      <div className="flex-1 px-1 py-1">
        <MilkdownStepEditor
          markdown={value}
          onBlur={handleBlur}
          onChange={setValue}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
        />
      </div>
    </div>
  )
}

function StepItem({
  step,
  taskDueDate,
  onToggle,
  onDelete,
  onUpdateDescription,
  onDateClick,
  onInsertBelow,
  onInsertAbove,
}: StepItemProps & {
  taskDueDate?: string
  onDateClick: (e: React.MouseEvent) => void
  onInsertBelow?: () => void
  onInsertAbove?: () => void
}) {
  const { t } = useTranslation('common')
  const [description, setDescription] = useState(step.description)
  const isInternalUpdateRef = useRef(false)

  useEffect(() => {
    if (!isInternalUpdateRef.current) {
      setDescription(step.description)
    }
    isInternalUpdateRef.current = false
  }, [step.description])

  const handleSave = () => {
    const trimmed = description.trim()
    if (trimmed && trimmed !== step.description) {
      isInternalUpdateRef.current = true
      onUpdateDescription(trimmed)
    } else if (!trimmed) {
      setDescription(step.description)
    }
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && e.altKey && e.shiftKey) {
      e.preventDefault()
      handleSave()
      onInsertAbove?.()
    } else if (e.key === 'Enter' && e.altKey) {
      e.preventDefault()
      handleSave()
      onInsertBelow?.()
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSave()
    } else if (e.key === 'Escape') {
      setDescription(step.description)
    }
  }

  const dateDisplay = formatStepDate(step.dueDate, step.dueTime, taskDueDate)

  return (
    <div className="flex items-start justify-center gap-2 py-1.5 group">
      {/* Checkbox */}
      <input
        checked={step.isCompleted}
        className="mt-2 w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-500 focus:ring-blue-500 flex-shrink-0"
        onChange={onToggle}
        style={{
          accentColor: `var(--theme-color)`,
        }}
        type="checkbox"
      />

      {/* Description - always editable */}
      <div
        className={`flex-1 px-1 py-0.5 ${step.isCompleted ? 'opacity-30 text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-gray-100'}`}
      >
        <MilkdownStepEditor
          markdown={description}
          onBlur={handleSave}
          onChange={setDescription}
          onKeyDown={handleKeyDown}
        />
      </div>

      {/* Date button - float right */}
      <div className="relative flex-shrink-0">
        <button
          className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs transition-colors ${
            dateDisplay
              ? 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              : 'text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
          onClick={onDateClick}
          type="button"
        >
          <CalendarIcon className="w-3 h-3" />
          {dateDisplay && <span>{dateDisplay}</span>}
        </button>
      </div>

      {/* Delete */}
      <button
        className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all flex-shrink-0"
        onClick={onDelete}
        title={t('common.delete')}
        type="button"
      >
        <TrashIcon className="w-3.5 h-3.5 text-red-400" />
      </button>
    </div>
  )
}

function SortableStepItem({
  step,
  taskDueDate,
  onToggle,
  onDelete,
  onUpdateDescription,
  onDateClick,
  onInsertBelow,
  onInsertAbove,
}: StepItemProps & {
  taskDueDate?: string
  onDateClick: (e: React.MouseEvent) => void
  onInsertBelow?: () => void
  onInsertAbove?: () => void
}) {
  const { t } = useTranslation('common')
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: step.id })

  const style = {
    opacity: isDragging ? 0.5 : 1,
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : ('auto' as const),
  }

  return (
    <div className="flex items-start gap-1 group/sort" ref={setNodeRef} style={style}>
      <button
        {...attributes}
        {...listeners}
        className="flex items-center justify-center h-full rounded opacity-0 group-hover/sort:opacity-100 transition-opacity cursor-grab active:cursor-grabbing flex-shrink-0 touch-none absolute -left-4"
        onClick={(e) => e.stopPropagation()}
        title={t('tasks.views.drag_to_reorder')}
      >
        <Bars3Icon className="w-3 h-3 text-gray-400 dark:text-gray-500" />
      </button>
      <div className="flex-1">
        <StepItem
          onDateClick={onDateClick}
          onDelete={onDelete}
          onInsertAbove={onInsertAbove}
          onInsertBelow={onInsertBelow}
          onToggle={onToggle}
          onUpdateDescription={onUpdateDescription}
          step={step}
          taskDueDate={taskDueDate}
        />
      </div>
    </div>
  )
}

export default function StepList({
  steps,
  taskDueDate,
  onAdd,
  onToggle,
  onDelete,
  onUpdateDescription,
  onUpdateDueDate,
  onUpdateDueTime,
  onReorder,
  onInsertAt,
}: Omit<StepListProps, 'taskId'>) {
  const { t } = useTranslation('common')
  const [showAddInput, setShowAddInput] = useState(false)
  const editingStepIdRef = useRef<string | null>(null)
  const { data: calendarEvents = [] } = useCalendarEvents()

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  // Single listener for date picker overlay results
  useEffect(() => {
    let unlistenFn: (() => void) | null = null
    listen<{ date?: string; time?: string }>('date-picker-overlay:result', (e) => {
      const stepId = editingStepIdRef.current
      if (!stepId) return
      onUpdateDueDate(stepId, e.payload.date)
      onUpdateDueTime(stepId, e.payload.time)
      editingStepIdRef.current = null
    }).then((fn) => {
      unlistenFn = fn
    })
    return () => {
      unlistenFn?.()
    }
  }, [onUpdateDueDate, onUpdateDueTime])

  const handleStepDateClick = async (stepId: string, e: React.MouseEvent) => {
    const step = steps.find((s) => s.id === stepId)
    if (!step) return
    editingStepIdRef.current = stepId
    const rect = await getScreenRect(e.currentTarget as HTMLElement)
    await showOverlay(DATE_PICKER_LABEL, rect.x, rect.y + rect.height + 4, {
      anchorH: rect.height,
      anchorX: rect.x,
      anchorY: rect.y,
      date: step.dueDate || undefined,
      events: calendarEvents,
      time: step.dueTime || undefined,
    })
  }

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) return
      if (!onReorder) return

      const oldIndex = steps.findIndex((s) => s.id === active.id)
      const newIndex = steps.findIndex((s) => s.id === over.id)
      if (oldIndex === -1 || newIndex === -1) return

      const reordered = [...steps]
      const [moved] = reordered.splice(oldIndex, 1)
      reordered.splice(newIndex, 0, moved)

      const items = reordered.map((s, idx) => ({ id: s.id, sortOrder: idx }))
      onReorder(items)
    },
    [steps, onReorder],
  )

  const total = steps.length
  const completed = steps.filter((s) => s.isCompleted).length
  const reversedSteps = useMemo(() => [...steps].reverse(), [steps])

  const makeInsertBelow = (stepId: string) => {
    if (!onInsertAt) return undefined
    return () => {
      const idx = steps.findIndex((s) => s.id === stepId)
      const prevStep = idx > 0 ? steps[idx - 1] : null
      onInsertAt('', prevStep ? prevStep.id : null, stepId)
    }
  }

  const makeInsertAbove = (stepId: string) => {
    if (!onInsertAt) return undefined
    return () => {
      const idx = steps.findIndex((s) => s.id === stepId)
      const nextStep = idx < steps.length - 1 ? steps[idx + 1] : null
      onInsertAt('', stepId, nextStep ? nextStep.id : null)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {t('tasks.steps.title')}
          {total > 0 && (
            <span className="ml-2 text-xs font-normal text-gray-400 dark:text-gray-500">
              {completed}/{total}
            </span>
          )}
        </h3>
        <button
          className="text-xs text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
          onClick={() => setShowAddInput(true)}
          type="button"
        >
          <PlusIcon className="w-4 h-4" />
        </button>
      </div>

      {showAddInput && (
        <InlineAddInput
          onCancel={() => setShowAddInput(false)}
          onSubmit={(desc) => {
            onAdd(desc)
            setShowAddInput(false)
          }}
          placeholder={t('tasks.steps.description_placeholder')}
        />
      )}

      {onReorder ? (
        <DndContext
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis]}
          onDragEnd={handleDragEnd}
          sensors={sensors}
        >
          <SortableContext items={reversedSteps.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            <div className="relative">
              {reversedSteps.map((step) => (
                <SortableStepItem
                  key={step.id}
                  onDateClick={(e) => handleStepDateClick(step.id, e)}
                  onDelete={() => onDelete(step.id)}
                  onInsertAbove={makeInsertAbove(step.id)}
                  onInsertBelow={makeInsertBelow(step.id)}
                  onToggle={() => onToggle(step.id)}
                  onUpdateDescription={(desc) => onUpdateDescription(step.id, desc)}
                  step={step}
                  taskDueDate={taskDueDate}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        reversedSteps.map((step) => (
          <StepItem
            key={step.id}
            onDateClick={(e) => handleStepDateClick(step.id, e)}
            onDelete={() => onDelete(step.id)}
            onInsertAbove={makeInsertAbove(step.id)}
            onInsertBelow={makeInsertBelow(step.id)}
            onToggle={() => onToggle(step.id)}
            onUpdateDescription={(desc) => onUpdateDescription(step.id, desc)}
            step={step}
            taskDueDate={taskDueDate}
          />
        ))
      )}
    </div>
  )
}

interface StepItemProps {
  onDelete: () => void
  onToggle: () => void
  onUpdateDescription: (description: string) => void
  step: Step
}
