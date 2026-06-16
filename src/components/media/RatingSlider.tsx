import { useRef, useState, useEffect, useCallback } from 'react';

interface RatingSliderProps {
  value: string;
  onChange: (value: string) => void;
  max?: number;
  step?: number;
}

export default function RatingSlider({ value, onChange, max = 10, step = 0.25 }: RatingSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const currentValue = parseFloat(value || '0');

  const calculateValue = useCallback((clientX: number) => {
    if (!trackRef.current) return 0;
    const rect = trackRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    const rawValue = percentage * max;
    const roundedValue = Math.round(rawValue / step) * step;
    return Math.max(0, Math.min(max, roundedValue));
  }, [max, step]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    const newValue = calculateValue(e.clientX);
    onChange(newValue.toString());
  }, [calculateValue, onChange]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const newValue = calculateValue(e.clientX);
      onChange(newValue.toString());
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, calculateValue, onChange]);

  const fillPercentage = (currentValue / max) * 100;

  return (
    <div className="flex-1">
      <div className="relative">
        {/* Track */}
        <div
          ref={trackRef}
          className="relative h-6 bg-gray-200 dark:bg-gray-700 rounded-l-md cursor-pointer"
          onMouseDown={handleMouseDown}
        >
          {/* Filled portion - left rounded, right straight */}
          <div
            className="absolute top-0 left-0 h-full bg-blue-500 rounded-l-md"
            style={{ width: `${fillPercentage}%` }}
          />

          {/* Ticks */}
          {Array.from({ length: Math.floor(max / step) + 1 }, (_, i) => {
            const tickValue = i * step;
            const isMajor = tickValue % 1 === 0;
            const isFilled = tickValue <= currentValue;
            let bgColor;
            if (isFilled) {
              bgColor = isMajor ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.25)';
            } else {
              bgColor = isMajor ? 'rgb(156,163,175)' : 'rgb(209,213,219)';
            }
            return (
              <div
                key={i}
                className={`absolute ${isMajor ? 'h-full' : 'h-3'}`}
                style={{
                  left: `${(tickValue / max) * 100}%`,
                  width: '1px',
                  top: isMajor ? 0 : '25%',
                  backgroundColor: bgColor,
                }}
              />
            );
          })}

          {/* Thumb - rounded rectangle */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-4 h-8 bg-white dark:bg-gray-200 rounded-md shadow-md border border-gray-300 dark:border-gray-500 pointer-events-none"
            style={{ left: `calc(${fillPercentage}% - 8px)` }}
          />
        </div>

        {/* Labels */}
        <div className="relative mt-1 h-4">
          {[1, 5, 9].map((i) => (
            <span
              key={i}
              className="absolute text-[10px] text-gray-400 dark:text-gray-500 -translate-x-1/2"
              style={{ left: `${(i / max) * 100}%` }}
            >
              {i}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
