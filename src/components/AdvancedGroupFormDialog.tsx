import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useTags, useLists } from '@/queries/useTaskQueries';
import type { AdvancedGroup, AdvancedGroupFilter } from '@/stores/useAppStore';

const ICON_OPTIONS = ['star', 'heart', 'fire', 'book', 'flag', 'target', 'lightning', 'folder'];
const ICON_MAP: Record<string, string> = {
  star: '⭐', heart: '❤️', fire: '🔥', book: '📖',
  flag: '🚩', target: '🎯', lightning: '⚡', folder: '📁',
};
const COLOR_OPTIONS = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316'];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (group: AdvancedGroup) => void;
  group?: AdvancedGroup | null;
}

export default function AdvancedGroupFormDialog({ isOpen, onClose, onSubmit, group }: Props) {
  const { t } = useTranslation('common');
  const isEditing = !!group;
  const { data: allTags = [] } = useTags();
  const { data: allLists = [] } = useLists();

  const [name, setName] = useState('');
  const [color, setColor] = useState('#3B82F6');
  const [icon, setIcon] = useState('folder');
  const [filters, setFilters] = useState<AdvancedGroupFilter>({});
  const [regexError, setRegexError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && group) {
      setName(group.name);
      setColor(group.color);
      setIcon(group.icon);
      setFilters({ ...group.filters });
    } else if (isOpen) {
      setName('');
      setColor('#3B82F6');
      setIcon('folder');
      setFilters({});
    }
    setRegexError(null);
  }, [isOpen, group]);

  const updateFilter = <K extends keyof AdvancedGroupFilter>(key: K, value: AdvancedGroupFilter[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const toggleListItem = (listId: string) => {
    const current = filters.listIds || [];
    updateFilter('listIds', current.includes(listId) ? current.filter((id) => id !== listId) : [...current, listId]);
  };

  const toggleTagItem = (tagId: string) => {
    const current = filters.tagIds || [];
    updateFilter('tagIds', current.includes(tagId) ? current.filter((id) => id !== tagId) : [...current, tagId]);
  };

  const togglePriority = (p: number) => {
    const current = filters.priorities || [];
    updateFilter('priorities', current.includes(p) ? current.filter((x) => x !== p) : [...current, p]);
  };

  const validateRegex = (pattern: string) => {
    if (!pattern) { setRegexError(null); return; }
    try { new RegExp(pattern); setRegexError(null); } catch { setRegexError(t('advanced_groups.regex_error')); }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (regexError) return;

    const cleanFilters: AdvancedGroupFilter = {};
    if (filters.listIds?.length) cleanFilters.listIds = filters.listIds;
    if (filters.tagIds?.length) cleanFilters.tagIds = filters.tagIds;
    if (filters.titleRegex?.trim()) cleanFilters.titleRegex = filters.titleRegex.trim();
    if (filters.dateType) cleanFilters.dateType = filters.dateType;
    if (filters.dateFrom) cleanFilters.dateFrom = filters.dateFrom;
    if (filters.dateTo) cleanFilters.dateTo = filters.dateTo;
    if (filters.priorities?.length) cleanFilters.priorities = filters.priorities;

    onSubmit({
      id: group?.id || `adv-${Date.now()}`,
      name: name.trim(),
      color,
      icon,
      filters: cleanFilters,
    });
    onClose();
  };

  if (!isOpen) return null;

  const seedIds = new Set(['inbox', 'today', 'tomorrow', 'next7days', 'thismonth', 'recent', 'eisenhower']);
  const userLists = allLists.filter((l) => !seedIds.has(l.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {isEditing ? t('advanced_groups.edit') : t('advanced_groups.create')}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <XMarkIcon className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-sm">
          {/* Name */}
          <div>
            <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">{t('advanced_groups.name')} *</label>
            <input
              type="text" value={name} onChange={(e) => setName(e.target.value)}
              required autoFocus
              className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Icon & Color */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">{t('advanced_groups.icon')}</label>
              <div className="flex gap-1.5 flex-wrap">
                {ICON_OPTIONS.map((ic) => (
                  <button key={ic} type="button" onClick={() => setIcon(ic)}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all ${icon === ic ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                  >{ICON_MAP[ic]}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">{t('advanced_groups.color')}</label>
              <div className="flex gap-1.5">
                {COLOR_OPTIONS.map((c) => (
                  <button key={c} type="button" onClick={() => setColor(c)}
                    className={`w-6 h-6 rounded-full transition-all ${color === c ? 'ring-2 ring-offset-1 ring-blue-500' : ''}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Filter: Lists */}
          {userLists.length > 0 && (
            <div>
              <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">{t('advanced_groups.filter_lists')}</label>
              <div className="flex flex-wrap gap-1.5">
                {userLists.map((list) => (
                  <button key={list.id} type="button" onClick={() => toggleListItem(list.id)}
                    className={`px-2 py-1 rounded-full text-xs transition-all ${
                      (filters.listIds || []).includes(list.id)
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ backgroundColor: list.color || '#3B82F6' }} />
                    {list.name}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t('advanced_groups.filter_lists_hint')}</p>
            </div>
          )}

          {/* Filter: Tags */}
          {allTags.length > 0 && (
            <div>
              <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">{t('advanced_groups.filter_tags')}</label>
              <div className="flex flex-wrap gap-1.5">
                {allTags.map((tag) => (
                  <button key={tag.id} type="button" onClick={() => toggleTagItem(tag.id)}
                    className={`px-2 py-1 rounded-full text-xs transition-all ${
                      (filters.tagIds || []).includes(tag.id)
                        ? 'text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                    style={(filters.tagIds || []).includes(tag.id) ? { backgroundColor: tag.color || '#3B82F6' } : {}}
                  >
                    {tag.emoji && <span className="mr-0.5">{tag.emoji}</span>}
                    {tag.name}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t('advanced_groups.filter_tags_hint')}</p>
            </div>
          )}

          {/* Filter: Title Regex */}
          <div>
            <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">{t('advanced_groups.filter_title')}</label>
            <input
              type="text" value={filters.titleRegex || ''} placeholder="e.g. ^买.*$|工作"
              onChange={(e) => { updateFilter('titleRegex', e.target.value); validateRegex(e.target.value); }}
              className={`w-full px-3 py-1.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 ${
                regexError ? 'border-red-400 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
              }`}
            />
            {regexError && <p className="text-xs text-red-500 mt-1">{regexError}</p>}
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t('advanced_groups.filter_title_hint')}</p>
          </div>

          {/* Filter: Date */}
          <div>
            <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">{t('advanced_groups.filter_date')}</label>
            <div className="flex items-center gap-2 mb-2">
              <select
                value={filters.dateType || ''}
                onChange={(e) => updateFilter('dateType', e.target.value as any || undefined)}
                className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg text-sm focus:outline-none"
              >
                <option value="">{t('advanced_groups.date_none')}</option>
                <option value="due">{t('advanced_groups.date_due')}</option>
                <option value="created">{t('advanced_groups.date_created')}</option>
              </select>
            </div>
            {filters.dateType && (
              <div className="flex items-center gap-2">
                <input type="date" value={filters.dateFrom || ''}
                  onChange={(e) => updateFilter('dateFrom', e.target.value || undefined)}
                  className="flex-1 px-2 py-1.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg text-sm focus:outline-none"
                />
                <span className="text-gray-400">~</span>
                <input type="date" value={filters.dateTo || ''}
                  onChange={(e) => updateFilter('dateTo', e.target.value || undefined)}
                  className="flex-1 px-2 py-1.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg text-sm focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* Filter: Priority */}
          <div>
            <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">{t('advanced_groups.filter_priority')}</label>
            <div className="flex gap-1.5">
              {[0, 1, 2, 3].map((p) => (
                <button key={p} type="button" onClick={() => togglePriority(p)}
                  className={`px-3 py-1 rounded-full text-xs transition-all ${
                    (filters.priorities || []).includes(p)
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {t(`tasks.priority.${['none', 'low', 'medium', 'high'][p]}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-3">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600">
              {t('common.cancel')}
            </button>
            <button type="submit" disabled={!name.trim() || !!regexError}
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50">
              {isEditing ? t('common.save') : t('common.create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
