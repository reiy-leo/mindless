import { emit, listen } from '@tauri-apps/api/event'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { useCallback, useEffect, useRef, useState } from 'react'
import { DATE_RANGE_PICKER_LABEL, notifyOverlayReady, notifyOverlayShowReady } from '@/lib/overlayManager'
import { safeUnlisten } from '@/lib/safeUnlisten'
import type { CalendarEvent } from '@/types'
import DateTimeCalenderWithRangePicker from '%/DateTimeCalenderWithRangePicker'

export default function DateRangePickerOverlayPage() {
  const [localDate, setLocalDate] = useState<string | undefined>()
  const [localTime, setLocalTime] = useState<string | undefined>()
  const [localStartDate, setLocalStartDate] = useState<string | undefined>()
  const [localStartTime, setLocalStartTime] = useState<string | undefined>()
  const [localEndDate, setLocalEndDate] = useState<string | undefined>()
  const [localEndTime, setLocalEndTime] = useState<string | undefined>()
  const [localIsAllDay, setLocalIsAllDay] = useState(false)
  const [mode, setMode] = useState<'single' | 'range'>('single')
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [color, setColor] = useState<string | undefined>()
  const [hideTime, setHideTime] = useState(false)
  const [source, setSource] = useState<string | undefined>()
  const openingTimezoneRef = useRef(false)
  const openingRef = useRef(false)

  const handleTimezoneOverlayChange = useCallback((opening: boolean) => {
    openingTimezoneRef.current = opening
  }, [])

  useEffect(() => {
    document.documentElement.style.setProperty('background-color', 'transparent', 'important')
    document.body.style.setProperty('background-color', 'transparent', 'important')
    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
  }, [])

  useEffect(() => {
    const unlisten = listen<{
      date?: string
      time?: string
      startDate?: string
      startTime?: string
      endDate?: string
      endTime?: string
      isAllDay?: boolean
      mode?: 'single' | 'range'
      events?: CalendarEvent[]
      color?: string
      hideTime?: boolean
      _source?: string
      anchorX: number
      anchorY: number
      anchorH: number
    }>('date-range-picker-overlay:show', (e) => {
      const p = e.payload
      setLocalDate(p.date)
      setLocalTime(p.time)
      setLocalStartDate(p.startDate)
      setLocalStartTime(p.startTime)
      setLocalEndDate(p.endDate)
      setLocalEndTime(p.endTime)
      setLocalIsAllDay(p.isAllDay || false)
      setMode(p.mode || 'single')
      setEvents(p.events || [])
      setColor(p.color)
      setHideTime(p.hideTime || false)
      setSource(p._source)
      openingRef.current = true
      notifyOverlayShowReady(DATE_RANGE_PICKER_LABEL)
    })

    unlisten.then(() => notifyOverlayReady(DATE_RANGE_PICKER_LABEL)).catch(() => {})
    return safeUnlisten(unlisten)
  }, [])

  useEffect(() => {
    const unlisten = getCurrentWindow().onFocusChanged(({ payload: focused }) => {
      if (focused) {
        openingRef.current = false
        return
      }
      if (openingRef.current) return
      if (!openingTimezoneRef.current) hide()
    })
    return safeUnlisten(unlisten)
  }, [])

  const hide = async () => {
    await getCurrentWindow().hide()
  }

  const handleSingleChange = (d?: string, tm?: string) => {
    emit('date-range-picker-overlay:result', { _source: source, date: d, time: tm, type: 'single' })
    hide()
  }

  const handleRangeChange = (sd?: string, st?: string, ed?: string, et?: string, allDay?: boolean) => {
    emit('date-range-picker-overlay:result', {
      _source: source,
      endDate: ed,
      endTime: et,
      isAllDay: allDay,
      startDate: sd,
      startTime: st,
      type: 'range',
    })
    hide()
  }

  return (
    <div className="w-full h-full bg-transparent">
      <div className="rounded-lg overflow-hidden bg-white dark:bg-gray-800">
        <DateTimeCalenderWithRangePicker
          date={localDate}
          time={localTime}
          startDate={localStartDate}
          startTime={localStartTime}
          endDate={localEndDate}
          endTime={localEndTime}
          isAllDay={localIsAllDay}
          mode={mode}
          events={events}
          color={color}
          hideTime={hideTime}
          onSingleChange={handleSingleChange}
          onRangeChange={handleRangeChange}
          onTimezoneOverlayChange={handleTimezoneOverlayChange}
        />
      </div>
    </div>
  )
}
