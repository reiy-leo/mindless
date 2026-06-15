import { useTranslation } from 'react-i18next';
import { StarIcon } from '@heroicons/react/24/solid';
import type { MediaItem } from '@/types/media';

interface MediaCardProps {
  item: MediaItem;
  onClick: (item: MediaItem) => void;
}

export default function MediaCard({ item, onClick }: MediaCardProps) {
  const { t } = useTranslation('common');

  const statusColors = {
    normal: 'bg-gray-100 dark:bg-gray-700',
    favorite: 'bg-yellow-100 dark:bg-yellow-900',
    watched: 'bg-green-100 dark:bg-green-900',
    archived: 'bg-gray-200 dark:bg-gray-600',
  };

  return (
    <div
      className="relative bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer overflow-hidden"
      role="button"
      tabIndex={0}
      onClick={() => onClick(item)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(item); } }}
    >
      {/* Cover Image */}
      <div className="aspect-[2/3] bg-gray-200 dark:bg-gray-700 relative">
        {item.cover ? (
          <img
            src={item.cover}
            alt={item.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <span className="text-4xl">🎬</span>
          </div>
        )}

        {/* Status Badge */}
        <div className={`absolute top-2 left-2 px-2 py-1 rounded text-xs font-medium ${statusColors[item.status]}`}>
          {t(`media.status.${item.status}`)}
        </div>

        {/* Rating */}
        {item.rating && (
          <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/70 text-white px-2 py-1 rounded text-xs">
            <StarIcon className="w-3 h-3 text-yellow-400" />
            <span>{item.rating.toFixed(1)}</span>
          </div>
        )}

        {/* Type Badge */}
        <div className="absolute bottom-2 left-2 px-2 py-1 rounded text-xs font-medium bg-black/70 text-white">
          {t(`media.type.${item.type}`)}
        </div>
      </div>

      {/* Title */}
      <div className="p-3">
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
          {item.title}
        </h3>
        {item.year && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {item.year}
          </p>
        )}
      </div>
    </div>
  );
}
