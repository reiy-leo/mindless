import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useTags, useLists } from '@/queries/useTaskQueries';
import EmojiPickerButton from '@/components/EmojiPickerButton';
import Tw22ColorPickerButton from '@/components/Tw22ColorPickerButton';
import MultiSelectDropdown from '@/components/MultiSelectDropdown';
import type { AdvancedGroup, AdvancedGroupFilter } from '@/stores/useAppStore';

const ICON_KEY_TO_EMOJI: Record<string, string> = {
  star: '⭐', heart: '❤️', fire: '🔥', book: '📖',
  flag: '🚩', target: '🎯', lightning: '⚡', folder: '📁',
};

function resolveIcon(icon?: string): string {
  if (!icon) return '📁';
  if (icon.length <= 2) return icon;
  return ICON_KEY_TO_EMOJI[icon] || '📁';
}

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
  const [icon, setIcon] = useState('📁');
  const [filters, setFilters] = useState<AdvancedGroupFilter>({});
  const [regexError, setRegexError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && group) {
      setName(group.name);
      setColor(group.color);
      setIcon(resolveIcon(group.icon));
      setFilters({ ...group.filters });
    } else if (isOpen) {
      setName('');
      setColor('#3B82F6');
      setIcon('📁');
      setFilters({});
    }
    setRegexError(null);
  }, [isOpen, group]);

  const updateFilter = <K extends keyof AdvancedGroupFilter>(key: K, value: AdvancedGroupFilter[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
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
    if (filters.dateType) {
      cleanFilters.dateType = filters.dateType;
      cleanFilters.dateMode = filters.dateMode || 'absolute';
      if (cleanFilters.dateMode === 'absolute') {
        if (filters.dateFrom) cleanFilters.dateFrom = filters.dateFrom;
        if (filters.dateTo) cleanFilters.dateTo = filters.dateTo;
      } else {
        if (filters.datePastDays != null && filters.datePastDays > 0) cleanFilters.datePastDays = filters.datePastDays;
        if (filters.dateFutureDays != null && filters.dateFutureDays > 0) cleanFilters.dateFutureDays = filters.dateFutureDays;
      }
    }
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
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-sm">
          {/* Icon & Name */}
          <div className="flex items-start gap-2">
            <EmojiPickerButton value={icon} onChange={setIcon} />
            <div className="flex-1">
              <input
                type="text" value={name} onChange={(e) => setName(e.target.value)}
                required autoFocus placeholder={t('advanced_groups.name')}
                className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Color */}
          <div>
            <Tw22ColorPickerButton value={color} onChange={setColor} />
          </div>

          {/* Filter: Lists */}
          {userLists.length > 0 && (
            <div>
              <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">{t('advanced_groups.filter_lists')}</label>
              <MultiSelectDropdown
                options={userLists.map((l) => ({ id: l.id, label: l.name, color: l.color || '#3B82F6' }))}
                selected={filters.listIds || []}
                onChange={(ids) => updateFilter('listIds', ids)}
                placeholder={t('advanced_groups.select_lists')}
                emptyHint={t('advanced_groups.no_lists')}
              />
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t('advanced_groups.filter_lists_hint')}</p>
            </div>
          )}

          {/* Filter: Tags */}
          {allTags.length > 0 && (
            <div>
              <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">{t('advanced_groups.filter_tags')}</label>
              <MultiSelectDropdown
                options={allTags.map((tag) => ({ id: tag.id, label: tag.name, color: tag.color || '#3B82F6', emoji: tag.emoji }))}
                selected={filters.tagIds || []}
                onChange={(ids) => updateFilter('tagIds', ids)}
                placeholder={t('advanced_groups.select_tags')}
                emptyHint={t('advanced_groups.no_tags')}
              />
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
            <label className="block font-medium text-gray-700 dark:text-gray-300 mb-2">{t('advanced_groups.filter_date')}</label>
            <div className="flex gap-1 mb-3">
              {([
                { value: '', label: t('advanced_groups.date_none') },
                { value: 'due', label: t('advanced_groups.date_due') },
                { value: 'created', label: t('advanced_groups.date_created') },
              ]).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    const val = (opt.value || undefined) as any;
                    updateFilter('dateType', val);
                    if (!val) {
                      updateFilter('dateMode', undefined);
                      updateFilter('dateFrom', undefined);
                      updateFilter('dateTo', undefined);
                      updateFilter('datePastDays', undefined);
                      updateFilter('dateFutureDays', undefined);
                    } else if (!filters.dateMode) {
                      updateFilter('dateMode', 'absolute');
                    }
                  }}
                  className={`flex-1 px-2 py-1.5 rounded-lg text-xs transition-colors ${
                    (filters.dateType || '') === opt.value
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {filters.dateType && (
              <div className="flex gap-1 mb-3">
                {([
                  { value: 'absolute', label: t('advanced_groups.date_mode_absolute') },
                  { value: 'relative', label: t('advanced_groups.date_mode_relative') },
                ]).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      const mode = opt.value as 'absolute' | 'relative';
                      updateFilter('dateMode', mode);
                      if (mode === 'absolute') {
                        updateFilter('datePastDays', undefined);
                        updateFilter('dateFutureDays', undefined);
                      } else {
                        updateFilter('dateFrom', undefined);
                        updateFilter('dateTo', undefined);
                      }
                    }}
                    className={`flex-1 px-2 py-1.5 rounded-lg text-xs transition-colors ${
                      (filters.dateMode || 'absolute') === opt.value
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
            {filters.dateType && (filters.dateMode || 'absolute') === 'absolute' && (
              <div className="flex items-center gap-2">
                <input type="date" value={filters.dateFrom || ''}
                  onChange={(e) => updateFilter('dateFrom', e.target.value || undefined)}
                  className="flex-1 px-2 py-1.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-gray-400 text-xs">~</span>
                <input type="date" value={filters.dateTo || ''}
                  onChange={(e) => updateFilter('dateTo', e.target.value || undefined)}
                  className="flex-1 px-2 py-1.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
            {filters.dateType && filters.dateMode === 'relative' && (
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 dark:text-gray-400">{t('advanced_groups.date_past')}</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => updateFilter('datePastDays', Math.max(0, (filters.datePastDays ?? 7) - 1))}
                      className="w-7 h-7 flex items-center justify-center rounded-md bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-500 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-500 text-sm"
                    >
                      −
                    </button>
                    <span className="w-10 text-center text-sm font-medium text-gray-800 dark:text-gray-200">
                      {filters.datePastDays ?? 7}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateFilter('datePastDays', Math.min(30, (filters.datePastDays ?? 7) + 1))}
                      className="w-7 h-7 flex items-center justify-center rounded-md bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-500 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-500 text-sm"
                    >
                      +
                    </button>
                    <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">{t('advanced_groups.date_days')}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 dark:text-gray-400">{t('advanced_groups.date_future')}</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => updateFilter('dateFutureDays', Math.max(0, (filters.dateFutureDays ?? 7) - 1))}
                      className="w-7 h-7 flex items-center justify-center rounded-md bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-500 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-500 text-sm"
                    >
                      −
                    </button>
                    <span className="w-10 text-center text-sm font-medium text-gray-800 dark:text-gray-200">
                      {filters.dateFutureDays ?? 7}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateFilter('dateFutureDays', Math.min(30, (filters.dateFutureDays ?? 7) + 1))}
                      className="w-7 h-7 flex items-center justify-center rounded-md bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-500 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-500 text-sm"
                    >
                      +
                    </button>
                    <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">{t('advanced_groups.date_days')}</span>
                  </div>
                </div>
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
