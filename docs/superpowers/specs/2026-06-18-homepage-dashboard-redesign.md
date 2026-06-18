# Homepage Dashboard Redesign

## Overview

Redesign the HomePage to show GitHub-style heatmaps for tasks and habits, plus quick-access lists for currently watching media, this month's countdowns, and pinned notes. Remove the existing stat cards, today's tasks list, today's habits list, and upcoming countdowns list.

## Layout

```
┌─────────────────────────────────────────────────┐
│  首页 + 日期                                      │
├──────────────────────┬──────────────────────────┤
│  任务热力图 (52周)     │  习惯热力图 (52周)         │
├──────────────────────┼──────────────────────┬────┤
│  正在观看的影视        │  本月倒数日            │ 收藏│
│  (紧凑列表)           │  (紧凑列表)            │ 笔记│
│                      │                      │列表 │
└──────────────────────┴──────────────────────┴────┘
```

## Components

### 1. Heatmap Component

A reusable `HeatmapGrid` component that renders a GitHub-style contribution graph.

**Props:**
- `data: Record<string, number>` — map of `YYYY-MM-DD` to intensity value (0-1)
- `color: string` — base theme color for the heatmap
- `weeks: number` — number of weeks to display (default 52)

**Rendering:**
- 52 columns × 7 rows grid (Mon-Sun)
- Each cell is a rounded square (~12px)
- Color intensity levels: 0% (empty bg), 25%, 50%, 75%, 100% of the theme color
- Tooltip on hover showing date and count
- Month labels along the top
- Day labels (Mon, Wed, Fri) along the left

**Data computation:**
- Tasks heatmap: count completed tasks per day using `completedAt` field, normalize to 0-1 based on max daily count
- Habits heatmap: count completed habit check-ins per day from `habit_logs`, normalize to 0-1 based on max daily count
- Both use the same theme color (from user settings or default blue `#3B82F6`)

### 2. Currently Watching Media Section

**Data source:** `useMediaItems({ status: 'normal' })` — items with `status = 'normal'` (in-progress)

**Display:** Compact list showing:
- Cover thumbnail (small, rounded)
- Title
- Type indicator (movie/season)
- Rating (if available)

**Empty state:** "暂无在看影视" with link to media page

### 3. This Month's Countdowns Section

**Data source:** `useCountdowns()` filtered by `targetDate` within current month

**Display:** Compact list showing:
- Icon
- Title
- Target date
- Days remaining (highlighted number)

**Empty state:** "本月暂无倒数日"

### 4. Pinned Notes Section

**Data source:** `useNotes()` filtered by `isPinned = true` and not archived

**Display:** Compact list showing:
- Title
- Content preview (first ~50 chars, stripped of markdown)
- Last updated time

**Empty state:** "暂无收藏笔记" with link to notes page

## Data Sources

| Module | Query | Filter |
|--------|-------|--------|
| Tasks heatmap | `useAllTasks()` | `completedAt` in past 365 days |
| Habits heatmap | `useHabitLogs()` per habit | Logs in past 365 days |
| Watching media | `useMediaItems()` | `status = 'normal'` |
| Month countdowns | `useCountdowns()` | `targetDate` in current month |
| Pinned notes | `useNotes()` | `isPinned = true`, not archived |

## Backend Changes

### New Rust Command: `get_heatmap_data`

Returns aggregated daily counts for tasks and habits over the past year.

```rust
#[derive(Serialize)]
struct DayCount {
    date: String,      // YYYY-MM-DD
    count: i32,
}

#[tauri::command]
fn get_heatmap_data(db: State<Database>) -> Result<HeatmapData, String> {
    // Query tasks: GROUP BY DATE(completed_at) for past 365 days
    // Query habit_logs: GROUP BY log_date for past 365 days
    // Return both maps
}
```

**Response:**
```json
{
  "tasks": { "2025-06-18": 3, "2025-06-17": 1, ... },
  "habits": { "2025-06-18": 2, "2025-06-17": 0, ... }
}
```

This avoids N+1 queries by aggregating in SQL.

## i18n Keys

Add to `dashboard` namespace in all 3 locales (zh, en, ja):

```json
{
  "dashboard": {
    "heatmap": {
      "tasks": "任务完成",
      "habits": "习惯打卡",
      "mon": "一",
      "wed": "三",
      "fri": "五"
    },
    "watching": "正在观看",
    "no_watching": "暂无在看影视",
    "pinned_notes": "收藏笔记",
    "no_pinned_notes": "暂无收藏笔记",
    "this_month_countdowns": "本月倒数日",
    "no_month_countdowns": "本月暂无倒数日"
  }
}
```

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/components/HeatmapGrid.tsx` | Create — reusable heatmap component |
| `src/pages/HomePage.tsx` | Modify — replace with new dashboard layout |
| `src/lib/api.ts` | Add `getHeatmapData()` API call |
| `src/queries/useHeatmapQueries.ts` | Create — React Query hook for heatmap data |
| `src-tauri/src/commands/tasks.rs` | Add `get_heatmap_data` command |
| `src-tauri/src/commands/habits.rs` | Or add habit heatmap query here |
| `src-tauri/src/commands/mod.rs` | Register new command |
| `src/i18n/locales/zh/common.json` | Add heatmap/dashboard keys |
| `src/i18n/locales/en/common.json` | Add heatmap/dashboard keys |
| `src/i18n/locales/ja/common.json` | Add heatmap/dashboard keys |

## Open Questions

- Theme color: use a hardcoded default or read from user settings? → Use default `#3B82F6` (blue) for now, can be made configurable later.
