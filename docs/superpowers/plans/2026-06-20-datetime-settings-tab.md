# 日期时间 (Date & Time) Settings Tab — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "日期时间" settings tab with three controls: week start day (all 7 days), show lunar calendar toggle, and show timezone toggle with a TimezonePicker.

**Architecture:** Extend Zustand store with `showLunar`, `showTimezone`, `selectedTimezone` fields; expand `weekStartDay` from `0|1` to `0-6`. Add a new tab in SettingsPage.tsx following the existing pattern. Conditionalize lunar and timezone rendering in 4 calendar components. Create a standalone TimezonePicker component using `Intl.supportedValuesOf('timeZone')`.

**Tech Stack:** React, TypeScript, Zustand, Tailwind CSS, i18next, Tauri

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `src/stores/useAppStore.ts` | Modify | Add `showLunar`, `showTimezone`, `selectedTimezone`; expand `weekStartDay` type to `0-6` |
| `src/i18n/locales/zh/common.json` | Modify | Add datetime tab i18n keys |
| `src/i18n/locales/en/common.json` | Modify | Add datetime tab i18n keys |
| `src/i18n/locales/ja/common.json` | Modify | Add datetime tab i18n keys |
| `src/components/TimezonePicker.tsx` | Create | Searchable timezone picker component |
| `src/pages/SettingsPage.tsx` | Modify | Add datetime tab with 3 settings sections |
| `src/App.tsx` | Modify | Add new settings to SettingsSync (SQLite load/save) |
| `src/components/DateTimeCalenderPicker.tsx` | Modify | Conditionalize lunar display; add timezone row |
| `src/components/DateTimeCalenderWithRangePicker.tsx` | Modify | Conditionalize lunar display; add timezone row (both calendar instances) |
| `src/components/tasks/CalendarView.tsx` | Modify | Expand weekStartDay to support 0-6 |
| `src/pages/CountdownsPage.tsx` | Modify | Expand weekStartDay to support 0-6 |

---

### Task 1: Expand store — weekStartDay + new datetime fields

**Files:**
- Modify: `src/stores/useAppStore.ts`

- [ ] **Step 1: Update AppState interface — expand weekStartDay and add new fields**

In `src/stores/useAppStore.ts`, change the `weekStartDay` type and add three new fields after it:

```typescript
// Change this line:
weekStartDay: 0 | 1;
// To:
weekStartDay: number; // 0=Sunday, 1=Monday ... 6=Saturday

// Add these three fields after weekStartDay:
showLunar: boolean;
showTimezone: boolean;
selectedTimezone: string;
```

- [ ] **Step 2: Update setters in AppState interface**

Add after `setWeekStartDay`:

```typescript
setWeekStartDay: (day: number) => void;
setShowLunar: (show: boolean) => void;
setShowTimezone: (show: boolean) => void;
setSelectedTimezone: (tz: string) => void;
```

Also change the existing `setWeekStartDay` signature from `(day: 0 | 1)` to `(day: number)`.

- [ ] **Step 3: Update default values**

In the `persist` factory, update defaults:

```typescript
weekStartDay: 1,  // was 0 (Sunday); change to 1 (Monday) per requirements
showLunar: true,   // lunar shown by default (backward-compatible)
showTimezone: true, // timezone shown by default (backward-compatible)
selectedTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
```

- [ ] **Step 4: Add setter implementations**

```typescript
setWeekStartDay: (weekStartDay) => set({ weekStartDay }),
setShowLunar: (showLunar) => set({ showLunar }),
setShowTimezone: (showTimezone) => set({ showTimezone }),
setSelectedTimezone: (selectedTimezone) => set({ selectedTimezone }),
```

- [ ] **Step 5: Update partialize to persist new fields**

In the `partialize` callback, add:

```typescript
showLunar: state.showLunar,
showTimezone: state.showTimezone,
selectedTimezone: state.selectedTimezone,
```

- [ ] **Step 6: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors.

---

### Task 2: Add i18n keys for all 3 locales

**Files:**
- Modify: `src/i18n/locales/zh/common.json`
- Modify: `src/i18n/locales/en/common.json`
- Modify: `src/i18n/locales/ja/common.json`

