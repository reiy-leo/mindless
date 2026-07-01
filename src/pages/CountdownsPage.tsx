import { useAppStore } from '&/useAppStore'
import { listen } from '@tauri-apps/api/event'
import {
  Calendar,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  LayoutGrid,
  List,
  Pencil,
  Plus,
  Star,
  Trash2,
  Undo2,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { formatDisplayDate, formatTime } from '@/lib/formatUtils'
import { getLunarDayStr, getLunarFullDateStr, getLunarInfo } from '@/lib/lunar'
import { COUNTDOWN_FORM_LABEL, showOverlay } from '@/lib/overlayManager'
import { getScreenRect } from '@/lib/screenRect'
import { getLocalToday } from '@/lib/taskHelpers'
import {
  useCountdowns,
  useDeleteCountdown,
  useRestoreCountdown,
  useToggleCountdownCompleted,
  useToggleCountdownFavorite,
} from '@/queries/useCountdownQueries'
import type { Countdown, DisplayMode, RecurrenceRule } from '@/types/countdown'
import CountdownSidebar, { type SmartGroupId } from '%/countdown/CountdownSidebar'

// ==================== Icon Map ====================
const ICON_MAP: Record<string, string> = {
  baby: '👶',
  cake: '🎂',
  flag: '🚩',
  gift: '🎁',
  graduation: '🎓',
  heart: '❤️',
  house: '🏠',
  plane: '✈️',
  ring: '💍',
  star: '⭐',
}

// Helper to render icon (supports both emoji and icon key)
function renderIcon(icon?: string): string {
  if (!icon) return '🚩'
  // If it's already an emoji (length <= 2 or not in ICON_MAP), return as is
  if (icon.length <= 2 || !ICON_MAP[icon]) return icon
  return ICON_MAP[icon]
}

// Calculate days until next recurrence
function getNextRecurrenceDays(
  targetDate: string,
  recurrenceRule?: RecurrenceRule,
  recurrenceInterval?: number,
): number | null {
  if (!recurrenceRule || recurrenceRule === 'none') return null

  const [year, month, day] = targetDate.split('-').map(Number)
  const now = new Date()
  now.setHours(0, 0, 0, 0)

  let nextDate: Date

  if (recurrenceRule === 'yearly') {
    // Find next occurrence of this month/day
    nextDate = new Date(now.getFullYear(), month - 1, day)
    if (nextDate < now) {
      nextDate = new Date(now.getFullYear() + 1, month - 1, day)
    }
  } else if (recurrenceRule === 'monthly') {
    // Find next occurrence of this day
    nextDate = new Date(now.getFullYear(), now.getMonth(), day)
    if (nextDate < now) {
      nextDate = new Date(now.getFullYear(), now.getMonth() + 1, day)
    }
  } else if (recurrenceRule === 'custom' && recurrenceInterval) {
    // Find next occurrence based on interval
    const targetYear = year
    const currentYear = now.getFullYear()
    const yearsDiff = currentYear - targetYear
    const nextOccurrence = targetYear + Math.ceil(yearsDiff / recurrenceInterval) * recurrenceInterval
    nextDate = new Date(nextOccurrence, month - 1, day)
    if (nextDate < now) {
      nextDate = new Date(nextOccurrence + recurrenceInterval, month - 1, day)
    }
  } else {
    return null
  }

  const diff = nextDate.getTime() - now.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

// Format display based on displayMode
function formatDisplayValue(
  targetDate: string,
  daysRemaining: number,
  displayMode: DisplayMode = 'day',
  isCountup: boolean,
): { value: string | number; unit: string } {
  const [year, month, day] = targetDate.split('-').map(Number)
  const absDays = Math.abs(daysRemaining)

  if (displayMode === 'day') {
    return { unit: '', value: isCountup ? absDays : daysRemaining }
  }

  if (displayMode === 'month') {
    // Calculate months and days
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const target = new Date(year, month - 1, day)

    let months = (now.getFullYear() - target.getFullYear()) * 12 + (now.getMonth() - target.getMonth())
    let remainingDays = now.getDate() - target.getDate()

    if (remainingDays < 0) {
      months--
      const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0)
      remainingDays += prevMonth.getDate()
    }

    if (isCountup) {
      return { unit: '', value: `${Math.abs(months)}月${Math.abs(remainingDays)}日` }
    }
    return { unit: '', value: `${Math.abs(months)}月${Math.abs(remainingDays)}日` }
  }

  if (displayMode === 'month_decimal') {
    // Calculate decimal months
    const totalMonths = absDays / 30.44 // Average days per month
    return { unit: '月', value: totalMonths.toFixed(2) }
  }

  if (displayMode === 'year') {
    // Calculate years, months, days
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const target = new Date(year, month - 1, day)

    let years = now.getFullYear() - target.getFullYear()
    let months = now.getMonth() - target.getMonth()
    let days = now.getDate() - target.getDate()

    if (days < 0) {
      months--
      const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0)
      days += prevMonth.getDate()
    }
    if (months < 0) {
      years--
      months += 12
    }

    if (isCountup) {
      return { unit: '', value: `${Math.abs(years)}年${Math.abs(months)}月${Math.abs(days)}日` }
    }
    return { unit: '', value: `${Math.abs(years)}年${Math.abs(months)}月${Math.abs(days)}日` }
  }

  if (displayMode === 'year_decimal') {
    // Calculate decimal years
    const totalYears = absDays / 365.25 // Average days per year
    return { unit: '年', value: totalYears.toFixed(2) }
  }

  return { unit: '', value: daysRemaining }
}

