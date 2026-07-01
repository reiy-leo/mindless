import { useAppStore } from '&/useAppStore'
import { emit, listen } from '@tauri-apps/api/event'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { useEffect, useRef, useState } from 'react'
import {
  DATE_PICKER_LABEL,
  notifyOverlayReady,
  notifyOverlayShowReady,
  showOverlay,
  TIMEZONE_PICKER_LABEL,
} from '@/lib/overlayManager'
import { getScreenRect } from '@/lib/screenRect'
import type { CalendarEvent } from '@/types'
import DateTimeCalenderPicker from '%/DateTimeCalenderPicker'

export default function DatePickerOverlayPage() {
  const themeColor = useAppStore((s) => s.themeColor)
  const showTimezone = useAppStore((s) => s.showTimezone)
  const selectedTimezone = useAppStore((s) => s.selectedTimezone)
  const setSelectedTimezone = useAppStore((s) => s.setSelectedTimezone)
  const timezoneFormat = useAppStore((s) => s.timezoneFormat)

  const [localDate, setLocalDate] = useState('')
  const [localTime, setLocalTime] = useState('')
  const [color, setColor] = useState(themeColor)
  const [hideTime, setHideTime] = useState(false)
  const [events, setEvents] = useState<CalendarEvent[]>([])

  const containerRef = useRef<HTMLDivElement>(null)
  const timezoneButtonRef = useRef<HTMLButtonElement>(null)
  const openingTimezoneRef = useRef(false)

  useEffect(() => {
    document.documentElement.style.setProperty('background-color', 'transparent', 'important')
    document.body.style.setProperty('background-color', 'transparent', 'important')
    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
  }, [])

  useEffect(() => {
    const unlisten = listen<{ timezone?: string }>('timezone-picker-overlay:result', (e) => {
      openingTimezoneRef.current = false
      if (e.payload.timezone !== undefined) {
        setSelectedTimezone(e.payload.timezone)
      }
    })
    return () => {
      unlisten.then((fn) => fn()).catch(() => {})
    }
  }, [setSelectedTimezone])

  const handleOpenTimezonePicker = async () => {
    const button = timezoneButtonRef.current
    if (!button) return
    openingTimezoneRef.current = true
    const rect = await getScreenRect(button)
    await showOverlay(TIMEZONE_PICKER_LABEL, rect.x, rect.y + rect.height + 4, {
      anchorH: rect.height,
      anchorX: rect.x,
      anchorY: rect.y,
      timezone: selectedTimezone,
    })
  }

  useEffect(() => {
    const unlisten = listen<{
      date?: string
      time?: string
      color?: string
      hideTime?: boolean
      events?: CalendarEvent[]
    }>('date-picker-overlay:show', (e) => {
      const { date, time, color: c, hideTime: ht, events: evs } = e.payload
      setLocalDate(date || '')
      setLocalTime(time || '')
      if (c) setColor(c)
      setHideTime(ht || false)
      setEvents(evs || [])
      notifyOverlayShowReady(DATE_PICKER_LABEL)
    })

    unlisten.then(() => notifyOverlayReady(DATE_PICKER_LABEL)).catch(() => {})
    return () => {
      unlisten.then((fn) => fn()).catch(() => {})
    }
  }, [])

  useEffect(() => {
    const unlisten = getCurrentWindow().onFocusChanged(({ payload: focused }) => {
      if (!focused && !openingTimezoneRef.current) hide()
    })
    return () => {
      unlisten.then((fn) => fn()).catch(() => {})
    }
  }, [])

  useEffect(() => {
    const unlisten = getCurrentWindow().onFocusChanged(({ payload: focused }) => {
      if (!focused && !openingTimezoneRef.current) hide()
    })
    return () => {
      unlisten.then((fn) => fn())
    }
  }, [])

  const hide = async () => {
    await getCurrentWindow().hide()
  }

  const handleChange = (date?: string, time?: string) => {
    setLocalDate(date || '')
    setLocalTime(time || '')
  }

  const handleQuickDate = (date?: string, time?: string) => {
    emit('date-picker-overlay:result', { date: date || undefined, time: time || undefined })
    hide()
  }

  const handleConfirm = (date?: string, time?: string) => {
    emit('date-picker-overlay:result', { date: date || undefined, time: time || undefined })
    hide()
  }

  const handleClear = () => {
    emit('date-picker-overlay:result', { date: undefined, time: undefined })
    hide()
  }

  return (
    <div
      ref={containerRef}
      className="h-screen w-screen bg-transparent"
      onMouseDown={(e) => {
        if (containerRef.current && e.target === containerRef.current) hide()
      }}
    >
      <div className="w-full h-full bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-xl">
        <div className="p-0">
          <DateTimeCalenderPicker
            date={localDate}
            time={localTime}
            onChange={handleChange}
            events={events}
            color={color}
            hideTime={hideTime}
            showTimezone={showTimezone}
            selectedTimezone={selectedTimezone}
            timezoneFormat={timezoneFormat}
            onOpenTimezonePicker={handleOpenTimezonePicker}
            timezoneButtonRef={timezoneButtonRef}
            onQuickDate={handleQuickDate}
            onConfirm={handleConfirm}
            onClear={handleClear}
          />
        </div>
      </div>
    </div>
  )
}
