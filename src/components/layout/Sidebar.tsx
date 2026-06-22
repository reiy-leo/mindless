import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import {
  HomeIcon, CheckSquareIcon, RepeatIcon, HourglassIcon, CogIcon,
  BookmarkIcon, StickyNote, UsersIcon, Film,
} from 'lucide-react';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useViewStore } from '@/stores/useViewStore';
import { useAppStore } from '@/stores/useAppStore';

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
  { path: '/tags', icon: BookmarkIcon, labelKey: 'navigation.tags' },
  { path: '/settings', icon: CogIcon, labelKey: 'navigation.settings' },
];

export default function Sidebar() {
  const { t } = useTranslation('common');
  const location = useLocation();
  const { selectedListId, setSelectedListId } = useViewStore();
  const sidebarMode = useAppStore((s) => s.sidebarMode);

  const handleOpenTagManagement = async () => {
    console.log('handleOpenTagManagement called');
    
    try {
      const existingWindow = await WebviewWindow.getByLabel('tag-management');
      console.log('existingWindow:', existingWindow);
      if (existingWindow) {
        await existingWindow.setFocus();
        return;
      }
    } catch (err) {
      console.log('getByLabel error (expected if window does not exist):', err);
    }

    console.log('Creating new tag-management window');
    const mainWindow = getCurrentWindow();
    const win = new WebviewWindow('tag-management', {
      url: '/dialog/tag-management',
      title: '',
      width: 640,
      height: 640,
      resizable: false,
      maximizable: false,
      minimizable: false,
      closable: false,
      alwaysOnTop: true,
      decorations: true,
      // transparent: true,
      titleBarStyle: "overlay",
      hiddenTitle: true,
      parent: mainWindow,
    });
    win.once('tauri://error', (e) => {
      console.error('Failed to create tag-management window:', e);
    });

    win.once('tauri://focus', async () => {
      await win.setShadow(true)
      console.log('Tag management window focused');
    });
    
    win.once('tauri://error', (e) => {
      console.error('Failed to create tag-picker window:', e);
    });
    
    win.once('tauri://created', () => {
      console.log('Tag picker window created successfully');
    });
  };

  const handleOpenSettings = async () => {
    try {
      const existingWindow = await WebviewWindow.getByLabel('settings');
      if (existingWindow) {
        await existingWindow.setFocus();
        return;
      }
    } catch {}

    try {
      const mainWindow = getCurrentWindow();
      const mainPos = await mainWindow.outerPosition();
      const mainSize = await mainWindow.outerSize();
      const scaleFactor = await mainWindow.scaleFactor();

      const logicalX = mainPos.x / scaleFactor;
      const logicalY = mainPos.y / scaleFactor;
      const logicalW = mainSize.width / scaleFactor;
      const logicalH = mainSize.height / scaleFactor;

      const winWidth = 800;
      const winHeight = 600;
      const x = Math.round(logicalX + (logicalW - winWidth) / 2);
      const y = Math.round(logicalY + (logicalH - winHeight) / 2);

      const win = new WebviewWindow('settings', {
        url: '/dialog/settings',
        title: '',
        width: winWidth,
        height: winHeight,
        x,
        y,
        resizable: false,
        parent: mainWindow,
        decorations: true,
        maximizable: false,
        minimizable: false,
        closable: false,
        titleBarStyle: "overlay",
        hiddenTitle: true,
        // shadow: true
      });
      win.once('tauri://error', (e) => {
        console.error('Failed to create settings window:', e);
      });
    } catch (err) {
      console.error('Error creating settings window:', err);
    }
  };

  return (
    <div role="navigation" aria-label="Main navigation" className="w-[70px] border-r border-white/10 flex flex-col pb-2 text-white" style={{ background: 'linear-gradient(to top, color-mix(in srgb, var(--theme-color) 50%, white), var(--theme-bg-70))' }}>
      {isMac && <div data-tauri-drag-region className="h-8" />}
      <nav className="flex flex-col px-1.5 space-y-2 flex-1" style={{ position: 'relative', zIndex: 1 }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.path === '/tasks'
            ? location.pathname === '/tasks'
            : location.pathname === item.path && !selectedListId;

          if (item.path === null) {
            return <div key="spacer" data-tauri-drag-region className='flex-1'></div>
          }

          if (!Icon) {
            return null;
          }

          const showIcon = sidebarMode === 'icon' || sidebarMode === 'both';
          const showText = sidebarMode === 'text' || sidebarMode === 'both';

          const isSquare = sidebarMode === 'icon' || sidebarMode === 'text';

          const buttonClass = `flex items-center justify-center gap-1 rounded-lg transition-colors text-sm text-white cursor-pointer ${
            isSquare ? 'aspect-square' : 'flex-col px-2 py-2'
          } ${
            isActive
              ? 'bg-white/25'
              : 'hover:bg-white/15'
          }`;

          if (item.path === '/tags') {
            return (
              <button
                key={item.path}
                onClick={handleOpenTagManagement}
                className={buttonClass}
                style={{ position: 'relative', zIndex: 2, color: isActive ? `hsl(from var(--theme-color) h s calc(l + 60))`: `hsl(from var(--theme-color) h s calc(l - 20))` }}
              >
                {showIcon && <Icon className="w-5 h-5" />}
                {showText && <p className={sidebarMode === 'both' ? 'text-[10px]' : sidebarMode === 'text' ? 'text-lg' : 'text-xs'}>{t(item.labelKey)}</p>}
              </button>
            );
          }

          if (item.path === '/settings') {
            return (
              <button
                key={item.path}
                onClick={handleOpenSettings}
                className={buttonClass}
                style={{ position: 'relative', zIndex: 2, color: isActive ? `hsl(from var(--theme-color) h s calc(l + 60))`: `hsl(from var(--theme-color) h s calc(l - 20))` }}
              >
                {showIcon && <Icon className="w-5 h-5" />}
                {showText && <p className={sidebarMode === 'both' ? 'text-[10px]' : sidebarMode === 'text' ? 'text-lg' : 'text-xs'}>{t(item.labelKey)}</p>}
              </button>
            );
          }

          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => {
                if (item.path !== '/tasks') setSelectedListId(null);
              }}
              aria-current={isActive ? 'page' : undefined}
              className={buttonClass}
              style={{
                color: isActive ? `hsl(from var(--theme-color) h s calc(l + 60))`: `hsl(from var(--theme-color) h s calc(l - 20))`
              }}
            >
              {showIcon && <Icon className="w-5 h-5" />}
              {showText && <p className={sidebarMode === 'both' ? 'text-[10px]' : sidebarMode === 'text' ? 'text-lg' : 'text-xs'}>{t(item.labelKey)}</p>}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
