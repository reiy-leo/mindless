import { Eye, EyeOff, Package, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useCreateItemGroup, useDeleteItemGroup, useItemGroups, useUpdateItemGroup } from '@/queries/useItemQueries'
import type { ItemGroup } from '@/types/item'
import GroupFormPopup from '%/ui/GroupFormPopup'

export default function ItemSidebar({
  onSelectGroup,
  selectedGroupId,
  width,
}: {
  onSelectGroup: (groupId: string | null) => void
  selectedGroupId: string | null
  width: number
}) {
  const { t } = useTranslation('common')
  const [includeHidden, setIncludeHidden] = useState(false)
  const { data: groups = [] } = useItemGroups(includeHidden)
  const createGroup = useCreateItemGroup()
  const updateGroup = useUpdateItemGroup()
  const deleteGroup = useDeleteItemGroup()
  const [showGroupForm, setShowGroupForm] = useState(false)
  const [editingGroup, setEditingGroup] = useState<ItemGroup | null>(null)
  const [triggerRect, setTriggerRect] = useState<DOMRect | null>(null)

  const submitGroup = async (value: { color: string; icon: string; name: string }) => {
    if (!value.name.trim()) return
    if (editingGroup) {
      await updateGroup.mutateAsync({ id: editingGroup.id, ...value })
    } else {
      await createGroup.mutateAsync(value)
    }
    setShowGroupForm(false)
    setEditingGroup(null)
  }

  const startCreate = (target: HTMLElement) => {
    setEditingGroup(null)
    setTriggerRect(target.getBoundingClientRect())
    setShowGroupForm(true)
  }

  const startEdit = (target: HTMLElement, group: ItemGroup) => {
    setEditingGroup(group)
    setTriggerRect(target.getBoundingClientRect())
    setShowGroupForm(true)
  }

  return (
    <aside className="flex h-full flex-col border-r border-gray-200 dark:border-gray-700" style={{ width }}>
      <div className="border-b border-gray-200 p-3 dark:border-gray-700">
        <button
          type="button"
          onClick={() => onSelectGroup(null)}
          className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm ${selectedGroupId === null ? 'bg-theme-100 text-theme-700 dark:bg-theme-900 dark:text-theme-200' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
        >
          <Package className="h-4 w-4" />
          {t('items.groups.all')}
        </button>
      </div>
      <div className="flex-1 overflow-auto p-3">
        <div className="mb-2 flex items-center justify-between">
          <button type="button" onClick={() => setIncludeHidden((prev) => !prev)} className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-gray-500">
            {includeHidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            {t('items.groups.title')}
          </button>
          <button type="button" onClick={(e) => startCreate(e.currentTarget)} className="rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-800" title={t('items.actions.new_group')}>
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-1">
          {groups.map((group) => (
            <button
              key={group.id}
              type="button"
              onClick={() => onSelectGroup(group.id)}
              className={`group flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm ${selectedGroupId === group.id ? 'bg-theme-100 text-theme-700 dark:bg-theme-900 dark:text-theme-200' : group.isHidden ? 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
            >
              <span className="flex min-w-0 items-center gap-2">
                <span>{group.icon}</span>
                <span className="truncate">{group.name}</span>
                {(group.usageCount ?? 0) > 0 && <span className="text-xs text-gray-400">({group.usageCount})</span>}
              </span>
              <span className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                {group.isBuiltin ? (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation()
                      updateGroup.mutate({ id: group.id, isHidden: !group.isHidden })
                    }}
                    className="rounded p-1 hover:bg-gray-200 dark:hover:bg-gray-700"
                    title={group.isHidden ? t('items.actions.show_group') : t('items.actions.hide_group')}
                  >
                    {group.isHidden ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                  </span>
                ) : (
                  <>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation()
                        startEdit(e.currentTarget, group)
                      }}
                      className="rounded p-1 hover:bg-gray-200 dark:hover:bg-gray-700"
                    >
                      <Pencil className="h-3 w-3" />
                    </span>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation()
                        if (window.confirm(t('items.messages.confirm_delete_group'))) deleteGroup.mutate(group.id)
                      }}
                      className="rounded p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="h-3 w-3" />
                    </span>
                  </>
                )}
              </span>
            </button>
          ))}
        </div>
      </div>
      <GroupFormPopup
        color={editingGroup?.color ?? '#3B82F6'}
        icon={editingGroup?.icon ?? '📦'}
        isEditing={!!editingGroup}
        isOpen={showGroupForm}
        name={editingGroup?.name ?? ''}
        namePlaceholder={t('items.groups.name_placeholder')}
        onClose={() => {
          setShowGroupForm(false)
          setEditingGroup(null)
        }}
        onSubmit={submitGroup}
        triggerRect={triggerRect}
      />
    </aside>
  )
}
