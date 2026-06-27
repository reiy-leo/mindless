import { useState, useMemo, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, Search } from "lucide-react";
import { formatTimezoneOffset } from "@/lib/formatUtils";
import { useAppStore } from "@/stores/useAppStore";

interface TimezonePickerProps {
  value: string;
  onChange: (tz: string) => void;
}

interface TimezoneItem {
  name: string;
  continent: string;
  offset: string;
  localTime: string;
}

function getLocalTime(tz: string): string {
  try {
    return new Date().toLocaleTimeString("en-US", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return "";
  }
}

export default function TimezonePicker({ value, onChange }: TimezonePickerProps) {
  const { t } = useTranslation("common");
  const timezoneFormat = useAppStore((s) => s.timezoneFormat);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const allTimezones = useMemo<TimezoneItem[]>(() => {
    try {
      const zones = (Intl as any).supportedValuesOf("timeZone") as string[];
      return zones.map((tz: string) => {
        const parts = tz.split("/");
        const continent = parts[0] || tz;
        return {
          name: tz,
          continent,
          offset: formatTimezoneOffset(tz, timezoneFormat),
          localTime: getLocalTime(tz),
        };
      });
    } catch {
      return [];
    }
  }, [timezoneFormat]);

  const filtered = useMemo(() => {
    if (!search.trim()) return allTimezones;
    const q = search.toLowerCase();
    return allTimezones.filter(
      (tz) =>
        tz.name.toLowerCase().includes(q) ||
        tz.continent.toLowerCase().includes(q) ||
        tz.offset.toLowerCase().includes(q)
    );
  }, [allTimezones, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, TimezoneItem[]>();
    for (const tz of filtered) {
      const existing = map.get(tz.continent) || [];
      existing.push(tz);
      map.set(tz.continent, existing);
    }
    return map;
  }, [filtered]);

  useEffect(() => {
    if (open && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const displayLabel = value.replace(/_/g, " ");

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
      >
        <span className="truncate">{displayLabel}</span>
        <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full max-h-64 overflow-auto rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-lg">
          <div className="sticky top-0 bg-white dark:bg-gray-800 p-2 border-b border-gray-200 dark:border-gray-600">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("settings.datetime.timezone_search_placeholder")}
                className="w-full pl-8 pr-2 py-1.5 text-sm rounded-md border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
          {Array.from(grouped.entries()).map(([continent, zones]) => (
            <div key={continent}>
              <div className="px-3 py-1 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider bg-gray-50 dark:bg-gray-750">
                {continent}
              </div>
              {zones.map((tz) => (
                <button
                  key={tz.name}
                  type="button"
                  onClick={() => {
                    onChange(tz.name);
                    setOpen(false);
                    setSearch("");
                  }}
                  className={`w-full text-left px-3 py-1.5 text-sm flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                    value === tz.name
                      ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                      : "text-gray-700 dark:text-gray-300"
                  }`}
                >
                  <span className="truncate">{tz.name.replace(/_/g, " ")}</span>
                  <span className="text-[11px] text-gray-400 dark:text-gray-500 ml-2 shrink-0">
                    {tz.localTime} {tz.offset}
                  </span>
                </button>
              ))}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="px-3 py-4 text-sm text-gray-400 dark:text-gray-500 text-center">
              {t("common.empty")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
