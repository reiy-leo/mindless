import { useState, useRef, useEffect } from 'react';
import { ChevronDown, X } from 'lucide-react';

export interface MultiSelectOption {
  id: string;
  label: string;
  color?: string;
  emoji?: string;
}

interface Props {
  options: MultiSelectOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  emptyHint?: string;
}

export default function MultiSelectDropdown({ options, selected, onChange, placeholder, emptyHint }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  };

  const remove = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selected.filter((x) => x !== id));
  };

  const selectedOptions = options.filter((o) => selected.includes(o.id));

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full min-h-[34px] px-2 py-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-lg text-sm text-left focus:outline-none focus:ring-2 focus:ring-blue-500 flex flex-wrap gap-1 items-center"
      >
        {selectedOptions.length === 0 ? (
          <span className="text-gray-400 dark:text-gray-500">{placeholder || '...'}</span>
        ) : (
          selectedOptions.map((opt) => (
            <span
              key={opt.id}
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-200"
            >
              {opt.color && (
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: opt.color }} />
              )}
              {opt.emoji && <span>{opt.emoji}</span>}
              <span className="truncate max-w-[100px]">{opt.label}</span>
              <span
                onClick={(e) => remove(opt.id, e)}
                className="ml-0.5 hover:text-red-500 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </span>
            </span>
          ))
        )}
        <ChevronDown className={`w-4 h-4 text-gray-400 ml-auto flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-48 overflow-auto">
          {options.length === 0 ? (
            <div className="px-3 py-2 text-xs text-gray-400 dark:text-gray-500">{emptyHint || '...'}</div>
          ) : (
            options.map((opt) => {
              const isSelected = selected.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => toggle(opt.id)}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                    isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                >
                  <span className={`w-4 h-4 flex items-center justify-center rounded border text-xs ${
                    isSelected
                      ? 'bg-blue-500 border-blue-500 text-white'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}>
                    {isSelected && '✓'}
                  </span>
                  {opt.color && (
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: opt.color }} />
                  )}
                  {opt.emoji && <span>{opt.emoji}</span>}
                  <span className="truncate text-gray-700 dark:text-gray-300">{opt.label}</span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
