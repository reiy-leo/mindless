import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Plus, Trash2, X,
  ChevronDown, ChevronRight, Tag as TagLucide, GripVertical,
} from 'lucide-react';
import {
  DndContext, closestCorners, PointerSensor, useSensor, useSensors,
  type DragEndEvent, type DragOverEvent,
} from '@dnd-kit/core';
import {
  SortableContext, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useTasks } from '@/queries/useTaskQueries';
import {
  useTags, useCreateTag, useUpdateTag, useDeleteTag, useMoveTags,
} from '@/queries/useTaskQueries';
import type { Tag } from '@/types/tag';
import EmojiPickerButton from '@/components/EmojiPickerButton';

// ==================== Constants ====================

const PRESET_COLORS = [
  '#EF4444', '#F59E0B', '#10B981', '#3B82F6',
  '#8B5CF6', '#EC4899', '#6366F1', '#14B8A6',
];

// ==================== Flatten Tree Helper ====================

function flattenTree(tags: Tag[], collapsedIds: Set<string>): Tag[] {
  const result: Tag[] = [];
  const rootTags = tags.filter((t) => !t.parentId);
  const walk = (tag: Tag) => {
    result.push(tag);
    if (!collapsedIds.has(tag.id)) {
      const children = tags.filter((c) => c.parentId === tag.id);
      children.forEach(walk);
    }
  };
  rootTags.forEach(walk);
  return result;
}

// ==================== Context Menu ====================

function ContextMenu({
  x, y, tag, allTags, onClose, onDissolve, onMoveForward, onMoveBackward,
  canMoveForward, canMoveBackward, onAddChild, onDelete, onPromote, canPromote,
}: {
  x: number;
  y: number;
  tag: Tag;
  allTags: Tag[];
  onClose: () => void;
  onDissolve: (tag: Tag) => void;
  onMoveForward: (tag: Tag) => void;
  onMoveBackward: (tag: Tag) => void;
  canMoveForward: boolean;
  canMoveBackward: boolean;
  onAddChild: (tag: Tag) => void;
  onDelete: (tag: Tag) => void;
  onPromote: (tag: Tag) => void;
  canPromote: boolean;
}) {
  const { t } = useTranslation('common');
  const ref = useRef<HTMLDivElement>(null);
  const [adjustedPos, setAdjustedPos] = useState({ left: x, top: y });

  useEffect(() => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const menuH = rect.height;
      const menuW = rect.width;
      const left = x + menuW > window.innerWidth ? x - menuW : x;
      const top = y + menuH > window.innerHeight ? y - menuH : y;
      setAdjustedPos({ left: Math.max(0, left), top: Math.max(0, top) });
    }
  }, [x, y]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const hasChildren = allTags.some((t) => t.parentId === tag.id);

  return (
    <div
      ref={ref}
      className="fixed z-[100] bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 min-w-[140px]"
      style={{ left: adjustedPos.left, top: adjustedPos.top }}
    >
      <button
        onClick={() => { onAddChild(tag); onClose(); }}
        className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
      >
        <span className="text-xs">＋</span>
        {t('tags.add_subtag')}
      </button>
      {canPromote && (
        <button
          onClick={() => { onPromote(tag); onClose(); }}
          className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
        >
          <span className="text-xs">⤒</span>
          {t('tags.promote')}
        </button>
      )}
      {hasChildren && (
        <button
          onClick={() => { onDissolve(tag); onClose(); }}
          className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
        >
          <span className="text-xs">⚡</span>
          {t('tags.dissolve')}
        </button>
      )}
      <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
      <button
        onClick={() => { onMoveForward(tag); onClose(); }}
        disabled={!canMoveForward}
        className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <span className="text-xs">↑</span>
        {t('tags.move_forward')}
      </button>
      <button
        onClick={() => { onMoveBackward(tag); onClose(); }}
        disabled={!canMoveBackward}
        className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <span className="text-xs">↓</span>
        {t('tags.move_backward')}
      </button>
      <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
      <button
        onClick={() => { onDelete(tag); onClose(); }}
        className="w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2"
      >
        <Trash2 className="w-3.5 h-3.5" />
        {t('common.delete')}
      </button>
    </div>
  );
}

