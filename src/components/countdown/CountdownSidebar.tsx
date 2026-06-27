import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Plus,
  Pencil,
  Trash2,
  Star,
  CheckCircle,
  Trash2 as DeletedIcon,
  List,
  AlertTriangle,
} from 'lucide-react';
import { useCountdownGroups, useCreateCountdownGroup, useUpdateCountdownGroup, useDeleteCountdownGroup } from '@/queries/useCountdownQueries';
import type { CountdownGroupWithCount } from '@/types/countdown';
import GroupFormPopup from '@/components/ui/GroupFormPopup';

export type SmartGroupId = 'all' | 'favorites' | 'completed' | 'missed' | 'deleted';

const SMART_GROUPS: { id: SmartGroupId | 'divider'; icon?: React.ComponentType<{ className?: string }>; labelKey?: string }[] = [
  { id: 'all', icon: List, labelKey: 'countdowns.smart_groups.all' },
  { id: 'favorites', icon: Star, labelKey: 'countdowns.smart_groups.favorites' },
  { id: 'divider' },
  { id: 'completed', icon: CheckCircle, labelKey: 'countdowns.smart_groups.completed' },
  { id: 'missed', icon: AlertTriangle, labelKey: 'countdowns.smart_groups.missed' },
  { id: 'deleted', icon: DeletedIcon, labelKey: 'countdowns.smart_groups.deleted' },
];

interface CountdownSidebarProps {
  selectedSmartGroup: SmartGroupId | null;
  selectedGroupId: string | null;
  onSelectSmartGroup: (groupId: SmartGroupId) => void;
  onSelectGroup: (groupId: string) => void;
  width: number;
}

