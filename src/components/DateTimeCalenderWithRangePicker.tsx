import { listen } from '@tauri-apps/api/event'
import {
  Calendar,
  Calendar1,
  CalendarArrowDown,
  CalendarDays,
  CalendarFold,
  ChevronLeft,
  ChevronRight,
  Clock,
  Moon,
  Rainbow,
  Sun,
  Sunrise,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { formatTimezoneOffset } from '@/lib/formatUtils'
import { getLunarDayStr } from '@/lib/lunar'
import { showOverlay, TIMEZONE_PICKER_LABEL } from '@/lib/overlayManager'
import { getScreenRect } from '@/lib/screenRect'
import { useAppStore } from '@/stores/useAppStore'
import type { CalendarEvent } from '@/types'

interface DateTimeCalenderWithRangePickerProps {
  color?: string
  // Single date mode
  date?: string
  endDate?: string
  endTime?: string
  events?: CalendarEvent[]
  hideTime?: boolean
  isAllDay?: boolean
  // Options
  mode?: 'single' | 'range'
  onRangeChange?: (
    startDate?: string,
    startTime?: string,
    endDate?: string,
    endTime?: string,
    isAllDay?: boolean,
  ) => void
  // Callbacks
  onSingleChange?: (date?: string, time?: string) => void
  onTimezoneOverlayChange?: (opening: boolean) => void
  // Range mode
  startDate?: string
  startTime?: string
  time?: string
}

const WEEKDAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const

function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function getDateStr(offset: number = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return toDateStr(d.getFullYear(), d.getMonth() + 1, d.getDate())
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        b: parseInt(result[3], 16),
        g: parseInt(result[2], 16),
        r: parseInt(result[1], 16),
      }
    : null
}

function getColorStyles(color: string) {
  const rgb = hexToRgb(color)
  if (!rgb) return {}
  return {
    activeTab: color,
    confirmBg: color,
    confirmHover: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.9)`,
    hoverBg: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)`,
    lunarText: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5)`,
    quickButtonBg: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)`,
    quickButtonHover: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.2)`,
    quickButtonText: color,
    rangeBg: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)`,
    selectedBg: color,
    selectedText: '#ffffff',
    todayRing: color,
    toggleBg: color,
  }
}