// ==================== Countdown List Item ====================
function CountdownListItem({
  countdown,
  onContextMenu,
}: {
  countdown: Countdown
  onContextMenu?: (e: React.MouseEvent) => void
}) {
  const { t } = useTranslation('common')
  const dateFormat = useAppStore((s) => s.dateFormat)

  const getDaysRemaining = () => {
    const [year, month, day] = countdown.targetDate.split('-').map(Number)
    const now = new Date()
    now.setHours(0, 0, 0, 0)

    if (countdown.targetTime) {
      const [h, m, s] = countdown.targetTime.split(':').map(Number)
      const target = new Date(year, month - 1, day, h, m, s || 0, 0)
      const diff = target.getTime() - now.getTime()
      return Math.ceil(diff / (1000 * 60 * 60 * 24))
    }
    const target = new Date(year, month - 1, day)
    const diff = target.getTime() - now.getTime()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  const daysRemaining = getDaysRemaining()
  const isCountup = countdown.eventType === 'countup'
  const displayMode = countdown.displayMode || 'day'
  const formatted = formatDisplayValue(countdown.targetDate, daysRemaining, displayMode, isCountup)
  const nextRecurrenceDays = getNextRecurrenceDays(
    countdown.targetDate,
    countdown.recurrenceRule,
    countdown.recurrenceInterval,
  )

  const getStatusText = () => {
    if (displayMode !== 'day') return ''
    if (isCountup) {
      if (daysRemaining >= 0) return t('countdowns.days_since')
      return t('countdowns.days_until')
    }
    if (daysRemaining < 0) return t('countdowns.days_ago')
    if (daysRemaining === 0) return ''
    return t('countdowns.days_left')
  }

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 px-4 py-3 hover:shadow-md transition-shadow flex items-center gap-4 ${
        countdown.isCompleted ? 'opacity-30' : ''
      }`}
      style={{
        backgroundColor: `color-mix(in srgb, ${countdown.color} 10%, white)`,
        borderColor: `color-mix(in srgb, ${countdown.color} 13%, white)`,
      }}
      onContextMenu={onContextMenu}
    >
      {/* Icon */}
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0"
        style={{ backgroundColor: `${countdown.color}20` }}
      >
        {renderIcon(countdown.icon)}
      </div>

      {/* Title */}
      <div className="flex flex-row flex-1 min-w-0">
        <h3
          className={`font-medium text-gray-900 dark:text-gray-100 truncate ${
            countdown.isCompleted ? 'line-through' : ''
          }`}
        >
          {countdown.title}
        </h3>

        {/* Favorite Star */}
        {countdown.isFavorite && (
          <Star
            className="w-2 h-2 shrink-0"
            style={{
              color: `hsl(from ${countdown.color} h s 30)`,
            }}
          />
        )}
      </div>

      {/* Days */}
      <div className="flex items-baseline gap-1 shrink-0">
        <span className="text-xl font-bold" style={{ color: countdown.isCompleted ? undefined : countdown.color }}>
          {formatted.value}
        </span>
        {formatted.unit && <span className="text-sm text-gray-500 dark:text-gray-400">{formatted.unit}</span>}
        <span className="text-gray-500 dark:text-gray-400 text-xs">{getStatusText()}</span>
      </div>

      {/* Next Recurrence */}
      {nextRecurrenceDays !== null && (
        <div className="flex items-center gap-1 shrink-0 text-xs">
          <span className="text-gray-400 dark:text-gray-500">{t('countdowns.next')}:</span>
          <span className="font-medium" style={{ color: countdown.color }}>
            {nextRecurrenceDays}
          </span>
          <span className="text-gray-400 dark:text-gray-500">{t('countdowns.days')}</span>
        </div>
      )}

      {/* Date */}
      <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
        {countdown.isLunar
          ? (() => {
              const [y, m, d] = countdown.targetDate.split('-').map(Number)
              return getLunarFullDateStr(y, m, d)
            })()
          : formatDisplayDate(countdown.targetDate, dateFormat, t)}
      </span>

      {/* Type Badge */}
      <span
        className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0`}
        style={{
          backgroundColor: `hsl(from ${countdown.color} h s 50)`,
          color: `hsl(from ${countdown.color} h s calc(l + 70))`,
        }}
      >
        {isCountup ? t('countdowns.type_countup') : t('countdowns.type_countdown')}
      </span>
    </div>
  )
}

