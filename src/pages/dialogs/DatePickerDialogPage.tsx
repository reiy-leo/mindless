import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";
import { emit } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { getLunarDayStr } from "@/lib/lunar";
import { useDialogPosition } from "@/hooks/useDialogPosition";

export default function DatePickerDialogPage() {
    const { t, i18n } = useTranslation("common");
    useDialogPosition();

    useEffect(() => {
        document.documentElement.style.backgroundColor = "transparent";
        document.body.style.backgroundColor = "transparent";
        document.documentElement.style.overflow = "hidden";
        document.body.style.overflow = "hidden";
    }, []);
    const params = new URLSearchParams(window.location.search);
    const initialDate = params.get("date") || new Date().toISOString().split("T")[0];

    const [viewMonth, setViewMonth] = useState(() => {
        const d = new Date(initialDate + "T00:00:00");
        return { year: d.getFullYear(), month: d.getMonth() };
    });
    const [selectedDate, setSelectedDate] = useState(initialDate);

    const daysInMonth = new Date(viewMonth.year, viewMonth.month + 1, 0).getDate();
    const firstDayOfWeek = new Date(viewMonth.year, viewMonth.month, 1).getDay();
    const today = new Date().toISOString().split("T")[0];

    const monthLabel = new Date(viewMonth.year, viewMonth.month).toLocaleDateString(i18n.language, {
        year: "numeric",
        month: "long",
    });

    const dayLabels = [
        t("habits.calendar.sun"),
        t("habits.calendar.mon"),
        t("habits.calendar.tue"),
        t("habits.calendar.wed"),
        t("habits.calendar.thu"),
        t("habits.calendar.fri"),
        t("habits.calendar.sat"),
    ];

    const prevMonth = () => {
        setViewMonth((v) => (v.month === 0 ? { year: v.year - 1, month: 11 } : { ...v, month: v.month - 1 }));
    };

    const nextMonth = () => {
        setViewMonth((v) => (v.month === 11 ? { year: v.year + 1, month: 0 } : { ...v, month: v.month + 1 }));
    };

    const goToday = () => {
        const now = new Date();
        setViewMonth({ year: now.getFullYear(), month: now.getMonth() });
        setSelectedDate(today);
    };

    const handleConfirm = async () => {
        await emit("date-picker:result", { date: selectedDate });
        await getCurrentWindow().close();
    };

    const handleClose = async () => {
        await getCurrentWindow().close();
    };

    return (
        <div className="min-h-screen bg-white dark:bg-gray-800 rounded-xl overflow-hidden">
            <div className="p-2">
                {/* Month navigation + close button */}

                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1">
                        <button onClick={prevMonth} className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600">
                            <ChevronLeft className="w-4 h-4 text-gray-500" />
                        </button>
                        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 min-w-[128px] text-center">
                            {monthLabel}
                        </span>
                        <button
                            onClick={goToday}
                            className="px-2 py-1 text-xs rounded bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500"
                        >
                            {t("tasks.views.today")}
                        </button>
                        <button onClick={nextMonth} className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600">
                            <ChevronRight className="w-4 h-4 text-gray-500" />
                        </button>
                    </div>
                </div>

                {/* Day labels */}
                <div className="grid grid-cols-7 gap-none mb-1">
                    {dayLabels.map((d) => (
                        <div key={d} className="text-center text-xs text-gray-400 dark:text-gray-500 py-1">
                            {d}
                        </div>
                    ))}
                </div>

                {/* Calendar grid */}
                <div className="grid grid-cols-7 gap-none">
                    {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                        <div key={`empty-${i}`} />
                    ))}
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                        const dateStr = `${viewMonth.year}-${String(viewMonth.month + 1).padStart(2, "0")}-${String(
                            day,
                        ).padStart(2, "0")}`;
                        const isSelected = dateStr === selectedDate;
                        const isToday = dateStr === today;
                        const lunarStr = getLunarDayStr(viewMonth.year, viewMonth.month + 1, day);

                        return (
                            <button
                                key={day}
                                onClick={() => setSelectedDate(dateStr)}
                                className={`flex flex-col items-center p-0.5 rounded-md transition-all ${
                                    isSelected
                                        ? "bg-blue-500 text-white"
                                        : isToday
                                        ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold"
                                        : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                                }`}
                            >
                                <span className="text-xs">{day}</span>
                                <span
                                    className={`text-xs ${
                                        isSelected ? "text-white/70" : "text-gray-400 dark:text-gray-500"
                                    }`}
                                >
                                    {lunarStr}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Selected date display */}
                <div className="mt-2 p-1 pl-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{selectedDate}</span>
                            <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">
                                {(() => {
                                    const parts = selectedDate.split("-").map(Number);
                                    return getLunarDayStr(parts[0], parts[1], parts[2]);
                                })()}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 mt-2">
                    <button
                        onClick={handleClose}
                        className="flex-1 px-2 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                    >
                        {t("common.cancel")}
                    </button>
                    <button
                        onClick={handleConfirm}
                        className="flex-1 px-2 py-1 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center justify-center gap-1"
                    >
                        <Check className="w-4 h-4" />
                        {t("common.save")}
                    </button>
                </div>
            </div>
        </div>
    );
}
