import { emit, listen } from '@tauri-apps/api/event'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import EmojiPickerButton from '@/components/EmojiPickerButton'
import MultiSelectDropdown from '@/components/MultiSelectDropdown'
import Tw22ColorPickerButton from '@/components/Tw22ColorPickerButton'
import WheelPicker from '@/components/WheelPicker'
import {
  ADVANCED_GROUP_FORM_LABEL,
  DATE_RANGE_PICKER_LABEL,
  hideOverlay,
  notifyOverlayReady,
  notifyOverlayShowReady,
  showOverlay,
} from '@/lib/overlayManager'
import { getPriorityOptions } from '@/lib/priorityOptions'
import { safeUnlisten } from '@/lib/safeUnlisten'
import { getScreenRect } from '@/lib/screenRect'
import { useLists, useTags } from '@/queries/useTaskQueries'
import type { AdvancedGroup, AdvancedGroupFilter } from '@/stores/useAppStore'
import { useAppStore } from '@/stores/useAppStore'

type DatePreset = NonNullable<AdvancedGroupFilter['datePreset']>

const DATE_PRESETS: DatePreset[] = [
  'all',
  'none',
  'overdue',
  'today',
  'tomorrow',
  'thisWeek',
  'nextWeek',
  'thisMonth',
  'nextMonth',
  'absoluteRange',
  'relativeRange',
]

const RELATIVE_MIN = -32
const RELATIVE_MAX = 32

const ICON_KEY_TO_EMOJI: Record<string, string> = {
  book: '📖',
  fire: '🔥',
  flag: '�',
  folder: '�',
  heart: '❤️',
  lightning: '⚡',
  star: '⭐',
  target: '🎯',
}

function resolveIcon(icon?: string): string {
  if (!icon) return '📁'
  return ICON_KEY_TO_EMOJI[icon] || icon
}

function resetForm() {
  return {
    color: '#3B82F6',
    filters: {} as AdvancedGroupFilter,
    group: null as AdvancedGroup | null,
    icon: '📁',
    name: '',
  }
}

function applyGroupToForm(group: AdvancedGroup) {
  return {
    color: group.color,
    filters: normalizeAdvancedGroupFilters(group.filters),
    group,
    icon: resolveIcon(group.icon),
    name: group.name,
  }
}

function getDatePreset(filters: AdvancedGroupFilter): DatePreset {
  if (filters.datePreset) return filters.datePreset
  if (!filters.dateType) return 'all'
  return filters.dateMode === 'relative' ? 'relativeRange' : 'absoluteRange'
}

function clearDateFilter(filters: AdvancedGroupFilter): AdvancedGroupFilter {
  const {
    dateFrom: _dateFrom,
    dateFutureDays: _dateFutureDays,
    dateMode: _dateMode,
    datePastDays: _datePastDays,
    datePreset: _datePreset,
    dateRelativeFrom: _dateRelativeFrom,
    dateRelativeTo: _dateRelativeTo,
    dateTo: _dateTo,
    dateType: _dateType,
    ...rest
  } = filters
  return rest
}

function normalizeAdvancedGroupFilters(filters: AdvancedGroupFilter): AdvancedGroupFilter {
  if (filters.datePreset || !filters.dateType) return { ...filters }
  const next = clearDateFilter(filters)
  if ((filters.dateMode || 'absolute') === 'relative') {
    return {
      ...next,
      datePreset: 'relativeRange',
      dateRelativeFrom: -Math.max(0, Math.min(32, filters.datePastDays ?? 7)),
      dateRelativeTo: Math.max(0, Math.min(32, filters.dateFutureDays ?? 7)),
    }
  }
  return {
    ...next,
    dateFrom: filters.dateFrom,
    datePreset: 'absoluteRange',
    dateTo: filters.dateTo,
  }
}

