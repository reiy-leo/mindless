import { Calendar, ChevronDown, ChevronRight, Clock, Inbox, Pencil, Plus } from 'lucide-react'
import { type ComponentType, type Dispatch, type MouseEvent, type SetStateAction } from 'react'
import { useTranslation } from 'react-i18next'
import type { AdvancedGroup } from '&/useAppStore'
import type { List } from '@/types/task'

type SmartList = {
  iconKey: string
  id: string
  labelKey: string
  required: boolean
}

interface TaskSidebarProps {
  advGroupCounts: Record<string, number>
  advListsExpanded: boolean
  advancedGroups: AdvancedGroup[]
  groupsPanelWidth: number
  handleAdvGroupClick: (groupId: string) => void
  handleContextMenu: (e: MouseEvent, type: 'list' | 'advGroup', id: string) => void
  handleCreateAdvGroup: (e: MouseEvent) => void | Promise<void>
  handleCreateList: (e?: MouseEvent) => void | Promise<void>
  handleEditAdvGroup: (e: MouseEvent, group: AdvancedGroup) => void | Promise<void>
  handleEditList: (e: MouseEvent, list: List) => void | Promise<void>
  handleListClick: (listId: string) => void
  listTaskCounts: Record<string, number>
  listsExpanded: boolean
  pinnedAdvGroups: AdvancedGroup[]
  pinnedLists: List[]
  resolveIcon: (icon?: string) => string
  selectedListId: string | null
  setAdvListsExpanded: Dispatch<SetStateAction<boolean>>
  setListsExpanded: Dispatch<SetStateAction<boolean>>
  userLists: List[]
  visibleSmartLists: readonly SmartList[]
}

const GROUP_ICON_MAP: Record<string, ComponentType<{ className?: string }>> = {
  calendar: Calendar,
  clock: Clock,
  inbox: Inbox,
  recent: Clock,
  recent7days: Clock,
  thisMonth: Calendar,
}

