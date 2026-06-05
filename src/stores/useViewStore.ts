import { create } from 'zustand';

type ViewMode = 'list' | 'calendar' | 'kanban' | 'grid';

interface ViewState {
  viewMode: ViewMode;
  selectedDate: Date | null;
  selectedListId: string | null;
  filterStatus: 'all' | 'active' | 'completed';
  searchQuery: string;

  setViewMode: (mode: ViewMode) => void;
  setSelectedDate: (date: Date | null) => void;
  setSelectedListId: (id: string | null) => void;
  setFilterStatus: (status: 'all' | 'active' | 'completed') => void;
  setSearchQuery: (query: string) => void;
}

export const useViewStore = create<ViewState>((set) => ({
  viewMode: 'list',
  selectedDate: null,
  selectedListId: null,
  filterStatus: 'all',
  searchQuery: '',

  setViewMode: (viewMode) => set({ viewMode }),
  setSelectedDate: (selectedDate) => set({ selectedDate }),
  setSelectedListId: (selectedListId) => set({ selectedListId }),
  setFilterStatus: (filterStatus) => set({ filterStatus }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
}));
