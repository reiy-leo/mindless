import { useState, useEffect, useRef, useCallback } from "react";
import { emit, listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import DateTimeCalenderWithRangePicker from "@/components/DateTimeCalenderWithRangePicker";
import type { CalendarEvent } from "@/types";

export default function DateRangePickerOverlayPage() {
    const [localDate, setLocalDate] = useState<string | undefined>();
    const [localTime, setLocalTime] = useState<string | undefined>();
    const [localStartDate, setLocalStartDate] = useState<string | undefined>();
    const [localStartTime, setLocalStartTime] = useState<string | undefined>();
    const [localEndDate, setLocalEndDate] = useState<string | undefined>();
    const [localEndTime, setLocalEndTime] = useState<string | undefined>();
    const [localIsAllDay, setLocalIsAllDay] = useState(false);
    const [mode, setMode] = useState<"single" | "range">("single");
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [color, setColor] = useState<string | undefined>();
    const [hideTime, setHideTime] = useState(false);
    const openingTimezoneRef = useRef(false);

    const handleTimezoneOverlayChange = useCallback((opening: boolean) => {
        openingTimezoneRef.current = opening;
    }, []);

    useEffect(() => {
        document.documentElement.style.setProperty("background-color", "transparent", "important");
        document.body.style.setProperty("background-color", "transparent", "important");
        document.documentElement.style.overflow = "hidden";
        document.body.style.overflow = "hidden";
    }, []);

    useEffect(() => {
        const unlisten = listen<{
            date?: string;
            time?: string;
            startDate?: string;
            startTime?: string;
            endDate?: string;
            endTime?: string;
            isAllDay?: boolean;
            mode?: "single" | "range";
            events?: CalendarEvent[];
            color?: string;
            hideTime?: boolean;
            anchorX: number;
            anchorY: number;
            anchorH: number;
        }>("date-range-picker-overlay:show", (e) => {
            const p = e.payload;
            setLocalDate(p.date);
            setLocalTime(p.time);
            setLocalStartDate(p.startDate);
            setLocalStartTime(p.startTime);
            setLocalEndDate(p.endDate);
            setLocalEndTime(p.endTime);
            setLocalIsAllDay(p.isAllDay || false);
            setMode(p.mode || "single");
            setEvents(p.events || []);
            setColor(p.color);
            setHideTime(p.hideTime || false);
        });

        return () => { unlisten.then((fn) => fn()); };
    }, []);

    useEffect(() => {
        const unlisten = getCurrentWindow().onFocusChanged(({ payload: focused }) => {
            if (!focused && !openingTimezoneRef.current) hide();
        });
        return () => { unlisten.then((fn) => fn()); };
    }, []);

    const hide = async () => {
        await getCurrentWindow().hide();
    };

    const handleSingleChange = (d?: string, tm?: string) => {
        emit("date-range-picker-overlay:result", { type: "single", date: d, time: tm });
        hide();
    };

    const handleRangeChange = (sd?: string, st?: string, ed?: string, et?: string, allDay?: boolean) => {
        emit("date-range-picker-overlay:result", { type: "range", startDate: sd, startTime: st, endDate: ed, endTime: et, isAllDay: allDay });
        hide();
    };

    return (
        <div className="w-full h-full bg-transparent">
            <div className="rounded-lg overflow-hidden bg-white dark:bg-gray-800">
                <DateTimeCalenderWithRangePicker
                    date={localDate}
                    time={localTime}
                    startDate={localStartDate}
                    startTime={localStartTime}
                    endDate={localEndDate}
                    endTime={localEndTime}
                    isAllDay={localIsAllDay}
                    mode={mode}
                    events={events}
                    color={color}
                    hideTime={hideTime}
                    onSingleChange={handleSingleChange}
                    onRangeChange={handleRangeChange}
                    onTimezoneOverlayChange={handleTimezoneOverlayChange}
                />
            </div>
        </div>
    );
}