// ==================== Countdown Card ====================
function CountdownCard({
  countdown,
  onContextMenu,
}: {
  countdown: Countdown
  onContextMenu?: (e: React.MouseEvent) => void
}) {
  const { t } = useTranslation('common')
  const dateFormat = useAppStore((s) => s.dateFormat)
  const timeFormat = useAppStore((s) => s.timeFormat)

  const getDaysRemaining = () => {
    const [year, month, day] = countdown.targetDate.split('-').map(Number)
    const now = new Date()
    now.setHours(0, 0, 0, 0)

    if (countdown.targetTime) {
      const [h, m, s] = countdown.targetTime.split(':').map(Number)
      const target = new Date(year, month - 1, day, h, m, s || 0, 0)
      const diff = target.getTime() - now.getTime()
      return Math.ceil(diff / (1000 * 60 * 60 * 24))
    }
    const target = new Date(year, month - 1, day)
    const diff = target.getTime() - now.getTime()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  const daysRemaining = getDaysRemaining()
  const isCountup = countdown.eventType === 'countup'
  const displayMode = countdown.displayMode || 'day'
  const formatted = formatDisplayValue(countdown.targetDate, daysRemaining, displayMode, isCountup)
  const nextRecurrenceDays = getNextRecurrenceDays(
    countdown.targetDate,
    countdown.recurrenceRule,
    countdown.recurrenceInterval,
  )

  const getStatusText = () => {
    if (displayMode !== 'day') return ''
    if (isCountup) {
      if (daysRemaining >= 0) return t('countdowns.days_since')
      return t('countdowns.days_until')
    }
    if (daysRemaining < 0) return t('countdowns.days_ago')
    if (daysRemaining === 0) return ''
    return t('countdowns.days_left')
  }

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 hover:shadow-md transition-shadow ${
        countdown.isCompleted ? 'opacity-30' : ''
      }`}
      style={{
        backgroundColor: `color-mix(in srgb, ${countdown.color} 10%, white)`,
        borderColor: `color-mix(in srgb, ${countdown.color} 13%, white)`,
      }}
      onContextMenu={onContextMenu}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
            style={{ backgroundColor: `${countdown.color}20` }}
          >
            {renderIcon(countdown.icon)}
          </div>
          <div>
            <h3
              className={`font-semibold text-gray-900 dark:text-gray-100 ${
                countdown.isCompleted ? 'line-through' : ''
              }`}
            >
              {countdown.title}
            </h3>
            {countdown.description && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">{countdown.description}</p>
            )}
          </div>
        </div>
        {countdown.isFavorite && (
          <Star
            className="w-5 h-5"
            style={{
              color: `hsl(from ${countdown.color} h s 30)`,
            }}
          />
        )}
      </div>

      {/* Days Display */}
      <div className="mb-3">
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold" style={{ color: countdown.isCompleted ? undefined : countdown.color }}>
            {formatted.value}
          </span>
          {formatted.unit && <span className="text-lg text-gray-500 dark:text-gray-400">{formatted.unit}</span>}
          <span className="text-gray-500 dark:text-gray-400 text-sm">{getStatusText()}</span>
        </div>

        {/* Next Recurrence */}
        {nextRecurrenceDays !== null && (
          <div className="flex items-center gap-1 mt-1 text-sm">
            <span className="text-gray-400 dark:text-gray-500">{t('countdowns.next')}:</span>
            <span className="font-medium" style={{ color: countdown.color }}>
              {nextRecurrenceDays}
            </span>
            <span className="text-gray-400 dark:text-gray-500">{t('countdowns.days')}</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
        <span>
          {countdown.isLunar
            ? (() => {
                const [y, m, d] = countdown.targetDate.split('-').map(Number)
                return getLunarFullDateStr(y, m, d)
              })()
            : formatDisplayDate(countdown.targetDate, dateFormat, t)}
          {countdown.targetTime && ` ${formatTime(countdown.targetTime, timeFormat)}`}
        </span>
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-medium`}
          style={{
            backgroundColor: `hsl(from ${countdown.color} h s 50)`,
            color: `hsl(from ${countdown.color} h s calc(l + 70))`,
          }}
        >
          {isCountup ? t('countdowns.type_countup') : t('countdowns.type_countdown')}
        </span>
      </div>
    </div>
  )
}

