import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useTranslation } from 'react-i18next';
import { PlusIcon, FunnelIcon, PencilIcon, TrashIcon, XMarkIcon, TagIcon, Bars3Icon } from '@heroicons/react/24/outline';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  useTasks, useCreateTask, useUpdateTask, useDeleteTask,
  useToggleTaskCompletion, useTags, useSubtasks, useSteps, useLists,
  useCreateSubtask, useUpdateSubtask, useDeleteSubtask,
  useCreateStep, useUpdateStep, useDeleteStep,
  useCreateTag, useReorderTasks, useReorderSubtasks, useReorderSteps,
  useCompleteRecurringTask,
} from '@/queries/useTaskQueries';
import { useViewStore } from '@/stores/useViewStore';
import { useAppStore } from '@/stores/useAppStore';
import { PRIORITY_COLORS, PRIORITY_COLOR_FALLBACK, VIEW_MODES } from '@/lib/constants';
import { getTaskTags, parseLocalDate } from '@/lib/taskHelpers';
import TaskForm from '@/components/tasks/TaskForm';
import SubtaskList from '@/components/tasks/SubtaskList';
import StepList from '@/components/tasks/StepList';
import CalendarView from '@/components/tasks/CalendarView';
import KanbanView from '@/components/tasks/KanbanView';
import Select from '@/components/Select';
import TagCombobox from '@/components/TagCombobox';
import EisenhowerMatrixView from '@/components/tasks/EisenhowerMatrixView';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import { TaskSortControls } from '@/components/tasks/TaskSortControls';
import { TaskGroupControls } from '@/components/tasks/TaskGroupControls';
import type { Task, Priority, Subtask as SubtaskType, Step as StepType } from '@/types/task';
import type { Tag } from '@/types/tag';

