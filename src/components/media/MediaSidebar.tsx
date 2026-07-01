import { Archive, BookOpen, CheckCircle, Clock, EyeOff, Film, Pencil, Plus, Star, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  useCreateMediaGroup,
  useDeleteMediaGroup,
  useMediaGroupsWithCount,
  useUpdateMediaGroup,
} from '@/queries/useMediaQueries'
import type { MediaGroupWithCount } from '@/types/media'
import GroupFormPopup from '%/ui/GroupFormPopup'

type SmartGroupId = 'all' | 'favorites' | 'unwatched' | 'planned' | 'normal' | 'watched' | 'archived'

const SMART_GROUPS: {
  id: SmartGroupId | 'divider'
  icon?: React.ComponentType<{ className?: string }>
  labelKey?: string
}[] = [
  { icon: BookOpen, id: 'all', labelKey: 'media.smart_groups.all' },
  { icon: Star, id: 'favorites', labelKey: 'media.smart_groups.favorites' },
  { id: 'divider' },
  { icon: EyeOff, id: 'unwatched', labelKey: 'media.smart_groups.unwatched' },
  { icon: Clock, id: 'planned', labelKey: 'media.smart_groups.planned' },
  { icon: Film, id: 'normal', labelKey: 'media.smart_groups.normal' },
  { icon: CheckCircle, id: 'watched', labelKey: 'media.smart_groups.watched' },
  { icon: Archive, id: 'archived', labelKey: 'media.smart_groups.archived' },
]

interface MediaSidebarProps {
  onSelectGroup: (groupId: string) => void
  onSelectSmartGroup: (groupId: SmartGroupId) => void
  selectedGroupId: string | null
  selectedSmartGroup: SmartGroupId | null
  width: number
}

export default function MediaSidebar({
  selectedSmartGroup,
  selectedGroupId,
  onSelectSmartGroup,
  onSelectGroup,
  width,
}: MediaSidebarProps) {
  const { t } = useTranslation('common')
  const { data: groups = [] } = useMediaGroupsWithCount()
  const createGroup = useCreateMediaGroup()
  const updateGroup = useUpdateMediaGroup()
  const deleteGroup = useDeleteMediaGroup()

  const [groupsExpanded, setGroupsExpanded] = useState(true)
  const [showGroupForm, setShowGroupForm] = useState(false)
  const [editingGroup, setEditingGroup] = useState<MediaGroupWithCount | null>(null)
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupColor, setNewGroupColor] = useState('#3B82F6')
  const [newGroupIcon, setNewGroupIcon] = useState('🎬')
  const [groupFormTriggerRect, setGroupFormTriggerRect] = useState<DOMRect | null>(null)

  const handleCreateGroup = async (result: { name: string; icon: string; color: string }) => {
    if (!result.name.trim()) return
    await createGroup.mutateAsync({
      color: result.color,
      icon: result.icon,
      name: result.name,
    })
    setShowGroupForm(false)
  }

  const handleUpdateGroup = async (result: { name: string; icon: string; color: string }) => {
    if (!editingGroup || !result.name.trim()) return
    await updateGroup.mutateAsync({
      color: result.color,
      icon: result.icon,
      id: editingGroup.id,
      name: result.name,
    })
    setEditingGroup(null)
    setShowGroupForm(false)
  }

  const handleDeleteGroup = async (id: string) => {
    if (window.confirm(t('media.message.confirm_delete_group'))) {
      await deleteGroup.mutateAsync(id)
    }
  }

  const startEditGroup = (e: React.MouseEvent, group: MediaGroupWithCount) => {
    setEditingGroup(group)
    setNewGroupName(group.name)
    setNewGroupColor(group.color || '#3B82F6')
    setNewGroupIcon(group.icon || '🎬')
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setGroupFormTriggerRect(rect)
    setShowGroupForm(true)
  }

  return (
    <div className="flex flex-col h-full border-r border-gray-200 dark:border-gray-700" style={{ width }}>
      {/* Smart Groups */}
      <div className="p-3 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
          {t('media.title')}
        </h3>
        <div className="space-y-1">
          {SMART_GROUPS.map((group) => {
            if (group.id === 'divider') {
              return <div key="divider" className="my-1 border-t border-gray-200 dark:border-gray-700" />
            }
            const Icon = group.icon!
            const isSelected = selectedSmartGroup === group.id
            return (
              <button
                key={group.id}
                onClick={() => onSelectSmartGroup(group.id as SmartGroupId)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${
                  isSelected
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{t(group.labelKey!)}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Media Genres */}
      <div className="flex-1 overflow-auto p-3">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => setGroupsExpanded(!groupsExpanded)}
            className="flex items-center gap-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider"
          >
            <span>{t('media.fields.group')}</span>
            <span>{groupsExpanded ? '▼' : '▶'}</span>
          </button>
          <button
            onClick={(e) => {
              setEditingGroup(null)
              setNewGroupName('')
              setNewGroupColor('#3B82F6')
              setNewGroupIcon('🎬')
              setGroupFormTriggerRect(e.currentTarget.getBoundingClientRect())
              setShowGroupForm(true)
            }}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
            title={t('media.actions.new_group')}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {groupsExpanded && (
          <div className="space-y-1">
            {groups.map((group) => (
              <div
                key={group.id}
                className={`group flex items-center justify-between px-2 py-1.5 rounded-md text-sm cursor-pointer transition-colors ${
                  selectedGroupId === group.id
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
                onClick={() => onSelectGroup(group.id)}
              >
                <div className="flex items-center gap-2">
                  <span>{group.icon || '🎬'}</span>
                  <span>{group.name}</span>
                  {group.usageCount > 0 && (
                    <span className="text-xs text-gray-400 dark:text-gray-500">({group.usageCount})</span>
                  )}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      startEditGroup(e, group)
                    }}
                    className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                    title={t('media.actions.edit_group')}
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                  {!group.isPreset && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteGroup(group.id)
                      }}
                      className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                      title={t('media.actions.delete_group')}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Group Form Popup */}
        <GroupFormPopup
          isOpen={showGroupForm}
          onClose={() => {
            setShowGroupForm(false)
            setEditingGroup(null)
          }}
          onSubmit={editingGroup ? handleUpdateGroup : handleCreateGroup}
          triggerRect={groupFormTriggerRect}
          name={newGroupName}
          icon={newGroupIcon}
          color={newGroupColor}
          namePlaceholder={t('media.placeholder.title')}
          isEditing={!!editingGroup}
        />
      </div>
    </div>
  )
}