export default function DateTimeCalenderWithRangePicker({
  date,
  time,
  startDate,
  startTime,
  endDate,
  endTime,
  isAllDay = false,
  onSingleChange,
  onRangeChange,
  onTimezoneOverlayChange,
  mode = 'single',
  events = [],
  color,
  hideTime = false,
}: DateTimeCalenderWithRangePickerProps) {
  const { t } = useTranslation('common')
  const containerRef = useRef<HTMLDivElement>(null)
  const [activeTab, setActiveTab] = useState<'date' | 'range'>(mode === 'single' ? 'date' : 'range')
  const themeColor = useAppStore((s) => s.themeColor)
  const resolvedColor = color || themeColor
  const colorStyles = useMemo(() => getColorStyles(resolvedColor), [resolvedColor])
  const showLunar = useAppStore((s) => s.showLunar)
  const showTimezone = useAppStore((s) => s.showTimezone)
  const selectedTimezone = useAppStore((s) => s.selectedTimezone)
  const setSelectedTimezone = useAppStore((s) => s.setSelectedTimezone)
  const timezoneFormat = useAppStore((s) => s.timezoneFormat)
  const timezoneButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const unlisten = listen<{ timezone?: string }>('timezone-picker-overlay:result', (e) => {
      onTimezoneOverlayChange?.(false)
      if (e.payload.timezone !== undefined) {
        setSelectedTimezone(e.payload.timezone)
      }
    })
    return () => {
      unlisten.then((fn) => fn())
    }
  }, [setSelectedTimezone, onTimezoneOverlayChange])

  const handleOpenTimezonePicker = async () => {
    const button = timezoneButtonRef.current
    if (!button) return
    onTimezoneOverlayChange?.(true)
    const rect = await getScreenRect(button)
    await showOverlay(TIMEZONE_PICKER_LABEL, rect.x, rect.y + rect.height + 4, {
      anchorH: rect.height,
      anchorX: rect.x,
      anchorY: rect.y,
      timezone: selectedTimezone,
    })
  }

  // Local state for single date
  const [localDate, setLocalDate] = useState(date || '')
  const [localTime, setLocalTime] = useState(time || '')

  // Local state for range
  const [localStartDate, setLocalStartDate] = useState(startDate || '')
  const [localStartTime, setLocalStartTime] = useState(startTime || '')
  const [localEndDate, setLocalEndDate] = useState(endDate || '')
  const [localEndTime, setLocalEndTime] = useState(endTime || '')
  const [localAllDay, setLocalAllDay] = useState(isAllDay)

  // Calendar view state
  const initialDate = (activeTab === 'date' ? localDate : localStartDate) || new Date()
  const initDate = typeof initialDate === 'string' ? new Date(`${initialDate}T00:00:00`) : initialDate
  const [viewYear, setViewYear] = useState(initDate.getFullYear())
  const [viewMonth, setViewMonth] = useState(initDate.getMonth() + 1)

  // Sync props
  useEffect(() => {
    setLocalDate(date || '')
    setLocalTime(time || '')
  }, [date, time])

  useEffect(() => {
    setLocalStartDate(startDate || '')
    setLocalStartTime(startTime || '')
    setLocalEndDate(endDate || '')
    setLocalEndTime(endTime || '')
    setLocalAllDay(isAllDay)
  }, [startDate, startTime, endDate, endTime, isAllDay])

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth - 1, 1)
    const lastDay = new Date(viewYear, viewMonth, 0)
    const daysInMonth = lastDay.getDate()
    let startDow = firstDay.getDay() - 1
    if (startDow < 0) startDow = 6

    const days: { day: number; dateStr: string; inMonth: boolean }[] = []
    const prevMonthLast = new Date(viewYear, viewMonth - 1, 0).getDate()
    for (let i = startDow - 1; i >= 0; i--) {
      const d = prevMonthLast - i
      const m = viewMonth - 1
      const y = m <= 0 ? viewYear - 1 : viewYear
      const mo = m <= 0 ? 12 : m
      days.push({ dateStr: toDateStr(y, mo, d), day: d, inMonth: false })
    }
    for (let d = 1; d <= daysInMonth; d++) {
      days.push({ dateStr: toDateStr(viewYear, viewMonth, d), day: d, inMonth: true })
    }
    const remaining = 42 - days.length
    for (let d = 1; d <= remaining; d++) {
      const m = viewMonth + 1
      const y = m > 12 ? viewYear + 1 : viewYear
      const mo = m > 12 ? 1 : m
      days.push({ dateStr: toDateStr(y, mo, d), day: d, inMonth: false })
    }
    return days
  }, [viewYear, viewMonth])

  const todayStr = useMemo(() => {
    const now = new Date()
    return toDateStr(now.getFullYear(), now.getMonth() + 1, now.getDate())
  }, [])

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {}
    for (const ev of events) {
      if (!map[ev.eventDate]) map[ev.eventDate] = []
      map[ev.eventDate].push(ev)
    }
    return map
  }, [events])

  const handlePrevMonth = () => {
    if (viewMonth === 1) {
      setViewMonth(12)
      setViewYear(viewYear - 1)
    } else {
      setViewMonth(viewMonth - 1)
    }
  }

  const handleNextMonth = () => {
    if (viewMonth === 12) {
      setViewMonth(1)
      setViewYear(viewYear + 1)
    } else {
      setViewMonth(viewMonth + 1)
    }
  }

  const handleSelectDate = (dateStr: string) => {
    if (activeTab === 'date') {
      setLocalDate(dateStr)
    } else {
      // Range mode: first click = start, second click = end
      if (!localStartDate || (localStartDate && localEndDate)) {
        setLocalStartDate(dateStr)
        setLocalEndDate('')
      } else {
        if (dateStr < localStartDate) {
          setLocalEndDate(localStartDate)
          setLocalStartDate(dateStr)
        } else {
          setLocalEndDate(dateStr)
        }
      }
    }
    // Update view
    const parts = dateStr.split('-').map(Number)
    if (parts.length === 3) {
      setViewYear(parts[0])
      setViewMonth(parts[1])
    }
  }

  const handleQuickDate = (offset: number) => {
    const d = getDateStr(offset)
    if (activeTab === 'date') {
      setLocalDate(d)
      onSingleChange?.(d || undefined, localTime || undefined)
    } else {
      setLocalStartDate(d)
      setLocalEndDate('')
      onRangeChange?.(
        d || undefined,
        localAllDay ? undefined : localStartTime || undefined,
        undefined,
        undefined,
        localAllDay,
      )
    }
    const parts = d.split('-').map(Number)
    setViewYear(parts[0])
    setViewMonth(parts[1])
  }

  const handleQuickRange = (startOffset: number, endOffset: number) => {
    const sd = getDateStr(startOffset)
    const ed = getDateStr(endOffset)
    setLocalStartDate(sd)
    setLocalEndDate(ed)
    onRangeChange?.(
      sd || undefined,
      localAllDay ? undefined : localStartTime || undefined,
      ed || undefined,
      localAllDay ? undefined : localEndTime || undefined,
      localAllDay,
    )
  }

  const handleClear = () => {
    if (activeTab === 'date') {
      setLocalDate('')
      setLocalTime('')
      onSingleChange?.(undefined, undefined)
    } else {
      setLocalStartDate('')
      setLocalStartTime('')
      setLocalEndDate('')
      setLocalEndTime('')
      setLocalAllDay(false)
      onRangeChange?.(undefined, undefined, undefined, undefined, false)
    }
  }

  const handleConfirm = () => {
    if (activeTab === 'date') {
      onSingleChange?.(localDate || undefined, localTime || undefined)
    } else {
      onRangeChange?.(
        localStartDate || undefined,
        localAllDay ? undefined : localStartTime || undefined,
        localEndDate || undefined,
        localAllDay ? undefined : localEndTime || undefined,
        localAllDay,
      )
    }
  }

  // Determine which date is selected for highlighting
  const selectedDate = activeTab === 'date' ? localDate : localStartDate

  const isDateInRange = (dateStr: string) => {
    if (!localStartDate || !localEndDate) return false
    return dateStr > localStartDate && dateStr < localEndDate
  }

  return (
    <div ref={containerRef}>
      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={() => setActiveTab('date')}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm transition-colors"
          style={{
            borderBottom: activeTab === 'date' ? `2px solid ${colorStyles.activeTab}` : undefined,
            color: activeTab === 'date' ? colorStyles.activeTab : undefined,
          }}
        >
          <Calendar className="w-3.5 h-3.5" />
          {t('tasks.date_tab')}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('range')}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm transition-colors"
          style={{
            borderBottom: activeTab === 'range' ? `2px solid ${colorStyles.activeTab}` : undefined,
            color: activeTab === 'range' ? colorStyles.activeTab : undefined,
          }}
        >
          <Clock className="w-3.5 h-3.5" />
          {t('tasks.range_tab')}
        </button>
      </div>

      {/* Date Tab Content */}
      {activeTab === 'date' && (
        <div className="p-2">
          {/* Quick date buttons */}
          <div className="grid grid-cols-4 gap-1 mb-2">
            <button
              type="button"
              onClick={() => handleQuickDate(-1)}
              className="group relative flex items-center justify-center p-1 rounded transition-colors"
              style={{
                backgroundColor: colorStyles.hoverBg,
                color: colorStyles.quickButtonText,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colorStyles.quickButtonHover!)}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = colorStyles.hoverBg!)}
            >
              <Moon className="w-5 h-5" />
              <span className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:block bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap z-10">
                {t('tasks.yesterday')}
              </span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickDate(0)}
              className="group relative flex items-center justify-center p-1 rounded transition-colors"
              style={{
                backgroundColor: colorStyles.quickButtonBg,
                color: colorStyles.quickButtonText,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colorStyles.quickButtonHover!)}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = colorStyles.quickButtonBg!)}
            >
              <Sun className="w-5 h-5" />
              <span className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:block bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap z-10">
                {t('tasks.today')}
              </span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickDate(1)}
              className="group relative flex items-center justify-center p-1 rounded transition-colors"
              style={{
                backgroundColor: colorStyles.hoverBg,
                color: colorStyles.quickButtonText,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colorStyles.quickButtonHover!)}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = colorStyles.hoverBg!)}
            >
              <Sunrise className="w-5 h-5" />
              <span className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:block bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap z-10">
                {t('tasks.tomorrow')}
              </span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickDate(7)}
              className="group relative flex items-center justify-center p-1 rounded transition-colors"
              style={{
                backgroundColor: colorStyles.hoverBg,
                color: colorStyles.quickButtonText,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colorStyles.quickButtonHover!)}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = colorStyles.hoverBg!)}
            >
              <Rainbow className="w-5 h-5" />
              <span className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:block bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap z-10">
                {t('tasks.next_week')}
              </span>
            </button>
          </div>

          {/* Month navigation */}
          <div className="flex items-center justify-between mb-1">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {viewYear} / {String(viewMonth).padStart(2, '0')}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>

          {/* Weekday header */}
          <div className="grid grid-cols-7 mb-0.5">
            {WEEKDAY_KEYS.map((key) => (
              <div
                key={key}
                className="aspect-square flex items-center justify-center text-sm text-gray-500 dark:text-gray-400 py-0.5"
              >
                {t(`habits.calendar.${key}`)}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7">
            {calendarDays.map((cell, idx) => {
              const isSelected = cell.dateStr === selectedDate
              const isToday = cell.dateStr === todayStr
              const cellEvents = eventsByDate[cell.dateStr] || []
              const lunarStr = cell.inMonth
                ? getLunarDayStr(...(cell.dateStr.split('-').map(Number) as [number, number, number]))
                : ''

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectDate(cell.dateStr)}
                  className="relative aspect-square flex flex-col items-center justify-center py-0.5 text-sm rounded transition-colors"
                  style={{
                    backgroundColor: isSelected ? colorStyles.selectedBg : isToday ? colorStyles.hoverBg : undefined,
                    boxShadow: !isSelected && isToday ? `inset 0 0 0 1px ${colorStyles.todayRing}` : undefined,
                    color: isSelected ? colorStyles.selectedText : undefined,
                  }}
                >
                  <span className="leading-none">{cell.day}</span>
                  {showLunar && lunarStr && (
                    <span className="text-[9px] leading-tight mt-0.5 truncate max-w-full px-0.5">{lunarStr}</span>
                  )}
                  {cellEvents.length > 0 && (
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex gap-0.5">
                      {cellEvents.slice(0, 2).map((ev, i) => (
                        <span
                          key={i}
                          className="w-0.5 h-0.5 rounded-full"
                          style={{ backgroundColor: ev.color || color }}
                        />
                      ))}
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {/* Timezone */}
          {showTimezone && (
            <button
              ref={timezoneButtonRef}
              type="button"
              onClick={handleOpenTimezonePicker}
              className="text-[10px] text-gray-400 dark:text-gray-500 text-center mt-1 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer"
            >
              {formatTimezoneOffset(selectedTimezone, timezoneFormat)}
            </button>
          )}

          {/* Time picker */}
          {!hideTime && (
            <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
              <label
                className="text-[10px] text-gray-500 dark:text-gray-400 block mb-0.5"
                htmlFor="time-picker"
                aria-labelledby="time picker"
              >
                {t('tasks.due_time')}
              </label>
              <input
                type="time"
                value={localTime}
                onChange={(e) => setLocalTime(e.target.value)}
                className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded focus:outline-none"
              />
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-1.5 mt-2">
            <button
              type="button"
              onClick={handleClear}
              className="flex-1 px-2 py-1 text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              {t('common.clear')}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="flex-1 px-2 py-1 text-sm text-white rounded transition-colors"
              style={{
                backgroundColor: colorStyles.confirmBg,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colorStyles.confirmHover!)}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = colorStyles.confirmBg!)}
            >
              {t('common.confirm')}
            </button>
          </div>
        </div>
      )}

      {/* Range Tab Content */}
      {activeTab === 'range' && (
        <div className="p-2">
          {/* Quick range buttons */}
          <div className="grid grid-cols-4 gap-1 mb-2">
            <button
              type="button"
              onClick={() => handleQuickRange(0, 1)}
              className="group relative flex items-center justify-center p-1 rounded transition-colors"
              style={{
                backgroundColor: colorStyles.hoverBg,
                color: colorStyles.quickButtonText,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colorStyles.quickButtonHover!)}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = colorStyles.hoverBg!)}
            >
              <Calendar1 className="w-5 h-5" />
              <span className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:block bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap z-10">
                {t('tasks.two_days')}
              </span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickRange(0, 6)}
              className="group relative flex items-center justify-center p-1 rounded transition-colors"
              style={{
                backgroundColor: colorStyles.hoverBg,
                color: colorStyles.quickButtonText,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colorStyles.quickButtonHover!)}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = colorStyles.hoverBg!)}
            >
              <CalendarArrowDown className="w-5 h-5" />
              <span className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:block bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap z-10">
                {t('tasks.week')}
              </span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickRange(0, 29)}
              className="group relative flex items-center justify-center p-1 rounded transition-colors"
              style={{
                backgroundColor: colorStyles.hoverBg,
                color: colorStyles.quickButtonText,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colorStyles.quickButtonHover!)}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = colorStyles.hoverBg!)}
            >
              <CalendarFold className="w-5 h-5" />
              <span className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:block bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap z-10">
                {t('tasks.month')}
              </span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickRange(0, 364)}
              className="group relative flex items-center justify-center p-1 rounded transition-colors"
              style={{
                backgroundColor: colorStyles.hoverBg,
                color: colorStyles.quickButtonText,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colorStyles.quickButtonHover!)}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = colorStyles.hoverBg!)}
            >
              <CalendarDays className="w-5 h-5" />
              <span className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:block bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap z-10">
                {t('tasks.year')}
              </span>
            </button>
          </div>

          {/* Start date & time */}
          <div className="flex items-center gap-1.5 mb-2">
            <label
              className="text-[10px] text-gray-500 dark:text-gray-400 w-7 shrink-0"
              htmlFor="start-time-picker"
              aria-labelledby="start time picker"
            >
              {t('tasks.range_start')}
            </label>
            <input
              type="date"
              value={localStartDate}
              onChange={(e) => setLocalStartDate(e.target.value)}
              className="flex-1 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded focus:outline-none"
            />
            {!localAllDay && !hideTime && (
              <input
                type="time"
                value={localStartTime}
                onChange={(e) => setLocalStartTime(e.target.value)}
                className="w-16 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded focus:outline-none"
              />
            )}
          </div>

          {/* End date & time */}
          <div className="flex items-center gap-1.5 mb-2">
            <label
              className="text-[10px] text-gray-500 dark:text-gray-400 w-7 shrink-0"
              htmlFor="end-time-picker"
              aria-labelledby="end time picker"
            >
              {t('tasks.range_end')}
            </label>
            <input
              type="date"
              value={localEndDate}
              onChange={(e) => setLocalEndDate(e.target.value)}
              className="flex-1 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded focus:outline-none"
            />
            {!localAllDay && !hideTime && (
              <input
                type="time"
                value={localEndTime}
                onChange={(e) => setLocalEndTime(e.target.value)}
                className="w-16 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded focus:outline-none"
              />
            )}
          </div>

          {/* All day toggle */}
          {!hideTime && (
            <div className="flex items-center justify-between mb-2 py-0.5 px-0.5">
              <span className="text-[11px] text-gray-700 dark:text-gray-300">{t('tasks.all_day')}</span>
              <button
                type="button"
                onClick={() => setLocalAllDay(!localAllDay)}
                className="relative inline-flex h-4 w-7 items-center rounded-full transition-colors"
                style={{
                  backgroundColor: localAllDay ? colorStyles.toggleBg : undefined,
                }}
              >
                <span
                  className={`inline-block h-3 w-3 rounded-full bg-white shadow transition-transform ${
                    localAllDay ? 'translate-x-3.5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          )}

          {/* Mini calendar for quick selection */}
          <div className="p-1.5">
            <div className="flex items-center justify-between mb-1">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <ChevronLeft className="w-3 h-3 text-gray-600 dark:text-gray-400" />
              </button>
              <span className="text-[10px] font-medium text-gray-700 dark:text-gray-300">
                {viewYear}/{String(viewMonth).padStart(2, '0')}
              </span>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <ChevronRight className="w-3 h-3 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {WEEKDAY_KEYS.map((key) => (
                <div
                  key={key}
                  className="aspect-square flex items-center justify-center text-[10px] text-gray-500 dark:text-gray-400 py-0.5"
                >
                  {t(`habits.calendar.${key}`)[0]}
                </div>
              ))}
              {calendarDays.map((cell, idx) => {
                const isStart = cell.dateStr === localStartDate
                const isEnd = cell.dateStr === localEndDate
                const inRange = isDateInRange(cell.dateStr)
                const isToday = cell.dateStr === todayStr
                const lunarStr = cell.inMonth
                  ? getLunarDayStr(...(cell.dateStr.split('-').map(Number) as [number, number, number]))
                  : ''

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectDate(cell.dateStr)}
                    className="aspect-square relative flex flex-col items-center justify-center py-0.5 rounded transition-colors text-[10px]"
                    style={{
                      backgroundColor:
                        isStart || isEnd ? colorStyles.selectedBg : inRange ? colorStyles.rangeBg : undefined,
                      boxShadow:
                        !isStart && !isEnd && !inRange && isToday
                          ? `inset 0 0 0 1px ${colorStyles.todayRing}`
                          : undefined,
                      color: isStart || isEnd ? colorStyles.selectedText : undefined,
                    }}
                  >
                    <span className="text-[11px] leading-none">{cell.day}</span>
                    {showLunar && lunarStr && (
                      <span className="text-[9px] leading-tight truncate max-w-full px-0.5">{lunarStr}</span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Timezone */}
          {showTimezone && (
            <button
              type="button"
              onClick={handleOpenTimezonePicker}
              className="text-[10px] text-gray-400 dark:text-gray-500 text-center mt-1 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer"
            >
              {formatTimezoneOffset(selectedTimezone, timezoneFormat)}
            </button>
          )}

          {/* Action buttons */}
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={handleClear}
              className="flex-1 px-2 py-1 text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              {t('common.clear')}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="flex-1 px-2 py-1 text-xs text-white rounded transition-colors"
              style={{
                backgroundColor: colorStyles.confirmBg,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colorStyles.confirmHover!)}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = colorStyles.confirmBg!)}
            >
              {t('common.confirm')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
