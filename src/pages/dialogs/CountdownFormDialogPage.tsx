import { emit } from '@tauri-apps/api/event'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import BirthdayWheelPicker from '@/components/BirthdayWheelPicker'
import EmojiPickerButton from '@/components/EmojiPickerButton'
import OverlayWebviewWindow from '@/components/OverlayWebviewWindow'
import Select from '@/components/Select'
import Tw22ColorPicker from '@/components/Tw22ColorPicker'
import {
  useCountdownGroups,
  useCountdowns,
  useCreateCountdown,
  useUpdateCountdown,
} from '@/queries/useCountdownQueries'
import type { CreateCountdownParams, DisplayMode, EventType, RecurrenceRule } from '@/types/countdown'

const params = new URLSearchParams(window.location.search)
const initialCountdownId = params.get('countdownId')

export default function CountdownFormDialogPage() {
  const { t } = useTranslation('common')
  const { data: countdowns = [] } = useCountdowns()
  const { data: groups = [] } = useCountdownGroups()
  const createCountdown = useCreateCountdown()
  const updateCountdown = useUpdateCountdown()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [icon, setIcon] = useState('🚩')
  const [color, setColor] = useState('#8B5CF6')
  const [targetDate, setTargetDate] = useState('')
  const [targetTime, setTargetTime] = useState('')
  const [eventType, setEventType] = useState<EventType>('countdown')
  const [groupId, setGroupId] = useState('')
  const [recurrenceRule, setRecurrenceRule] = useState<RecurrenceRule>('none')
  const [recurrenceInterval, setRecurrenceInterval] = useState(1)
  const [displayMode, setDisplayMode] = useState<DisplayMode>('day')
  const [isLunar, setIsLunar] = useState(false)
  const [countdown, setCountdown] = useState<any>(null)
  const [loaded, setLoaded] = useState(!initialCountdownId)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const colorPickerRef = useRef<HTMLDivElement>(null)
  const isEditing = !!countdown

  useEffect(() => {
    document.documentElement.style.backgroundColor = 'transparent'
    document.body.style.backgroundColor = 'transparent'
    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
  }, [])

  useEffect(() => {
    if (!showColorPicker) return
    const handler = (e: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target as Node)) {
        setShowColorPicker(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showColorPicker])

  useEffect(() => {
    if (initialCountdownId && countdowns.length > 0) {
      const found = countdowns.find((c) => c.id === initialCountdownId)
      if (found) {
        setCountdown(found)
        setTitle(found.title)
        setDescription(found.description || '')
        setIcon(found.icon || '🚩')
        setColor(found.color || '#8B5CF6')
        setTargetDate(found.targetDate || '')
        setTargetTime(found.targetTime || '')
        setEventType(found.eventType || 'countdown')
        setGroupId(found.groupId || '')
        setRecurrenceRule(found.recurrenceRule || 'none')
        setRecurrenceInterval(found.recurrenceInterval || 1)
        setDisplayMode(found.displayMode || 'day')
        setIsLunar(found.isLunar || false)
      }
      setLoaded(true)
    }
  }, [countdowns])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !targetDate) return

    const params: CreateCountdownParams = {
      color,
      description: description.trim() || undefined,
      displayMode,
      eventType,
      groupId: groupId || undefined,
      icon,
      isLunar,
      isRecurring: recurrenceRule !== 'none',
      recurrenceInterval: recurrenceRule === 'custom' ? recurrenceInterval : undefined,
      recurrenceRule: recurrenceRule !== 'none' ? recurrenceRule : undefined,
      targetDate,
      targetTime: targetTime || undefined,
      title: title.trim(),
    }

    try {
      if (isEditing) {
        await updateCountdown.mutateAsync({ id: countdown.id, ...params })
      } else {
        await createCountdown.mutateAsync(params)
      }
      await emit('dialog:result', { action: 'submit' })
      await getCurrentWindow().close()
    } catch (error) {
      console.error('Error submitting:', error)
    }
  }

  const getThemeColor = () => {
    const rootElement = document.documentElement
    const computedStyle = window.getComputedStyle(rootElement)
    const themeColor = computedStyle.getPropertyValue('--theme-bg-70').trim()
    return themeColor
  }

  return (
    <OverlayWebviewWindow closable={true}>
      <div className="min-h-screen bg-white dark:bg-gray-800 rounded-xl overflow-hidden">
        {!loaded ? (
          <div className="p-6 flex items-center justify-center">
            <div className="text-gray-500 dark:text-gray-400">{t('common.loading')}</div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4 text-sm">
            {/* Icon & Title & Event Type */}
            <div className="flex items-start gap-2">
              <div className="relative" ref={colorPickerRef}>
                <EmojiPickerButton value={icon} onChange={setIcon} />
                <button
                  type="button"
                  onClick={() => setShowColorPicker(!showColorPicker)}
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-gray-800 shadow-sm"
                  style={{ backgroundColor: color }}
                />
                {showColorPicker && (
                  <div className="absolute z-50 top-12 left-0 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-3">
                    <Tw22ColorPicker
                      value={color}
                      onChange={(hex) => {
                        setColor(hex)
                        setShowColorPicker(false)
                      }}
                    />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  placeholder={t('countdowns.event_name_placeholder')}
                  className="w-full px-3 py-1.5 text-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => setEventType(eventType === 'countdown' ? 'countup' : 'countdown')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all shrink-0 ${
                  eventType === 'countdown'
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                    : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                }`}
              >
                {eventType === 'countdown' ? t('countdowns.type_countdown') : t('countdowns.type_countup')}
              </button>
            </div>

            {/* Target Date */}
            <div>
              <label
                className="block font-medium text-gray-700 dark:text-gray-300 mb-1"
                htmlFor="target-date"
                aria-labelledby="target date"
              >
                {t('countdowns.target_date')} *
              </label>
              {(!initialCountdownId || loaded) && (
                <BirthdayWheelPicker
                  className="-mt-6"
                  date={targetDate || undefined}
                  onChange={(d, lunar) => {
                    setTargetDate(d)
                    if (lunar !== undefined) setIsLunar(lunar)
                  }}
                  initialCalendarType={isLunar ? 'lunar' : 'solar'}
                />
              )}
            </div>

            {/* Group */}
            <div>
              <label
                className="block font-medium text-gray-700 dark:text-gray-300 mb-1"
                htmlFor="group"
                aria-labelledby="group"
              >
                {t('countdowns.group')}
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                {/* Preset groups as hidden radio */}
                {[
                  { icon: '📌', label: t('countdowns.no_group'), value: '' },
                  ...groups.filter((g) => g.isPreset).map((g) => ({ icon: g.icon, label: g.name, value: g.id })),
                ].map((option) => (
                  <label
                    key={option.value}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg cursor-pointer text-sm transition-colors`}
                    style={{
                      backgroundColor: `${groupId === option.value ? `${getThemeColor()}` : 'inherit'}`,
                      color: `${groupId === option.value ? `hsl(from ${getThemeColor()} h s 90)` : 'inherit'}`,
                    }}
                  >
                    <input
                      type="radio"
                      name="group"
                      value={option.value}
                      checked={groupId === option.value}
                      onChange={(e) => setGroupId(e.target.value)}
                      className="sr-only"
                    />
                    <span>{option.icon}</span>
                    <span>{option.label}</span>
                  </label>
                ))}
                {/* User-created groups dropdown */}
                {groups.filter((g) => !g.isPreset).length > 0 && (
                  <Select
                    value={groups.some((g) => g.id === groupId && !g.isPreset) ? groupId : ''}
                    onChange={(val) => setGroupId(val)}
                    placeholder={t('countdowns.select_group')}
                    className="min-w-35"
                    options={groups
                      .filter((g) => !g.isPreset)
                      .map((g) => ({ icon: g.icon, label: g.name, value: g.id }))}
                  />
                )}
              </div>
            </div>

            {/* Recurrence & Display Mode */}
            <div className="flex gap-4">
              {/* Recurrence */}
              <div className="flex-1">
                <label
                  className="block font-medium text-gray-700 dark:text-gray-300 mb-1"
                  htmlFor="recurrence"
                  aria-labelledby="recurrence"
                >
                  {t('countdowns.recurrence')}
                </label>
                <div className="flex gap-1 flex-wrap">
                  {[
                    { label: t('countdowns.recurrence_none'), value: 'none' },
                    { label: t('countdowns.recurrence_yearly'), value: 'yearly' },
                    { label: t('countdowns.recurrence_monthly'), value: 'monthly' },
                    { label: t('countdowns.recurrence_custom'), value: 'custom' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setRecurrenceRule(option.value as RecurrenceRule)}
                      className={`px-2 py-1 rounded-lg text-xs transition-colors ${
                        recurrenceRule === option.value
                          ? 'text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                      style={recurrenceRule === option.value ? { backgroundColor: getThemeColor() } : {}}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                {recurrenceRule === 'custom' && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {t('countdowns.recurrence_interval')}
                    </span>
                    <input
                      type="number"
                      min="2"
                      max="100"
                      value={recurrenceInterval}
                      onChange={(e) => setRecurrenceInterval(Number(e.target.value))}
                      className="w-16 px-2 py-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg text-sm focus:outline-none"
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-400">{t('countdowns.year')}</span>
                  </div>
                )}
              </div>

              {/* Display Mode */}
              <div className="flex-1">
                <label
                  className="block font-medium text-gray-700 dark:text-gray-300 mb-1"
                  htmlFor="display-mode"
                  aria-labelledby="display mode"
                >
                  {t('countdowns.display_mode')}
                </label>
                <div className="flex gap-1 flex-wrap">
                  {[
                    { label: t('countdowns.display_day'), value: 'day' },
                    { label: t('countdowns.display_month'), value: 'month' },
                    { label: t('countdowns.display_month_decimal'), value: 'month_decimal' },
                    { label: t('countdowns.display_year'), value: 'year' },
                    { label: t('countdowns.display_year_decimal'), value: 'year_decimal' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setDisplayMode(option.value as DisplayMode)}
                      className={`px-2 py-1 rounded-lg text-xs transition-colors ${
                        displayMode === option.value
                          ? 'text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                      style={displayMode === option.value ? { backgroundColor: getThemeColor() } : {}}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <label
                className="block font-medium text-gray-700 dark:text-gray-300 mb-1"
                htmlFor="description"
                aria-labelledby="description"
              >
                {t('countdowns.description')}
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('countdowns.description_placeholder')}
                rows={2}
                className="w-full px-3 py-1.5  border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 resize-none focus:outline-none"
              />
            </div>

            <div className="flex gap-3 pt-3">
              <div className="flex-1" />
              <button
                type="submit"
                disabled={!title.trim() || !targetDate}
                className="px-4 py-0.5 text-white rounded-lg disabled:opacity-50"
                style={{
                  backgroundColor: getThemeColor(),
                  color: `hsl(from ${getThemeColor()} h s 30)`,
                }}
              >
                {isEditing ? t('common.save') : t('common.create')}
              </button>
            </div>
          </form>
        )}
      </div>
    </OverlayWebviewWindow>
  )
}
