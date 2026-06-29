import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import WheelPicker from '@/components/WheelPicker'
import { useAppStore } from '@/stores/useAppStore'
import type { SortBy } from '@/types/task'

export function TaskSortControls({
  onChange,
}: {
  onChange?: (sortBy: string, sortOrder: 'asc' | 'desc') => void
} = {}) {
  const { t } = useTranslation('common')
  const { taskSortBy, taskSortOrder, setTaskSortBy, setTaskSortOrder } = useAppStore()
  const options = useMemo(() => {
    const fields: { label: string; value: SortBy }[] = [
      { label: t('tasks.sort.manual'), value: 'sortOrder' },
      { label: t('tasks.sort.due_date'), value: 'dueDate' },
      { label: t('tasks.sort.start_date'), value: 'startDate' },
      { label: t('tasks.sort.priority'), value: 'priority' },
      { label: t('tasks.sort.created_at'), value: 'createdAt' },
      { label: t('tasks.sort.completed_at'), value: 'completedAt' },
    ]
    const orders: { label: string; value: 'asc' | 'desc' }[] = [
      { label: t('tasks.sort.asc'), value: 'asc' },
      { label: t('tasks.sort.desc'), value: 'desc' },
    ]

    return fields.flatMap((field) =>
      orders.map((order) => ({
        label: `${field.label} · ${order.label}`,
        sortBy: field.value,
        sortOrder: order.value,
      })),
    )
  }, [t])
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.sortBy === taskSortBy && option.sortOrder === taskSortOrder),
  )

  return (
    <WheelPicker
      className="bg-white dark:bg-theme-800 text-xs text-theme-800 dark:text-theme-200"
      itemHeight={32}
      onChange={(index) => {
        const option = options[index]
        if (!option) return
        setTaskSortBy(option.sortBy)
        setTaskSortOrder(option.sortOrder)
        onChange?.(option.sortBy, option.sortOrder)
      }}
      options={options.map((option, index) => ({ label: option.label, value: index }))}
      value={selectedIndex}
      visibleCount={3}
    />
  )
}
