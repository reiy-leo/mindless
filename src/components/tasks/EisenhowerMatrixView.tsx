import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { getTaskTags, parseLocalDate, getLocalToday } from '@/lib/taskHelpers';
import { PRIORITY_COLORS, PRIORITY_COLOR_FALLBACK } from '@/lib/constants';
import type { Task, Priority, UpdateTaskParams } from '@/types/task';
import type { Tag } from '@/types/tag';

interface EisenhowerMatrixViewProps {
  tasks: Task[];
  allTags: Tag[];
  selectedTaskId: string | null;
  onSelectTask: (id: string | null) => void;
  onToggleTask: (id: string, isCompleted: boolean) => void;
  onUpdateTask: (id: string, params: Partial<UpdateTaskParams>) => void;
}

type Quadrant = 'q1' | 'q2' | 'q3' | 'q4';

const URGENCY_DAYS = 3;

function classifyTask(task: Task, todayStr: string): Quadrant {
  const today = parseLocalDate(todayStr);
  const isImportant = task.priority >= 2; // medium or high

  let isUrgent = false;
  if (task.dueDate) {
    const due = parseLocalDate(task.dueDate);
    const diffMs = due.getTime() - today.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    isUrgent = diffDays <= URGENCY_DAYS; // overdue or due within 3 days
  }

  if (isUrgent && isImportant) return 'q1';
  if (!isUrgent && isImportant) return 'q2';
  if (isUrgent && !isImportant) return 'q3';
  return 'q4';
}

interface QuadrantConfig {
  key: Quadrant;
  labelKey: string;
  hintKey: string;
  headerBg: string;
  headerText: string;
  accentColor: string;
  ringColor: string;
  bodyBg: string;
  bodyBgDark: string;
}

const QUADRANT_CONFIGS: QuadrantConfig[] = [
  {
    key: 'q1',
    labelKey: 'tasks.matrix.do_first',
    hintKey: 'tasks.matrix.do_first_hint',
    headerBg: 'bg-red-500',
    headerText: 'text-white',
    accentColor: '#EF4444',
    ringColor: 'ring-red-300 dark:ring-red-700',
    bodyBg: 'bg-red-50',
    bodyBgDark: 'dark:bg-red-950/20',
  },
  {
    key: 'q2',
    labelKey: 'tasks.matrix.schedule',
    hintKey: 'tasks.matrix.schedule_hint',
    headerBg: 'bg-blue-500',
    headerText: 'text-white',
    accentColor: '#3B82F6',
    ringColor: 'ring-blue-300 dark:ring-blue-700',
    bodyBg: 'bg-blue-50',
    bodyBgDark: 'dark:bg-blue-950/20',
  },
  {
    key: 'q3',
    labelKey: 'tasks.matrix.delegate',
    hintKey: 'tasks.matrix.delegate_hint',
    headerBg: 'bg-amber-500',
    headerText: 'text-white',
    accentColor: '#F59E0B',
    ringColor: 'ring-amber-300 dark:ring-amber-700',
    bodyBg: 'bg-amber-50',
    bodyBgDark: 'dark:bg-amber-950/20',
  },
  {
    key: 'q4',
    labelKey: 'tasks.matrix.eliminate',
    hintKey: 'tasks.matrix.eliminate_hint',
    headerBg: 'bg-gray-400',
    headerText: 'text-white',
    accentColor: '#9CA3AF',
    ringColor: 'ring-gray-300 dark:ring-gray-600',
    bodyBg: 'bg-gray-50',
    bodyBgDark: 'dark:bg-gray-900/40',
  },
];