- [ ] **Step 1: Add keys to zh/common.json**

Inside `settings.tabs`, add:

```json
"datetime": "日期时间"
```

After the `settings.calendar` block (after `"import_empty"`), add:

```json
"datetime": {
  "title": "日期与时间",
  "week_start_day": "一周开始于",
  "week_start_day_desc": "设置日历中一周的第一天",
  "show_lunar": "显示农历",
  "show_lunar_desc": "在日历日期下方显示农历信息",
  "show_timezone": "显示时区",
  "show_timezone_desc": "在日历中显示当前时区信息",
  "timezone_picker": "选择时区",
  "timezone_search_placeholder": "搜索时区...",
  "days": {
    "sunday": "星期日",
    "monday": "星期一",
    "tuesday": "星期二",
    "wednesday": "星期三",
    "thursday": "星期四",
    "friday": "星期五",
    "saturday": "星期六"
  }
}
```

- [ ] **Step 2: Add keys to en/common.json**

Inside `settings.tabs`:

```json
"datetime": "Date & Time"
```

After `settings.calendar`:

```json
"datetime": {
  "title": "Date & Time",
  "week_start_day": "First day of week",
  "week_start_day_desc": "Set the first day of the week in calendars",
  "show_lunar": "Show Lunar Calendar",
  "show_lunar_desc": "Display lunar calendar info under each date",
  "show_timezone": "Show Timezone",
  "show_timezone_desc": "Display timezone information in calendars",
  "timezone_picker": "Select Timezone",
  "timezone_search_placeholder": "Search timezones...",
  "days": {
    "sunday": "Sunday",
    "monday": "Monday",
    "tuesday": "Tuesday",
    "wednesday": "Wednesday",
    "thursday": "Thursday",
    "friday": "Friday",
    "saturday": "Saturday"
  }
}
```

- [ ] **Step 3: Add keys to ja/common.json**

Inside `settings.tabs`:

```json
"datetime": "日付と時刻"
```

After `settings.calendar`:

```json
"datetime": {
  "title": "日付と時刻",
  "week_start_day": "週の始まり",
  "week_start_day_desc": "カレンダーの週の最初の曜日を設定",
  "show_lunar": "旧暦を表示",
  "show_lunar_desc": "日付の下に旧暦情報を表示",
  "show_timezone": "タイムゾーンを表示",
  "show_timezone_desc": "カレンダーにタイムゾーン情報を表示",
  "timezone_picker": "タイムゾーンを選択",
  "timezone_search_placeholder": "タイムゾーンを検索...",
  "days": {
    "sunday": "日曜日",
    "monday": "月曜日",
    "tuesday": "火曜日",
    "wednesday": "水曜日",
    "thursday": "木曜日",
    "friday": "金曜日",
    "saturday": "土曜日"
  }
}
```

- [ ] **Step 4: Verify JSON is valid**

Run: `node -e "JSON.parse(require('fs').readFileSync('src/i18n/locales/zh/common.json'))"` (repeat for en, ja)
Expected: No parse errors.

---

### Task 3: Create TimezonePicker component

**Files:**
- Create: `src/components/TimezonePicker.tsx`

- [ ] **Step 1: Create the TimezonePicker component**

```tsx
import { useState, useMemo, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDownIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";

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

function getTimezoneOffset(tz: string): string {
  try {
    const now = new Date();
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      timeZoneName: "shortOffset",
    }).formatToParts(now);
    const tzPart = parts.find((p) => p.type === "timeZoneName");
    return tzPart?.value || "";
  } catch {
    return "";
  }
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
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const allTimezones = useMemo<TimezoneItem[]>(() => {
    try {
      const zones = Intl.supportedValuesOf("timeZone");
      return zones.map((tz) => {
        const parts = tz.split("/");
        const continent = parts[0] || tz;
        const name = parts.slice(1).join("/").replace(/_/g, " ");
        return {
          name: tz,
          continent,
          offset: getTimezoneOffset(tz),
          localTime: getLocalTime(tz),
        };
      });
    } catch {
      return [];
    }
  }, []);

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

  const displayLabel = value.replace(/_/g, " ").split("/").slice(-1)[0] || value;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
      >
        <span className="truncate">{displayLabel} ({value})</span>
        <ChevronDownIcon className={`w-4 h-4 ml-2 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full max-h-64 overflow-auto rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-lg">
          <div className="sticky top-0 bg-white dark:bg-gray-800 p-2 border-b border-gray-200 dark:border-gray-600">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
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
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors.

