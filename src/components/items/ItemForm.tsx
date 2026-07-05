import { listen } from '@tauri-apps/api/event'
import { Calendar, Plus, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { normalizeItemFormPayload } from '@/lib/items/itemForm'
import { DATE_PICKER_LABEL, showOverlay } from '@/lib/overlayManager'
import { getScreenRect } from '@/lib/screenRect'
import { useCreateItem, useItemPurchaseLines, useUpdateItem } from '@/queries/useItemQueries'
import { useCreateTag, useTags } from '@/queries/useTaskQueries'
import type { Item, ItemGroup, ItemSource } from '@/types/item'
import TagCombobox from '%/TagCombobox'

const SOURCES: ItemSource[] = ['amazon', 'jd', 'taobao', 'xiaomi_youpin', 'xiaoxiang_supermarket', 'offline_store']

interface PurchaseLineDraft {
  name: string
  note: string
  quantity: string
  unitPrice: string
}

const emptyLine = (): PurchaseLineDraft => ({ name: '', note: '', quantity: '1', unitPrice: '' })

const emptyLink = () => ({ label: '', url: '' })

export default function ItemForm({
  groups,
  item,
  onClose,
  selectedGroupId,
}: {
  groups: ItemGroup[]
  item?: Item | null
  onClose: () => void
  selectedGroupId?: string | null
}) {
  const { t } = useTranslation('common')
  const createItem = useCreateItem()
  const updateItem = useUpdateItem()
  const { data: tags = [] } = useTags()
  const createTag = useCreateTag()
  const { data: existingLines = [] } = useItemPurchaseLines(item?.id)
  const [name, setName] = useState('')
  const [source, setSource] = useState<ItemSource | ''>('')
  const [purchasePrice, setPurchasePrice] = useState('')
  const [purchaseDate, setPurchaseDate] = useState('')
  const [groupId, setGroupId] = useState('')
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const [purchaseLines, setPurchaseLines] = useState<PurchaseLineDraft[]>([emptyLine()])
  const [links, setLinks] = useState<Array<{ label: string; url: string }>>([emptyLink()])
  const pickingPurchaseDateRef = useRef(false)

  useEffect(() => {
    setName(item?.name ?? '')
    setSource((item?.source as ItemSource | null) ?? '')
    setPurchasePrice(item?.purchasePrice == null ? '' : String(item.purchasePrice))
    setPurchaseDate(item?.purchaseDate ?? '')
    setGroupId(item?.groupId ?? selectedGroupId ?? '')
    setSelectedTagIds(item?.tagIds ? item.tagIds.split(',').filter(Boolean) : [])
    setNotes(item?.notes ?? '')
    setLinks(item?.links?.length ? item.links.map((link) => ({ label: link.label ?? '', url: link.url })) : [emptyLink()])
  }, [item, selectedGroupId])

  useEffect(() => {
    if (!item) {
      setPurchaseLines([emptyLine()])
      return
    }
    if (existingLines.length > 0) {
      setPurchaseLines(
        existingLines.map((line) => ({
          name: line.name,
          note: line.note ?? '',
          quantity: String(line.quantity),
          unitPrice: line.unitPrice == null ? '' : String(line.unitPrice),
        })),
      )
    }
  }, [existingLines, item])

  const visibleGroups = useMemo(() => groups.filter((group) => !group.isHidden || group.id === groupId), [groupId, groups])

  useEffect(() => {
    let unlistenFn: (() => void) | null = null
    listen<{ date?: string }>('date-picker-overlay:result', (e) => {
      if (!pickingPurchaseDateRef.current) return
      setPurchaseDate(e.payload.date ?? '')
      pickingPurchaseDateRef.current = false
    }).then((fn) => {
      unlistenFn = fn
    })
    return () => {
      unlistenFn?.()
    }
  }, [])

  const toggleTag = (tagId: string) => {
    setSelectedTagIds((prev) => (prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]))
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const payload = normalizeItemFormPayload({
      groupId,
      links,
      name,
      notes,
      purchaseDate,
      purchaseLines,
      purchasePrice,
      selectedTagIds,
      source,
    })
    if (!payload.name) return
    if (item) {
      await updateItem.mutateAsync({ id: item.id, ...payload })
    } else {
      await createItem.mutateAsync(payload)
    }
    onClose()
  }

  const openPurchaseDatePicker = async (event: React.MouseEvent<HTMLElement>) => {
    pickingPurchaseDateRef.current = true
    const rect = await getScreenRect(event.currentTarget)
    await showOverlay(DATE_PICKER_LABEL, rect.x, rect.y + rect.height + 4, {
      anchorH: rect.height,
      anchorX: rect.x,
      anchorY: rect.y,
      date: purchaseDate || undefined,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form onSubmit={handleSubmit} className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-lg bg-white shadow-xl dark:bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            {item ? t('items.actions.edit') : t('items.actions.new')}
          </h2>
          <button type="button" onClick={onClose} className="rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-800">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 space-y-4 overflow-auto p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="space-y-1">
              <span className="text-xs font-medium text-gray-500">{t('items.fields.name')}</span>
              <input value={name} onChange={(e) => setName(e.target.value)} autoFocus required className="w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-950" />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-gray-500">{t('items.fields.group')}</span>
              <select value={groupId} onChange={(e) => setGroupId(e.target.value)} className="w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-950">
                <option value="">{t('items.groups.ungrouped')}</option>
                {visibleGroups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.icon} {group.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-1 gap-3 md:col-span-2 md:grid-cols-3">
              <label className="space-y-1">
                <span className="text-xs font-medium text-gray-500">{t('items.fields.source')}</span>
                <select value={source} onChange={(e) => setSource(e.target.value as ItemSource | '')} className="w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-950">
                  <option value="">{t('common.none')}</option>
                  {SOURCES.map((value) => (
                    <option key={value} value={value}>
                      {t(`items.sources.${value}`)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-xs font-medium text-gray-500">{t('items.fields.purchase_date')}</span>
                <button
                  type="button"
                  onClick={openPurchaseDatePicker}
                  className="flex w-full items-center justify-between rounded border border-gray-300 bg-white px-2 py-1.5 text-left text-sm dark:border-gray-700 dark:bg-gray-950"
                >
                  <span className={purchaseDate ? '' : 'text-gray-400'}>{purchaseDate || t('common.none')}</span>
                  <Calendar className="h-4 w-4 text-gray-400" />
                </button>
              </label>
              <label className="space-y-1">
                <span className="text-xs font-medium text-gray-500">{t('items.fields.purchase_price')}</span>
                <input type="number" min="0" step="0.01" value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} className="w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-950" />
              </label>
            </div>
            <div className="space-y-1">
              <span className="text-xs font-medium text-gray-500">Tags</span>
              <TagCombobox
                allTags={tags}
                selectedIds={selectedTagIds}
                onToggle={toggleTag}
                onCreateTag={(tagName) => createTag.mutate({ name: tagName })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500">{t('items.fields.links')}</span>
              <button type="button" onClick={() => setLinks((prev) => [...prev, emptyLink()])} className="rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-800">
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-2">
              {links.map((link, index) => (
                <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                  <input value={link.url} onChange={(e) => setLinks((prev) => prev.map((entry, i) => (i === index ? { ...entry, url: e.target.value } : entry)))} placeholder={t('items.fields.link_url')} className="rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-950" />
                  <input value={link.label} onChange={(e) => setLinks((prev) => prev.map((entry, i) => (i === index ? { ...entry, label: e.target.value } : entry)))} placeholder={t('items.fields.link_label')} className="rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-950" />
                  <button type="button" onClick={() => setLinks((prev) => (prev.length === 1 ? [emptyLink()] : prev.filter((_, i) => i !== index)))} className="rounded p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500">{t('items.fields.purchase_lines')}</span>
              <button type="button" onClick={() => setPurchaseLines((prev) => [...prev, emptyLine()])} className="rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-800">
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-2">
              {purchaseLines.map((line, index) => (
                <div key={index} className="grid grid-cols-[1fr_5rem_6rem_1fr_auto] gap-2">
                  <input value={line.name} onChange={(e) => setPurchaseLines((prev) => prev.map((l, i) => (i === index ? { ...l, name: e.target.value } : l)))} placeholder={t('items.fields.line_name')} className="rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-950" />
                  <input value={line.quantity} onChange={(e) => setPurchaseLines((prev) => prev.map((l, i) => (i === index ? { ...l, quantity: e.target.value } : l)))} placeholder={t('items.fields.quantity')} className="rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-950" />
                  <input value={line.unitPrice} onChange={(e) => setPurchaseLines((prev) => prev.map((l, i) => (i === index ? { ...l, unitPrice: e.target.value } : l)))} placeholder={t('items.fields.unit_price')} className="rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-950" />
                  <input value={line.note} onChange={(e) => setPurchaseLines((prev) => prev.map((l, i) => (i === index ? { ...l, note: e.target.value } : l)))} placeholder={t('items.fields.note')} className="rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-950" />
                  <button type="button" onClick={() => setPurchaseLines((prev) => prev.filter((_, i) => i !== index))} className="rounded p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <label className="block space-y-1">
            <span className="text-xs font-medium text-gray-500">{t('items.fields.notes')}</span>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} className="w-full resize-none rounded border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-950" />
          </label>
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-200 px-4 py-3 dark:border-gray-700">
          <button type="button" onClick={onClose} className="rounded px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-800">
            {t('common.cancel')}
          </button>
          <button type="submit" disabled={!name.trim()} className="rounded bg-theme-600 px-3 py-1.5 text-sm text-white disabled:opacity-50">
            {t('common.save')}
          </button>
        </div>
      </form>
    </div>
  )
}
