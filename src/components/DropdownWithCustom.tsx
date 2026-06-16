import { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

interface DropdownWithCustomProps {
  value: string;
  onChange: (value: string) => void;
  presets: string[];
  placeholder?: string;
  customPlaceholder?: string;
  openUpward?: boolean;
  className?: string;
}

export default function DropdownWithCustom({
  value,
  onChange,
  presets,
  placeholder = '选择标签',
  customPlaceholder = '自定义标签',
  openUpward = true,
  className = '',
}: DropdownWithCustomProps) {
  const [open, setOpen] = useState(false);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customText, setCustomText] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const isPreset = presets.includes(value);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        if (!isPreset && !customText) {
          setIsCustomMode(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isPreset, customText]);

  const handleSelect = (preset: string) => {
    onChange(preset);
    setCustomText('');
    setIsCustomMode(false);
    setOpen(false);
  };

  const handleCustomConfirm = () => {
    if (customText.trim()) {
      onChange(customText.trim());
      setOpen(false);
    }
  };

  const displayValue = isPreset ? value : (value || placeholder);
  const positionClass = openUpward ? 'bottom-full mb-1' : 'top-full mt-1';

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        <span className={value ? '' : 'text-gray-400 dark:text-gray-500'}>
          {displayValue}
        </span>
        <ChevronDownIcon className="w-3.5 h-3.5 text-gray-400" />
      </button>
      {open && (
        <div className={`absolute z-50 ${positionClass} w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg`}>
          {presets.map((preset) => {
            const selected = !isCustomMode && value === preset;
            return (
              <button
                key={preset}
                type="button"
                onClick={() => handleSelect(preset)}
                className={`w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                  selected
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                    : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                {preset}
                {selected && <span className="float-right text-blue-500">✓</span>}
              </button>
            );
          })}
          {isCustomMode ? (
            <div className="px-2 py-1.5 border-t border-gray-200 dark:border-gray-700">
              <input
                type="text"
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleCustomConfirm();
                  }
                }}
                placeholder={customPlaceholder}
                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                autoFocus
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setIsCustomMode(true);
              }}
              className="w-full text-left px-3 py-1.5 text-sm text-blue-500 hover:bg-gray-100 dark:hover:bg-gray-700 border-t border-gray-200 dark:border-gray-700"
            >
              自定义...
            </button>
          )}
        </div>
      )}
    </div>
  );
}