---

### Task 4: Add "日期时间" tab to SettingsPage

**Files:**
- Modify: `src/pages/SettingsPage.tsx`

- [ ] **Step 1: Update imports**

At the top of `src/pages/SettingsPage.tsx`, add the `Clock` icon import (line 7):

```typescript
import { Settings, Palette, Sun, Moon, Laptop, LayoutGrid, Type, Layers, Clock } from 'lucide-react';
```

Add store destructuring for new fields (around line 40-42):

```typescript
const {
  theme, themeColor, language, priorityMode, notificationEnabled, fontSize, sidebarMode,
  weekStartDay, showLunar, showTimezone, selectedTimezone,
  setTheme, setThemeColor, setLanguage, setPriorityMode, setNotificationEnabled, setFontSize, setSidebarMode,
  setWeekStartDay, setShowLunar, setShowTimezone, setSelectedTimezone,
} = useAppStore();
```

Add import for TimezonePicker:

```typescript
import TimezonePicker from '@/components/TimezonePicker';
```

- [ ] **Step 2: Add emit effects for new settings**

After the existing `useEffect` blocks for `theme`, `themeColor`, `fontSize`, `language` (around line 55), add:

```typescript
useEffect(() => {
  emit('settings:changed', { key: 'weekStartDay', value: weekStartDay });
}, [weekStartDay]);
useEffect(() => {
  emit('settings:changed', { key: 'showLunar', value: showLunar });
}, [showLunar]);
useEffect(() => {
  emit('settings:changed', { key: 'showTimezone', value: showTimezone });
}, [showTimezone]);
useEffect(() => {
  emit('settings:changed', { key: 'selectedTimezone', value: selectedTimezone });
}, [selectedTimezone]);
```

- [ ] **Step 3: Expand activeTab type and add tab entry**

Change line 57:

```typescript
const [activeTab, setActiveTab] = useState<'general' | 'theme' | 'datetime'>('general');
```

Add the new tab to the `tabs` array (line 153-156):

```typescript
const tabs = [
  { id: 'general' as const, label: t('settings.tabs.general'), icon: Settings },
  { id: 'datetime' as const, label: t('settings.tabs.datetime'), icon: Clock },
  { id: 'theme' as const, label: t('settings.tabs.theme'), icon: Palette },
];
```

- [ ] **Step 4: Add the datetime tab content**

After the `activeTab === 'theme'` block (before the closing `</div>` of the content area, around line 532), add:

