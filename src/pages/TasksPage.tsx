import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { PlusIcon, FunnelIcon, PencilIcon, TrashIcon, XMarkIcon, TagIcon } from '@heroicons/react/24/outline';
import {
  useTasks, useCreateTask, useUpdateTask, useDeleteTask,
  useToggleTaskCompletion, useTags, useSubtasks, useSteps, useLists,
  useCreateSubtask, useUpdateSubtask, useDeleteSubtask,
  useCreateStep, useUpdateStep, useDeleteStep,
  useCreateTag,
} from '@/queries/useTaskQueries';
import { useViewStore } from '@/stores/useViewStore';
import { PRIORITY_COLORS, PRIORITY_COLOR_FALLBACK, VIEW_MODES } from '@/lib/constants';
import { getTaskTags, parseLocalDate } from '@/lib/taskHelpers';
import TaskForm from '@/components/tasks/TaskForm';
import SubtaskList from '@/components/tasks/SubtaskList';
import StepList from '@/components/tasks/StepList';
import CalendarView from '@/components/tasks/CalendarView';
import KanbanView from '@/components/tasks/KanbanView';
import GridView from '@/components/tasks/GridView';
import EisenhowerMatrixView from '@/components/tasks/EisenhowerMatrixView';
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

  const [showTagInput, setShowTagInput] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3B82F6');

  const subtaskTree = useMemo(() => buildSubtaskTree(flatSubtasks), [flatSubtasks]);

  // Parse task's tag_ids (comma-separated string)
  const taskTagIds: string[] = useMemo(() => {
    if (!task.tagIds || task.tagIds.length === 0) return [];
    return task.tagIds.split(',').filter(Boolean);
  }, [task.tagIds]);

  const taskTags = useMemo(() => {
    return allTags.filter((tag) => taskTagIds.includes(tag.id));
  }, [allTags, taskTagIds]);

  const handleAddSubtask = (parentSubtaskId?: string) => {
    const level = parentSubtaskId
      ? (flatSubtasks.find((s) => s.id === parentSubtaskId)?.level ?? 0) + 1
      : 0;
    const title = window.prompt(t('tasks.subtasks.add'));
    if (title?.trim()) {
      createSubtask.mutate({ taskId: task.id, title: title.trim(), parentSubtaskId, level });
    }
  };

  const handleToggleSubtask = (id: string) => {
    const subtask = flatSubtasks.find((s) => s.id === id);
    if (subtask) {
      updateSubtask.mutate({ id, taskId: task.id, isCompleted: !subtask.isCompleted });
    }
  };

  const handleDeleteSubtask = (id: string) => {
    deleteSubtask.mutate({ id, taskId: task.id });
  };

  const handleUpdateSubtaskTitle = (id: string, title: string) => {
    updateSubtask.mutate({ id, taskId: task.id, title });
  };

  const handleAddStep = () => {
    const description = window.prompt(t('tasks.steps.add'));
    if (description?.trim()) {
      createStep.mutate({ taskId: task.id, description: description.trim() });
    }
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

  const handleCreateAndAssignTag = () => {
    if (!newTagName.trim()) return;
    createTag.mutate(
      { name: newTagName.trim(), color: newTagColor },
      {
        onSuccess: (newTag) => {
          const currentIds = [...taskTagIds, newTag.id];
          onUpdateTask({ tagIds: currentIds.join(',') });
          setNewTagName('');
          setShowTagInput(false);
        },
      }
    );
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
            <TrashIcon className="w-4 h-4 text-red-500" />
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title={t('common.close')}
          >
            <XMarkIcon className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Detail Content */}
      <div className="flex-1 overflow-auto p-4 space-y-6">
        {/* Description */}
        {task.description && (
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">{t('tasks.description')}</h3>
            <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{task.description}</p>
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
          {task.startDate && (
            <div className="text-gray-600 dark:text-gray-400">
              {t('tasks.start_date')}: {parseLocalDate(task.startDate).toLocaleDateString()}
            </div>
          )}
        </div>

        {/* Tags */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
              <TagIcon className="w-4 h-4" />
              {t('tasks.tags.title')}
            </h3>
            <button
              onClick={() => setShowTagInput(!showTagInput)}
              className="text-xs text-blue-600 hover:text-blue-700"
            >
              {t('tasks.tags.add')}
            </button>
          </div>

          {/* Tag chips */}
          <div className="flex flex-wrap gap-2 mb-2">
            {taskTags.length === 0 && (
              <span className="text-xs text-gray-400 dark:text-gray-500 italic">{t('tasks.tags.empty')}</span>
            )}
            {taskTags.map((tag) => (
              <span
                key={tag.id}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs text-white cursor-pointer"
                style={{ backgroundColor: tag.color || '#3B82F6' }}
                onClick={() => handleToggleTag(tag.id)}
                title={t('tasks.tags.click_to_remove')}
              >
                {tag.emoji && <span>{tag.emoji}</span>}
                {tag.name}
                <XMarkIcon className="w-3 h-3 opacity-60" />
              </span>
            ))}
          </div>

          {/* Available tags to assign */}
          {allTags.filter((tg) => !taskTagIds.includes(tg.id)).length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {allTags
                .filter((tg) => !taskTagIds.includes(tg.id))
                .map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => handleToggleTag(tag.id)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-blue-400 hover:text-blue-600 transition-colors"
                  >
                    {tag.emoji && <span>{tag.emoji}</span>}
                    + {tag.name}
                  </button>
                ))}
            </div>
          )}

          {/* New tag creation */}
          {showTagInput && (
            <div className="flex items-center gap-2 mt-2">
              <input
                type="color"
                value={newTagColor}
                onChange={(e) => setNewTagColor(e.target.value)}
                className="w-8 h-8 rounded cursor-pointer border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              />
              <input
                type="text"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder={t('tasks.tags.name_placeholder')}
                className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateAndAssignTag();
                  if (e.key === 'Escape') setShowTagInput(false);
                }}
              />
              <button
                onClick={handleCreateAndAssignTag}
                className="px-2 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                {t('common.add')}
              </button>
            </div>
          )}
        </div>

        {/* Subtasks */}
        <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
          <SubtaskList
            subtasks={subtaskTree}
            onAdd={handleAddSubtask}
            onToggle={handleToggleSubtask}
            onDelete={handleDeleteSubtask}
            onUpdateTitle={handleUpdateSubtaskTitle}
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
          />
        </div>
      </div>
    </div>
  );
}

