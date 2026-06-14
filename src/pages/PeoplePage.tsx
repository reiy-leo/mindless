import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import {
    PlusIcon,
    PencilIcon,
    ChevronDownIcon,
    ChevronRightIcon,
    ArchiveBoxIcon,
    TrashIcon,
    MagnifyingGlassIcon,
    BookOpenIcon,
    StarIcon,
    UserIcon,
    PhoneIcon,
    EnvelopeIcon,
} from "@heroicons/react/24/outline";
import { Star } from "lucide-react";
import NiceAvatar, { genConfig } from "react-nice-avatar";
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
    useCreatePersonPhones,
    useCreatePersonEmails,
    useCreatePersonPhone,
    useDeletePersonPhone,
    useCreatePersonEmail,
    useDeletePersonEmail,
} from "@/queries/usePersonQueries";
import { useTags, useCreateTag } from "@/queries/useTaskQueries";
import { useAppStore } from "@/stores/useAppStore";
import TagCombobox from "@/components/TagCombobox";
import PhoneEmailListEditor from "@/components/PhoneEmailListEditor";
import SimpleListEditor from "@/components/SimpleListEditor";
import type { Person, PersonGroup, PhoneEntry, EmailEntry } from "@/types/person";

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

const AVATAR_SEEDS = [
    "Alice",
    "Bob",
    "Charlie",
    "Diana",
    "Eve",
    "Frank",
    "Grace",
    "Hank",
    "Ivy",
    "Jack",
    "Kate",
    "Leo",
    "Mia",
    "Nick",
    "Olivia",
    "Paul",
    "Quinn",
    "Rose",
    "Sam",
    "Tina",
    "Uma",
    "Vince",
    "Wendy",
    "Xander",
    "Bryan",
    "Elisa",
];

function AvatarImage({ 
    seed, 
    size = 40, 
    avatarRef 
}: { 
    seed: string; 
    size?: number; 
    avatarRef?: React.RefObject<HTMLDivElement> 
}) {
    const config = genConfig(seed || "default");
    return (
        <div ref={avatarRef} className="w-full h-full">
            <NiceAvatar style={{ width: size, height: size }} {...config} />
        </div>
    );
}

// ==================== Smart Groups ====================
type SmartGroupId = "favorites" | "all" | "archived";

const SMART_GROUPS: { id: SmartGroupId; icon: React.ComponentType<{ className?: string }>; labelKey: string }[] = [
    { id: "favorites", icon: StarIcon, labelKey: "people.smart_groups.favorites" },
    { id: "all", icon: BookOpenIcon, labelKey: "people.smart_groups.all" },
    { id: "archived", icon: ArchiveBoxIcon, labelKey: "people.smart_groups.archived" },
];

// ==================== Avatar Picker ====================

function AvatarPicker({ 
    avatarButtonRef, 
    onSelect, 
    onClose 
}: { 
    avatarButtonRef: React.RefObject<HTMLDivElement>;
    onSelect: (seed: string) => void; 
    onClose: () => void; 
}) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            const clickedOutsidePicker = ref.current && !ref.current.contains(e.target as Node);
            const clickedAvatarButton = avatarButtonRef.current && avatarButtonRef.current.contains(e.target as Node);
            if (clickedOutsidePicker && !clickedAvatarButton) {
                onClose();
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [onClose, avatarButtonRef]);

    return (
        <div
            ref={ref}
            className="absolute z-50 top-full left-0 mt-1 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-3 w-[350px] h-[300px] overflow-y-auto"
        >
            <div className="grid grid-cols-5 gap-2">
                {AVATAR_SEEDS.map((s) => (
                    <button
                        key={s}
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onSelect(s); onClose(); }}
                        className="w-14 h-14 rounded-full overflow-hidden hover:ring-2 hover:ring-blue-500 transition-all p-0"
                    >
                        <AvatarImage seed={s} size={56} />
                    </button>
                ))}
            </div>
        </div>
    );
}

// ==================== Person Create Form ====================

