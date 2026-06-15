import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import {
  HomeIcon, CheckSquareIcon, RepeatIcon, HourglassIcon, SettingsIcon,
  Tag, StickyNote, UsersIcon, Film,
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
  { path: '/media', icon: Film, labelKey: 'navigation.media' },
  { path: null},
  { path: '/tags', icon: Tag, labelKey: 'navigation.tags' },
  { path: '/settings', icon: SettingsIcon, labelKey: 'navigation.settings' },
];

export default function Sidebar() {
  const { t } = useTranslation('common');
  const location = useLocation();
  const { selectedListId, setSelectedListId } = useViewStore();

  return (
    <div role="navigation" aria-label="Main navigation" className="w-[70px] border-r border-white/10 flex flex-col pb-2 text-white" style={{ background: 'linear-gradient(to bottom, color-mix(in srgb, var(--theme-color) 50%, white), var(--theme-bg-70))' }}>
      {isMac && <div data-tauri-drag-region className="h-8" />}
      <nav className="flex flex-col px-1.5 space-y-2 flex-1">
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
              className={`flex flex-col items-center gap-1 px-2 py-2 rounded-lg transition-colors text-sm text-white ${
                isActive
                  ? 'bg-white/25'
                  : 'hover:bg-white/15'
              }`}
            >
              <Icon className="w-5 h-5" />
              <p className="text-[10px]">{t(item.labelKey)}</p>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
