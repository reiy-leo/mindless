import { ChevronDown } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

export interface SelectOption {
  color?: string
  disabled?: boolean
  icon?: string
  label: string
  value: string
}

interface SelectProps {
  className?: string
  disabled?: boolean
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  triggerClassName?: string
  value: string
}

export default function Select({
  value,
  options,
  onChange,
  placeholder = '',
  className = '',
  triggerClassName = '',
  disabled = false,
}: SelectProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)

  const selectedOption = useMemo(() => options.find((o) => o.value === value), [options, value])

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Reset highlight when opening
  useEffect(() => {
    if (open) {
      const idx = options.findIndex((o) => o.value === value)
      setHighlightedIndex(idx >= 0 ? idx : 0)
    }
  }, [open, options, value])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault()
        setOpen(true)
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex((i) => {
          let next = i + 1
          while (next < options.length && options[next].disabled) next++
          return next < options.length ? next : i
        })
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex((i) => {
          let prev = i - 1
          while (prev >= 0 && options[prev].disabled) prev--
          return prev >= 0 ? prev : i
        })
        break
      case 'Enter':
        e.preventDefault()
        if (highlightedIndex >= 0 && !options[highlightedIndex].disabled) {
          onChange(options[highlightedIndex].value)
          setOpen(false)
        }
        break
      case 'Escape':
        e.preventDefault()
        setOpen(false)
        break
    }
  }

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={() => !disabled && setOpen(!open)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={`w-full flex items-center justify-between gap-2 px-4 py-2 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${triggerClassName}`}
      >
        <span className="flex items-center gap-2 truncate">
          {selectedOption ? (
            <>
              {selectedOption.icon && <span className="shrink-0">{selectedOption.icon}</span>}
              {selectedOption.color && (
                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: selectedOption.color }} />
              )}
              <span className="truncate">{selectedOption.label}</span>
            </>
          ) : (
            <span className="text-gray-400 dark:text-gray-500">{placeholder}</span>
          )}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0 transition-transform ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute z-50 mt-1 w-full min-w-[160px] bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 max-h-60 overflow-auto"
        >
          {options.map((option, idx) => (
            <button
              key={option.value}
              type="button"
              role="option"
              onClick={() => {
                if (!option.disabled) {
                  onChange(option.value)
                  setOpen(false)
                }
              }}
              onMouseEnter={() => setHighlightedIndex(idx)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors ${
                option.disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
              } ${
                idx === highlightedIndex && !option.disabled
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              } ${option.value === value ? 'font-medium' : ''}`}
            >
              {option.icon && <span className="shrink-0">{option.icon}</span>}
              {option.color && (
                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: option.color }} />
              )}
              <span className="truncate">{option.label}</span>
              {option.value === value && <span className="ml-auto text-blue-500 text-xs">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
