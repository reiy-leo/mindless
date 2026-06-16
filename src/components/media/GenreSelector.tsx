import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDownIcon, XMarkIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useMediaGroupsWithCount } from '@/queries/useMediaQueries';

interface GenreSelectorProps {
  value: string[];
  onChange: (genreIds: string[]) => void;
}

export default function GenreSelector({ value, onChange }: GenreSelectorProps) {
  const { t } = useTranslation('common');
  const { data: genres = [] } = useMediaGroupsWithCount();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter genres based on search
  const filteredGenres = genres.filter((genre) =>
    genre.name.toLowerCase().includes(search.toLowerCase())
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = (genreId: string) => {
    if (value.includes(genreId)) {
      onChange(value.filter((id) => id !== genreId));
    } else {
      onChange([...value, genreId]);
    }
  };

  const handleRemove = (genreId: string) => {
    onChange(value.filter((id) => id !== genreId));
  };

  const selectedGenres = genres.filter((g) => value.includes(g.id));

  return (
    <div ref={containerRef} className="relative">
      {/* Selected genres */}
      <div
        className="flex flex-wrap gap-1 min-h-[32px] p-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        {selectedGenres.length === 0 ? (
          <span className="text-sm text-gray-400 dark:text-gray-500">
            {t('media.genre.placeholder')}
          </span>
        ) : (
          selectedGenres.map((genre) => (
            <span
              key={genre.id}
              className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full"
              style={{
                backgroundColor: genre.color + '20',
                color: genre.color,
                border: `1px solid ${genre.color}40`,
              }}
            >
              {genre.icon} {genre.name}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove(genre.id);
                }}
                className="hover:opacity-70"
              >
                <XMarkIcon className="w-3 h-3" />
              </button>
            </span>
          ))
        )}
        <ChevronDownIcon className="w-4 h-4 text-gray-400 ml-auto self-center" />
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-gray-200 dark:border-gray-700">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('media.genre.search')}
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900"
                autoFocus
              />
            </div>
          </div>

          {/* Genre list */}
          <div className="overflow-auto max-h-48">
            {filteredGenres.length === 0 ? (
              <div className="p-3 text-sm text-gray-500 dark:text-gray-400 text-center">
                {t('media.genre.noResults')}
              </div>
            ) : (
              filteredGenres.map((genre) => {
                const isSelected = value.includes(genre.id);
                return (
                  <button
                    key={genre.id}
                    type="button"
                    onClick={() => handleToggle(genre.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                      isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                    }`}
                  >
                    <span
                      className="w-5 h-5 flex items-center justify-center rounded"
                      style={{ backgroundColor: genre.color + '20', color: genre.color }}
                    >
                      {genre.icon}
                    </span>
                    <span className="flex-1 text-left">{genre.name}</span>
                    {isSelected && (
                      <span className="text-blue-500">✓</span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
