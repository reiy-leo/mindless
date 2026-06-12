import { useState, useMemo, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
    PlusIcon,
    FireIcon,
    PencilIcon,
    TrashIcon,
    XMarkIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    CheckCircleIcon,
    MinusIcon,
    ArrowPathIcon,
    ArchiveBoxIcon,
    ArrowUturnLeftIcon,
    CalendarDaysIcon,
} from "@heroicons/react/24/outline";
import {
    useHabits,
    useCreateHabit,
    useUpdateHabit,
    useDeleteHabit,
    useCheckInHabit,
    useHabitLogs,
    useTodayCheckinMap,
    useRefreshStreaks,
    useHabitGroups,
    useCreateHabitGroup,
    useUpdateHabitGroup,
    useArchivedHabits,
    useUnarchiveHabit,
    useHardDeleteHabit,
    useDissolveHabitGroup,
    useDeleteHabitGroupWithHabits,
} from "@/queries/useHabitQueries";
import Select from "@/components/Select";
import MilkdownEditor from "@/components/MilkdownEditor";
import EmojiPickerButton from "@/components/EmojiPickerButton";
import { ResizeHandle } from "@/components/ResizeHandle";
import { getLunarDayStr } from "@/lib/lunar";
import { openDialogWindow, listenFromDialog } from "@/lib/dialogWindow";
import { useAppStore } from "@/stores/useAppStore";
import type { Habit, HabitGroup, HabitFrequency, TargetType, CreateHabitParams } from "@/types/habit";

