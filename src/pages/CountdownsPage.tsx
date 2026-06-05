import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  PlusIcon, PencilIcon, TrashIcon, XMarkIcon,
  ClockIcon, ArrowPathIcon,
} from '@heroicons/react/24/outline';
import {
  useCountdowns, useCreateCountdown, useUpdateCountdown, useDeleteCountdown,
} from '@/queries/useCountdownQueries';
import type { Countdown, EventType, CreateCountdownParams } from '@/types/countdown';

// ==================== Icon & Color Options ====================
const ICON_OPTIONS = ['flag', 'heart', 'star', 'gift', 'cake', 'plane', 'ring', 'baby', 'graduation', 'house'];
const ICON_MAP: Record<string, string> = {
  flag: '🚩', heart: '❤️', star: '⭐', gift: '🎁', cake: '🎂',
  plane: '✈️', ring: '💍', baby: '👶', graduation: '🎓', house: '🏠',
};
const COLOR_OPTIONS = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316'];

// ==================== Countdown Form Dialog ====================
function CountdownFormDialog({
  isOpen,
  onClose,
  onSubmit,
  countdown,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (params: CreateCountdownParams) => void;
  countdown?: Countdown | null;
}) {
  const { t } = useTranslation('common');
  const isEditing = !!countdown;

  const [title, setTitle] = useState(countdown?.title || '');
  const [description, setDescription] = useState(countdown?.description || '');
  const [icon, setIcon] = useState(countdown?.icon || 'flag');
  const [color, setColor] = useState(countdown?.color || '#8B5CF6');
  const [targetDate, setTargetDate] = useState(countdown?.targetDate || '');
  const [targetTime, setTargetTime] = useState(countdown?.targetTime || '');
  const [eventType, setEventType] = useState<EventType>(countdown?.eventType || 'countdown');

  // Reset form when opening
  useEffect(() => {
    if (isOpen && countdown) {
      setTitle(countdown.title);
      setDescription(countdown.description || '');
      setIcon(countdown.icon || 'flag');
      setColor(countdown.color || '#8B5CF6');
      setTargetDate(countdown.targetDate || '');
      setTargetTime(countdown.targetTime || '');
      setEventType(countdown.eventType || 'countdown');
    } else if (isOpen) {
      setTitle('');
      setDescription('');
      setIcon('flag');
      setColor('#8B5CF6');
      setTargetDate('');
      setTargetTime('');
      setEventType('countdown');
    }
  }, [isOpen, countdown]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !targetDate) return;
    onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      icon,
      color,
      targetDate,
      targetTime: targetTime || undefined,
      eventType,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {isEditing ? t('countdowns.edit_countdown') : t('countdowns.new_countdown')}
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <XMarkIcon className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('countdowns.event_name')} *
            </label>
            <input
              type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              required autoFocus placeholder={t('countdowns.event_name_placeholder')}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('countdowns.description')}
            </label>
            <input
              type="text" value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder={t('countdowns.description_placeholder')}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Event Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('countdowns.event_type')}
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEventType('countdown')}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                  eventType === 'countdown'
                    ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 ring-2 ring-purple-500'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <ClockIcon className="w-4 h-4" />
                {t('countdowns.type_countdown')}
              </button>
              <button
                type="button"
                onClick={() => setEventType('countup')}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                  eventType === 'countup'
                    ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 ring-2 ring-purple-500'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <ArrowPathIcon className="w-4 h-4" />
                {t('countdowns.type_countup')}
              </button>
            </div>
          </div>

          {/* Icon */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('countdowns.icon')}
            </label>
            <div className="flex gap-2 flex-wrap">
              {ICON_OPTIONS.map((ic) => (
                <button key={ic} type="button" onClick={() => setIcon(ic)}
                  className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg transition-all ${
                    icon === ic ? 'ring-2 ring-purple-500 bg-purple-50 dark:bg-purple-900/20' : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >{ICON_MAP[ic] || '🚩'}</button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('countdowns.color')}
            </label>
            <div className="flex gap-2">
              {COLOR_OPTIONS.map((c) => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full transition-all ${
                    color === c ? 'ring-2 ring-offset-2 ring-purple-500' : ''
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Target Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('countdowns.target_date')} *
            </label>
            <input
              type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Target Time (optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('countdowns.target_time')}
            </label>
            <input
              type="time" value={targetTime} onChange={(e) => setTargetTime(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600">
              {t('common.cancel')}
            </button>
            <button type="submit" disabled={!title.trim() || !targetDate}
              className="flex-1 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50">
              {isEditing ? t('common.save') : t('common.create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ==================== Countdown Card ====================
function CountdownCard({
  countdown, onEdit, onDelete,
}: {
  countdown: Countdown; onEdit: () => void; onDelete: () => void;
}) {
  const { t } = useTranslation('common');

  const getDaysRemaining = () => {
    // Parse date components manually to avoid UTC timezone shift
    const [year, month, day] = countdown.targetDate.split('-').map(Number);
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    if (countdown.targetTime) {
      const [h, m, s] = countdown.targetTime.split(':').map(Number);
      const target = new Date(year, month - 1, day, h, m, s || 0, 0);
      const diff = target.getTime() - now.getTime();
      return Math.ceil(diff / (1000 * 60 * 60 * 24));
    }
    const target = new Date(year, month - 1, day);
    const diff = target.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const daysRemaining = getDaysRemaining();
  const isCountup = countdown.eventType === 'countup';

  // For countup: show days since the event
  const displayDays = isCountup ? Math.abs(daysRemaining) : daysRemaining;

  const getStatusText = () => {
    if (isCountup) {
      if (daysRemaining >= 0) return t('countdowns.days_since');
      return t('countdowns.days_until');
    }
    if (daysRemaining < 0) return t('countdowns.days_ago');
    if (daysRemaining === 0) return '';
    return t('countdowns.days_left');
  };

  const getDisplayValue = () => {
    if (isCountup) return displayDays;
    if (daysRemaining === 0) return t('countdowns.today');
    return Math.abs(daysRemaining);
  };

  const getNumberColor = () => {
    if (isCountup) return 'text-green-500';
    if (daysRemaining < 0) return 'text-red-500';
    if (daysRemaining === 0) return 'text-green-500';
    return 'text-purple-500';
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
            style={{ backgroundColor: countdown.color + '20' }}
          >
            {ICON_MAP[countdown.icon] || '🚩'}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">{countdown.title}</h3>
            {countdown.description && (
              <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{countdown.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700" title={t('common.edit')}>
            <PencilIcon className="w-4 h-4 text-gray-400 dark:text-gray-500" />
          </button>
          <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-50" title={t('common.delete')}>
            <TrashIcon className="w-4 h-4 text-red-400" />
          </button>
        </div>
      </div>

      {/* Days Display */}
      <div className="flex items-baseline gap-2 mb-3">
        <span className={`text-4xl font-bold ${getNumberColor()}`}>
          {getDisplayValue()}
        </span>
        <span className="text-gray-500 text-sm">{getStatusText()}</span>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
        <span>
          {new Date(countdown.targetDate).toLocaleDateString(undefined, {
            year: 'numeric', month: 'long', day: 'numeric',
          })}
          {countdown.targetTime && ` ${countdown.targetTime.slice(0, 5)}`}
        </span>
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
          isCountup ? 'bg-green-100 dark:bg-green-900/30 text-green-700' : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700'
        }`}>
          {isCountup ? t('countdowns.type_countup') : t('countdowns.type_countdown')}
        </span>
      </div>
    </div>
  );
}

// ==================== Main Page ====================
export default function CountdownsPage() {
  const { t } = useTranslation('common');
  const [showForm, setShowForm] = useState(false);
  const [editingCountdown, setEditingCountdown] = useState<Countdown | null>(null);

  const { data: countdowns = [], isLoading, isError } = useCountdowns();
  const createCountdown = useCreateCountdown();
  const updateCountdown = useUpdateCountdown();
  const deleteCountdown = useDeleteCountdown();

  const handleCreate = (params: CreateCountdownParams) => {
    createCountdown.mutate(params, {
      onError: (err) => {
        console.error('Failed to create countdown:', err);
        alert(`Failed to create: ${err instanceof Error ? err.message : String(err)}`);
      },
    });
  };

  const handleUpdate = (params: CreateCountdownParams) => {
    if (editingCountdown) {
      updateCountdown.mutate({ id: editingCountdown.id, ...params }, {
        onError: (err) => {
          console.error('Failed to update countdown:', err);
          alert(`Failed to update: ${err instanceof Error ? err.message : String(err)}`);
        },
      });
      setEditingCountdown(null);
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm(t('countdowns.delete_confirm'))) {
      deleteCountdown.mutate(id, {
        onError: (err) => {
          console.error('Failed to delete countdown:', err);
          alert(`Failed to delete: ${err instanceof Error ? err.message : String(err)}`);
        },
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-500">{t('common.loading')}</div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-red-500">Failed to load countdowns. Please try again.</div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{t('navigation.countdowns')}</h1>
        <button
          onClick={() => { setEditingCountdown(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          <span>{t('countdowns.new_countdown')}</span>
        </button>
      </div>

      {countdowns.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
          <ClockIcon className="w-16 h-16 mb-4 text-gray-300 dark:text-gray-600" />
          <p className="text-lg">{t('countdowns.no_countdowns')}</p>
          <button onClick={() => setShowForm(true)} className="mt-4 text-purple-500 hover:text-purple-600">
            {t('countdowns.create_first')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {countdowns.map((countdown) => (
            <CountdownCard
              key={countdown.id}
              countdown={countdown}
              onEdit={() => { setEditingCountdown(countdown); setShowForm(true); }}
              onDelete={() => handleDelete(countdown.id)}
            />
          ))}
        </div>
      )}

      <CountdownFormDialog
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditingCountdown(null); }}
        onSubmit={editingCountdown ? handleUpdate : handleCreate}
        countdown={editingCountdown}
      />
    </div>
  );
}
