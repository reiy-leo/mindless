import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
    PlusIcon,
    PencilIcon,
    ChevronDownIcon,
    ChevronRightIcon,
    ArchiveBoxIcon,
    TrashIcon,
    CheckCircleIcon,
    BookOpenIcon,
    XMarkIcon,
    StarIcon,
    ClipboardIcon,
} from "@heroicons/react/24/outline";
import { AvatarImage } from "@/components/people/AvatarImage";
import { Star } from "lucide-react";
import { ResizeHandle } from "@/components/ResizeHandle";
import {
    useNotes,
    useAllNotes,
    useNoteGroups,
    useCreateNote,
    useUpdateNote,
    useDeleteNote,
    useArchiveNote,
    useUnarchiveNote,
    useCompleteNote,
    useCreateNoteGroup,
    useUpdateNoteGroup,
    useDeleteNoteGroup,
    useAllSubNotes,
    useNoteLinkedItems,
    useLinkNoteItem,
    useUnlinkNoteItem,
} from "@/queries/useNoteQueries";
import { useTags, useTasks } from "@/queries/useTaskQueries";
import { useAllPersons } from "@/queries/usePersonQueries";
import { useMediaItems } from "@/queries/useMediaQueries";
import { useAppStore } from "@/stores/useAppStore";
import TagCombobox from "@/components/TagCombobox";
import MilkdownEditor from "@/components/MilkdownEditor";
import LinkedItemSelector from "@/components/media/LinkedItemSelector";
import type { Note, NoteGroup } from "@/types/note";
import type { Tag } from "@/types/tag";
import GroupFormPopup from "@/components/ui/GroupFormPopup";

// ==================== Helper: Resolve icon ====================
const ICON_KEY_TO_EMOJI: Record<string, string> = {
    folder: "📁",
    star: "⭐",
    heart: "❤️",
    fire: "🔥",
    book: "📖",
    flag: "🚩",
    target: "🎯",
    note: "📝",
    pencil: "✏️",
    bulb: "💡",
};

function resolveIcon(icon?: string): string {
    if (!icon) return "📁";
    if (icon.length <= 2) return icon;
    return ICON_KEY_TO_EMOJI[icon] || "📁";
}

// ==================== Smart Groups ====================
type SmartGroupId = "favorites" | "all" | "archived" | "completed";

const SMART_GROUPS: { id: SmartGroupId; icon: React.ComponentType<{ className?: string }>; labelKey: string }[] = [
    { id: "favorites", icon: StarIcon, labelKey: "notes.smart_groups.favorites" },
    { id: "all", icon: BookOpenIcon, labelKey: "notes.smart_groups.all" },
    { id: "archived", icon: ArchiveBoxIcon, labelKey: "notes.smart_groups.archived" },
    { id: "completed", icon: CheckCircleIcon, labelKey: "notes.smart_groups.completed" },
];

