import { useState, useCallback, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PlusIcon, TrashIcon, ChevronRightIcon, ChevronDownIcon, Bars3Icon } from '@heroicons/react/24/outline';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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
  onAdd: (title: string, parentId?: string) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdateTitle: (id: string, title: string) => void;
  onReorder?: (items: { id: string; sortOrder: number }[]) => void;
}

interface SubtaskItemProps {
  subtask: Subtask;
  onAdd: (title: string, parentId?: string) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdateTitle: (id: string, title: string) => void;
  depth: number;
}

// ==================== Inline Add Input ====================
function InlineAddInput({
  placeholder,
  onCancel,
  onSubmit,
  indent = 0,
}: {
  placeholder: string;
  onCancel: () => void;
  onSubmit: (title: string) => void;
  indent?: number;
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
    <div className="flex items-center gap-2" style={{ paddingLeft: `${indent * 24}px` }}>
      <div className="w-6" />
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
        className="flex-1 px-2 py-1.5 text-sm border border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-gray-100 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button
        onClick={onCancel}
        className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 px-1"
      >
        {t('common.cancel')}
      </button>
    </div>
  );
}

function SubtaskItem({ subtask, onAdd, onToggle, onDelete, onUpdateTitle, depth }: SubtaskItemProps) {
  const { t } = useTranslation('common');
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(subtask.title);
  const [isExpanded, setIsExpanded] = useState(true);
  const [showChildInput, setShowChildInput] = useState(false);

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

  // Count descendants for delete confirmation
  const countDescendants = (node: Subtask): number => {
    if (!node.children) return 0;
    return node.children.reduce((sum, child) => sum + 1 + countDescendants(child), 0);
  };

  const handleDelete = () => {
    const descendantCount = countDescendants(subtask);
    if (descendantCount > 0) {
      if (!window.confirm(t('tasks.subtasks.delete_with_children', { count: descendantCount }))) {
        return;
      }
    }
    onDelete(subtask.id);
  };

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
              <ChevronDownIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            ) : (
              <ChevronRightIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
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
              onClick={() => setShowChildInput(!showChildInput)}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title={t('tasks.subtasks.add_child')}
            >
              <PlusIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            </button>
          )}
          <button
            onClick={handleDelete}
            className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            title={t('common.delete')}
          >
            <TrashIcon className="w-4 h-4 text-red-500 dark:text-red-400" />
          </button>
        </div>
      </div>

      {/* Child add input */}
      {showChildInput && (
        <InlineAddInput
          placeholder={t('tasks.subtasks.child_placeholder')}
          indent={depth + 1}
          onCancel={() => setShowChildInput(false)}
          onSubmit={(childTitle) => {
            onAdd(childTitle, subtask.id);
            setShowChildInput(false);
          }}
        />
      )}

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

// ==================== Sortable Wrapper ====================
function SortableSubtaskItem({
  subtask,
  onAdd,
  onToggle,
  onDelete,
  onUpdateTitle,
}: {
  subtask: Subtask;
  onAdd: (title: string, parentId?: string) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdateTitle: (id: string, title: string) => void;
}) {
  const { t } = useTranslation('common');
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: subtask.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 'auto' as const,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div className="flex items-center gap-1 group/sort">
        <button
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 opacity-0 group-hover/sort:opacity-100 transition-opacity cursor-grab active:cursor-grabbing flex-shrink-0 touch-none"
          title={t('tasks.views.drag_to_reorder')}
        >
          <Bars3Icon className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
        </button>
        <div className="flex-1">
          <SubtaskItem
            subtask={subtask}
            onAdd={onAdd}
            onToggle={onToggle}
            onDelete={onDelete}
            onUpdateTitle={onUpdateTitle}
            depth={0}
          />
        </div>
      </div>
    </div>
  );
}

export default function SubtaskList({
  subtasks,
  onAdd,
  onToggle,
  onDelete,
  onUpdateTitle,
  onReorder,
}: Omit<SubtaskListProps, 'taskId'>) {
  const { t } = useTranslation('common');
  const [showAddInput, setShowAddInput] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    if (!onReorder) return;

    const topLevel = subtasks.filter((s) => !('parentSubtaskId' in s && (s as any).parentSubtaskId));
    const oldIndex = topLevel.findIndex((s) => s.id === active.id);
    const newIndex = topLevel.findIndex((s) => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = [...topLevel];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);

    const items = reordered.map((s, idx) => ({ id: s.id, sortOrder: idx }));
    onReorder(items);
  }, [subtasks, onReorder]);

  // Count total and completed
  const countAll = (items: Subtask[]): number =>
    items.reduce((sum, s) => sum + 1 + (s.children ? countAll(s.children) : 0), 0);
  const countCompleted = (items: Subtask[]): number =>
    items.reduce((sum, s) =>
      sum + (s.isCompleted ? 1 : 0) + (s.children ? countCompleted(s.children) : 0), 0);

  const total = countAll(subtasks);
  const completed = countCompleted(subtasks);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {t('tasks.subtasks.title')}
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
          <span>{t('tasks.subtasks.add')}</span>
        </button>
      </div>

      {/* Inline add input */}
      {showAddInput && (
        <InlineAddInput
          placeholder={t('tasks.subtasks.title_placeholder')}
          onCancel={() => setShowAddInput(false)}
          onSubmit={(title) => {
            onAdd(title);
            setShowAddInput(false);
          }}
        />
      )}

      {subtasks.length === 0 && !showAddInput ? (
        <p className="text-sm text-gray-400 dark:text-gray-500 italic">{t('tasks.subtasks.empty')}</p>
      ) : onReorder ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={subtasks.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {subtasks.map((subtask) => (
                <SortableSubtaskItem
                  key={subtask.id}
                  subtask={subtask}
                  onAdd={onAdd}
                  onToggle={onToggle}
                  onDelete={onDelete}
                  onUpdateTitle={onUpdateTitle}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
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
