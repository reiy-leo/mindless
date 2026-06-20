import { useState, useMemo, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Solar, Lunar } from 'lunar-javascript';
import WheelPicker from './WheelPicker';

interface BirthdayWheelPickerProps {
  date?: string; // YYYY-MM-DD format
  onChange: (date: string, isLunar?: boolean) => void;
  className?: string;
  initialCalendarType?: 'solar' | 'lunar';
}

type CalendarType = 'solar' | 'lunar';

const MONTH_NAMES = [
  '正月', '二月', '三月', '四月', '五月', '六月',
  '七月', '八月', '九月', '十月', '冬月', '腊月'
];

// Get days in a lunar month by iterating
function getLunarMonthDays(year: number, month: number, isLeap: boolean): number {
  let days = 0;
  const lunarMonth = isLeap ? -month : month;
  for (let d = 1; d <= 30; d++) {
    try {
      const lunar = Lunar.fromYmd(year, lunarMonth, d);
      const actualMonth = Math.abs(lunar.getMonth());
      if (actualMonth === month && lunar.getMonth() < 0 === isLeap) {
        days = d;
      } else {
        break;
      }
    } catch {
      break;
    }
  }
  return days || 30;
}

// Check if a year has a leap month
function getLeapMonth(year: number): number {
  try {
    const lunar = Lunar.fromYmd(year, 1, 1);
    return lunar.getLeapMonth();
  } catch {
    return 0;
  }
}

