import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import {
  HomeIcon, CheckSquareIcon, RepeatIcon, HourglassIcon, SettingsIcon,
  Tag, StickyNote, UsersIcon,
} from 'lucide-react';
import { useViewStore } from '@/stores/useViewStore';

const isMac = navigator.userAgent.includes('Mac');

const navItems = [
  { path: '/', icon: HomeIcon, labelKey: 'navigation.home' },
  { path: '/tasks', icon: CheckSquareIcon, labelKey: 'navigation.tasks' },
  { path: '/habits', icon: RepeatIcon, labelKey: 'navigation.habits' },
  { path: '/countdowns', icon: HourglassIcon, labelKey: 'navigation.countdowns' },
  { path: '/notes', icon: StickyNote, labelKey: 'navigation.notes' },
  { path: '/people', icon: UsersIcon, labelKey: 'navigation.people' },
  { path: null},
  { path: '/tags', icon: Tag, labelKey: 'navigation.tags' },
  { path: '/settings', icon: SettingsIcon, labelKey: 'navigation.settings' },
];

export default function Sidebar() {
  const { t } = useTranslation('common');
  const location = useLocation();
  const { selectedListId, setSelectedListId } = useViewStore();

  return (
    <div role="navigation" aria-label="Main navigation" className="w-23 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col pb-2">
      {isMac && <div data-tauri-drag-region className="h-8" />}
      {/* Main navigation - this area is draggable */}
      <nav className="flex flex-col px-2 space-y-2 flex-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path && !selectedListId;

          if (item.path === null) {
            return <div key="spacer" data-tauri-drag-region className='flex-1'></div>
          }

          if (!Icon) {
            return null;
          }

          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => {
                if (item.path !== '/tasks') setSelectedListId(null);
              }}
              aria-current={isActive ? 'page' : undefined}
              className={`flex flex-col items-center gap-1 px-2.5 py-2.5 rounded-lg transition-colors text-sm ${
                isActive
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <Icon className="w-5 h-5" />
              <p className="text-xs"> {t(item.labelKey)}</p>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
