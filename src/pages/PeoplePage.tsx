import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
    PlusIcon,
    PencilIcon,
    ChevronDownIcon,
    ChevronRightIcon,
    ArchiveBoxIcon,
    TrashIcon,
    MagnifyingGlassIcon,
    BookOpenIcon,
    XMarkIcon,
    StarIcon,
    UserIcon,
    PhoneIcon,
    EnvelopeIcon,
} from "@heroicons/react/24/outline";
import { Star, ArchiveRestore } from "lucide-react";
import { ResizeHandle } from "@/components/ResizeHandle";
import {
    usePersons,
    useAllPersons,
    usePersonGroups,
    usePersonPhones,
    usePersonEmails,
    useCreatePerson,
    useUpdatePerson,
    useDeletePerson,
    useCreatePersonGroup,
    useUpdatePersonGroup,
    useDeletePersonGroup,
    useCreatePersonPhone,
    useDeletePersonPhone,
    useCreatePersonEmail,
    useDeletePersonEmail,
} from "@/queries/usePersonQueries";
import { useTags } from "@/queries/useTaskQueries";
import { useAppStore } from "@/stores/useAppStore";
import TagCombobox from "@/components/TagCombobox";
import type { Person, PersonGroup, PersonPhone, PersonEmail } from "@/types/person";

// ==================== Helper ====================
const ICON_KEY_TO_EMOJI: Record<string, string> = {
    folder: "📁",
    users: "👥",
    star: "⭐",
    heart: "❤️",
    fire: "🔥",
    briefcase: "💼",
    home: "🏠",
    book: "📖",
    flag: "🚩",
    target: "🎯",
};

function resolveIcon(icon?: string): string {
    if (!icon) return "👥";
    if (icon.length <= 2) return icon;
    return ICON_KEY_TO_EMOJI[icon] || "👥";
}

// ==================== Smart Groups ====================
type SmartGroupId = "favorites" | "all" | "archived";

const SMART_GROUPS: { id: SmartGroupId; icon: React.ComponentType<{ className?: string }>; labelKey: string }[] = [
    { id: "favorites", icon: StarIcon, labelKey: "people.smart_groups.favorites" },
    { id: "all", icon: BookOpenIcon, labelKey: "people.smart_groups.all" },
    { id: "archived", icon: ArchiveBoxIcon, labelKey: "people.smart_groups.archived" },
];

// ==================== Phone/Email Inline Editor ====================

function PhoneListEditor({
    personId,
    phones,
}: {
    personId: string;
    phones: PersonPhone[];
}) {
    const { t } = useTranslation("common");
    const createPhone = useCreatePersonPhone();
    const deletePhone = useDeletePersonPhone();
    const [newPhone, setNewPhone] = useState("");
    const [newPhoneLabel, setNewPhoneLabel] = useState("手机");

    const handleAdd = () => {
        if (!newPhone.trim()) return;
        createPhone.mutate(
            { personId, phone: newPhone.trim(), label: newPhoneLabel },
            { onSuccess: () => { setNewPhone(""); } },
        );
    };

    return (
        <div className="space-y-2">
            {phones.map((p) => (
                <div key={p.id} className="flex items-center gap-2">
                    <PhoneIcon className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                    <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded flex-shrink-0">
                        {p.label}
                    </span>
                    <span className="text-sm text-gray-900 dark:text-gray-100 flex-1">{p.phone}</span>
                    <button
                        onClick={() => deletePhone.mutate(p.id)}
                        className="p-0.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        <XMarkIcon className="w-3.5 h-3.5" />
                    </button>
                </div>
            ))}
            <div className="flex items-center gap-2">
                <select
                    value={newPhoneLabel}
                    onChange={(e) => setNewPhoneLabel(e.target.value)}
                    className="text-xs border border-gray-300 dark:border-gray-600 rounded px-1.5 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                    <option value="手机">手机</option>
                    <option value="工作">工作</option>
                    <option value="家庭">家庭</option>
                    <option value="其他">其他</option>
                </select>
                <input
                    type="tel"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
                    placeholder={t("people.detail.phone_placeholder")}
                    className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                    onClick={handleAdd}
                    disabled={!newPhone.trim()}
                    className="p-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 transition-colors"
                >
                    <PlusIcon className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    );
}

