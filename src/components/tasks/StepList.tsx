import { useState, useCallback, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PlusIcon, TrashIcon, Bars3Icon } from '@heroicons/react/24/outline';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import DateTimePicker from '@/components/DateTimePicker';
import { useCalendarEvents } from '@/queries/useTaskQueries';

interface Step {
  id: string;
  description: string;
  dueDate?: string;
  dueTime?: string;
  isCompleted: boolean;
  sortOrder: number;
}

interface StepListProps {
  taskId: string;
  steps: Step[];
  onAdd: (description: string) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdateDescription: (id: string, description: string) => void;
  onUpdateDueDate: (id: string, dueDate?: string) => void;
  onUpdateDueTime: (id: string, dueTime?: string) => void;
  onReorder?: (items: { id: string; sortOrder: number }[]) => void;
}

// ==================== Inline Add Input ====================
function InlineAddInput({
  placeholder,
  onCancel,
  onSubmit,
}: {
  placeholder: string;
  onCancel: () => void;
  onSubmit: (description: string) => void;
}) {
  const { t } = useTranslation('common');
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && value.trim()) {
      onSubmit(value.trim());
      setValue('');
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
      <div className="w-4 h-4 rounded border-2 border-dashed border-blue-300 dark:border-blue-600 flex-shrink-0" />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          if (value.trim()) onSubmit(value.trim());
          else onCancel();
        }}
        placeholder={placeholder}
        className="flex-1 px-2 py-1 text-sm border border-blue-300 dark:border-blue-600 bg-white dark:bg-gray-700 dark:text-gray-100 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button
        onClick={onCancel}
        className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 px-1"
      >
        {t('common.cancel')}
      </button>
    </div>
  );
}

export default function StepList({
  steps,
  onAdd,
  onToggle,
  onDelete,
  onUpdateDescription,
  onUpdateDueDate,
  onUpdateDueTime,
  onReorder,
}: Omit<StepListProps, 'taskId'>) {
  const { t } = useTranslation('common');
  const [editingId, setEditingId] = useState<string | null>(null);
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

    const items = reordered.map((step, idx) => ({ id: step.id, sortOrder: idx }));
    onReorder(items);
  }, [steps, onReorder]);

  const total = steps.length;
  const completed = steps.filter((s) => s.isCompleted).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
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
          className="flex items-center gap-1 px-2 py-1 text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
        >
          <PlusIcon className="w-4 h-4" />
          <span>{t('tasks.steps.add')}</span>
        </button>
      </div>

      {/* Inline add input */}
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

      {steps.length === 0 && !showAddInput ? (
        <p className="text-sm text-gray-400 dark:text-gray-500 italic">{t('tasks.steps.empty')}</p>
      ) : onReorder ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={steps.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {steps.map((step) => (
                <SortableStepItem
                  key={step.id}
                  step={step}
                  isEditing={editingId === step.id}
                  onStartEdit={() => setEditingId(step.id)}
                  onFinishEdit={() => setEditingId(null)}
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
        <div className="space-y-2">
          {steps.map((step) => (
            <StepItem
              key={step.id}
              step={step}
              isEditing={editingId === step.id}
              onStartEdit={() => setEditingId(step.id)}
              onFinishEdit={() => setEditingId(null)}
              onToggle={() => onToggle(step.id)}
              onDelete={() => onDelete(step.id)}
              onUpdateDescription={(desc) => onUpdateDescription(step.id, desc)}
              onUpdateDueDate={(date) => onUpdateDueDate(step.id, date)}
              onUpdateDueTime={(time) => onUpdateDueTime(step.id, time)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface StepItemProps {
  step: Step;
  isEditing: boolean;
  onStartEdit: () => void;
  onFinishEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
  onUpdateDescription: (description: string) => void;
  onUpdateDueDate: (dueDate?: string) => void;
  onUpdateDueTime: (dueTime?: string) => void;
}

function StepItem({
  step,
  isEditing,
  onStartEdit,
  onFinishEdit,
  onToggle,
  onDelete,
  onUpdateDescription,
  onUpdateDueDate,
  onUpdateDueTime,
}: StepItemProps) {
  const { t } = useTranslation('common');
  const [description, setDescription] = useState(step.description);
  const { data: calendarEvents = [] } = useCalendarEvents();

  const handleSave = () => {
    if (description.trim()) {
      onUpdateDescription(description.trim());
      onFinishEdit();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      setDescription(step.description);
      onFinishEdit();
    }
  };

  return (
    <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg group hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
      {/* Checkbox */}
      <input
        type="checkbox"
        checked={step.isCompleted}
        onChange={onToggle}
        className="w-4 h-4 mt-1 rounded border-gray-300 dark:border-gray-600 text-blue-500 focus:ring-blue-500"
      />

      {/* Content */}
      <div className="flex-1 space-y-2">
        {/* Description */}
        {isEditing ? (
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            autoFocus
            rows={2}
            placeholder={t('tasks.steps.description_placeholder')}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        ) : (
          <p
            onDoubleClick={onStartEdit}
            className={`text-sm cursor-text ${
              step.isCompleted ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-gray-100'
            }`}
          >
            {step.description}
          </p>
        )}

        {/* Date and Time via unified DateTimePicker */}
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

      {/* Actions */}
      <button
        onClick={onDelete}
        className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
        title={t('common.delete')}
      >
        <TrashIcon className="w-4 h-4 text-red-500" />
      </button>
    </div>
  );
}

// ==================== Sortable Step Wrapper ====================
function SortableStepItem({
  step,
  isEditing,
  onStartEdit,
  onFinishEdit,
  onToggle,
  onDelete,
  onUpdateDescription,
  onUpdateDueDate,
  onUpdateDueTime,
}: StepItemProps) {
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
    <div ref={setNodeRef} style={style} className="flex items-start gap-1">
      <button
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        className="p-2 mt-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing flex-shrink-0 touch-none"
        title={t('tasks.views.drag_to_reorder')}
      >
        <Bars3Icon className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
      </button>
      <div className="flex-1">
        <StepItem
          step={step}
          isEditing={isEditing}
          onStartEdit={onStartEdit}
          onFinishEdit={onFinishEdit}
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
