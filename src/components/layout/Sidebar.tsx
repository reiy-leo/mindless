import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import {
  HomeIcon, CheckSquareIcon, RepeatIcon, HourglassIcon, SettingsIcon,
  Tag,
} from 'lucide-react';
import { useViewStore } from '@/stores/useViewStore';

const isMac = navigator.userAgent.includes('Mac');

const navItems = [
  { path: '/', icon: HomeIcon, labelKey: 'navigation.home' },
  { path: '/tasks', icon: CheckSquareIcon, labelKey: 'navigation.tasks' },
  { path: '/habits', icon: RepeatIcon, labelKey: 'navigation.habits' },
  { path: '/countdowns', icon: HourglassIcon, labelKey: 'navigation.countdowns' },
  { path: '/tags', icon: Tag, labelKey: 'navigation.tags' },
  { path: '/settings', icon: SettingsIcon, labelKey: 'navigation.settings' },
];

export default function Sidebar() {
  const { t } = useTranslation('common');
  const location = useLocation();
  const { selectedListId, setSelectedListId } = useViewStore();

  return (
    <div role="navigation" aria-label="Main navigation" className="w-44 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
      {isMac && <div data-tauri-drag-region className="h-8" />}
      {/* Main navigation - this area is draggable */}
      <nav data-tauri-drag-region className="px-2 space-y-px flex-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path && !selectedListId;

          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => {
                if (item.path !== '/tasks') setSelectedListId(null);
              }}
              aria-current={isActive ? 'page' : undefined}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-colors text-sm ${
                isActive
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{t(item.labelKey)}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
