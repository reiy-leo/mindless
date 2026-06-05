import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PlusIcon, CalendarIcon } from '@heroicons/react/24/outline';
import { useCountdowns, useCreateCountdown } from '@/queries/useCountdownQueries';

export default function CountdownsPage() {
  const { t } = useTranslation('common');
  const [showNewForm, setShowNewForm] = useState(false);

  const { data: countdowns = [], isLoading } = useCountdowns();
  const createCountdown = useCreateCountdown();

  const handleCreateCountdown = (name: string, targetDate: string) => {
    createCountdown.mutate({
      name,
      targetDate,
      reminderEnabled: false,
    });
    setShowNewForm(false);
  };

  const getDaysRemaining = (targetDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(targetDate);
    target.setHours(0, 0, 0, 0);
    const diff = target.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{t('navigation.countdowns')}</h1>
        <button
          onClick={() => setShowNewForm(!showNewForm)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          <span>{t('countdowns.new_countdown')}</span>
        </button>
      </div>

      {/* New countdown form */}
      {showNewForm && (
        <div className="mb-6 p-6 bg-white rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">{t('countdowns.create_countdown')}</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const name = formData.get('name') as string;
              const targetDate = formData.get('targetDate') as string;
              if (name && targetDate) handleCreateCountdown(name, targetDate);
            }}
          >
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('countdowns.event_name')}
              </label>
              <input
                name="name"
                type="text"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('countdowns.target_date')}
              </label>
              <input
                name="targetDate"
                type="date"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
              >
                {t('common.create')}
              </button>
              <button
                type="button"
                onClick={() => setShowNewForm(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                {t('common.cancel')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Countdowns grid */}
      {countdowns.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
          <CalendarIcon className="w-16 h-16 mb-4 text-gray-300" />
          <p className="text-lg">{t('countdowns.no_countdowns')}</p>
          <button
            onClick={() => setShowNewForm(true)}
            className="mt-4 text-purple-500 hover:text-purple-600"
          >
            {t('countdowns.create_first')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {countdowns.map((countdown) => {
            const daysRemaining = getDaysRemaining(countdown.targetDate);
            return (
              <div
                key={countdown.id}
                className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {countdown.name}
                </h3>
                <div className="flex items-baseline gap-2">
                  <span
                    className={`text-4xl font-bold ${
                      daysRemaining < 0
                        ? 'text-red-500'
                        : daysRemaining === 0
                        ? 'text-green-500'
                        : 'text-purple-500'
                    }`}
                  >
                    {daysRemaining < 0
                      ? Math.abs(daysRemaining)
                      : daysRemaining === 0
                      ? t('countdowns.today')
                      : daysRemaining}
                  </span>
                  <span className="text-gray-500">
                    {daysRemaining < 0
                      ? t('countdowns.days_ago')
                      : daysRemaining === 0
                      ? ''
                      : t('countdowns.days_left')}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  {new Date(countdown.targetDate).toLocaleDateString()}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
