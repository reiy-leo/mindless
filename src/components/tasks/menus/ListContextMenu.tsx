import { Archive, Pencil, Pin, Trash2 } from 'lucide-react'
import { useLayoutEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { AdvancedGroup } from '&/useAppStore'
import type { List } from '@/types/task'

export interface ListContextMenuState {
  id: string
  type: 'list' | 'advGroup'
  x: number
  y: number
}

interface ListContextMenuProps {
  advancedGroups: AdvancedGroup[]
  allLists: List[]
  menu: ListContextMenuState
  onArchiveList: (listId: string) => void
  onClose: () => void
  onDeleteAdvancedGroup: (groupId: string) => void
  onDeleteList: (listId: string) => void
  onEditAdvancedGroup: (group: AdvancedGroup, rect: { height: number; x: number; y: number }) => void | Promise<void>
  onEditList: (list: List, rect: { height: number; x: number; y: number }) => void | Promise<void>
  onPinAdvancedGroup: (groupId: string) => void
  onPinList: (listId: string) => void
}

export default function ListContextMenu({
  advancedGroups,
  allLists,
  menu,
  onArchiveList,
  onClose,
  onDeleteAdvancedGroup,
  onDeleteList,
  onEditAdvancedGroup,
  onEditList,
  onPinAdvancedGroup,
  onPinList,
}: ListContextMenuProps) {
  const { t } = useTranslation('common')
  const menuRef = useRef<HTMLDivElement>(null)
  const [flipY, setFlipY] = useState(false)
  const list = menu.type === 'list' ? allLists.find((item) => item.id === menu.id) : undefined
  const group = menu.type === 'advGroup' ? advancedGroups.find((item) => item.id === menu.id) : undefined

  useLayoutEffect(() => {
    if (!menuRef.current) {
      return
    }
    const rect = menuRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - menu.y
    setFlipY(rect.height > spaceBelow && menu.y > spaceBelow)
  }, [menu.y])

  return (
    <>
      <div className="fixed inset-0 z-50" onMouseDown={onClose} />
      <div
        className="fixed z-50 bg-white dark:bg-theme-800 rounded-lg shadow-xl border border-theme-200 dark:border-theme-700 py-1 min-w-40"
        ref={menuRef}
        style={{
          left: menu.x,
          ...(flipY ? { bottom: window.innerHeight - menu.y } : { top: menu.y }),
        }}
      >
        {menu.type === 'list' ? (
          <>
            <button
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-theme-700 dark:text-theme-300 hover:bg-theme-100 dark:hover:bg-theme-700 transition-colors"
              onClick={() => {
                if (list) {
                  void onEditList(list, { height: 0, x: menu.x, y: menu.y })
                }
                onClose()
              }}
              type="button"
            >
              <Pencil className="w-4 h-4" />
              {t('common.edit')}
            </button>
            <button
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-theme-700 dark:text-theme-300 hover:bg-theme-100 dark:hover:bg-theme-700 transition-colors"
              onClick={() => onPinList(menu.id)}
              type="button"
            >
              <Pin className="w-4 h-4" />
              {list?.isPinned ? t('lists.unpin') : t('lists.pin')}
            </button>
            <button
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-theme-700 dark:text-theme-300 hover:bg-theme-100 dark:hover:bg-theme-700 transition-colors"
              onClick={() => onArchiveList(menu.id)}
              type="button"
            >
              <Archive className="w-4 h-4" />
              {list?.isArchived ? t('lists.unarchive') : t('lists.archive')}
            </button>
            <div className="border-t border-theme-200 dark:border-theme-700 my-1" />
            <button
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              onClick={() => onDeleteList(menu.id)}
              type="button"
            >
              <Trash2 className="w-4 h-4" />
              {t('common.delete')}
            </button>
          </>
        ) : (
          <>
            <button
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-theme-700 dark:text-theme-300 hover:bg-theme-100 dark:hover:bg-theme-700 transition-colors"
              onClick={() => {
                if (group) {
                  void onEditAdvancedGroup(group, { height: 0, x: menu.x, y: menu.y })
                }
                onClose()
              }}
              type="button"
            >
              <Pencil className="w-4 h-4" />
              {t('common.edit')}
            </button>
            <button
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-theme-700 dark:text-theme-300 hover:bg-theme-100 dark:hover:bg-theme-700 transition-colors"
              onClick={() => onPinAdvancedGroup(menu.id)}
              type="button"
            >
              <Pin className="w-4 h-4" />
              {group?.isPinned ? t('lists.unpin') : t('lists.pin')}
            </button>
            <div className="border-t border-theme-200 dark:border-theme-700 my-1" />
            <button
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              onClick={() => onDeleteAdvancedGroup(menu.id)}
              type="button"
            >
              <Trash2 className="w-4 h-4" />
              {t('common.delete')}
            </button>
          </>
        )}
      </div>
    </>
  )
}
