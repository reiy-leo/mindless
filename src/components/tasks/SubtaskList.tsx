import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PlusIcon, TrashIcon, ChevronRightIcon, ChevronDownIcon } from '@heroicons/react/24/outline';

interface Subtask {
  id: string;
  title: string;
  isCompleted: boolean;
  level: number;
  children?: Subtask[];
}

interface SubtaskListProps {
  taskId: string;
  subtasks: Subtask[];
  onAdd: (parentId?: string) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdateTitle: (id: string, title: string) => void;
}

interface SubtaskItemProps {
  subtask: Subtask;
  onAdd: (parentId?: string) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdateTitle: (id: string, title: string) => void;
  depth: number;
}

function SubtaskItem({ subtask, onAdd, onToggle, onDelete, onUpdateTitle, depth }: SubtaskItemProps) {
  const { t } = useTranslation('common');
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(subtask.title);
  const [isExpanded, setIsExpanded] = useState(true);

  const handleSave = () => {
    if (title.trim()) {
      onUpdateTitle(subtask.id, title.trim());
      setIsEditing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setTitle(subtask.title);
      setIsEditing(false);
    }
  };

  const hasChildren = subtask.children && subtask.children.length > 0;
  const canAddChild = depth < 3; // Max 4 levels (0-3)

  return (
    <div className="space-y-2">
      <div
        className="flex items-center gap-2 group"
        style={{ paddingLeft: `${depth * 24}px` }}
      >
        {/* Expand/Collapse button */}
        {hasChildren ? (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            {isExpanded ? (
              <ChevronDownIcon className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronRightIcon className="w-4 h-4 text-gray-500" />
            )}
          </button>
        ) : (
          <div className="w-6" />
        )}

        {/* Checkbox */}
        <input
          type="checkbox"
          checked={subtask.isCompleted}
          onChange={() => onToggle(subtask.id)}
          className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-500 focus:ring-blue-500"
        />

        {/* Title */}
        {isEditing ? (
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            autoFocus
            className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        ) : (
          <span
            onDoubleClick={() => setIsEditing(true)}
            className={`flex-1 text-sm cursor-text ${
              subtask.isCompleted ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-gray-100'
            }`}
          >
            {subtask.title}
          </span>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {canAddChild && (
            <button
              onClick={() => onAdd(subtask.id)}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title={t('tasks.subtasks.add_child')}
            >
              <PlusIcon className="w-4 h-4 text-gray-500" />
            </button>
          )}
          <button
            onClick={() => onDelete(subtask.id)}
            className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            title={t('common.delete')}
          >
            <TrashIcon className="w-4 h-4 text-red-500" />
          </button>
        </div>
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div className="space-y-2">
          {subtask.children!.map((child) => (
            <SubtaskItem
              key={child.id}
              subtask={child}
              onAdd={onAdd}
              onToggle={onToggle}
              onDelete={onDelete}
              onUpdateTitle={onUpdateTitle}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function SubtaskList({
  subtasks,
  onAdd,
  onToggle,
  onDelete,
  onUpdateTitle,
}: Omit<SubtaskListProps, 'taskId'>) {
  const { t } = useTranslation('common');

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('tasks.subtasks.title')}</h3>
        <button
          onClick={() => onAdd()}
          className="flex items-center gap-1 px-2 py-1 text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
        >
          <PlusIcon className="w-4 h-4" />
          <span>{t('tasks.subtasks.add')}</span>
        </button>
      </div>

      {subtasks.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-500 italic">{t('tasks.subtasks.empty')}</p>
      ) : (
        <div className="space-y-2">
          {subtasks.map((subtask) => (
            <SubtaskItem
              key={subtask.id}
              subtask={subtask}
              onAdd={onAdd}
              onToggle={onToggle}
              onDelete={onDelete}
              onUpdateTitle={onUpdateTitle}
              depth={0}
            />
          ))}
        </div>
      )}
    </div>
  );
}