export default function NotesPage() {
    const { t } = useTranslation("common");
    const { noteGroupsPanelWidth, detailPanelWidth, setNoteGroupsPanelWidth, setDetailPanelWidth } = useAppStore();

    // State
    const [selectedSmartGroup, setSelectedSmartGroup] = useState<SmartGroupId | null>("all");
    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
    const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);

    const [searchParams, setSearchParams] = useSearchParams();
    const [hasHandledUrlParam, setHasHandledUrlParam] = useState(false);

    useEffect(() => {
        if (hasHandledUrlParam) return;
        const noteId = searchParams.get("noteId");
        if (noteId) {
            setSelectedNoteId(noteId);
            setSearchParams({}, { replace: true });
            setHasHandledUrlParam(true);
        }
    }, [searchParams, hasHandledUrlParam, setSearchParams]);

    const [groupsExpanded, setGroupsExpanded] = useState(true);
    const [showGroupForm, setShowGroupForm] = useState(false);
    const [editingGroup, setEditingGroup] = useState<NoteGroup | null>(null);
    const [newGroupName, setNewGroupName] = useState("");
    const [newGroupColor, setNewGroupColor] = useState("#3B82F6");
    const [newGroupIcon, setNewGroupIcon] = useState("📁");
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; id: string } | null>(null);
    const [noteContextMenu, setNoteContextMenu] = useState<{ x: number; y: number; note: Note } | null>(null);
    const [newSubNoteTitle, setNewSubNoteTitle] = useState("");
    const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
    const [groupFormTriggerRect, setGroupFormTriggerRect] = useState<DOMRect | null>(null);

    // Data
    const { data: notes = [] } = useNotes();
    const { data: allNotes = [] } = useAllNotes();
    const { data: noteGroups = [] } = useNoteGroups();
    const { data: allTags = [] } = useTags();
    const createNote = useCreateNote();
    const updateNote = useUpdateNote();
    const deleteNote = useDeleteNote();
    const archiveNote = useArchiveNote();
    const unarchiveNote = useUnarchiveNote();
    const completeNote = useCompleteNote();
    const createNoteGroup = useCreateNoteGroup();
    const updateNoteGroup = useUpdateNoteGroup();
    const deleteNoteGroup = useDeleteNoteGroup();

    // Linked items
    const { data: linkedItemsData = [] } = useNoteLinkedItems(selectedNoteId || undefined);
    const linkNoteItem = useLinkNoteItem();
    const unlinkNoteItem = useUnlinkNoteItem();
    const { data: allTasks = [] } = useTasks();
    const { data: allPersons = [] } = useAllPersons();
    const { data: mediaItemsData = [] } = useMediaItems();
    const allMediaItems = mediaItemsData;

    const linkedTaskIds = useMemo(() => linkedItemsData.filter((li) => li.linkedType === "task").map((li) => li.linkedId), [linkedItemsData]);
    const linkedPersonIds = useMemo(() => linkedItemsData.filter((li) => li.linkedType === "person").map((li) => li.linkedId), [linkedItemsData]);
    const linkedMediaIds = useMemo(() => linkedItemsData.filter((li) => li.linkedType === "media").map((li) => li.linkedId), [linkedItemsData]);

    const linkedTasks = useMemo(() => allTasks.filter((t) => linkedTaskIds.includes(t.id)), [allTasks, linkedTaskIds]);
    const linkedPersons = useMemo(() => allPersons.filter((p) => linkedPersonIds.includes(p.id)), [allPersons, linkedPersonIds]);
    const linkedMediaItems = useMemo(() => allMediaItems.filter((m) => linkedMediaIds.includes(m.id)), [allMediaItems, linkedMediaIds]);

    const handleLinkItem = useCallback((linkedType: string, linkedId: string) => {
        if (!selectedNoteId) return;
        linkNoteItem.mutate({ noteId: selectedNoteId, linkedType, linkedId });
    }, [selectedNoteId, linkNoteItem]);

    const handleUnlinkItem = useCallback((linkId: string) => {
        unlinkNoteItem.mutate(linkId);
    }, [unlinkNoteItem]);

    // Sub-notes for selected note
    const selectedNote = useMemo(
        () => allNotes.find((n) => n.id === selectedNoteId) || null,
        [allNotes, selectedNoteId],
    );

    // Cancel new note (empty title, no content)
    const isNewNote = selectedNote && !selectedNote.title && !selectedNote.content;
    const handleCancelNewNote = useCallback(() => {
        if (!selectedNoteId) return;
        deleteNote.mutate(selectedNoteId);
        setSelectedNoteId(null);
    }, [selectedNoteId, deleteNote]);
    const { data: subNotesData } = useAllSubNotes(selectedNoteId ? [selectedNoteId] : []);
    const subNotes = subNotesData ?? [];

    // Local content state for MilkdownEditor (avoids mutation→refetch→replaceAll cycle)
    const [localContent, setLocalContent] = useState("");
    const contentRef = useRef("");
    const contentDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastSyncedNoteIdRef = useRef<string | null>(null);

    // Local title state (same pattern - debounce to avoid mutation→refetch loop)
    const [localTitle, setLocalTitle] = useState("");
    const titleDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Sync local content and title from query data when selected note changes
    useEffect(() => {
        if (selectedNote && selectedNote.id !== lastSyncedNoteIdRef.current) {
            lastSyncedNoteIdRef.current = selectedNote.id;
            const content = selectedNote.content || "";
            contentRef.current = content;
            setLocalContent(content);
            setLocalTitle(selectedNote.title || "");
        }
        if (!selectedNote) {
            lastSyncedNoteIdRef.current = null;
            contentRef.current = "";
            setLocalContent("");
            setLocalTitle("");
        }
    }, [selectedNote]);

    // Debounced content save - updates ref immediately, state only for initial sync
    const handleContentChange = useCallback(
        (content: string) => {
            contentRef.current = content;
            if (!selectedNoteId) return;
            if (contentDebounceRef.current) clearTimeout(contentDebounceRef.current);
            contentDebounceRef.current = setTimeout(() => {
                updateNote.mutate({ id: selectedNoteId, content });
            }, 500);
        },
        [selectedNoteId, updateNote],
    );

    // Debounced title save
    const handleTitleChange = useCallback(
        (title: string) => {
            setLocalTitle(title);
            if (!selectedNoteId) return;
            if (titleDebounceRef.current) clearTimeout(titleDebounceRef.current);
            titleDebounceRef.current = setTimeout(() => {
                updateNote.mutate({ id: selectedNoteId, title });
            }, 500);
        },
        [selectedNoteId, updateNote],
    );

    // All sub-notes for the notes list (to show indented)
    const topLevelNoteIds = useMemo(() => notes.map((n) => n.id), [notes]);
    const { data: allSubNotesData } = useAllSubNotes(topLevelNoteIds);
    const allSubNotes = allSubNotesData ?? [];

    // Smart group counts
    const smartGroupCounts = useMemo(() => {
        return {
            favorites: allNotes.filter((n) => n.isPinned && !n.isArchived).length,
            all: allNotes.filter((n) => !n.isArchived).length,
            archived: allNotes.filter((n) => n.isArchived).length,
            completed: allNotes.filter((n) => n.isCompleted && !n.isArchived).length,
        };
    }, [allNotes]);

    // Filter notes based on selection
    const filteredNotes = useMemo(() => {
        let result: Note[];

        if (selectedSmartGroup === "favorites") {
            result = allNotes.filter((n) => n.isPinned && !n.isArchived);
        } else if (selectedSmartGroup === "all") {
            result = notes.filter((n) => !n.isArchived);
        } else if (selectedSmartGroup === "archived") {
            result = allNotes.filter((n) => n.isArchived);
        } else if (selectedSmartGroup === "completed") {
            result = allNotes.filter((n) => n.isCompleted && !n.isArchived);
        } else if (selectedGroupId) {
            result = notes.filter((n) => n.groupId === selectedGroupId && !n.isArchived);
        } else {
            result = notes.filter((n) => !n.isArchived);
        }

        if (selectedTagId) {
            result = result.filter((n) => parseTagIds(n.tagIds).includes(selectedTagId));
        }

        return result;
    }, [notes, allNotes, selectedSmartGroup, selectedGroupId, selectedTagId]);

    // Build flat items (note + sub-notes)
    type FlatItem = { type: "note"; note: Note } | { type: "subnote"; subnote: Note; parentNote: Note };
    const flatItems = useMemo<FlatItem[]>(() => {
        const items: FlatItem[] = [];
        const subnotesByParent = new Map<string, Note[]>();
        allSubNotes.forEach((s) => {
            if (s.parentId) {
                const list = subnotesByParent.get(s.parentId) || [];
                list.push(s);
                subnotesByParent.set(s.parentId, list);
            }
        });
        filteredNotes.forEach((note) => {
            items.push({ type: "note", note });
            const subs = subnotesByParent.get(note.id) || [];
            subs.sort((a, b) => a.sortOrder - b.sortOrder);
            subs.forEach((sub) => {
                items.push({ type: "subnote", subnote: sub, parentNote: note });
            });
        });
        return items;
    }, [filteredNotes, allSubNotes]);

    // Handlers
    const handleSelectGroup = useCallback((smartId: SmartGroupId) => {
        setSelectedSmartGroup(smartId);
        setSelectedGroupId(null);
        setSelectedNoteId(null);
        setSelectedTagId(null);
    }, []);

    const handleSelectNoteGroup = useCallback((groupId: string) => {
        setSelectedSmartGroup(null);
        setSelectedGroupId(groupId);
        setSelectedNoteId(null);
        setSelectedTagId(null);
    }, []);

    const handleNewNote = useCallback(() => {
        createNote.mutate(
            { title: "", groupId: selectedGroupId || undefined },
            { onSuccess: (note) => setSelectedNoteId(note.id) },
        );
    }, [selectedGroupId, createNote]);

    const handleCreateSubNote = useCallback(() => {
        if (!newSubNoteTitle.trim() || !selectedNoteId) return;
        createNote.mutate(
            {
                title: newSubNoteTitle.trim(),
                parentId: selectedNoteId,
                groupId: selectedNote?.groupId,
                level: (selectedNote?.level || 0) + 1,
            },
            {
                onSuccess: (subNote) => {
                    setNewSubNoteTitle("");
                    setSelectedNoteId(subNote.id);
                },
            },
        );
    }, [newSubNoteTitle, selectedNoteId, selectedNote, createNote]);

    const handleDeleteNote = useCallback(
        (id: string) => {
            if (!window.confirm(t("notes.delete_confirm"))) return;
            deleteNote.mutate(id);
            if (selectedNoteId === id) setSelectedNoteId(null);
        },
        [deleteNote, selectedNoteId, t],
    );

    const handleToggleComplete = useCallback(
        (id: string) => {
            completeNote.mutate(id);
        },
        [completeNote],
    );

    const handleToggleArchive = useCallback(
        (note: Note) => {
            if (note.isArchived) {
                unarchiveNote.mutate(note.id);
            } else {
                archiveNote.mutate(note.id);
            }
        },
        [archiveNote, unarchiveNote],
    );

    const handleTogglePin = useCallback(
        (note: Note) => {
            updateNote.mutate({ id: note.id, isPinned: !note.isPinned });
        },
        [updateNote],
    );

    const handleCopyNote = useCallback(
        (note: Note) => {
            createNote.mutate({
                title: note.title + " (副本)",
                content: note.content,
                groupId: note.groupId,
                tagIds: note.tagIds,
            });
        },
        [createNote],
    );

    const handleNoteContextMenu = useCallback((e: React.MouseEvent, note: Note) => {
        e.preventDefault();
        e.stopPropagation();
        setNoteContextMenu({ x: e.clientX, y: e.clientY, note });
    }, []);

    const handleUpdateNoteField = useCallback(
        (params: Partial<Note>) => {
            if (!selectedNoteId) return;
            updateNote.mutate({ id: selectedNoteId, ...params });
        },
        [selectedNoteId, updateNote],
    );

    // Note Group CRUD
    const handleCreateGroup = useCallback(() => {
        if (!newGroupName.trim()) return;
        createNoteGroup.mutate(
            { name: newGroupName.trim(), color: newGroupColor, icon: newGroupIcon },
            {
                onSuccess: () => {
                    setNewGroupName("");
                    setNewGroupColor("#3B82F6");
                    setNewGroupIcon("📁");
                    setShowGroupForm(false);
                },
            },
        );
    }, [newGroupName, newGroupColor, newGroupIcon, createNoteGroup]);

    const handleEditGroup = useCallback((e: React.MouseEvent, group: NoteGroup) => {
        e.stopPropagation();
        setEditingGroup(group);
        setNewGroupName(group.name);
        setNewGroupColor(group.color || "#3B82F6");
        setNewGroupIcon(group.icon || "📁");
        const rect = (e.currentTarget as HTMLElement).closest('button')?.getBoundingClientRect()
            || (e.currentTarget as HTMLElement).getBoundingClientRect();
        setGroupFormTriggerRect(rect);
        setShowGroupForm(true);
    }, []);

    const handleUpdateGroup = useCallback(() => {
        if (!editingGroup || !newGroupName.trim()) return;
        updateNoteGroup.mutate(
            { id: editingGroup.id, name: newGroupName.trim(), color: newGroupColor, icon: newGroupIcon },
            {
                onSuccess: () => {
                    setEditingGroup(null);
                    setNewGroupName("");
                    setShowGroupForm(false);
                },
            },
        );
    }, [editingGroup, newGroupName, newGroupColor, newGroupIcon, updateNoteGroup]);

    const handleArchiveGroup = useCallback(
        (id: string) => {
            const group = noteGroups.find((g) => g.id === id);
            if (group) {
                updateNoteGroup.mutate({ id, isArchived: !group.isArchived });
            }
            setContextMenu(null);
        },
        [noteGroups, updateNoteGroup],
    );

    const handleDeleteGroup = useCallback(
        (id: string) => {
            if (!window.confirm(t("notes.groups.delete_confirm"))) return;
            deleteNoteGroup.mutate(id);
            if (selectedGroupId === id) {
                setSelectedGroupId(null);
                setSelectedSmartGroup("all");
            }
            setContextMenu(null);
        },
        [deleteNoteGroup, selectedGroupId, t],
    );

    // Context menu
    const handleGroupContextMenu = useCallback((e: React.MouseEvent, groupId: string) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ x: e.clientX, y: e.clientY, id: groupId });
    }, []);

    // Panel resize
    useEffect(() => {
        let prevWidth = window.innerWidth;
        const handleResize = () => {
            const newWidth = window.innerWidth;
            const delta = newWidth - prevWidth;
            prevWidth = newWidth;
            if (delta !== 0) {
                setDetailPanelWidth((w) => Math.max(300, Math.min(800, w + delta)));
            }
        };
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, [setDetailPanelWidth]);

    // Active group label
    const activeLabel = useMemo(() => {
        if (selectedSmartGroup) {
            return t(`notes.smart_groups.${selectedSmartGroup}`);
        }
        if (selectedGroupId) {
            const group = noteGroups.find((g) => g.id === selectedGroupId);
            return group ? `${resolveIcon(group.icon)} ${group.name}` : "";
        }
        return t("notes.smart_groups.all");
    }, [selectedSmartGroup, selectedGroupId, noteGroups, t]);

    // Tag map for display
    const tagMap = useMemo(() => {
        const map = new Map<string, Tag>();
        allTags.forEach((tag) => map.set(tag.id, tag));
        return map;
    }, [allTags]);

    // Parse tag IDs
    const parseTagIds = useCallback((tagIds?: string): string[] => {
        if (!tagIds) return [];
        return tagIds.split(",").filter(Boolean);
    }, []);

    return (
        <div className="flex h-full bg-gray-50 dark:bg-gray-900">
            {/* Left Panel: Groups */}
            <div
                className="overflow-hidden border-r border-gray-200 dark:border-gray-700 flex-shrink-0 flex flex-col"
                style={{ width: noteGroupsPanelWidth, minWidth: 215, maxWidth: 315, flexShrink: 0, backgroundColor: 'var(--theme-bg-20)' }}
            >
                <div className="p-3 flex-1 overflow-y-auto">
                    {/* Smart Groups */}
                    <div className="mb-3">
                        <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                {t("notes.smart_groups.all")}
                            </span>
                        </div>
                        {SMART_GROUPS.map((sg) => {
                            const Icon = sg.icon;
                            const isActive = selectedSmartGroup === sg.id && !selectedGroupId;
                            return (
                                <button
                                    key={sg.id}
                                    onClick={() => handleSelectGroup(sg.id)}
                                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm transition-colors mb-0.5 ${
                                        isActive
                                            ? 'bg-black/10 dark:bg-white/15'
                                            : 'text-gray-700 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/10'
                                    }`}
                                    style={isActive ? { color: 'var(--theme-text-70)' } : {}}
                                >
                                    <Icon className="w-4 h-4 flex-shrink-0" />
                                    <span className="flex-1 text-left truncate">{t(sg.labelKey)}</span>
                                    <span className="text-xs text-gray-400 dark:text-gray-500">
                                        {smartGroupCounts[sg.id]}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Note Groups */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <button
                                onClick={() => setGroupsExpanded(!groupsExpanded)}
                                className="flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                            >
                                {groupsExpanded ? (
                                    <ChevronDownIcon className="w-3 h-3" />
                                ) : (
                                    <ChevronRightIcon className="w-3 h-3" />
                                )}
                                {t("notes.groups.title")}
                            </button>
                            <button
                                onClick={(e) => {
                                    setEditingGroup(null);
                                    setNewGroupName("");
                                    setNewGroupColor("#3B82F6");
                                    setNewGroupIcon("📁");
                                    setGroupFormTriggerRect(e.currentTarget.getBoundingClientRect());
                                    setShowGroupForm(true);
                                }}
                                className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            >
                                <PlusIcon className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        {groupsExpanded && (
                            <>
                                {noteGroups.filter((g) => !g.isArchived).length === 0 && !showGroupForm && (
                                    <p className="text-xs text-gray-400 dark:text-gray-500 px-2.5 py-2">
                                        {t("notes.groups.no_groups")}
                                    </p>
                                )}
                                {noteGroups
                                    .filter((g) => !g.isArchived)
                                    .map((group) => {
                                        const isActive = selectedGroupId === group.id;
                                        return (
                                            <button
                                                key={group.id}
                                                onClick={() => handleSelectNoteGroup(group.id)}
                                                onContextMenu={(e) => handleGroupContextMenu(e, group.id)}
                                                className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm transition-colors mb-0.5 ${
                                                    isActive
                                                        ? 'bg-black/10 dark:bg-white/15'
                                                        : 'text-gray-700 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/10'
                                                }`}
                                                style={isActive ? { color: 'var(--theme-text-70)' } : {}}
                                            >
                                                <span className="text-sm">{resolveIcon(group.icon)}</span>
                                                <span className="flex-1 text-left truncate">{group.name}</span>
                                                <span
                                                    className="w-2 h-2 rounded-full flex-shrink-0"
                                                    style={{ backgroundColor: group.color || "#3B82F6" }}
                                                />
                                            </button>
                                        );
                                    })}
                            </>
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
                            onNameChange={setNewGroupName}
                            icon={newGroupIcon}
                            onIconChange={setNewGroupIcon}
                            color={newGroupColor}
                            onColorChange={setNewGroupColor}
                            namePlaceholder={t("notes.groups.name_placeholder")}
                            isEditing={!!editingGroup}
                        />
                    </div>
                </div>
            </div>

            <ResizeHandle
                onResize={(delta) => setNoteGroupsPanelWidth((w) => Math.max(215, Math.min(315, w + delta)))}
            />

            {/* Middle Panel: Notes List */}
            <div className="flex-1 flex flex-col min-w-[250px] max-w-[350px]" style={{ backgroundColor: 'var(--theme-bg-2)' }}>
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700" style={{ backgroundColor: 'var(--theme-bg-2)' }}>
                    <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">{activeLabel}</h2>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleNewNote}
                            className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-400 transition-colors"
                        >
                            <PlusIcon className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Notes List */}
                <div className="flex-1 overflow-y-auto">
                    {flatItems.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500">
                            <BookOpenIcon className="w-10 h-10 mb-2 opacity-50" />
                            <p className="text-sm">{t("notes.no_notes")}</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                            {flatItems.map((item) => {
                                const note = item.type === "note" ? item.note : item.subnote;
                                const isSubNote = item.type === "subnote";
                                const isSelected = selectedNoteId === note.id;

                                return (
                                    <div
                                        key={note.id}
                                        onClick={() => setSelectedNoteId(note.id)}
                                        onContextMenu={(e) => handleNoteContextMenu(e, note)}
                                        className={`px-4 py-2.5 cursor-pointer transition-colors ${
                                            isSubNote ? "pl-10" : ""
                                        } ${
                                            isSelected
                                                ? "bg-blue-50 dark:bg-blue-900/20 border-l-2 border-blue-500"
                                                : "hover:bg-gray-50 dark:hover:bg-gray-700/50 border-l-2 border-transparent"
                                        }`}
                                    >
                                        <div className="flex items-start gap-2">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleToggleComplete(note.id);
                                                }}
                                                className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                                                    note.isCompleted
                                                        ? "bg-green-500 border-green-500 text-white"
                                                        : "border-gray-300 dark:border-gray-500 hover:border-green-400"
                                                }`}
                                            >
                                                {note.isCompleted && (
                                                    <svg
                                                        className="w-2.5 h-2.5"
                                                        fill="none"
                                                        viewBox="0 0 24 24"
                                                        stroke="currentColor"
                                                        strokeWidth={3}
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            d="M5 13l4 4L19 7"
                                                        />
                                                    </svg>
                                                )}
                                            </button>
                                            <div className="flex-1 min-w-0">
                                                <p
                                                    className={`text-sm font-medium truncate flex items-center gap-1 ${
                                                        note.isCompleted
                                                            ? "line-through text-gray-400 dark:text-gray-500"
                                                            : "text-gray-900 dark:text-gray-100"
                                                    }`}
                                                >
                                                    {note.isPinned && (
                                                        <Star className="w-3 h-3 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                                                    )}
                                                    {note.title || t("notes.title_placeholder")}
                                                </p>
                                                {note.content && (
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                                                        {note.content.replace(/[#*`\n]/g, " ").slice(0, 80)}
                                                    </p>
                                                )}
                                                {/* Tags */}
                                                {parseTagIds(note.tagIds).length > 0 && (
                                                    <div className="flex gap-1 mt-1 flex-wrap">
                                                        {parseTagIds(note.tagIds).map((tagId) => {
                                                            const tag = tagMap.get(tagId);
                                                            if (!tag) return null;
                                                            return (
                                                                <button
                                                                    key={tagId}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setSelectedTagId(selectedTagId === tagId ? null : tagId);
                                                                    }}
                                                                    className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium transition-opacity ${
                                                                        selectedTagId && selectedTagId !== tagId ? "opacity-40" : ""
                                                                    }`}
                                                                    style={{
                                                                        backgroundColor: `${tag.color}20`,
                                                                        color: tag.color,
                                                                    }}
                                                                >
                                                                    {tag.emoji && <span>{tag.emoji}</span>}
                                                                    {tag.name}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                            <span className="text-[10px] text-gray-400 dark:text-gray-500 flex-shrink-0 mt-0.5">
                                                {new Date(note.updatedAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            <ResizeHandle onResize={(delta) => setDetailPanelWidth((w) => Math.max(300, Math.min(800, w - delta)))} />

            {/* Right Panel: Note Detail */}
            <div
                className="border-l border-gray-200 dark:border-gray-700 flex-shrink-0 flex flex-col"
                style={{ width: detailPanelWidth, backgroundColor: 'var(--theme-bg-2)' }}
            >
                {selectedNote ? (
                    <div className="flex flex-col h-full">
                        {/* Title (fixed) */}
                        <div className="px-4 pt-4 pb-2 flex-shrink-0">
                            {selectedNote.parentId && (() => {
                                const parentNote = allNotes.find((n) => n.id === selectedNote.parentId);
                                if (!parentNote) return null;
                                return (
                                    <button
                                        onClick={() => setSelectedNoteId(parentNote.id)}
                                        className="text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 mb-1 block"
                                    >
                                        ← {parentNote.title || t("notes.title_placeholder")}
                                    </button>
                                );
                            })()}
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={localTitle}
                                    onChange={(e) => handleTitleChange(e.target.value)}
                                    placeholder={t("notes.title_placeholder")}
                                    className="flex-1 text-lg font-semibold bg-transparent border-none outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400"
                                />
                                {isNewNote && (
                                    <button
                                        onClick={handleCancelNewNote}
                                        className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0"
                                    >
                                        {t("common.cancel")}
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Scrollable content */}
                        <div className="flex-1 overflow-auto min-h-0">

                        {/* Tags */}
                        <div className="px-4 pb-2">
                            <TagCombobox
                                selectedIds={parseTagIds(selectedNote.tagIds)}
                                allTags={allTags}
                                onToggle={(tagId: string) => {
                                    const current = parseTagIds(selectedNote.tagIds);
                                    const next = current.includes(tagId)
                                        ? current.filter((id) => id !== tagId)
                                        : [...current, tagId];
                                    handleUpdateNoteField({ tagIds: next.join(",") });
                                }}
                                onCreateTag={() => {}}
                            />
                        </div>

                        {/* Linked Items */}
                        <div className="px-4 pb-3 space-y-3">
                            {/* Linked Tasks */}
                            <div>
                                <div className="relative flex">
                                    <h3 className="flex-1 text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                                        {t("notes.linked_tasks")}
                                    </h3>
                                    <LinkedItemSelector
                                        value={linkedTaskIds}
                                        onChange={(ids) => {
                                            const added = ids.find((id) => !linkedTaskIds.includes(id));
                                            if (added) handleLinkItem("task", added);
                                        }}
                                        items={allTasks.map((task) => ({ id: task.id, title: task.title, date: task.dueDate, time: task.dueTime }))}
                                        placeholder={t("tasks.search_placeholder")}
                                    />
                                </div>
                                {linkedTasks.length > 0 && (
                                    <div className="mt-1 space-y-1">
                                        {linkedTasks.map((task) => {
                                            const linkItem = linkedItemsData.find((li) => li.linkedType === "task" && li.linkedId === task.id);
                                            return (
                                                <div key={task.id} className="flex items-center gap-2 group text-sm">
                                                    <span className="text-gray-400 dark:text-gray-500 flex-shrink-0 w-30">
                                                        {task.dueDate ? `${task.dueDate.slice(5)}${task.dueTime ? ` ${task.dueTime}` : ""}` : ""}
                                                    </span>
                                                    <span className="flex-1 text-gray-700 dark:text-gray-300 truncate">{task.title}</span>
                                                    {linkItem && (
                                                        <button onClick={() => handleUnlinkItem(linkItem.id)} className="opacity-0 group-hover:opacity-100 hover:text-red-500 text-gray-400 flex-shrink-0">
                                                            <XMarkIcon className="w-3 h-3" />
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Linked Persons */}
                            <div>
                                <div className="flex">
                                    <h3 className="flex-1 text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                                        {t("notes.linked_persons")}
                                    </h3>
                                    <LinkedItemSelector
                                        value={linkedPersonIds}
                                        onChange={(ids) => {
                                            const added = ids.find((id) => !linkedPersonIds.includes(id));
                                            if (added) handleLinkItem("person", added);
                                        }}
                                        items={allPersons.map((p) => ({ id: p.id, title: p.name }))}
                                        placeholder={t("people.search_placeholder")}
                                    />
                                </div>
                                {linkedPersons.length > 0 && (
                                    <div className="mt-1 flex flex-row gap-2">
                                        {linkedPersons.map((person) => {
                                            const linkItem = linkedItemsData.find((li) => li.linkedType === "person" && li.linkedId === person.id);
                                            return (
                                                <div key={person.id} className="relative group flex flex-col items-center gap-1 p-2">
                                                    {linkItem && (
                                                        <button onClick={() => handleUnlinkItem(linkItem.id)} className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 hover:text-red-500 text-gray-400">
                                                            <XMarkIcon className="w-3 h-3" />
                                                        </button>
                                                    )}
                                                    {person.avatar ? (
                                                        <AvatarImage seed={person.avatar} size={32} />
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-xs text-gray-500 dark:text-gray-400">
                                                            {person.name[0]}
                                                        </div>
                                                    )}
                                                    <span className="text-xs text-gray-700 dark:text-gray-300 truncate w-full text-center">{person.name}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Linked Media */}
                            <div>
                                <div className="flex">
                                    <h3 className="flex-1 text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                                        {t("notes.linked_media")}
                                    </h3>
                                    <LinkedItemSelector
                                        value={linkedMediaIds}
                                        onChange={(ids) => {
                                            const added = ids.find((id) => !linkedMediaIds.includes(id));
                                            if (added) handleLinkItem("media", added);
                                        }}
                                        items={allMediaItems.map((m) => ({ id: m.id, title: m.title }))}
                                        placeholder={t("media.placeholder.search")}
                                    />
                                </div>
                                {linkedMediaItems.length > 0 && (
                                    <div className="mt-1 flex flex-row gap-2">
                                        {linkedMediaItems.map((media) => {
                                            const linkItem = linkedItemsData.find((li) => li.linkedType === "media" && li.linkedId === media.id);
                                            return (
                                                <div key={media.id} className="relative group flex flex-col overflow-hidden">
                                                    {linkItem && (
                                                        <button onClick={() => handleUnlinkItem(linkItem.id)} className="absolute top-1 right-1 z-10 opacity-0 group-hover:opacity-100 hover:text-red-500 text-white drop-shadow">
                                                            <XMarkIcon className="w-3 h-3" />
                                                        </button>
                                                    )}
                                                    {media.cover ? (
                                                        <img src={media.cover} alt={media.title} className="w-14 aspect-[2/3] object-cover" />
                                                    ) : (
                                                        <div className="w-14 aspect-[2/3] bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-400 dark:text-gray-500">
                                                            <BookOpenIcon className="w-5 h-5" />
                                                        </div>
                                                    )}
                                                    <div className="p-1.5">
                                                        <p className="text-xs text-gray-700 dark:text-gray-300 truncate">{media.title}</p>
                                                        {media.year && <p className="text-[10px] text-gray-400 dark:text-gray-500">{media.year}</p>}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Content Editor */}
                        <div className="px-4 pb-4">
                            <MilkdownEditor
                                markdown={localContent}
                                onChange={handleContentChange}
                                placeholder={t("notes.content_placeholder")}
                            />
                        </div>

                        {/* Sub-notes */}
                        <div className="px-4 pb-4 border-t border-gray-200 dark:border-gray-700 pt-3">
                            <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                                {t("notes.sub_notes.title")}
                            </h3>
                            {subNotes.length > 0 && (
                                <div className="space-y-1 mb-2">
                                    {subNotes.map((sub) => (
                                        <div key={sub.id} className="flex items-center gap-2 group">
                                            <button
                                                onClick={() => handleToggleComplete(sub.id)}
                                                className={`w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                                                    sub.isCompleted
                                                        ? "bg-green-500 border-green-500 text-white"
                                                        : "border-gray-300 dark:border-gray-500"
                                                }`}
                                            >
                                                {sub.isCompleted && (
                                                    <svg
                                                        className="w-2 h-2"
                                                        fill="none"
                                                        viewBox="0 0 24 24"
                                                        stroke="currentColor"
                                                        strokeWidth={3}
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            d="M5 13l4 4L19 7"
                                                        />
                                                    </svg>
                                                )}
                                            </button>
                                            <button
                                                onClick={() => setSelectedNoteId(sub.id)}
                                                className={`flex-1 text-sm text-left truncate ${
                                                    sub.isCompleted
                                                        ? "line-through text-gray-400"
                                                        : "text-gray-700 dark:text-gray-300 hover:text-blue-500 dark:hover:text-blue-400"
                                                }`}
                                            >
                                                {sub.title || t("notes.title_placeholder")}
                                            </button>
                                            <span className="text-[10px] text-gray-400 dark:text-gray-500 flex-shrink-0">
                                                {new Date(sub.updatedAt).toLocaleDateString()}
                                            </span>
                                            <button
                                                onClick={() => handleDeleteNote(sub.id)}
                                                className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-400"
                                            >
                                                <XMarkIcon className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newSubNoteTitle}
                                    onChange={(e) => setNewSubNoteTitle(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") handleCreateSubNote();
                                        if (e.key === "Escape") setNewSubNoteTitle("");
                                    }}
                                    placeholder={t("notes.sub_notes.title_placeholder")}
                                    className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                                <button
                                    onClick={handleCreateSubNote}
                                    disabled={!newSubNoteTitle.trim()}
                                    className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 transition-colors text-sm"
                                >
                                    <PlusIcon className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>

                        {/* Metadata */}
                        <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 text-[10px] text-gray-400 dark:text-gray-500">
                            <p>
                                {t("common.edit")}: {new Date(selectedNote.updatedAt).toLocaleString()}
                            </p>
                        </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500">
                        <BookOpenIcon className="w-10 h-10 mb-2 opacity-50" />
                        <p className="text-sm">{t("notes.select_note")}</p>
                    </div>
                )}
            </div>

            {/* Context Menu */}
            {contextMenu && (
                <>
                    <div className="fixed inset-0 z-50" onClick={() => setContextMenu(null)} />
                    <div
                        className="fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 min-w-[160px]"
                        style={{ left: contextMenu.x, top: contextMenu.y }}
                    >
                        <button
                            onClick={() => {
                                const group = noteGroups.find((g) => g.id === contextMenu.id);
                                if (group) handleEditGroup({ stopPropagation: () => {} } as React.MouseEvent, group);
                                setContextMenu(null);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                            <PencilIcon className="w-4 h-4" />
                            {t("common.edit")}
                        </button>
                        <button
                            onClick={() => handleArchiveGroup(contextMenu.id)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                            <ArchiveBoxIcon className="w-4 h-4" />
                            {noteGroups.find((g) => g.id === contextMenu.id)?.isArchived
                                ? t("notes.groups.unarchive")
                                : t("notes.groups.archive")}
                        </button>
                        <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                        <button
                            onClick={() => handleDeleteGroup(contextMenu.id)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                            <TrashIcon className="w-4 h-4" />
                            {t("common.delete")}
                        </button>
                    </div>
                </>
            )}

            {/* Note Context Menu */}
            {noteContextMenu && (
                <>
                    <div className="fixed inset-0 z-50" onClick={() => setNoteContextMenu(null)} />
                    <div
                        className="fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 min-w-[160px]"
                        style={{ left: noteContextMenu.x, top: noteContextMenu.y }}
                    >
                        <button
                            onClick={() => {
                                handleTogglePin(noteContextMenu.note);
                                setNoteContextMenu(null);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                            <Star className="w-4 h-4" />
                            {noteContextMenu.note.isPinned ? t("notes.unfavorite") : t("notes.favorite")}
                        </button>
                        <button
                            onClick={() => {
                                handleCopyNote(noteContextMenu.note);
                                setNoteContextMenu(null);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                            <ClipboardIcon className="w-4 h-4" />
                            {t("notes.copy")}
                        </button>
                        <button
                            onClick={() => {
                                handleToggleArchive(noteContextMenu.note);
                                setNoteContextMenu(null);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                            <ArchiveBoxIcon className="w-4 h-4" />
                            {noteContextMenu.note.isArchived ? t("notes.groups.unarchive") : t("notes.groups.archive")}
                        </button>
                        <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                        <button
                            onClick={() => {
                                handleDeleteNote(noteContextMenu.note.id);
                                setNoteContextMenu(null);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                            <TrashIcon className="w-4 h-4" />
                            {t("common.delete")}
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
