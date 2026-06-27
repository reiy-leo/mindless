import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { PRIORITY } from '@/lib/constants';
import { useLists, useCalendarEvents } from '@/queries/useTaskQueries';
import { useViewStore } from '@/stores/useViewStore';
import DateTimePicker from '@/components/DateTimePicker';
import DateTimeRangePicker from '@/components/DateTimeRangePicker';
import Select from '@/components/Select';
import type { Priority, Task } from '@/types/task';

// Recurrence rule options
const RECURRENCE_OPTIONS = [
  { value: '', labelKey: 'tasks.recurrence.none' },
  { value: 'daily', labelKey: 'tasks.recurrence.daily' },
  { value: 'weekly', labelKey: 'tasks.recurrence.weekly' },
  { value: 'monthly', labelKey: 'tasks.recurrence.monthly' },
  { value: 'yearly', labelKey: 'tasks.recurrence.yearly' },
  { value: 'custom', labelKey: 'tasks.recurrence.custom' },
] as const;

interface TaskFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (task: {
    title: string;
    description?: string;
    priority: Priority;
    dueDate?: string;
    dueTime?: string;
    endDate?: string;
    endTime?: string;
    startDate?: string;
    listId?: string;
    tagIds?: string;
    recurrenceRule?: string;
    recurrenceEndDate?: string;
  }) => void;
  task?: Task | null;
}

