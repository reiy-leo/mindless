import type { PriorityOption } from '@/lib/priorityOptions'
import type { Priority } from '@/types/task'

interface OxygenNotIncludedPriorityPickerProps {
  onSelect: (priority: Priority) => void
  options: PriorityOption[]
  selectedPriority?: Priority
}

const PRIORITY_ROWS = [[0], [1, 2, 3], [4, 5, 6], [7, 8, 9], [10]] as const

export default function OxygenNotIncludedPriorityPicker({
  onSelect,
  options,
  selectedPriority,
}: OxygenNotIncludedPriorityPickerProps) {
  const optionMap = new Map(options.map((option) => [option.value, option]))

  return (
    <div className="w-40 p-1.5 space-y-1">
      {PRIORITY_ROWS.map((row) => (
        <div className={`grid gap-1 ${row.length === 1 ? 'grid-cols-1' : 'grid-cols-3'}`} key={row.join('-')}>
          {row.map((value) => {
            const option = optionMap.get(value)
            if (!option) return null
            const isSelected = selectedPriority === value
            const label = option.label

            return (
              <button
                className={`min-w-0 rounded px-2 py-1.5 text-xs hover:animate-pulse ${option.color.bg} ${
                  isSelected ? 'border border-theme-800 dark:border-theme-200' : ''
                }`}
                key={value}
                onClick={() => onSelect(value)}
                type="button"
              >
                <span className="inline-flex items-center justify-center gap-1.5">
                  <span className={`${option.color.fg}`}>{label}</span>
                </span>
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}
