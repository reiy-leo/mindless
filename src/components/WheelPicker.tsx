import { useCallback, useEffect, useRef, useState } from 'react'

interface WheelPickerOption {
  label: string
  value: number
}

interface WheelPickerProps {
  className?: string
  itemHeight?: number
  onChange: (value: number) => void
  options: WheelPickerOption[]
  value: number
  visibleCount?: number
}

export default function WheelPicker({
  options,
  value,
  onChange,
  className = '',
  itemHeight = 36,
  visibleCount = 5,
}: WheelPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [startY, setStartY] = useState(0)
  const [scrollTop, setScrollTop] = useState(0)
  const animationFrameRef = useRef<number>()
  const isProgrammaticScroll = useRef(false)
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout>>()

  const selectedIndex = options.findIndex((opt) => opt.value === value)
  const containerHeight = itemHeight * visibleCount
  const paddingHeight = (containerHeight - itemHeight) / 2

  const scrollToIndex = useCallback(
    (index: number) => {
      if (containerRef.current) {
        isProgrammaticScroll.current = true
        if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current)
        const targetScrollTop = index * itemHeight
        containerRef.current.scrollTo({
          behavior: 'smooth',
          top: targetScrollTop,
        })
        scrollTimeoutRef.current = setTimeout(() => {
          isProgrammaticScroll.current = false
        }, 500)
      }
    },
    [itemHeight],
  )

  useEffect(() => {
    if (selectedIndex >= 0) {
      scrollToIndex(selectedIndex)
    }
  }, [selectedIndex, scrollToIndex])

  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      const newScrollTop = containerRef.current.scrollTop
      setScrollTop(newScrollTop)

      if (isProgrammaticScroll.current) return

      const newIndex = Math.round(newScrollTop / itemHeight)
      if (newIndex >= 0 && newIndex < options.length && options[newIndex].value !== value) {
        onChange(options[newIndex].value)
      }
    }
  }, [itemHeight, options, value, onChange])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true)
    setStartY(e.clientY)
    setScrollTop(containerRef.current?.scrollTop || 0)
  }, [])

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }

      animationFrameRef.current = requestAnimationFrame(() => {
        const deltaY = startY - e.clientY
        containerRef.current!.scrollTop = scrollTop + deltaY
      })
    },
    [isDragging, startY, scrollTop],
  )

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
  }, [])

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  return (
    <div className={`relative overflow-hidden scrollbar-thin ${className}`} style={{ height: containerHeight }}>
      {/* Gradient overlay top */}
      <div
        className="absolute top-0 left-0 right-0 z-10 pointer-events-none bg-linear-to-b from-white to-transparent dark:from-theme-800"
        style={{
          height: paddingHeight,
        }}
      />

      {/* Gradient overlay bottom */}
      <div
        className="absolute bottom-0 left-0 right-0 z-10 pointer-events-none bg-linear-to-t from-white to-transparent dark:from-theme-800"
        style={{
          height: paddingHeight,
        }}
      />

      {/* Selection indicator */}
      <div
        className="absolute left-0 right-0 z-10 pointer-events-none border-t border-b border-gray-200 dark:border-gray-600"
        style={{
          height: itemHeight,
          top: paddingHeight,
        }}
      />

      {/* Scrollable container */}
      <div
        ref={containerRef}
        className="h-full overflow-y-auto scrollbar-hide"
        onScroll={handleScroll}
        onMouseDown={handleMouseDown}
        style={{ scrollSnapType: 'y mandatory' }}
      >
        {/* Top padding */}
        <div style={{ height: paddingHeight }} />

        {options.map((option) => {
          const isSelected = option.value === value
          return (
            <div
              key={option.value}
              className={`flex items-center justify-center transition-colors cursor-pointer select-none ${
                isSelected ? 'font-semibold' : 'text-gray-400 dark:text-gray-500'
              }`}
              style={{
                height: itemHeight,
                scrollSnapAlign: 'center',
              }}
              onMouseDown={() => onChange(option.value)}
            >
              {option.label}
            </div>
          )
        })}

        {/* Bottom padding */}
        <div style={{ height: paddingHeight }} />
      </div>
    </div>
  )
}