function EmailListEditor({
    personId,
    emails,
}: {
    personId: string;
    emails: PersonEmail[];
}) {
    const { t } = useTranslation("common");
    const createEmail = useCreatePersonEmail();
    const deleteEmail = useDeletePersonEmail();
    const [newEmail, setNewEmail] = useState("");
    const [newEmailLabel, setNewEmailLabel] = useState("邮箱");

    const handleAdd = () => {
        if (!newEmail.trim()) return;
        createEmail.mutate(
            { personId, email: newEmail.trim(), label: newEmailLabel },
            { onSuccess: () => { setNewEmail(""); } },
        );
    };

    return (
        <div className="space-y-2">
            {emails.map((e) => (
                <div key={e.id} className="flex items-center gap-2">
                    <EnvelopeIcon className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                    <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded flex-shrink-0">
                        {e.label}
                    </span>
                    <span className="text-sm text-gray-900 dark:text-gray-100 flex-1 truncate">{e.email}</span>
                    <button
                        onClick={() => deleteEmail.mutate(e.id)}
                        className="p-0.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        <XMarkIcon className="w-3.5 h-3.5" />
                    </button>
                </div>
            ))}
            <div className="flex items-center gap-2">
                <select
                    value={newEmailLabel}
                    onChange={(e) => setNewEmailLabel(e.target.value)}
                    className="text-xs border border-gray-300 dark:border-gray-600 rounded px-1.5 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                    <option value="邮箱">邮箱</option>
                    <option value="工作">工作</option>
                    <option value="个人">个人</option>
                    <option value="其他">其他</option>
                </select>
                <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
                    placeholder={t("people.detail.email_placeholder")}
                    className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                    onClick={handleAdd}
                    disabled={!newEmail.trim()}
                    className="p-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 transition-colors"
                >
                    <PlusIcon className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    );
}

// ==================== Main Page ====================