function PersonCreateForm({
    onSave,
    onCancel,
}: {
    onSave: (data: {
        name: string;
        englishName: string;
        nickname: string;
        birthday: string;
        lunarBirthday: string;
        foodTaboos: string[];
        preferences: string[];
        remark: string;
        avatar: string;
        phones: { phone: string; label: string }[];
        emails: { email: string; label: string }[];
    }) => void;
    onCancel: () => void;
}) {
    const { t } = useTranslation("common");
    const [name, setName] = useState("");
    const [englishName, setEnglishName] = useState("");
    const [nickname, setNickname] = useState("");
    const [birthday, setBirthday] = useState("");
    const [lunarBirthday, setLunarBirthday] = useState("");
    const [foodTaboos, setFoodTaboos] = useState<string[]>([]);
    const [preferences, setPreferences] = useState<string[]>([]);
    const [remark, setRemark] = useState("");
    const [avatarSeed, setAvatarSeed] = useState("beam");
    const [showAvatarPicker, setShowAvatarPicker] = useState(false);
    const avatarButtonRef = useRef<HTMLDivElement>(null);
    const [phones, setPhones] = useState<PhoneEntry[]>([]);
    const [emails, setEmails] = useState<EmailEntry[]>([]);

    const handleSave = () => {
        onSave({
            name: name || t("people.new_person"),
            englishName,
            nickname,
            birthday,
            lunarBirthday,
            foodTaboos,
            preferences,
            remark,
            avatar: avatarSeed,
            phones: phones.map(p => ({ phone: p.value, label: p.label })),
            emails: emails.map(e => ({ email: e.value, label: e.label })),
        });
    };

    return (
        <div className="flex flex-col h-full">
            <div className="px-4 pt-4 pb-2 flex-shrink-0">
                <div className="flex items-center gap-3 mb-3">
                     <div
                         className="relative group cursor-pointer"
                         onClick={() => setShowAvatarPicker((prev) => !prev)}
                     >
                         <AvatarImage
                             avatarRef={avatarButtonRef}
                             seed={name || avatarSeed || "default"}
                             size={48}
                         />
                         {showAvatarPicker && (
                             <AvatarPicker
                                 avatarButtonRef={avatarButtonRef}
                                 onSelect={(value) => {
                                     setAvatarSeed(value);
                                     setShowAvatarPicker(false);
                                 }}
                                 onClose={() => setShowAvatarPicker(false)}
                             />
                         )}
                     </div>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={t("people.detail.name_placeholder")}
                        className="flex-1 text-lg font-semibold bg-transparent border-none outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400"
                        autoFocus
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                handleSave();
                            }
                            if (e.key === "Escape") {
                                onCancel();
                            }
                        }}
                    />
                </div>
            </div>
            <div className="flex-1 overflow-auto px-4 pb-4 space-y-4">
                <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        {t("people.detail.english_name")}
                    </label>
                    <input
                        type="text"
                        value={englishName}
                        onChange={(e) => setEnglishName(e.target.value)}
                        placeholder={t("people.detail.english_name_placeholder")}
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        {t("people.detail.nickname")}
                    </label>
                    <input
                        type="text"
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                        placeholder={t("people.detail.nickname_placeholder")}
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">生日</label>
                    <input
                        type="date"
                        value={birthday}
                        onChange={(e) => setBirthday(e.target.value)}
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">农历生日</label>
                    <input
                        type="text"
                        value={lunarBirthday}
                        onChange={(e) => setLunarBirthday(e.target.value)}
                        placeholder="例：腊月初八"
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                </div>
                {/* Phones */}
                <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        <div className="flex items-center gap-1">
                            <PhoneIcon className="w-3.5 h-3.5" />
                            手机号
                        </div>
                    </label>
                    <PhoneEmailListEditor
                        type="phone"
                        entries={phones}
                        onChange={setPhones}
                    />
                </div>

                {/* Emails */}
                <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        <div className="flex items-center gap-1">
                            <EnvelopeIcon className="w-3.5 h-3.5" />
                            邮箱
                        </div>
                    </label>
                    <PhoneEmailListEditor
                        type="email"
                        entries={emails}
                        onChange={setEmails}
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">忌口</label>
                    <SimpleListEditor
                        items={foodTaboos}
                        onChange={setFoodTaboos}
                        placeholder="输入忌口，按回车添加"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">偏好</label>
                    <SimpleListEditor
                        items={preferences}
                        onChange={setPreferences}
                        placeholder="输入偏好，按回车添加"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        {t("people.detail.remark")}
                    </label>
                    <textarea
                        value={remark}
                        onChange={(e) => setRemark(e.target.value)}
                        placeholder={t("people.detail.remark_placeholder")}
                        rows={3}
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                    />
                </div>
            </div>
            <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 flex items-center gap-2 flex-shrink-0">
                <button
                    onClick={handleSave}
                    className="flex-1 px-3 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm"
                >
                    {t("common.save")}
                </button>
                <button
                    onClick={onCancel}
                    className="flex-1 px-3 py-1.5 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors text-sm"
                >
                    {t("common.cancel")}
                </button>
            </div>
        </div>
    );
}

