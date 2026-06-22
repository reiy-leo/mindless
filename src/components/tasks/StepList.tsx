import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { PlusIcon, TrashIcon, CalendarIcon, Bars3Icon } from '@heroicons/react/24/outline';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent, type Modifier,
} from '@dnd-kit/core';
import {
  SortableContext, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { listen } from '@tauri-apps/api/event';
import { showOverlay, DATE_PICKER_LABEL } from '@/lib/overlayManager';
import { getScreenRect } from '@/lib/screenRect';
import { useCalendarEvents } from '@/queries/useTaskQueries';
import MilkdownStepEditor from '@/components/MilkdownStepEditor';

const restrictToVerticalAxis: Modifier = ({ transform }) => ({
  ...transform,
  x: 0,
});

interface Step {
  id: string;
  description: string;
  dueDate?: string;
  dueTime?: string;
  isCompleted: boolean;
  sortOrder: number;
}

interface StepListProps {
  steps: Step[];
  taskDueDate?: string;
  onAdd: (description: string) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdateDescription: (id: string, description: string) => void;
  onUpdateDueDate: (id: string, dueDate?: string) => void;
  onUpdateDueTime: (id: string, dueTime?: string) => void;
  onReorder?: (items: { id: string; sortOrder: number }[]) => void;
}

function formatStepDate(date?: string, time?: string, taskDueDate?: string): string {
  if (!date) return '';
  const parts = date.split('-');
  if (parts.length !== 3) return '';
  const [, m, d] = parts;
  if (date === taskDueDate && time) return time;
  if (date === taskDueDate) return `${m}-${d}`;
  return time ? `${m}-${d} ${time}` : `${m}-${d}`;
}

function InlineAddInput({
  placeholder,
  onCancel,
  onSubmit,
}: {
  placeholder: string;
  onCancel: () => void;
  onSubmit: (description: string) => void;
}) {
  const [value, setValue] = useState('');
  const submittedRef = useRef(false);

  const handleSubmit = (desc: string) => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    onSubmit(desc);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim()) {
        handleSubmit(value.trim());
        setValue('');
      }
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  const handleBlur = () => {
    if (!submittedRef.current && value.trim()) handleSubmit(value.trim());
    else if (!submittedRef.current) onCancel();
  };

  return (
    <div className="flex gap-0">
      <div className='flex items-start justify-center pe-2 py-1'>
        <input
          type="checkbox"
          className="mt-2 w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-500 focus:ring-blue-500 flex-shrink-0"
          style={{
            accentColor: `var(--theme-color)`
          }}
        />
      </div>
      <div className="flex-1 px-1 py-1">
        <MilkdownStepEditor
          markdown={value}
          onChange={setValue}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={placeholder}
        />
      </div>
    </div>
  );
}

