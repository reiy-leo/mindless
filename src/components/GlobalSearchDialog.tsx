import { Calendar, CheckCircle, Clock, Search, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { PRIORITY_COLORS } from '@/lib/constants'
import { formatDisplayDate } from '@/lib/formatUtils'
import { useCountdowns } from '@/queries/useCountdownQueries'
import { useHabits } from '@/queries/useHabitQueries'
import { useTasks } from '@/queries/useTaskQueries'
import { useAppStore } from '@/stores/useAppStore'
import { useViewStore } from '@/stores/useViewStore'
import type { Countdown } from '@/types/countdown'
import type { Habit } from '@/types/habit'
import type { Task } from '@/types/task'

type SearchResult =
  | { type: 'task'; item: Task }
  | { type: 'habit'; item: Habit }
  | { type: 'countdown'; item: Countdown }

export default function GlobalSearchDialog({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { t } = useTranslation('common')
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const dateFormat = useAppStore((s) => s.dateFormat)

  const { data: tasks = [] } = useTasks()
  const { data: habits = [] } = useHabits()
  const { data: countdowns = [] } = useCountdowns()
  const { setSelectedListId } = useViewStore()

  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  const results = useMemo<SearchResult[]>(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []

    const matchedTasks = tasks
      .filter((t) => t.title.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q))
      .slice(0, 10)
      .map((item): SearchResult => ({ item, type: 'task' }))

    const matchedHabits = habits
      .filter((h: Habit) => h.name.toLowerCase().includes(q) || h.description?.toLowerCase().includes(q))
      .slice(0, 5)
      .map((item: Habit): SearchResult => ({ item, type: 'habit' }))

    const matchedCountdowns = countdowns
      .filter((c: Countdown) => c.title.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q))
      .slice(0, 5)
      .map((item: Countdown): SearchResult => ({ item, type: 'countdown' }))

    return [...matchedTasks, ...matchedHabits, ...matchedCountdowns]
  }, [query, tasks, habits, countdowns])

  const handleSelect = (result: SearchResult) => {
    onClose()
    if (result.type === 'task') {
      setSelectedListId(null)
      navigate('/tasks')
    } else if (result.type === 'habit') {
      navigate('/habits')
    } else {
      navigate('/countdowns')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      <div className="absolute inset-0 bg-black/50" onMouseDown={onClose} />
      <div
        className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden"
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <Search className="w-5 h-5 text-gray-400 dark:text-gray-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('search.placeholder')}
            className="flex-1 bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none"
          />
          <button type="button" onClick={onClose} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-[50vh] overflow-auto">
          {query.trim() && results.length === 0 && (
            <div className="px-4 py-8 text-center text-gray-400 dark:text-gray-500 text-sm">
              {t('search.no_results')}
            </div>
          )}

          {query.trim() && results.length > 0 && (
            <div className="py-1">
              {results.map((result, _) => (
                <button
                  type="button"
                  key={`${result.type}-${result.item.id}`}
                  onClick={() => handleSelect(result)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
                >
                  {/* Icon */}
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0">
                    {result.type === 'task' ? (
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: PRIORITY_COLORS[result.item.priority] }}
                      />
                    ) : result.type === 'habit' ? (
                      <div
                        className="w-6 h-6 rounded-lg flex items-center justify-center text-xs"
                        style={{ backgroundColor: `${result.item.color}20` }}
                      >
                        {result.item.icon === 'star'
                          ? '⭐'
                          : result.item.icon === 'heart'
                            ? '❤️'
                            : result.item.icon === 'fire'
                              ? '🔥'
                              : '📌'}
                      </div>
                    ) : (
                      <div
                        className="w-6 h-6 rounded-lg flex items-center justify-center text-xs"
                        style={{ backgroundColor: `${result.item.color}20` }}
                      >
                        {result.item.icon === 'flag' ? '🚩' : result.item.icon === 'heart' ? '❤️' : '⭐'}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {result.type === 'task'
                        ? result.item.title
                        : result.type === 'habit'
                          ? result.item.name
                          : result.item.title}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
                      <span
                        className={`px-1.5 py-0.5 rounded-full ${
                          result.type === 'task'
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                            : result.type === 'habit'
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                              : 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                        }`}
                      >
                        {result.type === 'task'
                          ? t('search.type_task')
                          : result.type === 'habit'
                            ? t('search.type_habit')
                            : t('search.type_countdown')}
                      </span>
                      {result.type === 'task' && result.item.dueDate && (
                        <span className="flex items-center gap-0.5">
                          <Calendar className="w-3 h-3" />
                          {formatDisplayDate(result.item.dueDate, dateFormat, t)}
                        </span>
                      )}
                      {result.type === 'task' && result.item.isCompleted && (
                        <CheckCircle className="w-3 h-3 text-green-500" />
                      )}
                      {result.type === 'countdown' && (
                        <span className="flex items-center gap-0.5">
                          <Clock className="w-3 h-3" />
                          {result.item.targetDate}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {!query.trim() && (
            <div className="px-4 py-6 text-center text-gray-400 dark:text-gray-500 text-sm">{t('search.hint')}</div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500">
          <span>{t('search.esc_to_close')}</span>
        </div>
      </div>
    </div>
  )
}
