import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PlusIcon, FireIcon } from '@heroicons/react/24/outline';
import { useHabits, useCreateHabit, useCheckInHabit } from '@/queries/useHabitQueries';
import type { HabitFrequency } from '@/types/habit';

export default function HabitsPage() {
  const { t } = useTranslation('common');
  const [showNewHabitForm, setShowNewHabitForm] = useState(false);

  const { data: habits = [], isLoading } = useHabits();
  const createHabit = useCreateHabit();
  const checkIn = useCheckInHabit();

  const handleCreateHabit = (name: string, frequency: HabitFrequency) => {
    createHabit.mutate({
      name,
      frequency,
      reminderEnabled: false,
    });
    setShowNewHabitForm(false);
  };

  const handleCheckIn = (habitId: string) => {
    const today = new Date().toISOString().split('T')[0];
    checkIn.mutate({ habitId, date: today });
  };

  const getFrequencyLabel = (freq: HabitFrequency) => {
    switch (freq) {
      case 'daily':
        return t('habits.frequency.daily');
      case 'weekly':
        return t('habits.frequency.weekly');
      case 'monthly':
        return t('habits.frequency.monthly');
      default:
        return freq;
    }
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
        <h1 className="text-3xl font-bold text-gray-900">{t('navigation.habits')}</h1>
        <button
          onClick={() => setShowNewHabitForm(!showNewHabitForm)}
          className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          <span>{t('habits.new_habit')}</span>
        </button>
      </div>

      {/* New habit form */}
      {showNewHabitForm && (
        <div className="mb-6 p-6 bg-white rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">{t('habits.create_habit')}</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const name = formData.get('name') as string;
              const frequency = formData.get('frequency') as HabitFrequency;
              if (name) handleCreateHabit(name, frequency);
            }}
          >
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('habits.habit_name')}
              </label>
              <input
                name="name"
                type="text"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('habits.frequency')}
              </label>
              <select
                name="frequency"
                defaultValue="daily"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="daily">{t('habits.frequency.daily')}</option>
                <option value="weekly">{t('habits.frequency.weekly')}</option>
                <option value="monthly">{t('habits.frequency.monthly')}</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                {t('common.create')}
              </button>
              <button
                type="button"
                onClick={() => setShowNewHabitForm(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                {t('common.cancel')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Habits list */}
      {habits.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
          <p className="text-lg">{t('habits.no_habits')}</p>
          <button
            onClick={() => setShowNewHabitForm(true)}
            className="mt-4 text-green-500 hover:text-green-600"
          >
            {t('habits.create_first')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {habits.map((habit) => (
            <div
              key={habit.id}
              className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{habit.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {getFrequencyLabel(habit.frequency)}
                  </p>
                </div>
                {habit.streak > 0 && (
                  <div className="flex items-center gap-1 text-orange-500">
                    <FireIcon className="w-5 h-5" />
                    <span className="font-bold">{habit.streak}</span>
                  </div>
                )}
              </div>
              <button
                onClick={() => handleCheckIn(habit.id)}
                className="w-full py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                {t('habits.check_in')}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
