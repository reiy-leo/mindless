import { useState } from 'react'
import { useTranslation } from 'react-i18next'

interface LinkedItem {
  date?: string
  id: string
  time?: string
  title: string
}

interface LinkedItemSelectorProps {
  items: LinkedItem[]
  onChange: (value: string[]) => void
  placeholder?: string
  value: string[]
}

export default function LinkedItemSelector({ value, onChange, items, placeholder }: LinkedItemSelectorProps) {
  const { t } = useTranslation('common')
  const [search, setSearch] = useState('')

  const filteredItems = items.filter(
    (item) => !value.includes(item.id) && item.title.toLowerCase().includes(search.toLowerCase()),
  )

  const handleAdd = (item: LinkedItem) => {
    onChange([...value, item.id])
    setSearch('')
  }

  const formatDate = (date?: string, time?: string) => {
    if (!date) return null
    const d = date.slice(5)
    return time ? `${d} ${time}` : d
  }

  return (
    <div className="relative min-w-0">
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={placeholder || t('media.placeholder.search')}
        className="w-full px-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900"
      />

      {search && filteredItems.length > 0 && (
        <div className="absolute z-50 mt-1 w-full max-h-40 overflow-auto border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800 shadow-lg">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
              onMouseDown={() => handleAdd(item)}
            >
              <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{item.title}</span>
              {item.date && (
                <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0 ml-2">
                  {formatDate(item.date, item.time)}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