```tsx
{/* Date & Time Tab */}
{activeTab === 'datetime' && (
  <div className="space-y-6 max-w-2xl">
    {/* Week Start Day */}
    <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-1">
        {t('settings.datetime.week_start_day')}
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        {t('settings.datetime.week_start_day_desc')}
      </p>
      <div className="flex flex-wrap gap-2">
        {[
          { value: 0, key: 'sunday' },
          { value: 1, key: 'monday' },
          { value: 2, key: 'tuesday' },
          { value: 3, key: 'wednesday' },
          { value: 4, key: 'thursday' },
          { value: 5, key: 'friday' },
          { value: 6, key: 'saturday' },
        ].map((option) => (
          <label
            key={option.value}
            className={`flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-all ${
              weekStartDay === option.value
                ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 shadow-sm'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            <input
              type="radio"
              name="weekStartDay"
              value={option.value}
              checked={weekStartDay === option.value}
              onChange={() => setWeekStartDay(option.value)}
              className="sr-only"
            />
            {t(`settings.datetime.days.${option.key}`)}
          </label>
        ))}
      </div>
    </section>

    {/* Show Lunar */}
    <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <label className="flex items-center justify-between cursor-pointer">
        <div>
          <div className="text-gray-900 dark:text-gray-100 font-medium">
            {t('settings.datetime.show_lunar')}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t('settings.datetime.show_lunar_desc')}
          </div>
        </div>
        <button
          onClick={() => setShowLunar(!showLunar)}
          className={`relative w-12 h-6 rounded-full transition-colors ${
            showLunar ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
              showLunar ? 'translate-x-6' : 'translate-x-0'
            }`}
          />
        </button>
      </label>
    </section>

    {/* Show Timezone */}
    <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <label className="flex items-center justify-between cursor-pointer mb-4">
        <div>
          <div className="text-gray-900 dark:text-gray-100 font-medium">
            {t('settings.datetime.show_timezone')}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t('settings.datetime.show_timezone_desc')}
          </div>
        </div>
        <button
          onClick={() => setShowTimezone(!showTimezone)}
          className={`relative w-12 h-6 rounded-full transition-colors ${
            showTimezone ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
              showTimezone ? 'translate-x-6' : 'translate-x-0'
            }`}
          />
        </button>
      </label>
      {showTimezone && (
        <div>
          <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
            {t('settings.datetime.timezone_picker')}
          </label>
          <TimezonePicker value={selectedTimezone} onChange={setSelectedTimezone} />
        </div>
      )}
    </section>
  </div>
)}
```

- [ ] **Step 5: Verify dev server starts**

Run: `npm run tauri dev`
Expected: Settings page shows 3 tabs; "Date & Time" tab renders correctly.

---

### Task 5: Add new settings to SQLite sync

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Update SettingsSync destructuring**

In `src/App.tsx` line 142, add new fields to the destructuring:

```typescript
const { theme, themeColor, language, priorityMode, notificationEnabled, weekStartDay, fontSize, taskSortBy, taskSortOrder, taskGroupBy,
  showLunar, showTimezone, selectedTimezone,
  setTheme, setThemeColor, setLanguage, setPriorityMode, setNotificationEnabled, setWeekStartDay,
  setShowLunar, setShowTimezone, setSelectedTimezone } = useAppStore();
```

- [ ] **Step 2: Add SQLite load for new settings**

In the `useEffect` that loads settings (around line 146-196), after the `dbFontSize` block, add:

```typescript
const dbShowLunar = map.get('show_lunar');
const dbShowTimezone = map.get('show_timezone');
const dbSelectedTimezone = map.get('selected_timezone');
const dbWeekStart = map.get('week_start_day'); // already exists, but now accept 0-6

// Update weekStartDay validation to accept 0-6
if (dbWeekStart !== undefined) {
  const val = parseInt(dbWeekStart, 10);
  if (val >= 0 && val <= 6) setWeekStartDay(val);
}

