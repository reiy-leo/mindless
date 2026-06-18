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
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3 p-3">
                  {watchingMedia.slice(0, 20).map((item) => (
                    <Link key={item.id} to={`/media?itemId=${item.id}`} className="group block">
                      <div className="relative aspect-[2/3] rounded-md overflow-hidden bg-gray-200 dark:bg-gray-700 mb-1">
                        {item.cover ? (
                          <img
                            src={item.cover}
                            alt={item.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">
                            {item.type === 'movie' ? '🎬' : '📺'}
                          </div>
                        )}
                        {item.rating && (
                          <span className="absolute top-1 right-1 px-1 py-0.5 text-[10px] font-medium rounded bg-black/60 text-white">
                            ⭐ {item.rating}
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
                        {item.title}
                      </p>
                    </Link>
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
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 p-3">
                  {thisMonthCountdowns.map((cd) => {
                    const days = getDaysRemaining(cd.targetDate);
                    return (
                      <div key={cd.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{COUNTDOWN_ICONS[cd.icon] || '🚩'}</span>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate flex-1">
                            {cd.title}
                          </p>
                        </div>
                        <p className="text-xs text-gray-400 dark:text-gray-500">{cd.targetDate}</p>
                        <span
                          className="text-lg font-bold"
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
                    <Link key={note.id} to={`/notes?noteId=${note.id}`} className="block px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {note.title}
                      </p>
                      {note.content && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">
                          {stripMarkdown(note.content).slice(0, 60)}
                        </p>
                      )}
                    </Link>
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
