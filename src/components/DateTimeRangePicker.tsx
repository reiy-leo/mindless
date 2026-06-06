import { useState, useRef, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeftIcon, ChevronRightIcon, CalendarIcon } from '@heroicons/react/24/outline';
import { getLunarInfo, getLunarDayStr } from '@/lib/lunar';
import type { CalendarEvent } from '@/types';

interface DateTimeRangePickerProps {
  startDate?: string;
  startTime?: string;
  endDate?: string;
  endTime?: string;
  onChange: (startDate?: string, startTime?: string, endDate?: string, endTime?: string) => void;
  events?: CalendarEvent[];
}

const WEEKDAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[0]}/${parts[1]}/${parts[2]}`;
}

function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function isDateInRange(dateStr: string, start?: string, end?: string): boolean {
  if (!start || !end) return false;
  return dateStr > start && dateStr < end;
}

function buildCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const daysInMonth = lastDay.getDate();
  let startDow = firstDay.getDay() - 1;
  if (startDow < 0) startDow = 6;

  const days: { day: number; dateStr: string; inMonth: boolean }[] = [];
  const prevMonthLast = new Date(year, month - 1, 0).getDate();
  for (let i = startDow - 1; i >= 0; i--) {
    const d = prevMonthLast - i;
    const m = month - 1;
    const y = m <= 0 ? year - 1 : year;
    const mo = m <= 0 ? 12 : m;
    days.push({ day: d, dateStr: toDateStr(y, mo, d), inMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    days.push({ day: d, dateStr: toDateStr(year, month, d), inMonth: true });
  }
  const remaining = 42 - days.length;
  for (let d = 1; d <= remaining; d++) {
    const m = month + 1;
    const y = m > 12 ? year + 1 : year;
    const mo = m > 12 ? 1 : m;
    days.push({ day: d, dateStr: toDateStr(y, mo, d), inMonth: false });
  }
  return days;
}

export default function DateTimeRangePicker({
  startDate,
  startTime,
  endDate,
  endTime,
  onChange,
  events = [],
}: DateTimeRangePickerProps) {
  const { t } = useTranslation('common');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // View month for the left calendar
  const initDate = startDate ? new Date(startDate + 'T00:00:00') : new Date();
  const [viewYear, setViewYear] = useState(initDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initDate.getMonth() + 1);

  // Which end is being picked: 'start' or 'end'
  const [pickingEnd, setPickingEnd] = useState(false);

  useEffect(() => {
    if (startDate) {
      const d = new Date(startDate + 'T00:00:00');
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth() + 1);
    }
  }, [startDate]);

  // Right calendar = next month
  const rightYear = viewMonth === 12 ? viewYear + 1 : viewYear;
  const rightMonth = viewMonth === 12 ? 1 : viewMonth + 1;

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const leftDays = useMemo(() => buildCalendarDays(viewYear, viewMonth), [viewYear, viewMonth]);
  const rightDays = useMemo(() => buildCalendarDays(rightYear, rightMonth), [rightYear, rightMonth]);

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const ev of events) {
      if (!map[ev.eventDate]) map[ev.eventDate] = [];
      map[ev.eventDate].push(ev);
    }
    return map;
  }, [events]);

  const todayStr = useMemo(() => {
    const now = new Date();
    return toDateStr(now.getFullYear(), now.getMonth() + 1, now.getDate());
  }, []);

  const startLunar = useMemo(() => {
    if (!startDate) return null;
    const p = startDate.split('-').map(Number);
    return getLunarInfo(p[0], p[1], p[2]);
  }, [startDate]);

  const endLunar = useMemo(() => {
    if (!endDate) return null;
    const p = endDate.split('-').map(Number);
    return getLunarInfo(p[0], p[1], p[2]);
  }, [endDate]);

  const handleSelectDate = (dateStr: string) => {
    if (!pickingEnd) {
      // Picking start
      onChange(dateStr, startTime, endDate && dateStr <= endDate ? endDate : undefined, endDate && dateStr <= endDate ? endTime : undefined);
      if (endDate && dateStr <= endDate) {
        setPickingEnd(true);
      }
    } else {
      // Picking end
      if (dateStr < (startDate || '')) {
        // If end < start, swap
        onChange(dateStr, startTime, startDate, endTime);
      } else {
        onChange(startDate, startTime, dateStr, endTime);
      }
      setPickingEnd(false);
    }
  };

  const handlePrevMonth = () => {
    if (viewMonth === 1) {
      setViewMonth(12);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 12) {
      setViewMonth(1);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const renderCalendar = (days: typeof leftDays, year: number, month: number) => (
    <div className="w-full">
      <div className="text-center text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
        {year} / {String(month).padStart(2, '0')}
      </div>
      {/* Weekday header */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAY_KEYS.map((key) => (
          <div key={key} className="text-center text-[10px] text-gray-500 dark:text-gray-400 py-0.5">
            {t(`habits.days.${key}`)}
          </div>
        ))}
      </div>
      {/* Days grid */}
      <div className="grid grid-cols-7">
        {days.map((cell, idx) => {
          const isSelectedStart = cell.dateStr === startDate;
          const isSelectedEnd = cell.dateStr === endDate;
          const isInRange = isDateInRange(cell.dateStr, startDate, endDate);
          const isToday = cell.dateStr === todayStr;
          const cellEvents = eventsByDate[cell.dateStr] || [];
          const lunarStr = cell.inMonth
            ? getLunarDayStr(...cell.dateStr.split('-').map(Number) as [number, number, number])
            : '';

          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelectDate(cell.dateStr)}
              className={`
                relative flex flex-col items-center justify-start py-0.5 text-xs rounded transition-colors
                ${isSelectedStart || isSelectedEnd ? 'bg-blue-500 text-white z-10' : ''}
                ${isInRange ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
                ${!isSelectedStart && !isSelectedEnd && isToday ? 'ring-1 ring-blue-400 dark:ring-blue-500' : ''}
                ${!isSelectedStart && !isSelectedEnd && !isInRange && cell.inMonth ? 'text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700' : ''}
                ${!cell.inMonth ? 'text-gray-300 dark:text-gray-600' : ''}
              `}
            >
              <span className={`text-sm leading-none ${isSelectedStart || isSelectedEnd ? 'text-white' : ''}`}>
                {cell.day}
              </span>
              {lunarStr && (
                <span className={`text-[9px] leading-tight mt-0.5 truncate max-w-full px-0.5 ${
                  isSelectedStart || isSelectedEnd
                    ? 'text-blue-100'
                    : cell.inMonth
                      ? 'text-gray-400 dark:text-gray-500'
                      : 'text-gray-200 dark:text-gray-700'
                }`}>
                  {lunarStr}
                </span>
              )}
              {cellEvents.length > 0 && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex gap-0.5">
                  {cellEvents.slice(0, 2).map((ev, i) => (
                    <span key={i} className="w-1 h-1 rounded-full" style={{ backgroundColor: ev.color || '#3B82F6' }} />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );

  const triggerText = startDate || endDate
    ? `${startDate ? formatDisplayDate(startDate) : '...'}${startTime ? ` ${startTime}` : ''} \u2192 ${endDate ? formatDisplayDate(endDate) : '...'}${endTime ? ` ${endTime}` : ''}`
    : t('tasks.date_placeholder');

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-left"
      >
        <CalendarIcon className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
        <span className={`text-sm truncate ${startDate || endDate ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'}`}>
          {triggerText}
        </span>
      </button>

      {/* Popover */}
      {open && (
        <div className="absolute z-50 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-3" style={{ minWidth: '560px', maxWidth: '620px' }}>
          {/* Month navigation + picking indicator */}
          <div className="flex items-center justify-between mb-2">
            <button type="button" onClick={handlePrevMonth} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <ChevronLeftIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPickingEnd(false)}
                className={`text-xs px-2 py-1 rounded ${!pickingEnd ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}
              >
                {t('tasks.range_start')}
              </button>
              <span className="text-gray-400 dark:text-gray-500">&rarr;</span>
              <button
                type="button"
                onClick={() => setPickingEnd(true)}
                className={`text-xs px-2 py-1 rounded ${pickingEnd ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}
              >
                {t('tasks.range_end')}
              </button>
            </div>
            <button type="button" onClick={handleNextMonth} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <ChevronRightIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>
          </div>

          {/* Two calendars side by side */}
          <div className="grid grid-cols-2 gap-3">
            {renderCalendar(leftDays, viewYear, viewMonth)}
            {renderCalendar(rightDays, rightYear, rightMonth)}
          </div>

          {/* Lunar summary */}
          <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700 grid grid-cols-2 gap-2">
            <div>
              <span className="text-xs text-gray-500 dark:text-gray-400">{t('tasks.range_start')}: </span>
              {startLunar && (
                <span className="text-xs text-gray-600 dark:text-gray-300">
                  {startLunar.yearStr} {startLunar.monthStr}{startLunar.dayStr}
                  {startLunar.festivals.length > 0 && <span className="ml-1 text-blue-500">{startLunar.festivals[0]}</span>}
                </span>
              )}
            </div>
            <div>
              <span className="text-xs text-gray-500 dark:text-gray-400">{t('tasks.range_end')}: </span>
              {endLunar && (
                <span className="text-xs text-gray-600 dark:text-gray-300">
                  {endLunar.yearStr} {endLunar.monthStr}{endLunar.dayStr}
                  {endLunar.festivals.length > 0 && <span className="ml-1 text-blue-500">{endLunar.festivals[0]}</span>}
                </span>
              )}
            </div>
          </div>

          {/* Time pickers */}
          <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700 grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">
                {t('tasks.range_start')} {t('tasks.due_time')}
              </label>
              <input
                type="time"
                value={startTime || ''}
                onChange={(e) => onChange(startDate, e.target.value || undefined, endDate, endTime)}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">
                {t('tasks.range_end')} {t('tasks.due_time')}
              </label>
              <input
                type="time"
                value={endTime || ''}
                onChange={(e) => onChange(startDate, startTime, endDate, e.target.value || undefined)}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
