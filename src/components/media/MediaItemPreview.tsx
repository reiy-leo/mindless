import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Star, Pencil, ExternalLink, Plus, Trash2, Calendar } from 'lucide-react';
import { openUrl } from '@tauri-apps/plugin-opener';
import { useMediaItemDetails, useMediaWatchHistory, useDeleteMediaWatchHistory } from '@/queries/useMediaQueries';
import { useMediaGroups } from '@/queries/useMediaQueries';
import { useTasks } from '@/queries/useTaskQueries';
import { useNotes } from '@/queries/useNoteQueries';
import { useAppStore } from '@/stores/useAppStore';
import { formatDisplayDate } from '@/lib/formatUtils';
import type { MediaItem, MediaStatus } from '@/types/media';
import WatchHistoryForm from './WatchHistoryForm';
import { useNavigate } from 'react-router-dom';

interface MediaItemPreviewProps {
  item: MediaItem;
  onClose: () => void;
  onEdit: (item: MediaItem) => void;
}

export default function MediaItemPreview({ item, onClose, onEdit }: MediaItemPreviewProps) {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const dateFormat = useAppStore((s) => s.dateFormat);
  const { data: details } = useMediaItemDetails(item.id);
  const { data: watchHistory = [] } = useMediaWatchHistory(item.id);
  const { data: groups = [] } = useMediaGroups();
  const { data: allTasks = [] } = useTasks();
  const { data: allNotes = [] } = useNotes();
  const deleteWatchHistory = useDeleteMediaWatchHistory();
  const [showWatchHistoryForm, setShowWatchHistoryForm] = useState(false);
  const [editingHistory, setEditingHistory] = useState<any>(null);

  const statusColors: Record<MediaStatus, string> = {
    unwatched: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
    planned: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300',
    normal: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300',
    watched: 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300',
    archived: 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300',
  };

  const group = groups.find(g => g.id === item.groupId);
  const linkedTasks = allTasks.filter((t) => details?.linkedTaskIds?.includes(t.id));
  const linkedNotes = allNotes.filter((n) => details?.linkedNoteIds?.includes(n.id));

  const handleOpenLink = async (url: string) => {
    try {
      await openUrl(url);
    } catch (e) {
      console.error('Failed to open link:', e);
      window.open(url, '_blank');
    }
  };

  const handleDeleteHistory = async (id: string) => {
    if (window.confirm(t('media.message.confirm_delete_history'))) {
      await deleteWatchHistory.mutateAsync({ id, mediaItemId: item.id });
    }
  };

  const handleLinkClick = (linkedType: string, linkedId: string) => {
    if (linkedType === 'task') {
      navigate(`/tasks?taskId=${linkedId}`);
    } else if (linkedType === 'note') {
      navigate(`/notes?noteId=${linkedId}`);
    }
    onClose();
  };

  const formatDate = (date: string | null) => {
    if (!date) return '';
    return formatDisplayDate(date.slice(0, 10), dateFormat, t);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
            {item.title}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onEdit(item)}
              className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              title={t('media.actions.edit')}
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Basic Info */}
          <div className="flex gap-4 mb-4">
            {/* Cover */}
            <div className="w-24 h-32 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden flex-shrink-0">
              {item.cover ? (
                <img src={item.cover} alt={item.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <span className="text-3xl">🎬</span>
                </div>
              )}
            </div>

            {/* Details */}
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[item.status]}`}>
                  {t(`media.status.${item.status}`)}
                </span>
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                  {t(`media.type.${item.type}`)}
                </span>
                {item.year && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {item.year}
                  </span>
                )}
                {item.type === 'season' && item.seasonNumber && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    S{item.seasonNumber}
                  </span>
                )}
              </div>

              {item.rating && (
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-400" />
                  <span className="text-sm font-medium">{item.rating.toFixed(1)}</span>
                </div>
              )}

              {group && (
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {group.icon} {group.name}
                </div>
              )}

              {/* Other Names */}
              {details?.otherNames && details.otherNames.length > 0 && (
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {details.otherNames.map(n => n.name).join(' / ')}
                </div>
              )}
            </div>
          </div>

          {/* External Links */}
          {(item.doubanUrl || item.imdbUrl || item.rottenTomatoesUrl) && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('media.fields.externalLinks')}
              </h3>
              <div className="flex flex-wrap gap-2">
                {item.doubanUrl && (
                  <button
                    onClick={() => handleOpenLink(item.doubanUrl!)}
                    className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                  >
                    豆瓣 <ExternalLink className="w-3 h-3" />
                  </button>
                )}
                {item.imdbUrl && (
                  <button
                    onClick={() => handleOpenLink(item.imdbUrl!)}
                    className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                  >
                    IMDB <ExternalLink className="w-3 h-3" />
                  </button>
                )}
                {item.rottenTomatoesUrl && (
                  <button
                    onClick={() => handleOpenLink(item.rottenTomatoesUrl!)}
                    className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                  >
                    烂番茄 <ExternalLink className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Watch Links */}
          {details?.watchLinks && details.watchLinks.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('media.fields.watchLinks')}
              </h3>
              <div className="flex flex-wrap gap-2">
                {details.watchLinks.map((link) => (
                  <button
                    key={link.id}
                    onClick={() => handleOpenLink(link.url)}
                    className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800"
                  >
                    {link.platform || '观看'} <ExternalLink className="w-3 h-3" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Linked Tasks */}
          {linkedTasks.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('media.fields.linkedTasks')}
              </h3>
              <div className="space-y-1">
                {linkedTasks.map((task) => (
                  <button
                    key={task.id}
                    onClick={() => handleLinkClick('task', task.id)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 text-xs bg-gray-50 dark:bg-gray-900 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-left"
                  >
                    {task.dueDate && (
                      <span className="text-gray-400 dark:text-gray-500 flex-shrink-0">
                        {task.dueDate.slice(5)}{task.dueTime ? ` ${task.dueTime}` : ''}
                      </span>
                    )}
                    <span className="text-gray-700 dark:text-gray-300 truncate flex-1">{task.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Linked Notes */}
          {linkedNotes.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('media.fields.linkedNotes')}
              </h3>
              <div className="space-y-1">
                {linkedNotes.map((note) => (
                  <button
                    key={note.id}
                    onClick={() => handleLinkClick('note', note.id)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 text-xs bg-gray-50 dark:bg-gray-900 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-left"
                  >
                    <span className="text-gray-400 dark:text-gray-500 flex-shrink-0">
                      {note.createdAt?.slice(5, 10)}
                    </span>
                    <span className="text-gray-700 dark:text-gray-300 truncate flex-1">{note.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Watch History */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('media.watchHistory.title')}
              </h3>
              <button
                onClick={() => {
                  setEditingHistory(null);
                  setShowWatchHistoryForm(true);
                }}
                className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {watchHistory.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('media.watchHistory.empty')}
              </p>
            ) : (
              <div className="space-y-2">
                {watchHistory.map((history) => (
                  <div
                    key={history.id}
                    className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {formatDate(history.startDate)}
                          {history.endDate && ` - ${formatDate(history.endDate)}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingHistory(history);
                            setShowWatchHistoryForm(true);
                          }}
                          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDeleteHistory(history.id)}
                          className="p-1 text-gray-400 hover:text-red-500"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    {history.note && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                        {history.note}
                      </p>
                    )}
                    {history.links.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {history.links.map((link) => (
                          <button
                            key={link.id}
                            onClick={() => handleLinkClick(link.linkedType, link.linkedId)}
                            className="flex items-center gap-1 px-2 py-0.5 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            {link.linkedType === 'task' ? '📋' : '📝'}
                            <span className="truncate max-w-[150px]">{link.title}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Watch History Form */}
      {showWatchHistoryForm && (
        <WatchHistoryForm
          mediaItemId={item.id}
          history={editingHistory}
          onClose={() => {
            setShowWatchHistoryForm(false);
            setEditingHistory(null);
          }}
        />
      )}
    </div>
  );
}
