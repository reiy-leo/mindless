import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  CheckCircleIcon, ClockIcon, ArrowRightIcon,
} from '@heroicons/react/24/outline';
import { Flame } from 'lucide-react';
import { useTasks, useToggleTaskCompletion } from '@/queries/useTaskQueries';
import { useHabits, useCheckInHabit, useTodayCheckins } from '@/queries/useHabitQueries';
import { useCountdowns } from '@/queries/useCountdownQueries';
import { PRIORITY_COLORS, PRIORITY_COLOR_FALLBACK } from '@/lib/constants';
import { getLocalToday } from '@/lib/taskHelpers';

const HABIT_ICONS: Record<string, string> = {
  star: '⭐', heart: '❤️', fire: '🔥', book: '📖',
  dumbbell: '💪', moon: '🌙', sun: '☀️', leaf: '🍃',
};

const COUNTDOWN_ICONS: Record<string, string> = {
  flag: '🚩', heart: '❤️', star: '⭐', gift: '🎁', cake: '🎂',
  plane: '✈️', ring: '💍', baby: '👶', graduation: '🎓', house: '🏠',
};

export default function HomePage() {
  const { t } = useTranslation('common');

  const { data: tasks = [] } = useTasks();
  const { data: habits = [] } = useHabits();
  const { data: todayCheckins = [] } = useTodayCheckins();
  const { data: countdowns = [] } = useCountdowns();
  const toggleTask = useToggleTaskCompletion();
  const checkInHabit = useCheckInHabit();

  const today = getLocalToday();

  // Today's tasks: due today or overdue (not completed)
  const { todayTasks, overdueTasks, completedToday } = useMemo(() => {
    const overdue: typeof tasks = [];
    const todayList: typeof tasks = [];
    let completed = 0;

    tasks.forEach((task) => {
      if (task.dueDate === today) {
        todayList.push(task);
        if (task.isCompleted) completed++;
      } else if (task.dueDate && task.dueDate < today && !task.isCompleted) {
        overdue.push(task);
      }
    });

    // Sort: incomplete first, by priority desc
    const sortFn = (a: typeof tasks[0], b: typeof tasks[0]) => {
      if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
      return b.priority - a.priority;
    };
    todayList.sort(sortFn);
    overdue.sort((a, b) => a.dueDate!.localeCompare(b.dueDate!));

    return { todayTasks: todayList, overdueTasks: overdue, completedToday: completed };
  }, [tasks, today]);

  // Habits: show active habits with check-in status
  const habitStatus = useMemo(() => {
    const checkinIds = new Set(todayCheckins.map((c) => c.habitId));
    return habits.map((habit) => ({
      ...habit,
      checkedIn: checkinIds.has(habit.id),
    }));
  }, [habits, todayCheckins]);

  const habitsCheckedIn = habitStatus.filter((h) => h.checkedIn).length;

  // Countdowns: sort by absolute days distance, show nearest 5
  const nearbyCountdowns = useMemo(() => {
    const now = new Date();
    return countdowns
      .map((cd) => {
        const [y, m, d] = cd.targetDate.split('-').map(Number);
        const target = new Date(y, m - 1, d);
        const diffMs = target.getTime() - now.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        return { ...cd, daysDiff: diffDays };
      })
      .sort((a, b) => Math.abs(a.daysDiff) - Math.abs(b.daysDiff))
      .slice(0, 5);
  }, [countdowns]);

  const handleToggleTask = (id: string, isCompleted: boolean) => {
    toggleTask.mutate({ id, isCompleted: !isCompleted });
  };

  const handleCheckIn = (habitId: string) => {
    checkInHabit.mutate({ habitId, date: today });
  };

  return (
    <div className="flex-1 overflow-auto p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          {t('navigation.home')}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
          {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            label={t('dashboard.stats.tasks_today')}
            value={todayTasks.length}
            color="#3B82F6"
          />
          <StatCard
            label={t('dashboard.stats.completed')}
            value={completedToday}
            color="#10B981"
          />
          <StatCard
            label={t('dashboard.stats.habits')}
            value={`${habitsCheckedIn}/${habits.length}`}
            color="#8B5CF6"
          />
          <StatCard
            label={t('dashboard.stats.countdowns')}
            value={nearbyCountdowns.length}
            color="#F59E0B"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Today's Tasks */}
          <section className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
                {t('dashboard.today_tasks')}
              </h2>
              <Link
                to="/tasks"
                className="text-sm text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1"
              >
                {t('dashboard.view_all')}
                <ArrowRightIcon className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Overdue tasks */}
            {overdueTasks.length > 0 && (
              <div className="mb-3">
                <h3 className="text-xs font-medium text-red-500 uppercase tracking-wider mb-2">
                  {t('dashboard.overdue')} ({overdueTasks.length})
                </h3>
                <div className="space-y-1">
                  {overdueTasks.map((task) => (
                    <TaskRow key={task.id} task={task} onToggle={handleToggleTask} showDate />
                  ))}
                </div>
              </div>
            )}

            {/* Today's tasks */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
              {todayTasks.length === 0 ? (
                <div className="p-6 text-center text-gray-400 dark:text-gray-500 text-sm">
                  {t('dashboard.no_tasks')}
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {todayTasks.map((task) => (
                    <TaskRow key={task.id} task={task} onToggle={handleToggleTask} />
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Today's Habits */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
                {t('dashboard.habits')}
              </h2>
              <Link
                to="/habits"
                className="text-sm text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1"
              >
                {t('dashboard.view_all')}
                <ArrowRightIcon className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
              {habitStatus.length === 0 ? (
                <div className="p-6 text-center text-gray-400 dark:text-gray-500 text-sm">
                  {t('dashboard.no_habits')}
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {habitStatus.map((habit) => (
                    <div
                      key={habit.id}
                      className="flex items-center gap-3 px-4 py-3"
                    >
                      <span className="text-lg">{HABIT_ICONS[habit.icon] || '⭐'}</span>
                      <div className="flex-1 min-w-0">
                        <h4 className={`text-sm font-medium truncate ${
                          habit.checkedIn
                            ? 'line-through text-gray-400 dark:text-gray-500'
                            : 'text-gray-900 dark:text-gray-100'
                        }`}>
                          {habit.name}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                          <Flame className="w-3 h-3" />
                          <span>{habit.currentStreak}</span>
                        </div>
                      </div>
                      {habit.checkedIn ? (
                        <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400">
                          {t('dashboard.checked_in')}
                        </span>
                      ) : (
                        <button
                          onClick={() => handleCheckIn(habit.id)}
                          className="px-3 py-1.5 text-xs font-medium rounded-full text-white transition-colors hover:opacity-90"
                          style={{ backgroundColor: habit.color || '#8B5CF6' }}
                        >
                          {t('dashboard.check_in')}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Upcoming Countdowns */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
                {t('dashboard.countdowns')}
              </h2>
              <Link
                to="/countdowns"
                className="text-sm text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1"
              >
                {t('dashboard.view_all')}
                <ArrowRightIcon className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
              {nearbyCountdowns.length === 0 ? (
                <div className="p-6 text-center text-gray-400 dark:text-gray-500 text-sm">
                  {t('dashboard.no_countdowns')}
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {nearbyCountdowns.map((cd) => (
                    <div key={cd.id} className="flex items-center gap-3 px-4 py-3">
                      <span className="text-lg">{COUNTDOWN_ICONS[cd.icon] || '🚩'}</span>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {cd.title}
                        </h4>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                          {cd.targetDate}
                        </p>
                      </div>
                      <div className="text-right">
                        {cd.daysDiff === 0 ? (
                          <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                            {t('dashboard.today_tasks').replace(/任务|タスク|Tasks|s$/, '').trim() === '' ? 'Today' : '🎉'}
                          </span>
                        ) : cd.daysDiff > 0 ? (
                          <div>
                            <span className="text-lg font-bold" style={{ color: cd.color || '#F59E0B' }}>
                              {cd.daysDiff}
                            </span>
                            <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">
                              {t('dashboard.days_left')}
                            </span>
                          </div>
                        ) : (
                          <div>
                            <span className="text-lg font-bold text-gray-400 dark:text-gray-500">
                              {Math.abs(cd.daysDiff)}
                            </span>
                            <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">
                              {t('dashboard.days_ago')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

// ==================== Stat Card ====================
function StatCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
        {label}
      </p>
      <p className="text-2xl font-bold" style={{ color }}>
        {value}
      </p>
    </div>
  );
}

// ==================== Task Row ====================
function TaskRow({
  task,
  onToggle,
  showDate,
}: {
  task: { id: string; title: string; isCompleted: boolean; priority: number; dueDate?: string; dueTime?: string };
  onToggle: (id: string, isCompleted: boolean) => void;
  showDate?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
      <button
        onClick={() => onToggle(task.id, task.isCompleted)}
        className="flex-shrink-0"
      >
        {task.isCompleted ? (
          <CheckCircleIcon className="w-5 h-5 text-green-500" />
        ) : (
          <span className="block w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600 hover:border-blue-400 transition-colors" />
        )}
      </button>
      <div
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ backgroundColor: PRIORITY_COLORS[task.priority] ?? PRIORITY_COLOR_FALLBACK }}
      />
      <span className={`text-sm flex-1 truncate ${
        task.isCompleted
          ? 'line-through text-gray-400 dark:text-gray-500'
          : 'text-gray-800 dark:text-gray-200'
      }`}>
        {task.title}
      </span>
      {showDate && task.dueDate && (
        <span className="text-xs text-red-400 dark:text-red-500 flex-shrink-0 flex items-center gap-1">
          <ClockIcon className="w-3 h-3" />
          {task.dueDate}
        </span>
      )}
      {task.dueTime && !showDate && (
        <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
          {task.dueTime.slice(0, 5)}
        </span>
      )}
    </div>
  );
}
