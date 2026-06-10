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
import DateTimePicker from '@/components/DateTimePicker';
import { useCalendarEvents } from '@/queries/useTaskQueries';

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = el.scrollHeight + 'px';
    }
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim()) {
        onSubmit(value.trim());
        setValue('');
      }
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div className="flex items-start gap-2">
      <div className="w-4 h-4 rounded border-2 border-dashed border-gray-300 dark:border-gray-600 flex-shrink-0 mt-0.5" />
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          if (value.trim()) onSubmit(value.trim());
          else onCancel();
        }}
        placeholder={placeholder}
        rows={1}
        className="flex-1 px-2 py-1 text-sm bg-transparent border-none outline-none resize-none min-w-0 leading-snug text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
      />
    </div>
  );
}

function StepItem({
  step,
  taskDueDate,
  onToggle,
  onDelete,
  onUpdateDescription,
  onUpdateDueDate,
  onUpdateDueTime,
}: StepItemProps & { taskDueDate?: string }) {
  const { t } = useTranslation('common');
  const [description, setDescription] = useState(step.description);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const { data: calendarEvents = [] } = useCalendarEvents();
  const dateRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setDescription(step.description);
  }, [step.description]);

  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = el.scrollHeight + 'px';
    }
  }, [description]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dateRef.current && !dateRef.current.contains(e.target as Node)) {
        setShowDatePicker(false);
      }
    };
    if (showDatePicker) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showDatePicker]);

  const handleSave = () => {
    const trimmed = description.trim();
    if (trimmed && trimmed !== step.description) {
      onUpdateDescription(trimmed);
    } else if (!trimmed) {
      setDescription(step.description);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
      (e.target as HTMLElement).blur();
    } else if (e.key === 'Escape') {
      setDescription(step.description);
      (e.target as HTMLElement).blur();
    }
  };

  const dateDisplay = formatStepDate(step.dueDate, step.dueTime, taskDueDate);

  return (
    <div className="flex items-start gap-2 py-1.5 group">
      {/* Checkbox */}
      <input
        type="checkbox"
        checked={step.isCompleted}
        onChange={onToggle}
        className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-500 focus:ring-blue-500 flex-shrink-0 mt-0.5"
      />

      {/* Description - always editable */}
      <textarea
        ref={textareaRef}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        rows={1}
        className={`flex-1 px-1 py-0.5 text-sm bg-transparent border-none outline-none resize-none min-w-0 leading-snug ${
          step.isCompleted ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-gray-100'
        }`}
      />

      {/* Date button - float right */}
      <div ref={dateRef} className="relative flex-shrink-0">
        <button
          onClick={() => setShowDatePicker(!showDatePicker)}
          className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs transition-colors ${
            dateDisplay
              ? 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              : 'text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          <CalendarIcon className="w-3 h-3" />
          {dateDisplay && <span>{dateDisplay}</span>}
        </button>
        {showDatePicker && (
          <div className="absolute right-0 top-full mt-1 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-2">
              <DateTimePicker
                date={step.dueDate || undefined}
                time={step.dueTime || undefined}
                onChange={(d, tm) => {
                  onUpdateDueDate(d || undefined);
                  onUpdateDueTime(tm || undefined);
                }}
                events={calendarEvents}
                showTime={true}
              />
            </div>
          </div>
        )}
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
  onUpdateDueDate,
  onUpdateDueTime,
}: StepItemProps & { taskDueDate?: string }) {
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
        className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 opacity-0 group-hover/sort:opacity-100 transition-opacity cursor-grab active:cursor-grabbing flex-shrink-0 touch-none mt-1 absolute -left-5"
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
          onUpdateDueDate={onUpdateDueDate}
          onUpdateDueTime={onUpdateDueTime}
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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

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
                  onUpdateDueDate={(date) => onUpdateDueDate(step.id, date)}
                  onUpdateDueTime={(time) => onUpdateDueTime(step.id, time)}
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
            onUpdateDueDate={(date) => onUpdateDueDate(step.id, date)}
            onUpdateDueTime={(time) => onUpdateDueTime(step.id, time)}
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
  onUpdateDueDate: (dueDate?: string) => void;
  onUpdateDueTime: (dueTime?: string) => void;
}
