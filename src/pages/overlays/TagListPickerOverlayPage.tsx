import { useState, useEffect, useRef } from "react";
import { emit, listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { LogicalPosition, LogicalSize } from "@tauri-apps/api/dpi";
import type { Tag } from "@/types/tag";

export default function TagListPickerOverlayPage() {
    const [tags, setTags] = useState<Tag[]>([]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        document.documentElement.style.setProperty("background-color", "transparent", "important");
        document.body.style.setProperty("background-color", "transparent", "important");
        document.documentElement.style.overflow = "hidden";
        document.body.style.overflow = "hidden";
    }, []);

    useEffect(() => {
        const unlisten = listen<{
            tags: Tag[];
            selectedIds: string[];
            anchorX: number;
            anchorY: number;
            anchorH: number;
        }>("tag-list-picker-overlay:show", async (e) => {
            const { tags: t, selectedIds: s, anchorX, anchorY, anchorH } = e.payload;
            setTags(t);
            setSelectedIds(s);

            const win = getCurrentWindow();
            const screenW = window.screen.width;
            const screenH = window.screen.height;
            const OVERLAY_W = 200;
            const OVERLAY_H = Math.min(300, t.length * 36 + 16);
            let finalY = anchorY + anchorH + 4;
            if (finalY + OVERLAY_H > screenH) finalY = anchorY - OVERLAY_H - 4;
            if (finalY < 0) finalY = 4;
            let finalX = anchorX;
            if (finalX + OVERLAY_W > screenW) finalX = screenW - OVERLAY_W - 8;
            if (finalX < 0) finalX = 8;
            await win.setPosition(new LogicalPosition(Math.round(finalX), Math.round(finalY)));
            await win.setSize(new LogicalSize(OVERLAY_W, OVERLAY_H));
        });

        return () => { unlisten.then((fn) => fn()); };
    }, []);

    useEffect(() => {
        const unlisten = getCurrentWindow().onFocusChanged(({ payload: focused }) => {
            if (!focused) hide();
        });
        return () => { unlisten.then((fn) => fn()); };
    }, []);

    const hide = async () => {
        await getCurrentWindow().hide();
    };

    const handleToggle = (tagId: string) => {
        const newIds = selectedIds.includes(tagId)
            ? selectedIds.filter((id) => id !== tagId)
            : [...selectedIds, tagId];
        setSelectedIds(newIds);
        emit("tag-list-picker-overlay:result", { selectedIds: newIds });
    };

    return (
        <div
            ref={containerRef}
            className="h-screen w-screen bg-transparent"
            onMouseDown={(e) => {
                if (containerRef.current && e.target === containerRef.current) hide();
            }}
        >
            <div className="w-full h-full bg-white dark:bg-gray-800 rounded-lg overflow-auto shadow-xl py-1">
                {tags.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-gray-400 dark:text-gray-500">无标签</div>
                ) : (
                    tags.map((tag) => {
                        const isSelected = selectedIds.includes(tag.id);
                        return (
                            <button
                                key={tag.id}
                                type="button"
                                onClick={() => handleToggle(tag.id)}
                                className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left transition-colors ${
                                    isSelected
                                        ? "bg-purple-50 dark:bg-purple-900/20"
                                        : "hover:bg-gray-50 dark:hover:bg-gray-700"
                                }`}
                            >
                                <span
                                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: tag.color }}
                                />
                                {tag.emoji && <span className="flex-shrink-0">{tag.emoji}</span>}
                                <span className={`truncate ${isSelected ? "text-purple-700 dark:text-purple-300 font-medium" : "text-gray-700 dark:text-gray-300"}`}>
                                    {tag.name}
                                </span>
                                {isSelected && <span className="ml-auto text-purple-500">✓</span>}
                            </button>
                        );
                    })
                )}
            </div>
        </div>
    );
}