function getLocalToday(): string {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(
    2,
    '0',
  )}`
}

function getRelativeLabel(value: number, t: ReturnType<typeof useTranslation>['t']): string {
  if (value === 0) return t('advanced_groups.date_relative_today')
  return value > 0
    ? t('advanced_groups.date_relative_future', { count: value })
    : t('advanced_groups.date_relative_past', { count: Math.abs(value) })
}

function RelativeDateRangeSlider({
  from,
  onChange,
  to,
}: {
  from: number
  onChange: (from: number, to: number) => void
  to: number
}) {
  const { t } = useTranslation('common')
  const sortedFrom = Math.min(from, to)
  const sortedTo = Math.max(from, to)
  const fromPercent = ((sortedFrom - RELATIVE_MIN) / (RELATIVE_MAX - RELATIVE_MIN)) * 100
  const toPercent = ((sortedTo - RELATIVE_MIN) / (RELATIVE_MAX - RELATIVE_MIN)) * 100
  const ticks = Array.from({ length: RELATIVE_MAX - RELATIVE_MIN + 1 }, (_, index) => index + RELATIVE_MIN)

  return (
    <div className="rounded-lg bg-gray-50 dark:bg-gray-700/50 p-3 space-y-3">
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>{getRelativeLabel(sortedFrom, t)}</span>
        <span>{getRelativeLabel(sortedTo, t)}</span>
      </div>
      <div className="relative h-10">
        <div className="absolute left-0 right-0 top-4 h-1 rounded-full bg-gray-200 dark:bg-gray-600" />
        <div
          className="absolute top-4 h-1 rounded-full bg-blue-500"
          style={{ left: `${fromPercent}%`, right: `${100 - toPercent}%` }}
        />
        <input
          aria-label={t('advanced_groups.date_relative_from')}
          className="absolute left-0 top-1 h-8 w-full appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow"
          max={RELATIVE_MAX}
          min={RELATIVE_MIN}
          onChange={(e) => onChange(Number(e.target.value), to)}
          type="range"
          value={from}
        />
        <input
          aria-label={t('advanced_groups.date_relative_to')}
          className="absolute left-0 top-1 h-8 w-full appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow"
          max={RELATIVE_MAX}
          min={RELATIVE_MIN}
          onChange={(e) => onChange(from, Number(e.target.value))}
          type="range"
          value={to}
        />
        <div className="absolute left-0 right-0 top-8 flex justify-between">
          {ticks.map((tick) => (
            <span
              className={`block rounded-full ${tick % 10 === 0 ? 'h-2 w-0.5 bg-gray-500 dark:bg-gray-300' : 'h-1 w-px bg-gray-300 dark:bg-gray-500'}`}
              key={tick}
            />
          ))}
        </div>
      </div>
      <div className="flex justify-between text-[10px] text-gray-400 dark:text-gray-500">
        {[-30, -20, -10, 0, 10, 20, 30].map((tick) => (
          <span key={tick}>{tick}</span>
        ))}
      </div>
    </div>
  )
}

const params = new URLSearchParams(window.location.search)
const initialGroupId = params.get('groupId')
const isOverlayRoute = window.location.pathname.startsWith('/overlay/')

export default function AdvancedGroupFormDialogPage() {
  const { t } = useTranslation('common')
  const { data: allTags = [] } = useTags()
  const { data: allLists = [] } = useLists()
  const { advancedGroups, deleteAdvancedGroup } = useAppStore()
  const priorityMode = useAppStore((s) => s.priorityMode)

  const [name, setName] = useState('')
  const [color, setColor] = useState('#3B82F6')
  const [icon, setIcon] = useState('📁')
  const [filters, setFilters] = useState<AdvancedGroupFilter>({})
  const [regexError, setRegexError] = useState<string | null>(null)
  const [group, setGroup] = useState<AdvancedGroup | null>(null)
  const [loaded, setLoaded] = useState(!initialGroupId)
  const [currentGroupId, setCurrentGroupId] = useState<string | null>(initialGroupId)
  const [showFixedRangePicker, setShowFixedRangePicker] = useState(false)
  const isEditing = !!group
  const datePreset = getDatePreset(filters)
  const datePresetOptions = useMemo(
    () =>
      DATE_PRESETS.map((preset, index) => ({
        label: t(`advanced_groups.date_presets.${preset}`),
        value: index,
      })),
    [t],
  )
  const selectedDatePresetIndex = Math.max(0, DATE_PRESETS.indexOf(datePreset))
  const priorityOptions = useMemo(() => getPriorityOptions(priorityMode, t), [priorityMode, t])

  useEffect(() => {
    document.documentElement.style.backgroundColor = 'transparent'
    document.body.style.backgroundColor = 'transparent'
    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
  }, [])

  useEffect(() => {
    const unlisten = listen<{ group?: AdvancedGroup; groupId?: string }>(`${ADVANCED_GROUP_FORM_LABEL}:show`, (event) => {
      const nextGroupId = typeof event.payload.groupId === 'string' ? event.payload.groupId : null
      setCurrentGroupId(nextGroupId)
      setRegexError(null)
      setShowFixedRangePicker(false)
      hideOverlay(DATE_RANGE_PICKER_LABEL)
      if (!nextGroupId) {
        const next = resetForm()
        setGroup(next.group)
        setName(next.name)
        setColor(next.color)
        setIcon(next.icon)
        setFilters(next.filters)
        setLoaded(true)
      } else if (event.payload.group) {
        const next = applyGroupToForm(event.payload.group)
        setGroup(next.group)
        setName(next.name)
        setColor(next.color)
        setIcon(next.icon)
        setFilters(next.filters)
        setLoaded(true)
      } else {
        setLoaded(false)
      }
      notifyOverlayShowReady(ADVANCED_GROUP_FORM_LABEL)
    })

    unlisten.then(() => notifyOverlayReady(ADVANCED_GROUP_FORM_LABEL)).catch(() => {})
    return safeUnlisten(unlisten)
  }, [])

  useEffect(() => {
    if (!currentGroupId) {
      setLoaded(true)
      return
    }

    const found = advancedGroups.find((g) => g.id === currentGroupId)
    if (found) {
      const next = applyGroupToForm(found)
      setGroup(next.group)
      setName(next.name)
      setColor(next.color)
      setIcon(next.icon)
      setFilters(next.filters)
    } else {
      const next = resetForm()
      setGroup(next.group)
      setName(next.name)
      setColor(next.color)
      setIcon(next.icon)
      setFilters(next.filters)
    }
    setLoaded(true)
  }, [advancedGroups, currentGroupId])

  const closeFormWindow = async () => {
    setShowFixedRangePicker(false)
    hideOverlay(DATE_RANGE_PICKER_LABEL)
    const win = getCurrentWindow()
    if (isOverlayRoute) {
      await win.hide()
    } else {
      await win.close()
    }
  }

  const updateFilter = <K extends keyof AdvancedGroupFilter>(key: K, value: AdvancedGroupFilter[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  useEffect(() => {
    const unlisten = listen<{
      _source?: string
      endDate?: string
      startDate?: string
      type: string
    }>('date-range-picker-overlay:result', (event) => {
      if (event.payload._source !== 'advanced-group-form') return
      setShowFixedRangePicker(false)
      if (event.payload.type !== 'range') return
      updateFilter('dateFrom', event.payload.startDate)
      updateFilter('dateTo', event.payload.endDate)
    })

    return safeUnlisten(unlisten)
  }, [])

  const togglePriority = (p: number) => {
    const current = filters.priorities || []
    updateFilter('priorities', current.includes(p) ? current.filter((x) => x !== p) : [...current, p])
  }

  const validateRegex = (pattern: string) => {
    if (!pattern) {
      setRegexError(null)
      return
    }
    try {
      new RegExp(pattern)
      setRegexError(null)
    } catch {
      setRegexError(t('advanced_groups.regex_error'))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    if (regexError) return

    const cleanFilters: AdvancedGroupFilter = {}
    if (filters.listIds?.length) cleanFilters.listIds = filters.listIds
    if (filters.tagIds?.length) cleanFilters.tagIds = filters.tagIds
    if (filters.titleRegex?.trim()) cleanFilters.titleRegex = filters.titleRegex.trim()
    if (filters.datePreset && filters.datePreset !== 'all') {
      cleanFilters.datePreset = filters.datePreset
      if (filters.datePreset === 'absoluteRange') {
        if (filters.dateFrom) cleanFilters.dateFrom = filters.dateFrom
        if (filters.dateTo) cleanFilters.dateTo = filters.dateTo
      } else if (filters.datePreset === 'relativeRange') {
        cleanFilters.dateRelativeFrom = filters.dateRelativeFrom ?? 0
        cleanFilters.dateRelativeTo = filters.dateRelativeTo ?? 0
      }
    } else if (!filters.datePreset && filters.dateType) {
      cleanFilters.dateType = filters.dateType
      cleanFilters.dateMode = filters.dateMode || 'absolute'
      if (cleanFilters.dateMode === 'absolute') {
        if (filters.dateFrom) cleanFilters.dateFrom = filters.dateFrom
        if (filters.dateTo) cleanFilters.dateTo = filters.dateTo
      } else {
        if (filters.datePastDays != null && filters.datePastDays > 0) cleanFilters.datePastDays = filters.datePastDays
        if (filters.dateFutureDays != null && filters.dateFutureDays > 0)
          cleanFilters.dateFutureDays = filters.dateFutureDays
      }
    }
    if (filters.priorities?.length) cleanFilters.priorities = filters.priorities

    const result: AdvancedGroup = {
      color,
      filters: cleanFilters,
      icon,
      id: group?.id || `adv-${Date.now()}`,
      name: name.trim(),
    }

    try {
      await emit('dialog:result', { action: 'submit', group: result })
      await closeFormWindow()
    } catch (error) {
      console.error('Error submitting:', error)
    }
  }

  const handleClose = async () => {
    try {
      await closeFormWindow()
    } catch (error) {
      console.error('Error closing:', error)
    }
  }

  const handleDelete = async () => {
    if (!group) return
    try {
      deleteAdvancedGroup(group.id)
      await emit('dialog:result', { action: 'delete' })
      await closeFormWindow()
    } catch (error) {
      console.error('Error deleting:', error)
    }
  }

  const seedIds = new Set(['inbox', 'today', 'tomorrow', 'next7days', 'thismonth', 'recent'])
  const userLists = allLists.filter((l) => !seedIds.has(l.id))

  return (
    <div className="min-h-screen bg-white dark:bg-gray-800 rounded-xl overflow-hidden">
      {!loaded ? (
        <div className="p-6 flex flex-col items-center justify-center gap-3">
          <div className="text-gray-500 dark:text-gray-400">{t('common.loading')}</div>
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            {t('common.cancel')}
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-sm">
          {/* Name & Icon */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <EmojiPickerButton value={icon} onChange={setIcon} />
              <div className="absolute -top-1 -right-1 z-10">
                <Tw22ColorPickerButton isBadge={true} value={color} onChange={setColor} />
              </div>
            </div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder={t('advanced_groups.name')}
              className="flex-1 px-3 py-1.5 text-lg dark:bg-gray-700 dark:text-gray-100 focus:outline-none"
            />
          </div>

          {userLists.length > 0 && (
            <div>
              <div className="block font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('advanced_groups.filter_lists')}
              </div>
              <MultiSelectDropdown
                options={userLists.map((l) => ({ color: l.color || '#3B82F6', id: l.id, label: l.name }))}
                selected={filters.listIds || []}
                onChange={(ids) => updateFilter('listIds', ids)}
                placeholder={t('advanced_groups.select_lists')}
                emptyHint={t('advanced_groups.no_lists')}
              />
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t('advanced_groups.filter_lists_hint')}</p>
            </div>
          )}

          {allTags.length > 0 && (
            <div>
              <div className="block font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('advanced_groups.filter_tags')}
              </div>
              <MultiSelectDropdown
                options={allTags.map((tag) => ({
                  color: tag.color || '#3B82F6',
                  emoji: tag.emoji,
                  id: tag.id,
                  label: tag.name,
                }))}
                selected={filters.tagIds || []}
                onChange={(ids) => updateFilter('tagIds', ids)}
                placeholder={t('advanced_groups.select_tags')}
                emptyHint={t('advanced_groups.no_tags')}
              />
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t('advanced_groups.filter_tags_hint')}</p>
            </div>
          )}

          <div>
            <label
              className="block font-medium text-gray-700 dark:text-gray-300 mb-1"
              htmlFor="advanced groups filter title"
              aria-labelledby="advanced groups filter title"
            >
              {t('advanced_groups.filter_title')}
            </label>
            <input
              type="text"
              value={filters.titleRegex || ''}
              placeholder="e.g. ^买.*$|工作"
              onChange={(e) => {
                updateFilter('titleRegex', e.target.value)
                validateRegex(e.target.value)
              }}
              className={`w-full px-3 py-1.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 ${
                regexError ? 'border-red-400 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
              }`}
            />
            {regexError && <p className="text-xs text-red-500 mt-1">{regexError}</p>}
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t('advanced_groups.filter_title_hint')}</p>
          </div>

          <div>
            <div className="block font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('advanced_groups.filter_date')}
            </div>
            <WheelPicker
              className="text-sm"
              itemHeight={32}
              onChange={(index) => {
                const preset = DATE_PRESETS[index] || 'all'
                setShowFixedRangePicker(false)
                hideOverlay(DATE_RANGE_PICKER_LABEL)
                setFilters((prev) => {
                  const next = clearDateFilter(prev)
                  if (preset === 'all') return next
                  const today = getLocalToday()
                  return {
                    ...next,
                    dateFrom: preset === 'absoluteRange' ? (prev.dateFrom ?? today) : undefined,
                    datePreset: preset,
                    dateRelativeFrom: preset === 'relativeRange' ? (prev.dateRelativeFrom ?? 0) : undefined,
                    dateRelativeTo: preset === 'relativeRange' ? (prev.dateRelativeTo ?? 0) : undefined,
                    dateTo: preset === 'absoluteRange' ? (prev.dateTo ?? prev.dateFrom ?? today) : undefined,
                  }
                })
              }}
              options={datePresetOptions}
              value={selectedDatePresetIndex}
              visibleCount={3}
            />
            {datePreset === 'absoluteRange' && (
              <div className="relative mt-3">
                <button
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600"
                  onClick={async (event) => {
                    if (showFixedRangePicker) {
                      setShowFixedRangePicker(false)
                      await hideOverlay(DATE_RANGE_PICKER_LABEL)
                      return
                    }
                    const rect = await getScreenRect(event.currentTarget)
                    setShowFixedRangePicker(true)
                    await showOverlay(DATE_RANGE_PICKER_LABEL, rect.x, rect.y + rect.height + 4, {
                      _source: 'advanced-group-form',
                      anchorH: rect.height,
                      anchorX: rect.x,
                      anchorY: rect.y,
                      endDate: filters.dateTo,
                      hideTime: true,
                      mode: 'range',
                      startDate: filters.dateFrom,
                    })
                  }}
                  type="button"
                >
                  {filters.dateFrom || filters.dateTo
                    ? `${filters.dateFrom || '...'} → ${filters.dateTo || '...'}`
                    : t('advanced_groups.date_range_placeholder')}
                </button>
              </div>
            )}
            {datePreset === 'relativeRange' && (
              <div className="mt-3">
                <RelativeDateRangeSlider
                  from={filters.dateRelativeFrom ?? 0}
                  onChange={(from, to) => {
                    updateFilter('dateRelativeFrom', from)
                    updateFilter('dateRelativeTo', to)
                  }}
                  to={filters.dateRelativeTo ?? 0}
                />
              </div>
            )}
          </div>

          <div>
            <div className="block font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('advanced_groups.filter_priority')}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {priorityOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => togglePriority(option.value)}
                  className={`px-3 py-1 rounded-full text-xs transition-all ${
                    (filters.priorities || []).includes(option.value)
                      ? `${option.color.bg} ${option.color.fg}`
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-3">
            {isEditing && (
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 text-sm text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                {t('advanced_groups.delete')}
              </button>
            )}
            <div className="flex-1" />
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={!name.trim() || !!regexError}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              {isEditing ? t('common.save') : t('common.create')}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