// ==================== Countdown Calendar View ====================

function classifyLunarStr(lunarStr: string): 'festival' | 'term' | 'month' | 'normal' {
  const solarTerms = [
    '小寒',
    '大寒',
    '立春',
    '雨水',
    '惊蛰',
    '春分',
    '清明',
    '谷雨',
    '立夏',
    '小满',
    '芒种',
    '夏至',
    '小暑',
    '大暑',
    '立秋',
    '处暑',
    '白露',
    '秋分',
    '寒露',
    '霜降',
    '立冬',
    '小雪',
    '大雪',
    '冬至',
  ]
  if (solarTerms.includes(lunarStr)) return 'term'
  const monthNames = ['正月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '冬月', '腊月']
  if (monthNames.includes(lunarStr)) return 'month'
  const festivals = [
    '春节',
    '元宵节',
    '端午节',
    '七夕节',
    '中秋节',
    '重阳节',
    '腊八节',
    '除夕',
    '元旦',
    '国庆节',
    '劳动节',
    '儿童节',
  ]
  if (festivals.some((f) => lunarStr.includes(f))) return 'festival'
  return 'normal'
}

function getLunarColorClass(kind: string, isToday: boolean): string {
  if (kind === 'festival') return 'text-red-500 dark:text-red-400'
  if (kind === 'term') return 'text-green-600 dark:text-green-400'
  if (kind === 'month') return 'text-orange-500 dark:text-orange-400 font-medium'
  if (isToday) return 'text-purple-400 dark:text-purple-500'
  return 'text-gray-400 dark:text-gray-500'
}

function getDaysDiff(targetDate: string): number {
  const [year, month, day] = targetDate.split('-').map(Number)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const target = new Date(year, month - 1, day)
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

function CountdownCalendarView({
  countdowns,
  onEdit,
  onDelete,
}: {
  countdowns: Countdown[]
  onEdit: (cd: Countdown) => void
  onDelete: (id: string) => void
}) {
  const { t, i18n } = useTranslation('common')
  const weekStartDay = useAppStore((s) => s.weekStartDay)
  const [viewMonth, setViewMonth] = useState(() => {
    const now = new Date()
    return { month: now.getMonth(), year: now.getFullYear() }
  })
  const [selectedCountdown, setSelectedCountdown] = useState<Countdown | null>(null)

  const dayLabels = useMemo(() => {
    const all = [
      t('habits.calendar.sun'),
      t('habits.calendar.mon'),
      t('habits.calendar.tue'),
      t('habits.calendar.wed'),
      t('habits.calendar.thu'),
      t('habits.calendar.fri'),
      t('habits.calendar.sat'),
    ]
    return [...all.slice(weekStartDay), ...all.slice(0, weekStartDay)]
  }, [t, weekStartDay])

  // Group countdowns by target date
  const countdownsByDate = useMemo(() => {
    const map = new Map<string, Countdown[]>()
    countdowns.forEach((cd) => {
      const existing = map.get(cd.targetDate) || []
      existing.push(cd)
      map.set(cd.targetDate, existing)
    })
    return map
  }, [countdowns])

  // Calendar grid computations
  const { daysInMonth, firstDayOfWeek, trailingEmpty, monthLabel, lunarYearLabel, today } = useMemo(() => {
    const dim = new Date(viewMonth.year, viewMonth.month + 1, 0).getDate()
    const rawDow = new Date(viewMonth.year, viewMonth.month, 1).getDay()
    const fdow = (rawDow - weekStartDay + 7) % 7
    const totalCells = fdow + dim
    const trailing = (7 - (totalCells % 7)) % 7
    const ml = new Date(viewMonth.year, viewMonth.month).toLocaleDateString(i18n.language, {
      month: 'long',
      year: 'numeric',
    })
    const todayStr = getLocalToday()
    const midLunar = getLunarInfo(viewMonth.year, viewMonth.month + 1, Math.min(15, dim))
    return {
      daysInMonth: dim,
      firstDayOfWeek: fdow,
      lunarYearLabel: midLunar.yearStr,
      monthLabel: ml,
      today: todayStr,
      trailingEmpty: trailing,
    }
  }, [viewMonth, i18n.language, weekStartDay])

  // Precompute lunar data
  const lunarDataByDay = useMemo(() => {
    const data: Map<number, { str: string; kind: 'festival' | 'term' | 'month' | 'normal' }> = new Map()
    for (let day = 1; day <= daysInMonth; day++) {
      const lunarStr = getLunarDayStr(viewMonth.year, viewMonth.month + 1, day)
      const kind = classifyLunarStr(lunarStr)
      data.set(day, { kind, str: lunarStr })
    }
    return data
  }, [viewMonth.year, viewMonth.month, daysInMonth])

  const prevMonth = () =>
    setViewMonth((v) => (v.month === 0 ? { month: 11, year: v.year - 1 } : { ...v, month: v.month - 1 }))
  const nextMonth = () =>
    setViewMonth((v) => (v.month === 11 ? { month: 0, year: v.year + 1 } : { ...v, month: v.month + 1 }))
  const goToday = () => {
    const now = new Date()
    setViewMonth({ month: now.getMonth(), year: now.getFullYear() })
  }

  // Upcoming events list for the current month
  const monthEvents = useMemo(() => {
    const events: { countdown: Countdown; daysDiff: number }[] = []
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${viewMonth.year}-${String(viewMonth.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const cds = countdownsByDate.get(dateStr)
      if (cds) {
        cds.forEach((cd) => {
          events.push({ countdown: cd, daysDiff: getDaysDiff(dateStr) })
        })
      }
    }
    return events
  }, [viewMonth, daysInMonth, countdownsByDate])

  return (
    <div className="flex-1 overflow-auto p-6">
      {/* Calendar header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={prevMonth}
            aria-label={t('tasks.views.prev_month')}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <div className="min-w-50 text-center">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{monthLabel}</h2>
            <span className="text-xs text-gray-400 dark:text-gray-500">{lunarYearLabel}</span>
          </div>
          <button
            type="button"
            onClick={nextMonth}
            aria-label={t('tasks.views.next_month')}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>
        <button
          type="button"
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
              <div
                key={d}
                className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700"
              >
                {d}
              </div>
            ))}

            {/* Empty cells */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="min-h-27.5 bg-gray-50/50 dark:bg-gray-900/50 border-b border-r border-gray-100 dark:border-gray-800"
              />
            ))}

            {/* Day cells */}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
              const dateStr = `${viewMonth.year}-${String(viewMonth.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              const dayCountdowns = countdownsByDate.get(dateStr) || []
              const isToday = dateStr === today
              const lunarDay = lunarDataByDay.get(day)

              return (
                <div
                  key={day}
                  className={`min-h-27.5 border-b border-r border-gray-100 dark:border-gray-800 p-1 ${
                    isToday ? 'bg-purple-50/50 dark:bg-purple-900/10' : ''
                  }`}
                >
                  {/* Date number + lunar day */}
                  <div className="flex items-baseline gap-1.5 mb-1 px-1">
                    <span
                      className={`text-xs font-medium ${
                        isToday ? 'text-purple-600 dark:text-purple-400 font-bold' : 'text-gray-600 dark:text-gray-400'
                      }`}
                    >
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
                      const diff = getDaysDiff(cd.targetDate)
                      const isCountup = cd.eventType === 'countup'
                      const isSelected = selectedCountdown?.id === cd.id
                      let diffLabel: string
                      if (diff === 0) diffLabel = t('countdowns.today')
                      else if (isCountup) diffLabel = `${Math.abs(diff)}${t('countdowns.days_since_short')}`
                      else if (diff < 0) diffLabel = `${Math.abs(diff)}${t('countdowns.days_ago_short')}`
                      else diffLabel = `${diff}${t('countdowns.days_left_short')}`

                      return (
                        <div
                          key={cd.id}
                          onClick={() => setSelectedCountdown(isSelected ? null : cd)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') setSelectedCountdown(isSelected ? null : cd)
                          }}
                          className={`flex items-center gap-1 px-1.5 py-1 rounded text-xs cursor-pointer truncate transition-colors focus:outline-none ${
                            isSelected
                              ? 'ring-1 ring-purple-500 bg-purple-50 dark:bg-purple-900/30'
                              : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                          style={{ backgroundColor: isSelected ? undefined : `${cd.color}12` }}
                        >
                          <span className="text-sm shrink-0">{renderIcon(cd.icon)}</span>
                          <div className="flex-1 min-w-0">
                            <div
                              className={`truncate font-medium ${isSelected ? 'text-purple-700 dark:text-purple-300' : ''}`}
                              style={!isSelected ? { color: cd.color } : {}}
                            >
                              {cd.title}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{diffLabel}</div>
                          </div>
                        </div>
                      )
                    })}
                    {dayCountdowns.length > 3 && (
                      <div className="text-xs text-purple-500 dark:text-purple-400 px-1">
                        +{dayCountdowns.length - 3}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}

            {/* Trailing empty cells */}
            {Array.from({ length: trailingEmpty }).map((_, i) => (
              <div
                key={`trailing-${i}`}
                className="min-h-27.5 bg-gray-50/50 dark:bg-gray-900/50 border-b border-r border-gray-100 dark:border-gray-800"
              />
            ))}
          </div>
        </div>

        {/* Side panel: selected event detail or month events */}
        <div className="w-64 shrink-0 hidden lg:block">
          {selectedCountdown ? (
            <SelectedCountdownDetail
              countdown={selectedCountdown}
              onEdit={() => onEdit(selectedCountdown)}
              onDelete={() => {
                onDelete(selectedCountdown.id)
                setSelectedCountdown(null)
              }}
              onClose={() => setSelectedCountdown(null)}
            />
          ) : (
            <MonthEventsList events={monthEvents} onSelect={setSelectedCountdown} />
          )}
        </div>
      </div>
    </div>
  )
}

