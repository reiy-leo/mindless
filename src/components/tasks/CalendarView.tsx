import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { PRIORITY_COLORS, PRIORITY_COLOR_FALLBACK } from '@/lib/constants';
import { getLocalToday } from '@/lib/taskHelpers';
import { getLunarDayStr, getLunarInfo } from '@/lib/lunar';
import { useCalendarEvents } from '@/queries/useTaskQueries';
import type { Task, CalendarEvent } from '@/types/task';
import type { Tag } from '@/types/tag';

interface CalendarViewProps {
  tasks: Task[];
  allTags: Tag[];
  selectedTaskId: string | null;
  onSelectTask: (id: string | null) => void;
  onToggleTask: (id: string, isCompleted: boolean) => void;
}

/** Classify lunar day string: festival, solar term, month start, or normal */
function classifyLunarStr(lunarStr: string): 'festival' | 'term' | 'month' | 'normal' {
  // Solar terms (24节气)
  const solarTerms = [
    '小寒', '大寒', '立春', '雨水', '惊蛰', '春分',
    '清明', '谷雨', '立夏', '小满', '芒种', '夏至',
    '小暑', '大暑', '立秋', '处暑', '白露', '秋分',
    '寒露', '霜降', '立冬', '小雪', '大雪', '冬至',
  ];
  if (solarTerms.includes(lunarStr)) return 'term';
  // Month names (初一 shows as month name like 正月, 二月, etc.)
  const monthNames = [
    '正月', '二月', '三月', '四月', '五月', '六月',
    '七月', '八月', '九月', '十月', '冬月', '腊月',
  ];
  if (monthNames.includes(lunarStr)) return 'month';
  // Known festivals (common ones returned by lunar-javascript)
  const knownFestivals = [
    '春节', '元宵节', '龙抬头', '上巳节', '端午节', '七夕节',
    '中元节', '中秋节', '重阳节', '腊八节', '除夕',
    '元旦', '妇女节', '植树节', '劳动节', '青年节', '儿童节',
    '建党节', '建军节', '教师节', '国庆节',
  ];
  if (knownFestivals.some((f) => lunarStr.includes(f))) return 'festival';
  return 'normal';
}

function getLunarColorClass(kind: 'festival' | 'term' | 'month' | 'normal', isToday: boolean): string {
  if (kind === 'festival') return 'text-red-500 dark:text-red-400';
  if (kind === 'term') return 'text-green-600 dark:text-green-400';
  if (kind === 'month') return 'text-orange-500 dark:text-orange-400 font-medium';
  if (isToday) return 'text-blue-400 dark:text-blue-500';
  return 'text-gray-400 dark:text-gray-500';
}

