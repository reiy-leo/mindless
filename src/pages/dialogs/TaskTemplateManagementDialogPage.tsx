import { getCurrentWindow } from '@tauri-apps/api/window'
import { Clipboard, Plus, Search, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  useCreateTaskTemplate,
  useDeleteTaskTemplate,
  useTaskTemplates,
  useUpdateTaskTemplate,
} from '@/queries/useTaskQueries'
import type { TaskTemplate } from '@/types'
import OverlayWebviewWindow from '%/OverlayWebviewWindow'

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch {
    return dateStr
  }
}

export default function TaskTemplateManagementDialogPage() {
  const { t } = useTranslation('common')
  const { data: templates = [], isLoading } = useTaskTemplates()
  const createTemplate = useCreateTaskTemplate()
  const updateTemplate = useUpdateTaskTemplate()
  const deleteTemplate = useDeleteTaskTemplate()

  const [searchQuery, setSearchQuery] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [contextMenu, setContextMenu] = useState<{ id: string; x: number; y: number } | null>(null)

  const contextMenuRef = useRef<HTMLDivElement>(null)

  const filteredTemplates = useMemo(() => {
    if (!searchQuery.trim()) return templates
    const q = searchQuery.toLowerCase()
    return templates.filter((tpl) => tpl.name.toLowerCase().includes(q))
  }, [templates, searchQuery])

  const handleCreate = useCallback(() => {
    createTemplate.mutate({ name: t('template_mgmt.create_template') || 'Untitled' })
  }, [createTemplate, t])

  const handleStartEdit = useCallback((tpl: TaskTemplate) => {
    setEditingId(tpl.id)
    setEditingName(tpl.name)
  }, [])

  const handleSaveEdit = useCallback(() => {
    if (editingId && editingName.trim()) {
      const duplicate = templates.find((tpl) => tpl.name === editingName.trim() && tpl.id !== editingId)
      if (duplicate) {
        if (!window.confirm(t('template_mgmt.overwrite_confirm', { name: editingName.trim() }))) {
          setEditingId(null)
          setEditingName('')
          return
        }
        deleteTemplate.mutate(duplicate.id)
      }
      updateTemplate.mutate({ id: editingId, name: editingName.trim() })
    }
    setEditingId(null)
    setEditingName('')
  }, [editingId, editingName, updateTemplate, templates, deleteTemplate, t])

  const handleCancelEdit = useCallback(() => {
    setEditingId(null)
    setEditingName('')
  }, [])

  const handleDelete = useCallback(
    (id: string) => {
      deleteTemplate.mutate(id)
      setContextMenu(null)
    },
    [deleteTemplate],
  )

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null)
      }
    }
    if (contextMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [contextMenu])

  if (isLoading) {
    return (
      <OverlayWebviewWindow closable={false}>
        <div className="flex items-center justify-center h-full">
          <div className="text-sm text-gray-500 dark:text-gray-400">{t('common.loading')}</div>
        </div>
      </OverlayWebviewWindow>
    )
  }

  return (
    <OverlayWebviewWindow closable={false}>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div data-tauri-drag-region className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 h-8">
              <button
                type="button"
                onClick={() => getCurrentWindow().close()}
                className="w-3 h-3 rounded-full bg-[#898989] hover:bg-[#FF3B30] transition-colors group relative"
                title="Close"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                  className="w-2.5 h-2.5 m-auto opacity-0 group-hover:opacity-100"
                >
                  <title>close button</title>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder={t('template_mgmt.search_placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-7 pr-1.5 py-1 text-xs border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="button"
              onClick={handleCreate}
              className="p-1 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Template list */}
        <div className="flex-1 overflow-auto">
          {filteredTemplates.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400 px-3">
              <Clipboard className="w-8 h-8 mb-2 text-gray-300 dark:text-gray-600" />
              <p className="text-sm text-center">
                {searchQuery ? t('template_mgmt.no_results') : t('template_mgmt.no_templates')}
              </p>
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400">
                  <th className="text-left px-3 py-2 font-medium">{t('template_mgmt.template_name')}</th>
                  <th className="text-left px-3 py-2 font-medium w-25">{t('template_mgmt.created_at')}</th>
                  <th className="text-left px-3 py-2 font-medium w-25">{t('template_mgmt.updated_at')}</th>
                  <th className="text-center px-3 py-2 font-medium w-17.5">{t('template_mgmt.use_count')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredTemplates.map((template) => (
                  <tr
                    key={template.id}
                    className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-default"
                    onContextMenu={(e) => {
                      e.preventDefault()
                      setContextMenu({ id: template.id, x: e.clientX, y: e.clientY })
                    }}
                  >
                    <td className="px-3 py-2" onDoubleClick={() => handleStartEdit(template)}>
                      {editingId === template.id ? (
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit()
                            if (e.key === 'Escape') handleCancelEdit()
                          }}
                          onBlur={handleSaveEdit}
                          className="w-full px-1 py-0.5 text-xs border border-blue-400 rounded focus:outline-none dark:bg-gray-700 dark:text-gray-100"
                        />
                      ) : (
                        <span className="text-gray-800 dark:text-gray-200">{template.name}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{formatDate(template.createdAt)}</td>
                    <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{formatDate(template.updatedAt)}</td>
                    <td className="px-3 py-2 text-center text-gray-500 dark:text-gray-400">{template.usageCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Context Menu */}
        {contextMenu && (
          <div
            ref={contextMenuRef}
            className="fixed z-100 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 min-w-30"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button
              type="button"
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              onClick={() => handleDelete(contextMenu.id)}
            >
              <Trash2 className="w-3.5 h-3.5" />
              {t('common.delete')}
            </button>
          </div>
        )}
      </div>
    </OverlayWebviewWindow>
  )
}