// ==================== Main Page ====================
export default function TasksPage() {
  const { t } = useTranslation('common');
  const { viewMode, filterStatus, searchQuery, selectedListId, setViewMode, setFilterStatus, setSearchQuery } = useViewStore();
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

  const selectedTask = useMemo(
    () => tasks.find((task) => task.id === selectedTaskId) || null,
    [tasks, selectedTaskId]
  );

  // Filter and search tasks
  const filteredTasks = tasks.filter((task) => {
    if (filterStatus === 'active' && task.isCompleted) return false;
    if (filterStatus === 'completed' && !task.isCompleted) return false;
    if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;

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
  });

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
    startDate?: string;
    listId?: string;
  }) => {
    createTask.mutate(taskData, { onSuccess: closeForm });
  };

  const handleUpdateTask = (taskData: {
    title: string;
    description?: string;
    priority: Priority;
    dueDate?: string;
    dueTime?: string;
    startDate?: string;
    listId?: string;
  }) => {
    if (editingTask) {
      updateTask.mutate({ id: editingTask.id, ...taskData }, { onSuccess: closeForm });
    }
  };

  const handleToggleTask = (id: string, isCompleted: boolean) => {
    toggleTask.mutate({ id, isCompleted: !isCompleted });
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

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-500">{t('common.loading')}</div>
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

          {/* Search and filters */}
          <div className="flex items-center gap-4">
            <input
              type="text"
              placeholder={t('tasks.search_placeholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as 'all' | 'active' | 'completed')}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">{t('tasks.status.all')}</option>
              <option value="active">{t('tasks.status.active')}</option>
              <option value="completed">{t('tasks.status.completed')}</option>
            </select>
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
        ) : viewMode === 'grid' ? (
          <GridView
            tasks={filteredTasks}
            allTags={allTags}
            selectedTaskId={selectedTaskId}
            onSelectTask={(id) => setSelectedTaskId(id === selectedTaskId ? null : id)}
            onToggleTask={handleToggleTask}
            onEditTask={(task) => { setEditingTask(task); setShowTaskForm(true); }}
            onDeleteTask={handleDeleteTask}
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
        <div className="flex-1 overflow-auto p-6">
          {filteredTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <p className="text-lg">{t('tasks.no_tasks')}</p>
              <button
                onClick={() => {
                  setEditingTask(null);
                  setShowTaskForm(true);
                }}
                className="mt-4 text-blue-500 hover:text-blue-600"
              >
                {t('tasks.create_first')}
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTasks.map((task) => {
                const taskTags = getTaskTags(task, allTags);

                return (
                  <div
                    key={task.id}
                    onClick={() => setSelectedTaskId(selectedTaskId === task.id ? null : task.id)}
                    className={`group flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer ${
                      selectedTaskId === task.id ? 'ring-2 ring-blue-500' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={task.isCompleted}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleToggleTask(task.id, task.isCompleted);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="w-5 h-5 rounded border-gray-300 dark:border-gray-600 text-blue-500 focus:ring-blue-500"
                    />
                    <div className="flex-1 min-w-0">
                      <h3
                        className={`text-base truncate ${
                          task.isCompleted ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-gray-100'
                        }`}
                      >
                        {task.title}
                      </h3>
                      {task.description && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate">{task.description}</p>
                      )}
                      {/* Tag chips */}
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
                    {task.dueDate && (
                      <span className="text-sm text-gray-500 flex-shrink-0">
                        {parseLocalDate(task.dueDate).toLocaleDateString()}
                      </span>
                    )}
                    {/* Inline actions */}
                    <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingTask(task);
                          setShowTaskForm(true);
                        }}
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors opacity-0 group-hover:opacity-100"
                        title={t('common.edit')}
                      >
                        <PencilIcon className="w-4 h-4 text-gray-500" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTask(task.id);
                        }}
                        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors opacity-0 group-hover:opacity-100"
                        title={t('common.delete')}
                      >
                        <TrashIcon className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
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
