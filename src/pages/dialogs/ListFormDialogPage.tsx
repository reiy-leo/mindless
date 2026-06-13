import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useCreateList, useUpdateList, useDeleteList, useLists } from '@/queries/useTaskQueries';
import EmojiPickerButton from '@/components/EmojiPickerButton';
import type { List } from '@/types/task';
import { emit } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';

const COLOR_OPTIONS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
  '#8B5CF6', '#EC4899', '#06B6D4', '#6366F1',
];

const ICON_KEY_TO_EMOJI: Record<string, string> = {
  folder: '📁', inbox: '📥', star: '⭐', heart: '❤️',
  flag: '🚩', book: '📖', briefcase: '💼', home: '🏠',
  target: '🎯', lightning: '⚡',
};

function resolveIcon(icon?: string): string {
  if (!icon) return '📁';
  if (icon.length <= 2) return icon;
  return ICON_KEY_TO_EMOJI[icon] || '📁';
}

const params = new URLSearchParams(window.location.search);
const initialListId = params.get('listId');

export default function ListFormDialogPage() {
  const { t } = useTranslation('common');
  const { data: allLists = [] } = useLists();
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('📁');
  const [color, setColor] = useState('#3B82F6');
  const [list, setList] = useState<List | null>(null);
  const [loaded, setLoaded] = useState(!initialListId);
  const isEditing = !!list;

  const createList = useCreateList();
  const updateList = useUpdateList();
  const deleteList = useDeleteList();

  useEffect(() => {
    document.documentElement.style.backgroundColor = "transparent";
    document.body.style.backgroundColor = "transparent";
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
  }, []);

  useEffect(() => {
    if (initialListId && allLists.length > 0) {
      const found = allLists.find(l => l.id === initialListId);
      if (found) {
        setList(found);
        setName(found.name);
        setIcon(resolveIcon(found.icon));
        setColor(found.color || '#3B82F6');
      }
      setLoaded(true);
    }
  }, [allLists]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      if (isEditing && list) {
        await updateList.mutateAsync({ id: list.id, name: name.trim(), icon, color });
      } else {
        await createList.mutateAsync({ name: name.trim(), icon, color });
      }
      await emit('dialog:result', { action: 'submit' });
      await getCurrentWindow().close();
    } catch (error) {
      console.error('Error submitting:', error);
    }
  };

  const handleDelete = async () => {
    if (!list) return;
    try {
      await deleteList.mutateAsync(list.id);
      await emit('dialog:result', { action: 'delete' });
      await getCurrentWindow().close();
    } catch (error) {
      console.error('Error deleting:', error);
    }
  };

  const handleClose = async () => {
    try {
      await getCurrentWindow().close();
    } catch (error) {
      console.error('Error closing:', error);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-800 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {isEditing ? t('lists.edit_list') : t('lists.create_list')}
        </h2>
        <button onClick={handleClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
          <XMarkIcon className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {!loaded ? (
        <div className="p-6 flex items-center justify-center">
          <div className="text-gray-500 dark:text-gray-400">{t('common.loading')}</div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('lists.name')}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('lists.name_placeholder')}
              required
              autoFocus
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('lists.icon')}
            </label>
            <EmojiPickerButton value={icon} onChange={setIcon} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('lists.color')}
            </label>
            <div className="flex gap-2">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full transition-all ${
                    color === c ? 'ring-2 ring-offset-2 ring-blue-500 dark:ring-offset-gray-800' : ''
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            {isEditing && (
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 text-sm text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                {t('lists.delete_list')}
              </button>
            )}
            <div className="flex-1" />
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isEditing ? t('common.save') : t('common.create')}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
