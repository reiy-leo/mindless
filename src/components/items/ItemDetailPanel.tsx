import { openUrl } from '@tauri-apps/plugin-opener'
import { Calendar, Edit, Link2, StickyNote, Trash2 } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useCountdowns } from '@/queries/useCountdownQueries'
import { useItemLinkedItems, useItemPurchaseLines, useLinkItem, useUnlinkItem } from '@/queries/useItemQueries'
import { useAllNotes } from '@/queries/useNoteQueries'
import { useAllPersons } from '@/queries/usePersonQueries'
import { useAllTasks } from '@/queries/useTaskQueries'
import type { Item } from '@/types/item'
import LinkedItemSelector from '%/media/LinkedItemSelector'
import ItemAttachmentPanel from './ItemAttachmentPanel'

function getOpenableUrl(url: string) {
  const trimmed = url.trim()
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

export default function ItemDetailPanel({
  item,
  onDelete,
  onEdit,
}: {
  item: Item
  onDelete: () => void
  onEdit: () => void
}) {
  const { t } = useTranslation('common')
  const navigate = useNavigate()
  const { data: purchaseLines = [] } = useItemPurchaseLines(item.id)
  const { data: linkedItems = [] } = useItemLinkedItems(item.id)
  const linkItem = useLinkItem()
  const unlinkItem = useUnlinkItem()
  const { data: tasks = [] } = useAllTasks()
  const { data: notes = [] } = useAllNotes()
  const { data: people = [] } = useAllPersons()
  const { data: countdowns = [] } = useCountdowns()

  const linkedIdsByType = useMemo(() => {
    return {
      countdown: linkedItems.filter((link) => link.linkedType === 'countdown').map((link) => link.linkedId),
      note: linkedItems.filter((link) => link.linkedType === 'note').map((link) => link.linkedId),
      person: linkedItems.filter((link) => link.linkedType === 'person').map((link) => link.linkedId),
      task: linkedItems.filter((link) => link.linkedType === 'task').map((link) => link.linkedId),
    }
  }, [linkedItems])

  const linkedRows = [
    { items: tasks.map((task) => ({ id: task.id, title: task.title })), key: 'task', label: t('items.links.tasks'), path: '/tasks?taskId=' },
    { items: notes.map((note) => ({ id: note.id, title: note.title })), key: 'note', label: t('items.links.notes'), path: '/notes?noteId=' },
    { items: people.map((person) => ({ id: person.id, title: person.name })), key: 'person', label: t('items.links.people'), path: '/people?personId=' },
    {
      items: countdowns.map((countdown) => ({ date: countdown.targetDate, id: countdown.id, title: countdown.title })),
      key: 'countdown',
      label: t('items.links.countdowns'),
      path: '/countdowns?countdownId=',
    },
  ] as const

  const removeLink = (linkedType: string, linkedId: string) => {
    const link = linkedItems.find((itemLink) => itemLink.linkedType === linkedType && itemLink.linkedId === linkedId)
    if (link) unlinkItem.mutate({ id: link.id, itemId: item.id })
  }

  const handleOpenUrl = async (url: string) => {
    const openable = getOpenableUrl(url)
    try {
      await openUrl(openable)
    } catch {
      window.open(openable, '_blank')
    }
  }

  return (
    <aside className="flex h-full w-[360px] flex-col border-l border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
        <h2 className="min-w-0 truncate text-base font-semibold text-gray-900 dark:text-gray-100">{item.name}</h2>
        <div className="flex items-center gap-1">
          <button type="button" onClick={onEdit} className="rounded p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800">
            <Edit className="h-4 w-4" />
          </button>
          <button type="button" onClick={onDelete} className="rounded p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="flex-1 space-y-4 overflow-auto p-4">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded bg-gray-50 p-2 dark:bg-gray-800">
            <div className="text-gray-400">{t('items.fields.source')}</div>
            <div>{item.source ? t(`items.sources.${item.source}`) : '-'}</div>
          </div>
          <div className="rounded bg-gray-50 p-2 dark:bg-gray-800">
            <div className="text-gray-400">{t('items.fields.purchase_price')}</div>
            <div>{item.purchasePrice == null ? '-' : item.purchasePrice}</div>
          </div>
          <div className="col-span-2 rounded bg-gray-50 p-2 dark:bg-gray-800">
            <div className="flex items-center gap-1 text-gray-400">
              <Calendar className="h-3.5 w-3.5" />
              {t('items.fields.purchase_date')}
            </div>
            <div>{item.purchaseDate || '-'}</div>
          </div>
        </div>

        {item.links && item.links.length > 0 && (
          <section>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-medium">
              <Link2 className="h-4 w-4" />
              {t('items.fields.links')}
            </h3>
            <div className="space-y-1">
              {item.links.map((link) => (
                <button
                  key={link.id}
                  type="button"
                  onClick={() => handleOpenUrl(link.url)}
                  className="block w-full rounded border border-gray-100 px-2 py-1.5 text-left text-xs text-theme-700 hover:bg-theme-50 dark:border-gray-800 dark:text-theme-200 dark:hover:bg-theme-900/30"
                >
                  <div className="truncate font-medium">{link.label || link.url}</div>
                  {link.label && <div className="truncate text-gray-400">{link.url}</div>}
                </button>
              ))}
            </div>
          </section>
        )}

        <section>
          <h3 className="mb-2 text-sm font-medium">{t('items.fields.purchase_lines')}</h3>
          {purchaseLines.length === 0 ? (
            <div className="text-xs text-gray-400">{t('items.empty.purchase_lines')}</div>
          ) : (
            <div className="space-y-1">
              {purchaseLines.map((line) => (
                <div key={line.id} className="rounded border border-gray-100 px-2 py-1.5 text-xs dark:border-gray-800">
                  <div className="flex justify-between gap-2">
                    <span className="font-medium">{line.name}</span>
                    <span className="text-gray-500">
                      {line.quantity} x {line.unitPrice ?? '-'}
                    </span>
                  </div>
                  {line.note && <div className="mt-1 text-gray-400">{line.note}</div>}
                </div>
              ))}
            </div>
          )}
        </section>

        <ItemAttachmentPanel itemId={item.id} />

        <section>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-medium">
            <Link2 className="h-4 w-4" />
            {t('items.fields.relations')}
          </h3>
          <div className="space-y-3">
            {linkedRows.map((row) => (
              <div key={row.key} className="space-y-1">
                <div className="text-xs font-medium text-gray-500">{row.label}</div>
                <LinkedItemSelector
                  items={row.items}
                  value={linkedIdsByType[row.key]}
                  onChange={(nextIds) => {
                    const currentIds = linkedIdsByType[row.key]
                    nextIds.filter((id) => !currentIds.includes(id)).forEach((id) => linkItem.mutate({ itemId: item.id, linkedId: id, linkedType: row.key }))
                    currentIds.filter((id) => !nextIds.includes(id)).forEach((id) => removeLink(row.key, id))
                  }}
                  placeholder={t('items.links.search')}
                />
                <div className="flex flex-wrap gap-1">
                  {linkedIdsByType[row.key].map((id) => {
                    const linked = row.items.find((entry) => entry.id === id)
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => navigate(`${row.path}${id}`)}
                        className="rounded-full bg-theme-50 px-2 py-0.5 text-xs text-theme-700 dark:bg-theme-900 dark:text-theme-200"
                      >
                        {linked?.title ?? id}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>

        {item.notes && (
          <section>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-medium">
              <StickyNote className="h-4 w-4" />
              {t('items.fields.notes')}
            </h3>
            <p className="whitespace-pre-wrap text-sm text-gray-600 dark:text-gray-300">{item.notes}</p>
          </section>
        )}
      </div>
    </aside>
  )
}
