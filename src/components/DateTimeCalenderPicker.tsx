import { useState, useRef, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { Moon, Sun, Sunrise, Rainbow } from "lucide-react";
import { getLunarDayStr } from "@/lib/lunar";
import { useAppStore } from "@/stores/useAppStore";
import type { TimezoneFormat } from "@/stores/useAppStore";
import { formatTimezoneOffset } from "@/lib/formatUtils";
import type { CalendarEvent } from "@/types";

interface DateTimeCalenderPickerProps {
    date?: string;
    time?: string;
    onChange: (date?: string, time?: string) => void;
    events?: CalendarEvent[];
    color?: string;
    hideTime?: boolean;
    showTimezone?: boolean;
    selectedTimezone?: string;
    timezoneFormat?: TimezoneFormat;
    onOpenTimezonePicker?: () => void;
    timezoneButtonRef?: React.Ref<HTMLButtonElement>;
    onQuickDate?: (date?: string, time?: string) => void;
    onConfirm?: (date?: string, time?: string) => void;
    onClear?: () => void;
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

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? {
              r: parseInt(result[1], 16),
              g: parseInt(result[2], 16),
              b: parseInt(result[3], 16),
          }
        : null;
}

function getColorStyles(color: string) {
    const rgb = hexToRgb(color);
    if (!rgb) return {};
    return {
        selectedBg: color,
        selectedText: "#ffffff",
        hoverBg: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)`,
        todayRing: color,
        quickButtonBg: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)`,
        quickButtonText: color,
        quickButtonHover: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.2)`,
        lunarText: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5)`,
        confirmBg: color,
        confirmHover: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.9)`,
        focusRing: color,
    };
}

export default function DateTimeCalenderPicker({
    date,
    time,
    onChange,
    events = [],
    color,
    hideTime = false,
    showTimezone: showTimezoneProp,
    selectedTimezone: selectedTimezoneProp,
    timezoneFormat: timezoneFormatProp,
    onOpenTimezonePicker,
    timezoneButtonRef,
    onQuickDate,
    onConfirm,
    onClear,
}: DateTimeCalenderPickerProps) {
    const { t } = useTranslation("common");
    const containerRef = useRef<HTMLDivElement>(null);
    const themeColor = useAppStore((s) => s.themeColor);
    const resolvedColor = color || themeColor;
    const colorStyles = useMemo(() => getColorStyles(resolvedColor), [resolvedColor]);
    const showLunar = useAppStore((s) => s.showLunar);
    const showTimezoneStore = useAppStore((s) => s.showTimezone);
    const selectedTimezoneStore = useAppStore((s) => s.selectedTimezone);
    const timezoneFormatStore = useAppStore((s) => s.timezoneFormat);

    const showTimezone = showTimezoneProp !== undefined ? showTimezoneProp : showTimezoneStore;
    const selectedTimezone = selectedTimezoneProp !== undefined ? selectedTimezoneProp : selectedTimezoneStore;
    const timezoneFormat = timezoneFormatProp !== undefined ? timezoneFormatProp : timezoneFormatStore;

    const [localDate, setLocalDate] = useState(date || "");
    const [localTime, setLocalTime] = useState(time || "");

    const initialDate = localDate || new Date();
    const initDate = typeof initialDate === "string" ? new Date(initialDate + "T00:00:00") : initialDate;
    const [viewYear, setViewYear] = useState(initDate.getFullYear());
    const [viewMonth, setViewMonth] = useState(initDate.getMonth() + 1);

    useEffect(() => {
        setLocalDate(date || "");
        setLocalTime(time || "");
    }, [date, time]);

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
        setLocalDate(dateStr);
        const parts = dateStr.split("-").map(Number);
        if (parts.length === 3) {
            setViewYear(parts[0]);
            setViewMonth(parts[1]);
        }
    };

    const handleQuickDate = (offset: number) => {
        const d = getDateStr(offset);
        setLocalDate(d);
        const parts = d.split("-").map(Number);
        setViewYear(parts[0]);
        setViewMonth(parts[1]);
        if (onQuickDate) {
            onQuickDate(d || undefined, localTime || undefined);
        } else {
            onChange(d || undefined, localTime || undefined);
        }
    };

    const handleClear = () => {
        setLocalDate("");
        setLocalTime("");
        if (onClear) {
            onClear();
        } else {
            onChange(undefined, undefined);
        }
    };

    const handleConfirm = () => {
        if (onConfirm) {
            onConfirm(localDate || undefined, localTime || undefined);
        } else {
            onChange(localDate || undefined, localTime || undefined);
        }
    };

    return (
        <div ref={containerRef} className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden">
            <div className="p-2">
                {/* Quick date buttons */}
                <div className="grid grid-cols-4 gap-1 mb-2">
                    <button
                        type="button"
                        onClick={() => handleQuickDate(-1)}
                        className="group relative flex items-center justify-center p-1 rounded transition-colors"
                        style={{
                            backgroundColor: colorStyles.hoverBg,
                            color: colorStyles.quickButtonText,
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colorStyles.quickButtonHover!)}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = colorStyles.hoverBg!)}
                    >
                        <Moon className="w-5 h-5" />
                        <span className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:block bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap z-10">
                            {t("tasks.yesterday")}
                        </span>
                    </button>
                    <button
                        type="button"
                        onClick={() => handleQuickDate(0)}
                        className="group relative flex items-center justify-center p-1 rounded transition-colors"
                        style={{
                            backgroundColor: colorStyles.quickButtonBg,
                            color: colorStyles.quickButtonText,
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colorStyles.quickButtonHover!)}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = colorStyles.quickButtonBg!)}
                    >
                        <Sun className="w-5 h-5" />
                        <span className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:block bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap z-10">
                            {t("tasks.today")}
                        </span>
                    </button>
                    <button
                        type="button"
                        onClick={() => handleQuickDate(1)}
                        className="group relative flex items-center justify-center p-1 rounded transition-colors"
                        style={{
                            backgroundColor: colorStyles.hoverBg,
                            color: colorStyles.quickButtonText,
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colorStyles.quickButtonHover!)}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = colorStyles.hoverBg!)}
                    >
                        <Sunrise className="w-5 h-5" />
                        <span className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:block bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap z-10">
                            {t("tasks.tomorrow")}
                        </span>
                    </button>
                    <button
                        type="button"
                        onClick={() => handleQuickDate(7)}
                        className="group relative flex items-center justify-center p-1 rounded transition-colors"
                        style={{
                            backgroundColor: colorStyles.hoverBg,
                            color: colorStyles.quickButtonText,
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colorStyles.quickButtonHover!)}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = colorStyles.hoverBg!)}
                    >
                        <Rainbow className="w-5 h-5" />
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
                        <ChevronLeftIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </button>
                    <span className="text-sm text-gray-900 dark:text-gray-100">
                        {viewYear} / {String(viewMonth).padStart(2, "0")}
                    </span>
                    <button
                        type="button"
                        onClick={handleNextMonth}
                        className="p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                        <ChevronRightIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </button>
                </div>

                {/* Weekday header */}
                <div className="grid grid-cols-7 mb-0.5">
                    {WEEKDAY_KEYS.map((key) => (
                        <div key={key} className="aspect-square flex items-center justify-center text-xs text-gray-500 dark:text-gray-400 py-0.5">
                            {t(`habits.calendar.${key}`)}
                        </div>
                    ))}
                </div>

                {/* Calendar grid */}
                <div className="grid grid-cols-7 gap-0.5">
                    {calendarDays.map((cell, idx) => {
                        const isSelected = cell.dateStr === localDate;
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
                                className="aspect-square relative flex flex-col items-center justify-start py-0.5 text-xs rounded transition-colors"
                                style={{
                                    backgroundColor: isSelected
                                        ? colorStyles.selectedBg
                                        : isToday
                                        ? colorStyles.hoverBg
                                        : undefined,
                                    color: isSelected ? colorStyles.selectedText : undefined,
                                    boxShadow: !isSelected && isToday ? `inset 0 0 0 1px ${colorStyles.todayRing}` : undefined,
                                }}
                            >
                                <span className="leading-none">{cell.day}</span>
                                {showLunar && lunarStr && (
                                    <span className="text-[9px] leading-tight mt-0.5 truncate max-w-full px-0.5">
                                        {lunarStr}
                                    </span>
                                )}
                                {cellEvents.length > 0 && (
                                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex gap-0.5">
                                        {cellEvents.slice(0, 2).map((ev, i) => (
                                            <span
                                                key={i}
                                                className="w-0.5 h-0.5 rounded-full"
                                                style={{ backgroundColor: ev.color || color }}
                                            />
                                        ))}
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Timezone */}
                {showTimezone && (
                    <div>
                        {onOpenTimezonePicker ? (
                            <>
                                <label className="text-[10px] text-gray-500 dark:text-gray-400 block mb-0.5">
                                    {t("common.timezone")}
                                </label>
                                <button
                                    ref={timezoneButtonRef}
                                    type="button"
                                    onClick={onOpenTimezonePicker}
                                    className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer"
                                >
                                    {formatTimezoneOffset(selectedTimezone, timezoneFormat)}
                                </button>
                            </>
                        ) : (
                            <div className="text-[10px] text-gray-400 dark:text-gray-500 text-center mt-1">
                                {formatTimezoneOffset(selectedTimezone, timezoneFormat)}
                            </div>
                        )}
                    </div>
                )}

                {/* Time picker */}
                {!hideTime && (
                    <div className="mt-2 pt-2">
                        <label className="text-[10px] text-gray-500 dark:text-gray-400 block mb-0.5">
                            {t("tasks.due_time")}
                        </label>
                        <input
                            type="time"
                            value={localTime}
                            onChange={(e) => setLocalTime(e.target.value)}
                            className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded focus:outline-none"
                            style={{ "--tw-ring-color": resolvedColor } as React.CSSProperties}
                        />
                    </div>
                )}

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
                        className="flex-1 px-2 py-1 text-xs text-white rounded transition-colors"
                        style={{
                            backgroundColor: colorStyles.confirmBg,
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colorStyles.confirmHover!)}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = colorStyles.confirmBg!)}
                    >
                        {t("common.confirm")}
                    </button>
                </div>
            </div>
        </div>
    );
}
