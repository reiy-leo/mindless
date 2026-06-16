import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { PlusIcon, Squares2X2Icon, ListBulletIcon, MagnifyingGlassIcon, StarIcon, PencilIcon, TrashIcon, ArrowPathIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { useMediaItems, useUpdateMediaItem, useDeleteMediaItem } from '@/queries/useMediaQueries';
import MediaCard from './MediaCard';
import MediaListItem from './MediaListItem';
import MediaItemForm from './MediaItemForm';
import MediaItemPreview from './MediaItemPreview';
import type { MediaItem, MediaStatus } from '@/types/media';

type SmartGroupId = 'all' | 'favorites' | 'unwatched' | 'planned' | 'normal' | 'watched' | 'archived';

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
  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; item: MediaItem } | null>(null);

  const updateItem = useUpdateMediaItem();
  const deleteItem = useDeleteMediaItem();

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
    setPreviewItem(item);
  };

  const handleClosePreview = () => {
    setPreviewItem(null);
  };

  const handleEditFromPreview = (item: MediaItem) => {
    setPreviewItem(null);
    setEditingItem(item);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingItem(null);
  };

  const handleContextMenu = useCallback((e: React.MouseEvent, item: MediaItem) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, item });
  }, []);

  const handleToggleFavorite = useCallback(async (item: MediaItem) => {
    const newStatus: MediaStatus = item.status === 'normal' ? 'watched' : 'normal';
    await updateItem.mutateAsync({ id: item.id, status: newStatus });
    setContextMenu(null);
  }, [updateItem]);

  const handleChangeStatus = useCallback(async (item: MediaItem, status: MediaStatus) => {
    await updateItem.mutateAsync({ id: item.id, status });
    setContextMenu(null);
  }, [updateItem]);

  const handleRewatch = useCallback(async (item: MediaItem) => {
    await updateItem.mutateAsync({ id: item.id, status: 'normal' });
    setContextMenu(null);
  }, [updateItem]);

  const handleDelete = useCallback(async (item: MediaItem) => {
    if (window.confirm(t('media.message.confirm_delete'))) {
      await deleteItem.mutateAsync(item.id);
    }
    setContextMenu(null);
  }, [deleteItem, t]);

  const handleEdit = useCallback((item: MediaItem) => {
    setEditingItem(item);
    setShowForm(true);
    setContextMenu(null);
  }, []);

  // Close context menu on outside click
  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [contextMenu]);

  const statusOptions: { value: MediaStatus; labelKey: string }[] = [
    { value: 'unwatched', labelKey: 'media.status.unwatched' },
    { value: 'planned', labelKey: 'media.status.planned' },
    { value: 'normal', labelKey: 'media.status.normal' },
    { value: 'watched', labelKey: 'media.status.watched' },
    { value: 'archived', labelKey: 'media.status.archived' },
  ];

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
              <MediaCard key={item.id} item={item} onClick={handleItemClick} onContextMenu={handleContextMenu} />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <MediaListItem key={item.id} item={item} onClick={handleItemClick} onContextMenu={handleContextMenu} />
            ))}
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-50" onClick={() => setContextMenu(null)} />
          <div
            className="fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 min-w-[160px]"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            {/* Favorite/Unfavorite */}
            <button
              className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              onClick={() => handleToggleFavorite(contextMenu.item)}
            >
              <StarIcon className="w-4 h-4" />
              {contextMenu.item.status === 'normal' ? t('media.status.watched') : t('media.status.normal')}
            </button>

            {/* Edit */}
            <button
              className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              onClick={() => handleEdit(contextMenu.item)}
            >
              <PencilIcon className="w-4 h-4" />
              {t('media.actions.edit')}
            </button>

            {/* Divider */}
            <div className="my-1 border-t border-gray-200 dark:border-gray-700" />

            {/* Status submenu */}
            <div className="px-3 py-1 text-xs text-gray-500 dark:text-gray-400">
              {t('media.fields.status')}
            </div>
            {statusOptions.map((option) => (
              <button
                key={option.value}
                className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                  contextMenu.item.status === option.value
                    ? 'text-blue-600 dark:text-blue-400 font-medium'
                    : 'text-gray-700 dark:text-gray-300'
                }`}
                onClick={() => handleChangeStatus(contextMenu.item, option.value)}
              >
                {contextMenu.item.status === option.value && <CheckCircleIcon className="w-4 h-4" />}
                <span className={contextMenu.item.status === option.value ? '' : 'ml-6'}>
                  {t(option.labelKey)}
                </span>
              </button>
            ))}

            {/* Rewatch if watched */}
            {contextMenu.item.status === 'watched' && (
              <>
                <div className="my-1 border-t border-gray-200 dark:border-gray-700" />
                <button
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => handleRewatch(contextMenu.item)}
                >
                  <ArrowPathIcon className="w-4 h-4" />
                  {t('media.actions.rewatch')}
                </button>
              </>
            )}

            {/* Divider */}
            <div className="my-1 border-t border-gray-200 dark:border-gray-700" />

            {/* Delete */}
            <button
              className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
              onClick={() => handleDelete(contextMenu.item)}
            >
              <TrashIcon className="w-4 h-4" />
              {t('media.actions.delete')}
            </button>
          </div>
        </>
      )}

      {/* Preview Modal */}
      {previewItem && (
        <MediaItemPreview
          item={previewItem}
          onClose={handleClosePreview}
          onEdit={handleEditFromPreview}
        />
      )}

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
