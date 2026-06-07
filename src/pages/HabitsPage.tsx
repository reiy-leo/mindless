import { useState, useMemo, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  PlusIcon, FireIcon, PencilIcon, TrashIcon, XMarkIcon,
  ChevronLeftIcon, ChevronRightIcon, TrophyIcon, CheckCircleIcon,
  ChevronDownIcon, ChevronUpIcon, MinusIcon, ArrowPathIcon,
} from '@heroicons/react/24/outline';
import {
  useHabits, useCreateHabit, useUpdateHabit, useDeleteHabit,
  useCheckInHabit, useHabitLogs, useTodayCheckinMap, useRefreshStreaks,
} from '@/queries/useHabitQueries';
import { useCalendarEvents } from '@/queries/useTaskQueries';
import DateTimePicker from '@/components/DateTimePicker';
import Select from '@/components/Select';
import { getLunarDayStr } from '@/lib/lunar';
import type { Habit, HabitFrequency, TargetType, CreateHabitParams } from '@/types/habit';

// ==================== Due Today Helper ====================
function isHabitDueToday(habit: Habit): boolean {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const startDate = habit.startDate || todayStr;

  switch (habit.frequency) {
    case 'daily':
      return true;
    case 'every_x_days': {
      const interval = habit.frequencyDays ? parseInt(habit.frequencyDays) : 1;
      if (interval <= 1) return true;
      const start = new Date(startDate);
      const diffDays = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays < 0) return false;
      return diffDays % interval === 0;
    }
    case 'weekly': {
      if (!habit.frequencyDays) return true; // no custom days = every day
      const dayKeys = habit.frequencyDays.split(',').filter(Boolean);
      if (dayKeys.length === 0) return true;
      const weekDayMap: Record<number, string> = {
        1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri', 6: 'sat', 0: 'sun',
      };
      const todayKey = weekDayMap[today.getDay()];
      return dayKeys.includes(todayKey);
    }
    case 'monthly': {
      const start = new Date(startDate);
      const targetDay = start.getDate();
      const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
      const expectedDay = Math.min(targetDay, lastDayOfMonth);
      return today.getDate() === expectedDay;
    }
    default:
      return true;
  }
}

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
  const { data: calendarEvents = [] } = useCalendarEvents();

  const [name, setName] = useState(habit?.name || '');
  const [description, setDescription] = useState(habit?.description || '');
  const [frequency, setFrequency] = useState<HabitFrequency>(habit?.frequency || 'daily');
  const [icon, setIcon] = useState(habit?.icon || 'star');
  const [color, setColor] = useState(habit?.color || '#8B5CF6');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Every X days
  const [everyXDays, setEveryXDays] = useState(() => {
    if (habit?.frequency === 'every_x_days' && habit.frequencyDays) {
      return parseInt(habit.frequencyDays) || 2;
    }
    return 2;
  });

  // Weekly custom days
  const [frequencyDays, setFrequencyDays] = useState<string>(
    habit?.frequency === 'weekly' ? (habit?.frequencyDays || '') : ''
  );

  // Start date — main form field
  const [startDate, setStartDate] = useState(habit?.startDate || new Date().toISOString().split('T')[0]);

  // Advanced fields
  const [targetType, setTargetType] = useState<TargetType>(habit?.targetType || 'binary');
  const [targetValue, setTargetValue] = useState(habit?.targetValue || 1);
  const [reminderEnabled, setReminderEnabled] = useState(habit?.reminderEnabled || false);
  const [reminderTime, setReminderTime] = useState(habit?.reminderTime || '09:00');

  const icons = ['star', 'heart', 'fire', 'book', 'dumbbell', 'moon', 'sun', 'leaf'];
  const colors = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316'];
  const weekDays = [
    { key: 'mon', label: t('habits.days.mon') },
    { key: 'tue', label: t('habits.days.tue') },
    { key: 'wed', label: t('habits.days.wed') },
    { key: 'thu', label: t('habits.days.thu') },
    { key: 'fri', label: t('habits.days.fri') },
    { key: 'sat', label: t('habits.days.sat') },
    { key: 'sun', label: t('habits.days.sun') },
  ];

  const selectedDays = frequencyDays ? frequencyDays.split(',').filter(Boolean) : [];

  const toggleDay = (day: string) => {
    const current = selectedDays.includes(day)
      ? selectedDays.filter((d) => d !== day)
      : [...selectedDays, day];
    setFrequencyDays(current.join(','));
  };

  // Reset form when open
  useEffect(() => {
    if (isOpen && habit) {
      setName(habit.name);
      setDescription(habit.description || '');
      setFrequency(habit.frequency);
      setIcon(habit.icon || 'star');
      setColor(habit.color || '#8B5CF6');
      setEveryXDays(habit.frequency === 'every_x_days' && habit.frequencyDays ? parseInt(habit.frequencyDays) || 2 : 2);
      setFrequencyDays(habit.frequency === 'weekly' ? (habit.frequencyDays || '') : '');
      setStartDate(habit.startDate || new Date().toISOString().split('T')[0]);
      setTargetType(habit.targetType || 'binary');
      setTargetValue(habit.targetValue || 1);
      setReminderEnabled(habit.reminderEnabled || false);
      setReminderTime(habit.reminderTime || '09:00');
      setShowAdvanced(false);
    } else if (isOpen) {
      setName('');
      setDescription('');
      setFrequency('daily');
      setIcon('star');
      setColor('#8B5CF6');
      setEveryXDays(2);
      setFrequencyDays('');
      setStartDate(new Date().toISOString().split('T')[0]);
      setTargetType('binary');
      setTargetValue(1);
      setReminderEnabled(false);
      setReminderTime('09:00');
      setShowAdvanced(false);
    }
  }, [isOpen, habit]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    let fDays: string | undefined;
    if (frequency === 'weekly') {
      fDays = frequencyDays || undefined;
    } else if (frequency === 'every_x_days') {
      fDays = String(everyXDays);
    }

    onSubmit({
      name: name.trim(),
      description: description.trim() || undefined,
      icon,
      color,
      frequency,
      targetType,
      targetValue: targetType === 'binary' ? 1 : targetValue,
      frequencyDays: fDays,
      reminderEnabled,
      reminderTime: reminderEnabled ? reminderTime : undefined,
      startDate,
    });
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
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('habits.habit_name')} *</label>
            <input
              type="text" value={name} onChange={(e) => setName(e.target.value)}
              required autoFocus
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('habits.description')}</label>
            <input
              type="text" value={description} onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          {/* Icon */}
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
          {/* Color */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('habits.color')}</label>
            <div className="flex gap-2">
              {colors.map((c) => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full transition-all ${color === c ? 'ring-2 ring-offset-2 ring-green-500 dark:ring-offset-gray-800' : ''}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Frequency */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('habits.frequency')}</label>
            <Select
              value={frequency}
              onChange={(val) => setFrequency(val as HabitFrequency)}
              options={[
                { value: 'daily', label: t('habits.frequency.daily') },
                { value: 'every_x_days', label: t('habits.frequency.every_x_days') },
                { value: 'weekly', label: t('habits.frequency.weekly') },
                { value: 'monthly', label: t('habits.frequency.monthly') },
              ]}
            />
          </div>

          {/* Every X Days input */}
          {frequency === 'every_x_days' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('habits.every_x_days_label')}
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setEveryXDays(Math.max(2, everyXDays - 1))}
                  className="w-9 h-9 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  <MinusIcon className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                </button>
                <input
                  type="number" min={2} max={365} value={everyXDays}
                  onChange={(e) => setEveryXDays(Math.max(2, parseInt(e.target.value) || 2))}
                  className="w-20 px-3 py-2 text-center border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <button
                  type="button"
                  onClick={() => setEveryXDays(Math.min(365, everyXDays + 1))}
                  className="w-9 h-9 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  <PlusIcon className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                </button>
                <span className="text-sm text-gray-500 dark:text-gray-400">{t('habits.frequency.days_unit')}</span>
              </div>
            </div>
          )}

          {/* Weekly custom days picker */}
          {frequency === 'weekly' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('habits.custom_days')}</label>
              <div className="flex gap-1.5 flex-wrap">
                {weekDays.map((day) => (
                  <button
                    key={day.key} type="button" onClick={() => toggleDay(day.key)}
                    className={`px-3 py-1.5 text-sm rounded-full transition-all ${
                      selectedDays.includes(day.key)
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >{day.label}</button>
                ))}
              </div>
            </div>
          )}

          {/* Start Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('habits.start_date')}</label>
            <DateTimePicker
              date={startDate || undefined}
              onChange={(d) => setStartDate(d || new Date().toISOString().split('T')[0])}
              events={calendarEvents}
              showTime={false}
            />
          </div>

          {/* Advanced Settings Toggle */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            {showAdvanced ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
            <span>{t('habits.advanced')}</span>
          </button>

          {showAdvanced && (
            <div className="space-y-4 pt-2 border-t border-gray-100 dark:border-gray-700">
              {/* Target Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('habits.target_type')}</label>
                <div className="space-y-2">
                  {([
                    { value: 'binary' as TargetType, label: t('habits.target_type.binary'), desc: t('habits.target_type.binary_desc') },
                    { value: 'count' as TargetType, label: t('habits.target_type.count'), desc: t('habits.target_type.count_desc') },
                    { value: 'duration' as TargetType, label: t('habits.target_type.duration'), desc: t('habits.target_type.duration_desc') },
                  ]).map((opt) => (
                    <label key={opt.value} className="flex items-start gap-3 cursor-pointer p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
                      <input
                        type="radio" name="targetType" value={opt.value}
                        checked={targetType === opt.value}
                        onChange={() => setTargetType(opt.value)}
                        className="w-4 h-4 text-green-500 mt-0.5"
                      />
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{opt.label}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{opt.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Target Value (shown for count/duration) */}
              {targetType !== 'binary' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('habits.target_value')} ({targetType === 'count' ? t('habits.target_unit_count') : t('habits.target_unit_duration')})
                  </label>
                  <input
                    type="number" min={1} value={targetValue}
                    onChange={(e) => setTargetValue(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              )}

              {/* Reminder */}
              <div>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('habits.reminder_enabled')}</span>
                  <button
                    type="button"
                    onClick={() => setReminderEnabled(!reminderEnabled)}
                    className={`relative w-10 h-5 rounded-full transition-colors ${
                      reminderEnabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                      reminderEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </button>
                </label>
                {reminderEnabled && (
                  <div className="mt-2">
                    <input
                      type="time" value={reminderTime}
                      onChange={(e) => setReminderTime(e.target.value)}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
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
function CheckInCalendar({ habit }: { habit: Habit }) {
  const { t, i18n } = useTranslation('common');
  const color = habit.color;
  const [viewMonth, setViewMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const startDate = `${viewMonth.year}-${String(viewMonth.month + 1).padStart(2, '0')}-01`;
  const endDate = `${viewMonth.year}-${String(viewMonth.month + 1).padStart(2, '0')}-31`;
  const { data: logs = [] } = useHabitLogs(habit.id, startDate, endDate);

  // Build logs map: date -> log
  const logsByDate = useMemo(() => {
    const map = new Map<string, typeof logs[0]>();
    logs.forEach((l) => map.set(l.logDate, l));
    return map;
  }, [logs]);

  const daysInMonth = new Date(viewMonth.year, viewMonth.month + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewMonth.year, viewMonth.month, 1).getDay();
  const today = new Date().toISOString().split('T')[0];

  const monthLabel = new Date(viewMonth.year, viewMonth.month).toLocaleDateString(i18n.language, {
    year: 'numeric', month: 'long',
  });

  // Lunar data for all days in month
  const lunarDataByDay = useMemo(() => {
    const data: Map<number, { str: string; kind: 'festival' | 'term' | 'month' | 'normal' }> = new Map();
    for (let day = 1; day <= daysInMonth; day++) {
      const lunarStr = getLunarDayStr(viewMonth.year, viewMonth.month + 1, day);
      // Classify
      const solarTerms = [
        '小寒', '大寒', '立春', '雨水', '惊蛰', '春分',
        '清明', '谷雨', '立夏', '小满', '芒种', '夏至',
        '小暑', '大暑', '立秋', '处暑', '白露', '秋分',
        '寒露', '霜降', '立冬', '小雪', '大雪', '冬至',
      ];
      let kind: 'festival' | 'term' | 'month' | 'normal' = 'normal';
      if (solarTerms.includes(lunarStr)) kind = 'term';
      else {
        const monthNames = ['正月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '冬月', '腊月'];
        if (monthNames.includes(lunarStr)) kind = 'month';
        else {
          const festivals = ['春节', '元宵节', '端午节', '七夕节', '中秋节', '重阳节', '腊八节', '除夕', '元旦', '国庆节', '劳动节', '儿童节'];
          if (festivals.some((f) => lunarStr.includes(f))) kind = 'festival';
        }
      }
      data.set(day, { str: lunarStr, kind });
    }
    return data;
  }, [viewMonth.year, viewMonth.month, daysInMonth]);

  // Check if a date is "due" based on habit frequency
  const isDateDue = useCallback((dateStr: string): boolean => {
    const d = new Date(dateStr + 'T12:00:00');
    const habitStart = habit.startDate || today;
    if (dateStr < habitStart) return false;
    // Don't count future dates
    if (dateStr > today) return false;

    switch (habit.frequency) {
      case 'daily': return true;
      case 'every_x_days': {
        const interval = habit.frequencyDays ? parseInt(habit.frequencyDays) : 1;
        if (interval <= 1) return true;
        const start = new Date(habitStart + 'T12:00:00');
        const diffDays = Math.floor((d.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays % interval === 0;
      }
      case 'weekly': {
        if (!habit.frequencyDays) return true;
        const dayKeys = habit.frequencyDays.split(',').filter(Boolean);
        if (dayKeys.length === 0) return true;
        const weekDayMap: Record<number, string> = { 1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri', 6: 'sat', 0: 'sun' };
        return dayKeys.includes(weekDayMap[d.getDay()]);
      }
      case 'monthly': {
        const start = new Date(habitStart + 'T12:00:00');
        return d.getDate() === start.getDate();
      }
      default: return true;
    }
  }, [habit, today]);

  // Month statistics
  const stats = useMemo(() => {
    let dueDays = 0;
    let checkedDays = 0;
    let missedDays = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${viewMonth.year}-${String(viewMonth.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      if (dateStr > today) continue;
      const due = isDateDue(dateStr);
      const checked = logsByDate.has(dateStr);
      if (due) {
        dueDays++;
        if (checked) checkedDays++;
        else missedDays++;
      }
    }
    const rate = dueDays > 0 ? Math.round((checkedDays / dueDays) * 100) : 0;
    return { dueDays, checkedDays, missedDays, rate };
  }, [viewMonth, daysInMonth, today, isDateDue, logsByDate]);

  // Selected day detail
  const selectedLog = selectedDay ? logsByDate.get(selectedDay) : null;

  const prevMonth = () => {
    setViewMonth((v) => v.month === 0 ? { year: v.year - 1, month: 11 } : { ...v, month: v.month - 1 });
    setSelectedDay(null);
  };
  const nextMonth = () => {
    setViewMonth((v) => v.month === 11 ? { year: v.year + 1, month: 0 } : { ...v, month: v.month + 1 });
    setSelectedDay(null);
  };
  const goToday = () => {
    const now = new Date();
    setViewMonth({ year: now.getFullYear(), month: now.getMonth() });
  };

  const dayLabels = [t('habits.calendar.sun'), t('habits.calendar.mon'), t('habits.calendar.tue'), t('habits.calendar.wed'), t('habits.calendar.thu'), t('habits.calendar.fri'), t('habits.calendar.sat')];

  function getLunarColor(kind: string): string {
    if (kind === 'festival') return 'text-red-500 dark:text-red-400';
    if (kind === 'term') return 'text-green-600 dark:text-green-400';
    if (kind === 'month') return 'text-orange-500 dark:text-orange-400';
    return 'text-gray-400 dark:text-gray-500';
  }

  return (
    <div className="mt-4 border border-gray-100 dark:border-gray-700 rounded-xl p-3 bg-gray-50/50 dark:bg-gray-800/50">
      {/* Header: month nav + stats */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1">
          <button onClick={prevMonth} className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
            <ChevronLeftIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </button>
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 min-w-[130px] text-center">{monthLabel}</span>
          <button onClick={nextMonth} className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
            <ChevronRightIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </button>
          <button onClick={goToday} className="ml-1 px-2 py-0.5 text-xs rounded bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors">
            {t('tasks.views.today')}
          </button>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-gray-500 dark:text-gray-400">
            <span className="font-semibold" style={{ color }}>{stats.checkedDays}</span>/{stats.dueDays}
          </span>
          <span className={`px-1.5 py-0.5 rounded-full font-medium ${
            stats.rate >= 80 ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' :
            stats.rate >= 50 ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400' :
            'bg-red-100 dark:bg-red-900/30 text-red-500 dark:text-red-400'
          }`}>
            {stats.rate}%
          </span>
        </div>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {dayLabels.map((d) => (
          <div key={d} className="text-center text-xs text-gray-400 dark:text-gray-500 py-0.5">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`empty-${i}`} />)}
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
          const dateStr = `${viewMonth.year}-${String(viewMonth.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const log = logsByDate.get(dateStr);
          const isChecked = !!log;
          const isToday = dateStr === today;
          const isSelected = dateStr === selectedDay;
          const due = isDateDue(dateStr);
          const missed = due && !isChecked && dateStr <= today;
          const lunarDay = lunarDataByDay.get(day);

          // Heatmap: for value habits, compute fill intensity
          let fillOpacity = 0;
          if (isChecked) {
            if (habit.targetType !== 'binary' && habit.targetValue > 1 && log) {
              fillOpacity = Math.min(1, Math.max(0.25, log.value / habit.targetValue));
            } else {
              fillOpacity = 1;
            }
          }

          return (
            <button
              key={day}
              type="button"
              onClick={() => setSelectedDay(selectedDay === dateStr ? null : dateStr)}
              className={`relative flex flex-col items-center justify-start rounded-lg py-0.5 transition-all
                ${missed && !isSelected ? 'ring-1 ring-red-300 dark:ring-red-700' : ''}
                hover:bg-gray-100 dark:hover:bg-gray-700
              `}
              style={{
                backgroundColor: isChecked ? `${color}${Math.round(fillOpacity * 255).toString(16).padStart(2, '0')}` : undefined,
                boxShadow: isSelected ? `0 0 0 2px #fff, 0 0 0 4px ${color}` : undefined,
              }}
            >
              <span className={`text-xs leading-none ${
                isChecked
                  ? fillOpacity > 0.5 ? 'text-white font-bold' : 'font-semibold'
                  : isToday ? 'font-bold' : 'text-gray-600 dark:text-gray-400'
              }`} style={isToday && !isChecked ? { color } : isChecked && fillOpacity > 0.5 ? { color: '#fff' } : {}}>
                {day}
              </span>
              {lunarDay && (
                <span className={`text-xs leading-tight truncate max-w-full px-0.5 ${
                  isChecked && fillOpacity > 0.5
                    ? 'text-white/70'
                    : getLunarColor(lunarDay.kind)
                }`}>
                  {lunarDay.str}
                </span>
              )}
              {/* Value label for non-binary habits */}
              {isChecked && log && habit.targetType !== 'binary' && (
                <span className={`text-xs leading-tight font-medium ${
                  fillOpacity > 0.5 ? 'text-white/80' : ''
                }`} style={fillOpacity <= 0.5 ? { color } : {}}>
                  {log.value}{habit.targetType === 'duration' ? 'm' : ''}
                </span>
              )}
              {/* Today indicator */}
              {isToday && !isChecked && (
                <span className="absolute -bottom-0.5 w-1 h-1 rounded-full" style={{ backgroundColor: color }} />
              )}
            </button>
          );
        })}
      </div>

      {/* Selected day detail panel */}
      {selectedDay && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{selectedDay}</span>
              {(() => {
                const parts = selectedDay.split('-').map(Number);
                const lunar = getLunarDayStr(parts[0], parts[1], parts[2]);
                return <span className="text-xs text-gray-400 dark:text-gray-500">{lunar}</span>;
              })()}
            </div>
            {selectedLog ? (
              <div className="flex items-center gap-2">
                {habit.targetType !== 'binary' && (
                  <span className="text-xs font-semibold" style={{ color }}>
                    {selectedLog.value} / {habit.targetValue}
                    {habit.targetType === 'duration' ? ` ${t('habits.target_unit_duration')}` : ` ${t('habits.target_unit_count')}`}
                  </span>
                )}
                <span className="flex items-center gap-0.5 text-xs text-green-600 dark:text-green-400">
                  <CheckCircleIcon className="w-3 h-3" />
                  {selectedLog.logTime ? selectedLog.logTime.slice(0, 5) : t('habits.checked_in')}
                </span>
              </div>
            ) : (
              <span className={`text-xs ${
                isDateDue(selectedDay) ? 'text-red-400 dark:text-red-500' : 'text-gray-400 dark:text-gray-500'
              }`}>
                {isDateDue(selectedDay) ? t('habits.missed') : t('habits.not_due')}
              </span>
            )}
          </div>
          {selectedLog?.note && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{selectedLog.note}</p>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center justify-between mt-3 text-xs text-gray-400 dark:text-gray-500">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded" style={{ backgroundColor: color }} />
            {t('habits.checked_in')}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded ring-1 ring-red-300 dark:ring-red-700" />
            {t('habits.missed')}
          </span>
        </div>
        {stats.missedDays > 0 && (
          <span className="text-red-400 dark:text-red-500">
            {t('habits.missed_count', { count: stats.missedDays })}
          </span>
        )}
      </div>
    </div>
  );
}

// ==================== Habit Card ====================
function HabitCard({
  habit, onEdit, onDelete, onCheckIn, todayValue, dueToday,
}: {
  habit: Habit;
  onEdit: () => void;
  onDelete: () => void;
  onCheckIn: (value?: number) => void;
  todayValue: number;
  dueToday: boolean;
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
      case 'every_x_days': {
        const n = habit.frequencyDays ? parseInt(habit.frequencyDays) : 2;
        return t('habits.frequency.every_x_days_value', { days: n });
      }
      case 'weekly': {
        const days = habit.frequencyDays ? habit.frequencyDays.split(',').filter(Boolean) : [];
        if (days.length > 0 && days.length < 7) {
          const dayLabels: Record<string, string> = {
            mon: t('habits.days.mon'), tue: t('habits.days.tue'), wed: t('habits.days.wed'),
            thu: t('habits.days.thu'), fri: t('habits.days.fri'), sat: t('habits.days.sat'), sun: t('habits.days.sun'),
          };
          return days.map((d) => dayLabels[d] || d).join(', ');
        }
        return t('habits.frequency.weekly');
      }
      case 'monthly': return t('habits.frequency.monthly');
      default: return freq;
    }
  };

  const getTargetBadge = () => {
    if (habit.targetType === 'count' && habit.targetValue > 1) {
      return `${habit.targetValue} ${t('habits.target_unit_count')}`;
    }
    if (habit.targetType === 'duration' && habit.targetValue > 0) {
      return `${habit.targetValue} ${t('habits.target_unit_duration')}`;
    }
    return null;
  };

  const targetBadge = getTargetBadge();
  const hasValueTarget = habit.targetType !== 'binary' && habit.targetValue > 1;
  const targetMet = hasValueTarget && todayValue >= habit.targetValue;
  const progressPercent = hasValueTarget ? Math.min(100, (todayValue / habit.targetValue) * 100) : 0;

  const handleValueChange = (delta: number) => {
    const newValue = Math.max(0, todayValue + delta);
    onCheckIn(newValue);
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
            <p className="text-xs text-gray-500 dark:text-gray-400">{getFrequencyLabel(habit.frequency)}</p>
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

      {/* Target & Reminder badges */}
      {(targetBadge || habit.reminderEnabled || true) && (
        <div className="flex flex-wrap gap-2 mb-3">
          {targetBadge && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
              {targetBadge}
            </span>
          )}
          {habit.reminderEnabled && habit.reminderTime && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
              {habit.reminderTime}
            </span>
          )}
          {dueToday ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
              {t('habits.due_today')}
            </span>
          ) : (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
              {t('habits.not_due_today')}
            </span>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="flex items-center gap-4 mb-4 text-sm">
        {habit.currentStreak > 0 && (
          <div className="flex items-center gap-1 text-orange-500">
            <FireIcon className="w-4 h-4" />
            <span className="font-bold">{habit.currentStreak}</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">{t('habits.streak_days')}</span>
          </div>
        )}
        {habit.longestStreak > 0 && (
          <div className="flex items-center gap-1 text-yellow-500">
            <TrophyIcon className="w-4 h-4" />
            <span className="font-bold">{habit.longestStreak}</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">{t('habits.best')}</span>
          </div>
        )}
        <div className="text-gray-500 text-xs">
          {t('habits.total')}: {habit.totalCompletions}
        </div>
      </div>

      {/* Check-in Area */}
      {hasValueTarget ? (
        <div className="space-y-3">
          {/* Progress bar */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {t('habits.progress')}
              </span>
              <span className={`text-sm font-bold ${targetMet ? 'text-green-500' : 'text-gray-700 dark:text-gray-300'}`}>
                {todayValue} / {habit.targetValue}
                {habit.targetType === 'duration' ? ` ${t('habits.target_unit_duration')}` : ''}
                {habit.targetType === 'count' ? ` ${t('habits.target_unit_count')}` : ''}
              </span>
            </div>
            <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%`, backgroundColor: targetMet ? '#10B981' : habit.color }}
              />
            </div>
          </div>

          {/* Value controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleValueChange(-1)}
              disabled={todayValue <= 0}
              className="w-9 h-9 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <MinusIcon className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            </button>

            <button
              onClick={() => {
                if (targetMet) return;
                handleValueChange(1);
              }}
              disabled={targetMet}
              className={`flex-1 py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                targetMet
                  ? 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                  : 'text-white hover:opacity-90'
              }`}
              style={!targetMet ? { backgroundColor: habit.color } : {}}
            >
              {targetMet ? (
                <><CheckCircleIcon className="w-5 h-5" />{t('habits.target_met')}</>
              ) : (
                <><PlusIcon className="w-5 h-5" />{t('habits.add_value')}</>
              )}
            </button>

            <button
              onClick={() => handleValueChange(1)}
              disabled={targetMet}
              className="w-9 h-9 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <PlusIcon className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            </button>
          </div>

          {/* Binary fallback for value=0 state */}
          {todayValue === 0 && !targetMet && (
            <button
              onClick={() => onCheckIn(undefined)}
              className="w-full py-2 rounded-lg font-medium text-white hover:opacity-90 transition-all"
              style={{ backgroundColor: habit.color }}
            >
              {t('habits.check_in')}
            </button>
          )}
        </div>
      ) : (
        /* Binary check-in */
        <button
          onClick={() => onCheckIn(undefined)}
          disabled={todayValue > 0}
          className={`w-full py-2.5 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
            todayValue > 0
              ? 'bg-gray-100 dark:bg-gray-700 text-gray-500 cursor-default'
              : 'text-white hover:opacity-90'
          }`}
          style={todayValue === 0 ? { backgroundColor: habit.color } : {}}
        >
          {todayValue > 0 ? (
            <><CheckCircleIcon className="w-5 h-5" />{t('habits.checked_in')}</>
          ) : (
            <>{t('habits.check_in')}</>
          )}
        </button>
      )}

      {/* Toggle calendar */}
      <button
        onClick={() => setShowCalendar(!showCalendar)}
        className="w-full mt-2 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 transition-colors"
      >
        {showCalendar ? t('habits.hide_history') : t('habits.show_history')}
      </button>

      {showCalendar && <CheckInCalendar habit={habit} />}
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
  const refreshStreaks = useRefreshStreaks();

  const today = new Date().toISOString().split('T')[0];

  // Fetch today's check-in values as a Map<habitId, value>
  const todayCheckinMap = useTodayCheckinMap();

  // Refresh streaks on page mount (catches up on missed days)
  useEffect(() => {
    refreshStreaks.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const handleCheckIn = (habitId: string, value?: number) => {
    checkIn.mutate({ habitId, date: today, value });
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-500 dark:text-gray-400">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto px-8 py-4">
      <div data-tauri-drag-region className="flex items-center justify-between mb-8">
        <h1 data-tauri-drag-region className="text-3xl font-bold text-gray-900 dark:text-gray-100">{t('navigation.habits')}</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refreshStreaks.mutate()}
            disabled={refreshStreaks.isPending}
            className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
            title={t('habits.refresh_streaks')}
          >
            <ArrowPathIcon className={`w-4 h-4 ${refreshStreaks.isPending ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => { setEditingHabit(null); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
            <span>{t('habits.new_habit')}</span>
          </button>
        </div>
      </div>

      {habits.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400">
          <p className="text-lg">{t('habits.no_habits')}</p>
          <button onClick={() => setShowForm(true)} className="mt-4 text-green-500 hover:text-green-600 dark:hover:text-green-400">
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
              onCheckIn={(value) => handleCheckIn(habit.id, value)}
              todayValue={todayCheckinMap.get(habit.id) || 0}
              dueToday={isHabitDueToday(habit)}
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
