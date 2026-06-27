import { LogicalPosition } from '@tauri-apps/api/dpi'
import { emit, listen } from '@tauri-apps/api/event'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { useEffect, useRef, useState } from 'react'
import Tw22ColorPicker from '@/components/Tw22ColorPicker'

export default function Tw22ColorPickerOverlayPage() {
  const [value, setValue] = useState('#3B82F6')
  const [visible, setVisible] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

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
    }>('tw22-color-picker-overlay:show', async (e) => {
      const { value: v, anchorX, anchorY, anchorH } = e.payload
      setValue(v)
      setVisible(true)

      const win = getCurrentWindow()
      const screenW = window.screen.width
      const screenH = window.screen.height
      const OVERLAY_W = 310
      const OVERLAY_H = 230
      let finalY = anchorY + anchorH + 4
      if (finalY + OVERLAY_H > screenH) finalY = anchorY - OVERLAY_H - 4
      if (finalY < 0) finalY = 4
      let finalX = anchorX
      if (finalX + OVERLAY_W > screenW) finalX = screenW - OVERLAY_W - 8
      if (finalX < 0) finalX = 8
      await win.setPosition(new LogicalPosition(Math.round(finalX), Math.round(finalY)))
    })

    return () => {
      unlisten.then((fn) => fn())
    }
  }, [])

  useEffect(() => {
    const unlisten = getCurrentWindow().onFocusChanged(({ payload: focused }) => {
      if (!focused) hide()
    })
    return () => {
      unlisten.then((fn) => fn())
    }
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