// ==================== Tag Row (display only) ====================

function TagRow({
  tag,
  tagTaskCounts,
  hasChildren,
  isCollapsed,
  toggleCollapse,
  onEdit,
  onContextMenu,
  isSelected,
  dragHandle,
  isDragging,
  setNodeRef,
  style,
}: {
  tag: Tag;
  tagTaskCounts: Record<string, number>;
  hasChildren: boolean;
  isCollapsed: boolean;
  toggleCollapse: (id: string) => void;
  onEdit: (tag: Tag) => void;
  onContextMenu: (e: React.MouseEvent, tag: Tag) => void;
  isSelected: boolean;
  dragHandle?: React.HTMLAttributes<HTMLElement> & Record<string, unknown>;
  isDragging?: boolean;
  setNodeRef?: (node: HTMLElement | null) => void;
  style?: React.CSSProperties;
}) {
  const { t } = useTranslation('common');
  const count = tagTaskCounts[tag.id] || 0;

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, opacity: isDragging ? 0.4 : 1, zIndex: isDragging ? 50 : 'auto' as const, paddingLeft: `${tag.level * 16}px` }}
      className={`group flex items-center gap-3 pr-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
        isSelected
          ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
          : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
      }`}
      onClick={() => onEdit(tag)}
      onContextMenu={(e) => onContextMenu(e, tag)}
    >
      {/* Drag handle */}
      <button
        {...dragHandle}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing flex-shrink-0 touch-none"
        title={t('tags.drag_to_reorder')}
      >
        <GripVertical className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
      </button>

      {/* Emoji / Collapse (shared position) */}
      <span className="relative w-5 h-5 flex-shrink-0 flex items-center justify-center">
        <span className={`text-base ${hasChildren ? 'group-hover:invisible' : ''}`}>{tag.emoji || '🏷️'}</span>
        {hasChildren && (
          <button
            onClick={(e) => { e.stopPropagation(); toggleCollapse(tag.id); }}
            className="absolute inset-0 flex items-center justify-center rounded hover:bg-gray-200 dark:hover:bg-gray-700 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400 dark:text-gray-500" />
            )}
          </button>
        )}
      </span>

      {/* Color chip */}
      <span
        className="w-3 h-3 rounded-full flex-shrink-0"
        style={{ backgroundColor: tag.color || '#3B82F6' }}
      />

      {/* Name */}
      <span className="text-sm text-gray-900 dark:text-gray-100 flex-1 truncate">
        {tag.name}
      </span>

      {/* Task count */}
      {count > 0 && (
        <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full flex-shrink-0">
          {t('tags.task_count', { count })}
        </span>
      )}
    </div>
  );
}

// ==================== Sortable Tag Row ====================

