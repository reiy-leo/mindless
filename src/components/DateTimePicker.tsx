import { useState, useRef, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeftIcon, ChevronRightIcon, CalendarIcon } from '@heroicons/react/24/outline';
import { getLunarInfo, getLunarDayStr } from '@/lib/lunar';
import type { CalendarEvent } from '@/types';

interface DateTimePickerProps {
  date?: string;        // YYYY-MM-DD
  time?: string;        // HH:mm
  onChange: (date?: string, time?: string) => void;
  events?: CalendarEvent[];
  showTime?: boolean;   // default true
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

export default function DateTimePicker({
  date,
  time,
  onChange,
  events = [],
  showTime = true,
}: DateTimePickerProps) {
  const { t } = useTranslation('common');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Current view month (for calendar navigation)
  const initialDate = date ? new Date(date + 'T00:00:00') : new Date();
  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth() + 1);

  // Update view when date prop changes
  useEffect(() => {
    if (date) {
      const d = new Date(date + 'T00:00:00');
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth() + 1);
    }
  }, [date]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handler);
    }
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Build calendar grid days
  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth - 1, 1);
    const lastDay = new Date(viewYear, viewMonth, 0);
    const daysInMonth = lastDay.getDate();
    // Day of week: 0=Sun, 1=Mon, ... We start with Monday
    let startDow = firstDay.getDay() - 1; // Mon=0
    if (startDow < 0) startDow = 6; // Sun=6

    const days: { day: number; dateStr: string; inMonth: boolean }[] = [];
    // Previous month filler
    const prevMonthLast = new Date(viewYear, viewMonth - 1, 0).getDate();
    for (let i = startDow - 1; i >= 0; i--) {
      const d = prevMonthLast - i;
      const m = viewMonth - 1;
      const y = m <= 0 ? viewYear - 1 : viewYear;
      const mo = m <= 0 ? 12 : m;
      days.push({ day: d, dateStr: toDateStr(y, mo, d), inMonth: false });
    }
    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      days.push({ day: d, dateStr: toDateStr(viewYear, viewMonth, d), inMonth: true });
    }
    // Next month filler
    const remaining = 42 - days.length; // 6 rows of 7
    for (let d = 1; d <= remaining; d++) {
      const m = viewMonth + 1;
      const y = m > 12 ? viewYear + 1 : viewYear;
      const mo = m > 12 ? 1 : m;
      days.push({ day: d, dateStr: toDateStr(y, mo, d), inMonth: false });
    }
    return days;
  }, [viewYear, viewMonth]);

  // Events map: dateStr -> events[]
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

  // Lunar info for selected date
  const selectedLunarInfo = useMemo(() => {
    if (!date) return null;
    const parts = date.split('-').map(Number);
    if (parts.length !== 3) return null;
    return getLunarInfo(parts[0], parts[1], parts[2]);
  }, [date]);

  const handleSelectDate = (dateStr: string) => {
    onChange(dateStr, time);
    // Update view month to match selected date
    const parts = dateStr.split('-').map(Number);
    if (parts.length === 3) {
      setViewYear(parts[0]);
      setViewMonth(parts[1]);
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

  return (
    <div ref={containerRef} className="relative inline-block">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-left"
      >
        <CalendarIcon className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
        <span className={date ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'}>
          {date ? formatDisplayDate(date) : t('tasks.date_placeholder')}
          {showTime && time ? ` ${time}` : ''}
        </span>
      </button>

      {/* Popover */}
      {open && (
        <div className="absolute z-50 mt-1 w-72 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-3">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <ChevronLeftIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {viewYear} / {String(viewMonth).padStart(2, '0')}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <ChevronRightIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>
          </div>

          {/* Weekday header */}
          <div className="grid grid-cols-7 mb-1">
            {WEEKDAY_KEYS.map((key) => (
              <div key={key} className="text-center text-xs text-gray-500 dark:text-gray-400 py-1">
                {t(`habits.days.${key}`)}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7">
            {calendarDays.map((cell, idx) => {
              const isSelected = cell.dateStr === date;
              const isToday = cell.dateStr === todayStr;
              const cellEvents = eventsByDate[cell.dateStr] || [];

              // Get lunar day text (only for current month to save perf)
              const lunarStr = cell.inMonth
                ? getLunarDayStr(...cell.dateStr.split('-').map(Number) as [number, number, number])
                : '';

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectDate(cell.dateStr)}
                  className={`
                    relative flex flex-col items-center justify-start py-1 text-xs rounded transition-colors
                    ${isSelected ? 'bg-blue-500 text-white' : ''}
                    ${!isSelected && isToday ? 'ring-1 ring-blue-400 dark:ring-blue-500' : ''}
                    ${!isSelected && !isToday && cell.inMonth ? 'text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700' : ''}
                    ${!cell.inMonth ? 'text-gray-300 dark:text-gray-600' : ''}
                  `}
                >
                  <span className={`text-sm leading-none ${isSelected ? 'text-white' : ''}`}>
                    {cell.day}
                  </span>
                  {lunarStr && (
                    <span className={`text-[10px] leading-tight mt-0.5 truncate max-w-full px-0.5 ${
                      isSelected
                        ? 'text-blue-100'
                        : cell.inMonth
                          ? 'text-gray-400 dark:text-gray-500'
                          : 'text-gray-200 dark:text-gray-700'
                    }`}>
                      {lunarStr}
                    </span>
                  )}
                  {/* Event dots */}
                  {cellEvents.length > 0 && (
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex gap-0.5">
                      {cellEvents.slice(0, 2).map((ev, i) => (
                        <span
                          key={i}
                          className="w-1 h-1 rounded-full"
                          style={{ backgroundColor: ev.color || '#3B82F6' }}
                        />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Selected date lunar info */}
          {selectedLunarInfo && (
            <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                <span className="font-medium">{selectedLunarInfo.yearStr}</span>
                {' '}
                {selectedLunarInfo.monthStr}
                {selectedLunarInfo.dayStr}
                {selectedLunarInfo.festivals.length > 0 && (
                  <span className="ml-1 text-blue-500">
                    {selectedLunarInfo.festivals.join(', ')}
                  </span>
                )}
                {selectedLunarInfo.solarTerms.length > 0 && (
                  <span className="ml-1 text-green-500">
                    {selectedLunarInfo.solarTerms.join(', ')}
                  </span>
                )}
              </p>
            </div>
          )}

          {/* Time picker */}
          {showTime && (
            <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
              <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">
                {t('tasks.due_time')}
              </label>
              <input
                type="time"
                value={time || ''}
                onChange={(e) => onChange(date, e.target.value || undefined)}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {/* Clear button */}
          <button
            type="button"
            onClick={() => {
              onChange(undefined, undefined);
              setOpen(false);
            }}
            className="mt-2 w-full text-xs text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors py-1"
          >
            {t('common.delete')}
          </button>
        </div>
      )}
    </div>
  );
}
