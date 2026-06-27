import { useState, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { DocumentDuplicateIcon } from '@heroicons/react/24/outline'
import { useTaskTemplates } from '@/queries/useTaskQueries'
import type { TaskTemplate } from '@/types'

interface TemplatePickerOverlayProps {
  onSelect: (template: TaskTemplate) => void
  onClose: () => void
}

export default function TemplatePickerOverlay({ onSelect, onClose }: TemplatePickerOverlayProps) {
  const { t } = useTranslation('common')
  const { data: templates = [], isLoading } = useTaskTemplates()
  const [searchQuery, setSearchQuery] = useState('')

  const filteredTemplates = useMemo(() => {
    if (!searchQuery) return templates
    const q = searchQuery.toLowerCase()
    return templates.filter((tmpl) => tmpl.name.toLowerCase().includes(q))
  }, [templates, searchQuery])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4">
          <div className="text-sm text-gray-500 dark:text-gray-400">{t('common.loading')}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 w-80 max-h-96 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
          <input
            type="text"
            placeholder={t('templates.search_placeholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
        </div>
        <div className="flex-1 overflow-auto p-1.5">
          {filteredTemplates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-gray-500 dark:text-gray-400">
              <DocumentDuplicateIcon className="w-8 h-8 mb-2 text-gray-300 dark:text-gray-600" />
              <p className="text-sm">{t('templates.no_templates')}</p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {filteredTemplates.map((template) => (
                <button
                  key={template.id}
                  className="w-full px-3 py-2 text-left rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  onClick={() => onSelect(template)}
                >
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {template.name}
                  </div>
                  {template.title && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                      {template.title}
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {template.usageCount} {t('templates.usage_count').toLowerCase()}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