export default function CalendarView({
  tasks, allTags: _allTags, selectedTaskId, onSelectTask, onToggleTask,
}: CalendarViewProps) {
  const { t, i18n } = useTranslation('common');
  const [viewMonth, setViewMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const dayLabels = useMemo(() => [
    t('habits.calendar.sun'), t('habits.calendar.mon'), t('habits.calendar.tue'),
    t('habits.calendar.wed'), t('habits.calendar.thu'), t('habits.calendar.fri'),
    t('habits.calendar.sat'),
  ], [t]);

  // Group tasks by due date
  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    tasks.forEach((task) => {
      if (task.dueDate) {
        const existing = map.get(task.dueDate) || [];
        existing.push(task);
        map.set(task.dueDate, existing);
      }
    });
    return map;
  }, [tasks]);

  // Imported calendar events
  const { data: calendarEvents = [] } = useCalendarEvents();

  // Group calendar events by date
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    calendarEvents.forEach((ev: CalendarEvent) => {
      const existing = map.get(ev.eventDate) || [];
      existing.push(ev);
      map.set(ev.eventDate, existing);
    });
    return map;
  }, [calendarEvents]);

  // Memoize calendar computations
  const { daysInMonth, firstDayOfWeek, trailingEmpty, monthLabel, lunarYearLabel, today } = useMemo(() => {
    const daysInMonth = new Date(viewMonth.year, viewMonth.month + 1, 0).getDate();
    const firstDayOfWeek = new Date(viewMonth.year, viewMonth.month, 1).getDay();
    const totalCells = firstDayOfWeek + daysInMonth;
    const trailingEmpty = (7 - (totalCells % 7)) % 7;
    const monthLabel = new Date(viewMonth.year, viewMonth.month).toLocaleDateString(i18n.language, {
      year: 'numeric', month: 'long',
    });
    const today = getLocalToday();

    // Get lunar year label for the middle of the month (day 15) to avoid edge cases
    const midLunar = getLunarInfo(viewMonth.year, viewMonth.month + 1, 15);
    const lunarYearLabel = midLunar.yearStr;

    return { daysInMonth, firstDayOfWeek, trailingEmpty, monthLabel, lunarYearLabel, today };
  }, [viewMonth, i18n.language]);

  // Precompute lunar day strings for all days in the visible month
  const lunarDataByDay = useMemo(() => {
    const data: Map<number, { str: string; kind: 'festival' | 'term' | 'month' | 'normal' }> = new Map();
    for (let day = 1; day <= daysInMonth; day++) {
      const lunarStr = getLunarDayStr(viewMonth.year, viewMonth.month + 1, day);
      const kind = classifyLunarStr(lunarStr);
      data.set(day, { str: lunarStr, kind });
    }
    return data;
  }, [viewMonth.year, viewMonth.month, daysInMonth]);

  const prevMonth = () => {
    setViewMonth((v) =>
      v.month === 0 ? { year: v.year - 1, month: 11 } : { ...v, month: v.month - 1 }
    );
  };
  const nextMonth = () => {
    setViewMonth((v) =>
      v.month === 11 ? { year: v.year + 1, month: 0 } : { ...v, month: v.month + 1 }
    );
  };
  const goToday = () => {
    const now = new Date();
    setViewMonth({ year: now.getFullYear(), month: now.getMonth() });
  };

  // Tasks without due dates
  const noDueTasks = useMemo(() => tasks.filter((task) => !task.dueDate), [tasks]);

  // Check if visible month has any tasks
  const hasAnyTasks = tasksByDate.size > 0 || noDueTasks.length > 0;

  return (
    <div className="flex-1 overflow-auto p-6">
      {/* Calendar header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} aria-label={t('tasks.views.prev_month')} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <ChevronLeftIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <div className="min-w-[200px] text-center">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {monthLabel}
            </h2>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {lunarYearLabel}
            </span>
          </div>
          <button onClick={nextMonth} aria-label={t('tasks.views.next_month')} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <ChevronRightIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>
        <button
          onClick={goToday}
          className="px-3 py-1.5 text-sm rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
        >
          {t('tasks.views.today')}
        </button>
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        {/* Day labels */}
        {dayLabels.map((d) => (
          <div key={d} className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            {d}
          </div>
        ))}

        {/* Empty cells before first day */}
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} className="min-h-[110px] bg-gray-50/50 dark:bg-gray-900/50 border-b border-r border-gray-100 dark:border-gray-800" />
        ))}

        {/* Day cells */}
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
          const dateStr = `${viewMonth.year}-${String(viewMonth.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const dayTasks = tasksByDate.get(dateStr) || [];
          const dayEvents = eventsByDate.get(dateStr) || [];
          const isToday = dateStr === today;
          const lunarDay = lunarDataByDay.get(day);

          return (
            <div
              key={day}
              className={`min-h-[110px] border-b border-r border-gray-100 dark:border-gray-800 p-1 ${
                isToday ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
              }`}
            >
              {/* Date number + lunar day */}
              <div className="flex items-baseline gap-1.5 mb-1 px-1">
                <span className={`text-xs font-medium ${
                  isToday
                    ? 'text-blue-600 dark:text-blue-400 font-bold'
                    : 'text-gray-600 dark:text-gray-400'
                }`}>
                  {day}
                </span>
                {lunarDay && (
                  <span className={`text-[10px] leading-tight truncate ${getLunarColorClass(lunarDay.kind, isToday)}`}>
                    {lunarDay.str}
                  </span>
                )}
              </div>

              {/* Imported calendar events */}
              {dayEvents.length > 0 && (
                <div className="flex flex-wrap gap-0.5 mb-0.5 px-1">
                  {dayEvents.slice(0, 2).map((ev) => (
                    <span
                      key={ev.id}
                      className="inline-flex items-center gap-0.5 text-[10px] leading-tight px-1 py-px rounded truncate max-w-full"
                      style={{
                        backgroundColor: (ev.color || '#3B82F6') + '20',
                        color: ev.color || '#3B82F6',
                      }}
                      title={ev.title}
                    >
                      <span
                        className="w-1 h-1 rounded-full flex-shrink-0"
                        style={{ backgroundColor: ev.color || '#3B82F6' }}
                      />
                      {ev.title}
                    </span>
                  ))}
                  {dayEvents.length > 2 && (
                    <span className="text-[10px] text-gray-400 dark:text-gray-500">
                      +{dayEvents.length - 2}
                    </span>
                  )}
                </div>
              )}

              {/* Task list */}
              <div className="space-y-0.5">
                {dayTasks.slice(0, 3).map((task) => (
                  <div
                    key={task.id}
                    role="button"
                    tabIndex={0}
                    onClick={(e) => { e.stopPropagation(); onSelectTask(task.id); }}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectTask(task.id); } }}
                    className={`flex items-center gap-1 px-1 py-0.5 rounded text-xs cursor-pointer truncate transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 ${
                      selectedTaskId === task.id
                        ? 'ring-1 ring-blue-500 bg-blue-50 dark:bg-blue-900/30'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                    } ${task.isCompleted ? 'opacity-50' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={task.isCompleted}
                      onChange={(e) => { e.stopPropagation(); onToggleTask(task.id, task.isCompleted); }}
                      onClick={(e) => e.stopPropagation()}
                      aria-label={t('tasks.views.toggle_complete', { title: task.title })}
                      className="w-3 h-3 rounded border-gray-300 dark:border-gray-600 text-blue-500 flex-shrink-0"
                    />
                    <div
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: PRIORITY_COLORS[task.priority] ?? PRIORITY_COLOR_FALLBACK }}
                    />
                    <span className={`truncate ${task.isCompleted ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-300'}`}>
                      {task.title}
                    </span>
                  </div>
                ))}
                {dayTasks.length > 3 && (
                  <div
                    className="text-xs text-blue-500 dark:text-blue-400 px-1 cursor-default"
                    title={dayTasks.slice(3).map((tk) => tk.title).join('\n')}
                  >
                    {t('tasks.views.more_tasks', { count: dayTasks.length - 3 })}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Trailing empty cells to complete the last week row */}
        {Array.from({ length: trailingEmpty }).map((_, i) => (
          <div key={`trailing-${i}`} className="min-h-[110px] bg-gray-50/50 dark:bg-gray-900/50 border-b border-r border-gray-100 dark:border-gray-800" />
        ))}
      </div>

      {/* Empty state when no tasks at all */}
      {!hasAnyTasks && (
        <div className="flex flex-col items-center justify-center py-8 text-gray-400 dark:text-gray-500">
          <p className="text-sm">{t('tasks.no_tasks')}</p>
        </div>
      )}

      {/* Tasks without due date */}
      {noDueTasks.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
            {t('tasks.views.no_due_date')} ({noDueTasks.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {noDueTasks.map((task) => (
              <div
                key={task.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelectTask(task.id)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectTask(task.id); } }}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-gray-800 shadow-sm cursor-pointer transition-all hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                  selectedTaskId === task.id ? 'ring-2 ring-blue-500' : ''
                } ${task.isCompleted ? 'opacity-50' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={task.isCompleted}
                  onChange={(e) => { e.stopPropagation(); onToggleTask(task.id, task.isCompleted); }}
                  onClick={(e) => e.stopPropagation()}
                  aria-label={t('tasks.views.toggle_complete', { title: task.title })}
                  className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-500"
                />
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: PRIORITY_COLORS[task.priority] ?? PRIORITY_COLOR_FALLBACK }} />
                <span className={`text-sm truncate max-w-[200px] ${task.isCompleted ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-300'}`}>
                  {task.title}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