// ==================== Helper: Build subtask tree ====================
function buildSubtaskTree(flatSubtasks: SubtaskType[]): (SubtaskType & { children?: any[] })[] {
  const map = new Map<string, SubtaskType & { children?: any[] }>();
  const roots: (SubtaskType & { children?: any[] })[] = [];

  flatSubtasks.forEach((s) => map.set(s.id, { ...s, children: [] }));

  flatSubtasks.forEach((s) => {
    const node = map.get(s.id)!;
    if (s.parentSubtaskId && map.has(s.parentSubtaskId)) {
      map.get(s.parentSubtaskId)!.children!.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}

// ==================== Helper: Get all descendant IDs ====================
function getDescendantIds(flatSubtasks: SubtaskType[], parentId: string): string[] {
  const children = flatSubtasks.filter((s) => s.parentSubtaskId === parentId);
  const result: string[] = [];
  for (const child of children) {
    result.push(child.id);
    result.push(...getDescendantIds(flatSubtasks, child.id));
  }
  return result;
}

// ==================== Helper: Calculate task progress ====================
function calcTaskProgress(subtasks: SubtaskType[], steps: StepType[]): { completed: number; total: number } | null {
  const total = subtasks.length + steps.length;
  if (total === 0) return null;
  const completed = subtasks.filter((s) => s.isCompleted).length + steps.filter((s) => s.isCompleted).length;
  return { completed, total };
}

// ==================== Helper: Recurrence label ====================
function getRecurrenceLabel(rule: string, t: (key: string, opts?: any) => string): string {
  const basic: Record<string, string> = {
    daily: t('tasks.recurrence.daily'),
    weekly: t('tasks.recurrence.weekly'),
    monthly: t('tasks.recurrence.monthly'),
    yearly: t('tasks.recurrence.yearly'),
  };
  if (basic[rule]) return basic[rule];
  if (rule.startsWith('every_')) {
    const parts = rule.split('_');
    if (parts.length >= 3) {
      const n = parts[1];
      const unit = parts[2];
      const unitLabel = unit === 'days' ? t('tasks.recurrence.days')
        : unit === 'weeks' ? t('tasks.recurrence.weeks')
        : t('tasks.recurrence.months');
      return `${t('tasks.recurrence.every')} ${n} ${unitLabel}`;
    }
  }
  return rule;
}

// ==================== Task Detail Panel ====================
function TaskDetailPanel({
  task,
  allTags,
  onClose,
  onEdit,
  onDelete,
  onUpdateTask,
}: {
  task: Task;
  allTags: Tag[];
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onUpdateTask: (params: any) => void;
}) {
  const { t } = useTranslation('common');
  const { data: flatSubtasks = [] } = useSubtasks(task.id);
  const { data: steps = [] } = useSteps(task.id);

  const createSubtask = useCreateSubtask();
  const updateSubtask = useUpdateSubtask();
  const deleteSubtask = useDeleteSubtask();
  const createStep = useCreateStep();
  const updateStep = useUpdateStep();
  const deleteStep = useDeleteStep();
  const createTag = useCreateTag();
  const reorderSubtasks = useReorderSubtasks();
  const reorderSteps = useReorderSteps();



  const subtaskTree = useMemo(() => buildSubtaskTree(flatSubtasks), [flatSubtasks]);

  // Calculate progress
  const progress = useMemo(() => calcTaskProgress(flatSubtasks, steps), [flatSubtasks, steps]);

  // Auto-complete task when all subtasks and steps are done
  useEffect(() => {
    if (!progress || progress.total === 0) return;
    if (progress.completed === progress.total && !task.isCompleted) {
      onUpdateTask({ isCompleted: true });
    }
  }, [progress, task.isCompleted, onUpdateTask]);

  // Parse task's tag_ids (comma-separated string)
  const taskTagIds: string[] = useMemo(() => {
    if (!task.tagIds || task.tagIds.length === 0) return [];
    return task.tagIds.split(',').filter(Boolean);
  }, [task.tagIds]);


  const handleAddSubtask = (title: string, parentSubtaskId?: string) => {
    const level = parentSubtaskId
      ? (flatSubtasks.find((s) => s.id === parentSubtaskId)?.level ?? 0) + 1
      : 0;
    createSubtask.mutate({ taskId: task.id, title, parentSubtaskId, level });
  };

  const handleToggleSubtask = (id: string) => {
    const subtask = flatSubtasks.find((s) => s.id === id);
    if (subtask) {
      const newCompleted = !subtask.isCompleted;
      // Update the subtask itself
      updateSubtask.mutate({ id, taskId: task.id, isCompleted: newCompleted });
      // Cascade: update all descendants to the same state
      const descendants = getDescendantIds(flatSubtasks, id);
      for (const descId of descendants) {
        const desc = flatSubtasks.find((s) => s.id === descId);
        if (desc && desc.isCompleted !== newCompleted) {
          updateSubtask.mutate({ id: descId, taskId: task.id, isCompleted: newCompleted });
        }
      }
    }
  };

  const handleDeleteSubtask = (id: string) => {
    deleteSubtask.mutate({ id, taskId: task.id });
  };

  const handleUpdateSubtaskTitle = (id: string, title: string) => {
    updateSubtask.mutate({ id, taskId: task.id, title });
  };

  const handleAddStep = (description: string) => {
    createStep.mutate({ taskId: task.id, description });
  };

  const handleToggleStep = (id: string) => {
    const step = steps.find((s: StepType) => s.id === id);
    if (step) {
      updateStep.mutate({ id, taskId: task.id, isCompleted: !step.isCompleted });
    }
  };

  const handleDeleteStep = (id: string) => {
    deleteStep.mutate({ id, taskId: task.id });
  };

  const handleUpdateStepDescription = (id: string, description: string) => {
    updateStep.mutate({ id, taskId: task.id, description });
  };

  const handleUpdateStepDueDate = (id: string, dueDate?: string) => {
    updateStep.mutate({ id, taskId: task.id, dueDate });
  };

  const handleUpdateStepDueTime = (id: string, dueTime?: string) => {
    updateStep.mutate({ id, taskId: task.id, dueTime });
  };

  const handleToggleTag = (tagId: string) => {
    const currentIds = taskTagIds.includes(tagId)
      ? taskTagIds.filter((id) => id !== tagId)
      : [...taskTagIds, tagId];
    onUpdateTask({ tagIds: currentIds.join(',') });
  };



  return (
    <div className="flex flex-col h-full border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      {/* Detail Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate flex-1">{task.title}</h2>
        <div className="flex items-center gap-1 ml-2">
          <button
            onClick={onEdit}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title={t('common.edit')}
          >
            <PencilIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            title={t('common.delete')}
          >
            <TrashIcon className="w-4 h-4 text-red-500 dark:text-red-400" />
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title={t('common.close')}
          >
            <XMarkIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
      </div>

      {/* Detail Content */}
      <div className="flex-1 overflow-auto p-4 space-y-6">
        {/* Progress Bar */}
        {progress && progress.total > 0 && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {t('tasks.progress_label')}
              </span>
              <span className={`text-xs font-bold ${
                progress.completed === progress.total ? 'text-green-500' : 'text-gray-600 dark:text-gray-400'
              }`}>
                {progress.completed}/{progress.total}
              </span>
            </div>
            <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${(progress.completed / progress.total) * 100}%`,
                  backgroundColor: progress.completed === progress.total ? '#10B981' : '#3B82F6',
                }}
              />
            </div>
          </div>
        )}

        {/* Description */}
        {task.description && (
          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{t('tasks.description')}</h3>
            <MarkdownRenderer content={task.description} />
          </div>
        )}

        {/* Meta info */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          {task.priority > 0 && (
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: PRIORITY_COLORS[task.priority] }}
              />
              <span className="text-gray-600 dark:text-gray-400">
                {t('tasks.priority.label')}: {t(`tasks.priority.${['none','low','medium','high'][task.priority]}`)}
              </span>
            </div>
          )}
          {task.dueDate && (
            <div className="text-gray-600 dark:text-gray-400">
              {t('tasks.due_date')}: {parseLocalDate(task.dueDate).toLocaleDateString()}
            </div>
          )}
          {task.dueTime && (
            <div className="text-gray-600 dark:text-gray-400">
              {t('tasks.due_time')}: {task.dueTime}
            </div>
          )}
          {task.endDate && (
            <div className="text-gray-600 dark:text-gray-400">
              {t('tasks.range_end')}: {parseLocalDate(task.endDate).toLocaleDateString()}
              {task.endTime && <span className="ml-1">{task.endTime}</span>}
            </div>
          )}
          {task.startDate && (
            <div className="text-gray-600 dark:text-gray-400">
              {t('tasks.start_date')}: {parseLocalDate(task.startDate).toLocaleDateString()}
            </div>
          )}
          {task.recurrenceRule && (
            <div className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
              <span>{t('tasks.recurrence.label')}: {getRecurrenceLabel(task.recurrenceRule, t)}</span>
            </div>
          )}
        </div>

        {/* Tags */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1 mb-2">
            <TagIcon className="w-4 h-4" />
            {t('tasks.tags.title')}
          </h3>
          <TagCombobox
            allTags={allTags}
            selectedIds={taskTagIds}
            onToggle={handleToggleTag}
            onCreateTag={(name) => {
              createTag.mutate({ name }, {
                onSuccess: (newTag) => {
                  const currentIds = [...taskTagIds, newTag.id];
                  onUpdateTask({ tagIds: currentIds.join(',') });
                },
              });
            }}
          />
        </div>

        {/* Subtasks */}
        <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
          <SubtaskList
            subtasks={subtaskTree}
            onAdd={handleAddSubtask}
            onToggle={handleToggleSubtask}
            onDelete={handleDeleteSubtask}
            onUpdateTitle={handleUpdateSubtaskTitle}
            onReorder={(items) => reorderSubtasks.mutate(items)}
          />
        </div>

        {/* Steps */}
        <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
          <StepList
            steps={steps}
            onAdd={handleAddStep}
            onToggle={handleToggleStep}
            onDelete={handleDeleteStep}
            onUpdateDescription={handleUpdateStepDescription}
            onUpdateDueDate={handleUpdateStepDueDate}
            onUpdateDueTime={handleUpdateStepDueTime}
            onReorder={(items) => reorderSteps.mutate(items)}
          />
        </div>
      </div>
    </div>
  );
}

// ==================== Sortable Task Row ====================
function SortableTaskRow({
  task,
  allTags,
  isSelected,
  onSelect,
  onToggle,
  onEdit,
  onDelete,
}: {
  task: Task;
  allTags: Tag[];
  isSelected: boolean;
  onSelect: () => void;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation('common');
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const { data: taskSubtasks = [] } = useSubtasks(task.id);
  const { data: taskSteps = [] } = useSteps(task.id);
  const rowProgress = useMemo(
    () => calcTaskProgress(taskSubtasks, taskSteps),
    [taskSubtasks, taskSteps],
  );

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 'auto' as const,
  };

  const taskTags = getTaskTags(task, allTags);

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={`group flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer ${
        isSelected ? 'ring-2 ring-blue-500' : ''
      } ${isDragging ? 'shadow-lg' : ''}`}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing flex-shrink-0 touch-none"
        title={t('tasks.views.drag_to_reorder')}
      >
        <Bars3Icon className="w-4 h-4 text-gray-400 dark:text-gray-500" />
      </button>

      <input
        type="checkbox"
        checked={task.isCompleted}
        onChange={(e) => { e.stopPropagation(); onToggle(); }}
        onClick={(e) => e.stopPropagation()}
        className="w-5 h-5 rounded border-gray-300 dark:border-gray-600 text-blue-500 focus:ring-blue-500"
      />
      <div className="flex-1 min-w-0">
        <h3 className={`text-base truncate ${
          task.isCompleted ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-gray-100'
        }`}>
          {task.title}
        </h3>
        {task.description && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate">{task.description}</p>
        )}
        {taskTags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {taskTags.map((tag) => (
              <span
                key={tag.id}
                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs text-white"
                style={{ backgroundColor: tag.color || '#3B82F6' }}
              >
                {tag.emoji && <span className="text-xs">{tag.emoji}</span>}
                {tag.name}
              </span>
            ))}
          </div>
        )}
      </div>
      <div
        className="w-3 h-3 rounded-full flex-shrink-0"
        style={{ backgroundColor: PRIORITY_COLORS[task.priority] ?? PRIORITY_COLOR_FALLBACK }}
        title={`${t('tasks.priority.label')}: ${task.priority}`}
      />
      {task.recurrenceRule && (
        <span className="text-xs text-blue-500 flex-shrink-0" title={getRecurrenceLabel(task.recurrenceRule, t)}>
          &#x21bb;
        </span>
      )}
      {/* Subtask/Step progress badge */}
      {rowProgress && rowProgress.total > 0 && (
        <div className="flex items-center gap-1 flex-shrink-0" title={`${rowProgress.completed}/${rowProgress.total}`}>
          <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${(rowProgress.completed / rowProgress.total) * 100}%`,
                backgroundColor: rowProgress.completed === rowProgress.total ? '#10B981' : '#3B82F6',
              }}
            />
          </div>
          <span className={`text-xs ${
            rowProgress.completed === rowProgress.total
              ? 'text-green-500 font-medium'
              : 'text-gray-400 dark:text-gray-500'
          }`}>
            {rowProgress.completed}/{rowProgress.total}
          </span>
        </div>
      )}
      {task.dueDate && (
        <span className="text-sm text-gray-500 dark:text-gray-400 flex-shrink-0">
          {parseLocalDate(task.dueDate).toLocaleDateString()}
          {task.dueTime && <span className="ml-1">{task.dueTime}</span>}
          {task.endDate && (
            <span className="text-gray-400 dark:text-gray-500 ml-1">
              &rarr; {parseLocalDate(task.endDate).toLocaleDateString()}
              {task.endTime && <span className="ml-0.5">{task.endTime}</span>}
            </span>
          )}
        </span>
      )}
      <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors opacity-0 group-hover:opacity-100"
          title={t('common.edit')}
        >
          <PencilIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors opacity-0 group-hover:opacity-100"
          title={t('common.delete')}
        >
          <TrashIcon className="w-4 h-4 text-red-500 dark:text-red-400" />
        </button>
      </div>
    </div>
  );
}

