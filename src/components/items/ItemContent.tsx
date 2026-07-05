import { Edit, LayoutGrid, List, Package, Plus, Search, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDeleteItem, useItemGroups, useItems } from '@/queries/useItemQueries'
import type { Item } from '@/types/item'
import ItemDetailPanel from './ItemDetailPanel'
import ItemForm from './ItemForm'

export default function ItemContent({
  selectedGroupId,
  viewMode,
  onViewModeChange,
}: {
  onViewModeChange: (mode: 'grid' | 'list') => void
  selectedGroupId: string | null
  viewMode: 'grid' | 'list'
}) {
  const { t } = useTranslation('common')
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<Item | null>(null)
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)
  const { data: groups = [] } = useItemGroups(true)
  const { data: items = [], isLoading } = useItems({ groupId: selectedGroupId || undefined, search: search || undefined })
  const deleteItem = useDeleteItem()

  useEffect(() => {
    if (!selectedItem) return
    const freshItem = items.find((item) => item.id === selectedItem.id)
    if (freshItem && freshItem !== selectedItem) setSelectedItem(freshItem)
  }, [items, selectedItem])

  const closeForm = () => {
    setShowForm(false)
    setEditingItem(null)
  }

  const startEdit = useCallback((item: Item) => {
    setEditingItem(item)
    setShowForm(true)
  }, [])

  const removeItem = async (item: Item) => {
    if (!window.confirm(t('items.messages.confirm_delete'))) return
    await deleteItem.mutateAsync(item.id)
    if (selectedItem?.id === item.id) setSelectedItem(null)
  }

  const renderItem = (item: Item) => (
    <button
      key={item.id}
      type="button"
      onClick={() => setSelectedItem(item)}
      className={`group text-left ${viewMode === 'grid' ? 'rounded-lg border border-gray-200 p-3 hover:border-theme-300 dark:border-gray-800' : 'flex items-center gap-3 rounded-md border border-gray-100 px-3 py-2 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/50'}`}
    >
      <div className={viewMode === 'grid' ? 'mb-3 flex h-20 items-center justify-center rounded bg-gray-50 dark:bg-gray-800' : 'flex h-10 w-10 shrink-0 items-center justify-center rounded bg-gray-50 dark:bg-gray-800'}>
        <Package className="h-6 w-6 text-gray-400" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{item.name}</div>
        <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-400">
          {item.source && <span>{t(`items.sources.${item.source}`)}</span>}
          {item.purchaseDate && <span>{item.purchaseDate}</span>}
          {item.purchasePrice != null && <span>{item.purchasePrice}</span>}
        </div>
      </div>
      {viewMode === 'list' && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation()
              startEdit(item)
            }}
            className="rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <Edit className="h-4 w-4" />
          </span>
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation()
              removeItem(item)
            }}
            className="rounded p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            <Trash2 className="h-4 w-4" />
          </span>
        </div>
      )}
    </button>
  )

  return (
    <main className="flex min-w-0 flex-1">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-3 border-b border-gray-200 p-3 dark:border-gray-700">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('items.placeholder.search')}
              className="w-full rounded border border-gray-300 bg-white py-1.5 pl-8 pr-3 text-sm dark:border-gray-700 dark:bg-gray-950"
            />
          </div>
          <div className="flex rounded bg-gray-100 p-0.5 dark:bg-gray-800">
            <button type="button" onClick={() => onViewModeChange('grid')} className={`rounded p-1.5 ${viewMode === 'grid' ? 'bg-white shadow-sm dark:bg-gray-700' : ''}`}>
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => onViewModeChange('list')} className={`rounded p-1.5 ${viewMode === 'list' ? 'bg-white shadow-sm dark:bg-gray-700' : ''}`}>
              <List className="h-4 w-4" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditingItem(null)
              setShowForm(true)
            }}
            className="flex items-center gap-1 rounded bg-theme-600 px-3 py-1.5 text-sm font-medium text-white"
          >
            <Plus className="h-4 w-4" />
            {t('items.actions.new')}
          </button>
        </div>

        <div className="flex-1 overflow-auto p-3">
          {isLoading ? (
            <div className="flex h-full items-center justify-center text-sm text-gray-500">{t('common.loading')}</div>
          ) : items.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-gray-500">{t('items.empty.items')}</div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">{items.map(renderItem)}</div>
          ) : (
            <div className="space-y-2">{items.map(renderItem)}</div>
          )}
        </div>
      </div>

      {selectedItem && (
        <ItemDetailPanel
          item={selectedItem}
          onDelete={() => removeItem(selectedItem)}
          onEdit={() => startEdit(selectedItem)}
        />
      )}

      {showForm && (
        <ItemForm
          groups={groups}
          item={editingItem}
          onClose={closeForm}
          selectedGroupId={selectedGroupId}
        />
      )}
    </main>
  )
}
