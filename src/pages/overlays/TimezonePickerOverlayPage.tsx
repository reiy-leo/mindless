import { useAppStore } from '&/useAppStore'
import { emit, listen } from '@tauri-apps/api/event'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { Search } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import timezoneNames from '@/i18n/timezoneNames.json'
import { formatTimezoneOffset } from '@/lib/formatUtils'
import { notifyOverlayReady, notifyOverlayShowReady, TIMEZONE_PICKER_LABEL } from '@/lib/overlayManager'

type Locale = 'zh' | 'en' | 'ja'

interface TimezoneItem {
  city: string
  continent: string
  localTime: string
  name: string
  offset: string
  searchText: string
}

function getLocalTime(tz: string): string {
  try {
    return new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      hour12: false,
      minute: '2-digit',
      timeZone: tz,
    })
  } catch {
    return ''
  }
}

function getCityName(tz: string, locale: Locale): string {
  const names = (timezoneNames as Record<string, Record<string, string>>)[tz]
  if (names) {
    return names[locale] || names.en || tz.split('/').pop()?.replace(/_/g, ' ') || tz
  }
  return tz.split('/').pop()?.replace(/_/g, ' ') || tz
}

function getSearchText(tz: string): string {
  const names = (timezoneNames as Record<string, Record<string, string>>)[tz]
  if (names) {
    return [names.zh, names.en, names.ja].filter(Boolean).join(' ').toLowerCase()
  }
  return tz.toLowerCase()
}

export default function TimezonePickerOverlayPage() {
  const { t, i18n } = useTranslation('common')
  const timezoneFormat = useAppStore((s) => s.timezoneFormat)
  const themeColor = useAppStore((s) => s.themeColor)
  const locale = (i18n.language?.split('-')[0] || 'en') as Locale

  const [selectedTimezone, setSelectedTimezone] = useState('')
  const [search, setSearch] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    document.documentElement.style.setProperty('background-color', 'transparent', 'important')
    document.body.style.setProperty('background-color', 'transparent', 'important')
    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
  }, [])

  useEffect(() => {
    const unlisten = listen<{
      timezone?: string
      anchorX: number
      anchorY: number
      anchorH: number
    }>('timezone-picker-overlay:show', (e) => {
      const { timezone } = e.payload
      setSelectedTimezone(timezone || '')
      setSearch('')

      setTimeout(() => searchInputRef.current?.focus(), 50)
      notifyOverlayShowReady(TIMEZONE_PICKER_LABEL)
    })

    unlisten.then(() => notifyOverlayReady(TIMEZONE_PICKER_LABEL)).catch(() => {})
    return () => {
      unlisten.then((fn) => fn()).catch(() => {})
    }
  }, [])

  useEffect(() => {
    const unlisten = getCurrentWindow().onFocusChanged(({ payload: focused }) => {
      if (!focused) hide()
    })
    return () => {
      unlisten.then((fn) => fn()).catch(() => {})
    }
  }, [])

  const hide = async () => {
    await getCurrentWindow().hide()
  }

  const allTimezones = useMemo<TimezoneItem[]>(() => {
    try {
      const zones = (Intl as any).supportedValuesOf('timeZone') as string[]
      return zones.map((tz: string) => {
        const parts = tz.split('/')
        const continent = parts[0] || tz
        return {
          city: getCityName(tz, locale),
          continent,
          localTime: getLocalTime(tz),
          name: tz,
          offset: formatTimezoneOffset(tz, timezoneFormat),
          searchText: getSearchText(tz),
        }
      })
    } catch {
      return []
    }
  }, [timezoneFormat, locale])

  const filtered = useMemo(() => {
    if (!search.trim()) return allTimezones
    const q = search.toLowerCase()
    return allTimezones.filter(
      (tz) =>
        tz.name.toLowerCase().includes(q) ||
        tz.city.toLowerCase().includes(q) ||
        tz.searchText.includes(q) ||
        tz.offset.toLowerCase().includes(q),
    )
  }, [allTimezones, search])

  const grouped = useMemo(() => {
    const map = new Map<string, TimezoneItem[]>()
    for (const tz of filtered) {
      const existing = map.get(tz.continent) || []
      existing.push(tz)
      map.set(tz.continent, existing)
    }
    return map
  }, [filtered])

  const handleSelect = (tz: string) => {
    emit('timezone-picker-overlay:result', { timezone: tz })
    hide()
  }

  const handleClear = () => {
    emit('timezone-picker-overlay:result', { timezone: undefined })
    hide()
  }

  return (
    <div
      className="h-screen w-screen bg-transparent"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) hide()
      }}
    >
      <div className="w-full h-full bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-xl border border-gray-200 dark:border-gray-700 flex flex-col">
        <div className="sticky top-0 bg-white dark:bg-gray-800 p-2 border-b border-gray-200 dark:border-gray-600">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('settings.datetime.timezone_search_placeholder')}
              className="w-full pl-8 pr-2 py-1.5 text-sm rounded-md border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          {Array.from(grouped.entries()).map(([continent, zones]) => (
            <div key={continent}>
              <div className="px-3 py-1 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider bg-gray-50 dark:bg-gray-750">
                {continent}
              </div>
              {zones.map((tz) => (
                <button
                  key={tz.name}
                  type="button"
                  onClick={() => handleSelect(tz.name)}
                  className={`w-full text-left px-3 py-1.5 text-sm flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                    selectedTimezone === tz.name
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}
                  style={{
                    backgroundColor: selectedTimezone === tz.name ? `${themeColor}20` : undefined,
                  }}
                >
                  <span className="truncate">{tz.city}</span>
                  <span className="text-[11px] text-gray-400 dark:text-gray-500 ml-2 shrink-0">
                    {tz.localTime} {tz.offset}
                  </span>
                </button>
              ))}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="px-3 py-4 text-sm text-gray-400 dark:text-gray-500 text-center">{t('common.empty')}</div>
          )}
        </div>
        <div className="sticky bottom-0 bg-white dark:bg-gray-800 p-2 border-t border-gray-200 dark:border-gray-600">
          <button
            type="button"
            onClick={handleClear}
            className="w-full px-2 py-1 text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            {t('common.clear')}
          </button>
        </div>
      </div>
    </div>
  )
}
