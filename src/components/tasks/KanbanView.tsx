import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { PRIORITY_COLORS, PRIORITY_COLOR_FALLBACK } from '@/lib/constants';
import { getTaskTags } from '@/lib/taskHelpers';
import { useAppStore } from '@/stores/useAppStore';
import { formatDisplayDate, formatTime } from '@/lib/formatUtils';
import type { Task, Priority, UpdateTaskParams } from '@/types/task';
import type { Tag } from '@/types/tag';

interface KanbanViewProps {
  tasks: Task[];
  allTags: Tag[];
  selectedTaskId: string | null;
  onSelectTask: (id: string | null) => void;
  onToggleTask: (id: string, isCompleted: boolean) => void;
  onUpdateTask: (id: string, params: Partial<UpdateTaskParams>) => void;
}

const PRIORITY_KEYS = ['none', 'low', 'medium', 'high'] as const;
const PRIORITY_VALUES: Priority[] = [0, 1, 2, 3];

export default function KanbanView({
  tasks, allTags, selectedTaskId, onSelectTask, onToggleTask, onUpdateTask,
}: KanbanViewProps) {
  const { t } = useTranslation('common');
  const [dragOverColumn, setDragOverColumn] = useState<Priority | null>(null);
  const dateFormat = useAppStore((s) => s.dateFormat);
  const timeFormat = useAppStore((s) => s.timeFormat);

  // Group tasks by priority
  const columns = useMemo(() => {
    const cols: Map<Priority, Task[]> = new Map();
    PRIORITY_VALUES.forEach((p) => cols.set(p, []));
    tasks.forEach((task) => {
      const col = cols.get(task.priority);
      if (col) col.push(task);
    });
    // Sort within each column: incomplete first, then by dueDate
    cols.forEach((col) => {
      col.sort((a, b) => {
        if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
        if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
        if (a.dueDate) return -1;
        if (b.dueDate) return 1;
        return 0;
      });
    });
    return cols;
  }, [tasks]);

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetPriority: Priority) => {
    e.preventDefault();
    setDragOverColumn(null);
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId) {
      const task = tasks.find((tk) => tk.id === taskId);
      if (task && task.priority !== targetPriority) {
        onUpdateTask(taskId, { priority: targetPriority });
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, task: Task) => {
    if (e.key === 'ArrowRight' && task.priority < 3) {
      onUpdateTask(task.id, { priority: (task.priority + 1) as Priority });
    }
    if (e.key === 'ArrowLeft' && task.priority > 0) {
      onUpdateTask(task.id, { priority: (task.priority - 1) as Priority });
    }
  };

  // Empty state
  if (tasks.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
        <p className="text-lg">{t('tasks.no_tasks')}</p>
        <p className="text-sm mt-2">{t('tasks.create_first')}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 h-full min-h-0">
        {PRIORITY_VALUES.map((priority) => {
          const colTasks = columns.get(priority) || [];
          const key = PRIORITY_KEYS[priority];
          const color = PRIORITY_COLORS[priority] ?? PRIORITY_COLOR_FALLBACK;
          const isDragOver = dragOverColumn === priority;

          return (
            <div
              key={priority}
              className={`flex flex-col rounded-xl overflow-hidden transition-all ${
                isDragOver
                  ? 'bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-300 dark:ring-blue-700'
                  : 'bg-gray-50 dark:bg-gray-900'
              }`}
              onDragOver={handleDragOver}
              onDragEnter={() => setDragOverColumn(priority)}
              onDragLeave={() => setDragOverColumn(null)}
              onDrop={(e) => handleDrop(e, priority)}
            >
              {/* Column header */}
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                <div className="flex items-center gap-2">
                  <div role="img" aria-label={t(`tasks.priority.${key}`)} className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                  <h3 className="font-medium text-sm text-gray-900 dark:text-gray-100">
                    {t(`tasks.priority.${key}`)}
                  </h3>
                  <span className="ml-auto text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                    {colTasks.length}
                  </span>
                </div>
              </div>

              {/* Column body */}
              <div className="flex-1 overflow-auto p-2 space-y-2">
                {colTasks.length === 0 && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-8">
                    {t('tasks.views.empty_column')}
                  </p>
                )}
                {colTasks.map((task) => {
                  const taskTags = getTaskTags(task, allTags);

                  return (
                    <div
                      key={task.id}
                      draggable
                      role="button"
                      tabIndex={0}
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      onDragEnd={() => setDragOverColumn(null)}
                      onClick={() => onSelectTask(selectedTaskId === task.id ? null : task.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectTask(selectedTaskId === task.id ? null : task.id); }
                        handleKeyDown(e, task);
                      }}
                      className={`bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                        selectedTaskId === task.id ? 'ring-2 ring-blue-500' : ''
                      } ${task.isCompleted ? 'opacity-60' : ''}`}
                      title={t('tasks.views.kanban_hint')}
                    >
                      <div className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          checked={task.isCompleted}
                          onChange={(e) => { e.stopPropagation(); onToggleTask(task.id, task.isCompleted); }}
                          onClick={(e) => e.stopPropagation()}
                          aria-label={t('tasks.views.toggle_complete', { title: task.title })}
                          className="w-4 h-4 mt-0.5 rounded border-gray-300 dark:border-gray-600 text-blue-500 flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className={`text-sm truncate ${
                            task.isCompleted
                              ? 'line-through text-gray-400 dark:text-gray-500'
                              : 'text-gray-900 dark:text-gray-100'
                          }`}>
                            {task.title}
                          </h4>
                          {task.description && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">{task.description}</p>
                          )}
                          {task.dueDate && (
                            <div className="flex items-center gap-1 mt-2 text-xs text-gray-400 dark:text-gray-500">
                              <span>{formatDisplayDate(task.dueDate, dateFormat, t)}</span>
                              {task.dueTime && <span>{formatTime(task.dueTime, timeFormat)}</span>}
                            </div>
                          )}
                          {taskTags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {taskTags.slice(0, 3).map((tag) => (
                                <span
                                  key={tag.id}
                                  className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs text-white"
                                  style={{ backgroundColor: tag.color || '#3B82F6' }}
                                >
                                  {tag.emoji && <span className="mr-0.5">{tag.emoji}</span>}
                                  {tag.name}
                                </span>
                              ))}
                              {taskTags.length > 3 && (
                                <span className="text-xs text-gray-400 dark:text-gray-500">+{taskTags.length - 3}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
