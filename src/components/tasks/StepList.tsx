import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PlusIcon, TrashIcon, CalendarIcon, ClockIcon } from '@heroicons/react/24/outline';

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
  onAdd: () => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdateDescription: (id: string, description: string) => void;
  onUpdateDueDate: (id: string, dueDate?: string) => void;
  onUpdateDueTime: (id: string, dueTime?: string) => void;
}

export default function StepList({
  steps,
  onAdd,
  onToggle,
  onDelete,
  onUpdateDescription,
  onUpdateDueDate,
  onUpdateDueTime,
}: Omit<StepListProps, 'taskId'>) {
  const { t } = useTranslation('common');
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('tasks.steps.title')}</h3>
        <button
          onClick={onAdd}
          className="flex items-center gap-1 px-2 py-1 text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
        >
          <PlusIcon className="w-4 h-4" />
          <span>{t('tasks.steps.add')}</span>
        </button>
      </div>

      {steps.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-500 italic">{t('tasks.steps.empty')}</p>
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
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

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

        {/* Date and Time */}
        <div className="flex items-center gap-2">
          {/* Due Date */}
          <div className="relative">
            <button
              onClick={() => setShowDatePicker(!showDatePicker)}
              className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
                step.dueDate
                  ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                  : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <CalendarIcon className="w-3 h-3" />
              <span>{step.dueDate || t('tasks.steps.set_date')}</span>
            </button>
            {showDatePicker && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowDatePicker(false)}
                />
                <input
                  type="date"
                  value={step.dueDate || ''}
                  onChange={(e) => {
                    onUpdateDueDate(e.target.value || undefined);
                    setShowDatePicker(false);
                  }}
                  className="absolute top-full left-0 mt-1 z-20 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded shadow-lg bg-white dark:bg-gray-800"
                  autoFocus
                />
              </>
            )}
          </div>

          {/* Due Time */}
          <div className="relative">
            <button
              onClick={() => setShowTimePicker(!showTimePicker)}
              className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
                step.dueTime
                  ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                  : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <ClockIcon className="w-3 h-3" />
              <span>{step.dueTime || t('tasks.steps.set_time')}</span>
            </button>
            {showTimePicker && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowTimePicker(false)}
                />
                <input
                  type="time"
                  value={step.dueTime || ''}
                  onChange={(e) => {
                    onUpdateDueTime(e.target.value || undefined);
                    setShowTimePicker(false);
                  }}
                  className="absolute top-full left-0 mt-1 z-20 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded shadow-lg bg-white dark:bg-gray-800"
                  autoFocus
                />
              </>
            )}
          </div>
        </div>
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
