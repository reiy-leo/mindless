import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  PlusIcon, PencilIcon, TrashIcon, XMarkIcon,
  ClockIcon, ArrowPathIcon, ChevronLeftIcon, ChevronRightIcon,
  CalendarIcon, Squares2X2Icon,
} from '@heroicons/react/24/outline';
import {
  useCountdowns, useCreateCountdown, useUpdateCountdown, useDeleteCountdown,
} from '@/queries/useCountdownQueries';
import { useCalendarEvents } from '@/queries/useTaskQueries';
import DateTimePicker from '@/components/DateTimePicker';
import { getLunarDayStr, getLunarInfo } from '@/lib/lunar';
import { getLocalToday } from '@/lib/taskHelpers';
import { useAppStore } from '@/stores/useAppStore';
import type { Countdown, EventType, CreateCountdownParams } from '@/types/countdown';

// ==================== Icon & Color Options ====================
const ICON_OPTIONS = ['flag', 'heart', 'star', 'gift', 'cake', 'plane', 'ring', 'baby', 'graduation', 'house'];
const ICON_MAP: Record<string, string> = {
  flag: '🚩', heart: '❤️', star: '⭐', gift: '🎁', cake: '🎂',
  plane: '✈️', ring: '💍', baby: '👶', graduation: '🎓', house: '🏠',
};
const COLOR_OPTIONS = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316'];

