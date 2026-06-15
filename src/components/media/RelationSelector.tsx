import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useMediaItems } from '@/queries/useMediaQueries';
import type { MediaItem } from '@/types/media';

interface RelationSelectorProps {
  value: string[];
  onChange: (value: string[]) => void;
  currentItemId?: string;
}

export default function RelationSelector({ value, onChange, currentItemId }: RelationSelectorProps) {
  const { t } = useTranslation('common');
  const [search, setSearch] = useState('');
  const { data: items = [] } = useMediaItems({ search: search || undefined });

  const filteredItems = items.filter(
    (item) => item.id !== currentItemId && !value.includes(item.id)
  );

  const handleAdd = (item: MediaItem) => {
    onChange([...value, item.id]);
    setSearch('');
  };

  const handleRemove = (id: string) => {
    onChange(value.filter((v) => v !== id));
  };

  const selectedItems = items.filter((item) => value.includes(item.id));

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {t('media.fields.relations')}
      </label>

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={t('media.placeholder.search')}
        className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900"
      />

      {search && filteredItems.length > 0 && (
        <div className="max-h-40 overflow-auto border border-gray-200 dark:border-gray-700 rounded">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
              onClick={() => handleAdd(item)}
            >
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {item.title}
              </span>
              {item.year && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  ({item.year})
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="space-y-1">
        {selectedItems.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-2 px-2 py-1.5 bg-gray-50 dark:bg-gray-800 rounded"
          >
            <span className="flex-1 text-sm text-gray-700 dark:text-gray-300">
              {item.title}
            </span>
            {item.year && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                ({item.year})
              </span>
            )}
            <button
              type="button"
              onClick={() => handleRemove(item.id)}
              className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              <XMarkIcon className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
