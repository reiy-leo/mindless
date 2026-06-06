import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  HomeIcon, CheckSquareIcon, RepeatIcon, HourglassIcon, SettingsIcon,
  ChevronDownIcon, ChevronRightIcon, PlusIcon, PencilIcon,
  CalendarIcon, ClockIcon, InboxIcon, LayoutGrid, Tag,
} from 'lucide-react';
import { useLists, useTasks } from '@/queries/useTaskQueries';
import { useViewStore } from '@/stores/useViewStore';
import ListFormDialog from '@/components/lists/ListFormDialog';
import type { List } from '@/types/task';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  folder: CheckSquareIcon,
  inbox: InboxIcon,
  star: CheckSquareIcon,
  heart: CheckSquareIcon,
  flag: CheckSquareIcon,
  book: CheckSquareIcon,
  briefcase: CheckSquareIcon,
  home: HomeIcon,
  target: CheckSquareIcon,
  lightning: CheckSquareIcon,
  calendar: CalendarIcon,
  clock: ClockIcon,
  eisenhower: LayoutGrid,
};

const SMART_LISTS = [
  { id: 'inbox', iconKey: 'inbox', labelKey: 'lists.inbox' },
  { id: 'smart:today', iconKey: 'calendar', labelKey: 'lists.today' },
  { id: 'smart:next7days', iconKey: 'clock', labelKey: 'lists.next_7_days' },
  { id: 'eisenhower', iconKey: 'eisenhower', labelKey: 'tasks.views.matrix' },
] as const;

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
  const navigate = useNavigate();
  const { selectedListId, setSelectedListId, setViewMode } = useViewStore();

  const [listsExpanded, setListsExpanded] = useState(true);
  const [showListForm, setShowListForm] = useState(false);
  const [editingList, setEditingList] = useState<List | null>(null);

  const { data: lists = [] } = useLists();
  const { data: tasks = [] } = useTasks();

  // Filter out seed lists (they're represented as smart lists or inbox)
  const seedIds = new Set(['inbox', 'today', 'next7days', 'eisenhower']);
  const userLists = useMemo(() => lists.filter((l) => !seedIds.has(l.id)), [lists]);

  // Task counts per list
  const listTaskCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const next7 = new Date(today);
    next7.setDate(next7.getDate() + 7);
    const next7Str = `${next7.getFullYear()}-${String(next7.getMonth() + 1).padStart(2, '0')}-${String(next7.getDate()).padStart(2, '0')}`;

    tasks.forEach((task) => {
      // Count by list_id (null/undefined = inbox)
      const lid = task.listId || 'inbox';
      counts[lid] = (counts[lid] || 0) + 1;

      // Smart list counts
      if (task.dueDate === todayStr) {
        counts['smart:today'] = (counts['smart:today'] || 0) + 1;
      }
      if (task.dueDate && task.dueDate >= todayStr && task.dueDate <= next7Str) {
        counts['smart:next7days'] = (counts['smart:next7days'] || 0) + 1;
      }
    });

    // Eisenhower count: all incomplete tasks
    counts['eisenhower'] = tasks.filter((t) => !t.isCompleted).length;

    return counts;
  }, [tasks]);

  const handleListClick = (listId: string) => {
    setSelectedListId(selectedListId === listId ? null : listId);
    // Auto-switch to matrix view for eisenhower
    if (listId === 'eisenhower' && selectedListId !== listId) {
      setViewMode('matrix');
    }
    // Navigate to tasks page when selecting a list
    if (location.pathname !== '/tasks') {
      navigate('/tasks');
    }
  };

  const handleCreateList = () => {
    setEditingList(null);
    setShowListForm(true);
  };

  const handleEditList = (e: React.MouseEvent, list: List) => {
    e.stopPropagation();
    setEditingList(list);
    setShowListForm(true);
  };

  const getIconComponent = (iconKey: string, color?: string) => {
    const Icon = ICON_MAP[iconKey] || CheckSquareIcon;
    if (color) {
      return <span style={{ color }}><Icon className="w-3.5 h-3.5" /></span>;
    }
    return <Icon className="w-3.5 h-3.5" />;
  };

  return (
    <div role="navigation" aria-label="Main navigation" className="w-56 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
      {/* Logo */}
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">Mindless</h1>
      </div>

      {/* Main navigation */}
      <nav className="px-3 space-y-0.5">
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
              className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg transition-colors text-sm ${
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

      {/* Divider */}
      <div className="mx-3 my-2 border-t border-gray-200 dark:border-gray-700" />

      {/* Lists section */}
      <div className="flex-1 overflow-auto px-3">
        {/* Section header */}
        <div className="flex items-center justify-between mb-1 px-1.5">
          <button
            onClick={() => setListsExpanded(!listsExpanded)}
            className="flex items-center gap-1 text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            {listsExpanded ? (
              <ChevronDownIcon className="w-3 h-3" />
            ) : (
              <ChevronRightIcon className="w-3 h-3" />
            )}
            {t('lists.title')}
          </button>
          <button
            onClick={handleCreateList}
            className="p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title={t('lists.create_list')}
          >
            <PlusIcon className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
          </button>
        </div>

        {listsExpanded && (
          <div className="space-y-px">
            {/* Smart lists */}
            {SMART_LISTS.map((smartList) => {
              const isActive = selectedListId === smartList.id;
              const count = listTaskCounts[smartList.id] || 0;

              return (
                <button
                  key={smartList.id}
                  onClick={() => handleListClick(smartList.id)}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg transition-colors text-left text-sm ${
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {getIconComponent(smartList.iconKey)}
                  <span className="flex-1 truncate">{t(smartList.labelKey)}</span>
                  {count > 0 && (
                    <span className="text-xs text-gray-400 dark:text-gray-500">{count}</span>
                  )}
                </button>
              );
            })}

            {/* User lists */}
            {userLists.map((list) => {
              const isActive = selectedListId === list.id;
              const count = listTaskCounts[list.id] || 0;

              return (
                <button
                  key={list.id}
                  onClick={() => handleListClick(list.id)}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg transition-colors text-left group text-sm ${
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: list.color || '#3B82F6' }}
                  />
                  <span className="flex-1 truncate">{list.name}</span>
                  {count > 0 && (
                    <span className="text-xs text-gray-400 dark:text-gray-500 group-hover:hidden">{count}</span>
                  )}
                  <span
                    onClick={(e) => handleEditList(e, list)}
                    className="hidden group-hover:block p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                  >
                    <PencilIcon className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* List Form Dialog */}
      <ListFormDialog
        isOpen={showListForm}
        onClose={() => { setShowListForm(false); setEditingList(null); }}
        list={editingList}
      />
    </div>
  );
}
