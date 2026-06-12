import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeftIcon, ChevronRightIcon, CheckIcon } from '@heroicons/react/24/outline';
import { emit } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { getLunarDayStr } from '@/lib/lunar';

export default function DatePickerDialogPage() {
  const { t, i18n } = useTranslation('common');
  const params = new URLSearchParams(window.location.search);
  const initialDate = params.get('date') || new Date().toISOString().split('T')[0];

  const [viewMonth, setViewMonth] = useState(() => {
    const d = new Date(initialDate + 'T00:00:00');
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [selectedDate, setSelectedDate] = useState(initialDate);

  const daysInMonth = new Date(viewMonth.year, viewMonth.month + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewMonth.year, viewMonth.month, 1).getDay();
  const today = new Date().toISOString().split('T')[0];

  const monthLabel = new Date(viewMonth.year, viewMonth.month).toLocaleDateString(i18n.language, {
    year: 'numeric', month: 'long',
  });

  const dayLabels = [
    t('habits.calendar.sun'), t('habits.calendar.mon'), t('habits.calendar.tue'),
    t('habits.calendar.wed'), t('habits.calendar.thu'), t('habits.calendar.fri'),
    t('habits.calendar.sat'),
  ];

  const prevMonth = () => {
    setViewMonth((v) => v.month === 0 ? { year: v.year - 1, month: 11 } : { ...v, month: v.month - 1 });
  };

  const nextMonth = () => {
    setViewMonth((v) => v.month === 11 ? { year: v.year + 1, month: 0 } : { ...v, month: v.month + 1 });
  };

  const goToday = () => {
    const now = new Date();
    setViewMonth({ year: now.getFullYear(), month: now.getMonth() });
    setSelectedDate(today);
  };

  const handleConfirm = async () => {
    await emit('date-picker:result', { date: selectedDate });
    await getCurrentWindow().close();
  };

  const handleClose = async () => {
    await getCurrentWindow().close();
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('habits.start_date')}</h2>
        <button onClick={handleClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
          <span className="text-gray-500">✕</span>
        </button>
      </div>

      <div className="p-4">
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-1">
            <button onClick={prevMonth} className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600">
              <ChevronLeftIcon className="w-4 h-4 text-gray-500" />
            </button>
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 min-w-[130px] text-center">
              {monthLabel}
            </span>
            <button onClick={nextMonth} className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600">
              <ChevronRightIcon className="w-4 h-4 text-gray-500" />
            </button>
          </div>
          <button onClick={goToday} className="px-2 py-1 text-xs rounded bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500">
            {t('tasks.views.today')}
          </button>
        </div>

        {/* Day labels */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {dayLabels.map((d) => (
            <div key={d} className="text-center text-xs text-gray-400 dark:text-gray-500 py-1">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`empty-${i}`} />)}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
            const dateStr = `${viewMonth.year}-${String(viewMonth.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isSelected = dateStr === selectedDate;
            const isToday = dateStr === today;
            const lunarStr = getLunarDayStr(viewMonth.year, viewMonth.month + 1, day);

            return (
              <button
                key={day}
                onClick={() => setSelectedDate(dateStr)}
                className={`flex flex-col items-center py-1.5 rounded-lg transition-all ${
                  isSelected
                    ? 'bg-blue-500 text-white'
                    : isToday
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                <span className="text-sm">{day}</span>
                <span className={`text-[10px] ${isSelected ? 'text-white/70' : 'text-gray-400 dark:text-gray-500'}`}>
                  {lunarStr}
                </span>
              </button>
            );
          })}
        </div>

        {/* Selected date display */}
        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{selectedDate}</span>
              <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">
                {(() => {
                  const parts = selectedDate.split('-').map(Number);
                  return getLunarDayStr(parts[0], parts[1], parts[2]);
                })()}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-4">
          <button onClick={handleClose} className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600">
            {t('common.cancel')}
          </button>
          <button onClick={handleConfirm} className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center justify-center gap-1">
            <CheckIcon className="w-4 h-4" />
            {t('common.save')}
          </button>
        </div>
      </div>
    </div>
  );
}