export default function EisenhowerMatrixView({
  tasks, allTags, selectedTaskId, onSelectTask, onToggleTask, onUpdateTask,
}: EisenhowerMatrixViewProps) {
  const { t } = useTranslation('common');
  const [dragOverQuadrant, setDragOverQuadrant] = useState<Quadrant | null>(null);

  const todayStr = getLocalToday();

  // Classify tasks into quadrants
  const quadrants = useMemo(() => {
    const map = new Map<Quadrant, Task[]>();
    map.set('q1', []);
    map.set('q2', []);
    map.set('q3', []);
    map.set('q4', []);

    tasks.forEach((task) => {
      if (task.isCompleted) return; // Hide completed tasks in matrix
      const q = classifyTask(task, todayStr);
      map.get(q)!.push(task);
    });

    // Sort: by due date ascending within each quadrant
    map.forEach((list) => {
      list.sort((a, b) => {
        if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
        if (a.dueDate) return -1;
        if (b.dueDate) return 1;
        return b.priority - a.priority; // Higher priority first when no dates
      });
    });

    return map;
  }, [tasks, todayStr]);

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetQuadrant: Quadrant) => {
    e.preventDefault();
    setDragOverQuadrant(null);
    const taskId = e.dataTransfer.getData('text/plain');
    if (!taskId) return;

    const task = tasks.find((tk) => tk.id === taskId);
    if (!task) return;

    const currentQuadrant = classifyTask(task, todayStr);
    if (currentQuadrant === targetQuadrant) return;

    // Determine what fields to update based on target quadrant
    const updates: Partial<UpdateTaskParams> = {};

    switch (targetQuadrant) {
      case 'q1': // Urgent & Important
        updates.priority = 3 as Priority; // high
        if (!task.dueDate || parseLocalDate(task.dueDate) > addDays(todayStr, URGENCY_DAYS)) {
          updates.dueDate = todayStr;
        }
        break;
      case 'q2': // Important, Not Urgent
        if (task.priority < 2) updates.priority = 2 as Priority; // at least medium
        if (task.dueDate && parseLocalDate(task.dueDate) <= addDays(todayStr, URGENCY_DAYS)) {
          // Move due date out to make it not urgent
          updates.dueDate = formatDate(addDays(todayStr, URGENCY_DAYS + 1));
        }
        break;
      case 'q3': // Urgent, Not Important
        updates.priority = 1 as Priority; // low
        if (!task.dueDate || parseLocalDate(task.dueDate) > addDays(todayStr, URGENCY_DAYS)) {
          updates.dueDate = todayStr;
        }
        break;
      case 'q4': // Not Urgent, Not Important
        updates.priority = 0 as Priority; // none
        if (task.dueDate && parseLocalDate(task.dueDate) <= addDays(todayStr, URGENCY_DAYS)) {
          updates.dueDate = undefined; // Clear urgent due date
        }
        break;
    }

    if (Object.keys(updates).length > 0) {
      onUpdateTask(taskId, updates);
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
    <div className="flex-1 overflow-auto p-4 md:p-6">
      {/* Axis labels */}
      <div className="mb-2 flex items-center justify-between px-2 text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">
        <span>{t('tasks.matrix.urgent')}</span>
        <span>{t('tasks.matrix.not_urgent')}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 min-h-0" style={{ minHeight: 'calc(100% - 2rem)' }}>
        {QUADRANT_CONFIGS.map((config) => {
          const qTasks = quadrants.get(config.key) || [];
          const isDragOver = dragOverQuadrant === config.key;

          return (
            <div
              key={config.key}
              className={`flex flex-col rounded-xl overflow-hidden transition-all ${
                isDragOver
                  ? `${config.bodyBg} ${config.bodyBgDark} ring-2 ${config.ringColor}`
                  : `${config.bodyBg} ${config.bodyBgDark}`
              }`}
              onDragOver={handleDragOver}
              onDragEnter={() => setDragOverQuadrant(config.key)}
              onDragLeave={() => setDragOverQuadrant(null)}
              onDrop={(e) => handleDrop(e, config.key)}
            >
              {/* Quadrant header */}
              <div className={`${config.headerBg} ${config.headerText} px-4 py-2.5 flex items-center justify-between`}>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm">{t(config.labelKey)}</h3>
                  <span className="text-xs opacity-80 bg-white/20 px-2 py-0.5 rounded-full">
                    {qTasks.length}
                  </span>
                </div>
                <span className="text-xs opacity-75 hidden sm:inline">
                  {t(config.hintKey)}
                </span>
              </div>

              {/* Quadrant body */}
              <div className="flex-1 overflow-auto p-2 space-y-1.5">
                {qTasks.length === 0 && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-8 italic">
                    {t('tasks.views.empty_column')}
                  </p>
                )}
                {qTasks.map((task) => {
                  const taskTags = getTaskTags(task, allTags);
                  const priorityColor = PRIORITY_COLORS[task.priority] ?? PRIORITY_COLOR_FALLBACK;

                  return (
                    <div
                      key={task.id}
                      draggable
                      role="button"
                      tabIndex={0}
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      onDragEnd={() => setDragOverQuadrant(null)}
                      onClick={() => onSelectTask(selectedTaskId === task.id ? null : task.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onSelectTask(selectedTaskId === task.id ? null : task.id);
                        }
                      }}
                      className={`bg-white dark:bg-gray-800 rounded-lg p-2.5 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                        selectedTaskId === task.id ? 'ring-2 ring-blue-500' : ''
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          checked={false}
                          onChange={(e) => { e.stopPropagation(); onToggleTask(task.id, task.isCompleted); }}
                          onClick={(e) => e.stopPropagation()}
                          aria-label={t('tasks.views.toggle_complete', { title: task.title })}
                          className="w-4 h-4 mt-0.5 rounded border-gray-300 dark:border-gray-600 text-blue-500 flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm text-gray-900 dark:text-gray-100 truncate">
                            {task.title}
                          </h4>
                          {task.description && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{task.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            {task.dueDate && (
                              <span className={`text-xs flex items-center gap-1 ${
                                isOverdue(task.dueDate, todayStr)
                                  ? 'text-red-500 dark:text-red-400 font-medium'
                                  : 'text-gray-400 dark:text-gray-500'
                              }`}>
                                {parseLocalDate(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                {task.dueTime && <span>{task.dueTime.slice(0, 5)}</span>}
                              </span>
                            )}
                            {task.priority > 0 && (
                              <span
                                className="w-2 h-2 rounded-full flex-shrink-0"
                                style={{ backgroundColor: priorityColor }}
                                title={t(`tasks.priority.${['none', 'low', 'medium', 'high'][task.priority]}`)}
                              />
                            )}
                            {taskTags.slice(0, 2).map((tag) => (
                              <span
                                key={tag.id}
                                className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] text-white"
                                style={{ backgroundColor: tag.color || '#3B82F6' }}
                              >
                                {tag.emoji && <span className="mr-0.5">{tag.emoji}</span>}
                                {tag.name}
                              </span>
                            ))}
                            {taskTags.length > 2 && (
                              <span className="text-[10px] text-gray-400 dark:text-gray-500">+{taskTags.length - 2}</span>
                            )}
                          </div>
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

      {/* Bottom axis labels */}
      <div className="mt-2 flex items-center justify-between px-2 text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">
        <span>{t('tasks.matrix.important')}</span>
        <span>{t('tasks.matrix.not_important')}</span>
      </div>
    </div>
  );
}

// ==================== Helpers ====================

function addDays(dateStr: string, days: number): Date {
  const d = parseLocalDate(dateStr);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function isOverdue(dueDateStr: string, todayStr: string): boolean {
  return dueDateStr < todayStr;
}