// ==================== Check if Habit is Due on Date ====================
function isHabitDueOnDate(habit: Habit, dateStr: string): boolean {
    const date = new Date(dateStr + "T00:00:00");
    const startDate = habit.startDate || dateStr;
    if (dateStr < startDate) return false;

    switch (habit.frequency) {
        case "daily":
            return true;
        case "every_x_days": {
            const interval = habit.frequencyDays ? parseInt(habit.frequencyDays) : 1;
            if (interval <= 1) return true;
            const start = new Date(startDate + "T00:00:00");
            const diffDays = Math.floor((date.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
            return diffDays >= 0 && diffDays % interval === 0;
        }
        case "weekly": {
            if (!habit.frequencyDays) return true;
            const dayKeys = habit.frequencyDays.split(",").filter(Boolean);
            if (dayKeys.length === 0) return true;
            const weekDayMap: Record<string, number> = {
                sun: 0,
                mon: 1,
                tue: 2,
                wed: 3,
                thu: 4,
                fri: 5,
                sat: 6,
            };
            const dayOfWeek = date.getDay();
            return dayKeys.some((k) => weekDayMap[k] === dayOfWeek);
        }
        case "monthly": {
            const start = new Date(startDate + "T00:00:00");
            const targetDay = start.getDate();
            const lastDayOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
            return date.getDate() === Math.min(targetDay, lastDayOfMonth);
        }
        default:
            return true;
    }
}

// ==================== Days Until Next Check-in ====================
function daysUntilNextCheckin(habit: Habit): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split("T")[0];
    const startDate = habit.startDate || todayStr;

    switch (habit.frequency) {
        case "daily":
            return 0;
        case "every_x_days": {
            const interval = habit.frequencyDays ? parseInt(habit.frequencyDays) : 1;
            if (interval <= 1) return 0;
            const start = new Date(startDate + "T00:00:00");
            const diffDays = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays < 0) return -diffDays;
            const remainder = diffDays % interval;
            return remainder === 0 ? 0 : interval - remainder;
        }
        case "weekly": {
            if (!habit.frequencyDays) return 0;
            const dayKeys = habit.frequencyDays.split(",").filter(Boolean);
            if (dayKeys.length === 0) return 0;
            const weekDayMap: Record<string, number> = {
                sun: 0,
                mon: 1,
                tue: 2,
                wed: 3,
                thu: 4,
                fri: 5,
                sat: 6,
            };
            const todayDay = today.getDay();
            const targetDays = dayKeys
                .map((k) => weekDayMap[k])
                .filter((d) => d !== undefined)
                .sort((a, b) => a - b);
            for (const d of targetDays) {
                const diff = d - todayDay;
                if (diff >= 0) return diff;
            }
            return 7 - todayDay + targetDays[0];
        }
        case "monthly": {
            const start = new Date(startDate + "T00:00:00");
            const targetDay = start.getDate();
            const thisMonth = today.getMonth();
            const thisYear = today.getFullYear();
            const thisMonthTarget = new Date(
                thisYear,
                thisMonth,
                Math.min(targetDay, new Date(thisYear, thisMonth + 1, 0).getDate()),
            );
            if (thisMonthTarget >= today) {
                return Math.ceil((thisMonthTarget.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            }
            const nextMonthTarget = new Date(
                thisYear,
                thisMonth + 1,
                Math.min(targetDay, new Date(thisYear, thisMonth + 2, 0).getDate()),
            );
            return Math.ceil((nextMonthTarget.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        }
        default:
            return 0;
    }
}

// ==================== Habit Form Dialog ====================
function HabitFormDialog({
    isOpen,
    onClose,
    onSubmit,
    habit,
}: {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (params: CreateHabitParams) => void;
    habit?: Habit | null;
}) {
    const { t } = useTranslation("common");
    const isEditing = !!habit;

    const [name, setName] = useState(habit?.name || "");
    const [description, setDescription] = useState(habit?.description || "");
    const [icon, setIcon] = useState(habit?.icon || "⭐");
    const [groupId, setGroupId] = useState<string>((habit as any)?.groupId || "");
    const [frequency, setFrequency] = useState<HabitFrequency>(habit?.frequency || "daily");

    const { data: habitGroups = [] } = useHabitGroups();

    // Every X days
    const [everyXDays, setEveryXDays] = useState(() => {
        if (habit?.frequency === "every_x_days" && habit.frequencyDays) {
            return parseInt(habit.frequencyDays) || 2;
        }
        return 2;
    });

    // Weekly custom days
    const [frequencyDays, setFrequencyDays] = useState<string>(
        habit?.frequency === "weekly" ? habit?.frequencyDays || "" : "",
    );

    // Start date
    const [startDate, setStartDate] = useState(habit?.startDate || new Date().toISOString().split("T")[0]);

    // Target fields
    const [targetType, setTargetType] = useState<TargetType>(habit?.targetType || "binary");
    const [targetValue, setTargetValue] = useState(habit?.targetValue || 1);
    const [targetUnit, setTargetUnit] = useState(habit?.targetUnit || "次");

    // Reminder times (array)
    const [reminderEnabled, setReminderEnabled] = useState(habit?.reminderEnabled || false);
    const [reminderTimes, setReminderTimes] = useState<string[]>(() => {
        if (habit?.reminderTime) {
            return habit.reminderTime.split(",").filter(Boolean);
        }
        return ["09:00"];
    });

    const weekDays = [
        { key: "mon", label: t("habits.days.mon") },
        { key: "tue", label: t("habits.days.tue") },
        { key: "wed", label: t("habits.days.wed") },
        { key: "thu", label: t("habits.days.thu") },
        { key: "fri", label: t("habits.days.fri") },
        { key: "sat", label: t("habits.days.sat") },
        { key: "sun", label: t("habits.days.sun") },
    ];

    const selectedDays = frequencyDays ? frequencyDays.split(",").filter(Boolean) : [];

    const toggleDay = (day: string) => {
        const current = selectedDays.includes(day) ? selectedDays.filter((d) => d !== day) : [...selectedDays, day];
        setFrequencyDays(current.join(","));
    };

    const addReminderTime = () => {
        setReminderTimes([...reminderTimes, "12:00"]);
    };

    const removeReminderTime = (index: number) => {
        setReminderTimes(reminderTimes.filter((_, i) => i !== index));
    };

    const updateReminderTime = (index: number, value: string) => {
        const updated = [...reminderTimes];
        updated[index] = value;
        setReminderTimes(updated);
    };

    // Reset form when open
    useEffect(() => {
        if (isOpen && habit) {
            setName(habit.name);
            setDescription(habit.description || "");
            setIcon(habit.icon || "⭐");
            setGroupId((habit as any).groupId || "");
            setFrequency(habit.frequency);
            setEveryXDays(
                habit.frequency === "every_x_days" && habit.frequencyDays ? parseInt(habit.frequencyDays) || 2 : 2,
            );
            setFrequencyDays(habit.frequency === "weekly" ? habit.frequencyDays || "" : "");
            setStartDate(habit.startDate || new Date().toISOString().split("T")[0]);
            setTargetType(habit.targetType || "binary");
            setTargetValue(habit.targetValue || 1);
            setTargetUnit(habit.targetUnit || "次");
            setReminderEnabled(habit.reminderEnabled || false);
            setReminderTimes(habit.reminderTime ? habit.reminderTime.split(",").filter(Boolean) : ["09:00"]);
        } else if (isOpen) {
            setName("");
            setDescription("");
            setIcon("⭐");
            setGroupId("");
            setFrequency("daily");
            setEveryXDays(2);
            setFrequencyDays("");
            setStartDate(new Date().toISOString().split("T")[0]);
            setTargetType("binary");
            setTargetValue(1);
            setTargetUnit("次");
            setReminderEnabled(false);
            setReminderTimes(["09:00"]);
        }
    }, [isOpen, habit]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        let fDays: string | undefined;
        if (frequency === "weekly") {
            fDays = frequencyDays || undefined;
        } else if (frequency === "every_x_days") {
            fDays = String(everyXDays);
        }

        onSubmit({
            name: name.trim(),
            description: description || undefined,
            icon,
            frequency,
            targetType,
            targetValue: targetType === "binary" ? 1 : targetValue,
            targetUnit: targetType === "binary" ? undefined : targetUnit,
            frequencyDays: fDays,
            reminderEnabled,
            reminderTime: reminderEnabled && reminderTimes.length > 0 ? reminderTimes.join(",") : undefined,
            startDate,
            groupId: groupId || undefined,
        });
        onClose();
    };

    if (!isOpen) return null;

    const tabBase = "px-3 py-1.5 text-sm rounded-lg transition-all";
    const tabActive = "bg-green-500 text-white";
    const tabInactive =
        "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                        {isEditing ? t("habits.edit_habit") : t("habits.new_habit")}
                    </h2>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                        <XMarkIcon className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-auto p-6 space-y-5">
                    {/* Icon + Name + Description */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <EmojiPickerButton value={icon} onChange={setIcon} />
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                autoFocus
                                placeholder={t("habits.habit_name")}
                                className="flex-1 px-4 py-2 font-lg dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 focus:outline-none"
                            />
                        </div>
                        {/* Description (Milkdown) */}
                        <div className="border border-gray-300 dark:border-gray-600 border-none overflow-hidden min-h-[60px]">
                            <MilkdownEditor
                                markdown={description}
                                onChange={setDescription}
                                placeholder={t("habits.description")}
                            />
                        </div>
                    </div>

                    {/* Group */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {t("habits.groups.title")}
                        </label>
                        <Select
                            value={groupId}
                            onChange={setGroupId}
                            options={[
                                { value: "", label: t("habits.groups.all") },
                                ...habitGroups.map((g) => ({ value: g.id, label: g.name, icon: g.icon || "📁" })),
                            ]}
                        />
                    </div>

                    {/* Frequency (tabs) */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {t("habits.frequency_label")}
                        </label>
                        <div className="flex gap-1.5 flex-wrap">
                            {[
                                { value: "daily", label: t("habits.frequency.daily") },
                                { value: "every_x_days", label: t("habits.frequency.every_x_days") },
                                { value: "weekly", label: t("habits.frequency.weekly") },
                                { value: "monthly", label: t("habits.frequency.monthly") },
                            ].map((opt) => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => setFrequency(opt.value as HabitFrequency)}
                                    className={`${tabBase} ${frequency === opt.value ? tabActive : tabInactive}`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Every X Days input */}
                    {frequency === "every_x_days" && (
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setEveryXDays(Math.max(2, everyXDays - 1))}
                                className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                            >
                                <MinusIcon className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                            </button>
                            <input
                                type="number"
                                min={2}
                                max={365}
                                value={everyXDays}
                                onChange={(e) => setEveryXDays(Math.max(2, parseInt(e.target.value) || 2))}
                                className="w-16 px-2 py-1.5 text-center border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                            />
                            <button
                                type="button"
                                onClick={() => setEveryXDays(Math.min(365, everyXDays + 1))}
                                className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                            >
                                <PlusIcon className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                            </button>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                                {t("habits.frequency.days_unit")}
                            </span>
                        </div>
                    )}

                    {/* Weekly custom days picker */}
                    {frequency === "weekly" && (
                        <div className="flex gap-1.5 flex-wrap">
                            {weekDays.map((day) => (
                                <button
                                    key={day.key}
                                    type="button"
                                    onClick={() => toggleDay(day.key)}
                                    className={`px-3 py-1.5 text-xs rounded-full transition-all ${
                                        selectedDays.includes(day.key)
                                            ? "bg-green-500 text-white"
                                            : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
                                    }`}
                                >
                                    {day.label}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Start Date */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {t("habits.start_date")}
                        </label>
                        <button
                            type="button"
                            onClick={async () => {
                                await openDialogWindow({
                                    label: "date-picker",
                                    title: t("habits.start_date"),
                                    url: `/dialog/date-picker?date=${startDate}`,
                                    width: 380,
                                    height: 520,
                                });
                                const unlisten = await listenFromDialog("date-picker:result", (payload: any) => {
                                    if (payload?.date) setStartDate(payload.date);
                                    unlisten();
                                });
                            }}
                            className="w-full px-3 py-2 text-left border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                        >
                            {startDate} (
                            {(() => {
                                const parts = startDate.split("-").map(Number);
                                return getLunarDayStr(parts[0], parts[1], parts[2]);
                            })()}
                            )
                        </button>
                    </div>

                    {/* Target Type (tabs) */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {t("habits.target_type")}
                        </label>
                        <div className="flex gap-1.5">
                            <button
                                type="button"
                                onClick={() => setTargetType("binary")}
                                className={`${tabBase} ${targetType === "binary" ? tabActive : tabInactive}`}
                            >
                                {t("habits.target_type.binary")}
                            </button>
                            <button
                                type="button"
                                onClick={() => setTargetType("count")}
                                className={`${tabBase} ${targetType === "count" ? tabActive : tabInactive}`}
                            >
                                {t("habits.target_type.quantity")}
                            </button>
                        </div>
                    </div>

                    {/* Target Value + Unit (shown for quantity) */}
                    {targetType !== "binary" && (
                        <div className="flex items-center gap-3">
                            <div className="flex-1">
                                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                                    {t("habits.target_value")}
                                </label>
                                <input
                                    type="number"
                                    min={1}
                                    value={targetValue}
                                    onChange={(e) => setTargetValue(Math.max(1, parseInt(e.target.value) || 1))}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                                />
                            </div>
                            <div className="w-28">
                                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                                    {t("habits.target_unit")}
                                </label>
                                <button
                                    type="button"
                                    onClick={async () => {
                                        await openDialogWindow({
                                            label: "unit-selector",
                                            title: t("habits.target_unit"),
                                            url: `/dialog/unit-selector?unit=${targetUnit}`,
                                            width: 380,
                                            height: 480,
                                        });
                                        const unlisten = await listenFromDialog("unit-selector:result", (payload: any) => {
                                            if (payload?.unit) setTargetUnit(payload.unit);
                                            unlisten();
                                        });
                                    }}
                                    className="w-full px-3 py-2 text-left border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                                >
                                    {targetUnit}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Reminder */}
                    <div>
                        <label className="flex items-center justify-between cursor-pointer mb-2">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {t("habits.reminder_enabled")}
                            </span>
                            <button
                                type="button"
                                onClick={() => setReminderEnabled(!reminderEnabled)}
                                className={`relative w-10 h-5 rounded-full transition-colors ${
                                    reminderEnabled ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"
                                }`}
                            >
                                <span
                                    className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                                        reminderEnabled ? "translate-x-5" : "translate-x-0"
                                    }`}
                                />
                            </button>
                        </label>
                        {reminderEnabled && (
                            <div className="space-y-2">
                                {reminderTimes.map((time, index) => (
                                    <div key={index} className="flex items-center gap-2">
                                        <input
                                            type="time"
                                            value={time}
                                            onChange={(e) => updateReminderTime(index, e.target.value)}
                                            className="flex-1 px-3 py-1.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                                        />
                                        {reminderTimes.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removeReminderTime(index)}
                                                className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                                            >
                                                <XMarkIcon className="w-4 h-4 text-red-400" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    onClick={addReminderTime}
                                    className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300"
                                >
                                    <PlusIcon className="w-3.5 h-3.5" />
                                    {t("habits.reminder_add")}
                                </button>
                            </div>
                        )}
                    </div>
                </form>

                {/* Footer */}
                <div className="flex gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                    >
                        {t("common.cancel")}
                    </button>
                    <button
                        type="submit"
                        onClick={handleSubmit}
                        disabled={!name.trim()}
                        className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
                    >
                        {isEditing ? t("common.save") : t("common.create")}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ==================== Check-in History Calendar ====================
function CheckInCalendar({ habit }: { habit: Habit }) {
    const { t, i18n } = useTranslation("common");
    const color = habit.color;
    const [viewMonth, setViewMonth] = useState(() => {
        const now = new Date();
        return { year: now.getFullYear(), month: now.getMonth() };
    });
    const [selectedDay, setSelectedDay] = useState<string | null>(null);

    const startDate = `${viewMonth.year}-${String(viewMonth.month + 1).padStart(2, "0")}-01`;
    const endDate = `${viewMonth.year}-${String(viewMonth.month + 1).padStart(2, "0")}-31`;
    const { data: logs = [] } = useHabitLogs(habit.id, startDate, endDate);

    // Build logs map: date -> log
    const logsByDate = useMemo(() => {
        const map = new Map<string, (typeof logs)[0]>();
        logs.forEach((l) => map.set(l.logDate, l));
        return map;
    }, [logs]);

    const daysInMonth = new Date(viewMonth.year, viewMonth.month + 1, 0).getDate();
    const firstDayOfWeek = new Date(viewMonth.year, viewMonth.month, 1).getDay();
    const today = new Date().toISOString().split("T")[0];

    const monthLabel = new Date(viewMonth.year, viewMonth.month).toLocaleDateString(i18n.language, {
        year: "numeric",
        month: "long",
    });

    // Lunar data for all days in month
    const lunarDataByDay = useMemo(() => {
        const data: Map<number, { str: string; kind: "festival" | "term" | "month" | "normal" }> = new Map();
        for (let day = 1; day <= daysInMonth; day++) {
            const lunarStr = getLunarDayStr(viewMonth.year, viewMonth.month + 1, day);
            // Classify
            const solarTerms = [
                "小寒",
                "大寒",
                "立春",
                "雨水",
                "惊蛰",
                "春分",
                "清明",
                "谷雨",
                "立夏",
                "小满",
                "芒种",
                "夏至",
                "小暑",
                "大暑",
                "立秋",
                "处暑",
                "白露",
                "秋分",
                "寒露",
                "霜降",
                "立冬",
                "小雪",
                "大雪",
                "冬至",
            ];
            let kind: "festival" | "term" | "month" | "normal" = "normal";
            if (solarTerms.includes(lunarStr)) kind = "term";
            else {
                const monthNames = [
                    "正月",
                    "二月",
                    "三月",
                    "四月",
                    "五月",
                    "六月",
                    "七月",
                    "八月",
                    "九月",
                    "十月",
                    "冬月",
                    "腊月",
                ];
                if (monthNames.includes(lunarStr)) kind = "month";
                else {
                    const festivals = [
                        "春节",
                        "元宵节",
                        "端午节",
                        "七夕节",
                        "中秋节",
                        "重阳节",
                        "腊八节",
                        "除夕",
                        "元旦",
                        "国庆节",
                        "劳动节",
                        "儿童节",
                    ];
                    if (festivals.some((f) => lunarStr.includes(f))) kind = "festival";
                }
            }
            data.set(day, { str: lunarStr, kind });
        }
        return data;
    }, [viewMonth.year, viewMonth.month, daysInMonth]);

    // Check if a date is "due" based on habit frequency
    const isDateDue = useCallback(
        (dateStr: string): boolean => {
            const d = new Date(dateStr + "T12:00:00");
            const habitStart = habit.startDate || today;
            if (dateStr < habitStart) return false;
            // Don't count future dates
            if (dateStr > today) return false;

            switch (habit.frequency) {
                case "daily":
                    return true;
                case "every_x_days": {
                    const interval = habit.frequencyDays ? parseInt(habit.frequencyDays) : 1;
                    if (interval <= 1) return true;
                    const start = new Date(habitStart + "T12:00:00");
                    const diffDays = Math.floor((d.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                    return diffDays >= 0 && diffDays % interval === 0;
                }
                case "weekly": {
                    if (!habit.frequencyDays) return true;
                    const dayKeys = habit.frequencyDays.split(",").filter(Boolean);
                    if (dayKeys.length === 0) return true;
                    const weekDayMap: Record<number, string> = {
                        1: "mon",
                        2: "tue",
                        3: "wed",
                        4: "thu",
                        5: "fri",
                        6: "sat",
                        0: "sun",
                    };
                    return dayKeys.includes(weekDayMap[d.getDay()]);
                }
                case "monthly": {
                    const start = new Date(habitStart + "T12:00:00");
                    return d.getDate() === start.getDate();
                }
                default:
                    return true;
            }
        },
        [habit, today],
    );

    // Month statistics
    const stats = useMemo(() => {
        let dueDays = 0;
        let checkedDays = 0;
        let missedDays = 0;
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${viewMonth.year}-${String(viewMonth.month + 1).padStart(2, "0")}-${String(day).padStart(
                2,
                "0",
            )}`;
            if (dateStr > today) continue;
            const due = isDateDue(dateStr);
            const checked = logsByDate.has(dateStr);
            if (due) {
                dueDays++;
                if (checked) checkedDays++;
                else missedDays++;
            }
        }
        const rate = dueDays > 0 ? Math.round((checkedDays / dueDays) * 100) : 0;
        return { dueDays, checkedDays, missedDays, rate };
    }, [viewMonth, daysInMonth, today, isDateDue, logsByDate]);

    // Selected day detail
    const selectedLog = selectedDay ? logsByDate.get(selectedDay) : null;

    const prevMonth = () => {
        setViewMonth((v) => (v.month === 0 ? { year: v.year - 1, month: 11 } : { ...v, month: v.month - 1 }));
        setSelectedDay(null);
    };
    const nextMonth = () => {
        setViewMonth((v) => (v.month === 11 ? { year: v.year + 1, month: 0 } : { ...v, month: v.month + 1 }));
        setSelectedDay(null);
    };
    const goToday = () => {
        const now = new Date();
        setViewMonth({ year: now.getFullYear(), month: now.getMonth() });
    };

    const dayLabels = [
        t("habits.calendar.sun"),
        t("habits.calendar.mon"),
        t("habits.calendar.tue"),
        t("habits.calendar.wed"),
        t("habits.calendar.thu"),
        t("habits.calendar.fri"),
        t("habits.calendar.sat"),
    ];

    function getLunarColor(kind: string): string {
        if (kind === "festival") return "text-red-500 dark:text-red-400";
        if (kind === "term") return "text-green-600 dark:text-green-400";
        if (kind === "month") return "text-orange-500 dark:text-orange-400";
        return "text-gray-400 dark:text-gray-500";
    }

    return (
        <div className="mt-4 border border-gray-100 dark:border-gray-700 rounded-xl p-3 bg-gray-50/50 dark:bg-gray-800/50">
            {/* Header: month nav + stats */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1">
                    <button
                        onClick={prevMonth}
                        className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                        <ChevronLeftIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    </button>
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 min-w-[130px] text-center">
                        {monthLabel}
                    </span>
                    <button
                        onClick={nextMonth}
                        className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                        <ChevronRightIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    </button>
                    <button
                        onClick={goToday}
                        className="ml-1 px-2 py-0.5 text-xs rounded bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                    >
                        {t("tasks.views.today")}
                    </button>
                </div>
                <div className="flex items-center gap-3 text-xs">
                    <span className="text-gray-500 dark:text-gray-400">
                        <span className="font-semibold" style={{ color }}>
                            {stats.checkedDays}
                        </span>
                        /{stats.dueDays}
                    </span>
                    <span
                        className={`px-1.5 py-0.5 rounded-full font-medium ${
                            stats.rate >= 80
                                ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                                : stats.rate >= 50
                                ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400"
                                : "bg-red-100 dark:bg-red-900/30 text-red-500 dark:text-red-400"
                        }`}
                    >
                        {stats.rate}%
                    </span>
                </div>
            </div>

            {/* Day labels */}
            <div className="grid grid-cols-7 gap-0.5 mb-1">
                {dayLabels.map((d) => (
                    <div key={d} className="text-center text-xs text-gray-400 dark:text-gray-500 py-0.5">
                        {d}
                    </div>
                ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-0.5">
                {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                    <div key={`empty-${i}`} />
                ))}
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                    const dateStr = `${viewMonth.year}-${String(viewMonth.month + 1).padStart(2, "0")}-${String(
                        day,
                    ).padStart(2, "0")}`;
                    const log = logsByDate.get(dateStr);
                    const isChecked = !!log;
                    const isToday = dateStr === today;
                    const isSelected = dateStr === selectedDay;
                    const due = isDateDue(dateStr);
                    const missed = due && !isChecked && dateStr <= today;
                    const lunarDay = lunarDataByDay.get(day);

                    // Heatmap: for value habits, compute fill intensity
                    let fillOpacity = 0;
                    if (isChecked) {
                        if (habit.targetType !== "binary" && habit.targetValue > 1 && log) {
                            fillOpacity = Math.min(1, Math.max(0.25, log.value / habit.targetValue));
                        } else {
                            fillOpacity = 1;
                        }
                    }

                    return (
                        <button
                            key={day}
                            type="button"
                            onClick={() => setSelectedDay(selectedDay === dateStr ? null : dateStr)}
                            className={`relative flex flex-col items-center justify-start rounded-lg py-0.5 transition-all
                ${missed && !isSelected ? "ring-1 ring-red-300 dark:ring-red-700" : ""}
                hover:bg-gray-100 dark:hover:bg-gray-700
              `}
                            style={{
                                backgroundColor: isChecked
                                    ? `${color}${Math.round(fillOpacity * 255)
                                          .toString(16)
                                          .padStart(2, "0")}`
                                    : undefined,
                                boxShadow: isSelected ? `0 0 0 2px #fff, 0 0 0 4px ${color}` : undefined,
                            }}
                        >
                            <span
                                className={`text-xs leading-none ${
                                    isChecked
                                        ? fillOpacity > 0.5
                                            ? "text-white font-bold"
                                            : "font-semibold"
                                        : isToday
                                        ? "font-bold"
                                        : "text-gray-600 dark:text-gray-400"
                                }`}
                                style={
                                    isToday && !isChecked
                                        ? { color }
                                        : isChecked && fillOpacity > 0.5
                                        ? { color: "#fff" }
                                        : {}
                                }
                            >
                                {day}
                            </span>
                            {lunarDay && (
                                <span
                                    className={`text-xs leading-tight truncate max-w-full px-0.5 ${
                                        isChecked && fillOpacity > 0.5 ? "text-white/70" : getLunarColor(lunarDay.kind)
                                    }`}
                                >
                                    {lunarDay.str}
                                </span>
                            )}
                            {/* Value label for non-binary habits */}
                            {isChecked && log && habit.targetType !== "binary" && (
                                <span
                                    className={`text-xs leading-tight font-medium ${
                                        fillOpacity > 0.5 ? "text-white/80" : ""
                                    }`}
                                    style={fillOpacity <= 0.5 ? { color } : {}}
                                >
                                    {log.value}
                                    {habit.targetType === "duration" ? "m" : ""}
                                </span>
                            )}
                            {/* Today indicator */}
                            {isToday && !isChecked && (
                                <span
                                    className="absolute -bottom-0.5 w-1 h-1 rounded-full"
                                    style={{ backgroundColor: color }}
                                />
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Selected day detail panel */}
            {selectedDay && (
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{selectedDay}</span>
                            {(() => {
                                const parts = selectedDay.split("-").map(Number);
                                const lunar = getLunarDayStr(parts[0], parts[1], parts[2]);
                                return <span className="text-xs text-gray-400 dark:text-gray-500">{lunar}</span>;
                            })()}
                        </div>
                        {selectedLog ? (
                            <div className="flex items-center gap-2">
                                {habit.targetType !== "binary" && (
                                    <span className="text-xs font-semibold" style={{ color }}>
                                        {selectedLog.value} / {habit.targetValue} {habit.targetUnit || "次"}
                                    </span>
                                )}
                                <span className="flex items-center gap-0.5 text-xs text-green-600 dark:text-green-400">
                                    <CheckCircleIcon className="w-3 h-3" />
                                    {selectedLog.logTime ? selectedLog.logTime.slice(0, 5) : t("habits.checked_in")}
                                </span>
                            </div>
                        ) : (
                            <span
                                className={`text-xs ${
                                    isDateDue(selectedDay)
                                        ? "text-red-400 dark:text-red-500"
                                        : "text-gray-400 dark:text-gray-500"
                                }`}
                            >
                                {isDateDue(selectedDay) ? t("habits.missed") : t("habits.not_due")}
                            </span>
                        )}
                    </div>
                    {selectedLog?.note && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{selectedLog.note}</p>
                    )}
                </div>
            )}

            {/* Legend */}
            <div className="flex items-center justify-between mt-3 text-xs text-gray-400 dark:text-gray-500">
                <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded" style={{ backgroundColor: color }} />
                        {t("habits.checked_in")}
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded ring-1 ring-red-300 dark:ring-red-700" />
                        {t("habits.missed")}
                    </span>
                </div>
                {stats.missedDays > 0 && (
                    <span className="text-red-400 dark:text-red-500">
                        {t("habits.missed_count", { count: stats.missedDays })}
                    </span>
                )}
            </div>
        </div>
    );
}

// ==================== Week View Bar ====================
function WeekView({ selectedDate, onSelectDate }: { selectedDate: string; onSelectDate: (date: string) => void }) {
    const { t } = useTranslation("common");
    const [weekOffset, setWeekOffset] = useState(0);

    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    const getWeekStart = (offset: number) => {
        const d = new Date(today);
        const dayOfWeek = d.getDay();
        const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        d.setDate(d.getDate() + diff + offset * 7);
        return d;
    };

    const weekStart = getWeekStart(weekOffset);
    const days: { date: Date; dateStr: string; dayName: string }[] = [];
    const dayKeys = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

    for (let i = 0; i < 7; i++) {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + i);
        days.push({
            date: d,
            dateStr: d.toISOString().split("T")[0],
            dayName: t(`habits.days.${dayKeys[i]}`),
        });
    }

    return (
        <div className="flex items-center gap-1 mb-4">
            <button
                onClick={() => setWeekOffset(weekOffset - 1)}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
                <ChevronLeftIcon className="w-4 h-4 text-gray-500" />
            </button>
            <div className="flex-1 grid grid-cols-7 gap-1">
                {days.map((day) => {
                    const parts = day.dateStr.split("-").map(Number);
                    const lunarStr = getLunarDayStr(parts[0], parts[1], parts[2]);
                    const isSelected = day.dateStr === selectedDate;
                    const isToday = day.dateStr === todayStr;

                    return (
                        <button
                            key={day.dateStr}
                            onClick={() => onSelectDate(day.dateStr)}
                            className={`flex flex-col items-center py-1.5 px-1 rounded-lg transition-all text-xs ${
                                isSelected
                                    ? "bg-blue-50 dark:bg-blue-900/30 ring-2 ring-blue-400"
                                    : isToday
                                    ? "bg-gray-100 dark:bg-gray-700 font-bold"
                                    : "hover:bg-gray-50 dark:hover:bg-gray-800"
                            }`}
                        >
                            <span
                                className={`text-[10px] ${
                                    isSelected ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-400"
                                }`}
                            >
                                {day.dayName}
                            </span>
                            <span
                                className={`text-sm font-semibold ${
                                    isSelected ? "text-blue-600 dark:text-blue-400" : "text-gray-800 dark:text-gray-200"
                                }`}
                            >
                                {day.date.getDate()}
                            </span>
                            <span
                                className={`text-[10px] ${
                                    isSelected ? "text-blue-500 dark:text-blue-400" : "text-gray-400 dark:text-gray-500"
                                }`}
                            >
                                {lunarStr}
                            </span>
                        </button>
                    );
                })}
            </div>
            <button
                onClick={() => setWeekOffset(weekOffset + 1)}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
                <ChevronRightIcon className="w-4 h-4 text-gray-500" />
            </button>
        </div>
    );
}

// ==================== Habit Card ====================
function HabitCard({
    habit,
    onCheckIn,
    todayValue,
    isArchived,
    onUnarchive,
    onHardDelete,
    onContextMenu,
}: {
    habit: Habit;
    onCheckIn: (value?: number) => void;
    todayValue: number;
    isArchived?: boolean;
    onUnarchive?: () => void;
    onHardDelete?: () => void;
    onContextMenu?: (e: React.MouseEvent) => void;
}) {
    const { t } = useTranslation("common");
    const [showCalendar, setShowCalendar] = useState(false);

    const getFrequencyLabel = (freq: HabitFrequency) => {
        switch (freq) {
            case "daily":
                return t("habits.frequency.daily");
            case "every_x_days": {
                const n = habit.frequencyDays ? parseInt(habit.frequencyDays) : 2;
                return t("habits.frequency.every_x_days_value", { days: n });
            }
            case "weekly": {
                const days = habit.frequencyDays ? habit.frequencyDays.split(",").filter(Boolean) : [];
                if (days.length > 0 && days.length < 7) {
                    const dayLabels: Record<string, string> = {
                        mon: t("habits.days.mon"),
                        tue: t("habits.days.tue"),
                        wed: t("habits.days.wed"),
                        thu: t("habits.days.thu"),
                        fri: t("habits.days.fri"),
                        sat: t("habits.days.sat"),
                        sun: t("habits.days.sun"),
                    };
                    return days.map((d) => dayLabels[d] || d).join(", ");
                }
                return t("habits.frequency.weekly");
            }
            case "monthly":
                return t("habits.frequency.monthly");
            default:
                return freq;
        }
    };

    const hasValueTarget = habit.targetType !== "binary" && habit.targetValue > 1;
    const targetMet = hasValueTarget && todayValue >= habit.targetValue;
    const progressPercent = hasValueTarget ? Math.min(100, (todayValue / habit.targetValue) * 100) : 0;
    const nextDays = daysUntilNextCheckin(habit);

    const handleValueChange = (delta: number) => {
        const newValue = Math.max(0, todayValue + delta);
        onCheckIn(newValue);
    };

    return (
        <div
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 hover:shadow-md transition-shadow"
            onContextMenu={onContextMenu}
        >
            {/* Row 1: Icon + Title + Frequency | Streak + Total */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 min-w-0">
                    {habit.icon && <span className="text-base flex-shrink-0">{habit.icon}</span>}
                    <div className="min-w-0">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">
                            {habit.name}
                        </h3>
                        <p className="text-[11px] text-gray-400 dark:text-gray-500">
                            {getFrequencyLabel(habit.frequency)}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    {habit.currentStreak > 0 && (
                        <span className="flex items-center gap-0.5 text-orange-500 text-xs font-medium">
                            <FireIcon className="w-3.5 h-3.5" />
                            {habit.currentStreak}
                        </span>
                    )}
                    {isArchived ? (
                        <div className="flex items-center gap-1">
                            {onUnarchive && (
                                <button
                                    onClick={onUnarchive}
                                    className="p-1 rounded hover:bg-green-50 dark:hover:bg-green-900/20"
                                    title={t("habits.unarchive")}
                                >
                                    <ArrowUturnLeftIcon className="w-3.5 h-3.5 text-green-500" />
                                </button>
                            )}
                            {onHardDelete && (
                                <button
                                    onClick={onHardDelete}
                                    className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                                    title={t("habits.hard_delete")}
                                >
                                    <TrashIcon className="w-3.5 h-3.5 text-red-500" />
                                </button>
                            )}
                        </div>
                    ) : (
                        <span className="text-[11px] text-gray-400 dark:text-gray-500">
                            {t("habits.total")}: {habit.totalCompletions}
                        </span>
                    )}
                </div>
            </div>

            {/* Row 2: Check-in UI | Calendar button */}
            <div className="flex items-center gap-2 mb-2">
                <div className="flex-1 min-w-0">
                    {isArchived ? (
                        <div className="text-xs text-gray-400 dark:text-gray-500 py-2">
                            {t("habits.groups.archived")}
                        </div>
                    ) : hasValueTarget ? (
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <span
                                    className={`text-xs font-medium ${
                                        targetMet ? "text-green-500" : "text-gray-600 dark:text-gray-400"
                                    }`}
                                >
                                    {todayValue} / {habit.targetValue} {habit.targetUnit || "次"}
                                </span>
                            </div>
                            <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div
                                    className="h-full rounded-full transition-all duration-300"
                                    style={{
                                        width: `${progressPercent}%`,
                                        backgroundColor: targetMet ? "#10B981" : habit.color,
                                    }}
                                />
                            </div>
                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={() => handleValueChange(-1)}
                                    disabled={todayValue <= 0}
                                    className="w-7 h-7 flex items-center justify-center rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                    <MinusIcon className="w-3 h-3 text-gray-600 dark:text-gray-300" />
                                </button>
                                <button
                                    onClick={() => {
                                        if (!targetMet) handleValueChange(1);
                                    }}
                                    disabled={targetMet}
                                    className={`flex-1 py-1.5 rounded text-xs font-medium transition-all flex items-center justify-center gap-1 ${
                                        targetMet
                                            ? "bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400"
                                            : "text-white hover:opacity-90"
                                    }`}
                                    style={!targetMet ? { backgroundColor: habit.color } : {}}
                                >
                                    {targetMet ? (
                                        <>
                                            <CheckCircleIcon className="w-3.5 h-3.5" />
                                            {t("habits.target_met")}
                                        </>
                                    ) : (
                                        <>
                                            <PlusIcon className="w-3.5 h-3.5" />
                                            {t("habits.add_value")}
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={() => handleValueChange(1)}
                                    disabled={targetMet}
                                    className="w-7 h-7 flex items-center justify-center rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                    <PlusIcon className="w-3 h-3 text-gray-600 dark:text-gray-300" />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={() => onCheckIn(undefined)}
                            disabled={todayValue > 0}
                            className={`w-full py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
                                todayValue > 0
                                    ? "bg-gray-100 dark:bg-gray-700 text-gray-500 cursor-default"
                                    : "text-white hover:opacity-90"
                            }`}
                            style={todayValue === 0 ? { backgroundColor: habit.color } : {}}
                        >
                            {todayValue > 0 ? (
                                <>
                                    <CheckCircleIcon className="w-4 h-4" />
                                    {t("habits.checked_in")}
                                </>
                            ) : (
                                <>{t("habits.check_in")}</>
                            )}
                        </button>
                    )}
                </div>
                {!isArchived && (
                    <button
                        onClick={() => setShowCalendar(!showCalendar)}
                        className={`p-1.5 rounded-lg transition-colors flex-shrink-0 ${
                            showCalendar
                                ? "bg-blue-50 dark:bg-blue-900/30 text-blue-500"
                                : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-500"
                        }`}
                        title={t("habits.show_history")}
                    >
                        <CalendarDaysIcon className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Row 3: Next check-in countdown */}
            {!isArchived && (
                <p className="text-[11px] text-gray-400 dark:text-gray-500">
                    {nextDays === 0 ? t("habits.next_checkin_today") : t("habits.next_checkin", { days: nextDays })}
                </p>
            )}

            {showCalendar && <CheckInCalendar habit={habit} />}
        </div>
    );
}

// ==================== Main Page ====================
export default function HabitsPage() {
    const { t } = useTranslation("common");
    const [showForm, setShowForm] = useState(false);
    const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
    const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
    const [showNewGroup, setShowNewGroup] = useState(false);
    const [newGroupName, setNewGroupName] = useState("");
    const [contextMenu, setContextMenu] = useState<
        | { type: "group"; x: number; y: number; group: HabitGroup }
        | { type: "habit"; x: number; y: number; habit: Habit }
        | null
    >(null);
    const [editingGroup, setEditingGroup] = useState<HabitGroup | null>(null);
    const [editGroupName, setEditGroupName] = useState("");
    const [editGroupIcon, setEditGroupIcon] = useState("📁");
    const [editGroupColor, setEditGroupColor] = useState("#8B5CF6");

    const { selectedHabitGroupId, setSelectedHabitGroupId, habitGroupsPanelWidth, setHabitGroupsPanelWidth } =
        useAppStore();

    const { data: habits = [], isLoading } = useHabits();
    const { data: archivedHabits = [] } = useArchivedHabits();
    const { data: habitGroups = [] } = useHabitGroups();
    const createHabit = useCreateHabit();
    const updateHabit = useUpdateHabit();
    const deleteHabit = useDeleteHabit();
    const checkIn = useCheckInHabit();
    const refreshStreaks = useRefreshStreaks();
    const createGroup = useCreateHabitGroup();
    const updateGroup = useUpdateHabitGroup();
    const dissolveGroup = useDissolveHabitGroup();
    const deleteGroupWithHabits = useDeleteHabitGroupWithHabits();
    const unarchive = useUnarchiveHabit();
    const hardDelete = useHardDeleteHabit();

    const today = new Date().toISOString().split("T")[0];
    const todayCheckinMap = useTodayCheckinMap();

    useEffect(() => {
        refreshStreaks.mutate();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleCreate = (params: CreateHabitParams) => {
        const groupId = !["all", "week", "archived", "deleted"].includes(selectedHabitGroupId)
            ? selectedHabitGroupId
            : undefined;
        createHabit.mutate({ ...params, groupId });
    };

    const handleUpdate = (params: CreateHabitParams) => {
        if (editingHabit) {
            // Ensure groupId is explicitly sent (null to clear, string to set)
            const groupId = params.groupId !== undefined ? params.groupId : (editingHabit as any).groupId;
            updateHabit.mutate({ id: editingHabit.id, ...params, groupId: groupId || null } as any);
            setEditingHabit(null);
        }
    };

    const handleArchive = (id: string) => {
        if (window.confirm(t("habits.delete_confirm"))) {
            deleteHabit.mutate(id);
        }
    };

    const handleCheckIn = (habitId: string, value?: number) => {
        const date = selectedHabitGroupId === "week" ? selectedDate : today;
        checkIn.mutate({ habitId, date, value });
    };

    const handleCreateGroup = () => {
        if (newGroupName.trim()) {
            createGroup.mutate({ name: newGroupName.trim() });
            setNewGroupName("");
            setShowNewGroup(false);
        }
    };

    const handleHardDelete = (id: string) => {
        if (window.confirm(t("habits.hard_delete_confirm"))) {
            hardDelete.mutate(id);
        }
    };

    const handleGroupContextMenu = (e: React.MouseEvent, group: HabitGroup) => {
        e.preventDefault();
        setContextMenu({ type: "group", x: e.clientX, y: e.clientY, group });
    };

    const handleHabitContextMenu = (e: React.MouseEvent, habit: Habit) => {
        e.preventDefault();
        setContextMenu({ type: "habit", x: e.clientX, y: e.clientY, habit });
    };

    const handleDissolveGroup = (group: HabitGroup) => {
        if (window.confirm(t("habits.groups.dissolve_confirm"))) {
            dissolveGroup.mutate(group.id);
            if (selectedHabitGroupId === group.id) {
                setSelectedHabitGroupId("all");
            }
        }
        setContextMenu(null);
    };

    const handleDeleteGroupWithHabits = (group: HabitGroup) => {
        if (window.confirm(t("habits.groups.delete_with_habits_confirm"))) {
            deleteGroupWithHabits.mutate(group.id);
            if (selectedHabitGroupId === group.id) {
                setSelectedHabitGroupId("all");
            }
        }
        setContextMenu(null);
    };

    const handleOpenEditGroup = (group: HabitGroup) => {
        setEditingGroup(group);
        setEditGroupName(group.name);
        setEditGroupIcon(group.icon || "📁");
        setEditGroupColor(group.color || "#8B5CF6");
        setContextMenu(null);
    };

    const handleSaveEditGroup = () => {
        if (editingGroup && editGroupName.trim()) {
            updateGroup.mutate({
                id: editingGroup.id,
                name: editGroupName.trim(),
                icon: editGroupIcon,
                color: editGroupColor,
            });
            setEditingGroup(null);
        }
    };

    // Close context menu on outside click
    useEffect(() => {
        if (!contextMenu) return;
        const close = () => setContextMenu(null);
        window.addEventListener("click", close);
        return () => window.removeEventListener("click", close);
    }, [contextMenu]);

    // Smart groups config
    const smartGroups = useMemo(
        () => [
            { id: "all", icon: "⭐", labelKey: "habits.groups.all", count: habits.length },
            { id: "week", icon: "📅", labelKey: "habits.groups.week", count: 0 },
            { id: "archived", icon: "📦", labelKey: "habits.groups.archived", count: archivedHabits.length },
            { id: "deleted", icon: "🗑️", labelKey: "habits.groups.deleted", count: 0 },
        ],
        [habits.length, archivedHabits.length],
    );

    // Group counts for custom groups
    const groupCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        habits.forEach((h) => {
            const gid = (h as any).groupId;
            if (gid) counts[gid] = (counts[gid] || 0) + 1;
        });
        return counts;
    }, [habits]);

    // Filtered habits based on selected group
    const filteredHabits = useMemo(() => {
        switch (selectedHabitGroupId) {
            case "all":
                return habits;
            case "week":
                return habits.filter((h) => isHabitDueOnDate(h, selectedDate));
            case "archived":
                return [];
            case "deleted":
                return [];
            default:
                return habits.filter((h) => (h as any).groupId === selectedHabitGroupId);
        }
    }, [habits, selectedHabitGroupId, selectedDate]);

    // For week view, build a checkin map for the selected date
    const weekViewCheckinMap = useMemo(() => {
        if (selectedHabitGroupId !== "week") return new Map<string, number>();
        // We need to fetch logs for all habits for the selected date
        // For now, use todayCheckinMap when selectedDate is today
        if (selectedDate === today) return todayCheckinMap;
        return new Map<string, number>();
    }, [selectedHabitGroupId, selectedDate, today, todayCheckinMap]);

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="text-gray-500 dark:text-gray-400">{t("common.loading")}</div>
            </div>
        );
    }

    const getCheckinValue = (habitId: string) => {
        if (selectedHabitGroupId === "week") {
            return weekViewCheckinMap.get(habitId) || 0;
        }
        return todayCheckinMap.get(habitId) || 0;
    };

    return (
        <div className="flex-1 flex overflow-hidden">
            {/* Groups Panel */}
            <div
                style={{ width: habitGroupsPanelWidth }}
                className="flex-shrink-0 border-r border-gray-200 dark:border-gray-700 overflow-auto"
            >
                {/* Smart Groups */}
                <div className="px-2 pt-2 pb-1 border-b border-gray-100 dark:border-gray-700">
                    <div className="space-y-px">
                        {smartGroups.map((sg) => {
                            const isActive = selectedHabitGroupId === sg.id;
                            return (
                                <button
                                    key={sg.id}
                                    onClick={() => setSelectedHabitGroupId(sg.id)}
                                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-colors text-left text-sm ${
                                        isActive
                                            ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                                            : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                    }`}
                                >
                                    <span className="text-base">{sg.icon}</span>
                                    <span className="flex-1 truncate">{t(sg.labelKey)}</span>
                                    {sg.count > 0 && (
                                        <span className="text-xs text-gray-400 dark:text-gray-500">{sg.count}</span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Custom Groups */}
                <div className="overflow-auto px-2 py-2">
                    <div className="flex items-center justify-between mb-1 px-1.5">
                        <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            {t("habits.groups.title")}
                        </span>
                        <button
                            onClick={() => setShowNewGroup(true)}
                            className="p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                            <PlusIcon className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                        </button>
                    </div>
                    <div className="space-y-px">
                        {/* New group input */}
                        {showNewGroup && (
                            <div className="flex items-center gap-1 px-1.5 py-1">
                                <input
                                    type="text"
                                    value={newGroupName}
                                    onChange={(e) => setNewGroupName(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") handleCreateGroup();
                                        if (e.key === "Escape") {
                                            setShowNewGroup(false);
                                            setNewGroupName("");
                                        }
                                    }}
                                    placeholder={t("habits.groups.new_group")}
                                    autoFocus
                                    className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                            </div>
                        )}
                        {habitGroups.map((group) => {
                            const isActive = selectedHabitGroupId === group.id;
                            return (
                                <div key={group.id} className="relative group/item">
                                    <button
                                        onClick={() => setSelectedHabitGroupId(group.id)}
                                        onContextMenu={(e) => handleGroupContextMenu(e, group)}
                                        className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-colors text-left text-sm ${
                                            isActive
                                                ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                                                : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                        }`}
                                    >
                                        <span className="text-base">{group.icon || "📁"}</span>
                                        <span className="flex-1 truncate">{group.name}</span>
                                        <span className="text-xs text-gray-400 dark:text-gray-500">
                                            {groupCounts[group.id] || 0}
                                        </span>
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <ResizeHandle
                onResize={(delta) => setHabitGroupsPanelWidth((w) => Math.max(160, Math.min(400, w + delta)))}
            />

            {/* Main Content */}
            <div className="flex-1 overflow-auto px-8 py-4">
                <div data-tauri-drag-region className="flex items-center justify-between mb-6">
                    <h1 data-tauri-drag-region className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {selectedHabitGroupId === "all" && t("habits.groups.all")}
                        {selectedHabitGroupId === "week" && t("habits.groups.week")}
                        {selectedHabitGroupId === "archived" && t("habits.groups.archived")}
                        {selectedHabitGroupId === "deleted" && t("habits.groups.deleted")}
                        {!["all", "week", "archived", "deleted"].includes(selectedHabitGroupId) &&
                            (habitGroups.find((g) => g.id === selectedHabitGroupId)?.name || "")}
                    </h1>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => refreshStreaks.mutate()}
                            disabled={refreshStreaks.isPending}
                            className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                            title={t("habits.refresh_streaks")}
                        >
                            <ArrowPathIcon className={`w-4 h-4 ${refreshStreaks.isPending ? "animate-spin" : ""}`} />
                        </button>
                        {selectedHabitGroupId !== "deleted" && (
                            <button
                                onClick={() => {
                                    setEditingHabit(null);
                                    setShowForm(true);
                                }}
                                className="flex items-center justify-center w-9 h-9 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                                title={t("habits.new_habit")}
                            >
                                <PlusIcon className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Week View */}
                {selectedHabitGroupId === "week" && (
                    <WeekView selectedDate={selectedDate} onSelectDate={setSelectedDate} />
                )}

                {/* Deleted - empty state */}
                {selectedHabitGroupId === "deleted" && (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400">
                        <p className="text-lg">{t("habits.no_deleted")}</p>
                    </div>
                )}

                {/* Archived habits */}
                {selectedHabitGroupId === "archived" &&
                    (archivedHabits.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400">
                            <p className="text-lg">{t("habits.no_archived")}</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {archivedHabits.map((habit) => (
                                <HabitCard
                                    key={habit.id}
                                    habit={habit}
                                    onCheckIn={() => {}}
                                    todayValue={0}
                                    isArchived
                                    onUnarchive={() => unarchive.mutate(habit.id)}
                                    onHardDelete={() => handleHardDelete(habit.id)}
                                />
                            ))}
                        </div>
                    ))}

                {/* Active habits (all, week, custom group) */}
                {["all", "week"].includes(selectedHabitGroupId) &&
                    (filteredHabits.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400">
                            <p className="text-lg">{t("habits.no_habits")}</p>
                            <button
                                onClick={() => setShowForm(true)}
                                className="mt-4 text-green-500 hover:text-green-600 dark:hover:text-green-400"
                            >
                                {t("habits.create_first")}
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredHabits.map((habit) => (
                                <HabitCard
                                    key={habit.id}
                                    habit={habit}
                                    onCheckIn={(value) => handleCheckIn(habit.id, value)}
                                    todayValue={getCheckinValue(habit.id)}
                                    onContextMenu={(e) => handleHabitContextMenu(e, habit)}
                                />
                            ))}
                        </div>
                    ))}

                {/* Custom group habits */}
                {!["all", "week", "archived", "deleted"].includes(selectedHabitGroupId) &&
                    (filteredHabits.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400">
                            <p className="text-lg">{t("habits.no_habits")}</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredHabits.map((habit) => (
                                <HabitCard
                                    key={habit.id}
                                    habit={habit}
                                    onCheckIn={(value) => handleCheckIn(habit.id, value)}
                                    todayValue={getCheckinValue(habit.id)}
                                    onContextMenu={(e) => handleHabitContextMenu(e, habit)}
                                />
                            ))}
                        </div>
                    ))}

                <HabitFormDialog
                    isOpen={showForm}
                    onClose={() => {
                        setShowForm(false);
                        setEditingHabit(null);
                    }}
                    onSubmit={editingHabit ? handleUpdate : handleCreate}
                    habit={editingHabit}
                />

                {/* Edit Group Dialog */}
                {editingGroup && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center">
                        <div className="absolute inset-0 bg-black/50" onClick={() => setEditingGroup(null)} />
                        <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-sm mx-4">
                            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                    {t("habits.groups.edit_group")}
                                </h2>
                                <button
                                    onClick={() => setEditingGroup(null)}
                                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                                >
                                    <XMarkIcon className="w-5 h-5 text-gray-500" />
                                </button>
                            </div>
                            <div className="p-5 space-y-4">
                                {/* Icon + Name */}
                                <div className="flex items-center gap-2">
                                    <EmojiPickerButton value={editGroupIcon} onChange={setEditGroupIcon} />
                                    <input
                                        type="text"
                                        value={editGroupName}
                                        onChange={(e) => setEditGroupName(e.target.value)}
                                        autoFocus
                                        placeholder={t("habits.habit_name")}
                                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                {/* Color */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        {t("habits.color")}
                                    </label>
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        {[
                                            "#EF4444",
                                            "#F97316",
                                            "#F59E0B",
                                            "#EAB308",
                                            "#84CC16",
                                            "#22C55E",
                                            "#10B981",
                                            "#14B8A6",
                                            "#06B6D4",
                                            "#0EA5E9",
                                            "#3B82F6",
                                            "#6366F1",
                                            "#8B5CF6",
                                            "#A855F7",
                                            "#D946EF",
                                            "#EC4899",
                                            "#F43F5E",
                                            "#64748B",
                                            "#6B7280",
                                            "#71717A",
                                        ].map((c) => (
                                            <button
                                                key={c}
                                                type="button"
                                                onClick={() => setEditGroupColor(c)}
                                                className={`w-6 h-6 rounded-full transition-all flex-shrink-0 ${
                                                    editGroupColor === c
                                                        ? "ring-2 ring-offset-2 ring-blue-500 dark:ring-offset-gray-800"
                                                        : ""
                                                }`}
                                                style={{ backgroundColor: c }}
                                            />
                                        ))}
                                        <div className="relative">
                                            <input
                                                type="color"
                                                value={editGroupColor}
                                                onChange={(e) => setEditGroupColor(e.target.value)}
                                                className="w-6 h-6 rounded-full cursor-pointer border-0 p-0 bg-transparent"
                                                title={t("habits.target_unit_custom")}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setEditingGroup(null)}
                                        className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                                    >
                                        {t("common.cancel")}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleSaveEditGroup}
                                        disabled={!editGroupName.trim()}
                                        className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                                    >
                                        {t("common.save")}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Context Menu */}
            {contextMenu && (
                <div
                    className="fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 min-w-[160px]"
                    style={{ left: contextMenu.x, top: contextMenu.y }}
                >
                    {contextMenu.type === "group" ? (
                        <>
                            <button
                                onClick={() => handleOpenEditGroup(contextMenu.group)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                                <PencilIcon className="w-4 h-4" />
                                {t("habits.groups.edit_group")}
                            </button>
                            <button
                                onClick={() => handleDissolveGroup(contextMenu.group)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                                <ArrowUturnLeftIcon className="w-4 h-4" />
                                {t("habits.groups.dissolve")}
                            </button>
                            <div className="border-t border-gray-100 dark:border-gray-700 my-1" />
                            <button
                                onClick={() => handleDeleteGroupWithHabits(contextMenu.group)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                                <TrashIcon className="w-4 h-4" />
                                {t("habits.groups.delete_with_habits")}
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={() => {
                                    setEditingHabit(contextMenu.habit);
                                    setShowForm(true);
                                    setContextMenu(null);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                                <PencilIcon className="w-4 h-4" />
                                {t("common.edit")}
                            </button>
                            <button
                                onClick={() => {
                                    handleArchive(contextMenu.habit.id);
                                    setContextMenu(null);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                                <ArchiveBoxIcon className="w-4 h-4" />
                                {t("habits.groups.archived")}
                            </button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