export default function CountdownSidebar({
  selectedSmartGroup,
  selectedGroupId,
  onSelectSmartGroup,
  onSelectGroup,
  width,
}: CountdownSidebarProps) {
  const { t } = useTranslation('common');
  const { data: groups = [] } = useCountdownGroups();
  const createGroup = useCreateCountdownGroup();
  const updateGroup = useUpdateCountdownGroup();
  const deleteGroup = useDeleteCountdownGroup();

  const [groupsExpanded, setGroupsExpanded] = useState(true);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState<CountdownGroupWithCount | null>(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupColor, setNewGroupColor] = useState('#3B82F6');
  const [newGroupIcon, setNewGroupIcon] = useState('📅');
  const [groupFormTriggerRect, setGroupFormTriggerRect] = useState<DOMRect | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; group: CountdownGroupWithCount } | null>(null);

  const handleCreateGroup = async (result: { name: string; icon: string; color: string }) => {
    if (!result.name.trim()) return;
    await createGroup.mutateAsync({
      name: result.name,
      color: result.color,
      icon: result.icon,
    });
    setShowGroupForm(false);
  };

  const handleUpdateGroup = async (result: { name: string; icon: string; color: string }) => {
    if (!editingGroup || !result.name.trim()) return;
    await updateGroup.mutateAsync({
      id: editingGroup.id,
      name: result.name,
      color: result.color,
      icon: result.icon,
    });
    setEditingGroup(null);
    setShowGroupForm(false);
  };

  const handleDeleteGroup = async (id: string) => {
    if (window.confirm(t('countdowns.confirm_delete_group'))) {
      await deleteGroup.mutateAsync(id);
    }
  };

  const startEditGroup = (e: React.MouseEvent, group: CountdownGroupWithCount) => {
    setEditingGroup(group);
    setNewGroupName(group.name);
    setNewGroupColor(group.color || '#3B82F6');
    setNewGroupIcon(group.icon || '📅');
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setGroupFormTriggerRect(rect);
    setShowGroupForm(true);
  };

  const handleGroupContextMenu = (e: React.MouseEvent, group: CountdownGroupWithCount) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, group });
  };

  return (
    <div className="flex flex-col h-full border-r border-gray-200 dark:border-gray-700" 
      style={{ 
        width, 
        backgroundColor: `var(--theme-bg-20)`,
      }}
    >
      {/* Smart Groups */}
      <div className="p-3 border-b border-gray-200 dark:border-gray-700">
        <div className="space-y-1">
          {SMART_GROUPS.map((group) => {
            if (group.id === 'divider') {
              return <div key="divider" className="my-1 border-t border-gray-200 dark:border-gray-700" />;
            }
            const Icon = group.icon!;
            const isSelected = selectedSmartGroup === group.id;
            return (
              <button
                key={group.id}
                onClick={() => onSelectSmartGroup(group.id as SmartGroupId)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors`}
                style={{
                  backgroundColor: isSelected ? `color-mix(in srgb, var(--theme-bg-30) 40%, white)` : '',
                  // color: `hsl(from var(--theme-color) h s calc(calc(l - 20) + min(0, calc(l - 20)) * -1 + 100 * max(0, -1 * calc(l - 20)) / calc(l - 20)))`
                }}
              >
                <Icon className="w-4 h-4" />
                <span>{t(group.labelKey!)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Countdown Groups */}
      <div className="flex-1 overflow-auto p-3">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => setGroupsExpanded(!groupsExpanded)}
            className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider"
          >
            <span>{t('countdowns.groups')}</span>
            <span>{groupsExpanded ? '▼' : '▶'}</span>
          </button>
          <button
            onClick={(e) => {
              setEditingGroup(null);
              setNewGroupName('');
              setNewGroupColor('#3B82F6');
              setNewGroupIcon('📅');
              setGroupFormTriggerRect(e.currentTarget.getBoundingClientRect());
              setShowGroupForm(true);
            }}
            className="p-1 rounded"
            title={t('countdowns.new_group')}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {groupsExpanded && (
          <div className="space-y-1">
            {groups.map((group) => (
              <div
                key={group.id}
                className={`group flex items-center justify-between px-2 py-1.5 rounded-md text-sm cursor-pointer transition-colors` }
                onClick={() => onSelectGroup(group.id)}
                onContextMenu={(e) => handleGroupContextMenu(e, group)}
                style={{ 
                  backgroundColor: `${selectedGroupId ===  group.id ? 'color-mix(in srgb, var(--theme-bg-30) 40%, white)' : ''}`
                }}
              >
                <div className="flex items-center gap-2">
                  <span>{group.icon || '📅'}</span>
                  <span>{group.name}</span>
                  {group.count > 0 && (
                    <span className="text-xs text-gray-400 dark:text-gray-500">({group.count})</span>
                  )}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                  {!group.isPreset && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startEditGroup(e, group);
                        }}
                        className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                        title={t('countdowns.edit_group')}
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteGroup(group.id);
                        }}
                        className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                        title={t('countdowns.delete_group')}
                      >
                        <Trash2 className="w-3 h-3 text-red-400" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Group Form Popup */}
        <GroupFormPopup
          isOpen={showGroupForm}
          onClose={() => {
            setShowGroupForm(false);
            setEditingGroup(null);
          }}
          onSubmit={editingGroup ? handleUpdateGroup : handleCreateGroup}
          triggerRect={groupFormTriggerRect}
          name={newGroupName}
          icon={newGroupIcon}
          color={newGroupColor}
          namePlaceholder={t('countdowns.group_name_placeholder')}
          isEditing={!!editingGroup}
        />

        {/* Group Context Menu */}
        {contextMenu && (
          <>
            <div className="fixed inset-0 z-50" onClick={() => setContextMenu(null)} />
            <div
              className="fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 min-w-[160px]"
              style={{ left: contextMenu.x, top: contextMenu.y }}
            >
              <button
                onClick={() => {
                  startEditGroup({ currentTarget: document.elementFromPoint(contextMenu.x, contextMenu.y) } as unknown as React.MouseEvent, contextMenu.group);
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <Pencil className="w-4 h-4" />
                {t('countdowns.edit_group')}
              </button>
              {!contextMenu.group.isPreset && (
                <>
                  <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                  <button
                    onClick={() => {
                      handleDeleteGroup(contextMenu.group.id);
                      setContextMenu(null);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    {t('countdowns.delete_group')}
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
