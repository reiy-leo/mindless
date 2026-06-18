import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ArrowRightIcon } from '@heroicons/react/24/outline';
import HeatmapGrid from '@/components/HeatmapGrid';
import { useHeatmapData } from '@/queries/useHeatmapQueries';
import { useCountdowns } from '@/queries/useCountdownQueries';
import { useNotes } from '@/queries/useNoteQueries';
import { useMediaItems } from '@/queries/useMediaQueries';

const COUNTDOWN_ICONS: Record<string, string> = {
  flag: '🚩', heart: '❤️', star: '⭐', gift: '🎁', cake: '🎂',
  plane: '✈️', ring: '💍', baby: '👶', graduation: '🎓', house: '🏠',
};

export default function HomePage() {
  const { t } = useTranslation('common');

  const { data: heatmapData } = useHeatmapData();
  const { data: countdowns = [] } = useCountdowns();
  const { data: notes = [] } = useNotes();
  const { data: watchingMedia = [] } = useMediaItems({ status: 'normal' });

  const today = new Date();
  const monthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

  const thisMonthCountdowns = useMemo(() => {
    return countdowns
      .filter((cd) => cd.targetDate.startsWith(monthStr))
      .sort((a, b) => a.targetDate.localeCompare(b.targetDate));
  }, [countdowns, monthStr]);

  const pinnedNotes = useMemo(() => {
    return notes.filter((n) => n.isPinned && !n.isArchived && !n.deletedAt);
  }, [notes]);

  const getDaysRemaining = (targetDate: string) => {
    const [y, m, d] = targetDate.split('-').map(Number);
    const target = new Date(y, m - 1, d);
    return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const stripMarkdown = (text: string) => {
    return text.replace(/[#*_`~\[\]()]/g, '').replace(/\n+/g, ' ').trim();
  };

  return (
    <div className="flex-1 overflow-auto px-8 py-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Tasks Heatmap */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            {t('dashboard.heatmap.tasks')}
          </h2>
          <HeatmapGrid data={heatmapData?.tasks ?? {}} color="#3B82F6" />
        </div>

        {/* Habits Heatmap */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            {t('dashboard.heatmap.habits')}
          </h2>
          <HeatmapGrid data={heatmapData?.habits ?? {}} color="#3B82F6" />
        </div>

        {/* Bottom sections */}
        <div className="w-full space-y-6">
          {/* Currently Watching */}
          <section className="w-full">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {t('dashboard.watching')}
              </h2>
              <Link
                to="/media"
                className="text-xs text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1"
              >
                {t('dashboard.view_all')}
                <ArrowRightIcon className="w-3 h-3" />
              </Link>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
              {watchingMedia.length === 0 ? (
                <div className="p-4 text-center text-gray-400 dark:text-gray-500 text-xs">
                  {t('dashboard.no_watching')}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 p-4">
                  {watchingMedia.slice(0, 10).map((item) => (
                    <div key={item.id} className="group">
                      <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700 mb-2">
                        {item.cover ? (
                          <img
                            src={item.cover}
                            alt={item.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500 text-2xl">
                            {item.type === 'movie' ? '🎬' : '📺'}
                          </div>
                        )}
                        {item.rating && (
                          <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 text-xs font-medium rounded bg-black/60 text-white">
                            ⭐ {item.rating}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {item.title}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {item.type === 'movie' ? '🎬 电影' : '📺 剧集'}
                        {item.year ? ` · ${item.year}` : ''}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* This Month's Countdowns */}
          <section className="w-full">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {t('dashboard.this_month_countdowns')}
              </h2>
              <Link
                to="/countdowns"
                className="text-xs text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1"
              >
                {t('dashboard.view_all')}
                <ArrowRightIcon className="w-3 h-3" />
              </Link>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
              {thisMonthCountdowns.length === 0 ? (
                <div className="p-4 text-center text-gray-400 dark:text-gray-500 text-xs">
                  {t('dashboard.no_month_countdowns')}
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {thisMonthCountdowns.map((cd) => {
                    const days = getDaysRemaining(cd.targetDate);
                    return (
                      <div key={cd.id} className="flex items-center gap-3 px-3 py-2.5">
                        <span className="text-base">{COUNTDOWN_ICONS[cd.icon] || '🚩'}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                            {cd.title}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">{cd.targetDate}</p>
                        </div>
                        <span
                          className="text-sm font-bold"
                          style={{ color: days < 0 ? '#9CA3AF' : cd.color || '#F59E0B' }}
                        >
                          {days === 0 ? '🎉' : days > 0 ? `${days}${t('dashboard.days_left')}` : `${Math.abs(days)}${t('dashboard.days_ago')}`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* Pinned Notes */}
          <section className="w-full">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {t('dashboard.pinned_notes')}
              </h2>
              <Link
                to="/notes"
                className="text-xs text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1"
              >
                {t('dashboard.view_all')}
                <ArrowRightIcon className="w-3 h-3" />
              </Link>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
              {pinnedNotes.length === 0 ? (
                <div className="p-4 text-center text-gray-400 dark:text-gray-500 text-xs">
                  {t('dashboard.no_pinned_notes')}
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {pinnedNotes.slice(0, 5).map((note) => (
                    <div key={note.id} className="px-3 py-2.5">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {note.title}
                      </p>
                      {note.content && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">
                          {stripMarkdown(note.content).slice(0, 60)}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
