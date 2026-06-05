import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { PRIORITY_COLORS } from '@/lib/constants';
import type { Task, Priority } from '@/types/task';
import type { Tag } from '@/types/tag';

interface KanbanViewProps {
  tasks: Task[];
  allTags: Tag[];
  selectedTaskId: string | null;
  onSelectTask: (id: string | null) => void;
  onToggleTask: (id: string, isCompleted: boolean) => void;
  onUpdateTask: (id: string, params: any) => void;
}

const PRIORITY_KEYS = ['none', 'low', 'medium', 'high'] as const;
const PRIORITY_VALUES: Priority[] = [0, 1, 2, 3];

export default function KanbanView({
  tasks, allTags, selectedTaskId, onSelectTask, onToggleTask, onUpdateTask,
}: KanbanViewProps) {
  const { t } = useTranslation('common');

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
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId) {
      const task = tasks.find((t) => t.id === taskId);
      if (task && task.priority !== targetPriority) {
        onUpdateTask(taskId, { priority: targetPriority });
      }
    }
  };

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="grid grid-cols-4 gap-4 h-full min-h-0">
        {PRIORITY_VALUES.map((priority) => {
          const colTasks = columns.get(priority) || [];
          const key = PRIORITY_KEYS[priority];
          const color = PRIORITY_COLORS[priority];

          return (
            <div
              key={priority}
              className="flex flex-col bg-gray-50 dark:bg-gray-900 rounded-xl overflow-hidden"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, priority)}
            >
              {/* Column header */}
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
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
                {colTasks.map((task) => {
                  const taskTagIds: string[] =
                    task.tagIds && task.tagIds.length > 0
                      ? task.tagIds.split(',').filter(Boolean)
                      : [];
                  const taskTags = allTags.filter((tag) => taskTagIds.includes(tag.id));

                  return (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      onClick={() => onSelectTask(selectedTaskId === task.id ? null : task.id)}
                      className={`bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow ${
                        selectedTaskId === task.id ? 'ring-2 ring-blue-500' : ''
                      } ${task.isCompleted ? 'opacity-60' : ''}`}
                    >
                      <div className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          checked={task.isCompleted}
                          onChange={(e) => { e.stopPropagation(); onToggleTask(task.id, task.isCompleted); }}
                          onClick={(e) => e.stopPropagation()}
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
                            <p className="text-xs text-gray-500 mt-1 truncate">{task.description}</p>
                          )}
                          {task.dueDate && (
                            <div className="flex items-center gap-1 mt-2 text-xs text-gray-400 dark:text-gray-500">
                              <span>{new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                              {task.dueTime && <span>{task.dueTime.slice(0, 5)}</span>}
                            </div>
                          )}
                          {taskTags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {taskTags.slice(0, 3).map((tag) => (
                                <span
                                  key={tag.id}
                                  className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] text-white"
                                  style={{ backgroundColor: tag.color || '#3B82F6' }}
                                >
                                  {tag.emoji && <span className="mr-0.5">{tag.emoji}</span>}
                                  {tag.name}
                                </span>
                              ))}
                              {taskTags.length > 3 && (
                                <span className="text-[10px] text-gray-400 dark:text-gray-500">+{taskTags.length - 3}</span>
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