export default function TaskSidebar({
  advGroupCounts,
  advListsExpanded,
  advancedGroups,
  groupsPanelWidth,
  handleAdvGroupClick,
  handleContextMenu,
  handleCreateAdvGroup,
  handleCreateList,
  handleEditAdvGroup,
  handleEditList,
  handleListClick,
  listTaskCounts,
  listsExpanded,
  pinnedAdvGroups,
  pinnedLists,
  resolveIcon,
  selectedListId,
  setAdvListsExpanded,
  setListsExpanded,
  userLists,
  visibleSmartLists,
}: TaskSidebarProps) {
  const { t } = useTranslation('common')

  const getGroupIcon = (iconKey: string) => {
    const Icon = GROUP_ICON_MAP[iconKey] || Inbox
    return <Icon className="w-3.5 h-3.5" />
  }

  return (
    <div
      className="border-r bg-theme-300/30 dark:bg-theme-600/30 border-theme-200 dark:border-theme-900 flex flex-col overflow-hidden"
      style={{
        flexShrink: 0,
        maxWidth: 315,
        minWidth: 215,
        width: groupsPanelWidth,
      }}
    >
      {(pinnedLists.length > 0 || pinnedAdvGroups.length > 0) && (
        <div className="w-full px-2 pt-2 pb-1" data-tauri-drag-region>
          <div className="flex flex-wrap gap-1">
            {pinnedLists.map((list) => {
              const isActive = selectedListId === list.id
              return (
                <div className="relative group" key={list.id}>
                  <button
                    className={`border text-sm p-1 rounded-md transition-colors ${
                      isActive
                        ? 'border-theme-300 bg-theme-100 dark:bg-theme-200/30 dark:border-theme-400'
                        : 'border-transparent hover:bg-black/5 dark:hover:bg-theme-200/30 dark:hover:border-theme-600'
                    }`}
                    onClick={() => handleListClick(list.id)}
                    onContextMenu={(e) => handleContextMenu(e, 'list', list.id)}
                    style={isActive ? { color: 'var(--theme-text-70)' } : {}}
                    title={list.name}
                    type="button"
                  >
                    {resolveIcon(list.icon)}
                  </button>
                </div>
              )
            })}
            {pinnedAdvGroups.map((group) => {
              const isActive = selectedListId === `adv:${group.id}`
              return (
                <div className="relative group" key={group.id}>
                  <button
                    className={`border text-sm p-1 rounded-md transition-colors ${
                      isActive
                        ? 'border-theme-300 bg-theme-100 dark:bg-theme-200/30 dark:border-theme-400'
                        : 'border-transparent hover:bg-black/5 dark:hover:bg-theme-200/30 dark:hover:border-theme-600'
                    }`}
                    onClick={() => handleAdvGroupClick(group.id)}
                    onContextMenu={(e) => handleContextMenu(e, 'advGroup', group.id)}
                    style={isActive ? { color: 'var(--theme-text-70)' } : {}}
                    title={group.name}
                    type="button"
                  >
                    {resolveIcon(group.icon)}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="px-2 pt-2 pb-1">
        <div className="space-y-px">
          {visibleSmartLists.map((smartList) => {
            const isActive = selectedListId === smartList.id
            const count = listTaskCounts[smartList.id] || 0

            return (
              <div className="relative group" key={smartList.id}>
                <button
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md transition-colors text-left text-sm ${
                    isActive
                      ? 'bg-theme-700/30 dark:bg-theme-200/30'
                      : 'text-theme-700 dark:text-theme-300 hover:bg-theme-700/20 dark:hover:bg-theme-200/20'
                  }`}
                  onClick={() => handleListClick(smartList.id)}
                  style={isActive ? { color: 'var(--theme-text-70)' } : {}}
                  type="button"
                >
                  {getGroupIcon(smartList.iconKey)}
                  <span className="flex-1 truncate">{t(smartList.labelKey)}</span>
                  {count > 0 && <span className="text-xs text-theme-600 dark:text-theme-400">{count}</span>}
                </button>
              </div>
            )
          })}
        </div>
        <hr className="mt-2 border-theme-200 dark:border-theme-800" />
      </div>

      <div className="overflow-auto px-2 py-2">
        <div className="flex items-center justify-between mb-1 px-1.5 rounded-md dark:hover:text-theme-200 invisible hover:visible">
          <button
            className="flex items-center gap-1 -ms-3 text-xs font-semibold text-theme-700 dark:text-theme-300 tracking-wider hover:text-theme-700 dark:hover:text-theme-200 transition-colors"
            onClick={() => setAdvListsExpanded(!advListsExpanded)}
            type="button"
          >
            {advListsExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            <p className="visible">{t('advanced_groups.title')}</p>
          </button>
          <div className="flex items-center gap-0.5">
            <button
              className="p-0.5 rounded hover:bg-theme-100 dark:hover:bg-theme-700 transition-colors transition-150"
              onClick={handleCreateAdvGroup}
              title={t('lists.create_list')}
              type="button"
            >
              <Plus className="w-3.5 h-3.5 text-theme-700 dark:text-theme-500" />
            </button>
          </div>
        </div>
        {advListsExpanded && (
          <div className="space-y-px">
            {[...advancedGroups]
              .sort((a, b) => {
                if (a.isPinned && !b.isPinned) {
                  return -1
                }
                if (!a.isPinned && b.isPinned) {
                  return 1
                }
                return 0
              })
              .map((group) => {
                const isActive = selectedListId === `adv:${group.id}`
                const count = advGroupCounts[group.id] || 0

                return (
                  <div
                    className={`relative group flex items-center gap-1 rounded-md transition-colors ${
                      isActive
                        ? 'bg-black/10 dark:bg-white/15'
                        : 'text-theme-700 dark:text-theme-300 hover:bg-black/5 dark:hover:bg-white/10'
                    }`}
                    key={group.id}
                    onContextMenu={(e) => handleContextMenu(e, 'advGroup', group.id)}
                    style={isActive ? { color: 'var(--theme-text-70)' } : {}}
                  >
                    <button
                      className="min-w-0 flex-1 flex items-center gap-2 px-2.5 py-1.5 rounded-md text-left text-sm"
                      onClick={() => handleAdvGroupClick(group.id)}
                      type="button"
                    >
                      <span className="shrink-0 text-sm">{resolveIcon(group.icon)}</span>
                      <span className="flex-1 truncate">{group.name}</span>
                    </button>
                    {count > 0 && (
                      <span className="text-xs text-theme-400 dark:text-theme-500 group-hover:hidden pr-1">{count}</span>
                    )}
                    <button
                      className="hidden group-hover:block p-0.5 mr-1 rounded hover:bg-theme-200 dark:hover:bg-theme-600"
                      onClick={(e) => {
                        e.stopPropagation()
                        void handleEditAdvGroup(e, group)
                      }}
                      type="button"
                    >
                        <Pencil className="w-3 h-3 text-theme-400 dark:text-theme-500" />
                    </button>
                  </div>
                )
              })}
          </div>
        )}
      </div>

      <div className="overflow-auto px-2 py-2">
        <div className="flex items-center justify-between mb-1 px-1.5 invisible hover:visible">
          <button
            className="flex items-center gap-1 -ms-3 text-xs font-semibold text-theme-700 dark:text-theme-300 uppercase tracking-wider hover:text-theme-700 dark:hover:text-theme-200 transition-colors"
            onClick={() => setListsExpanded(!listsExpanded)}
            type="button"
          >
            {listsExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            <p className="visible">{t('lists.title')}</p>
          </button>
          <div className="flex items-center gap-0.5">
            <button
              className="p-0.5 rounded hover:bg-theme-100 dark:hover:bg-theme-700 transition-colors"
              onClick={handleCreateList}
              title={t('lists.create_list')}
              type="button"
            >
              <Plus className="w-3.5 h-3.5 text-theme-400 dark:text-theme-500" />
            </button>
          </div>
        </div>

        {listsExpanded && (
          <div className="space-y-px">
            {userLists.map((list) => {
              const isActive = selectedListId === list.id
              const count = listTaskCounts[list.id] || 0

              return (
                <div
                  className={`relative group flex items-center gap-1 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-white/30 dark:bg-black/30'
                      : 'text-theme-700 dark:text-theme-300 hover:bg-white/30 dark:hover:bg-black/30'
                  }`}
                  key={list.id}
                  onContextMenu={(e) => handleContextMenu(e, 'list', list.id)}
                  style={isActive ? { color: 'var(--theme-text-700)' } : {}}
                >
                  <button
                    className="min-w-0 flex-1 flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-sm"
                    onClick={() => handleListClick(list.id)}
                    type="button"
                  >
                    <span className="shrink-0 text-sm">{resolveIcon(list.icon)}</span>
                    <span className="flex-1 truncate">{list.name}</span>
                  </button>
                  {count > 0 && (
                    <span className="text-xs text-theme-400 dark:text-theme-500 group-hover:hidden pr-1">{count}</span>
                  )}
                  <button
                    className="hidden group-hover:block p-0.5 mr-1 rounded hover:bg-theme-200 dark:hover:bg-theme-600"
                    onClick={(e) => {
                      e.stopPropagation()
                      void handleEditList(e, list)
                    }}
                    type="button"
                  >
                      <Pencil className="w-3 h-3 text-theme-400 dark:text-theme-500" />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
