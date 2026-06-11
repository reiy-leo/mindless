import { useState, useRef, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeftIcon, ChevronRightIcon, CalendarIcon, ClockIcon } from "@heroicons/react/24/outline";
import { Moon, Sun, Sunrise, Rainbow, Calendar1, CalendarArrowDown, CalendarFold, CalendarDays } from "lucide-react";
import { getLunarDayStr } from "@/lib/lunar";
import type { CalendarEvent } from "@/types";

interface TaskDatePickerProps {
    // Single date mode
    date?: string;
    time?: string;
    // Range mode
    startDate?: string;
    startTime?: string;
    endDate?: string;
    endTime?: string;
    isAllDay?: boolean;
    // Callbacks
    onSingleChange?: (date?: string, time?: string) => void;
    onRangeChange?: (
        startDate?: string,
        startTime?: string,
        endDate?: string,
        endTime?: string,
        isAllDay?: boolean,
    ) => void;
    // Options
    mode?: "single" | "range";
    events?: CalendarEvent[];
}

const WEEKDAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

function toDateStr(year: number, month: number, day: number): string {
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function getDateStr(offset: number = 0): string {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return toDateStr(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

export default function TaskDatePicker({
    date,
    time,
    startDate,
    startTime,
    endDate,
    endTime,
    isAllDay = false,
    onSingleChange,
    onRangeChange,
    mode = "single",
    events = [],
}: TaskDatePickerProps) {
    const { t } = useTranslation("common");
    const containerRef = useRef<HTMLDivElement>(null);
    const [activeTab, setActiveTab] = useState<"date" | "range">(mode === "single" ? "date" : "range");

    // Local state for single date
    const [localDate, setLocalDate] = useState(date || "");
    const [localTime, setLocalTime] = useState(time || "");

    // Local state for range
    const [localStartDate, setLocalStartDate] = useState(startDate || "");
    const [localStartTime, setLocalStartTime] = useState(startTime || "");
    const [localEndDate, setLocalEndDate] = useState(endDate || "");
    const [localEndTime, setLocalEndTime] = useState(endTime || "");
    const [localAllDay, setLocalAllDay] = useState(isAllDay);

    // Calendar view state
    const initialDate = (activeTab === "date" ? localDate : localStartDate) || new Date();
    const initDate = typeof initialDate === "string" ? new Date(initialDate + "T00:00:00") : initialDate;
    const [viewYear, setViewYear] = useState(initDate.getFullYear());
    const [viewMonth, setViewMonth] = useState(initDate.getMonth() + 1);

    // Sync props
    useEffect(() => {
        setLocalDate(date || "");
        setLocalTime(time || "");
    }, [date, time]);

    useEffect(() => {
        setLocalStartDate(startDate || "");
        setLocalStartTime(startTime || "");
        setLocalEndDate(endDate || "");
        setLocalEndTime(endTime || "");
        setLocalAllDay(isAllDay);
    }, [startDate, startTime, endDate, endTime, isAllDay]);

    // Build calendar grid
    const calendarDays = useMemo(() => {
        const firstDay = new Date(viewYear, viewMonth - 1, 1);
        const lastDay = new Date(viewYear, viewMonth, 0);
        const daysInMonth = lastDay.getDate();
        let startDow = firstDay.getDay() - 1;
        if (startDow < 0) startDow = 6;

        const days: { day: number; dateStr: string; inMonth: boolean }[] = [];
        const prevMonthLast = new Date(viewYear, viewMonth - 1, 0).getDate();
        for (let i = startDow - 1; i >= 0; i--) {
            const d = prevMonthLast - i;
            const m = viewMonth - 1;
            const y = m <= 0 ? viewYear - 1 : viewYear;
            const mo = m <= 0 ? 12 : m;
            days.push({ day: d, dateStr: toDateStr(y, mo, d), inMonth: false });
        }
        for (let d = 1; d <= daysInMonth; d++) {
            days.push({ day: d, dateStr: toDateStr(viewYear, viewMonth, d), inMonth: true });
        }
        const remaining = 42 - days.length;
        for (let d = 1; d <= remaining; d++) {
            const m = viewMonth + 1;
            const y = m > 12 ? viewYear + 1 : viewYear;
            const mo = m > 12 ? 1 : m;
            days.push({ day: d, dateStr: toDateStr(y, mo, d), inMonth: false });
        }
        return days;
    }, [viewYear, viewMonth]);

    const todayStr = useMemo(() => {
        const now = new Date();
        return toDateStr(now.getFullYear(), now.getMonth() + 1, now.getDate());
    }, []);

    const eventsByDate = useMemo(() => {
        const map: Record<string, CalendarEvent[]> = {};
        for (const ev of events) {
            if (!map[ev.eventDate]) map[ev.eventDate] = [];
            map[ev.eventDate].push(ev);
        }
        return map;
    }, [events]);

    const handlePrevMonth = () => {
        if (viewMonth === 1) {
            setViewMonth(12);
            setViewYear(viewYear - 1);
        } else {
            setViewMonth(viewMonth - 1);
        }
    };

    const handleNextMonth = () => {
        if (viewMonth === 12) {
            setViewMonth(1);
            setViewYear(viewYear + 1);
        } else {
            setViewMonth(viewMonth + 1);
        }
    };

    const handleSelectDate = (dateStr: string) => {
        if (activeTab === "date") {
            setLocalDate(dateStr);
        } else {
            // Range mode: first click = start, second click = end
            if (!localStartDate || (localStartDate && localEndDate)) {
                setLocalStartDate(dateStr);
                setLocalEndDate("");
            } else {
                if (dateStr < localStartDate) {
                    setLocalEndDate(localStartDate);
                    setLocalStartDate(dateStr);
                } else {
                    setLocalEndDate(dateStr);
                }
            }
        }
        // Update view
        const parts = dateStr.split("-").map(Number);
        if (parts.length === 3) {
            setViewYear(parts[0]);
            setViewMonth(parts[1]);
        }
    };

    const handleQuickDate = (offset: number) => {
        const d = getDateStr(offset);
        if (activeTab === "date") {
            setLocalDate(d);
        } else {
            setLocalStartDate(d);
            setLocalEndDate("");
        }
        const parts = d.split("-").map(Number);
        setViewYear(parts[0]);
        setViewMonth(parts[1]);
    };

    const handleQuickRange = (startOffset: number, endOffset: number) => {
        setLocalStartDate(getDateStr(startOffset));
        setLocalEndDate(getDateStr(endOffset));
    };

    const handleClear = () => {
        if (activeTab === "date") {
            setLocalDate("");
            setLocalTime("");
            onSingleChange?.(undefined, undefined);
        } else {
            setLocalStartDate("");
            setLocalStartTime("");
            setLocalEndDate("");
            setLocalEndTime("");
            setLocalAllDay(false);
            onRangeChange?.(undefined, undefined, undefined, undefined, false);
        }
    };

    const handleConfirm = () => {
        if (activeTab === "date") {
            onSingleChange?.(localDate || undefined, localTime || undefined);
        } else {
            onRangeChange?.(
                localStartDate || undefined,
                localAllDay ? undefined : localStartTime || undefined,
                localEndDate || undefined,
                localAllDay ? undefined : localEndTime || undefined,
                localAllDay,
            );
        }
    };

    // Determine which date is selected for highlighting
    const selectedDate = activeTab === "date" ? localDate : localStartDate;

    const isDateInRange = (dateStr: string) => {
        if (!localStartDate || !localEndDate) return false;
        return dateStr > localStartDate && dateStr < localEndDate;
    };

    return (
        <div ref={containerRef} className="w-full min-w-[280px] bg-white dark:bg-gray-800 rounded-lg overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-700">
                <button
                    type="button"
                    onClick={() => setActiveTab("date")}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                        activeTab === "date"
                            ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
                            : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                    }`}
                >
                    <CalendarIcon className="w-3.5 h-3.5" />
                    {t("tasks.date_tab")}
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab("range")}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                        activeTab === "range"
                            ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
                            : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                    }`}
                >
                    <ClockIcon className="w-3.5 h-3.5" />
                    {t("tasks.range_tab")}
                </button>
            </div>

            {/* Date Tab Content */}
            {activeTab === "date" && (
                <div className="p-2">
                    {/* Quick date buttons */}
                    <div className="grid grid-cols-4 gap-1 mb-2">
                        <button
                            type="button"
                            onClick={() => handleQuickDate(-1)}
                            className="group relative flex items-center justify-center p-1.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                            <Moon className="w-3.5 h-3.5" />
                            <span className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:block bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap z-10">
                                {t("tasks.yesterday")}
                            </span>
                        </button>
                        <button
                            type="button"
                            onClick={() => handleQuickDate(0)}
                            className="group relative flex items-center justify-center p-1.5 rounded bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                        >
                            <Sun className="w-3.5 h-3.5" />
                            <span className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:block bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap z-10">
                                {t("tasks.today")}
                            </span>
                        </button>
                        <button
                            type="button"
                            onClick={() => handleQuickDate(1)}
                            className="group relative flex items-center justify-center p-1.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                            <Sunrise className="w-3.5 h-3.5" />
                            <span className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:block bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap z-10">
                                {t("tasks.tomorrow")}
                            </span>
                        </button>
                        <button
                            type="button"
                            onClick={() => handleQuickDate(7)}
                            className="group relative flex items-center justify-center p-1.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                            <Rainbow className="w-3.5 h-3.5" />
                            <span className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:block bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap z-10">
                                {t("tasks.next_week")}
                            </span>
                        </button>
                    </div>

                    {/* Month navigation */}
                    <div className="flex items-center justify-between mb-1">
                        <button
                            type="button"
                            onClick={handlePrevMonth}
                            className="p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                            <ChevronLeftIcon className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
                        </button>
                        <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
                            {viewYear} / {String(viewMonth).padStart(2, "0")}
                        </span>
                        <button
                            type="button"
                            onClick={handleNextMonth}
                            className="p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                            <ChevronRightIcon className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
                        </button>
                    </div>

                    {/* Weekday header */}
                    <div className="grid grid-cols-7 mb-0.5">
                        {WEEKDAY_KEYS.map((key) => (
                            <div key={key} className="text-center text-[10px] text-gray-500 dark:text-gray-400 py-0.5">
                                {t(`habits.days.${key}`)}
                            </div>
                        ))}
                    </div>

                    {/* Calendar grid */}
                    <div className="grid grid-cols-7">
                        {calendarDays.map((cell, idx) => {
                            const isSelected = cell.dateStr === selectedDate;
                            const isToday = cell.dateStr === todayStr;
                            const cellEvents = eventsByDate[cell.dateStr] || [];
                            const lunarStr = cell.inMonth
                                ? getLunarDayStr(...(cell.dateStr.split("-").map(Number) as [number, number, number]))
                                : "";

                            return (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => handleSelectDate(cell.dateStr)}
                                    className={`
                    relative flex flex-col items-center justify-start py-0.5 text-[11px] rounded transition-colors
                    ${isSelected ? "bg-blue-500 text-white" : ""}
                    ${!isSelected && isToday ? "ring-1 ring-blue-400 dark:ring-blue-500" : ""}
                    ${
                        !isSelected && !isToday && cell.inMonth
                            ? "text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700"
                            : ""
                    }
                    ${!cell.inMonth ? "text-gray-300 dark:text-gray-600" : ""}
                  `}
                                >
                                    <span className={`leading-none ${isSelected ? "text-white" : ""}`}>{cell.day}</span>
                                    {lunarStr && (
                                        <span
                                            className={`text-[9px] leading-tight mt-0.5 truncate max-w-full px-0.5 ${
                                                isSelected
                                                    ? "text-blue-100"
                                                    : cell.inMonth
                                                    ? "text-gray-400 dark:text-gray-500"
                                                    : "text-gray-200 dark:text-gray-700"
                                            }`}
                                        >
                                            {lunarStr}
                                        </span>
                                    )}
                                    {cellEvents.length > 0 && (
                                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex gap-0.5">
                                            {cellEvents.slice(0, 2).map((ev, i) => (
                                                <span
                                                    key={i}
                                                    className="w-0.5 h-0.5 rounded-full"
                                                    style={{ backgroundColor: ev.color || "#3B82F6" }}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Time picker */}
                    <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                        <label className="text-[10px] text-gray-500 dark:text-gray-400 block mb-0.5">
                            {t("tasks.due_time")}
                        </label>
                        <input
                            type="time"
                            value={localTime}
                            onChange={(e) => setLocalTime(e.target.value)}
                            className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-1.5 mt-2">
                        <button
                            type="button"
                            onClick={handleClear}
                            className="flex-1 px-2 py-1 text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                            {t("common.clear")}
                        </button>
                        <button
                            type="button"
                            onClick={handleConfirm}
                            className="flex-1 px-2 py-1 text-xs text-white bg-blue-500 rounded hover:bg-blue-600 transition-colors"
                        >
                            {t("common.confirm")}
                        </button>
                    </div>
                </div>
            )}

            {/* Range Tab Content */}
            {activeTab === "range" && (
                <div className="p-2">
                    {/* Quick range buttons */}
                    <div className="grid grid-cols-4 gap-1 mb-2">
                        <button
                            type="button"
                            onClick={() => handleQuickRange(0, 1)}
                            className="group relative flex items-center justify-center p-1.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                            <Calendar1 className="w-3.5 h-3.5" />
                            <span className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:block bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap z-10">
                                {t("tasks.two_days")}
                            </span>
                        </button>
                        <button
                            type="button"
                            onClick={() => handleQuickRange(0, 6)}
                            className="group relative flex items-center justify-center p-1.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                            <CalendarArrowDown className="w-3.5 h-3.5" />
                            <span className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:block bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap z-10">
                                {t("tasks.week")}
                            </span>
                        </button>
                        <button
                            type="button"
                            onClick={() => handleQuickRange(0, 29)}
                            className="group relative flex items-center justify-center p-1.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                            <CalendarFold className="w-3.5 h-3.5" />
                            <span className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:block bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap z-10">
                                {t("tasks.month")}
                            </span>
                        </button>
                        <button
                            type="button"
                            onClick={() => handleQuickRange(0, 364)}
                            className="group relative flex items-center justify-center p-1.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                            <CalendarDays className="w-3.5 h-3.5" />
                            <span className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:block bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap z-10">
                                {t("tasks.year")}
                            </span>
                        </button>
                    </div>

                    {/* Start date & time */}
                    <div className="flex items-center gap-1.5 mb-2">
                        <label className="text-[10px] text-gray-500 dark:text-gray-400 w-7 flex-shrink-0">
                            {t("tasks.range_start")}
                        </label>
                        <input
                            type="date"
                            value={localStartDate}
                            onChange={(e) => setLocalStartDate(e.target.value)}
                            className="flex-1 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        {!localAllDay && (
                            <input
                                type="time"
                                value={localStartTime}
                                onChange={(e) => setLocalStartTime(e.target.value)}
                                className="w-16 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                        )}
                    </div>

                    {/* End date & time */}
                    <div className="flex items-center gap-1.5 mb-2">
                        <label className="text-[10px] text-gray-500 dark:text-gray-400 w-7 flex-shrink-0">
                            {t("tasks.range_end")}
                        </label>
                        <input
                            type="date"
                            value={localEndDate}
                            onChange={(e) => setLocalEndDate(e.target.value)}
                            className="flex-1 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        {!localAllDay && (
                            <input
                                type="time"
                                value={localEndTime}
                                onChange={(e) => setLocalEndTime(e.target.value)}
                                className="w-16 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                        )}
                    </div>

                    {/* All day toggle */}
                    <div className="flex items-center justify-between mb-2 py-0.5 px-0.5">
                        <span className="text-[11px] text-gray-700 dark:text-gray-300">{t("tasks.all_day")}</span>
                        <button
                            type="button"
                            onClick={() => setLocalAllDay(!localAllDay)}
                            className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${
                                localAllDay ? "bg-blue-500" : "bg-gray-300 dark:bg-gray-600"
                            }`}
                        >
                            <span
                                className={`inline-block h-3 w-3 rounded-full bg-white shadow transition-transform ${
                                    localAllDay ? "translate-x-3.5" : "translate-x-0.5"
                                }`}
                            />
                        </button>
                    </div>

                    {/* Mini calendar for quick selection */}
                    <div className="p-1.5">
                        <div className="flex items-center justify-between mb-1">
                            <button
                                type="button"
                                onClick={handlePrevMonth}
                                className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                            >
                                <ChevronLeftIcon className="w-3 h-3 text-gray-600 dark:text-gray-400" />
                            </button>
                            <span className="text-[10px] font-medium text-gray-700 dark:text-gray-300">
                                {viewYear}/{String(viewMonth).padStart(2, "0")}
                            </span>
                            <button
                                type="button"
                                onClick={handleNextMonth}
                                className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                            >
                                <ChevronRightIcon className="w-3 h-3 text-gray-600 dark:text-gray-400" />
                            </button>
                        </div>
                        <div className="grid grid-cols-7 gap-0.5">
                            {WEEKDAY_KEYS.map((key) => (
                                <div
                                    key={key}
                                    className="text-center text-[9px] text-gray-500 dark:text-gray-400 py-0.5"
                                >
                                    {t(`habits.days.${key}`)[0]}
                                </div>
                            ))}
                            {calendarDays.map((cell, idx) => {
                                const isStart = cell.dateStr === localStartDate;
                                const isEnd = cell.dateStr === localEndDate;
                                const inRange = isDateInRange(cell.dateStr);
                                const isToday = cell.dateStr === todayStr;
                                const lunarStr = cell.inMonth
                                    ? getLunarDayStr(
                                          ...(cell.dateStr.split("-").map(Number) as [number, number, number]),
                                      )
                                    : "";

                                return (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => handleSelectDate(cell.dateStr)}
                                        className={`
                      relative flex flex-col items-center justify-start text-center py-0.5 rounded transition-colors
                      ${isStart || isEnd ? "bg-blue-500 text-white" : ""}
                      ${inRange ? "bg-blue-100 dark:bg-blue-900/20" : ""}
                      ${!isStart && !isEnd && !inRange && isToday ? "ring-1 ring-blue-400" : ""}
                      ${
                          !isStart && !isEnd && !inRange && cell.inMonth
                              ? "text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                              : ""
                      }
                      ${!cell.inMonth ? "text-gray-300 dark:text-gray-600" : ""}
                    `}
                                    >
                                        <span className="text-[9px] leading-none">{cell.day}</span>
                                        {lunarStr && (
                                            <span
                                                className={`text-[7px] leading-tight truncate max-w-full px-0.5 ${
                                                    isStart || isEnd
                                                        ? "text-blue-100"
                                                        : cell.inMonth
                                                        ? "text-gray-400 dark:text-gray-500"
                                                        : "text-gray-200 dark:text-gray-700"
                                                }`}
                                            >
                                                {lunarStr}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-1.5">
                        <button
                            type="button"
                            onClick={handleClear}
                            className="flex-1 px-2 py-1 text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                            {t("common.clear")}
                        </button>
                        <button
                            type="button"
                            onClick={handleConfirm}
                            className="flex-1 px-2 py-1 text-xs text-white bg-blue-500 rounded hover:bg-blue-600 transition-colors"
                        >
                            {t("common.confirm")}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
