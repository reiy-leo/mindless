import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { getTaskTags } from '@/lib/taskHelpers';
import { useAppStore } from '@/stores/useAppStore';
import { formatDisplayDate, formatTime } from '@/lib/formatUtils';
import type { Task, TaskStatus, UpdateTaskParams } from '@/types/task';
import type { Tag } from '@/types/tag';

interface KanbanViewProps {
  tasks: Task[];
  allTags: Tag[];
  selectedTaskId: string | null;
  onSelectTask: (id: string | null) => void;
  onToggleTask: (id: string, isCompleted: boolean) => void;
  onUpdateTask: (id: string, params: Partial<UpdateTaskParams>) => void;
}

const STATUS_COLUMNS: { key: TaskStatus; color: string }[] = [
  { key: 'pending', color: '#9CA3AF' },
  { key: 'in_progress', color: '#3B82F6' },
  { key: 'today', color: '#F59E0B' },
  { key: 'completed', color: '#10B981' },
  { key: 'closed', color: '#6B7280' },
];

export default function KanbanView({
  tasks, allTags, selectedTaskId, onSelectTask, onToggleTask, onUpdateTask,
}: KanbanViewProps) {
  const { t } = useTranslation('common');
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);
  const dateFormat = useAppStore((s) => s.dateFormat);
  const timeFormat = useAppStore((s) => s.timeFormat);

  const columns = useMemo(() => {
    const cols: Map<TaskStatus, Task[]> = new Map();
    STATUS_COLUMNS.forEach((s) => cols.set(s.key, []));
    tasks.forEach((task) => {
      const status = task.status || 'pending';
      const col = cols.get(status);
      if (col) col.push(task);
    });
    cols.forEach((col) => {
      col.sort((a, b) => {
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

  const handleDrop = (e: React.DragEvent, targetStatus: TaskStatus) => {
    e.preventDefault();
    setDragOverColumn(null);
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId) {
      const task = tasks.find((tk) => tk.id === taskId);
      if (task && (task.status || 'pending') !== targetStatus) {
        onUpdateTask(taskId, { status: targetStatus });
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, task: Task) => {
    const currentIdx = STATUS_COLUMNS.findIndex((s) => s.key === (task.status || 'pending'));
    if (e.key === 'ArrowRight' && currentIdx < STATUS_COLUMNS.length - 1) {
      onUpdateTask(task.id, { status: STATUS_COLUMNS[currentIdx + 1].key });
    }
    if (e.key === 'ArrowLeft' && currentIdx > 0) {
      onUpdateTask(task.id, { status: STATUS_COLUMNS[currentIdx - 1].key });
    }
  };

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
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 h-full min-h-0">
        {STATUS_COLUMNS.map((col) => {
          const colTasks = columns.get(col.key) || [];
          const isDragOver = dragOverColumn === col.key;

          return (
            <div
              key={col.key}
              className={`flex flex-col rounded-xl overflow-hidden transition-all ${
                isDragOver
                  ? 'bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-300 dark:ring-blue-700'
                  : 'bg-gray-50 dark:bg-gray-900'
              }`}
              onDragOver={handleDragOver}
              onDragEnter={() => setDragOverColumn(col.key)}
              onDragLeave={() => setDragOverColumn(null)}
              onDrop={(e) => handleDrop(e, col.key)}
            >
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: col.color }} />
                  <h3 className="font-medium text-sm text-gray-900 dark:text-gray-100">
                    {t(`tasks.status.${col.key}`)}
                  </h3>
                  <span className="ml-auto text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                    {colTasks.length}
                  </span>
                </div>
              </div>

              <div className="flex-1 overflow-auto p-2 space-y-2">
                {colTasks.length === 0 && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-8">
                    {t('tasks.views.empty_column')}
                  </p>
                )}
                {colTasks.map((task) => {
                  const taskTags = getTaskTags(task, allTags);
                  const isDone = task.status === 'completed' || task.status === 'closed';

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
                      } ${isDone ? 'opacity-60' : ''}`}
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
                            isDone
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
