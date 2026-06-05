import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  PlusIcon, PencilIcon, TrashIcon, XMarkIcon,
  ChevronDownIcon, ChevronRightIcon, TagIcon,
} from '@heroicons/react/24/outline';
import { useTasks } from '@/queries/useTaskQueries';
import {
  useTags, useCreateTag, useUpdateTag, useDeleteTag,
} from '@/queries/useTaskQueries';
import type { Tag } from '@/types/tag';

// ==================== Tag Form Dialog ====================

const PRESET_COLORS = [
  '#EF4444', '#F59E0B', '#10B981', '#3B82F6',
  '#8B5CF6', '#EC4899', '#6366F1', '#14B8A6',
];

const PRESET_EMOJIS = [
  '🏷️', '🔴', '🟡', '🟢', '🔵', '🟣', '⭐', '🔥',
  '💼', '🏠', '📚', '🎯', '💡', '🚀', '❤️', '🎨',
];

function TagFormDialog({
  isOpen,
  onClose,
  tag,
  parentTag,
}: {
  isOpen: boolean;
  onClose: () => void;
  tag: Tag | null;
  parentTag: Tag | null;
}) {
  const { t } = useTranslation('common');
  const createTag = useCreateTag();
  const updateTag = useUpdateTag();
  const isEditing = !!tag;

  const [name, setName] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[3]);
  const [emoji, setEmoji] = useState('🏷️');

  // Reset form when dialog opens
  const handleOpen = useCallback(() => {
    if (tag) {
      setName(tag.name);
      setColor(tag.color || PRESET_COLORS[3]);
      setEmoji(tag.emoji || '🏷️');
    } else {
      setName('');
      setColor(PRESET_COLORS[3]);
      setEmoji('🏷️');
    }
  }, [tag]);

  // Call handleOpen when isOpen changes
  useMemo(() => {
    if (isOpen) handleOpen();
  }, [isOpen, handleOpen]);

  if (!isOpen) return null;

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
          parentId: parentTag?.id || undefined,
          level: parentTag ? parentTag.level + 1 : 0,
        },
        { onSuccess: onClose },
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {isEditing ? t('tags.edit_tag') : t('tags.new_tag')}
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <XMarkIcon className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Parent indicator */}
          {parentTag && !isEditing && (
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2">
              <span>{parentTag.emoji}</span>
              <span>{parentTag.name}</span>
              <span className="text-gray-400 dark:text-gray-500">→</span>
              <span className="text-gray-600 dark:text-gray-300">{t('tags.creating_subtag')}</span>
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
            <div className="flex flex-wrap gap-2">
              {PRESET_EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmoji(e)}
                  className={`w-9 h-9 flex items-center justify-center rounded-lg text-lg transition-all ${
                    emoji === e
                      ? 'bg-blue-100 dark:bg-blue-900/40 ring-2 ring-blue-500'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
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
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isEditing ? t('common.save') : t('common.create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ==================== Tag Row ====================

function TagRow({
  tag,
  depth,
  allTags,
  tagTaskCounts,
  collapsedIds,
  toggleCollapse,
  onEdit,
  onDelete,
  onAddChild,
}: {
  tag: Tag;
  depth: number;
  allTags: Tag[];
  tagTaskCounts: Record<string, number>;
  collapsedIds: Set<string>;
  toggleCollapse: (id: string) => void;
  onEdit: (tag: Tag) => void;
  onDelete: (tag: Tag) => void;
  onAddChild: (tag: Tag) => void;
}) {
  const { t } = useTranslation('common');
  const children = allTags.filter((c) => c.parentId === tag.id);
  const hasChildren = children.length > 0;
  const isCollapsed = collapsedIds.has(tag.id);
  const count = tagTaskCounts[tag.id] || 0;

  return (
    <>
      <div
        className={`group flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors rounded-lg`}
        style={{ paddingLeft: `${16 + depth * 24}px` }}
      >
        {/* Expand/Collapse */}
        {hasChildren ? (
          <button
            onClick={() => toggleCollapse(tag.id)}
            className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex-shrink-0"
          >
            {isCollapsed ? (
              <ChevronRightIcon className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDownIcon className="w-4 h-4 text-gray-400" />
            )}
          </button>
        ) : (
          <span className="w-5 flex-shrink-0" />
        )}

        {/* Emoji + Color chip */}
        <span className="text-base flex-shrink-0">{tag.emoji || '🏷️'}</span>
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

        {/* Actions (visible on hover) */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          {/* Add child tag (only if depth < 3) */}
          {depth < 3 && (
            <button
              onClick={() => onAddChild(tag)}
              className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              title={t('tags.add_subtag')}
            >
              <PlusIcon className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
            </button>
          )}
          <button
            onClick={() => onEdit(tag)}
            className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            title={t('common.edit')}
          >
            <PencilIcon className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
          </button>
          <button
            onClick={() => onDelete(tag)}
            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            title={t('common.delete')}
          >
            <TrashIcon className="w-3.5 h-3.5 text-red-500" />
          </button>
        </div>
      </div>

      {/* Children (recursive) */}
      {hasChildren && !isCollapsed && (
        <div>
          {children.map((child) => (
            <TagRow
              key={child.id}
              tag={child}
              depth={depth + 1}
              allTags={allTags}
              tagTaskCounts={tagTaskCounts}
              collapsedIds={collapsedIds}
              toggleCollapse={toggleCollapse}
              onEdit={onEdit}
              onDelete={onDelete}
              onAddChild={onAddChild}
            />
          ))}
        </div>
      )}
    </>
  );
}

// ==================== Main Page ====================

export default function TagsPage() {
  const { t } = useTranslation('common');
  const { data: tags = [], isLoading } = useTags();
  const { data: tasks = [] } = useTasks();
  const deleteTag = useDeleteTag();

  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [parentForNew, setParentForNew] = useState<Tag | null>(null);
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());

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

  const toggleCollapse = (id: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCreateRoot = () => {
    setEditingTag(null);
    setParentForNew(null);
    setShowForm(true);
  };

  const handleCreateChild = (parent: Tag) => {
    setEditingTag(null);
    setParentForNew(parent);
    setShowForm(true);
  };

  const handleEdit = (tag: Tag) => {
    setEditingTag(tag);
    setParentForNew(null);
    setShowForm(true);
  };

  const handleDelete = (tag: Tag) => {
    const children = tags.filter((c) => c.parentId === tag.id);
    const msg = children.length > 0
      ? t('tags.delete_confirm_with_children', { name: tag.name, count: children.length })
      : t('tags.delete_confirm', { name: tag.name });

    if (window.confirm(msg)) {
      deleteTag.mutate(tag.id);
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingTag(null);
    setParentForNew(null);
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-500">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {t('tags.title')}
          </h1>
          <button
            onClick={handleCreateRoot}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
            <span>{t('tags.new_tag')}</span>
          </button>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder={t('tags.search_placeholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Tag tree */}
      <div className="flex-1 overflow-auto p-4">
        {rootTags.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <TagIcon className="w-12 h-12 mb-4 text-gray-300 dark:text-gray-600" />
            <p className="text-lg">
              {searchQuery ? t('tags.no_results') : t('tags.no_tags')}
            </p>
            {!searchQuery && (
              <button
                onClick={handleCreateRoot}
                className="mt-4 text-blue-500 hover:text-blue-600"
              >
                {t('tags.create_first')}
              </button>
            )}
          </div>
        ) : (
          <div className="max-w-2xl space-y-1">
            {rootTags.map((tag) => (
              <TagRow
                key={tag.id}
                tag={tag}
                depth={0}
                allTags={filteredTags}
                tagTaskCounts={tagTaskCounts}
                collapsedIds={collapsedIds}
                toggleCollapse={toggleCollapse}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onAddChild={handleCreateChild}
              />
            ))}
          </div>
        )}
      </div>

      {/* Tag Form Dialog */}
      <TagFormDialog
        isOpen={showForm}
        onClose={handleCloseForm}
        tag={editingTag}
        parentTag={parentForNew}
      />
    </div>
  );
}
