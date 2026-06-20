import { useState, useRef, useEffect, useMemo } from 'react';
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import type { Tag } from '@/types/tag';

interface TagComboboxProps {
  allTags: Tag[];
  selectedIds: string[];
  onToggle: (tagId: string) => void;
  onCreateTag: (name: string) => void;
}

export default function TagCombobox({
  allTags,
  selectedIds,
  onToggle,
  onCreateTag,
}: TagComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return allTags;
    return allTags.filter((tag) => tag.name.toLowerCase().includes(q));
  }, [allTags, query]);

  const exactMatch = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return false;
    return allTags.some((tag) => tag.name.toLowerCase() === q);
  }, [allTags, query]);

  const selectedTags = useMemo(
    () => allTags.filter((tag) => selectedIds.includes(tag.id)),
    [allTags, selectedIds],
  );

  const handleCreateTag = () => {
    const name = query.trim();
    if (name && !exactMatch) {
      onCreateTag(name);
      setQuery('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && query.trim() && !exactMatch) {
      e.preventDefault();
      handleCreateTag();
    } else if (e.key === 'Escape') {
      setOpen(false);
      setQuery('');
    }
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Inline: selected chips + input */}
      <div className="flex flex-wrap items-center gap-1">
        {selectedTags.map((tag) => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-0.5 pl-1.5 pr-0.5 py-0.5 rounded-full text-sm"
            style={{ backgroundColor: tag.color + '20', color: tag.color }}
          >
            {tag.emoji && <span>{tag.emoji}</span>}
            {tag.name}
            <button
              type="button"
              onClick={() => onToggle(tag.id)}
              className="opacity-0 hover:opacity-70 transition-opacity p-0.5"
            >
              <XMarkIcon className="w-2.5 h-2.5" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="+"
          className="text-xs text-gray-900 dark:text-gray-100 bg-transparent outline-none placeholder-gray-400 dark:placeholder-gray-500 w-[3ch] min-w-[3ch] flex-shrink-0"
        />
      </div>

      {/* Dropdown */}
      {open && (
        <div role="listbox" className="absolute z-50 mt-1 left-0 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 max-h-60 overflow-auto min-w-[160px]">
          {filtered.length === 0 && !query.trim() && (
            <div className="px-3 py-2 text-xs text-gray-400 dark:text-gray-500">无标签</div>
          )}

          {filtered.map((tag) => {
            const isSelected = selectedIds.includes(tag.id);
            return (
              <button
                key={tag.id}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); onToggle(tag.id); setQuery(''); setOpen(false); }}
                className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left transition-colors ${
                  isSelected
                    ? 'bg-purple-50 dark:bg-purple-900/20'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: tag.color }}
                />
                {tag.emoji && <span className="flex-shrink-0">{tag.emoji}</span>}
                <span className={`truncate ${isSelected ? 'text-purple-700 dark:text-purple-300 font-medium' : 'text-gray-700 dark:text-gray-300'}`}>
                  {tag.name}
                </span>
                {isSelected && <span className="ml-auto text-purple-500">✓</span>}
              </button>
            );
          })}

          {query.trim() && !exactMatch && (
            <button
              type="button"
              onClick={handleCreateTag}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors border-t border-gray-100 dark:border-gray-700 mt-1"
            >
              <PlusIcon className="w-3.5 h-3.5 flex-shrink-0" />
              <span>创建 "{query.trim()}"</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