if (dbShowLunar !== undefined) {
  setShowLunar(dbShowLunar === '1');
}
if (dbShowTimezone !== undefined) {
  setShowTimezone(dbShowTimezone === '1');
}
if (dbSelectedTimezone && typeof dbSelectedTimezone === 'string') {
  setSelectedTimezone(dbSelectedTimezone);
}
```

Replace the existing `dbWeekStart` block (lines 176-179) with the expanded version above.

- [ ] **Step 3: Add SQLite save for new settings**

In the `useEffect` that writes settings (around line 200-216), add new entries to `updateSettings`:

```typescript
api.updateSettings([
  // ... existing entries ...
  ['week_start_day', String(weekStartDay)],
  ['show_lunar', showLunar ? '1' : '0'],
  ['show_timezone', showTimezone ? '1' : '0'],
  ['selected_timezone', selectedTimezone],
  // ... rest ...
])
```

Also add `showLunar, showTimezone, selectedTimezone` to the dependency array of this `useEffect`.

- [ ] **Step 4: Add event listeners for new settings**

In the `listen('settings:changed', ...)` handler (around line 220-233), add cases:

```typescript
case 'weekStartDay': store.setWeekStartDay(value as number); break;
case 'showLunar': store.setShowLunar(value as boolean); break;
case 'showTimezone': store.setShowTimezone(value as boolean); break;
case 'selectedTimezone': store.setSelectedTimezone(value as string); break;
```

- [ ] **Step 5: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors.

---

### Task 6: Conditionalize lunar display in DateTimeCalenderPicker

**Files:**
- Modify: `src/components/DateTimeCalenderPicker.tsx`

- [ ] **Step 1: Add store import**

At the top of the file, add:

```typescript
import { useAppStore } from "@/stores/useAppStore";
```

Inside the component function body, add:

```typescript
const showLunar = useAppStore((s) => s.showLunar);
const showTimezone = useAppStore((s) => s.showTimezone);
const selectedTimezone = useAppStore((s) => s.selectedTimezone);
```

- [ ] **Step 2: Conditionalize lunar display in the calendar grid**

Find the lunar rendering block (around line 297):

```tsx
{lunarStr && (
    <span
        className="text-[9px] leading-tight mt-0.5 truncate max-w-full px-0.5"
```

Wrap the entire lunar block with `showLunar`:

```tsx
{showLunar && lunarStr && (
    <span
        className="text-[9px] leading-tight mt-0.5 truncate max-w-full px-0.5"
```

- [ ] **Step 3: Add timezone display**

After the lunar span (or after the day number span if lunar is hidden), add a timezone row. Find the spot right after the `{showLunar && lunarStr && (` block closes, and add:

```tsx
{showTimezone && cell.inMonth && (
    <span className="text-[8px] leading-tight text-gray-400 dark:text-gray-500 truncate max-w-full px-0.5">
        {selectedTimezone.split("/").pop()?.replace(/_/g, " ")}
    </span>
)}
```

Note: For DateTimeCalenderPicker (single date picker), showing timezone on every cell may be too verbose. Consider showing it only on the selected date or as a footer label. Evaluate during implementation — if too cluttered, show only a single timezone label below the calendar grid instead:

```tsx
{showTimezone && (
    <div className="text-[10px] text-gray-400 dark:text-gray-500 text-center mt-1">
        {selectedTimezone.replace(/_/g, " ")}
    </div>
)}
```

- [ ] **Step 4: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors.

---

### Task 7: Conditionalize lunar display in DateTimeCalenderWithRangePicker

**Files:**
- Modify: `src/components/DateTimeCalenderWithRangePicker.tsx`

- [ ] **Step 1: Add store import**

At the top of the file, add:

```typescript
import { useAppStore } from "@/stores/useAppStore";
```

Inside the component, add:

```typescript
const showLunar = useAppStore((s) => s.showLunar);
const showTimezone = useAppStore((s) => s.showTimezone);
const selectedTimezone = useAppStore((s) => s.selectedTimezone);
```

- [ ] **Step 2: Conditionalize lunar in first calendar instance (line ~426)**

Find the lunar rendering (around line 426):

```tsx
{lunarStr && (
    <span
        className="text-[9px] leading-tight mt-0.5 truncate max-w-full px-0.5"
```

Change to:

```tsx
{showLunar && lunarStr && (
    <span
        className="text-[9px] leading-tight mt-0.5 truncate max-w-full px-0.5"
```

- [ ] **Step 3: Conditionalize lunar in second calendar instance (line ~686)**

Find the second lunar block (around line 686):

```tsx
{lunarStr && (
    <span
        className="text-[7px] leading-tight truncate max-w-full px-0.5"
```

Change to:

```tsx
{showLunar && lunarStr && (
    <span
        className="text-[7px] leading-tight truncate max-w-full px-0.5"
```

- [ ] **Step 4: Add timezone footer to both calendar panels**

After each calendar grid's closing `</div>`, add a timezone label (similar approach to Task 6 Step 3):

```tsx
{showTimezone && (
    <div className="text-[9px] text-gray-400 dark:text-gray-500 text-center mt-1">
        {selectedTimezone.replace(/_/g, " ")}
    </div>
)}
```

- [ ] **Step 5: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors.

---

### Task 8: Expand weekStartDay in CalendarView.tsx (0-6 support)

**Files:**
- Modify: `src/components/tasks/CalendarView.tsx`

- [ ] **Step 1: Update dayLabels to support all 7 days**

Currently (line 65-73):

```typescript
const dayLabels = useMemo(() => {
    const sun = [
      t('habits.calendar.sun'), t('habits.calendar.mon'), t('habits.calendar.tue'),
      t('habits.calendar.wed'), t('habits.calendar.thu'), t('habits.calendar.fri'),
      t('habits.calendar.sat'),
    ];
    if (weekStartDay === 1) return [...sun.slice(1), sun[0]];
    return sun;
  }, [t, weekStartDay]);
```

Replace with:

```typescript
const dayLabels = useMemo(() => {
    const all = [
      t('habits.calendar.sun'), t('habits.calendar.mon'), t('habits.calendar.tue'),
      t('habits.calendar.wed'), t('habits.calendar.thu'), t('habits.calendar.fri'),
      t('habits.calendar.sat'),
    ];
    return [...all.slice(weekStartDay), ...all.slice(0, weekStartDay)];
  }, [t, weekStartDay]);
```

- [ ] **Step 2: Verify firstDayOfWeek calculation still works**

The existing formula `(rawDow - weekStartDay + 7) % 7` (line 106) already handles any `weekStartDay` value 0-6. No change needed.

- [ ] **Step 3: Verify dev server**

Run: `npm run tauri dev`
Expected: Calendar view header rotates correctly for any selected week start day.

---

### Task 9: Expand weekStartDay in CountdownsPage.tsx (0-6 support)

**Files:**
- Modify: `src/pages/CountdownsPage.tsx`

- [ ] **Step 1: Update dayLabels to support all 7 days**

Currently (around line 473):

```typescript
if (weekStartDay === 1) return [...sun.slice(1), sun[0]];
```

Replace with:

```typescript
return [...sun.slice(weekStartDay), ...sun.slice(0, weekStartDay)];
```

- [ ] **Step 2: Verify firstDayOfWeek formula**

The existing formula `(rawDow - weekStartDay + 7) % 7` (line 492) already handles 0-6. No change needed.

- [ ] **Step 3: Verify dev server**

Run: `npm run tauri dev`
Expected: Countdowns calendar view rotates header for any week start day.

---

### Task 10: Conditionalize lunar in remaining components (optional follow-up)

The following files also call `getLunarDayStr()` but were not in the original requirements. Apply the same `showLunar` guard pattern from Tasks 6-7 if full coverage is desired:

- `src/components/DateTimePicker.tsx` (lines 178, 194)
- `src/components/DateTimeRangePicker.tsx` (lines 181, 196)
- `src/pages/HabitsPage.tsx` (lines 486, 673, 1006, 1103)
- `src/pages/dialogs/DatePickerDialogPage.tsx` (lines 115, 150)

Pattern: add `const showLunar = useAppStore((s) => s.showLunar);` and wrap each `{lunarStr && (` with `{showLunar && lunarStr && (`.

---

### Task 11: End-to-end verification

- [ ] **Step 1: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 2: Run dev server and verify all settings**

Run: `npm run tauri dev`

Verify:
- [ ] Settings page shows 3 tabs: General, Date & Time, Theme
- [ ] Week start day shows 7 radio options, defaults to Monday
- [ ] Changing week start day updates CalendarView and CountdownsPage headers
- [ ] Show Lunar toggle hides/shows lunar text on DateTimeCalenderPicker
- [ ] Show Lunar toggle hides/shows lunar text on DateTimeCalenderWithRangePicker
- [ ] Show Timezone toggle hides/shows timezone label on calendar components
- [ ] TimezonePicker opens, shows search, groups by continent, shows offset and local time
- [ ] Selecting a timezone updates the displayed timezone
- [ ] Settings persist across app restart (SQLite sync)
- [ ] i18n works for zh, en, ja

- [ ] **Step 3: Commit**

```bash
git add src/stores/useAppStore.ts src/pages/SettingsPage.tsx src/App.tsx src/components/TimezonePicker.tsx src/components/DateTimeCalenderPicker.tsx src/components/DateTimeCalenderWithRangePicker.tsx src/components/tasks/CalendarView.tsx src/pages/CountdownsPage.tsx src/i18n/locales/zh/common.json src/i18n/locales/en/common.json src/i18n/locales/ja/common.json
git commit -m "feat: add Date & Time settings tab with week start day, lunar, and timezone options"
```
