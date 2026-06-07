import { useState, useRef, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import type { Tag } from '@/types/tag';

interface TagComboboxProps {
  /** All available tags */
  allTags: Tag[];
  /** Currently selected tag IDs */
  selectedIds: string[];
  /** Called when tag selection changes (toggle or create) */
  onToggle: (tagId: string) => void;
  /** Called to create a new tag and auto-assign it */
  onCreateTag: (name: string) => void;
}

export default function TagCombobox({
  allTags,
  selectedIds,
  onToggle,
  onCreateTag,
}: TagComboboxProps) {
  const { t } = useTranslation('common');
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
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

  // Filter tags by query
  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return allTags;
    return allTags.filter((tag) => tag.name.toLowerCase().includes(q));
  }, [allTags, query]);

  // Check if query matches any existing tag exactly
  const exactMatch = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return false;
    return allTags.some((tag) => tag.name.toLowerCase() === q);
  }, [allTags, query]);

  // Currently selected tag objects
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
      {/* Selected tags chips */}
      <div className="flex flex-wrap gap-1.5 mb-1.5">
        {selectedTags.map((tag) => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
            style={{ backgroundColor: tag.color + '20', color: tag.color }}
          >
            {tag.emoji && <span>{tag.emoji}</span>}
            {tag.name}
            <button
              type="button"
              onClick={() => onToggle(tag.id)}
              className="ml-0.5 hover:opacity-70 transition-opacity"
            >
              <XMarkIcon className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>

      {/* Input trigger */}
      <div
        aria-expanded={open}
        className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-lg focus-within:ring-2 focus-within:ring-purple-500 transition-colors cursor-text"
        onClick={() => { inputRef.current?.focus(); setOpen(true); }}
      >
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={selectedTags.length === 0 ? t('tags.search_or_create') : t('tags.add_more')}
          className="flex-1 bg-transparent text-sm text-gray-900 dark:text-gray-100 outline-none placeholder-gray-400 dark:placeholder-gray-500 min-w-[80px]"
        />
      </div>

      {/* Dropdown */}
      {open && (
        <div role="listbox" className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 max-h-60 overflow-auto">
          {filtered.length === 0 && !query.trim() && (
            <div className="px-3 py-2 text-xs text-gray-400 dark:text-gray-500">
              {t('tags.no_tags')}
            </div>
          )}

          {filtered.map((tag) => {
            const isSelected = selectedIds.includes(tag.id);
            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => { onToggle(tag.id); setQuery(''); }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors ${
                  isSelected
                    ? 'bg-purple-50 dark:bg-purple-900/20'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: tag.color }}
                />
                {tag.emoji && <span className="flex-shrink-0">{tag.emoji}</span>}
                <span className={`truncate ${isSelected ? 'text-purple-700 dark:text-purple-300 font-medium' : 'text-gray-700 dark:text-gray-300'}`}>
                  {tag.name}
                </span>
                {isSelected && (
                  <span className="ml-auto text-purple-500 text-xs">✓</span>
                )}
              </button>
            );
          })}

          {/* Create new tag option */}
          {query.trim() && !exactMatch && (
            <button
              type="button"
              onClick={handleCreateTag}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors border-t border-gray-100 dark:border-gray-700 mt-1"
            >
              <PlusIcon className="w-4 h-4 flex-shrink-0" />
              <span>{t('tags.create_new', { name: query.trim() })}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
