import { useRef, useEffect, useState, useCallback } from 'react';

interface WheelPickerOption {
  value: number;
  label: string;
}

interface WheelPickerProps {
  options: WheelPickerOption[];
  value: number;
  onChange: (value: number) => void;
  className?: string;
  itemHeight?: number;
  visibleCount?: number;
}

export default function WheelPicker({
  options,
  value,
  onChange,
  className = '',
  itemHeight = 36,
  visibleCount = 5,
}: WheelPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);
  const animationFrameRef = useRef<number>();
  const isProgrammaticScroll = useRef(false);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const selectedIndex = options.findIndex((opt) => opt.value === value);
  const containerHeight = itemHeight * visibleCount;
  const paddingHeight = (containerHeight - itemHeight) / 2;

  const scrollToIndex = useCallback((index: number) => {
    if (containerRef.current) {
      isProgrammaticScroll.current = true;
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      const targetScrollTop = index * itemHeight;
      containerRef.current.scrollTo({
        top: targetScrollTop,
        behavior: 'smooth',
      });
      scrollTimeoutRef.current = setTimeout(() => {
        isProgrammaticScroll.current = false;
      }, 500);
    }
  }, [itemHeight]);

  useEffect(() => {
    if (selectedIndex >= 0) {
      scrollToIndex(selectedIndex);
    }
  }, [selectedIndex, scrollToIndex]);

  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      const newScrollTop = containerRef.current.scrollTop;
      setScrollTop(newScrollTop);

      if (isProgrammaticScroll.current) return;

      const newIndex = Math.round(newScrollTop / itemHeight);
      if (newIndex >= 0 && newIndex < options.length && options[newIndex].value !== value) {
        onChange(options[newIndex].value);
      }
    }
  }, [itemHeight, options, value, onChange]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    setStartY(e.clientY);
    setScrollTop(containerRef.current?.scrollTop || 0);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    animationFrameRef.current = requestAnimationFrame(() => {
      const deltaY = startY - e.clientY;
      containerRef.current!.scrollTop = scrollTop + deltaY;
    });
  }, [isDragging, startY, scrollTop]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{ height: containerHeight }}
    >
      {/* Gradient overlay top */}
      <div
        className="absolute top-0 left-0 right-0 z-10 pointer-events-none"
        style={{
          height: paddingHeight,
          background: 'linear-gradient(to bottom, rgba(255,255,255,1) 0%, rgba(255,255,255,0) 100%)',
        }}
      />

      {/* Gradient overlay bottom */}
      <div
        className="absolute bottom-0 left-0 right-0 z-10 pointer-events-none"
        style={{
          height: paddingHeight,
          background: 'linear-gradient(to top, rgba(255,255,255,1) 0%, rgba(255,255,255,0) 100%)',
        }}
      />

      {/* Selection indicator */}
      <div
        className="absolute left-0 right-0 z-10 pointer-events-none border-t border-b border-gray-200 dark:border-gray-600"
        style={{
          top: paddingHeight,
          height: itemHeight,
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
          const isSelected = option.value === value;
          return (
            <div
              key={option.value}
              className={`flex items-center justify-center transition-colors cursor-pointer select-none ${
                isSelected
                  ? 'text-gray-900 dark:text-gray-100 font-semibold'
                  : 'text-gray-400 dark:text-gray-500'
              }`}
              style={{
                height: itemHeight,
                scrollSnapAlign: 'center',
              }}
              onClick={() => onChange(option.value)}
            >
              {option.label}
            </div>
          );
        })}

        {/* Bottom padding */}
        <div style={{ height: paddingHeight }} />
      </div>
    </div>
  );
}