export default function PeoplePage() {
    const { t } = useTranslation("common");
    const { personGroupsPanelWidth, detailPanelWidth, setPersonGroupsPanelWidth, setDetailPanelWidth } = useAppStore();

    // State
    const [selectedSmartGroup, setSelectedSmartGroup] = useState<SmartGroupId | null>("all");
    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
    const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [groupsExpanded, setGroupsExpanded] = useState(true);
    const [showGroupForm, setShowGroupForm] = useState(false);
    const [editingGroup, setEditingGroup] = useState<PersonGroup | null>(null);
    const [newGroupName, setNewGroupName] = useState("");
    const [newGroupColor, setNewGroupColor] = useState("#3B82F6");
    const [newGroupIcon, setNewGroupIcon] = useState("👥");
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; id: string } | null>(null);
    const [personContextMenu, setPersonContextMenu] = useState<{ x: number; y: number; person: Person } | null>(null);

    // Data
    const { data: persons = [] } = usePersons();
    const { data: allPersons = [] } = useAllPersons();
    const { data: personGroups = [] } = usePersonGroups();
    const { data: allTags = [] } = useTags();
    const createPerson = useCreatePerson();
    const updatePerson = useUpdatePerson();
    const deletePerson = useDeletePerson();
    const createPersonGroup = useCreatePersonGroup();
    const updatePersonGroup = useUpdatePersonGroup();
    const deletePersonGroup = useDeletePersonGroup();

    // Phones & Emails for selected person
    const selectedPerson = useMemo(
        () => allPersons.find((p) => p.id === selectedPersonId) || null,
        [allPersons, selectedPersonId],
    );
    const { data: phonesData } = usePersonPhones(selectedPersonId || undefined);
    const phones = phonesData ?? [];
    const { data: emailsData } = usePersonEmails(selectedPersonId || undefined);
    const emails = emailsData ?? [];

    // Detail local state
    const [localName, setLocalName] = useState("");
    const [localEnglishName, setLocalEnglishName] = useState("");
    const [localNickname, setLocalNickname] = useState("");
    const [localRemark, setLocalRemark] = useState("");
    const lastSyncedRef = useRef<string | null>(null);
    const nameDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const englishNameDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const nicknameDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const remarkDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (selectedPerson && selectedPerson.id !== lastSyncedRef.current) {
            lastSyncedRef.current = selectedPerson.id;
            setLocalName(selectedPerson.name || "");
            setLocalEnglishName(selectedPerson.englishName || "");
            setLocalNickname(selectedPerson.nickname || "");
            setLocalRemark(selectedPerson.remark || "");
        }
        if (!selectedPerson) {
            lastSyncedRef.current = null;
            setLocalName("");
            setLocalEnglishName("");
            setLocalNickname("");
            setLocalRemark("");
        }
    }, [selectedPerson]);

    const debounceSave = useCallback(
        (field: string, value: string, ref: React.MutableRefObject<ReturnType<typeof setTimeout> | null>) => {
            if (!selectedPersonId) return;
            if (ref.current) clearTimeout(ref.current);
            ref.current = setTimeout(() => {
                updatePerson.mutate({ id: selectedPersonId, [field]: value });
            }, 500);
        },
        [selectedPersonId, updatePerson],
    );

    // Smart group counts
    const smartGroupCounts = useMemo(() => {
        return {
            favorites: allPersons.filter((p) => p.isPinned && !p.isArchived).length,
            all: allPersons.filter((p) => !p.isArchived).length,
            archived: allPersons.filter((p) => p.isArchived).length,
        };
    }, [allPersons]);

    // Filter persons based on selection
    const filteredPersons = useMemo(() => {
        let result: Person[];

        if (selectedSmartGroup === "favorites") {
            result = allPersons.filter((p) => p.isPinned && !p.isArchived);
        } else if (selectedSmartGroup === "all") {
            result = persons.filter((p) => !p.isArchived);
        } else if (selectedSmartGroup === "archived") {
            result = allPersons.filter((p) => p.isArchived);
        } else if (selectedGroupId) {
            result = persons.filter((p) => p.groupId === selectedGroupId && !p.isArchived);
        } else {
            result = persons.filter((p) => !p.isArchived);
        }

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(
                (p) =>
                    p.name.toLowerCase().includes(q) ||
                    (p.englishName && p.englishName.toLowerCase().includes(q)) ||
                    (p.nickname && p.nickname.toLowerCase().includes(q)),
            );
        }

        return result;
    }, [persons, allPersons, selectedSmartGroup, selectedGroupId, searchQuery]);

    // Handlers
    const handleSelectGroup = useCallback((smartId: SmartGroupId) => {
        setSelectedSmartGroup(smartId);
        setSelectedGroupId(null);
        setSelectedPersonId(null);
    }, []);

    const handleSelectPersonGroup = useCallback((groupId: string) => {
        setSelectedSmartGroup(null);
        setSelectedGroupId(groupId);
        setSelectedPersonId(null);
    }, []);

    const handleCreatePerson = useCallback(() => {
        createPerson.mutate(
            { name: t("people.new_person"), groupId: selectedGroupId || undefined },
            {
                onSuccess: (person) => {
                    setSelectedPersonId(person.id);
                },
                onError: (err) => {
                    console.error("Failed to create person:", err);
                },
            },
        );
    }, [selectedGroupId, createPerson, t]);

    const handleDeletePerson = useCallback(
        (id: string) => {
            if (!window.confirm(t("people.delete_confirm"))) return;
            deletePerson.mutate(id);
            if (selectedPersonId === id) setSelectedPersonId(null);
        },
        [deletePerson, selectedPersonId, t],
    );

    const handleTogglePin = useCallback(
        (person: Person) => {
            updatePerson.mutate({ id: person.id, isPinned: !person.isPinned });
        },
        [updatePerson],
    );

    const handleToggleArchive = useCallback(
        (person: Person) => {
            updatePerson.mutate({ id: person.id, isArchived: !person.isArchived });
        },
        [updatePerson],
    );

    const handleCopyPerson = useCallback(
        (person: Person) => {
            createPerson.mutate({
                name: person.name + " (副本)",
                englishName: person.englishName,
                nickname: person.nickname,
                remark: person.remark,
                groupId: person.groupId,
                tagIds: person.tagIds,
            });
        },
        [createPerson],
    );

    const handlePersonContextMenu = useCallback((e: React.MouseEvent, person: Person) => {
        e.preventDefault();
        e.stopPropagation();
        setPersonContextMenu({ x: e.clientX, y: e.clientY, person });
    }, []);

    // Person Group CRUD
    const handleCreateGroup = useCallback(() => {
        if (!newGroupName.trim()) return;
        createPersonGroup.mutate(
            { name: newGroupName.trim(), color: newGroupColor, icon: newGroupIcon },
            {
                onSuccess: () => {
                    setNewGroupName("");
                    setNewGroupColor("#3B82F6");
                    setNewGroupIcon("👥");
                    setShowGroupForm(false);
                },
            },
        );
    }, [newGroupName, newGroupColor, newGroupIcon, createPersonGroup]);

    const handleEditGroup = useCallback((e: React.MouseEvent, group: PersonGroup) => {
        e.stopPropagation();
        setEditingGroup(group);
        setNewGroupName(group.name);
        setNewGroupColor(group.color || "#3B82F6");
        setNewGroupIcon(group.icon || "👥");
        setShowGroupForm(true);
    }, []);

    const handleUpdateGroup = useCallback(() => {
        if (!editingGroup || !newGroupName.trim()) return;
        updatePersonGroup.mutate(
            { id: editingGroup.id, name: newGroupName.trim(), color: newGroupColor, icon: newGroupIcon },
            {
                onSuccess: () => {
                    setEditingGroup(null);
                    setNewGroupName("");
                    setShowGroupForm(false);
                },
            },
        );
    }, [editingGroup, newGroupName, newGroupColor, newGroupIcon, updatePersonGroup]);

    const handleToggleGroupPin = useCallback(
        (id: string) => {
            const group = personGroups.find((g) => g.id === id);
            if (group) {
                updatePersonGroup.mutate({ id, isPinned: !group.isPinned });
            }
            setContextMenu(null);
        },
        [personGroups, updatePersonGroup],
    );

    const handleArchiveGroup = useCallback(
        (id: string) => {
            const group = personGroups.find((g) => g.id === id);
            if (group) {
                updatePersonGroup.mutate({ id, isArchived: !group.isArchived });
            }
            setContextMenu(null);
        },
        [personGroups, updatePersonGroup],
    );

    const handleDeleteGroup = useCallback(
        (id: string) => {
            if (!window.confirm(t("people.groups.delete_confirm"))) return;
            deletePersonGroup.mutate(id);
            if (selectedGroupId === id) {
                setSelectedGroupId(null);
                setSelectedSmartGroup("all");
            }
            setContextMenu(null);
        },
        [deletePersonGroup, selectedGroupId, t],
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
            return t(`people.smart_groups.${selectedSmartGroup}`);
        }
        if (selectedGroupId) {
            const group = personGroups.find((g) => g.id === selectedGroupId);
            return group ? `${resolveIcon(group.icon)} ${group.name}` : "";
        }
        return t("people.smart_groups.all");
    }, [selectedSmartGroup, selectedGroupId, personGroups, t]);

    // Tag helpers
    const parseTagIds = useCallback((tagIds?: string): string[] => {
        if (!tagIds) return [];
        return tagIds.split(",").filter(Boolean);
    }, []);

    // Color presets
    const COLOR_PRESETS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#06B6D4", "#84CC16"];

    return (
        <div className="flex h-full bg-gray-50 dark:bg-gray-900">
            {/* Left Panel: Groups */}
            <div
                className="overflow-hidden border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex-shrink-0 flex flex-col"
                style={{ width: personGroupsPanelWidth }}
            >
                <div className="p-3 flex-1 overflow-y-auto">
                    {/* Smart Groups */}
                    <div className="mb-3">
                        <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                {t("people.smart_groups.all")}
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
                                            ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                                            : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                    }`}
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

                    {/* Person Groups */}
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
                                {t("people.groups.title")}
                            </button>
                            <button
                                onClick={() => {
                                    setEditingGroup(null);
                                    setNewGroupName("");
                                    setNewGroupColor("#3B82F6");
                                    setNewGroupIcon("👥");
                                    setShowGroupForm(true);
                                }}
                                className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            >
                                <PlusIcon className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        {groupsExpanded && (
                            <>
                                {personGroups.filter((g) => !g.isArchived).length === 0 && !showGroupForm && (
                                    <p className="text-xs text-gray-400 dark:text-gray-500 px-2.5 py-2">
                                        {t("people.groups.no_groups")}
                                    </p>
                                )}
                                {personGroups
                                    .filter((g) => !g.isArchived)
                                    .map((group) => {
                                        const isActive = selectedGroupId === group.id;
                                        return (
                                            <button
                                                key={group.id}
                                                onClick={() => handleSelectPersonGroup(group.id)}
                                                onContextMenu={(e) => handleGroupContextMenu(e, group.id)}
                                                className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm transition-colors mb-0.5 ${
                                                    isActive
                                                        ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                                                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                                }`}
                                            >
                                                <span className="text-sm">{resolveIcon(group.icon)}</span>
                                                <span className="flex-1 text-left truncate">{group.name}</span>
                                                {group.isPinned && (
                                                    <Star className="w-3 h-3 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                                                )}
                                                <span
                                                    className="w-2 h-2 rounded-full flex-shrink-0"
                                                    style={{ backgroundColor: group.color || "#3B82F6" }}
                                                />
                                            </button>
                                        );
                                    })}
                            </>
                        )}

                        {/* Inline group form */}
                        {showGroupForm && (
                            <div className="mt-1 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                <input
                                    type="text"
                                    value={newGroupName}
                                    onChange={(e) => setNewGroupName(e.target.value)}
                                    placeholder={t("people.groups.name_placeholder")}
                                    className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    autoFocus
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            editingGroup ? handleUpdateGroup() : handleCreateGroup();
                                        }
                                        if (e.key === "Escape") {
                                            setShowGroupForm(false);
                                            setEditingGroup(null);
                                        }
                                    }}
                                />
                                <div className="flex gap-1 mt-1.5 flex-wrap">
                                    {COLOR_PRESETS.map((c) => (
                                        <button
                                            key={c}
                                            onClick={() => setNewGroupColor(c)}
                                            className={`w-5 h-5 rounded-full border-2 ${
                                                newGroupColor === c
                                                    ? "border-gray-900 dark:border-white"
                                                    : "border-transparent"
                                            }`}
                                            style={{ backgroundColor: c }}
                                        />
                                    ))}
                                </div>
                                <div className="flex gap-1 mt-1.5">
                                    <button
                                        onClick={editingGroup ? handleUpdateGroup : handleCreateGroup}
                                        className="flex-1 px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                                    >
                                        {t("common.save")}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowGroupForm(false);
                                            setEditingGroup(null);
                                        }}
                                        className="flex-1 px-2 py-1 text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                                    >
                                        {t("common.cancel")}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <ResizeHandle
                onResize={(delta) => setPersonGroupsPanelWidth((w) => Math.max(150, Math.min(300, w + delta)))}
            />

            {/* Middle Panel: Person List */}
            <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-gray-800">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">{activeLabel}</h2>
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <MagnifyingGlassIcon className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={t("people.search_placeholder")}
                                className="pl-7 pr-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500 w-40"
                            />
                        </div>
                    </div>
                </div>

                {/* Person List */}
                <div className="flex-1 overflow-y-auto">
                    {filteredPersons.length === 0 && !searchQuery ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500">
                            <UserIcon className="w-10 h-10 mb-2 opacity-50" />
                            <p className="text-sm">{t("people.no_people")}</p>
                        </div>
                    ) : filteredPersons.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500">
                            <MagnifyingGlassIcon className="w-10 h-10 mb-2 opacity-50" />
                            <p className="text-sm">{t("people.no_people")}</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                            {filteredPersons.map((person) => {
                                const isSelected = selectedPersonId === person.id;
                                return (
                                    <div
                                        key={person.id}
                                        onClick={() => setSelectedPersonId(person.id)}
                                        onContextMenu={(e) => handlePersonContextMenu(e, person)}
                                        className={`px-4 py-2.5 cursor-pointer transition-colors ${
                                            isSelected
                                                ? "bg-blue-50 dark:bg-blue-900/20 border-l-2 border-blue-500"
                                                : "hover:bg-gray-50 dark:hover:bg-gray-700/50 border-l-2 border-transparent"
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                                                <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                                                    {person.name.charAt(0)}
                                                </span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate flex items-center gap-1">
                                                    {person.isPinned && (
                                                        <Star className="w-3 h-3 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                                                    )}
                                                    {person.name}
                                                    {person.nickname && (
                                                        <span className="text-xs text-gray-400 dark:text-gray-500 font-normal">
                                                            ({person.nickname})
                                                        </span>
                                                    )}
                                                </p>
                                                {person.englishName && (
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                                        {person.englishName}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Create button */}
                {selectedSmartGroup !== "archived" && (
                    <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700">
                        <button
                            onClick={handleCreatePerson}
                            className="w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm"
                        >
                            <PlusIcon className="w-4 h-4" />
                            {t("people.new_person")}
                        </button>
                    </div>
                )}
            </div>

            <ResizeHandle onResize={(delta) => setDetailPanelWidth((w) => Math.max(300, Math.min(800, w + delta)))} />

            {/* Right Panel: Person Detail */}
            <div
                className="overflow-hidden border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex-shrink-0 flex flex-col"
                style={{ width: detailPanelWidth }}
            >
                {selectedPerson ? (
                    <div className="flex flex-col h-full">
                        {/* Avatar & Name */}
                        <div className="px-4 pt-4 pb-2 flex-shrink-0">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                                    <span className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                                        {localName.charAt(0) || "?"}
                                    </span>
                                </div>
                                <input
                                    type="text"
                                    value={localName}
                                    onChange={(e) => {
                                        setLocalName(e.target.value);
                                        debounceSave("name", e.target.value, nameDebounceRef);
                                    }}
                                    placeholder={t("people.detail.name_placeholder")}
                                    className="flex-1 text-lg font-semibold bg-transparent border-none outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400"
                                />
                            </div>
                        </div>

                        {/* Tags */}
                        <div className="px-4 pb-2 flex-shrink-0">
                            <TagCombobox
                                selectedIds={parseTagIds(selectedPerson.tagIds)}
                                allTags={allTags}
                                onToggle={(tagId: string) => {
                                    const current = parseTagIds(selectedPerson.tagIds);
                                    const next = current.includes(tagId)
                                        ? current.filter((id) => id !== tagId)
                                        : [...current, tagId];
                                    updatePerson.mutate({ id: selectedPerson.id, tagIds: next.join(",") });
                                }}
                                onCreateTag={() => {}}
                            />
                        </div>

                        {/* Actions bar */}
                        <div className="px-4 pb-2 flex items-center gap-2 flex-shrink-0">
                            <button
                                onClick={() => handleTogglePin(selectedPerson)}
                                className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                                    selectedPerson.isPinned
                                        ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400"
                                        : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
                                }`}
                            >
                                <StarIcon className="w-3.5 h-3.5" />
                                {selectedPerson.isPinned ? t("people.unfavorite") : t("people.favorite")}
                            </button>
                            <button
                                onClick={() => handleToggleArchive(selectedPerson)}
                                className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            >
                                {selectedPerson.isArchived ? (
                                    <>
                                        <ArchiveRestore className="w-3.5 h-3.5" />
                                        {t("people.groups.unarchive")}
                                    </>
                                ) : (
                                    <>
                                        <ArchiveBoxIcon className="w-3.5 h-3.5" />
                                        {t("people.groups.archive")}
                                    </>
                                )}
                            </button>
                            <button
                                onClick={() => handleDeletePerson(selectedPerson.id)}
                                className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                            >
                                <TrashIcon className="w-3.5 h-3.5" />
                                {t("common.delete")}
                            </button>
                        </div>

                        {/* Detail Fields */}
                        <div className="flex-1 overflow-auto px-4 pb-4 space-y-4">
                            {/* English Name */}
                            <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                                    {t("people.detail.english_name")}
                                </label>
                                <input
                                    type="text"
                                    value={localEnglishName}
                                    onChange={(e) => {
                                        setLocalEnglishName(e.target.value);
                                        debounceSave("englishName", e.target.value, englishNameDebounceRef);
                                    }}
                                    placeholder={t("people.detail.english_name_placeholder")}
                                    className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                            </div>

                            {/* Nickname */}
                            <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                                    {t("people.detail.nickname")}
                                </label>
                                <input
                                    type="text"
                                    value={localNickname}
                                    onChange={(e) => {
                                        setLocalNickname(e.target.value);
                                        debounceSave("nickname", e.target.value, nicknameDebounceRef);
                                    }}
                                    placeholder={t("people.detail.nickname_placeholder")}
                                    className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                            </div>

                            {/* Phones */}
                            <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                                    <div className="flex items-center gap-1">
                                        <PhoneIcon className="w-3.5 h-3.5" />
                                        {t("people.detail.phones")}
                                    </div>
                                </label>
                                <div className="group">
                                    <PhoneListEditor personId={selectedPerson.id} phones={phones} />
                                </div>
                            </div>

                            {/* Emails */}
                            <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                                    <div className="flex items-center gap-1">
                                        <EnvelopeIcon className="w-3.5 h-3.5" />
                                        {t("people.detail.emails")}
                                    </div>
                                </label>
                                <div className="group">
                                    <EmailListEditor personId={selectedPerson.id} emails={emails} />
                                </div>
                            </div>

                            {/* Remark */}
                            <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                                    {t("people.detail.remark")}
                                </label>
                                <textarea
                                    value={localRemark}
                                    onChange={(e) => {
                                        setLocalRemark(e.target.value);
                                        debounceSave("remark", e.target.value, remarkDebounceRef);
                                    }}
                                    placeholder={t("people.detail.remark_placeholder")}
                                    rows={4}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                                />
                            </div>
                        </div>

                        {/* Metadata */}
                        <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 text-[10px] text-gray-400 dark:text-gray-500 flex-shrink-0">
                            <p>
                                {t("common.edit")}: {new Date(selectedPerson.updatedAt).toLocaleString()}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500">
                        <UserIcon className="w-10 h-10 mb-2 opacity-50" />
                        <p className="text-sm">{t("people.select_person")}</p>
                    </div>
                )}
            </div>

            {/* Context Menu - Group */}
            {contextMenu && (
                <>
                    <div className="fixed inset-0 z-50" onClick={() => setContextMenu(null)} />
                    <div
                        className="fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 min-w-[160px]"
                        style={{ left: contextMenu.x, top: contextMenu.y }}
                    >
                        <button
                            onClick={() => {
                                const group = personGroups.find((g) => g.id === contextMenu.id);
                                if (group) handleEditGroup({ stopPropagation: () => {} } as React.MouseEvent, group);
                                setContextMenu(null);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                            <PencilIcon className="w-4 h-4" />
                            {t("common.edit")}
                        </button>
                        <button
                            onClick={() => handleToggleGroupPin(contextMenu.id)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                            <StarIcon className="w-4 h-4" />
                            {personGroups.find((g) => g.id === contextMenu.id)?.isPinned
                                ? t("people.unpin")
                                : t("people.pin")}
                        </button>
                        <button
                            onClick={() => handleArchiveGroup(contextMenu.id)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                            <ArchiveBoxIcon className="w-4 h-4" />
                            {personGroups.find((g) => g.id === contextMenu.id)?.isArchived
                                ? t("people.groups.unarchive")
                                : t("people.groups.archive")}
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

            {/* Context Menu - Person */}
            {personContextMenu && (
                <>
                    <div className="fixed inset-0 z-50" onClick={() => setPersonContextMenu(null)} />
                    <div
                        className="fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 min-w-[160px]"
                        style={{ left: personContextMenu.x, top: personContextMenu.y }}
                    >
                        <button
                            onClick={() => {
                                handleTogglePin(personContextMenu.person);
                                setPersonContextMenu(null);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                            <StarIcon className="w-4 h-4" />
                            {personContextMenu.person.isPinned ? t("people.unfavorite") : t("people.favorite")}
                        </button>
                        <button
                            onClick={() => {
                                handleToggleArchive(personContextMenu.person);
                                setPersonContextMenu(null);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                            <ArchiveBoxIcon className="w-4 h-4" />
                            {personContextMenu.person.isArchived ? t("people.groups.unarchive") : t("people.groups.archive")}
                        </button>
                        <button
                            onClick={() => {
                                handleCopyPerson(personContextMenu.person);
                                setPersonContextMenu(null);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                            <BookOpenIcon className="w-4 h-4" />
                            {t("people.copy")}
                        </button>
                        <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                        <button
                            onClick={() => {
                                handleDeletePerson(personContextMenu.person.id);
                                setPersonContextMenu(null);
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