// ==================== Main Page ====================

export default function PeoplePage() {
    const { t } = useTranslation("common");
    const { personGroupsPanelWidth, detailPanelWidth, setPersonGroupsPanelWidth, setDetailPanelWidth } = useAppStore();
    const queryClient = useQueryClient();

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
    const [showPersonForm, setShowPersonForm] = useState(false);
    const [showDetailAvatarPicker, setShowDetailAvatarPicker] = useState(false);
    const detailAvatarButtonRef = useRef<HTMLDivElement>(null);
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
    const createPersonPhones = useCreatePersonPhones();
    const createPersonEmails = useCreatePersonEmails();
    const createPersonPhone = useCreatePersonPhone();
    const deletePersonPhone = useDeletePersonPhone();
    const createPersonEmail = useCreatePersonEmail();
    const deletePersonEmail = useDeletePersonEmail();
    const createTag = useCreateTag();

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
    const [localBirthday, setLocalBirthday] = useState("");
    const [localLunarBirthday, setLocalLunarBirthday] = useState("");
    const [localFoodTaboos, setLocalFoodTaboos] = useState<string[]>([]);
    const [localPreferences, setLocalPreferences] = useState<string[]>([]);
    const [localRemark, setLocalRemark] = useState("");
    const lastSyncedRef = useRef<string | null>(null);
    const nameDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const englishNameDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const nicknameDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const birthdayDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lunarBirthdayDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const remarkDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (selectedPerson && selectedPerson.id !== lastSyncedRef.current) {
            lastSyncedRef.current = selectedPerson.id;
            setLocalName(selectedPerson.name || "");
            setLocalEnglishName(selectedPerson.englishName || "");
            setLocalNickname(selectedPerson.nickname || "");
            setLocalBirthday(selectedPerson.birthday || "");
            setLocalLunarBirthday(selectedPerson.lunarBirthday || "");
            setLocalFoodTaboos(selectedPerson.foodTaboos ? selectedPerson.foodTaboos.split(',') : []);
            setLocalPreferences(selectedPerson.preferences ? selectedPerson.preferences.split(',') : []);
            setLocalRemark(selectedPerson.remark || "");
        }
        if (!selectedPerson) {
            lastSyncedRef.current = null;
            setLocalName("");
            setLocalEnglishName("");
            setLocalNickname("");
            setLocalBirthday("");
            setLocalLunarBirthday("");
            setLocalFoodTaboos([]);
            setLocalPreferences([]);
            setLocalRemark("");
        }
    }, [selectedPerson, selectedPersonId]);

    const debounceSave = useCallback(
        (field: string, value: string, ref: React.MutableRefObject<ReturnType<typeof setTimeout> | null>) => {
            if (!selectedPersonId) return;
            if (ref.current) clearTimeout(ref.current);
            ref.current = setTimeout(() => {
                updatePerson.mutate(
                    { id: selectedPersonId, [field]: value },
                    {
                        onSuccess: () => {
                            queryClient.invalidateQueries({ queryKey: ["persons"] });
                            queryClient.invalidateQueries({ queryKey: ["allPersons"] });
                        },
                    },
                );
            }, 500);
        },
        [selectedPersonId, updatePerson, queryClient],
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
        setShowPersonForm(true);
        setSelectedPersonId(null);
    }, []);

    const handleSaveNewPerson = useCallback(
        (data: {
            name: string;
            englishName: string;
            nickname: string;
            birthday: string;
            lunarBirthday: string;
            foodTaboos: string[];
            preferences: string[];
            remark: string;
            avatar: string;
            phones: { phone: string; label: string }[];
            emails: { email: string; label: string }[];
        }) => {
            createPerson.mutate(
                {
                    name: data.name,
                    englishName: data.englishName,
                    nickname: data.nickname,
                    birthday: data.birthday,
                    lunarBirthday: data.lunarBirthday,
                    foodTaboos: data.foodTaboos.join(','),
                    preferences: data.preferences.join(','),
                    remark: data.remark,
                    avatar: data.avatar,
                    groupId: selectedGroupId || undefined,
                },
                {
                    onSuccess: (newPerson) => {
                        // 批量创建手机号
                        if (data.phones.length > 0) {
                            createPersonPhones.mutate({
                                personId: newPerson.id,
                                phones: data.phones,
                            });
                        }
                        // 批量创建邮箱
                        if (data.emails.length > 0) {
                            createPersonEmails.mutate({
                                personId: newPerson.id,
                                emails: data.emails,
                            });
                        }
                        queryClient.invalidateQueries({ queryKey: ["persons"] });
                        queryClient.invalidateQueries({ queryKey: ["allPersons"] });
                        setShowPersonForm(false);
                        setSelectedPersonId(newPerson.id);
                    },
                    onError: (err) => {
                        console.error("Failed to create person:", err);
                    },
                },
            );
        },
        [selectedGroupId, createPerson, createPersonPhones, createPersonEmails, queryClient],
    );

    const handleCancelNewPerson = useCallback(() => {
        setShowPersonForm(false);
    }, []);

    const handleDeletePerson = useCallback(
        (id: string) => {
            if (!window.confirm(t("people.delete_confirm"))) return;
            deletePerson.mutate(id, {
                onSuccess: () => {
                    queryClient.invalidateQueries({ queryKey: ["persons"] });
                    queryClient.invalidateQueries({ queryKey: ["allPersons"] });
                },
            });
            if (selectedPersonId === id) setSelectedPersonId(null);
        },
        [deletePerson, selectedPersonId, queryClient, t],
    );

    const handleTogglePin = useCallback(
        (person: Person) => {
            updatePerson.mutate(
                { id: person.id, isPinned: !person.isPinned },
                {
                    onSuccess: () => {
                        queryClient.invalidateQueries({ queryKey: ["persons"] });
                        queryClient.invalidateQueries({ queryKey: ["allPersons"] });
                    },
                },
            );
        },
        [updatePerson, queryClient],
    );

    const handleToggleArchive = useCallback(
        (person: Person) => {
            updatePerson.mutate(
                { id: person.id, isArchived: !person.isArchived },
                {
                    onSuccess: () => {
                        queryClient.invalidateQueries({ queryKey: ["persons"] });
                        queryClient.invalidateQueries({ queryKey: ["allPersons"] });
                    },
                },
            );
        },
        [updatePerson, queryClient],
    );

    const handleCopyPerson = useCallback(
        (person: Person) => {
            createPerson.mutate(
                {
                    name: person.name + " (副本)",
                    englishName: person.englishName,
                    nickname: person.nickname,
                    birthday: person.birthday,
                    lunarBirthday: person.lunarBirthday,
                    foodTaboos: person.foodTaboos,
                    preferences: person.preferences,
                    remark: person.remark,
                    groupId: person.groupId,
                    tagIds: person.tagIds,
                },
                {
                    onSuccess: () => {
                        queryClient.invalidateQueries({ queryKey: ["persons"] });
                        queryClient.invalidateQueries({ queryKey: ["allPersons"] });
                    },
                },
            );
        },
        [createPerson, queryClient],
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
                    queryClient.invalidateQueries({ queryKey: ["personGroups"] });
                    setNewGroupName("");
                    setNewGroupColor("#3B82F6");
                    setNewGroupIcon("👥");
                    setShowGroupForm(false);
                },
            },
        );
    }, [newGroupName, newGroupColor, newGroupIcon, createPersonGroup, queryClient]);

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
                    queryClient.invalidateQueries({ queryKey: ["personGroups"] });
                    setEditingGroup(null);
                    setNewGroupName("");
                    setShowGroupForm(false);
                },
            },
        );
    }, [editingGroup, newGroupName, newGroupColor, newGroupIcon, updatePersonGroup, queryClient]);

    const handleToggleGroupPin = useCallback(
        (id: string) => {
            const group = personGroups.find((g) => g.id === id);
            if (group) {
                updatePersonGroup.mutate(
                    { id, isPinned: !group.isPinned },
                    {
                        onSuccess: () => {
                            queryClient.invalidateQueries({ queryKey: ["personGroups"] });
                        },
                    },
                );
            }
            setContextMenu(null);
        },
        [personGroups, updatePersonGroup, queryClient],
    );

    const handleArchiveGroup = useCallback(
        (id: string) => {
            const group = personGroups.find((g) => g.id === id);
            if (group) {
                updatePersonGroup.mutate(
                    { id, isArchived: !group.isArchived },
                    {
                        onSuccess: () => {
                            queryClient.invalidateQueries({ queryKey: ["personGroups"] });
                        },
                    },
                );
            }
            setContextMenu(null);
        },
        [personGroups, updatePersonGroup, queryClient],
    );

    const handleDeleteGroup = useCallback(
        (id: string) => {
            if (!window.confirm(t("people.groups.delete_confirm"))) return;
            deletePersonGroup.mutate(id, {
                onSuccess: () => {
                    queryClient.invalidateQueries({ queryKey: ["personGroups"] });
                    queryClient.invalidateQueries({ queryKey: ["persons"] });
                    queryClient.invalidateQueries({ queryKey: ["allPersons"] });
                },
            });
            if (selectedGroupId === id) {
                setSelectedGroupId(null);
                setSelectedSmartGroup("all");
            }
            setContextMenu(null);
        },
        [deletePersonGroup, selectedGroupId, queryClient, t],
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
                        {(selectedSmartGroup === "all" || selectedGroupId) && (
                            <>
                                <button
                                    onClick={handleCreatePerson}
                                    className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                                >
                                    <PlusIcon className="w-4 h-4" />
                                </button>
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
                            </>
                        )}
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
                                            <div className="w-8 h-8 rounded-full flex-shrink-0 overflow-hidden">
                                                <AvatarImage seed={person.avatar || person.id} size={32} />
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
            </div>

            <ResizeHandle onResize={(delta) => setDetailPanelWidth((w) => Math.max(300, Math.min(800, w + delta)))} />

            {/* Right Panel: Person Detail / Create Form */}
            <div
                className="overflow-hidden border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex-shrink-0 flex flex-col"
                style={{ width: detailPanelWidth }}
            >
                {showPersonForm ? (
                    <PersonCreateForm onSave={handleSaveNewPerson} onCancel={handleCancelNewPerson} />
                ) : selectedPerson ? (
                    <div className="flex flex-col h-full">
                        {/* Avatar & Name */}
                        <div className="px-4 pt-4 pb-2 flex-shrink-0">
                            <div className="flex items-center gap-3 mb-3">
                                 <div
                                     className="relative cursor-pointer"
                                     onClick={() => setShowDetailAvatarPicker((prev) => !prev)}
                                 >
                                     <AvatarImage
                                         avatarRef={detailAvatarButtonRef}
                                         seed={selectedPerson.avatar || selectedPerson.id}
                                         size={48}
                                     />
                                 </div>
                                 {showDetailAvatarPicker && (
                                     <AvatarPicker
                                         avatarButtonRef={detailAvatarButtonRef}
                                          onSelect={(style) => {
                                              updatePerson.mutate(
                                                  { id: selectedPerson.id, avatar: style },
                                                  {
                                                      onSuccess: () => {
                                                          queryClient.invalidateQueries({ queryKey: ["persons"] });
                                                          queryClient.invalidateQueries({ queryKey: ["allPersons"] });
                                                      },
                                                  },
                                              );
                                              setShowDetailAvatarPicker(false);
                                         }}
                                         onClose={() => setShowDetailAvatarPicker(false)}
                                     />
                                )}
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
                                    updatePerson.mutate(
                                        { id: selectedPerson.id, tagIds: next.join(",") },
                                        {
                                            onSuccess: () => {
                                                queryClient.invalidateQueries({ queryKey: ["persons"] });
                                                queryClient.invalidateQueries({ queryKey: ["allPersons"] });
                                            },
                                        },
                                    );
                                }}
                                onCreateTag={(name: string) => {
                                    createTag.mutate(
                                        { name },
                                        {
                                            onSuccess: (newTag) => {
                                                const current = parseTagIds(selectedPerson.tagIds);
                                                const next = [...current, newTag.id];
                                                updatePerson.mutate(
                                                    { id: selectedPerson.id, tagIds: next.join(",") },
                                                    {
                                                        onSuccess: () => {
                                                            queryClient.invalidateQueries({ queryKey: ["persons"] });
                                                            queryClient.invalidateQueries({ queryKey: ["allPersons"] });
                                                        },
                                                    },
                                                );
                                            },
                                        },
                                    );
                                }}
                            />
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

                            {/* Birthday */}
                            <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                                    生日
                                </label>
                                <input
                                    type="date"
                                    value={localBirthday}
                                    onChange={(e) => {
                                        setLocalBirthday(e.target.value);
                                        debounceSave("birthday", e.target.value, birthdayDebounceRef);
                                    }}
                                    className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                            </div>

                            {/* Lunar Birthday */}
                            <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                                    农历生日
                                </label>
                                <input
                                    type="text"
                                    value={localLunarBirthday}
                                    onChange={(e) => {
                                        setLocalLunarBirthday(e.target.value);
                                        debounceSave("lunarBirthday", e.target.value, lunarBirthdayDebounceRef);
                                    }}
                                    placeholder="例：腊月初八"
                                    className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                            </div>

                            {/* Food Taboos */}
                            <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                                    忌口
                                </label>
                                <SimpleListEditor
                                    items={localFoodTaboos}
                                    onChange={(items) => {
                                        setLocalFoodTaboos(items);
                                        updatePerson.mutate(
                                            { id: selectedPerson.id, foodTaboos: items.join(',') },
                                            {
                                                onSuccess: () => {
                                                    queryClient.invalidateQueries({ queryKey: ["persons"] });
                                                    queryClient.invalidateQueries({ queryKey: ["allPersons"] });
                                                },
                                            },
                                        );
                                    }}
                                    placeholder="输入忌口，按回车添加"
                                />
                            </div>

                            {/* Preferences */}
                            <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                                    偏好
                                </label>
                                <SimpleListEditor
                                    items={localPreferences}
                                    onChange={(items) => {
                                        setLocalPreferences(items);
                                        updatePerson.mutate(
                                            { id: selectedPerson.id, preferences: items.join(',') },
                                            {
                                                onSuccess: () => {
                                                    queryClient.invalidateQueries({ queryKey: ["persons"] });
                                                    queryClient.invalidateQueries({ queryKey: ["allPersons"] });
                                                },
                                            },
                                        );
                                    }}
                                    placeholder="输入偏好，按回车添加"
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
                                    <PhoneEmailListEditor
                                        type="phone"
                                        entries={phones.map(p => ({
                                            id: p.id,
                                            label: p.label,
                                            value: p.phone,
                                            note: ''
                                        }))}
                                        onChange={(entries) => {
                                            // 找出被删除的条目
                                            const currentIds = phones.map(p => p.id);
                                            const newIds = entries.map(e => e.id);
                                            const deletedIds = currentIds.filter(id => !newIds.includes(id));
                                            
                                            // 删除被删除的条目
                                            deletedIds.forEach(id => {
                                                deletePersonPhone.mutate(id, {
                                                    onSuccess: () => {
                                                        queryClient.invalidateQueries({ queryKey: ["personPhones", selectedPerson.id] });
                                                    },
                                                });
                                            });
                                            
                                            // 找出新增的条目
                                            const addedEntries = entries.filter(e => !currentIds.includes(e.id));
                                            addedEntries.forEach(entry => {
                                                createPersonPhone.mutate({
                                                    personId: selectedPerson.id,
                                                    phone: entry.value,
                                                    label: entry.label
                                                }, {
                                                    onSuccess: () => {
                                                        queryClient.invalidateQueries({ queryKey: ["personPhones", selectedPerson.id] });
                                                    },
                                                });
                                            });
                                        }}
                                    />
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
                                    <PhoneEmailListEditor
                                        type="email"
                                        entries={emails.map(e => ({
                                            id: e.id,
                                            label: e.label,
                                            value: e.email,
                                            note: ''
                                        }))}
                                        onChange={(entries) => {
                                            // 找出被删除的条目
                                            const currentIds = emails.map(e => e.id);
                                            const newIds = entries.map(e => e.id);
                                            const deletedIds = currentIds.filter(id => !newIds.includes(id));
                                            
                                            // 删除被删除的条目
                                            deletedIds.forEach(id => {
                                                deletePersonEmail.mutate(id, {
                                                    onSuccess: () => {
                                                        queryClient.invalidateQueries({ queryKey: ["personEmails", selectedPerson.id] });
                                                    },
                                                });
                                            });
                                            
                                            // 找出新增的条目
                                            const addedEntries = entries.filter(e => !currentIds.includes(e.id));
                                            addedEntries.forEach(entry => {
                                                createPersonEmail.mutate({
                                                    personId: selectedPerson.id,
                                                    email: entry.value,
                                                    label: entry.label
                                                }, {
                                                    onSuccess: () => {
                                                        queryClient.invalidateQueries({ queryKey: ["personEmails", selectedPerson.id] });
                                                    },
                                                });
                                            });
                                        }}
                                    />
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
                            {personContextMenu.person.isArchived
                                ? t("people.groups.unarchive")
                                : t("people.groups.archive")}
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
