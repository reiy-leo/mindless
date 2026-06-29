import { openUrl } from '@tauri-apps/plugin-opener'
import { Archive, CheckCircle, ChevronDown, Clock, ExternalLink, EyeOff, Film, Pencil, Plus, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import DropdownWithSearch from '@/components/DropdownWithSearch'
import PhoneEmailListEditor from '@/components/PhoneEmailListEditor'
import {
  useCreateMediaItem,
  useMediaItemDetails,
  useMediaItemGenres,
  useMediaItems,
  useUpdateMediaItem,
  useUpdateMediaItemGenres,
} from '@/queries/useMediaQueries'
import { useNotes } from '@/queries/useNoteQueries'
import { useTasks } from '@/queries/useTaskQueries'
import type { CreateMediaItemInput, MediaItem, UpdateMediaItemInput } from '@/types/media'
import CoverUploader from './CoverUploader'
import GenreSelector from './GenreSelector'
import LinkedItemSelector from './LinkedItemSelector'
import RatingSlider from './RatingSlider'
import RelationSelector from './RelationSelector'

interface MediaItemFormProps {
  item?: MediaItem | null
  onClose: () => void
}

export default function MediaItemForm({ item, onClose }: MediaItemFormProps) {
  const { t } = useTranslation('common')
  const createItem = useCreateMediaItem()
  const updateItem = useUpdateMediaItem()
  const { data: details } = useMediaItemDetails(item?.id || null)
  const { data: genreIds = [] } = useMediaItemGenres(item?.id || null)
  const updateGenres = useUpdateMediaItemGenres()
  const [showOtherNameForm, setShowOtherNameForm] = useState(false)
  const [showWatchLinkForm, setShowWatchLinkForm] = useState(false)
  const [showStatusDropdown, setShowStatusDropdown] = useState(false)
  const [editingLink, setEditingLink] = useState<null | 'douban' | 'imdb' | 'rottenTomatoes'>(null)
  const [editingLinkValue, setEditingLinkValue] = useState('')
  const statusDropdownRef = useRef<HTMLDivElement>(null)
  const linkInputRef = useRef<HTMLInputElement>(null)
  const { data: allItems = [] } = useMediaItems()
  const { data: tasks = [] } = useTasks()
  const { data: notes = [] } = useNotes()

  const extractSeasonNumber = (title: string): number => {
    const match = title.trim().match(/(\d+)\s*$/)
    return match ? parseInt(match[1]) : 1
  }

  const externalLinkConfig = [
    {
      bgColor: 'bg-green-100 dark:bg-green-900/30',
      color: 'text-green-600 dark:text-green-400',
      field: 'doubanUrl' as const,
      key: 'douban' as const,
      label: '豆瓣',
    },
    {
      bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
      color: 'text-yellow-600 dark:text-yellow-400',
      field: 'imdbUrl' as const,
      key: 'imdb' as const,
      label: 'IMDB',
    },
    {
      bgColor: 'bg-red-100 dark:bg-red-900/30',
      color: 'text-red-600 dark:text-red-400',
      field: 'rottenTomatoesUrl' as const,
      key: 'rottenTomatoes' as const,
      label: t('media.fields.rottenTomatoesLabel'),
    },
  ]

  const currentYear = new Date().getFullYear()
  const yearOptions = Array.from({ length: currentYear + 10 - 1900 + 1 }, (_, i) => (1900 + i).toString()).reverse()

  const statusOptions = [
    { icon: EyeOff, labelKey: 'media.status.unwatched', value: 'unwatched' },
    { icon: Clock, labelKey: 'media.status.planned', value: 'planned' },
    { icon: Film, labelKey: 'media.status.normal', value: 'normal' },
    { icon: CheckCircle, labelKey: 'media.status.watched', value: 'watched' },
    { icon: Archive, labelKey: 'media.status.archived', value: 'archived' },
  ] as const

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(e.target as Node)) {
        setShowStatusDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const [formData, setFormData] = useState({
    cover: null as string | null,
    doubanUrl: '',
    genreIds: [] as string[],
    groupId: '',
    imdbUrl: '',
    linkedNoteIds: [] as string[],
    linkedTaskIds: [] as string[],
    otherNames: [] as { id: string; label: string; value: string; note: string }[],
    rating: '',
    relatedItemIds: [] as string[],
    rottenTomatoesUrl: '',
    status: 'unwatched' as 'unwatched' | 'planned' | 'normal' | 'watched' | 'archived',
    title: '',
    type: 'movie' as 'movie' | 'season',
    watchLinks: [] as { id: string; label: string; value: string; note: string }[],
    year: '',
  })

  const relatedItems = allItems.filter((i) => formData.relatedItemIds.includes(i.id))
  const linkedTasks = tasks.filter((t) => formData.linkedTaskIds.includes(t.id))
  const linkedNotes = notes.filter((n) => formData.linkedNoteIds.includes(n.id))

  const handleOpenLinkEditor = (key: 'douban' | 'imdb' | 'rottenTomatoes') => {
    const field = externalLinkConfig.find((c) => c.key === key)!.field
    setEditingLink(key)
    setEditingLinkValue(formData[field])
  }

  const handleToggleLinkEditor = (key: 'douban' | 'imdb' | 'rottenTomatoes') => {
    if (editingLink === key) {
      setEditingLink(null)
      setEditingLinkValue('')
    } else {
      handleOpenLinkEditor(key)
    }
  }

  const handleConfirmLink = () => {
    if (editingLink) {
      const field = externalLinkConfig.find((c) => c.key === editingLink)!.field
      setFormData({ ...formData, [field]: editingLinkValue.trim() })
      setEditingLink(null)
      setEditingLinkValue('')
    }
  }

  useEffect(() => {
    if (editingLink && linkInputRef.current) {
      linkInputRef.current.focus()
    }
  }, [editingLink])

  useEffect(() => {
    if (item) {
      setFormData({
        cover: item.cover,
        doubanUrl: item.doubanUrl || '',
        genreIds: genreIds,
        groupId: item.groupId || '',
        imdbUrl: item.imdbUrl || '',
        linkedNoteIds: details?.linkedNoteIds || [],
        linkedTaskIds: details?.linkedTaskIds || [],
        otherNames:
          details?.otherNames?.map((n) => ({
            id: n.id,
            label: n.label || '别名',
            note: '',
            value: n.name,
          })) || [],
        rating: item.rating?.toString() || '',
        relatedItemIds: details?.relations?.map((r) => r.relatedItemId) || [],
        rottenTomatoesUrl: item.rottenTomatoesUrl || '',
        status: item.status,
        title: item.title,
        type: item.type,
        watchLinks:
          details?.watchLinks?.map((l) => ({
            id: l.id,
            label: l.platform || '在线观看',
            note: '',
            value: l.url,
          })) || [],
        year: item.year?.toString() || '',
      })
    }
  }, [item, details, genreIds])

  const handleOpenLink = async (url: string) => {
    try {
      await openUrl(url)
    } catch (e) {
      console.error('Failed to open link:', e)
      window.open(url, '_blank')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const data: CreateMediaItemInput | UpdateMediaItemInput = {
      cover: formData.cover || undefined,
      doubanUrl: formData.doubanUrl || undefined,
      groupId: formData.groupId || undefined,
      imdbUrl: formData.imdbUrl || undefined,
      linkedNoteIds: formData.linkedNoteIds,
      linkedTaskIds: formData.linkedTaskIds,
      otherNames: formData.otherNames.map((n) => ({ label: n.label, name: n.value })),
      rating: formData.rating ? parseFloat(formData.rating) : undefined,
      relatedItemIds: formData.relatedItemIds,
      rottenTomatoesUrl: formData.rottenTomatoesUrl || undefined,
      seasonNumber: formData.type === 'season' ? extractSeasonNumber(formData.title) : undefined,
      status: formData.status,
      title: formData.title,
      type: formData.type,
      watchLinks: formData.watchLinks.map((l) => ({ platform: l.label, url: l.value })),
      year: formData.year ? parseInt(formData.year) : undefined,
    }

    try {
      let itemId = item?.id
      if (item) {
        await updateItem.mutateAsync({ id: item.id, ...data })
      } else {
        const newItem = await createItem.mutateAsync(data as CreateMediaItemInput)
        itemId = newItem.id
      }
      // Update genres
      if (itemId) {
        await updateGenres.mutateAsync({ genreIds: formData.genreIds, mediaItemId: itemId })
      }
      onClose()
    } catch (error) {
      console.error('Failed to save media item:', error)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-xl h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
          >
            {t('media.actions.cancel')}
          </button>
          <button
            type="submit"
            form="media-item-form"
            disabled={createItem.isPending || updateItem.isPending}
            className="px-3 py-1 text-sm font-medium text-white bg-blue-500 rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {t('media.actions.save')}
          </button>
        </div>

        <form id="media-item-form" onSubmit={handleSubmit} className="p-4 space-y-1 overflow-auto flex-1 min-h-0">
          {/* Row 1: Cover | Basic Info | Status/Group */}
          <div className="grid grid-cols-[120px_1fr_1fr] gap-4">
            {/* Column 1: Cover */}
            <div className="w-full flex flex-col gap-2">
              <div className="flex flex-col rounded-md overflow-hidden border border-gray-300 dark:border-gray-600">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: 'movie' })}
                  className={`flex-1 py-1 text-xs transition-colors ${
                    formData.type === 'movie'
                      ? 'bg-blue-500 text-white'
                      : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  {t('media.type.movie')}
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: 'season' })}
                  className={`flex-1 py-1 text-xs transition-colors border-t border-gray-300 dark:border-gray-600 ${
                    formData.type === 'season'
                      ? 'bg-blue-500 text-white'
                      : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  {t('media.type.season')}
                </button>
              </div>
              <CoverUploader value={formData.cover} onChange={(url) => setFormData({ ...formData, cover: url })} />
            </div>

            {/* Column 2: Type, Name, Year */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-300 dark:text-gray-300 mb-1">
                  {t('media.fields.title')}
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-300 dark:text-gray-300 mb-1">
                  {t('media.fields.year')}
                </label>
                <DropdownWithSearch
                  value={formData.year}
                  onChange={(val) => setFormData({ ...formData, year: val })}
                  options={yearOptions}
                  placeholder="-"
                  searchPlaceholder={t('media.placeholder.year')}
                  clearLabel="-"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-300 dark:text-gray-300 mb-1">
                  {t('media.fields.group')}
                </label>
                <GenreSelector
                  value={formData.genreIds}
                  onChange={(genreIds) => setFormData({ ...formData, genreIds })}
                />
              </div>
            </div>

            {/* Column 3: Status, Rating, Group */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-300 dark:text-gray-300 mb-1">
                  {t('media.fields.status')}
                </label>
                <div ref={statusDropdownRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                    className="w-full flex items-center justify-between px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900"
                  >
                    <div className="flex items-center gap-2">
                      {statusOptions.map((opt) => {
                        if (opt.value === formData.status) {
                          const Icon = opt.icon
                          return (
                            <span key={opt.value} className="flex items-center gap-1.5">
                              <Icon className="w-4 h-4" />
                              {t(opt.labelKey)}
                            </span>
                          )
                        }
                        return null
                      })}
                    </div>
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </button>
                  {showStatusDropdown && (
                    <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg">
                      {statusOptions.map((opt) => {
                        const Icon = opt.icon
                        const isSelected = formData.status === opt.value
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              setFormData({ ...formData, status: opt.value as any })
                              setShowStatusDropdown(false)
                            }}
                            className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                              isSelected
                                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                                : 'text-gray-700 dark:text-gray-300'
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                            <span className="flex-1 text-left">{t(opt.labelKey)}</span>
                            {isSelected && <span className="text-blue-500">✓</span>}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-gray-300 dark:text-gray-300">
                    {t('media.fields.rating')}
                  </label>
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {formData.rating || '0'}
                    </span>
                    {formData.rating && (
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, rating: '' })}
                        className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
                <RatingSlider value={formData.rating} onChange={(val) => setFormData({ ...formData, rating: val })} />
              </div>
            </div>
          </div>

          {/* Row 2+: Aligned to columns 2-3 of the cover row */}
          <div className="grid grid-cols-[120px_1fr_1fr] gap-4">
            <div />
            <div className="col-span-2 space-y-4">
              {/* External Links */}
              <div>
                <label className="block text-xs font-medium text-gray-300 dark:text-gray-300 mb-2">
                  {t('media.fields.externalLinks')}
                </label>
                <div className="flex items-center gap-3">
                  {externalLinkConfig.map((cfg) => {
                    const hasLink = !!formData[cfg.field]
                    return (
                      <div key={cfg.key} className="relative">
                        <button
                          type="button"
                          onClick={() => {
                            if (hasLink) {
                              handleOpenLink(formData[cfg.field])
                            } else {
                              handleToggleLinkEditor(cfg.key)
                            }
                          }}
                          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-full border transition-colors ${
                            hasLink
                              ? `${cfg.bgColor} ${cfg.color} border-transparent`
                              : editingLink === cfg.key
                                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-500 border-blue-300 dark:border-blue-600'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-600'
                          }`}
                        >
                          {cfg.label}
                          {hasLink && <ExternalLink className="w-3 h-3" />}
                        </button>
                        {hasLink && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleToggleLinkEditor(cfg.key)
                            }}
                            className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-300 flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                          >
                            <Pencil className="w-2.5 h-2.5" />
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
                {editingLink && (
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      ref={linkInputRef}
                      type="url"
                      value={editingLinkValue}
                      onChange={(e) => setEditingLinkValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleConfirmLink()
                        } else if (e.key === 'Escape') {
                          setEditingLink(null)
                          setEditingLinkValue('')
                        }
                      }}
                      placeholder={`${externalLinkConfig.find((c) => c.key === editingLink)!.label} URL`}
                      className="flex-1 px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900"
                    />
                    {formData[externalLinkConfig.find((c) => c.key === editingLink)!.field] && (
                      <button
                        type="button"
                        onClick={() =>
                          handleOpenLink(formData[externalLinkConfig.find((c) => c.key === editingLink)!.field])
                        }
                        className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        const field = externalLinkConfig.find((c) => c.key === editingLink)!.field
                        setFormData({ ...formData, [field]: '' })
                        setEditingLink(null)
                        setEditingLinkValue('')
                      }}
                      className="p-1 text-red-400 hover:text-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
              <hr />

              {/* Other Names */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-gray-300 dark:text-gray-300">
                    {t('media.fields.otherNames')}
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowOtherNameForm(true)}
                    className="p-0.5 text-gray-300 hover:text-gray-400 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                <PhoneEmailListEditor
                  type="other_name"
                  entries={formData.otherNames}
                  onChange={(entries) => setFormData({ ...formData, otherNames: entries as any })}
                  showAddForm={showOtherNameForm}
                  setShowAddForm={setShowOtherNameForm}
                  displayMode="grid"
                  labelPresets={[
                    t('media.placeholder.otherNameLabelEn'),
                    t('media.placeholder.otherNameLabelJa'),
                    t('media.placeholder.otherNameLabelOriginal'),
                  ]}
                />
              </div>

              {/* Watch Links */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-gray-300 dark:text-gray-300">
                    {t('media.fields.watchLinks')}
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowWatchLinkForm(true)}
                    className="p-0.5 text-gray-300 hover:text-gray-400 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                <PhoneEmailListEditor
                  type="watch_link"
                  entries={formData.watchLinks}
                  onChange={(entries) => setFormData({ ...formData, watchLinks: entries as any })}
                  showAddForm={showWatchLinkForm}
                  setShowAddForm={setShowWatchLinkForm}
                />
              </div>
              <hr />

              {/* Relations */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <label className="flex-1 text-xs font-medium text-gray-300 dark:text-gray-300 shrink-0">
                    {t('media.fields.relations')}
                  </label>
                  <RelationSelector
                    value={formData.relatedItemIds}
                    onChange={(value) => setFormData({ ...formData, relatedItemIds: value })}
                    currentItemId={item?.id}
                  />
                </div>
                {relatedItems.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {relatedItems.map((ri) => (
                      <div key={ri.id} className="flex items-center gap-2 p-1.5 bg-gray-50 dark:bg-gray-800 rounded">
                        <div className="w-8 h-11 rounded overflow-hidden shrink-0 bg-gray-200 dark:bg-gray-700">
                          {ri.cover ? (
                            <img src={ri.cover} alt={ri.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Film className="w-4 h-4 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-gray-700 dark:text-gray-300 truncate">{ri.title}</div>
                          {ri.year && <div className="text-xs text-gray-500 dark:text-gray-400">{ri.year}</div>}
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setFormData({
                              ...formData,
                              relatedItemIds: formData.relatedItemIds.filter((id) => id !== ri.id),
                            })
                          }
                          className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-red-400"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Linked Tasks */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <label className="flex-1 text-xs font-medium text-gray-300 dark:text-gray-300 shrink-0">
                    {t('media.fields.linkedTasks')}
                  </label>
                  <LinkedItemSelector
                    placeholder="搜索任务..."
                    value={formData.linkedTaskIds}
                    onChange={(value) => setFormData({ ...formData, linkedTaskIds: value })}
                    items={tasks.map((task) => ({
                      date: task.dueDate,
                      id: task.id,
                      time: task.dueTime,
                      title: task.title,
                    }))}
                  />
                </div>
                {linkedTasks.length > 0 && (
                  <div className="mt-1 space-y-1">
                    {linkedTasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded group text-sm"
                      >
                        {task.dueDate && (
                          <span className="text-gray-400 dark:text-gray-500 shrink-0">
                            {task.dueDate.slice(5)}
                            {task.dueTime ? ` ${task.dueTime}` : ''}
                          </span>
                        )}
                        <span className="text-gray-700 dark:text-gray-300 flex-1 truncate">{task.title}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setFormData({
                              ...formData,
                              linkedTaskIds: formData.linkedTaskIds.filter((id) => id !== task.id),
                            })
                          }
                          className="p-0.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Linked Notes */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <label className="flex-1 text-xs font-medium text-gray-300 dark:text-gray-300 shrink-0">
                    {t('media.fields.linkedNotes')}
                  </label>
                  <LinkedItemSelector
                    placeholder="搜索笔记..."
                    value={formData.linkedNoteIds}
                    onChange={(value) => setFormData({ ...formData, linkedNoteIds: value })}
                    items={notes.map((note) => ({
                      date: note.createdAt?.slice(0, 10),
                      id: note.id,
                      title: note.title,
                    }))}
                  />
                </div>
                {linkedNotes.length > 0 && (
                  <div className="mt-1 space-y-0.5">
                    {linkedNotes.map((note) => (
                      <div
                        key={note.id}
                        className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded group text-sm"
                      >
                        <span className="text-gray-400 dark:text-gray-500 shrink-0">
                          {note.createdAt?.slice(5, 10)}
                        </span>
                        <span className="text-gray-700 dark:text-gray-300 flex-1 truncate">{note.title}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setFormData({
                              ...formData,
                              linkedNoteIds: formData.linkedNoteIds.filter((id) => id !== note.id),
                            })
                          }
                          className="p-0.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
