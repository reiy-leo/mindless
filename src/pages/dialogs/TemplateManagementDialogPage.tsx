import { Copy, Plus, Trash2 } from 'lucide-react'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import OverlayWebviewWindow from '@/components/OverlayWebviewWindow'
import {
  useCreateTaskTemplate,
  useDeleteTaskTemplate,
  useTaskTemplates,
  useUpdateTaskTemplate,
} from '@/queries/useTaskQueries'

export default function TemplateManagementDialogPage() {
  const { t } = useTranslation('common')
  const { data: templates = [], isLoading } = useTaskTemplates()
  const createTemplate = useCreateTaskTemplate()
  const updateTemplate = useUpdateTaskTemplate()
  const deleteTemplate = useDeleteTaskTemplate()

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const editInputRef = useRef<HTMLInputElement>(null)

  const filteredTemplates = useMemo(() => {
    if (!searchQuery) return templates
    const q = searchQuery.toLowerCase()
    return templates.filter((tmpl) => tmpl.name.toLowerCase().includes(q))
  }, [templates, searchQuery])

  const selectedTemplate = useMemo(() => {
    return templates.find((tmpl) => tmpl.id === selectedTemplateId) || null
  }, [templates, selectedTemplateId])

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus()
      editInputRef.current.select()
    }
  }, [editingId])

  const handleCreate = useCallback(() => {
    const name = t('template_mgmt.create_template')
    createTemplate.mutate(
      { name },
      {
        onSuccess: (newTemplate) => {
          setSelectedTemplateId(newTemplate.id)
          setEditingId(newTemplate.id)
          setEditingName(newTemplate.name)
        },
      },
    )
  }, [createTemplate, t])

  const handleDelete = useCallback(
    (id: string) => {
      const template = templates.find((tmpl) => tmpl.id === id)
      if (template && window.confirm(t('template_mgmt.delete_confirm', { name: template.name }))) {
        deleteTemplate.mutate(id, {
          onSuccess: () => {
            if (selectedTemplateId === id) {
              setSelectedTemplateId(null)
            }
          },
        })
      }
    },
    [templates, deleteTemplate, selectedTemplateId, t],
  )

  const handleStartEdit = useCallback((id: string, name: string) => {
    setEditingId(id)
    setEditingName(name)
  }, [])

  const handleSaveEdit = useCallback(() => {
    if (editingId && editingName.trim()) {
      updateTemplate.mutate({ id: editingId, name: editingName.trim() })
    }
    setEditingId(null)
    setEditingName('')
  }, [editingId, editingName, updateTemplate])

  const handleCancelEdit = useCallback(() => {
    setEditingId(null)
    setEditingName('')
  }, [])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleSaveEdit()
      } else if (e.key === 'Escape') {
        handleCancelEdit()
      }
    },
    [handleSaveEdit, handleCancelEdit],
  )

  const formatDate = useCallback((dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString()
    } catch {
      return dateStr
    }
  }, [])

  if (isLoading) {
    return (
      <OverlayWebviewWindow closable={false}>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-sm text-gray-500 dark:text-gray-400">{t('common.loading')}</div>
        </div>
      </OverlayWebviewWindow>
    )
  }

  return (
    <OverlayWebviewWindow closable={false}>
      <div className="flex h-full">
        {/* Left panel: Template list */}
        <div className="w-88 flex flex-col border-r border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div data-tauri-drag-region className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center gap-1.5 h-8" aria-label="window-controls">
                <button
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
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <input
                type="text"
                placeholder={t('template_mgmt.search_placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 px-1.5 py-0.5 text-xs border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleCreate}
                className="p-0.5 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors flex-shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-1.5">
            {filteredTemplates.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400 px-3">
                <Copy className="w-8 h-8 mb-2 text-gray-300 dark:text-gray-600" />
                <p className="text-sm text-center">
                  {searchQuery ? t('template_mgmt.no_templates') : t('template_mgmt.no_templates')}
                </p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {filteredTemplates.map((template) => (
                  <div
                    key={template.id}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${
                      selectedTemplateId === template.id
                        ? 'bg-blue-100 dark:bg-blue-900/30'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                    onClick={() => setSelectedTemplateId(template.id)}
                  >
                    <div className="flex-1 min-w-0">
                      {editingId === template.id ? (
                        <input
                          ref={editInputRef}
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={handleKeyDown}
                          onBlur={handleSaveEdit}
                          className="w-full px-1 py-0.5 text-sm border border-blue-500 rounded focus:outline-none dark:bg-gray-700 dark:text-gray-100"
                        />
                      ) : (
                        <div
                          className="text-sm text-gray-900 dark:text-gray-100 truncate"
                          onDoubleClick={() => handleStartEdit(template.id, template.name)}
                        >
                          {template.name}
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {template.usageCount} {t('template_mgmt.use_count').toLowerCase()}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(template.id)
                      }}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right panel: Template details */}
        <div className="flex-1 bg-gray-50 dark:bg-gray-900 flex flex-col">
          {selectedTemplate ? (
            <div className="flex-1 overflow-auto p-4">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('template_mgmt.template_name')}
                  </h3>
                  <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">{selectedTemplate.name}</div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      {t('template_mgmt.created_at')}
                    </h4>
                    <div className="text-sm text-gray-700 dark:text-gray-300">
                      {formatDate(selectedTemplate.createdAt)}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      {t('template_mgmt.updated_at')}
                    </h4>
                    <div className="text-sm text-gray-700 dark:text-gray-300">
                      {formatDate(selectedTemplate.updatedAt)}
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    {t('template_mgmt.use_count')}
                  </h4>
                  <div className="text-sm text-gray-700 dark:text-gray-300">{selectedTemplate.usageCount}</div>
                </div>

                {selectedTemplate.title && (
                  <div>
                    <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('tasks.title')}</h4>
                    <div className="text-sm text-gray-700 dark:text-gray-300">{selectedTemplate.title}</div>
                  </div>
                )}

                {selectedTemplate.description && (
                  <div>
                    <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      {t('tasks.description')}
                    </h4>
                    <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {selectedTemplate.description}
                    </div>
                  </div>
                )}

                {selectedTemplate.steps && (
                  <div>
                    <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      {t('tasks.steps.title')}
                    </h4>
                    <div className="text-sm text-gray-700 dark:text-gray-300">
                      {JSON.parse(selectedTemplate.steps).length} {t('tasks.steps.title').toLowerCase()}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
              <div className="text-center">
                <Copy className="w-12 h-12 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                <p className="text-sm">{t('template_mgmt.no_templates')}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </OverlayWebviewWindow>
  )
}
