import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type ViewMode = 'list' | 'calendar' | 'kanban' | 'matrix';

interface ViewState {
  viewMode: ViewMode;
  selectedDate: Date | null;
  selectedListId: string | null;
  filterStatus: 'all' | 'active' | 'completed';

  setViewMode: (mode: ViewMode) => void;
  setSelectedDate: (date: Date | null) => void;
  setSelectedListId: (id: string | null) => void;
  setFilterStatus: (status: 'all' | 'active' | 'completed') => void;
}

export const useViewStore = create<ViewState>()(
  persist(
    (set) => ({
      viewMode: 'list' as ViewMode,
      selectedDate: null,
      selectedListId: null,
      filterStatus: 'all',

      setViewMode: (viewMode) => set({ viewMode }),
      setSelectedDate: (selectedDate) => set({ selectedDate }),
      setSelectedListId: (selectedListId) => set({ selectedListId }),
      setFilterStatus: (filterStatus) => set({ filterStatus }),
    }),
    {
      name: 'mindless-view-settings',
      partialize: (state) => ({
        viewMode: state.viewMode,
        selectedListId: state.selectedListId,
      }),
      merge: (persisted: unknown, current: ViewState) => {
        const p = persisted as Partial<ViewState>;
        const validModes: ViewMode[] = ['list', 'calendar', 'kanban', 'matrix'];
        return {
          ...current,
          ...p,
          viewMode: validModes.includes(p.viewMode as ViewMode) ? p.viewMode! : 'list',
        };
      },
    }
  )
);