function SelectedCountdownDetail({
  countdown,
  onEdit,
  onDelete,
  onClose,
}: {
  countdown: Countdown
  onEdit: () => void
  onDelete: () => void
  onClose: () => void
}) {
  const { t } = useTranslation('common')
  const timeFormat = useAppStore((s) => s.timeFormat)
  const diff = getDaysDiff(countdown.targetDate)
  const isCountup = countdown.eventType === 'countup'
  const displayDays = isCountup ? Math.abs(diff) : Math.abs(diff)

  const parts = countdown.targetDate.split('-').map(Number)
  const lunar = getLunarDayStr(parts[0], parts[1], parts[2])

  return (
    <div className="sticky top-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">{t('countdowns.detail')}</h3>
        <button type="button" onClick={onClose} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
          <X className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
          style={{ backgroundColor: `${countdown.color}20` }}
        >
          {renderIcon(countdown.icon)}
        </div>
        <div>
          <h4 className="font-semibold text-gray-900 dark:text-gray-100">{countdown.title}</h4>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              isCountup
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
            }`}
          >
            {isCountup ? t('countdowns.type_countup') : t('countdowns.type_countdown')}
          </span>
        </div>
      </div>

      <div className="text-center mb-4 py-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
        <div
          className={`text-5xl font-bold ${
            isCountup ? 'text-green-500' : diff < 0 ? 'text-red-500' : diff === 0 ? 'text-green-500' : 'text-purple-500'
          }`}
        >
          {diff === 0 && !isCountup ? t('countdowns.today') : displayDays}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {isCountup
            ? diff >= 0
              ? t('countdowns.days_since')
              : t('countdowns.days_until')
            : diff < 0
              ? t('countdowns.days_ago')
              : t('countdowns.days_left')}
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
            <span className="text-gray-900 dark:text-gray-100">{formatTime(countdown.targetTime, timeFormat)}</span>
          </div>
        )}
        {countdown.description && (
          <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">{countdown.description}</p>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onEdit}
          className="flex-1 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          {t('common.edit')}
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="px-3 py-2 text-sm bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
        >
          {t('common.delete')}
        </button>
      </div>
    </div>
  )
}

function MonthEventsList({
  events,
  onSelect,
}: {
  events: { countdown: Countdown; daysDiff: number }[]
  onSelect: (cd: Countdown) => void
}) {
  const { t } = useTranslation('common')

  if (events.length === 0) {
    return (
      <div className="sticky top-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">{t('countdowns.month_events')}</h3>
        <p className="text-xs text-gray-400 dark:text-gray-500">{t('countdowns.no_events_this_month')}</p>
      </div>
    )
  }

  return (
    <div className="sticky top-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
      <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">
        {t('countdowns.month_events')} ({events.length})
      </h3>
      <div className="space-y-2">
        {events.map(({ countdown: cd, daysDiff }) => {
          const isCountup = cd.eventType === 'countup'
          let diffLabel: string
          if (daysDiff === 0) diffLabel = t('countdowns.today')
          else if (isCountup) diffLabel = `${Math.abs(daysDiff)} ${t('countdowns.days_since')}`
          else if (daysDiff < 0) diffLabel = `${Math.abs(daysDiff)} ${t('countdowns.days_ago')}`
          else diffLabel = `${daysDiff} ${t('countdowns.days_left')}`

          return (
            <button
              type="button"
              key={cd.id}
              onClick={() => onSelect(cd)}
              className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
            >
              <span className="text-lg">{renderIcon(cd.icon)}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{cd.title}</div>
                <div
                  className={`text-xs font-medium ${
                    isCountup
                      ? 'text-green-500'
                      : daysDiff < 0
                        ? 'text-red-500'
                        : daysDiff === 0
                          ? 'text-green-500'
                          : 'text-purple-500'
                  }`}
                >
                  {diffLabel}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ==================== Main Page ====================
export default function CountdownsPage() {
  const { t } = useTranslation('common')
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'calendar'>('grid')
  const [selectedSmartGroup, setSelectedSmartGroup] = useState<SmartGroupId | null>(null)
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [sidebarWidth] = useState(188)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; countdown: Countdown } | null>(null)

  const {
    data: countdowns = [],
    isLoading,
    isError,
    refetch,
  } = useCountdowns(selectedGroupId || undefined, selectedSmartGroup || undefined)
  const deleteCountdown = useDeleteCountdown()
  const restoreCountdown = useRestoreCountdown()
  const toggleFavorite = useToggleCountdownFavorite()
  const toggleCompleted = useToggleCountdownCompleted()

  const handleSelectSmartGroup = (groupId: SmartGroupId) => {
    setSelectedSmartGroup(groupId)
    setSelectedGroupId(null)
  }

  const handleSelectGroup = (groupId: string) => {
    setSelectedSmartGroup(null)
    setSelectedGroupId(groupId)
  }

  const openCountdownForm = async (
    countdown?: Countdown,
    anchor?: HTMLElement | { height: number; x: number; y: number },
  ) => {
    const rect = anchor instanceof HTMLElement ? await getScreenRect(anchor) : anchor
    const fallbackX = Math.max(8, Math.round((window.screen.width - 420) / 2))
    const fallbackY = Math.max(8, Math.round((window.screen.height - 660) / 2))
    await showOverlay(COUNTDOWN_FORM_LABEL, rect?.x ?? fallbackX, rect?.y ?? fallbackY, {
      anchorH: rect?.height ?? 0,
      anchorX: rect?.x ?? fallbackX,
      anchorY: rect?.y ?? fallbackY,
      countdown,
      countdownId: countdown?.id,
    })
  }

  useEffect(() => {
    const unlisten = listen('dialog:result', (event) => {
      if (event.payload && (event.payload as any).action === 'submit') {
        refetch()
      }
    })
    return () => {
      unlisten.then((fn) => fn())
    }
  }, [refetch])

  const handleDelete = (id: string) => {
    if (window.confirm(t('countdowns.delete_confirm'))) {
      deleteCountdown.mutate(id, {
        onError: (err) => {
          console.error('Failed to delete countdown:', err)
          alert(`Failed to delete: ${err instanceof Error ? err.message : String(err)}`)
        },
      })
    }
  }

  const handleRestore = (id: string) => {
    restoreCountdown.mutate(id, {
      onError: (err) => {
        console.error('Failed to restore countdown:', err)
        alert(`Failed to restore: ${err instanceof Error ? err.message : String(err)}`)
      },
    })
  }

  const handleToggleFavorite = (id: string) => {
    toggleFavorite.mutate(id)
  }

  const handleToggleCompleted = (id: string) => {
    toggleCompleted.mutate(id)
  }

  const handleContextMenu = (e: React.MouseEvent, countdown: Countdown) => {
    e.preventDefault()
    setContextMenu({ countdown, x: e.clientX, y: e.clientY })
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-500">{t('common.loading')}</div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-red-500 dark:text-red-400">Failed to load countdowns. Please try again.</div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex overflow-hidden" style={{ backgroundColor: 'var(--theme-bg-2)' }}>
      {/* Sidebar */}
      <CountdownSidebar
        selectedSmartGroup={selectedSmartGroup}
        selectedGroupId={selectedGroupId}
        onSelectSmartGroup={handleSelectSmartGroup}
        onSelectGroup={handleSelectGroup}
        width={sidebarWidth}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Page header */}
        <div data-tauri-drag-region className="flex items-center justify-between px-8 pt-4 pb-4">
          <h1
            data-tauri-drag-region
            className="text-xl font-bold"
            style={{
              color: `hsl(from var(--theme-color) h s 40)`,
            }}
          >
            {t('navigation.countdowns')}
          </h1>
          <div className="flex items-center gap-3">
            {/* View mode toggle */}
            <div
              className="flex border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden"
              style={{
                borderColor: `color-mix(in srgb, var(--theme-color) 20%, white)`,
                color: `hsl(from var(--theme-color) h s 30)`,
              }}
            >
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors`}
                style={{
                  backgroundColor: `${viewMode === 'grid' ? `color-mix(in srgb, var(--theme-color) 40%, white)` : 'inherit'}`,
                }}
                title={t('countdowns.view_grid')}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors border-l`}
                style={{
                  backgroundColor: `${viewMode === 'list' ? `color-mix(in srgb, var(--theme-color) 40%, white)` : 'inherit'}`,
                  borderColor: `color-mix(in srgb, var(--theme-color) 20%, white)`,
                }}
                title={t('countdowns.view_list')}
              >
                <List className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('calendar')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors border-l`}
                style={{
                  backgroundColor: `${viewMode === 'calendar' ? `color-mix(in srgb, var(--theme-color) 40%, white)` : 'inherit'}`,
                  borderColor: `color-mix(in srgb, var(--theme-color) 20%, white)`,
                }}
                title={t('countdowns.view_calendar')}
              >
                <Calendar className="w-4 h-4" />
              </button>
            </div>
            <button
              type="button"
              onClick={(event) => openCountdownForm(undefined, event.currentTarget)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors"
              style={{
                backgroundColor: `color-mix(in srgb, var(--theme-color) 40%, white)`,
                color: `hsl(from var(--theme-color) h s 30)`,
              }}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content area */}
        {countdowns.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
            <Clock className="w-16 h-16 mb-4 text-gray-300 dark:text-gray-600" />
            <p className="text-lg">
              {selectedSmartGroup === 'deleted'
                ? t('countdowns.no_deleted')
                : selectedSmartGroup === 'favorites'
                  ? t('countdowns.no_favorites')
                  : selectedSmartGroup === 'completed'
                    ? t('countdowns.no_completed')
                    : selectedSmartGroup === 'missed'
                      ? t('countdowns.no_missed')
                      : selectedSmartGroup === 'all'
                        ? t('countdowns.no_all')
                        : t('countdowns.no_countdowns')}
            </p>
            {!selectedSmartGroup && (
              <button
                type="button"
                onClick={(event) => openCountdownForm(undefined, event.currentTarget)}
                className="mt-4 text-purple-500 hover:text-purple-600 dark:hover:text-purple-400"
              >
                {t('countdowns.create_first')}
              </button>
            )}
          </div>
        ) : viewMode === 'calendar' ? (
          <CountdownCalendarView
            countdowns={countdowns}
            onEdit={(cd) => openCountdownForm(cd)}
            onDelete={handleDelete}
          />
        ) : viewMode === 'list' ? (
          <div className="flex-1 overflow-auto px-8 pb-8">
            <div className="space-y-2">
              {countdowns.map((countdown) => (
                <CountdownListItem
                  key={countdown.id}
                  countdown={countdown}
                  onContextMenu={(e) => handleContextMenu(e, countdown)}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-auto px-8 pb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {countdowns.map((countdown) => (
                <CountdownCard
                  key={countdown.id}
                  countdown={countdown}
                  onContextMenu={(e) => handleContextMenu(e, countdown)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Context Menu */}
        {contextMenu && (
          <>
            <div className="fixed inset-0 z-50" onMouseDown={() => setContextMenu(null)} />
            <div
              className="fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 min-w-45"
              style={{ left: contextMenu.x, top: contextMenu.y }}
            >
              {selectedSmartGroup === 'deleted' ? (
                <button
                  type="button"
                  onClick={() => {
                    handleRestore(contextMenu.countdown.id)
                    setContextMenu(null)
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                >
                  <Undo2 className="w-4 h-4" />
                  {t('countdowns.restore')}
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      handleToggleFavorite(contextMenu.countdown.id)
                      setContextMenu(null)
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <Star className="w-4 h-4" />
                    {contextMenu.countdown.isFavorite ? t('countdowns.unfavorite') : t('countdowns.favorite')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleToggleCompleted(contextMenu.countdown.id)
                      setContextMenu(null)
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <CheckCircle className="w-4 h-4" />
                    {contextMenu.countdown.isCompleted
                      ? t('countdowns.mark_uncompleted')
                      : t('countdowns.mark_completed')}
                  </button>
                  <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                  <button
                    type="button"
                    onClick={() => {
                      openCountdownForm(contextMenu.countdown, { height: 0, x: contextMenu.x, y: contextMenu.y })
                      setContextMenu(null)
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                    {t('common.edit')}
                  </button>
                  <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                  <button
                    type="button"
                    onClick={() => {
                      handleDelete(contextMenu.countdown.id)
                      setContextMenu(null)
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    {t('common.delete')}
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
