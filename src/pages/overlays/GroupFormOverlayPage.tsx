import { emit, listen } from '@tauri-apps/api/event'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { useEffect, useRef, useState } from 'react'
import EmojiPickerButton from '@/components/EmojiPickerButton'
import OverlayWebviewWindow from '@/components/OverlayWebviewWindow'
import Tw22ColorPickerButton from '@/components/Tw22ColorPickerButton'
import {
  EMOJI_PICKER_LABEL,
  GROUP_FORM_LABEL,
  hideOverlay,
  notifyOverlayReady,
  notifyOverlayShowReady,
  TW22_COLOR_PICKER_LABEL,
} from '@/lib/overlayManager'

export default function GroupFormOverlayPage() {
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('📁')
  const [color, setColor] = useState('#3B82F6')
  const [namePlaceholder, setNamePlaceholder] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [_, setVisible] = useState(false)
  const extraRef = useRef<Record<string, unknown>>({})

  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    document.documentElement.style.setProperty('background-color', 'transparent', 'important')
    document.body.style.setProperty('background-color', 'transparent', 'important')
    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
  }, [])

  useEffect(() => {
    const unlisten = listen<{
      name: string
      icon: string
      color: string
      namePlaceholder?: string
      isEditing?: boolean
      showDelete?: boolean
      anchorX: number
      anchorY: number
      anchorH: number
    }>('group-form-overlay:show', (e) => {
      const {
        name: n,
        icon: ic,
        color: c,
        namePlaceholder: np,
        isEditing: ie,
        showDelete: sd,
        ...rest
      } = e.payload
      setName(n)
      setIcon(ic)
      setColor(c)
      setNamePlaceholder(np || '')
      setIsEditing(ie || false)
      setShowDelete(sd || false)
      extraRef.current = rest
      setVisible(true)
      notifyOverlayShowReady(GROUP_FORM_LABEL)

      setTimeout(() => inputRef.current?.focus(), 50)
    })

    unlisten.then(() => notifyOverlayReady(GROUP_FORM_LABEL)).catch(() => {})
    return () => {
      unlisten.then((fn) => fn()).catch(() => {})
    }
  }, [])

  const hide = async () => {
    setVisible(false)
    hideOverlay(TW22_COLOR_PICKER_LABEL)
    try {
      const emojiWin = await WebviewWindow.getByLabel(EMOJI_PICKER_LABEL)
      if (emojiWin) await emojiWin.hide()
    } catch {}
    await getCurrentWindow().hide()
  }

  const handleSubmit = () => {
    if (!name.trim()) return
    emit('group-form-overlay:result', { action: 'submit', color, icon, name: name.trim(), ...extraRef.current })
    hide()
  }

  const handleDelete = () => {
    emit('group-form-overlay:result', { action: 'delete', ...extraRef.current })
    hide()
  }

  const handleCancel = () => {
    emit('group-form-overlay:result', { action: 'cancel', ...extraRef.current })
    hide()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleCancel()
    } else if (e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <OverlayWebviewWindow closable={true} overlay={true}>
      <div
        className="h-screen w-screen bg-transparent"
        onMouseDown={(e) => {
          if (containerRef.current && e.target === containerRef.current) handleCancel()
        }}
        ref={containerRef}
      >
        <div className="w-full h-full overflow-hidden" onKeyDown={handleKeyDown}>
          <div className="p-3 space-y-3">
            <div className="flex items-center gap-2">
              <div className="relative">
                <div>
                  <EmojiPickerButton onChange={setIcon} value={icon} />
                </div>
                <div className="absolute -top-1 -right-1 z-10">
                  <Tw22ColorPickerButton isBadge={true} onChange={setColor} value={color} />
                </div>
              </div>
              <input
                className="flex-1 px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                onChange={(e) => setName(e.target.value)}
                placeholder={namePlaceholder}
                ref={inputRef}
                type="text"
                value={name}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                {showDelete && (
                  <button
                    className="px-2.5 py-1 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                    onClick={handleDelete}
                    type="button"
                  >
                    Delete
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="px-2.5 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  onClick={handleCancel}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="px-2.5 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:opacity-50"
                  disabled={!name.trim()}
                  onClick={handleSubmit}
                  type="button"
                >
                  {isEditing ? 'Save' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </OverlayWebviewWindow>
  )
}
