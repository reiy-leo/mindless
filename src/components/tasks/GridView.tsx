import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { PencilIcon, TrashIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { PRIORITY_COLORS, PRIORITY_COLOR_FALLBACK } from '@/lib/constants';
import { getTaskTags, parseLocalDate } from '@/lib/taskHelpers';
import type { Task, Priority } from '@/types/task';
import type { Tag } from '@/types/tag';

interface GridViewProps {
  tasks: Task[];
  allTags: Tag[];
  selectedTaskId: string | null;
  onSelectTask: (id: string | null) => void;
  onToggleTask: (id: string, isCompleted: boolean) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
}

export default function GridView({
  tasks, allTags, selectedTaskId, onSelectTask, onToggleTask, onEditTask, onDeleteTask,
}: GridViewProps) {
  const { t } = useTranslation('common');

  // Sort: incomplete first, then by priority desc, then by due date
  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
      if (b.priority !== a.priority) return b.priority - a.priority;
      if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return 0;
    });
  }, [tasks]);

  const getPriorityLabel = (priority: Priority) => {
    const keys = ['none', 'low', 'medium', 'high'] as const;
    return t(`tasks.priority.${keys[priority]}`);
  };

  // Empty state
  if (sortedTasks.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
        <p className="text-lg">{t('tasks.no_tasks')}</p>
        <p className="text-sm mt-2">{t('tasks.create_first')}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {sortedTasks.map((task) => {
          const taskTags = getTaskTags(task, allTags);
          const isSelected = selectedTaskId === task.id;

          return (
            <div
              key={task.id}
              onClick={() => onSelectTask(isSelected ? null : task.id)}
              className={`group bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 cursor-pointer hover:shadow-md transition-all ${
                isSelected ? 'ring-2 ring-blue-500' : ''
              } ${task.isCompleted ? 'opacity-60' : ''}`}
            >
              {/* Header: checkbox + priority + actions */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); onToggleTask(task.id, task.isCompleted); }}
                    className="flex-shrink-0"
                  >
                    {task.isCompleted ? (
                      <CheckCircleIcon className="w-5 h-5 text-green-500" />
                    ) : (
                      <span className="block w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600 hover:border-blue-400 transition-colors" />
                    )}
                  </button>
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: PRIORITY_COLORS[task.priority] ?? PRIORITY_COLOR_FALLBACK }}
                    title={getPriorityLabel(task.priority)}
                  />
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                  <button
                    onClick={(e) => { e.stopPropagation(); onEditTask(task); }}
                    className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    title={t('common.edit')}
                  >
                    <PencilIcon className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDeleteTask(task.id); }}
                    className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    title={t('common.delete')}
                  >
                    <TrashIcon className="w-3.5 h-3.5 text-red-400" />
                  </button>
                </div>
              </div>

              {/* Title */}
              <h3 className={`text-sm font-medium mb-1 ${
                task.isCompleted
                  ? 'line-through text-gray-400 dark:text-gray-500'
                  : 'text-gray-900 dark:text-gray-100'
              }`}>
                {task.title}
              </h3>

              {/* Description */}
              {task.description && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">{task.description}</p>
              )}

              {/* Due date */}
              {task.dueDate && (
                <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 mb-2">
                  <span>{parseLocalDate(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                  {task.dueTime && <span className="text-gray-300 dark:text-gray-600">&middot;</span>}
                  {task.dueTime && <span>{task.dueTime.slice(0, 5)}</span>}
                </div>
              )}

              {/* Tags */}
              {taskTags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-auto">
                  {taskTags.slice(0, 4).map((tag) => (
                    <span
                      key={tag.id}
                      className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs text-white"
                      style={{ backgroundColor: tag.color || '#3B82F6' }}
                    >
                      {tag.emoji && <span className="mr-0.5">{tag.emoji}</span>}
                      {tag.name}
                    </span>
                  ))}
                  {taskTags.length > 4 && (
                    <span className="text-xs text-gray-400 dark:text-gray-500">+{taskTags.length - 4}</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