function SortableTagRow({
  tag,
  allTags,
  tagTaskCounts,
  collapsedIds,
  toggleCollapse,
  onEdit,
  onContextMenu,
  selectedTagId,
}: {
  tag: Tag;
  allTags: Tag[];
  tagTaskCounts: Record<string, number>;
  collapsedIds: Set<string>;
  toggleCollapse: (id: string) => void;
  onEdit: (tag: Tag) => void;
  onContextMenu: (e: React.MouseEvent, tag: Tag) => void;
  selectedTagId: string | null;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tag.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const children = allTags.filter((c) => c.parentId === tag.id);
  const hasChildren = children.length > 0;
  const isCollapsed = collapsedIds.has(tag.id);

  return (
    <>
      <TagRow
        tag={tag}
        tagTaskCounts={tagTaskCounts}
        hasChildren={hasChildren}
        isCollapsed={isCollapsed}
        toggleCollapse={toggleCollapse}
        onEdit={onEdit}
        onContextMenu={onContextMenu}
        isSelected={selectedTagId === tag.id}
        dragHandle={{ ...attributes, ...listeners }}
        isDragging={isDragging}
        setNodeRef={setNodeRef}
        style={style}
      />
      {hasChildren && !isCollapsed && (
        <div>
          {children.map((child) => (
            <SortableTagRow
              key={child.id}
              tag={child}
              allTags={allTags}
              tagTaskCounts={tagTaskCounts}
              collapsedIds={collapsedIds}
              toggleCollapse={toggleCollapse}
              onEdit={onEdit}
              onContextMenu={onContextMenu}
              selectedTagId={selectedTagId}
            />
          ))}
        </div>
      )}
    </>
  );
}

// ==================== Tag Edit Panel ====================

function TagEditPanel({
  tag,
  allTags,
  mode,
  parentForNew,
  onClose,
  onCreated,
}: {
  tag: Tag | null;
  allTags: Tag[];
  mode: 'edit' | 'create' | 'empty';
  parentForNew: Tag | null;
  onClose: () => void;
  onCreated: (tag: Tag) => void;
}) {
  const { t } = useTranslation('common');
  const updateTag = useUpdateTag();
  const createTag = useCreateTag();

  const [name, setName] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[3]);
  const [emoji, setEmoji] = useState('🏷️');

  // Reset form when tag or mode changes
  useEffect(() => {
    if (mode === 'edit' && tag) {
      setName(tag.name);
      setColor(tag.color || PRESET_COLORS[3]);
      setEmoji(tag.emoji || '🏷️');
    } else if (mode === 'create') {
      setName('');
      setColor(PRESET_COLORS[3]);
      setEmoji('🏷️');
    }
  }, [tag, mode]);

  if (mode === 'empty') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
        <TagLucide className="w-16 h-16 mb-4 text-gray-200 dark:text-gray-700" />
        <p className="text-sm">{t('tags.select_to_edit')}</p>
      </div>
    );
  }

  const isEditing = mode === 'edit' && !!tag;
  const parentTag = isEditing
    ? (tag.parentId ? allTags.find((t) => t.id === tag.parentId) : null)
    : parentForNew;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (isEditing && tag) {
      updateTag.mutate(
        { id: tag.id, name: name.trim(), color, emoji },
        { onSuccess: onClose },
      );
    } else {
      createTag.mutate(
        {
          name: name.trim(),
          color,
          emoji,
          parentId: parentForNew?.id || undefined,
          level: parentForNew ? parentForNew.level + 1 : 0,
        },
        { onSuccess: onCreated },
      );
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-lg">{emoji}</span>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {isEditing ? t('tags.edit_tag') : t('tags.new_tag')}
          </h2>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-6 space-y-5 flex-1">
        {/* Parent indicator */}
        {parentTag && (
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2">
            <span>{parentTag.emoji}</span>
            <span>{parentTag.name}</span>
            <span className="text-gray-400 dark:text-gray-500">→</span>
            <span className="text-gray-600 dark:text-gray-300">
              {isEditing ? tag.name : t('tags.creating_subtag')}
            </span>
          </div>
        )}

        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('tags.name')}
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('tags.name_placeholder')}
            required
            autoFocus
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Emoji */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('tags.emoji')}
          </label>
          <EmojiPickerButton value={emoji} onChange={setEmoji} />
        </div>

        {/* Color */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('tags.color')}
          </label>
          <div className="flex flex-wrap gap-2">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`w-9 h-9 rounded-full transition-all ${
                  color === c
                    ? 'ring-2 ring-offset-2 ring-blue-500 dark:ring-offset-gray-800'
                    : 'hover:scale-110'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        {/* Preview */}
        <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <span className="text-lg">{emoji}</span>
          <span
            className="px-2.5 py-1 rounded-full text-sm text-white font-medium"
            style={{ backgroundColor: color }}
          >
            {name || t('tags.preview')}
          </span>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={!name.trim()}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isEditing ? t('common.save') : t('common.create')}
          </button>
        </div>
      </form>
    </div>
  );
}

// ==================== Main Page ====================

export default function TagsPage() {
  const { t } = useTranslation('common');
  const { data: tags = [], isLoading } = useTags();
  const { data: tasks = [] } = useTasks();
  const deleteTag = useDeleteTag();
  const moveTags = useMoveTags();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState<'edit' | 'create' | 'empty'>('empty');
  const [parentForNew, setParentForNew] = useState<Tag | null>(null);
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    tag: Tag;
  } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const selectedTag = useMemo(() => {
    return tags.find((t) => t.id === selectedTagId) || null;
  }, [tags, selectedTagId]);

  // Determine the effective mode
  const effectiveMode = useMemo(() => {
    if (editMode === 'create') return 'create';
    if (selectedTagId && selectedTag) return 'edit';
    return 'empty';
  }, [editMode, selectedTagId, selectedTag]);

  // Compute task counts per tag
  const tagTaskCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    tasks.forEach((task) => {
      if (!task.tagIds) return;
      const ids = task.tagIds.split(',').filter(Boolean);
      ids.forEach((id) => {
        counts[id] = (counts[id] || 0) + 1;
      });
    });
    return counts;
  }, [tasks]);

  // Filter tags by search
  const filteredTags = useMemo(() => {
    if (!searchQuery.trim()) return tags;
    const q = searchQuery.toLowerCase();
    return tags.filter((tag) => tag.name.toLowerCase().includes(q));
  }, [tags, searchQuery]);

  // Build tree: get root tags (no parent)
  const rootTags = useMemo(() => {
    return filteredTags.filter((tag) => !tag.parentId);
  }, [filteredTags]);

  // Flatten tree for SortableContext
  const flatTree = useMemo(() => {
    return flattenTree(filteredTags, collapsedIds);
  }, [filteredTags, collapsedIds]);

  const toggleCollapse = (id: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Get all descendant IDs recursively
  const getDescendants = useCallback((tagId: string, allTags: Tag[]): Tag[] => {
    const result: Tag[] = [];
    const children = allTags.filter((t) => t.parentId === tagId);
    for (const child of children) {
      result.push(child);
      result.push(...getDescendants(child.id, allTags));
    }
    return result;
  }, []);

  // Get siblings (same parent) sorted by sortOrder
  const getSiblings = useCallback((tag: Tag): Tag[] => {
    return tags
      .filter((t) => t.parentId === tag.parentId)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [tags]);

  const handleDragOver = useCallback((_event: DragOverEvent) => {
    // No-op: just tracking position for visual feedback
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeId = active.id as string;
    const overId = over.id as string;
    const activeTag = tags.find((t) => t.id === activeId);
    const overTag = tags.find((t) => t.id === overId);
    if (!activeTag || !overTag) return;

    const translated = active.rect.current.translated;
    const initial = active.rect.current.initial;
    const depthDelta = Math.round(((translated?.left ?? 0) - (initial?.left ?? 0)) / 24);
    const newLevel = Math.max(0, Math.min(3, activeTag.level + depthDelta));

    let newParentId: string | undefined;

    const overIdx = flatTree.findIndex((t) => t.id === overId);
    const activeIdx = flatTree.findIndex((t) => t.id === activeId);

    if (newLevel > overTag.level) {
      newParentId = overId;
    } else if (newLevel === overTag.level) {
      newParentId = overTag.parentId;
    } else {
      let target: Tag | undefined = overTag;
      const stepsUp = overTag.level - newLevel;
      for (let i = 0; i < stepsUp && target; i++) {
        target = tags.find((t) => t.id === target?.parentId);
      }
      newParentId = target?.parentId;
    }

    const descendants = getDescendants(activeId, tags);
    const maxDescendantDepth = descendants.reduce((max, d) => Math.max(max, d.level - activeTag.level), 0);
    const effectiveLevel = Math.min(newLevel, 3 - maxDescendantDepth);

    const descendantIds = new Set(descendants.map((d) => d.id));
    if (newParentId && descendantIds.has(newParentId)) {
      newParentId = activeTag.parentId;
    }

    // Calculate sortOrder: insert between neighbors based on drag direction
    const targetParentId = newParentId ?? '';
    const siblings = tags
      .filter((t) => t.parentId === (targetParentId || undefined) && t.id !== activeId)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    let sortOrder: number;
    if (siblings.length === 0) {
      sortOrder = 0;
    } else if (activeIdx < overIdx) {
      // Dragging down: place after over item
      const overSiblingIdx = siblings.findIndex((s) => s.id === overId);
      if (overSiblingIdx >= 0 && overSiblingIdx < siblings.length - 1) {
        sortOrder = (siblings[overSiblingIdx].sortOrder + siblings[overSiblingIdx + 1].sortOrder) / 2;
      } else {
        sortOrder = siblings[siblings.length - 1].sortOrder + 1;
      }
    } else {
      // Dragging up: place before over item
      const overSiblingIdx = siblings.findIndex((s) => s.id === overId);
      if (overSiblingIdx > 0) {
        sortOrder = (siblings[overSiblingIdx - 1].sortOrder + siblings[overSiblingIdx].sortOrder) / 2;
      } else {
        sortOrder = siblings[0].sortOrder - 1;
      }
    }

    const levelDelta = effectiveLevel - activeTag.level;
    const moves: { id: string; parentId?: string | null; level?: number; sortOrder?: number }[] = [
      {
        id: activeId,
        parentId: newParentId ?? '',
        level: effectiveLevel,
        sortOrder,
      },
    ];

    for (const desc of descendants) {
      moves.push({
        id: desc.id,
        level: desc.level + levelDelta,
        sortOrder: undefined,
        parentId: undefined,
      });
    }

    moveTags.mutate(moves);
  }, [tags, flatTree, moveTags, getDescendants]);

  // Context menu handlers
  const handleContextMenu = useCallback((e: React.MouseEvent, tag: Tag) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, tag });
  }, []);

  const handleDissolve = useCallback((tag: Tag) => {
    const children = tags.filter((t) => t.parentId === tag.id);
    if (children.length === 0) return;

    if (!window.confirm(t('tags.dissolve_confirm', { name: tag.name }))) return;

    // Promote children to the dissolved tag's parent
    const moves = children.map((child, i) => ({
      id: child.id,
      parentId: tag.parentId || '',
      level: tag.level,
      sortOrder: tag.sortOrder + 0.001 * (i + 1),
    }));
    moveTags.mutate(moves, {
      onSuccess: () => {
        deleteTag.mutate(tag.id, {
          onSuccess: () => {
            if (selectedTagId === tag.id) {
              setSelectedTagId(null);
              setEditMode('empty');
            }
          },
        });
      },
    });
  }, [tags, moveTags, deleteTag, selectedTagId, t]);

  const handleMoveForward = useCallback((tag: Tag) => {
    const siblings = getSiblings(tag);
    const idx = siblings.findIndex((s) => s.id === tag.id);
    if (idx <= 0) return;

    const prev = siblings[idx - 1];
    moveTags.mutate([
      { id: tag.id, sortOrder: prev.sortOrder },
      { id: prev.id, sortOrder: tag.sortOrder },
    ]);
  }, [getSiblings, moveTags]);

  const handleMoveBackward = useCallback((tag: Tag) => {
    const siblings = getSiblings(tag);
    const idx = siblings.findIndex((s) => s.id === tag.id);
    if (idx < 0 || idx >= siblings.length - 1) return;

    const next = siblings[idx + 1];
    moveTags.mutate([
      { id: tag.id, sortOrder: next.sortOrder },
      { id: next.id, sortOrder: tag.sortOrder },
    ]);
  }, [getSiblings, moveTags]);

  const canMoveForward = useCallback((tag: Tag): boolean => {
    const siblings = getSiblings(tag);
    const idx = siblings.findIndex((s) => s.id === tag.id);
    return idx > 0;
  }, [getSiblings]);

  const canMoveBackward = useCallback((tag: Tag): boolean => {
    const siblings = getSiblings(tag);
    const idx = siblings.findIndex((s) => s.id === tag.id);
    return idx >= 0 && idx < siblings.length - 1;
  }, [getSiblings]);

  const canPromote = useCallback((tag: Tag): boolean => {
    return !!tag.parentId;
  }, []);

  const handlePromote = useCallback((tag: Tag) => {
    if (!tag.parentId) return;
    const parent = tags.find((t) => t.id === tag.parentId);
    const grandParentId = parent?.parentId || '';
    const newLevel = tag.level - 1;
    moveTags.mutate([{ id: tag.id, parentId: grandParentId, level: newLevel }]);
  }, [tags, moveTags]);

  const handleCreateChild = (parent: Tag) => {
    setSelectedTagId(null);
    setEditMode('create');
    setParentForNew(parent);
  };

  const handleCreateRoot = () => {
    setSelectedTagId(null);
    setEditMode('create');
    setParentForNew(null);
  };

  const handleDelete = (tag: Tag) => {
    const children = tags.filter((c) => c.parentId === tag.id);
    const msg = children.length > 0
      ? t('tags.delete_confirm_with_children', { name: tag.name, count: children.length })
      : t('tags.delete_confirm', { name: tag.name });

    if (window.confirm(msg)) {
      deleteTag.mutate(tag.id, {
        onSuccess: () => {
          if (selectedTagId === tag.id) {
            setSelectedTagId(null);
            setEditMode('empty');
          }
        },
      });
    }
  };

  const handleSelectTag = (tag: Tag) => {
    if (selectedTagId === tag.id) {
      setSelectedTagId(null);
      setEditMode('empty');
      setParentForNew(null);
    } else {
      setSelectedTagId(tag.id);
      setEditMode('edit');
      setParentForNew(null);
    }
  };

  const handleCloseEdit = () => {
    setSelectedTagId(null);
    setEditMode('empty');
    setParentForNew(null);
  };

  const handleTagCreated = (tag: Tag) => {
    setSelectedTagId(tag.id);
    setEditMode('edit');
    setParentForNew(null);
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-500 dark:text-gray-400">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left panel: Tag tree */}
      <div className="w-80 flex flex-col border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex-shrink-0">
        {/* Header */}
        <div data-tauri-drag-region className="px-4 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h1 data-tauri-drag-region className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {t('tags.title')}
            </h1>
            <button
              onClick={handleCreateRoot}
              className="p-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <input
            type="text"
            placeholder={t('tags.search_placeholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Tag tree */}
        <div className="flex-1 overflow-auto p-2">
          {rootTags.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400 px-4">
              <TagLucide className="w-10 h-10 mb-3 text-gray-300 dark:text-gray-600" />
              <p className="text-sm text-center">
                {searchQuery ? t('tags.no_results') : t('tags.no_tags')}
              </p>
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCorners} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
              <SortableContext items={flatTree.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-0.5">
                    {rootTags.map((tag) => (
                      <SortableTagRow
                        key={tag.id}
                        tag={tag}
                        allTags={filteredTags}
                        tagTaskCounts={tagTaskCounts}
                        collapsedIds={collapsedIds}
                        toggleCollapse={toggleCollapse}
                        onEdit={handleSelectTag}
                        onContextMenu={handleContextMenu}
                        selectedTagId={selectedTagId}
                      />
                    ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>

      {/* Right panel: Edit form */}
      <div className="flex-1 bg-gray-50 dark:bg-gray-900 flex flex-col">
        <TagEditPanel
          tag={selectedTag}
          allTags={tags}
          mode={effectiveMode}
          parentForNew={parentForNew}
          onClose={handleCloseEdit}
          onCreated={handleTagCreated}
        />
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          tag={contextMenu.tag}
          allTags={tags}
          onClose={() => setContextMenu(null)}
          onDissolve={handleDissolve}
          onMoveForward={handleMoveForward}
          onMoveBackward={handleMoveBackward}
          canMoveForward={canMoveForward(contextMenu.tag)}
          canMoveBackward={canMoveBackward(contextMenu.tag)}
          onAddChild={handleCreateChild}
          onDelete={handleDelete}
          onPromote={handlePromote}
          canPromote={canPromote(contextMenu.tag)}
        />
      )}
    </div>
  );
}