function StepItem({
  step,
  taskDueDate,
  onToggle,
  onDelete,
  onUpdateDescription,
  onDateClick,
}: StepItemProps & { taskDueDate?: string; onDateClick: (e: React.MouseEvent) => void }) {
  const { t } = useTranslation('common');
  const [description, setDescription] = useState(step.description);
  const isInternalUpdateRef = useRef(false);

  useEffect(() => {
    if (!isInternalUpdateRef.current) {
      setDescription(step.description);
    }
    isInternalUpdateRef.current = false;
  }, [step.description]);

  const handleSave = () => {
    const trimmed = description.trim();
    if (trimmed && trimmed !== step.description) {
      isInternalUpdateRef.current = true;
      onUpdateDescription(trimmed);
    } else if (!trimmed) {
      setDescription(step.description);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      setDescription(step.description);
    }
  };

  const dateDisplay = formatStepDate(step.dueDate, step.dueTime, taskDueDate);

  return (
    <div className="flex items-start justify-center gap-2 py-1.5 group">
      {/* Checkbox */}
      <input
        type="checkbox"
        checked={step.isCompleted}
        onChange={onToggle}
        className="mt-2 w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-500 focus:ring-blue-500 flex-shrink-0"
        style={{
          accentColor: `var(--theme-color)`
        }}
      />

      {/* Description - always editable */}
      <div className={`flex-1 px-1 py-0.5 ${step.isCompleted ? 'opacity-30 text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-gray-100'}`}>
        <MilkdownStepEditor
          markdown={description}
          onChange={setDescription}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
        />
      </div>

      {/* Date button - float right */}
      <div className="relative flex-shrink-0">
        <button
          onClick={onDateClick}
          className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs transition-colors ${
            dateDisplay
              ? 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              : 'text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          <CalendarIcon className="w-3 h-3" />
          {dateDisplay && <span>{dateDisplay}</span>}
        </button>
      </div>

      {/* Delete */}
      <button
        onClick={onDelete}
        className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all flex-shrink-0"
        title={t('common.delete')}
      >
        <TrashIcon className="w-3.5 h-3.5 text-red-400" />
      </button>
    </div>
  );
}

function SortableStepItem({
  step,
  taskDueDate,
  onToggle,
  onDelete,
  onUpdateDescription,
  onDateClick,
}: StepItemProps & { taskDueDate?: string; onDateClick: (e: React.MouseEvent) => void }) {
  const { t } = useTranslation('common');
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: step.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 'auto' as const,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-start gap-1 group/sort">
      <button
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        className="flex items-center justify-center h-full rounded opacity-0 group-hover/sort:opacity-100 transition-opacity cursor-grab active:cursor-grabbing flex-shrink-0 touch-none absolute -left-4"
        title={t('tasks.views.drag_to_reorder')}
      >
        <Bars3Icon className="w-3 h-3 text-gray-400 dark:text-gray-500" />
      </button>
      <div className="flex-1">
        <StepItem
          step={step}
          taskDueDate={taskDueDate}
          onToggle={onToggle}
          onDelete={onDelete}
          onUpdateDescription={onUpdateDescription}
          onDateClick={onDateClick}
        />
      </div>
    </div>
  );
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
}: Omit<StepListProps, 'taskId'>) {
  const { t } = useTranslation('common');
  const [showAddInput, setShowAddInput] = useState(false);
  const editingStepIdRef = useRef<string | null>(null);
  const { data: calendarEvents = [] } = useCalendarEvents();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  // Single listener for date picker overlay results
  useEffect(() => {
    let unlistenFn: (() => void) | null = null;
    listen<{ date?: string; time?: string }>('date-picker-overlay:result', (e) => {
      const stepId = editingStepIdRef.current;
      if (!stepId) return;
      onUpdateDueDate(stepId, e.payload.date);
      onUpdateDueTime(stepId, e.payload.time);
      editingStepIdRef.current = null;
    }).then((fn) => { unlistenFn = fn; });
    return () => { unlistenFn?.(); };
  }, [onUpdateDueDate, onUpdateDueTime]);

  const handleStepDateClick = async (stepId: string, e: React.MouseEvent) => {
    const step = steps.find((s) => s.id === stepId);
    if (!step) return;
    editingStepIdRef.current = stepId;
    const rect = await getScreenRect(e.currentTarget as HTMLElement);
    await showOverlay(DATE_PICKER_LABEL, rect.x, rect.y + rect.height + 4, {
      date: step.dueDate || undefined,
      time: step.dueTime || undefined,
      events: calendarEvents,
      anchorX: rect.x,
      anchorY: rect.y,
      anchorH: rect.height,
    });
  };

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    if (!onReorder) return;

    const oldIndex = steps.findIndex((s) => s.id === active.id);
    const newIndex = steps.findIndex((s) => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = [...steps];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);

    const items = reordered.map((s, idx) => ({ id: s.id, sortOrder: idx }));
    onReorder(items);
  }, [steps, onReorder]);

  const total = steps.length;
  const completed = steps.filter((s) => s.isCompleted).length;

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
          onClick={() => setShowAddInput(true)}
          className="text-xs text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
        >
          <PlusIcon className="w-4 h-4" />
        </button>
      </div>

      {showAddInput && (
        <InlineAddInput
          placeholder={t('tasks.steps.description_placeholder')}
          onCancel={() => setShowAddInput(false)}
          onSubmit={(desc) => {
            onAdd(desc);
            setShowAddInput(false);
          }}
        />
      )}

      {onReorder ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd} modifiers={[restrictToVerticalAxis]}>
          <SortableContext items={steps.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            <div className="relative">
              {steps.map((step) => (
                <SortableStepItem
                  key={step.id}
                  step={step}
                  taskDueDate={taskDueDate}
                  onToggle={() => onToggle(step.id)}
                  onDelete={() => onDelete(step.id)}
                  onUpdateDescription={(desc) => onUpdateDescription(step.id, desc)}
                  onDateClick={(e) => handleStepDateClick(step.id, e)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        steps.map((step) => (
          <StepItem
            key={step.id}
            step={step}
            taskDueDate={taskDueDate}
            onToggle={() => onToggle(step.id)}
            onDelete={() => onDelete(step.id)}
            onUpdateDescription={(desc) => onUpdateDescription(step.id, desc)}
            onDateClick={(e) => handleStepDateClick(step.id, e)}
          />
        ))
      )}
    </div>
  );
}

interface StepItemProps {
  step: Step;
  onToggle: () => void;
  onDelete: () => void;
  onUpdateDescription: (description: string) => void;
}
