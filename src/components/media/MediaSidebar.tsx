import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  StarIcon,
  BookOpenIcon,
  ArchiveBoxIcon,
  CheckCircleIcon,
  FilmIcon,
} from '@heroicons/react/24/outline';
import { useMediaGroups, useCreateMediaGroup, useUpdateMediaGroup, useDeleteMediaGroup } from '@/queries/useMediaQueries';
import type { MediaGroup } from '@/types/media';

type SmartGroupId = 'all' | 'favorites' | 'normal' | 'watched' | 'archived';

const SMART_GROUPS: { id: SmartGroupId; icon: React.ComponentType<{ className?: string }>; labelKey: string }[] = [
  { id: 'all', icon: BookOpenIcon, labelKey: 'media.smart_groups.all' },
  { id: 'favorites', icon: StarIcon, labelKey: 'media.smart_groups.favorites' },
  { id: 'normal', icon: FilmIcon, labelKey: 'media.smart_groups.normal' },
  { id: 'watched', icon: CheckCircleIcon, labelKey: 'media.smart_groups.watched' },
  { id: 'archived', icon: ArchiveBoxIcon, labelKey: 'media.smart_groups.archived' },
];

interface MediaSidebarProps {
  selectedSmartGroup: SmartGroupId | null;
  selectedGroupId: string | null;
  onSelectSmartGroup: (groupId: SmartGroupId) => void;
  onSelectGroup: (groupId: string) => void;
  width: number;
}

export default function MediaSidebar({
  selectedSmartGroup,
  selectedGroupId,
  onSelectSmartGroup,
  onSelectGroup,
  width,
}: MediaSidebarProps) {
  const { t } = useTranslation('common');
  const { data: groups = [] } = useMediaGroups();
  const createGroup = useCreateMediaGroup();
  const updateGroup = useUpdateMediaGroup();
  const deleteGroup = useDeleteMediaGroup();

  const [groupsExpanded, setGroupsExpanded] = useState(true);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState<MediaGroup | null>(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupColor, setNewGroupColor] = useState('#3B82F6');
  const [newGroupIcon, setNewGroupIcon] = useState('🎬');

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    await createGroup.mutateAsync({
      name: newGroupName,
      color: newGroupColor,
      icon: newGroupIcon,
    });
    setNewGroupName('');
    setShowGroupForm(false);
  };

  const handleUpdateGroup = async () => {
    if (!editingGroup || !newGroupName.trim()) return;
    await updateGroup.mutateAsync({
      id: editingGroup.id,
      name: newGroupName,
      color: newGroupColor,
      icon: newGroupIcon,
    });
    setEditingGroup(null);
    setNewGroupName('');
    setShowGroupForm(false);
  };

  const handleDeleteGroup = async (id: string) => {
    if (window.confirm(t('media.message.confirm_delete_group'))) {
      await deleteGroup.mutateAsync(id);
    }
  };

  const startEditGroup = (group: MediaGroup) => {
    setEditingGroup(group);
    setNewGroupName(group.name);
    setNewGroupColor(group.color || '#3B82F6');
    setNewGroupIcon(group.icon || '🎬');
    setShowGroupForm(true);
  };

  return (
    <div className="flex flex-col h-full border-r border-gray-200 dark:border-gray-700" style={{ width }}>
      {/* Smart Groups */}
      <div className="p-3 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
          {t('media.title')}
        </h3>
        <div className="space-y-1">
          {SMART_GROUPS.map((group) => {
            const Icon = group.icon;
            const isSelected = selectedSmartGroup === group.id;
            return (
              <button
                key={group.id}
                onClick={() => onSelectSmartGroup(group.id)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${
                  isSelected
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{t(group.labelKey)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Media Groups */}
      <div className="flex-1 overflow-auto p-3">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => setGroupsExpanded(!groupsExpanded)}
            className="flex items-center gap-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider"
          >
            <span>{t('media.fields.group')}</span>
            <span>{groupsExpanded ? '▼' : '▶'}</span>
          </button>
          <button
            onClick={() => {
              setEditingGroup(null);
              setNewGroupName('');
              setNewGroupColor('#3B82F6');
              setNewGroupIcon('🎬');
              setShowGroupForm(true);
            }}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
            title={t('media.actions.new_group')}
          >
            <PlusIcon className="w-4 h-4" />
          </button>
        </div>

        {groupsExpanded && (
          <div className="space-y-1">
            {groups.map((group) => (
              <div
                key={group.id}
                className={`flex items-center justify-between px-2 py-1.5 rounded-md text-sm cursor-pointer transition-colors ${
                  selectedGroupId === group.id
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
                onClick={() => onSelectGroup(group.id)}
              >
                <div className="flex items-center gap-2">
                  <span>{group.icon || '🎬'}</span>
                  <span>{group.name}</span>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      startEditGroup(group);
                    }}
                    className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                    title={t('media.actions.edit_group')}
                  >
                    <PencilIcon className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteGroup(group.id);
                    }}
                    className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                    title={t('media.actions.delete_group')}
                  >
                    <TrashIcon className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Group Form */}
        {showGroupForm && (
          <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
            <input
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder={t('media.placeholder.title')}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded mb-2 bg-white dark:bg-gray-900"
            />
            <div className="flex gap-2 mb-2">
              <input
                type="color"
                value={newGroupColor}
                onChange={(e) => setNewGroupColor(e.target.value)}
                className="w-8 h-8 rounded cursor-pointer"
              />
              <input
                type="text"
                value={newGroupIcon}
                onChange={(e) => setNewGroupIcon(e.target.value)}
                placeholder="Icon"
                className="flex-1 px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={editingGroup ? handleUpdateGroup : handleCreateGroup}
                className="flex-1 px-3 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                {t('media.actions.save')}
              </button>
              <button
                onClick={() => {
                  setShowGroupForm(false);
                  setEditingGroup(null);
                }}
                className="flex-1 px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                {t('media.actions.cancel')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
