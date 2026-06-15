import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PlusIcon, Squares2X2Icon, ListBulletIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useMediaItems } from '@/queries/useMediaQueries';
import MediaCard from './MediaCard';
import MediaListItem from './MediaListItem';
import MediaItemForm from './MediaItemForm';
import type { MediaItem } from '@/types/media';

type SmartGroupId = 'all' | 'favorites' | 'normal' | 'watched' | 'archived';

interface MediaContentProps {
  selectedSmartGroup: SmartGroupId | null;
  selectedGroupId: string | null;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
}

export default function MediaContent({
  selectedSmartGroup,
  selectedGroupId,
  viewMode,
  onViewModeChange,
}: MediaContentProps) {
  const { t } = useTranslation('common');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<MediaItem | null>(null);

  // Build filters
  const filters: { status?: string; groupId?: string; search?: string } = {};
  if (selectedSmartGroup && selectedSmartGroup !== 'all') {
    filters.status = selectedSmartGroup;
  }
  if (selectedGroupId) {
    filters.groupId = selectedGroupId;
  }
  if (search) {
    filters.search = search;
  }

  const { data: items = [], isLoading } = useMediaItems(filters);

  const handleItemClick = (item: MediaItem) => {
    setEditingItem(item);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingItem(null);
  };

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-3 p-3 border-b border-gray-200 dark:border-gray-700">
        {/* Search */}
        <div className="flex-1 relative">
          <MagnifyingGlassIcon className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('media.placeholder.search')}
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900"
          />
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded p-0.5">
          <button
            onClick={() => onViewModeChange('grid')}
            className={`p-1.5 rounded ${
              viewMode === 'grid'
                ? 'bg-white dark:bg-gray-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
            title="Grid"
          >
            <Squares2X2Icon className="w-4 h-4" />
          </button>
          <button
            onClick={() => onViewModeChange('list')}
            className={`p-1.5 rounded ${
              viewMode === 'list'
                ? 'bg-white dark:bg-gray-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
            title="List"
          >
            <ListBulletIcon className="w-4 h-4" />
          </button>
        </div>

        {/* New Button */}
        <button
          onClick={() => {
            setEditingItem(null);
            setShowForm(true);
          }}
          className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-blue-500 rounded hover:bg-blue-600"
        >
          <PlusIcon className="w-4 h-4" />
          {t('media.actions.new')}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-3">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            {t('media.message.loading')}
          </div>
        ) : items.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            {t('media.message.no_items')}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {items.map((item) => (
              <MediaCard key={item.id} item={item} onClick={handleItemClick} />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <MediaListItem key={item.id} item={item} onClick={handleItemClick} />
            ))}
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <MediaItemForm
          item={editingItem}
          onClose={handleCloseForm}
        />
      )}
    </div>
  );
}
