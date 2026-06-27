import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Plus, Trash2, Search } from 'lucide-react';
import { useCreateMediaWatchHistory, useUpdateMediaWatchHistory } from '@/queries/useMediaQueries';
import { useQuery } from '@tanstack/react-query';
import * as api from '@/lib/api';
import type { MediaWatchHistoryWithLinks } from '@/types/media';

interface WatchHistoryFormProps {
  mediaItemId: string;
  history?: MediaWatchHistoryWithLinks | null;
  onClose: () => void;
}

export default function WatchHistoryForm({ mediaItemId, history, onClose }: WatchHistoryFormProps) {
  const { t } = useTranslation('common');
  const createHistory = useCreateMediaWatchHistory();
  const updateHistory = useUpdateMediaWatchHistory();

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [note, setNote] = useState('');
  const [linkedItems, setLinkedItems] = useState<{ linkedType: 'task' | 'note'; linkedId: string; title: string }[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'task' | 'note'>('task');
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    if (history) {
      setStartDate(history.startDate || '');
      setEndDate(history.endDate || '');
      setNote(history.note || '');
      setLinkedItems(history.links.map(l => ({
        linkedType: l.linkedType,
        linkedId: l.linkedId,
        title: l.title,
      })));
    }
  }, [history]);

  const { data: searchResults = [] } = useQuery({
    queryKey: ['search', searchType, searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return [];
      if (searchType === 'task') {
        const tasks = await api.getAllTasks();
        return tasks
          .filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase()))
          .slice(0, 10)
          .map(t => ({ id: t.id, title: t.title, type: 'task' as const }));
      } else {
        const notes = await api.getAllNotes();
        return notes
          .filter(n => n.title.toLowerCase().includes(searchQuery.toLowerCase()))
          .slice(0, 10)
          .map(n => ({ id: n.id, title: n.title, type: 'note' as const }));
      }
    },
    enabled: showSearch && searchQuery.length > 0,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const params = {
      mediaItemId,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      note: note || undefined,
      linkedItems: linkedItems.map(l => ({
        linkedType: l.linkedType,
        linkedId: l.linkedId,
      })),
    };

    try {
      if (history) {
        await updateHistory.mutateAsync({ id: history.id, ...params });
      } else {
        await createHistory.mutateAsync(params);
      }
      onClose();
    } catch (error) {
      console.error('Failed to save watch history:', error);
    }
  };

  const handleAddLink = (item: { id: string; title: string; type: 'task' | 'note' }) => {
    if (!linkedItems.some(l => l.linkedId === item.id)) {
      setLinkedItems([...linkedItems, {
        linkedType: item.type,
        linkedId: item.id,
        title: item.title,
      }]);
    }
    setSearchQuery('');
    setShowSearch(false);
  };

  const handleRemoveLink = (linkedId: string) => {
    setLinkedItems(linkedItems.filter(l => l.linkedId !== linkedId));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            {history ? t('media.watchHistory.edit') : t('media.watchHistory.add')}
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Date Range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('media.watchHistory.startDate')}
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('media.watchHistory.endDate')}
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900"
              />
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('media.watchHistory.note')}
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900"
              placeholder={t('media.watchHistory.notePlaceholder')}
            />
          </div>

          {/* Linked Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('media.watchHistory.linkedItems')}
              </label>
              <button
                type="button"
                onClick={() => setShowSearch(!showSearch)}
                className="p-0.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Search */}
            {showSearch && (
              <div className="mb-2">
                <div className="flex gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setSearchType('task')}
                    className={`px-2 py-1 text-xs rounded ${
                      searchType === 'task'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {t('media.watchHistory.task')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSearchType('note')}
                    className={`px-2 py-1 text-xs rounded ${
                      searchType === 'note'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {t('media.watchHistory.note')}
                  </button>
                </div>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t('media.watchHistory.searchPlaceholder')}
                    className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900"
                    autoFocus
                  />
                </div>
                {searchResults.length > 0 && (
                  <div className="mt-1 max-h-32 overflow-auto border border-gray-200 dark:border-gray-700 rounded">
                    {searchResults.map((result) => (
                      <button
                        key={result.id}
                        type="button"
                        onClick={() => handleAddLink(result)}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <span>{result.type === 'task' ? '📋' : '📝'}</span>
                        <span className="truncate">{result.title}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Linked Items List */}
            {linkedItems.length > 0 ? (
              <div className="space-y-1">
                {linkedItems.map((item) => (
                  <div
                    key={item.linkedId}
                    className="flex items-center justify-between px-2 py-1.5 bg-gray-50 dark:bg-gray-900 rounded"
                  >
                    <div className="flex items-center gap-2">
                      <span>{item.linkedType === 'task' ? '📋' : '📝'}</span>
                      <span className="text-sm truncate">{item.title}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveLink(item.linkedId)}
                      className="p-0.5 text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t('media.watchHistory.noLinkedItems')}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={createHistory.isPending || updateHistory.isPending}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {t('media.actions.save')}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              {t('media.actions.cancel')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