export default function BirthdayWheelPicker({
  date,
  onChange,
  className = '',
  initialCalendarType = 'solar',
}: BirthdayWheelPickerProps) {
  const { t } = useTranslation('common');
  const [calendarType, setCalendarType] = useState<CalendarType>(initialCalendarType);

  // Parse initial date
  const parseDate = (d?: string) => {
    if (!d) {
      const now = new Date();
      return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
    }
    const parts = d.split('-').map(Number);
    return { year: parts[0], month: parts[1], day: parts[2] };
  };

  const initialDate = parseDate(date);
  const [solarYear, setSolarYear] = useState(initialDate.year);
  const [solarMonth, setSolarMonth] = useState(initialDate.month);
  const [solarDay, setSolarDay] = useState(initialDate.day);

  // Update when date prop changes
  useEffect(() => {
    const parsed = parseDate(date);
    setSolarYear(parsed.year);
    setSolarMonth(parsed.month);
    setSolarDay(parsed.day);
  }, [date]);

  // Convert solar to lunar for initial lunar values
  const initialLunar = useMemo(() => {
    try {
      const solar = Solar.fromYmd(solarYear, solarMonth, solarDay);
      const lunar = solar.getLunar();
      return {
        year: lunar.getYear(),
        month: Math.abs(lunar.getMonth()),
        day: lunar.getDay(),
        isLeapMonth: lunar.getMonth() < 0,
      };
    } catch {
      const now = new Date();
      const solar = Solar.fromYmd(now.getFullYear(), now.getMonth() + 1, now.getDate());
      const lunar = solar.getLunar();
      return {
        year: lunar.getYear(),
        month: Math.abs(lunar.getMonth()),
        day: lunar.getDay(),
        isLeapMonth: lunar.getMonth() < 0,
      };
    }
  }, [solarYear, solarMonth, solarDay]);

  const [lunarYear, setLunarYear] = useState(initialLunar.year);
  const [lunarMonth, setLunarMonth] = useState(initialLunar.month);
  const [lunarDay, setLunarDay] = useState(initialLunar.day);
  const [isLeapMonth, setIsLeapMonth] = useState(initialLunar.isLeapMonth);

  // Update lunar values when solar changes
  useEffect(() => {
    if (calendarType === 'solar') {
      try {
        const solar = Solar.fromYmd(solarYear, solarMonth, solarDay);
        const lunar = solar.getLunar();
        setLunarYear(lunar.getYear());
        setLunarMonth(Math.abs(lunar.getMonth()));
        setLunarDay(lunar.getDay());
        setIsLeapMonth(lunar.getMonth() < 0);
      } catch {}
    }
  }, [solarYear, solarMonth, solarDay, calendarType]);

  // Update solar values when lunar changes
  useEffect(() => {
    if (calendarType === 'lunar') {
      try {
        const lunar = Lunar.fromYmd(lunarYear, isLeapMonth ? -lunarMonth : lunarMonth, lunarDay);
        const solar = lunar.getSolar();
        setSolarYear(solar.getYear());
        setSolarMonth(solar.getMonth());
        setSolarDay(solar.getDay());
      } catch {}
    }
  }, [lunarYear, lunarMonth, lunarDay, isLeapMonth, calendarType]);

  const isInitialMount = useRef(true);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    const dateStr = `${solarYear}-${String(solarMonth).padStart(2, '0')}-${String(solarDay).padStart(2, '0')}`;
    onChange(dateStr, calendarType === 'lunar');
  }, [solarYear, solarMonth, solarDay, onChange, calendarType]);

  // Generate year options (1900-2100)
  const yearOptions = useMemo(() => {
    const years = [];
    for (let y = 1900; y <= 2100; y++) {
      years.push({ value: y, label: `${y}` });
    }
    return years;
  }, []);

  // Solar month options
  const solarMonthOptions = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => ({
      value: i + 1,
      label: `${i + 1}月`,
    }));
  }, []);

  // Solar day options
  const solarDayOptions = useMemo(() => {
    const daysInMonth = new Date(solarYear, solarMonth, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => ({
      value: i + 1,
      label: `${i + 1}`,
    }));
  }, [solarYear, solarMonth]);

  // Lunar month options (with leap month consideration)
  const lunarMonthOptions = useMemo(() => {
    const months = [];
    for (let m = 1; m <= 12; m++) {
      months.push({ value: m, label: MONTH_NAMES[m - 1] });
    }
    // Check if there's a leap month in this year
    const leapMonth = getLeapMonth(lunarYear);
    if (leapMonth > 0) {
      months.splice(leapMonth, 0, { value: -leapMonth, label: `闰${MONTH_NAMES[leapMonth - 1]}` });
    }
    return months;
  }, [lunarYear]);

  // Lunar day options
  const lunarDayOptions = useMemo(() => {
    const days = [];
    const daysInMonth = getLunarMonthDays(lunarYear, lunarMonth, isLeapMonth);
    for (let d = 1; d <= daysInMonth; d++) {
      const lunar = Lunar.fromYmd(lunarYear, isLeapMonth ? -lunarMonth : lunarMonth, d);
      days.push({ value: d, label: lunar.getDayInChinese() });
    }
    return days;
  }, [lunarYear, lunarMonth, isLeapMonth]);

  const handleSolarYearChange = (year: number) => {
    setSolarYear(year);
    // Adjust day if it exceeds days in new month
    const daysInMonth = new Date(year, solarMonth, 0).getDate();
    if (solarDay > daysInMonth) {
      setSolarDay(daysInMonth);
    }
  };

  const handleSolarMonthChange = (month: number) => {
    setSolarMonth(month);
    // Adjust day if it exceeds days in new month
    const daysInMonth = new Date(solarYear, month, 0).getDate();
    if (solarDay > daysInMonth) {
      setSolarDay(daysInMonth);
    }
  };

  const handleLunarMonthChange = (month: number) => {
    if (month < 0) {
      setIsLeapMonth(true);
      setLunarMonth(Math.abs(month));
    } else {
      setIsLeapMonth(false);
      setLunarMonth(month);
    }
    // Adjust day if needed
    const daysInMonth = getLunarMonthDays(lunarYear, Math.abs(month), month < 0);
    if (lunarDay > daysInMonth) {
      setLunarDay(daysInMonth);
    }
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Calendar type tabs */}
      <div className='flex'>
      <div className='grow'></div>
        <div className="flex w-32 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden mb-3">
          <button
            type="button"
            onClick={() => setCalendarType('solar')}
            className={`flex-1 py-0.5 text-sm font-medium transition-colors ${
              calendarType === 'solar'
                ? 'bg-purple-500 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            {t('countdowns.calendar_solar')}
          </button>
          <button
            type="button"
            onClick={() => setCalendarType('lunar')}
            className={`flex-1 py-0.5 text-sm font-medium transition-colors border-l border-gray-200 dark:border-gray-700 ${
              calendarType === 'lunar'
                ? 'bg-purple-500 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            {t('countdowns.calendar_lunar')}
          </button>
        </div>
      </div>

      {/* Wheel pickers */}
      <div className="flex gap-2">
        {calendarType === 'solar' ? (
          <>
            <div className="flex-1">
              <div className="text-xs text-center text-gray-500 dark:text-gray-400 mb-1">
                {t('countdowns.year')}
              </div>
              <WheelPicker
                options={yearOptions}
                value={solarYear}
                onChange={handleSolarYearChange}
                className="bg-gray-50 dark:bg-gray-800 rounded-lg"
                visibleCount={3}
                itemHeight={32}
              />
            </div>
            <div className="flex-1">
              <div className="text-xs text-center text-gray-500 dark:text-gray-400 mb-1">
                {t('countdowns.month')}
              </div>
              <WheelPicker
                options={solarMonthOptions}
                value={solarMonth}
                onChange={handleSolarMonthChange}
                className="bg-gray-50 dark:bg-gray-800 rounded-lg"
                visibleCount={3}
                itemHeight={32}
              />
            </div>
            <div className="flex-1">
              <div className="text-xs text-center text-gray-500 dark:text-gray-400 mb-1">
                {t('countdowns.day')}
              </div>
              <WheelPicker
                options={solarDayOptions}
                value={solarDay}
                onChange={setSolarDay}
                className="bg-gray-50 dark:bg-gray-800 rounded-lg"
                visibleCount={3}
                itemHeight={32}
              />
            </div>
          </>
        ) : (
          <>
            <div className="flex-1">
              <div className="text-xs text-center text-gray-500 dark:text-gray-400 mb-1">
                {t('countdowns.year')}
              </div>
              <WheelPicker
                options={yearOptions}
                value={lunarYear}
                onChange={setLunarYear}
                className="bg-gray-50 dark:bg-gray-800 rounded-lg"
                visibleCount={3}
                itemHeight={32}
              />
            </div>
            <div className="flex-1">
              <div className="text-xs text-center text-gray-500 dark:text-gray-400 mb-1">
                {t('countdowns.month')}
              </div>
              <WheelPicker
                options={lunarMonthOptions}
                value={isLeapMonth ? -lunarMonth : lunarMonth}
                onChange={handleLunarMonthChange}
                className="bg-gray-50 dark:bg-gray-800 rounded-lg"
                visibleCount={3}
                itemHeight={32}
              />
            </div>
            <div className="flex-1">
              <div className="text-xs text-center text-gray-500 dark:text-gray-400 mb-1">
                {t('countdowns.day')}
              </div>
              <WheelPicker
                options={lunarDayOptions}
                value={lunarDay}
                onChange={setLunarDay}
                className="bg-gray-50 dark:bg-gray-800 rounded-lg"
                visibleCount={3}
                itemHeight={32}
              />
            </div>
          </>
        )}
      </div>

      {/* Selected date display */}
      <div className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
        {calendarType === 'solar'
          ? `${solarYear}年${solarMonth}月${solarDay}日`
          : `${lunarYear}年${isLeapMonth ? '闰' : ''}${MONTH_NAMES[lunarMonth - 1]}${Lunar.fromYmd(lunarYear, isLeapMonth ? -lunarMonth : lunarMonth, lunarDay).getDayInChinese()}`
        }
      </div>
    </div>
  );
}