// ==================== Countdown Form Dialog ====================
function CountdownFormDialog({
  isOpen,
  onClose,
  onSubmit,
  countdown,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (params: CreateCountdownParams) => void;
  countdown?: Countdown | null;
}) {
  const { t } = useTranslation('common');
  const isEditing = !!countdown;
  const { data: calendarEvents = [] } = useCalendarEvents();

  const [title, setTitle] = useState(countdown?.title || '');
  const [description, setDescription] = useState(countdown?.description || '');
  const [icon, setIcon] = useState(countdown?.icon || 'flag');
  const [color, setColor] = useState(countdown?.color || '#8B5CF6');
  const [targetDate, setTargetDate] = useState(countdown?.targetDate || '');
  const [targetTime, setTargetTime] = useState(countdown?.targetTime || '');
  const [eventType, setEventType] = useState<EventType>(countdown?.eventType || 'countdown');

  // Reset form when opening
  useEffect(() => {
    if (isOpen && countdown) {
      setTitle(countdown.title);
      setDescription(countdown.description || '');
      setIcon(countdown.icon || 'flag');
      setColor(countdown.color || '#8B5CF6');
      setTargetDate(countdown.targetDate || '');
      setTargetTime(countdown.targetTime || '');
      setEventType(countdown.eventType || 'countdown');
    } else if (isOpen) {
      setTitle('');
      setDescription('');
      setIcon('flag');
      setColor('#8B5CF6');
      setTargetDate('');
      setTargetTime('');
      setEventType('countdown');
    }
  }, [isOpen, countdown]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !targetDate) return;
    onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      icon,
      color,
      targetDate,
      targetTime: targetTime || undefined,
      eventType,
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
            {isEditing ? t('countdowns.edit_countdown') : t('countdowns.new_countdown')}
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <XMarkIcon className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('countdowns.event_name')} *
            </label>
            <input
              type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              required autoFocus placeholder={t('countdowns.event_name_placeholder')}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('countdowns.description')}
            </label>
            <input
              type="text" value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder={t('countdowns.description_placeholder')}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Event Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('countdowns.event_type')}
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEventType('countdown')}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                  eventType === 'countdown'
                    ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 ring-2 ring-purple-500'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <ClockIcon className="w-4 h-4" />
                {t('countdowns.type_countdown')}
              </button>
              <button
                type="button"
                onClick={() => setEventType('countup')}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                  eventType === 'countup'
                    ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 ring-2 ring-purple-500'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <ArrowPathIcon className="w-4 h-4" />
                {t('countdowns.type_countup')}
              </button>
            </div>
          </div>

          {/* Icon */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('countdowns.icon')}
            </label>
            <div className="flex gap-2 flex-wrap">
              {ICON_OPTIONS.map((ic) => (
                <button key={ic} type="button" onClick={() => setIcon(ic)}
                  className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg transition-all ${
                    icon === ic ? 'ring-2 ring-purple-500 bg-purple-50 dark:bg-purple-900/20' : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >{ICON_MAP[ic] || '🚩'}</button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('countdowns.color')}
            </label>
            <div className="flex gap-2">
              {COLOR_OPTIONS.map((c) => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full transition-all ${
                    color === c ? 'ring-2 ring-offset-2 ring-purple-500' : ''
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Target Date & Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('countdowns.target_date')} *
            </label>
            <DateTimePicker
              date={targetDate || undefined}
              time={targetTime || undefined}
              onChange={(d, tm) => { setTargetDate(d || ''); setTargetTime(tm || ''); }}
              events={calendarEvents}
              showTime={true}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600">
              {t('common.cancel')}
            </button>
            <button type="submit" disabled={!title.trim() || !targetDate}
              className="flex-1 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50">
              {isEditing ? t('common.save') : t('common.create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ==================== Countdown Card ====================
function CountdownCard({
  countdown, onEdit, onDelete,
}: {
  countdown: Countdown; onEdit: () => void; onDelete: () => void;
}) {
  const { t } = useTranslation('common');

  const getDaysRemaining = () => {
    const [year, month, day] = countdown.targetDate.split('-').map(Number);
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    if (countdown.targetTime) {
      const [h, m, s] = countdown.targetTime.split(':').map(Number);
      const target = new Date(year, month - 1, day, h, m, s || 0, 0);
      const diff = target.getTime() - now.getTime();
      return Math.ceil(diff / (1000 * 60 * 60 * 24));
    }
    const target = new Date(year, month - 1, day);
    const diff = target.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const daysRemaining = getDaysRemaining();
  const isCountup = countdown.eventType === 'countup';
  const displayDays = isCountup ? Math.abs(daysRemaining) : daysRemaining;

  const getStatusText = () => {
    if (isCountup) {
      if (daysRemaining >= 0) return t('countdowns.days_since');
      return t('countdowns.days_until');
    }
    if (daysRemaining < 0) return t('countdowns.days_ago');
    if (daysRemaining === 0) return '';
    return t('countdowns.days_left');
  };

  const getDisplayValue = () => {
    if (isCountup) return displayDays;
    if (daysRemaining === 0) return t('countdowns.today');
    return Math.abs(daysRemaining);
  };

  const getNumberColor = () => {
    if (isCountup) return 'text-green-500';
    if (daysRemaining < 0) return 'text-red-500';
    if (daysRemaining === 0) return 'text-green-500';
    return 'text-purple-500';
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
            style={{ backgroundColor: countdown.color + '20' }}
          >
            {ICON_MAP[countdown.icon] || '🚩'}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">{countdown.title}</h3>
            {countdown.description && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">{countdown.description}</p>
            )}
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

      {/* Days Display */}
      <div className="flex items-baseline gap-2 mb-3">
        <span className={`text-4xl font-bold ${getNumberColor()}`}>
          {getDisplayValue()}
        </span>
        <span className="text-gray-500 dark:text-gray-400 text-sm">{getStatusText()}</span>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
        <span>
          {new Date(countdown.targetDate).toLocaleDateString(undefined, {
            year: 'numeric', month: 'long', day: 'numeric',
          })}
          {countdown.targetTime && ` ${countdown.targetTime.slice(0, 5)}`}
        </span>
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
          isCountup ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
        }`}>
          {isCountup ? t('countdowns.type_countup') : t('countdowns.type_countdown')}
        </span>
      </div>
    </div>
  );
}

// ==================== Countdown Calendar View ====================

function classifyLunarStr(lunarStr: string): 'festival' | 'term' | 'month' | 'normal' {
  const solarTerms = [
    '小寒', '大寒', '立春', '雨水', '惊蛰', '春分',
    '清明', '谷雨', '立夏', '小满', '芒种', '夏至',
    '小暑', '大暑', '立秋', '处暑', '白露', '秋分',
    '寒露', '霜降', '立冬', '小雪', '大雪', '冬至',
  ];
  if (solarTerms.includes(lunarStr)) return 'term';
  const monthNames = ['正月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '冬月', '腊月'];
  if (monthNames.includes(lunarStr)) return 'month';
  const festivals = ['春节', '元宵节', '端午节', '七夕节', '中秋节', '重阳节', '腊八节', '除夕', '元旦', '国庆节', '劳动节', '儿童节'];
  if (festivals.some((f) => lunarStr.includes(f))) return 'festival';
  return 'normal';
}

function getLunarColorClass(kind: string, isToday: boolean): string {
  if (kind === 'festival') return 'text-red-500 dark:text-red-400';
  if (kind === 'term') return 'text-green-600 dark:text-green-400';
  if (kind === 'month') return 'text-orange-500 dark:text-orange-400 font-medium';
  if (isToday) return 'text-purple-400 dark:text-purple-500';
  return 'text-gray-400 dark:text-gray-500';
}

function getDaysDiff(targetDate: string): number {
  const [year, month, day] = targetDate.split('-').map(Number);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(year, month - 1, day);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function CountdownCalendarView({
  countdowns,
  onEdit,
  onDelete,
}: {
  countdowns: Countdown[];
  onEdit: (cd: Countdown) => void;
  onDelete: (id: string) => void;
}) {
  const { t, i18n } = useTranslation('common');
  const weekStartDay = useAppStore((s) => s.weekStartDay);
  const [viewMonth, setViewMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [selectedCountdown, setSelectedCountdown] = useState<Countdown | null>(null);

  const dayLabels = useMemo(() => {
    const sun = [
      t('habits.calendar.sun'), t('habits.calendar.mon'), t('habits.calendar.tue'),
      t('habits.calendar.wed'), t('habits.calendar.thu'), t('habits.calendar.fri'),
      t('habits.calendar.sat'),
    ];
    if (weekStartDay === 1) return [...sun.slice(1), sun[0]];
    return sun;
  }, [t, weekStartDay]);

  // Group countdowns by target date
  const countdownsByDate = useMemo(() => {
    const map = new Map<string, Countdown[]>();
    countdowns.forEach((cd) => {
      const existing = map.get(cd.targetDate) || [];
      existing.push(cd);
      map.set(cd.targetDate, existing);
    });
    return map;
  }, [countdowns]);

  // Calendar grid computations
  const { daysInMonth, firstDayOfWeek, trailingEmpty, monthLabel, lunarYearLabel, today } = useMemo(() => {
    const dim = new Date(viewMonth.year, viewMonth.month + 1, 0).getDate();
    const rawDow = new Date(viewMonth.year, viewMonth.month, 1).getDay();
    const fdow = (rawDow - weekStartDay + 7) % 7;
    const totalCells = fdow + dim;
    const trailing = (7 - (totalCells % 7)) % 7;
    const ml = new Date(viewMonth.year, viewMonth.month).toLocaleDateString(i18n.language, {
      year: 'numeric', month: 'long',
    });
    const todayStr = getLocalToday();
    const midLunar = getLunarInfo(viewMonth.year, viewMonth.month + 1, Math.min(15, dim));
    return {
      daysInMonth: dim, firstDayOfWeek: fdow, trailingEmpty: trailing,
      monthLabel: ml, lunarYearLabel: midLunar.yearStr, today: todayStr,
    };
  }, [viewMonth, i18n.language, weekStartDay]);

  // Precompute lunar data
  const lunarDataByDay = useMemo(() => {
    const data: Map<number, { str: string; kind: 'festival' | 'term' | 'month' | 'normal' }> = new Map();
    for (let day = 1; day <= daysInMonth; day++) {
      const lunarStr = getLunarDayStr(viewMonth.year, viewMonth.month + 1, day);
      const kind = classifyLunarStr(lunarStr);
      data.set(day, { str: lunarStr, kind });
    }
    return data;
  }, [viewMonth.year, viewMonth.month, daysInMonth]);

  const prevMonth = () => setViewMonth((v) => v.month === 0 ? { year: v.year - 1, month: 11 } : { ...v, month: v.month - 1 });
  const nextMonth = () => setViewMonth((v) => v.month === 11 ? { year: v.year + 1, month: 0 } : { ...v, month: v.month + 1 });
  const goToday = () => { const now = new Date(); setViewMonth({ year: now.getFullYear(), month: now.getMonth() }); };

  // Upcoming events list for the current month
  const monthEvents = useMemo(() => {
    const events: { countdown: Countdown; daysDiff: number }[] = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${viewMonth.year}-${String(viewMonth.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const cds = countdownsByDate.get(dateStr);
      if (cds) {
        cds.forEach((cd) => events.push({ countdown: cd, daysDiff: getDaysDiff(dateStr) }));
      }
    }
    return events;
  }, [viewMonth, daysInMonth, countdownsByDate]);

  return (
    <div className="flex-1 overflow-auto p-6">
      {/* Calendar header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} aria-label={t('tasks.views.prev_month')} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <ChevronLeftIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <div className="min-w-[200px] text-center">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{monthLabel}</h2>
            <span className="text-xs text-gray-400 dark:text-gray-500">{lunarYearLabel}</span>
          </div>
          <button onClick={nextMonth} aria-label={t('tasks.views.next_month')} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <ChevronRightIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>
        <button
          onClick={goToday}
          className="px-3 py-1.5 text-sm rounded-lg bg-purple-500 text-white hover:bg-purple-600 transition-colors"
        >
          {t('tasks.views.today')}
        </button>
      </div>

      <div className="flex gap-6">
        {/* Calendar grid */}
        <div className="flex-1">
          <div className="grid grid-cols-7 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            {/* Day labels */}
            {dayLabels.map((d) => (
              <div key={d} className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                {d}
              </div>
            ))}

            {/* Empty cells */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[110px] bg-gray-50/50 dark:bg-gray-900/50 border-b border-r border-gray-100 dark:border-gray-800" />
            ))}

            {/* Day cells */}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
              const dateStr = `${viewMonth.year}-${String(viewMonth.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dayCountdowns = countdownsByDate.get(dateStr) || [];
              const isToday = dateStr === today;
              const lunarDay = lunarDataByDay.get(day);

              return (
                <div
                  key={day}
                  className={`min-h-[110px] border-b border-r border-gray-100 dark:border-gray-800 p-1 ${
                    isToday ? 'bg-purple-50/50 dark:bg-purple-900/10' : ''
                  }`}
                >
                  {/* Date number + lunar day */}
                  <div className="flex items-baseline gap-1.5 mb-1 px-1">
                    <span className={`text-xs font-medium ${
                      isToday ? 'text-purple-600 dark:text-purple-400 font-bold' : 'text-gray-600 dark:text-gray-400'
                    }`}>
                      {day}
                    </span>
                    {lunarDay && (
                      <span className={`text-xs leading-tight truncate ${getLunarColorClass(lunarDay.kind, isToday)}`}>
                        {lunarDay.str}
                      </span>
                    )}
                  </div>

                  {/* Countdown events */}
                  <div className="space-y-0.5">
                    {dayCountdowns.slice(0, 3).map((cd) => {
                      const diff = getDaysDiff(cd.targetDate);
                      const isCountup = cd.eventType === 'countup';
                      const isSelected = selectedCountdown?.id === cd.id;
                      let diffLabel: string;
                      if (diff === 0) diffLabel = t('countdowns.today');
                      else if (isCountup) diffLabel = `${Math.abs(diff)}${t('countdowns.days_since_short')}`;
                      else if (diff < 0) diffLabel = `${Math.abs(diff)}${t('countdowns.days_ago_short')}`;
                      else diffLabel = `${diff}${t('countdowns.days_left_short')}`;

                      return (
                        <div
                          key={cd.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => setSelectedCountdown(isSelected ? null : cd)}
                          onKeyDown={(e) => { if (e.key === 'Enter') setSelectedCountdown(isSelected ? null : cd); }}
                          className={`flex items-center gap-1 px-1.5 py-1 rounded text-xs cursor-pointer truncate transition-colors focus:outline-none ${
                            isSelected
                              ? 'ring-1 ring-purple-500 bg-purple-50 dark:bg-purple-900/30'
                              : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                          style={{ backgroundColor: isSelected ? undefined : cd.color + '12' }}
                        >
                          <span className="text-sm flex-shrink-0">{ICON_MAP[cd.icon] || '🚩'}</span>
                          <div className="flex-1 min-w-0">
                            <div className={`truncate font-medium ${isSelected ? 'text-purple-700 dark:text-purple-300' : ''}`}
                              style={!isSelected ? { color: cd.color } : {}}>
                              {cd.title}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{diffLabel}</div>
                          </div>
                        </div>
                      );
                    })}
                    {dayCountdowns.length > 3 && (
                      <div className="text-xs text-purple-500 dark:text-purple-400 px-1">
                        +{dayCountdowns.length - 3}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Trailing empty cells */}
            {Array.from({ length: trailingEmpty }).map((_, i) => (
              <div key={`trailing-${i}`} className="min-h-[110px] bg-gray-50/50 dark:bg-gray-900/50 border-b border-r border-gray-100 dark:border-gray-800" />
            ))}
          </div>
        </div>

        {/* Side panel: selected event detail or month events */}
        <div className="w-64 flex-shrink-0 hidden lg:block">
          {selectedCountdown ? (
            <SelectedCountdownDetail
              countdown={selectedCountdown}
              onEdit={() => onEdit(selectedCountdown)}
              onDelete={() => { onDelete(selectedCountdown.id); setSelectedCountdown(null); }}
              onClose={() => setSelectedCountdown(null)}
            />
          ) : (
            <MonthEventsList events={monthEvents} onSelect={setSelectedCountdown} />
          )}
        </div>
      </div>
    </div>
  );
}

function SelectedCountdownDetail({
  countdown, onEdit, onDelete, onClose,
}: {
  countdown: Countdown;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation('common');
  const diff = getDaysDiff(countdown.targetDate);
  const isCountup = countdown.eventType === 'countup';
  const displayDays = isCountup ? Math.abs(diff) : Math.abs(diff);

  const parts = countdown.targetDate.split('-').map(Number);
  const lunar = getLunarDayStr(parts[0], parts[1], parts[2]);

  return (
    <div className="sticky top-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">{t('countdowns.detail')}</h3>
        <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
          <XMarkIcon className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
          style={{ backgroundColor: countdown.color + '20' }}>
          {ICON_MAP[countdown.icon] || '🚩'}
        </div>
        <div>
          <h4 className="font-semibold text-gray-900 dark:text-gray-100">{countdown.title}</h4>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
            isCountup ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
          }`}>
            {isCountup ? t('countdowns.type_countup') : t('countdowns.type_countdown')}
          </span>
        </div>
      </div>

      <div className="text-center mb-4 py-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
        <div className={`text-5xl font-bold ${
          isCountup ? 'text-green-500' : diff < 0 ? 'text-red-500' : diff === 0 ? 'text-green-500' : 'text-purple-500'
        }`}>
          {diff === 0 && !isCountup ? t('countdowns.today') : displayDays}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {isCountup
            ? (diff >= 0 ? t('countdowns.days_since') : t('countdowns.days_until'))
            : (diff < 0 ? t('countdowns.days_ago') : t('countdowns.days_left'))
          }
        </div>
      </div>

      <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
        <div className="flex justify-between">
          <span>{t('countdowns.target_date')}</span>
          <span className="text-gray-900 dark:text-gray-100">{countdown.targetDate}</span>
        </div>
        <div className="flex justify-between">
          <span>{t('countdowns.lunar_date')}</span>
          <span className="text-gray-900 dark:text-gray-100">{lunar}</span>
        </div>
        {countdown.targetTime && (
          <div className="flex justify-between">
            <span>{t('countdowns.target_time')}</span>
            <span className="text-gray-900 dark:text-gray-100">{countdown.targetTime.slice(0, 5)}</span>
          </div>
        )}
        {countdown.description && (
          <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">{countdown.description}</p>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button onClick={onEdit}
          className="flex-1 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
          {t('common.edit')}
        </button>
        <button onClick={onDelete}
          className="px-3 py-2 text-sm bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors">
          {t('common.delete')}
        </button>
      </div>
    </div>
  );
}

function MonthEventsList({
  events,
  onSelect,
}: {
  events: { countdown: Countdown; daysDiff: number }[];
  onSelect: (cd: Countdown) => void;
}) {
  const { t } = useTranslation('common');

  if (events.length === 0) {
    return (
      <div className="sticky top-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">{t('countdowns.month_events')}</h3>
        <p className="text-xs text-gray-400 dark:text-gray-500">{t('countdowns.no_events_this_month')}</p>
      </div>
    );
  }

  return (
    <div className="sticky top-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
      <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">
        {t('countdowns.month_events')} ({events.length})
      </h3>
      <div className="space-y-2">
        {events.map(({ countdown: cd, daysDiff }) => {
          const isCountup = cd.eventType === 'countup';
          let diffLabel: string;
          if (daysDiff === 0) diffLabel = t('countdowns.today');
          else if (isCountup) diffLabel = `${Math.abs(daysDiff)} ${t('countdowns.days_since')}`;
          else if (daysDiff < 0) diffLabel = `${Math.abs(daysDiff)} ${t('countdowns.days_ago')}`;
          else diffLabel = `${daysDiff} ${t('countdowns.days_left')}`;

          return (
            <button
              key={cd.id}
              onClick={() => onSelect(cd)}
              className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
            >
              <span className="text-lg">{ICON_MAP[cd.icon] || '🚩'}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{cd.title}</div>
                <div className={`text-xs font-medium ${
                  isCountup ? 'text-green-500' : daysDiff < 0 ? 'text-red-500' : daysDiff === 0 ? 'text-green-500' : 'text-purple-500'
                }`}>
                  {diffLabel}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ==================== Main Page ====================
export default function CountdownsPage() {
  const { t } = useTranslation('common');
  const [showForm, setShowForm] = useState(false);
  const [editingCountdown, setEditingCountdown] = useState<Countdown | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'calendar'>('grid');

  const { data: countdowns = [], isLoading, isError } = useCountdowns();
  const createCountdown = useCreateCountdown();
  const updateCountdown = useUpdateCountdown();
  const deleteCountdown = useDeleteCountdown();

  const handleCreate = (params: CreateCountdownParams) => {
    createCountdown.mutate(params, {
      onError: (err) => {
        console.error('Failed to create countdown:', err);
        alert(`Failed to create: ${err instanceof Error ? err.message : String(err)}`);
      },
    });
  };

  const handleUpdate = (params: CreateCountdownParams) => {
    if (editingCountdown) {
      updateCountdown.mutate({ id: editingCountdown.id, ...params }, {
        onError: (err) => {
          console.error('Failed to update countdown:', err);
          alert(`Failed to update: ${err instanceof Error ? err.message : String(err)}`);
        },
      });
      setEditingCountdown(null);
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm(t('countdowns.delete_confirm'))) {
      deleteCountdown.mutate(id, {
        onError: (err) => {
          console.error('Failed to delete countdown:', err);
          alert(`Failed to delete: ${err instanceof Error ? err.message : String(err)}`);
        },
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-500">{t('common.loading')}</div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-red-500 dark:text-red-400">Failed to load countdowns. Please try again.</div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ backgroundColor: 'var(--theme-bg-2)' }}>
      {/* Page header */}
      <div data-tauri-drag-region className="flex items-center justify-between px-8 pt-4 pb-4">
        <h1 data-tauri-drag-region className="text-3xl font-bold text-gray-900 dark:text-gray-100">{t('navigation.countdowns')}</h1>
        <div className="flex items-center gap-3">
          {/* View mode toggle */}
          <div className="flex border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors ${
                viewMode === 'grid'
                  ? 'bg-purple-500 text-white'
                  : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600'
              }`}
              title={t('countdowns.view_grid')}
            >
              <Squares2X2Icon className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors border-l border-gray-300 dark:border-gray-600 ${
                viewMode === 'calendar'
                  ? 'bg-purple-500 text-white'
                  : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600'
              }`}
              title={t('countdowns.view_calendar')}
            >
              <CalendarIcon className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={() => { setEditingCountdown(null); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
            <span>{t('countdowns.new_countdown')}</span>
          </button>
        </div>
      </div>

      {/* Content area */}
      {countdowns.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
          <ClockIcon className="w-16 h-16 mb-4 text-gray-300 dark:text-gray-600" />
          <p className="text-lg">{t('countdowns.no_countdowns')}</p>
          <button onClick={() => setShowForm(true)} className="mt-4 text-purple-500 hover:text-purple-600 dark:hover:text-purple-400">
            {t('countdowns.create_first')}
          </button>
        </div>
      ) : viewMode === 'calendar' ? (
        <CountdownCalendarView
          countdowns={countdowns}
          onEdit={(cd) => { setEditingCountdown(cd); setShowForm(true); }}
          onDelete={handleDelete}
        />
      ) : (
          <div className="flex-1 overflow-auto px-8 pb-8">
            <div className="space-y-4">
            {countdowns.map((countdown) => (
              <CountdownCard
                key={countdown.id}
                countdown={countdown}
                onEdit={() => { setEditingCountdown(countdown); setShowForm(true); }}
                onDelete={() => handleDelete(countdown.id)}
              />
            ))}
          </div>
        </div>
      )}

      <CountdownFormDialog
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditingCountdown(null); }}
        onSubmit={editingCountdown ? handleUpdate : handleCreate}
        countdown={editingCountdown}
      />
    </div>
  );
}
