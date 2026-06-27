import { useTranslation } from 'react-i18next';
import { Star } from 'lucide-react';
import type { MediaItem } from '@/types/media';

interface MediaListItemProps {
  item: MediaItem;
  onClick: (item: MediaItem) => void;
  onContextMenu?: (e: React.MouseEvent, item: MediaItem) => void;
}

export default function MediaListItem({ item, onClick, onContextMenu }: MediaListItemProps) {
  const { t } = useTranslation('common');

  const statusColors = {
    unwatched: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
    planned: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300',
    normal: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300',
    watched: 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300',
    archived: 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300',
  };

  return (
    <div
      className="flex items-center gap-4 p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer"
      role="button"
      tabIndex={0}
      onClick={() => onClick(item)}
      onContextMenu={(e) => onContextMenu?.(e, item)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(item); } }}
    >
      {/* Cover Thumbnail */}
      <div className="w-12 h-16 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden flex-shrink-0">
        {item.cover ? (
          <img
            src={item.cover}
            alt={item.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <span className="text-lg">🎬</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
          {item.title}
        </h3>
        <div className="flex items-center gap-2 mt-1">
          {item.year && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {item.year}
            </span>
          )}
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[item.status]}`}>
            {t(`media.status.${item.status}`)}
          </span>
        </div>
      </div>

      {/* Rating */}
      {item.rating && (
        <div className="flex items-center gap-1 text-sm text-gray-700 dark:text-gray-300">
          <Star className="w-4 h-4 text-yellow-400" />
          <span>{item.rating.toFixed(1)}</span>
        </div>
      )}
    </div>
  );
}
