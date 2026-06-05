import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  PlusIcon, FireIcon, PencilIcon, TrashIcon, XMarkIcon,
  ChevronLeftIcon, ChevronRightIcon, TrophyIcon, CheckCircleIcon,
} from '@heroicons/react/24/outline';
import {
  useHabits, useCreateHabit, useUpdateHabit, useDeleteHabit,
  useCheckInHabit, useHabitLogs, useTodayCheckins,
} from '@/queries/useHabitQueries';
import type { Habit, HabitFrequency, CreateHabitParams } from '@/types/habit';

// ==================== Habit Form Dialog ====================
function HabitFormDialog({
  isOpen,
  onClose,
  onSubmit,
  habit,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (params: CreateHabitParams) => void;
  habit?: Habit | null;
}) {
  const { t } = useTranslation('common');
  const isEditing = !!habit;

  const [name, setName] = useState(habit?.name || '');
  const [description, setDescription] = useState(habit?.description || '');
  const [frequency, setFrequency] = useState<HabitFrequency>(habit?.frequency || 'daily');
  const [icon, setIcon] = useState(habit?.icon || 'star');
  const [color, setColor] = useState(habit?.color || '#8B5CF6');

  const icons = ['star', 'heart', 'fire', 'book', 'dumbbell', 'moon', 'sun', 'leaf'];
  const colors = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316'];

  // Reset form when opening
  useEffect(() => {
    if (isOpen && habit) {
      setName(habit.name);
      setDescription(habit.description || '');
      setFrequency(habit.frequency);
      setIcon(habit.icon || 'star');
      setColor(habit.color || '#8B5CF6');
    } else if (isOpen) {
      setName('');
      setDescription('');
      setFrequency('daily');
      setIcon('star');
      setColor('#8B5CF6');
    }
  }, [isOpen, habit]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), description: description.trim() || undefined, icon, color, frequency });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {isEditing ? t('habits.edit_habit') : t('habits.new_habit')}
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <XMarkIcon className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('habits.habit_name')} *</label>
            <input
              type="text" value={name} onChange={(e) => setName(e.target.value)}
              required autoFocus
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('habits.description')}</label>
            <input
              type="text" value={description} onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('habits.icon')}</label>
            <div className="flex gap-2 flex-wrap">
              {icons.map((ic) => (
                <button key={ic} type="button" onClick={() => setIcon(ic)}
                  className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg transition-all ${icon === ic ? 'ring-2 ring-green-500 bg-green-50 dark:bg-green-900/20' : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                >{ic === 'star' ? '⭐' : ic === 'heart' ? '❤️' : ic === 'fire' ? '🔥' : ic === 'book' ? '📖' : ic === 'dumbbell' ? '💪' : ic === 'moon' ? '🌙' : ic === 'sun' ? '☀️' : '🍃'}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('habits.color')}</label>
            <div className="flex gap-2">
              {colors.map((c) => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full transition-all ${color === c ? 'ring-2 ring-offset-2 ring-green-500' : ''}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('habits.frequency')}</label>
            <select value={frequency} onChange={(e) => setFrequency(e.target.value as HabitFrequency)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="daily">{t('habits.frequency.daily')}</option>
              <option value="weekly">{t('habits.frequency.weekly')}</option>
              <option value="monthly">{t('habits.frequency.monthly')}</option>
            </select>
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600">{t('common.cancel')}</button>
            <button type="submit" disabled={!name.trim()} className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50">{isEditing ? t('common.save') : t('common.create')}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ==================== Check-in History Calendar ====================
function CheckInCalendar({ habitId, color }: { habitId: string; color: string }) {
  const { t } = useTranslation('common');
  const [viewMonth, setViewMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const startDate = `${viewMonth.year}-${String(viewMonth.month + 1).padStart(2, '0')}-01`;
  const endDate = `${viewMonth.year}-${String(viewMonth.month + 1).padStart(2, '0')}-31`;
  const { data: logs = [] } = useHabitLogs(habitId, startDate, endDate);

  const checkedDates = useMemo(() => new Set(logs.map((l) => l.logDate)), [logs]);

  const daysInMonth = new Date(viewMonth.year, viewMonth.month + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewMonth.year, viewMonth.month, 1).getDay();
  const today = new Date().toISOString().split('T')[0];

  const monthLabel = new Date(viewMonth.year, viewMonth.month).toLocaleDateString(undefined, { year: 'numeric', month: 'long' });

  const prevMonth = () => {
    setViewMonth((v) => v.month === 0 ? { year: v.year - 1, month: 11 } : { ...v, month: v.month - 1 });
  };
  const nextMonth = () => {
    setViewMonth((v) => v.month === 11 ? { year: v.year + 1, month: 0 } : { ...v, month: v.month + 1 });
  };

  const dayLabels = [t('habits.calendar.sun'), t('habits.calendar.mon'), t('habits.calendar.tue'), t('habits.calendar.wed'), t('habits.calendar.thu'), t('habits.calendar.fri'), t('habits.calendar.sat')];

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-2">
        <button onClick={prevMonth} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"><ChevronLeftIcon className="w-4 h-4 text-gray-500" /></button>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{monthLabel}</span>
        <button onClick={nextMonth} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"><ChevronRightIcon className="w-4 h-4 text-gray-500" /></button>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {dayLabels.map((d) => <div key={d} className="text-center text-xs text-gray-400 dark:text-gray-500 py-1">{d}</div>)}
        {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`empty-${i}`} />)}
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
          const dateStr = `${viewMonth.year}-${String(viewMonth.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const isChecked = checkedDates.has(dateStr);
          const isToday = dateStr === today;
          return (
            <div key={day}
              className={`aspect-square flex items-center justify-center rounded-full text-xs relative
                ${isChecked ? 'text-white font-bold' : 'text-gray-600 dark:text-gray-400'}
                ${isToday ? 'ring-2 ring-gray-300 dark:ring-gray-600' : ''}
              `}
              style={isChecked ? { backgroundColor: color } : {}}
            >
              {day}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ==================== Habit Card ====================
function HabitCard({
  habit, onEdit, onDelete, onCheckIn, checkedInToday,
}: {
  habit: Habit; onEdit: () => void; onDelete: () => void; onCheckIn: () => void; checkedInToday: boolean;
}) {
  const { t } = useTranslation('common');
  const [showCalendar, setShowCalendar] = useState(false);

  const iconMap: Record<string, string> = {
    star: '⭐', heart: '❤️', fire: '🔥', book: '📖',
    dumbbell: '💪', moon: '🌙', sun: '☀️', leaf: '🍃',
  };

  const getFrequencyLabel = (freq: HabitFrequency) => {
    switch (freq) {
      case 'daily': return t('habits.frequency.daily');
      case 'weekly': return t('habits.frequency.weekly');
      case 'monthly': return t('habits.frequency.monthly');
      default: return freq;
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ backgroundColor: habit.color + '20' }}>
            {iconMap[habit.icon] || '⭐'}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">{habit.name}</h3>
            <p className="text-xs text-gray-500">{getFrequencyLabel(habit.frequency)}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700" title={t('common.edit')}>
            <PencilIcon className="w-4 h-4 text-gray-400 dark:text-gray-500" />
          </button>
          <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20" title={t('common.delete')}>
            <TrashIcon className="w-4 h-4 text-red-400" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 mb-4 text-sm">
        {habit.currentStreak > 0 && (
          <div className="flex items-center gap-1 text-orange-500">
            <FireIcon className="w-4 h-4" />
            <span className="font-bold">{habit.currentStreak}</span>
            <span className="text-xs text-gray-500">{t('habits.streak_days')}</span>
          </div>
        )}
        {habit.longestStreak > 0 && (
          <div className="flex items-center gap-1 text-yellow-500">
            <TrophyIcon className="w-4 h-4" />
            <span className="font-bold">{habit.longestStreak}</span>
            <span className="text-xs text-gray-500">{t('habits.best')}</span>
          </div>
        )}
        <div className="text-gray-500 text-xs">
          {t('habits.total')}: {habit.totalCompletions}
        </div>
      </div>

      {/* Check-in button */}
      <button
        onClick={onCheckIn}
        disabled={checkedInToday}
        className={`w-full py-2.5 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
          checkedInToday
            ? 'bg-gray-100 dark:bg-gray-700 text-gray-500 cursor-default'
            : 'text-white hover:opacity-90'
        }`}
        style={!checkedInToday ? { backgroundColor: habit.color } : {}}
      >
        {checkedInToday ? (
          <><CheckCircleIcon className="w-5 h-5" />{t('habits.checked_in')}</>
        ) : (
          <>{t('habits.check_in')}</>
        )}
      </button>

      {/* Toggle calendar */}
      <button
        onClick={() => setShowCalendar(!showCalendar)}
        className="w-full mt-2 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 transition-colors"
      >
        {showCalendar ? t('habits.hide_history') : t('habits.show_history')}
      </button>

      {showCalendar && <CheckInCalendar habitId={habit.id} color={habit.color} />}
    </div>
  );
}

// ==================== Main Page ====================
export default function HabitsPage() {
  const { t } = useTranslation('common');
  const [showForm, setShowForm] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);

  const { data: habits = [], isLoading } = useHabits();
  const createHabit = useCreateHabit();
  const updateHabit = useUpdateHabit();
  const deleteHabit = useDeleteHabit();
  const checkIn = useCheckInHabit();

  const today = new Date().toISOString().split('T')[0];

  // Fetch today's check-in status for all habits
  const { data: todayCheckins = [] } = useTodayCheckins();
  const checkedInHabitIds = useMemo(() => new Set(todayCheckins), [todayCheckins]);

  const handleCreate = (params: CreateHabitParams) => {
    createHabit.mutate(params);
  };

  const handleUpdate = (params: CreateHabitParams) => {
    if (editingHabit) {
      updateHabit.mutate({ id: editingHabit.id, ...params });
      setEditingHabit(null);
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm(t('habits.delete_confirm'))) {
      deleteHabit.mutate(id);
    }
  };

  const handleCheckIn = (habitId: string) => {
    checkIn.mutate({ habitId, date: today });
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-500">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{t('navigation.habits')}</h1>
        <button
          onClick={() => { setEditingHabit(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          <span>{t('habits.new_habit')}</span>
        </button>
      </div>

      {habits.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
          <p className="text-lg">{t('habits.no_habits')}</p>
          <button onClick={() => setShowForm(true)} className="mt-4 text-green-500 hover:text-green-600">
            {t('habits.create_first')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {habits.map((habit) => (
            <HabitCard
              key={habit.id}
              habit={habit}
              onEdit={() => { setEditingHabit(habit); setShowForm(true); }}
              onDelete={() => handleDelete(habit.id)}
              onCheckIn={() => handleCheckIn(habit.id)}
              checkedInToday={checkedInHabitIds.has(habit.id)}
            />
          ))}
        </div>
      )}

      <HabitFormDialog
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditingHabit(null); }}
        onSubmit={editingHabit ? handleUpdate : handleCreate}
        habit={editingHabit}
      />
    </div>
  );
}