// ==================== Main Page ====================
export default function TasksPage() {
  const { t } = useTranslation('common');
  const { viewMode, filterStatus, selectedListId, setViewMode, setFilterStatus } = useViewStore();
  const [showFilters, setShowFilters] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const { data: tasks = [], isLoading } = useTasks();
  const { data: allTags = [] } = useTags();
  const { data: allLists = [] } = useLists();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const toggleTask = useToggleTaskCompletion();
  const completeRecurring = useCompleteRecurringTask();
  const reorderTasks = useReorderTasks();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  // Keyboard shortcut listeners
  useEffect(() => {
    const handleNewTask = () => {
      setEditingTask(null);
      setShowTaskForm(true);
    };
    const handleEscape = () => {
      if (showTaskForm) {
        setShowTaskForm(false);
        setEditingTask(null);
      }
      if (selectedTaskId) {
        setSelectedTaskId(null);
      }
    };

    window.addEventListener('mindless:new-task', handleNewTask);
    window.addEventListener('mindless:escape', handleEscape);

    return () => {
      window.removeEventListener('mindless:new-task', handleNewTask);
      window.removeEventListener('mindless:escape', handleEscape);
    };
  }, [showTaskForm, selectedTaskId]);

  const selectedTask = useMemo(
    () => tasks.find((task) => task.id === selectedTaskId) || null,
    [tasks, selectedTaskId]
  );

  // Filter and search tasks
  const filteredTasksBase = useMemo(() => tasks.filter((task) => {
    if (filterStatus === 'active' && task.isCompleted) return false;
    if (filterStatus === 'completed' && !task.isCompleted) return false;

    // List filtering
    if (selectedListId) {
      if (selectedListId === 'smart:today') {
        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        if (task.dueDate !== todayStr) return false;
      } else if (selectedListId === 'smart:next7days') {
        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const next7 = new Date(now);
        next7.setDate(next7.getDate() + 7);
        const next7Str = `${next7.getFullYear()}-${String(next7.getMonth() + 1).padStart(2, '0')}-${String(next7.getDate()).padStart(2, '0')}`;
        if (!task.dueDate || task.dueDate < todayStr || task.dueDate > next7Str) return false;
      } else if (selectedListId === 'eisenhower') {
        // Eisenhower matrix shows all tasks — classification happens in the view component
      } else {
        // Regular list: match listId (inbox = null or 'inbox')
        const taskListId = task.listId || 'inbox';
        if (selectedListId === 'inbox') {
          if (taskListId !== 'inbox') return false;
        } else {
          if (task.listId !== selectedListId) return false;
        }
      }
    }

    return true;
  }), [tasks, filterStatus, selectedListId]);

  // Sort tasks
  const { taskSortBy, taskSortOrder, taskGroupBy } = useAppStore();
  const filteredTasks = useMemo(() => {
    const sorted = [...filteredTasksBase].sort((a, b) => {
      let aVal: any, bVal: any;
      switch (taskSortBy) {
        case 'dueDate':
          aVal = a.dueDate || '';
          bVal = b.dueDate || '';
          break;
        case 'startDate':
          aVal = a.startDate || '';
          bVal = b.startDate || '';
          break;
        case 'priority':
          aVal = a.priority;
          bVal = b.priority;
          break;
        case 'createdAt':
          aVal = a.createdAt;
          bVal = b.createdAt;
          break;
      }
      if (aVal < bVal) return taskSortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return taskSortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    // Group tasks
    if (taskGroupBy === 'priority') {
      const groups: Record<number, typeof sorted> = {};
      sorted.forEach((task) => {
        const priority = task.priority || 0;
        if (!groups[priority]) groups[priority] = [];
        groups[priority].push(task);
      });
      return Object.entries(groups)
        .sort(([a], [b]) => Number(b) - Number(a))
        .flatMap(([, groupTasks]) => groupTasks);
    }
    if (taskGroupBy === 'list') {
      const groups: Record<string, typeof sorted> = {};
      sorted.forEach((task) => {
        const listId = task.listId || 'inbox';
        if (!groups[listId]) groups[listId] = [];
        groups[listId].push(task);
      });
      return Object.values(groups).flat();
    }

    return sorted;
  }, [filteredTasksBase, taskSortBy, taskSortOrder, taskGroupBy]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = filteredTasks.findIndex((t) => t.id === active.id);
    const newIndex = filteredTasks.findIndex((t) => t.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = [...filteredTasks];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);

    const items = reordered.map((task, idx) => ({ id: task.id, sortOrder: idx }));
    reorderTasks.mutate(items);
  }, [filteredTasks, reorderTasks]);

  const closeForm = () => {
    setShowTaskForm(false);
    setEditingTask(null);
  };

  const handleCreateTask = (taskData: {
    title: string;
    description?: string;
    priority: Priority;
    dueDate?: string;
    dueTime?: string;
    endDate?: string;
    endTime?: string;
    startDate?: string;
    listId?: string;
    recurrenceRule?: string;
    recurrenceEndDate?: string;
  }) => {
    createTask.mutate(taskData, { onSuccess: closeForm });
  };

  const handleUpdateTask = (taskData: {
    title: string;
    description?: string;
    priority: Priority;
    dueDate?: string;
    dueTime?: string;
    endDate?: string;
    endTime?: string;
    startDate?: string;
    listId?: string;
    recurrenceRule?: string;
    recurrenceEndDate?: string;
  }) => {
    if (editingTask) {
      updateTask.mutate({ id: editingTask.id, ...taskData }, { onSuccess: closeForm });
    }
  };

  const handleToggleTask = (id: string, isCompleted: boolean) => {
    const task = tasks.find((t) => t.id === id);
    // If completing a recurring task, generate the next occurrence
    if (!isCompleted && task?.recurrenceRule) {
      completeRecurring.mutate(id);
    } else {
      toggleTask.mutate({ id, isCompleted: !isCompleted });
    }
  };

  const handleDeleteTask = (id: string) => {
    if (!window.confirm(t('tasks.delete_confirm'))) return;
    deleteTask.mutate(id);
    if (selectedTaskId === id) {
      setSelectedTaskId(null);
    }
  };

  const handleUpdateTaskField = (params: any) => {
    if (selectedTask) {
      updateTask.mutate({ id: selectedTask.id, ...params });
    }
  };

  const handleUpdateTaskInline = (id: string, params: any) => {
    updateTask.mutate({ id, ...params });
  };

  // Compute header title based on selected list
  const headerTitle = useMemo(() => {
    if (!selectedListId) return t('navigation.tasks');
    if (selectedListId === 'smart:today') return t('lists.today');
    if (selectedListId === 'smart:next7days') return t('lists.next_7_days');
    if (selectedListId === 'inbox') return t('lists.inbox');
    if (selectedListId === 'eisenhower') return t('tasks.views.matrix');
    const list = allLists.find((l) => l.id === selectedListId);
    return list?.name || t('navigation.tasks');
  }, [selectedListId, allLists, t]);

  // Virtual scrolling for list view
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: filteredTasks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,
    overscan: 5,
  });

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-500 dark:text-gray-400">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Task List Panel */}
      <div className={`flex flex-col overflow-hidden transition-all ${selectedTask ? 'w-1/2' : 'w-full'}`}>
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{headerTitle}</h1>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title={t('tasks.filters')}
              >
                <FunnelIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
              <button
                onClick={() => {
                  setEditingTask(null);
                  setShowTaskForm(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                <PlusIcon className="w-5 h-5" />
                <span>{t('tasks.new_task')}</span>
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-4">
            <Select
              value={filterStatus}
              onChange={(val) => setFilterStatus(val as 'all' | 'active' | 'completed')}
              options={[
                { value: 'all', label: t('tasks.status.all') },
                { value: 'active', label: t('tasks.status.active') },
                { value: 'completed', label: t('tasks.status.completed') },
              ]}
              className="w-36"
            />
          </div>

          {/* View mode tabs */}
          <div className="flex items-center gap-2 mt-4">
            {Object.entries(VIEW_MODES).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setViewMode(key as keyof typeof VIEW_MODES)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  viewMode === key
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {t(label)}
              </button>
            ))}
          </div>

          {/* Sort and Group controls */}
          <div className="flex items-center gap-4 mt-4">
            <TaskSortControls />
            <TaskGroupControls />
          </div>
        </div>

        {/* Task content area */}
        {viewMode === 'calendar' ? (
          <CalendarView
            tasks={filteredTasks}
            allTags={allTags}
            selectedTaskId={selectedTaskId}
            onSelectTask={(id) => setSelectedTaskId(id === selectedTaskId ? null : id)}
            onToggleTask={handleToggleTask}
          />
        ) : viewMode === 'kanban' ? (
          <KanbanView
            tasks={filteredTasks}
            allTags={allTags}
            selectedTaskId={selectedTaskId}
            onSelectTask={(id) => setSelectedTaskId(id === selectedTaskId ? null : id)}
            onToggleTask={handleToggleTask}
            onUpdateTask={handleUpdateTaskInline}
          />
        ) : viewMode === 'matrix' ? (
          <EisenhowerMatrixView
            tasks={filteredTasks}
            allTags={allTags}
            selectedTaskId={selectedTaskId}
            onSelectTask={(id) => setSelectedTaskId(id === selectedTaskId ? null : id)}
            onToggleTask={handleToggleTask}
            onUpdateTask={handleUpdateTaskInline}
          />
        ) : (
        <div ref={parentRef} className="flex-1 overflow-auto p-6">
          {filteredTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
              <p className="text-lg">{t('tasks.no_tasks')}</p>
              <button
                onClick={() => {
                  setEditingTask(null);
                  setShowTaskForm(true);
                }}
                className="mt-4 text-blue-500 hover:text-blue-600 dark:hover:text-blue-400"
              >
                {t('tasks.create_first')}
              </button>
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={filteredTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                <div style={{ height: `${virtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
                  {virtualizer.getVirtualItems().map((virtualRow) => {
                    const task = filteredTasks[virtualRow.index];
                    return (
                      <div
                        key={task.id}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: `${virtualRow.size}px`,
                          transform: `translateY(${virtualRow.start}px)`,
                        }}
                      >
                        <SortableTaskRow
                          task={task}
                          allTags={allTags}
                          isSelected={selectedTaskId === task.id}
                          onSelect={() => setSelectedTaskId(selectedTaskId === task.id ? null : task.id)}
                          onToggle={() => handleToggleTask(task.id, task.isCompleted)}
                          onEdit={() => { setEditingTask(task); setShowTaskForm(true); }}
                          onDelete={() => handleDeleteTask(task.id)}
                        />
                      </div>
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
        )}
      </div>

      {/* Task Detail Panel */}
      {selectedTask && (
        <div className="w-1/2 overflow-hidden">
          <TaskDetailPanel
            task={selectedTask}
            allTags={allTags}
            onClose={() => setSelectedTaskId(null)}
            onEdit={() => {
              setEditingTask(selectedTask);
              setShowTaskForm(true);
            }}
            onDelete={() => handleDeleteTask(selectedTask.id)}
            onUpdateTask={handleUpdateTaskField}
          />
        </div>
      )}

      {/* Task Form Dialog */}
      <TaskForm
        isOpen={showTaskForm}
        onClose={() => {
          setShowTaskForm(false);
          setEditingTask(null);
        }}
        onSubmit={editingTask ? handleUpdateTask : handleCreateTask}
        task={editingTask}
      />
    </div>
  );
}
