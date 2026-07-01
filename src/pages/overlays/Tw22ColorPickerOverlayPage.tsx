import { emit, listen } from '@tauri-apps/api/event'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { useEffect, useRef, useState } from 'react'
import { notifyOverlayReady, notifyOverlayShowReady, TW22_COLOR_PICKER_LABEL } from '@/lib/overlayManager'
import { safeUnlisten } from '@/lib/safeUnlisten'
import Tw22ColorPicker from '%/Tw22ColorPicker'

export default function Tw22ColorPickerOverlayPage() {
  const [value, setValue] = useState('#3B82F6')
  const [visible, setVisible] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const openingRef = useRef(false)

  useEffect(() => {
    document.documentElement.style.setProperty('background-color', 'transparent', 'important')
    document.body.style.setProperty('background-color', 'transparent', 'important')
    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
  }, [])

  useEffect(() => {
    const unlisten = listen<{
      value: string
      anchorX: number
      anchorY: number
      anchorH: number
    }>(`${TW22_COLOR_PICKER_LABEL}:show`, (e) => {
      const { value: v } = e.payload
      setValue(v)
      setVisible(true)
      openingRef.current = true
      notifyOverlayShowReady(TW22_COLOR_PICKER_LABEL)
    })

    unlisten.then(() => notifyOverlayReady(TW22_COLOR_PICKER_LABEL)).catch(() => {})
    return safeUnlisten(unlisten)
  }, [])

  useEffect(() => {
    const unlisten = getCurrentWindow().onFocusChanged(({ payload: focused }) => {
      if (focused) {
        openingRef.current = false
        return
      }
      if (!openingRef.current) hide()
    })
    return safeUnlisten(unlisten)
  }, [])

  const hide = async () => {
    setVisible(false)
    await getCurrentWindow().hide()
  }

  const handleChange = (hex: string) => {
    emit('tw22-color-picker-overlay:result', { hex })
    hide()
  }

  return (
    <div
      ref={containerRef}
      className="h-screen w-screen bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-xl"
      style={{ opacity: visible ? 1 : 0, pointerEvents: visible ? 'auto' : 'none' }}
      onMouseDown={(e) => {
        if (containerRef.current && e.target === containerRef.current) hide()
      }}
    >
      <div className="p-3">
        <Tw22ColorPicker value={value} onChange={handleChange} />
      </div>
    </div>
  )
}
