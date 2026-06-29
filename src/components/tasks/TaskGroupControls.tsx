import { Clock, Flag, FolderTree, MinusCircle, type LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '@/stores/useAppStore'
import type { GroupBy } from '@/types/task'

export function TaskGroupControls({
  disableTaskGroup = false,
  onChange,
}: { disableTaskGroup?: boolean; onChange?: (groupBy: string) => void } = {}) {
  const { t } = useTranslation('common')
  const { taskGroupBy, setTaskGroupBy } = useAppStore()
  const options: { icon: LucideIcon; label: string; value: GroupBy }[] = [
    { icon: MinusCircle, label: t('tasks.group.none'), value: 'none' },
    { icon: Clock, label: t('tasks.group.time'), value: 'time' },
    { icon: Flag, label: t('tasks.group.priority'), value: 'priority' },
    ...(!disableTaskGroup ? [{ icon: FolderTree, label: t('tasks.group.list'), value: 'list' as const }] : []),
  ]

  return (
    <div aria-label={t('tasks.group.by')} className={`grid gap-1 ${options.length === 4 ? 'grid-cols-4' : 'grid-cols-3'}`}>
      {options.map((option) => {
        const Icon = option.icon
        const isActive = taskGroupBy === option.value
        return (
          <button
            className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded px-1.5 py-1.5 text-xs transition-colors ${
              isActive
                ? 'bg-theme-500 text-white'
                : 'bg-theme-100 text-theme-700 hover:bg-theme-200 dark:bg-theme-700 dark:text-theme-300 dark:hover:bg-theme-600'
            }`}
            key={option.value}
            onClick={() => {
              setTaskGroupBy(option.value)
              onChange?.(option.value)
            }}
            type="button"
          >
            <Icon className="h-4 w-4" />
            <span className="max-w-full truncate text-[10px] leading-none">{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}
