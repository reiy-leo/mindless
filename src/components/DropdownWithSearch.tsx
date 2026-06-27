import { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown } from 'lucide-react';

interface DropdownWithSearchProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  searchPlaceholder?: string;
  clearLabel?: string;
  className?: string;
  renderOption?: (option: string) => React.ReactNode;
  renderSelected?: (value: string) => React.ReactNode;
  filterFn?: (option: string, search: string) => boolean;
}

export default function DropdownWithSearch({
  value,
  onChange,
  options,
  placeholder = '-',
  searchPlaceholder = '搜索...',
  clearLabel,
  className = '',
  renderOption,
  renderSelected,
  filterFn,
}: DropdownWithSearchProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!search) return options;
    if (filterFn) return options.filter((o) => filterFn(o, search));
    return options.filter((o) => o.toLowerCase().includes(search.toLowerCase()));
  }, [options, search, filterFn]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (option: string) => {
    onChange(option);
    setOpen(false);
    setSearch('');
  };

  const handleClear = () => {
    onChange('');
    setOpen(false);
    setSearch('');
  };

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => {
          setOpen(!open);
          setSearch('');
        }}
        className="w-full flex items-center justify-between px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900"
      >
        <span className={value ? '' : 'text-gray-400 dark:text-gray-500'}>
          {value ? (renderSelected ? renderSelected(value) : value) : placeholder}
        </span>
        <ChevronDown className="w-4 h-4 text-gray-400" />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-hidden">
          <div className="p-2 border-b border-gray-200 dark:border-gray-700">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900"
              autoFocus
            />
          </div>
          <div className="overflow-auto max-h-48">
            {clearLabel && (
              <button
                type="button"
                onClick={handleClear}
                className={`w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                  !value ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {clearLabel}
              </button>
            )}
            {filtered.map((option) => {
              const selected = value === option;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => handleSelect(option)}
                  className={`w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                    selected
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {renderOption ? renderOption(option) : option}
                </button>
              );
            })}
            {filtered.length === 0 && !clearLabel && (
              <div className="px-3 py-2 text-sm text-gray-400 dark:text-gray-500">
                无匹配项
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
