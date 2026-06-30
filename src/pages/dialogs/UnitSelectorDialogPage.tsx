import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Check, X } from "lucide-react";
import { emit, listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useDialogPosition } from "@/hooks/useDialogPosition";
import { UNIT_SELECTOR_LABEL } from "@/lib/overlayManager";
import { safeUnlisten } from "@/lib/safeUnlisten";

const UNIT_PRESETS = [
    { value: "次", label: "次" },
    { value: "mL", label: "mL" },
    { value: "L", label: "L" },
    { value: "min", label: "min" },
    { value: "h", label: "h" },
    { value: "km", label: "km" },
    { value: "步", label: "步" },
    { value: "页", label: "页" },
    { value: "个", label: "个" },
    { value: "杯", label: "杯" },
    { value: "g", label: "g" },
    { value: "kg", label: "kg" },
];

export default function UnitSelectorDialogPage() {
    const { t } = useTranslation("common");
    useDialogPosition();

    useEffect(() => {
        document.documentElement.style.backgroundColor = "transparent";
        document.body.style.backgroundColor = "transparent";
        document.documentElement.style.overflow = "hidden";
        document.body.style.overflow = "hidden";
    }, []);

    const params = new URLSearchParams(window.location.search);
    const initialUnit = params.get("unit") || "次";
    const isOverlayRoute = window.location.pathname.startsWith("/overlay/");

    const [selectedUnit, setSelectedUnit] = useState(initialUnit);
    const [customUnit, setCustomUnit] = useState(UNIT_PRESETS.some((u) => u.value === initialUnit) ? "" : initialUnit);

    useEffect(() => {
        const unlisten = listen<{ unit?: string }>(`${UNIT_SELECTOR_LABEL}:show`, (event) => {
            const unit = event.payload.unit || "次";
            setSelectedUnit(unit);
            setCustomUnit(UNIT_PRESETS.some((u) => u.value === unit) ? "" : unit);
        });
        return safeUnlisten(unlisten);
    }, []);

    const closeWindow = async () => {
        const win = getCurrentWindow();
        if (isOverlayRoute) {
            await win.hide();
        } else {
            await win.close();
        }
    };

    const handleConfirm = async () => {
        const unit = customUnit.trim() || selectedUnit;
        await emit("unit-selector:result", { unit });
        await closeWindow();
    };

    const handleClose = async () => {
        await closeWindow();
    };

    return (
        <div className="min-h-screen bg-white dark:bg-gray-800 rounded-xl overflow-hidden">
            <div className="p-4 space-y-4">
                {/* Close button + Title */}
                <div className="flex items-center gap-2">
                    <button onClick={handleClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                        <X className="w-4 h-4 text-gray-400" />
                    </button>
                    <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {t("habits.target_unit")}
                    </h2>
                </div>

                {/* Preset units */}
                <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                        {t("habits.target_unit_presets")}
                    </label>
                    <div className="flex flex-col gap-2">
                        {UNIT_PRESETS.map((u) => (
                            <button
                                key={u.value}
                                onClick={() => {
                                    setSelectedUnit(u.value);
                                    setCustomUnit("");
                                }}
                                className={`px-3 py-2 text-sm rounded-lg transition-all ${
                                    selectedUnit === u.value && !customUnit
                                        ? "bg-blue-500 text-white"
                                        : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                                }`}
                            >
                                {u.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Custom unit input */}
                <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                        {t("habits.target_unit_custom")}
                    </label>
                    <input
                        type="text"
                        value={customUnit}
                        onChange={(e) => setCustomUnit(e.target.value)}
                        placeholder={t("habits.target_unit_custom")}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                </div>

                {/* Preview */}
                <div className="p-2.5 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <span className="text-xs text-gray-500 dark:text-gray-400">{t("habits.target_unit")}: </span>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {customUnit.trim() || selectedUnit}
                    </span>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                    <button
                        onClick={handleClose}
                        className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-sm"
                    >
                        {t("common.cancel")}
                    </button>
                    <button
                        onClick={handleConfirm}
                        className="flex-1 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center justify-center gap-1 text-sm"
                    >
                        <Check className="w-4 h-4" />
                        {t("common.save")}
                    </button>
                </div>
            </div>
        </div>
    );
}
