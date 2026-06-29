import { emit } from '@tauri-apps/api/event'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import EmojiPickerButton from '@/components/EmojiPickerButton'
import OverlayWebviewWindow from '@/components/OverlayWebviewWindow'
import Tw22ColorPickerButton from '@/components/Tw22ColorPickerButton'
import { useCreateList, useDeleteList, useLists, useUpdateList } from '@/queries/useTaskQueries'
import type { List } from '@/types/task'

const ICON_KEY_TO_EMOJI: Record<string, string> = {
  book: '�',
  briefcase: '💼',
  flag: '🚩',
  folder: '�',
  heart: '❤️',
  home: '🏠',
  inbox: '📥',
  lightning: '⚡',
  star: '⭐',
  target: '🎯',
}

function resolveIcon(icon?: string): string {
  if (!icon) return '📁'
  return ICON_KEY_TO_EMOJI[icon] || icon
}

const params = new URLSearchParams(window.location.search)
const initialListId = params.get('listId')

export default function ListFormDialogPage() {
  const { t } = useTranslation('common')
  const { data: allLists = [] } = useLists()
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('📁')
  const [color, setColor] = useState('#3B82F6')
  const [list, setList] = useState<List | null>(null)
  const [loaded, setLoaded] = useState(!initialListId)
  const isEditing = !!list

  const createList = useCreateList()
  const updateList = useUpdateList()
  const deleteList = useDeleteList()

  useEffect(() => {
    document.documentElement.style.backgroundColor = 'transparent'
    document.body.style.backgroundColor = 'transparent'
    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
  }, [])

  useEffect(() => {
    if (initialListId && allLists.length > 0) {
      const found = allLists.find((l) => l.id === initialListId)
      if (found) {
        setList(found)
        setName(found.name)
        setIcon(resolveIcon(found.icon))
        setColor(found.color || '#3B82F6')
      }
      setLoaded(true)
    }
  }, [allLists])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    try {
      if (isEditing && list) {
        await updateList.mutateAsync({ color, icon, id: list.id, name: name.trim() })
      } else {
        await createList.mutateAsync({ color, icon, name: name.trim() })
      }
      await emit('dialog:result', { action: 'submit' })
      await getCurrentWindow().close()
    } catch (error) {
      console.error('Error submitting:', error)
    }
  }

  const handleDelete = async () => {
    if (!list) return
    try {
      await deleteList.mutateAsync(list.id)
      await emit('dialog:result', { action: 'delete' })
      await getCurrentWindow().close()
    } catch (error) {
      console.error('Error deleting:', error)
    }
  }

  const handleClose = async () => {
    try {
      await getCurrentWindow().close()
    } catch (error) {
      console.error('Error closing:', error)
    }
  }

  return (
    <OverlayWebviewWindow closable={true}>
      <div className="min-h-screen bg-white dark:bg-gray-800 rounded-xl overflow-hidden">
        {!loaded ? (
          <div className="p-6 flex items-center justify-center">
            <div className="text-gray-500 dark:text-gray-400">{t('common.loading')}</div>
          </div>
        ) : (
          <form className="p-5 space-y-4 text-sm" onSubmit={handleSubmit}>
            <div className="flex items-center gap-2">
              <div className="relative">
                <EmojiPickerButton onChange={setIcon} value={icon} />
                <div className="absolute -top-1 -right-1 z-10">
                  <Tw22ColorPickerButton isBadge={true} onChange={setColor} value={color} />
                </div>
              </div>
              <input
                className="flex-1 px-3 py-1.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                onChange={(e) => setName(e.target.value)}
                placeholder={t('lists.name_placeholder')}
                required
                type="text"
                value={name}
              />
            </div>

            <div className="flex gap-3 pt-3">
              {isEditing && (
                <button
                  className="px-4 py-2 text-sm text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  onClick={handleDelete}
                  type="button"
                >
                  {t('lists.delete_list')}
                </button>
              )}
              <div className="flex-1" />
              <button
                className="px-2.5 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                onClick={handleClose}
                type="button"
              >
                {t('common.cancel')}
              </button>
              <button
                className="px-2.5 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:opacity-50"
                disabled={!name.trim()}
                type="submit"
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
