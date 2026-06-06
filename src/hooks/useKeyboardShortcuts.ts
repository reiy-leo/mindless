import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useViewStore } from '@/stores/useViewStore';

type ViewMode = 'list' | 'calendar' | 'kanban' | 'matrix';

const VIEW_KEYS: Record<string, ViewMode> = {
  '1': 'list',
  '2': 'calendar',
  '3': 'kanban',
  '4': 'matrix',
};

export function useKeyboardShortcuts() {
  const navigate = useNavigate();
  const location = useLocation();
  const setViewMode = useViewStore((s) => s.setViewMode);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      const tag = (e.target as HTMLElement)?.tagName;
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (e.target as HTMLElement)?.isContentEditable;

      // Cmd+,: Settings
      if (meta && e.key === ',') {
        e.preventDefault();
        navigate('/settings');
        return;
      }

      // Cmd+N: New task (navigate to tasks)
      if (meta && e.key === 'n') {
        e.preventDefault();
        if (location.pathname !== '/tasks') {
          navigate('/tasks');
        }
        // Dispatch custom event so TasksPage can open the new task form
        window.dispatchEvent(new CustomEvent('mindless:new-task'));
        return;
      }

      // Cmd+F: Open global search
      if (meta && e.key === 'f') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('mindless:global-search'));
        return;
      }

      // Escape: Close panels/modals
      if (e.key === 'Escape' && !isInput) {
        window.dispatchEvent(new CustomEvent('mindless:escape'));
        return;
      }

      // Number keys 1-4 for view switching (only on tasks page, not in inputs)
      if (!meta && !e.altKey && !e.shiftKey && !isInput && location.pathname === '/tasks') {
        const mode = VIEW_KEYS[e.key];
        if (mode) {
          e.preventDefault();
          setViewMode(mode);
          return;
        }
      }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [navigate, location.pathname, setViewMode]);
}