export default function TaskForm({ isOpen, onClose, onSubmit, task }: TaskFormProps) {
  const { t } = useTranslation('common');
  const { selectedListId } = useViewStore();
  const { data: lists = [] } = useLists();
  const { data: calendarEvents = [] } = useCalendarEvents();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>(PRIORITY.NONE);
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [startDate, setStartDate] = useState('');
  const [listId, setListId] = useState('');
  const [dateMode, setDateMode] = useState<'single' | 'range'>('single');

  // Recurrence state
  const [recurrenceType, setRecurrenceType] = useState('');
  const [customInterval, setCustomInterval] = useState(2);
  const [customUnit, setCustomUnit] = useState<'days' | 'weeks' | 'months'>('days');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');

  const isEditing = !!task;

  // Determine effective list: if a list is selected in sidebar, pre-fill it
  const effectiveSelectedListId = selectedListId && !selectedListId.startsWith('smart:') ? selectedListId : '';

  // Derive the recurrence type from the rule string
  function parseRecurrenceRule(rule?: string) {
    if (!rule) return { type: '', interval: 2, unit: 'days' as const };
    const basic: Record<string, string> = { daily: 'daily', weekly: 'weekly', monthly: 'monthly', yearly: 'yearly' };
    if (basic[rule]) return { type: rule, interval: 2, unit: 'days' as const };
    if (rule.startsWith('every_')) {
      const parts = rule.split('_');
      if (parts.length >= 3) {
        return {
          type: 'custom',
          interval: parseInt(parts[1]) || 2,
          unit: (parts[2] as 'days' | 'weeks' | 'months') || 'days',
        };
      }
    }
    return { type: '', interval: 2, unit: 'days' as const };
  }

  // Build the recurrence rule string from form state
  function buildRecurrenceRule(): string | undefined {
    if (!recurrenceType) return undefined;
    if (recurrenceType === 'custom') {
      return `every_${customInterval}_${customUnit}`;
    }
    return recurrenceType;
  }

  // Reset form when dialog opens/closes, or pre-fill for editing
  useEffect(() => {
    if (isOpen && task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setPriority(task.priority);
      setDueDate(task.dueDate || '');
      setDueTime(task.dueTime || '');
      setEndDate(task.endDate || '');
      setEndTime(task.endTime || '');
      setStartDate(task.startDate || '');
      setListId(task.listId || '');
      // Auto-switch to range mode if the task has an endDate
      setDateMode(task.endDate ? 'range' : 'single');
      const parsed = parseRecurrenceRule(task.recurrenceRule);
      setRecurrenceType(parsed.type);
      setCustomInterval(parsed.interval);
      setCustomUnit(parsed.unit);
      setRecurrenceEndDate(task.recurrenceEndDate || '');
    } else if (!isOpen) {
      setTitle('');
      setDescription('');
      setPriority(PRIORITY.NONE);
      setDueDate('');
      setDueTime('');
      setEndDate('');
      setEndTime('');
      setStartDate('');
      setListId(effectiveSelectedListId);
      setDateMode('single');
      setRecurrenceType('');
      setCustomInterval(2);
      setCustomUnit('days');
      setRecurrenceEndDate('');
    } else {
      setListId(effectiveSelectedListId);
      setDateMode('single');
      setRecurrenceType('');
      setCustomInterval(2);
      setCustomUnit('days');
      setRecurrenceEndDate('');
      setEndDate('');
      setEndTime('');
    }
  }, [isOpen, task, effectiveSelectedListId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const rule = buildRecurrenceRule();
    onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      dueDate: dueDate || undefined,
      dueTime: dueTime || undefined,
      endDate: endDate || undefined,
      endTime: endTime || undefined,
      startDate: startDate || undefined,
      listId: listId || undefined,
      recurrenceRule: rule,
      recurrenceEndDate: rule ? (recurrenceEndDate || undefined) : undefined,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Dialog */}
      <div
        className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-auto"
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {isEditing ? t('tasks.edit_task') : t('tasks.new_task')}
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('tasks.title')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder={t('tasks.title_placeholder')} required autoFocus
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('tasks.description')}
              <span className="ml-2 text-xs text-gray-400 dark:text-gray-500 font-normal">({t('tasks.supports_markdown')})</span>
            </label>
            <textarea
              value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder={t('tasks.description_placeholder')} rows={3}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono text-sm"
            />
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('tasks.priority.label')}
            </label>
            <div className="flex gap-2">
              {[
                { value: PRIORITY.NONE, label: t('tasks.priority.none'), color: '#9CA3AF' },
                { value: PRIORITY.LOW, label: t('tasks.priority.low'), color: '#3B82F6' },
                { value: PRIORITY.MEDIUM, label: t('tasks.priority.medium'), color: '#F59E0B' },
                { value: PRIORITY.HIGH, label: t('tasks.priority.high'), color: '#EF4444' },
              ].map((option) => (
                <button
                  key={option.value} type="button" onClick={() => setPriority(option.value as Priority)}
                  className={`flex-1 px-4 py-2 rounded-lg border-2 transition-all ${
                    priority === option.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: option.color }} />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{option.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* List selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('lists.title')}
            </label>
            <Select
              value={listId}
              onChange={(val) => setListId(val)}
              options={[
                { value: '', label: t('lists.inbox') },
                ...lists.filter((l) => !['inbox', 'today', 'tomorrow', 'next7days', 'thismonth', 'recent', 'eisenhower'].includes(l.id)).map((list) => ({
                  value: list.id, label: list.name,
                })),
              ]}
            />
          </div>

          {/* Dates */}
          <div>
            {/* Date mode toggle */}
            <div className="flex items-center gap-2 mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('tasks.start_date')} / {t('tasks.due_date')}
              </label>
              <div className="ml-auto flex border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setDateMode('single')}
                  className={`px-3 py-1 text-xs transition-colors ${
                    dateMode === 'single'
                      ? 'bg-blue-500 text-white'
                      : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600'
                  }`}
                >
                  {t('tasks.date_mode.single')}
                </button>
                <button
                  type="button"
                  onClick={() => setDateMode('range')}
                  className={`px-3 py-1 text-xs transition-colors border-l border-gray-300 dark:border-gray-600 ${
                    dateMode === 'range'
                      ? 'bg-blue-500 text-white'
                      : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600'
                  }`}
                >
                  {t('tasks.date_mode.range')}
                </button>
              </div>
            </div>

            {dateMode === 'single' ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('tasks.start_date')}</label>
                  <DateTimePicker
                    date={startDate || undefined}
                    onChange={(d) => setStartDate(d || '')}
                    events={calendarEvents}
                    showTime={false}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('tasks.due_date')}</label>
                  <DateTimePicker
                    date={dueDate || undefined}
                    time={dueTime || undefined}
                    onChange={(d, tm) => { setDueDate(d || ''); setDueTime(tm || ''); }}
                    events={calendarEvents}
                    showTime={true}
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  {t('tasks.range_start')} &rarr; {t('tasks.range_end')}
                </label>
                <DateTimeRangePicker
                  startDate={dueDate || undefined}
                  startTime={dueTime || undefined}
                  endDate={endDate || undefined}
                  endTime={endTime || undefined}
                  onChange={(sd, st, ed, et) => {
                    setDueDate(sd || '');
                    setDueTime(st || '');
                    setEndDate(ed || '');
                    setEndTime(et || '');
                  }}
                  events={calendarEvents}
                />
              </div>
            )}
          </div>

          {/* Recurrence */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('tasks.recurrence.label')}
            </label>
            <Select
              value={recurrenceType}
              onChange={(val) => setRecurrenceType(val)}
              options={RECURRENCE_OPTIONS.map((opt) => ({
                value: opt.value, label: t(opt.labelKey),
              }))}
            />

            {/* Custom interval */}
            {recurrenceType === 'custom' && (
              <div className="flex items-center gap-2 mt-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">{t('tasks.recurrence.every')}</span>
                <input
                  type="number" min={2} max={365} value={customInterval}
                  onChange={(e) => setCustomInterval(Math.max(2, parseInt(e.target.value) || 2))}
                  className="w-16 px-2 py-1.5 text-center border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Select
                  value={customUnit}
                  onChange={(val) => setCustomUnit(val as 'days' | 'weeks' | 'months')}
                  options={[
                    { value: 'days', label: t('tasks.recurrence.days') },
                    { value: 'weeks', label: t('tasks.recurrence.weeks') },
                    { value: 'months', label: t('tasks.recurrence.months') },
                  ]}
                  className="w-28"
                />
              </div>
            )}

            {/* Recurrence end date */}
            {recurrenceType && (
              <div className="mt-2">
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('tasks.recurrence.end_date')}</label>
                <DateTimePicker
                  date={recurrenceEndDate || undefined}
                  onChange={(d) => setRecurrenceEndDate(d || '')}
                  events={calendarEvents}
                  showTime={false}
                />
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button type="submit" disabled={!title.trim()}
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isEditing ? t('common.save') : t('common.create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
