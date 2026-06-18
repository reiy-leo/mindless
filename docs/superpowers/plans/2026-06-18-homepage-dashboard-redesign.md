# Homepage Dashboard Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the existing HomePage with a GitHub-style heatmap dashboard showing task/habit completion heatmaps, currently watching media, this month's countdowns, and pinned notes.

**Architecture:** A new Rust command aggregates task completion and habit log counts by day over the past year. The frontend renders two heatmap grids side by side, followed by three compact list sections for media, countdowns, and notes. The existing HomePage is fully replaced.

**Tech Stack:** React + TypeScript + Tailwind CSS (frontend), Tauri + SQLite + rusqlite (backend), @tanstack/react-query (data fetching)

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src-tauri/src/commands/tasks.rs` | Modify | Add `get_heatmap_data` command |
| `src-tauri/src/lib.rs` | Modify | Register new command |
| `src/lib/api.ts` | Modify | Add `getHeatmapData()` function |
| `src/queries/useHeatmapQueries.ts` | Create | React Query hook for heatmap |
| `src/components/HeatmapGrid.tsx` | Create | Reusable heatmap component |
| `src/pages/HomePage.tsx` | Modify | Replace with new dashboard |
| `src/i18n/locales/zh/common.json` | Modify | Add new keys |
| `src/i18n/locales/en/common.json` | Modify | Add new keys |
| `src/i18n/locales/ja/common.json` | Modify | Add new keys |

---

### Task 1: Backend — Add `get_heatmap_data` command

**Files:**
- Modify: `src-tauri/src/commands/tasks.rs`
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: Add the command to `tasks.rs`**

Append at the end of `src-tauri/src/commands/tasks.rs`:

```rust
use std::collections::HashMap;

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HeatmapData {
    pub tasks: HashMap<String, i32>,
    pub habits: HashMap<String, i32>,
}

#[tauri::command]
pub async fn get_heatmap_data(app: AppHandle) -> Result<HeatmapData, String> {
    let conn = get_db(&app)?;

    let one_year_ago = {
        let now = chrono::Utc::now().date_naive();
        (now - chrono::Duration::days(364)).format("%Y-%m-%d").to_string()
    };

    // Task completions by day
    let mut task_map: HashMap<String, i32> = HashMap::new();
    {
        let mut stmt = conn
            .prepare("SELECT DATE(completed_at) as d, COUNT(*) FROM tasks WHERE completed_at IS NOT NULL AND completed_at >= ?1 GROUP BY d")
            .map_err(|e| format!("Failed to prepare task heatmap query: {}", e))?;
        let rows = stmt.query_map([&one_year_ago], |row| {
                Ok((row.get::<_, String>(0)?, row.get::<_, i32>(1)?))
            })
            .map_err(|e| format!("Failed to query task heatmap: {}", e))?;
        for row in rows {
            let (date, count) = row.map_err(|e| format!("Row error: {}", e))?;
            task_map.insert(date, count);
        }
    }

    // Habit log completions by day
    let mut habit_map: HashMap<String, i32> = HashMap::new();
    {
        let mut stmt = conn
            .prepare("SELECT log_date, COUNT(*) FROM habit_logs WHERE completed = 1 AND log_date >= ?1 GROUP BY log_date")
            .map_err(|e| format!("Failed to prepare habit heatmap query: {}", e))?;
        let rows = stmt.query_map([&one_year_ago], |row| {
                Ok((row.get::<_, String>(0)?, row.get::<_, i32>(1)?))
            })
            .map_err(|e| format!("Failed to query habit heatmap: {}", e))?;
        for row in rows {
            let (date, count) = row.map_err(|e| format!("Row error: {}", e))?;
            habit_map.insert(date, count);
        }
    }

    Ok(HeatmapData {
        tasks: task_map,
        habits: habit_map,
    })
}
```

- [ ] **Step 2: Register the command in `lib.rs`**

In `src-tauri/src/lib.rs`, add to the `invoke_handler` array (after `commands::reorder_steps,`):

```rust
            commands::get_heatmap_data,
```

- [ ] **Step 3: Build to verify compilation**

```bash
cd src-tauri && cargo build 2>&1 | tail -5
```

Expected: Build succeeds (no errors).

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/commands/tasks.rs src-tauri/src/lib.rs
git commit -m "feat: add get_heatmap_data backend command"
```

---

### Task 2: Frontend — API function and React Query hook

**Files:**
- Modify: `src/lib/api.ts`
- Create: `src/queries/useHeatmapQueries.ts`

- [ ] **Step 1: Add API function to `api.ts`**

Append at the end of `src/lib/api.ts`:

```typescript
// Heatmap APIs
export interface HeatmapData {
  tasks: Record<string, number>;
  habits: Record<string, number>;
}

export async function getHeatmapData(): Promise<HeatmapData> {
  return await invoke<HeatmapData>('get_heatmap_data');
}
```

- [ ] **Step 2: Create React Query hook**

Create `src/queries/useHeatmapQueries.ts`:

```typescript
import { useQuery } from '@tanstack/react-query';
import * as api from '@/lib/api';

export function useHeatmapData() {
  return useQuery({
    queryKey: ['heatmap-data'],
    queryFn: () => api.getHeatmapData(),
    staleTime: 5 * 60 * 1000,
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/api.ts src/queries/useHeatmapQueries.ts
git commit -m "feat: add heatmap API and React Query hook"
```

---

### Task 3: Frontend — HeatmapGrid component

**Files:**
- Create: `src/components/HeatmapGrid.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/HeatmapGrid.tsx`:

```tsx
import { useMemo, useState } from 'react';

interface HeatmapGridProps {
  data: Record<string, number>;
  color?: string;
  weeks?: number;
}

const DAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

function getMonthLabels(weeks: number): { label: string; col: number }[] {
  const today = new Date();
  const startDay = new Date(today);
  startDay.setDate(startDay.getDate() - (weeks * 7 - 1) - ((startDay.getDay() + 6) % 7));

  const months: { label: string; col: number }[] = [];
  let lastMonth = -1;
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  for (let w = 0; w < weeks; w++) {
    const d = new Date(startDay);
    d.setDate(d.getDate() + w * 7);
    const m = d.getMonth();
    if (m !== lastMonth) {
      months.push({ label: monthNames[m], col: w });
      lastMonth = m;
    }
  }
  return months;
}

function getIntensity(count: number, max: number): number {
  if (count === 0 || max === 0) return 0;
  const ratio = count / max;
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}

function getColorForLevel(level: number, baseColor: string): string {
  if (level === 0) return '';
  const opacity = [0, 0.25, 0.5, 0.75, 1][level];
  const r = parseInt(baseColor.slice(1, 3), 16);
  const g = parseInt(baseColor.slice(3, 5), 16);
  const b = parseInt(baseColor.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

export default function HeatmapGrid({ data, color = '#3B82F6', weeks = 52 }: HeatmapGridProps) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);

  const { grid, maxCount, startDate } = useMemo(() => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(start.getDate() - (weeks * 7 - 1) - ((start.getDay() + 6) % 7));

    const max = Math.max(1, ...Object.values(data));

    const cells: { date: string; count: number; row: number; col: number }[] = [];

    for (let w = 0; w < weeks; w++) {
      for (let d = 0; d < 7; d++) {
        const cellDate = new Date(start);
        cellDate.setDate(cellDate.getDate() + w * 7 + d);
        if (cellDate > today) continue;

        const key = cellDate.toISOString().slice(0, 10);
        cells.push({
          date: key,
          count: data[key] || 0,
          row: d,
          col: w,
        });
      }
    }

    return { grid: cells, maxCount: max, startDate: start };
  }, [data, weeks]);

  const monthLabels = useMemo(() => getMonthLabels(weeks), [weeks]);

  return (
    <div className="relative">
      {/* Month labels */}
      <div className="flex ml-6 mb-1" style={{ height: 14 }}>
        {monthLabels.map((m, i) => (
          <span
            key={i}
            className="text-[10px] text-gray-400 dark:text-gray-500 absolute"
            style={{ left: `${(m.col / weeks) * 100}%` }}
          >
            {m.label}
          </span>
        ))}
      </div>

      <div className="flex gap-0">
        {/* Day labels */}
        <div className="flex flex-col mr-1.5 justify-between" style={{ paddingTop: 2 }}>
          {DAY_LABELS.map((label, i) => (
            <span key={i} className="text-[10px] text-gray-400 dark:text-gray-500 leading-3 h-3 flex items-center">
              {label}
            </span>
          ))}
        </div>

        {/* Grid */}
        <div
          className="grid gap-[3px]"
          style={{
            gridTemplateColumns: `repeat(${weeks}, 1fr)`,
            gridTemplateRows: 'repeat(7, 1fr)',
          }}
        >
          {grid.map((cell) => {
            const level = getIntensity(cell.count, maxCount);
            const bg = getColorForLevel(level, color);
            return (
              <div
                key={`${cell.col}-${cell.row}`}
                className="w-3 h-3 rounded-[2px] cursor-pointer transition-transform hover:scale-125"
                style={{
                  backgroundColor: bg || undefined,
                  gridColumn: cell.col + 1,
                  gridRow: cell.row + 1,
                }}
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setTooltip({
                    x: rect.left + rect.width / 2,
                    y: rect.top - 8,
                    text: `${cell.date}: ${cell.count}`,
                  });
                }}
                onMouseLeave={() => setTooltip(null)}
              />
            );
          })}
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 px-2 py-1 text-xs rounded bg-gray-800 text-white shadow-lg pointer-events-none whitespace-nowrap"
          style={{ left: tooltip.x, top: tooltip.y, transform: 'translate(-50%, -100%)' }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/apple/Documents/Playgrounds/mindless && npx tsc --noEmit 2>&1 | head -20
```

Expected: No errors from the new file.

- [ ] **Step 3: Commit**

```bash
git add src/components/HeatmapGrid.tsx
git commit -m "feat: add HeatmapGrid component"
```

---

### Task 4: i18n — Add new translation keys

**Files:**
- Modify: `src/i18n/locales/zh/common.json`
- Modify: `src/i18n/locales/en/common.json`
- Modify: `src/i18n/locales/ja/common.json`

- [ ] **Step 1: Update zh/common.json**

In `src/i18n/locales/zh/common.json`, replace the `"dashboard"` block with:

```json
  "dashboard": {
    "today_tasks": "今日任务",
    "habits": "今日习惯",
    "countdowns": "即将到来",
    "no_tasks": "今日暂无任务",
    "no_habits": "暂无习惯",
    "no_countdowns": "暂无倒数日",
    "view_all": "查看全部",
    "overdue": "逾期",
    "days_left": "天",
    "days_ago": "天前",
    "checked_in": "已打卡",
    "check_in": "打卡",
    "stats": {
      "tasks_today": "今日任务",
      "completed": "已完成",
      "habits": "习惯打卡",
      "countdowns": "倒数日"
    },
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
```

- [ ] **Step 2: Update en/common.json**

In `src/i18n/locales/en/common.json`, replace the `"dashboard"` block with:

```json
  "dashboard": {
    "today_tasks": "Today's Tasks",
    "habits": "Today's Habits",
    "countdowns": "Upcoming",
    "no_tasks": "No tasks for today",
    "no_habits": "No habits to track",
    "no_countdowns": "No upcoming countdowns",
    "view_all": "View all",
    "overdue": "Overdue",
    "days_left": "days",
    "days_ago": "days ago",
    "checked_in": "Done",
    "check_in": "Check in",
    "stats": {
      "tasks_today": "Tasks Today",
      "completed": "Completed",
      "habits": "Habits",
      "countdowns": "Countdowns"
    },
    "heatmap": {
      "tasks": "Tasks Completed",
      "habits": "Habits Checked In",
      "mon": "Mon",
      "wed": "Wed",
      "fri": "Fri"
    },
    "watching": "Currently Watching",
    "no_watching": "Nothing watching",
    "pinned_notes": "Pinned Notes",
    "no_pinned_notes": "No pinned notes",
    "this_month_countdowns": "This Month",
    "no_month_countdowns": "No countdowns this month"
  }
```

- [ ] **Step 3: Update ja/common.json**

In `src/i18n/locales/ja/common.json`, replace the `"dashboard"` block with:

```json
  "dashboard": {
    "today_tasks": "今日のタスク",
    "habits": "今日の習慣",
    "countdowns": "次のイベント",
    "no_tasks": "今日のタスクはありません",
    "no_habits": "習慣はありません",
    "no_countdowns": "カウントダウンはありません",
    "view_all": "すべて見る",
    "overdue": "期限超過",
    "days_left": "日",
    "days_ago": "日前",
    "checked_in": "完了",
    "check_in": "チェックイン",
    "stats": {
      "tasks_today": "今日のタスク",
      "completed": "完了",
      "habits": "習慣",
      "countdowns": "カウントダウン"
    },
    "heatmap": {
      "tasks": "タスク完了",
      "habits": "習慣チェックイン",
      "mon": "月",
      "wed": "水",
      "fri": "金"
    },
    "watching": "視聴中",
    "no_watching": "視聴中の作品はありません",
    "pinned_notes": "ピン留めノート",
    "no_pinned_notes": "ピン留めノートはありません",
    "this_month_countdowns": "今月のカウントダウン",
    "no_month_countdowns": "今月のカウントダウンはありません"
  }
```

- [ ] **Step 4: Commit**

```bash
git add src/i18n/locales/zh/common.json src/i18n/locales/en/common.json src/i18n/locales/ja/common.json
git commit -m "feat: add heatmap and dashboard i18n keys"
```

---

### Task 5: Frontend — Redesign HomePage.tsx

**Files:**
- Modify: `src/pages/HomePage.tsx`

- [ ] **Step 1: Rewrite HomePage.tsx**

Replace the entire contents of `src/pages/HomePage.tsx` with:

```tsx
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ArrowRightIcon } from '@heroicons/react/24/outline';
import HeatmapGrid from '@/components/HeatmapGrid';
import { useHeatmapData } from '@/queries/useHeatmapQueries';
import { useCountdowns } from '@/queries/useCountdownQueries';
import { useNotes } from '@/queries/useNoteQueries';
import { useMediaItems } from '@/queries/useMediaQueries';

const COUNTDOWN_ICONS: Record<string, string> = {
  flag: '🚩', heart: '❤️', star: '⭐', gift: '🎁', cake: '🎂',
  plane: '✈️', ring: '💍', baby: '👶', graduation: '🎓', house: '🏠',
};

export default function HomePage() {
  const { t } = useTranslation('common');

  const { data: heatmapData } = useHeatmapData();
  const { data: countdowns = [] } = useCountdowns();
  const { data: notes = [] } = useNotes();
  const { data: watchingMedia = [] } = useMediaItems({ status: 'normal' });

  const today = new Date();
  const monthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

  const thisMonthCountdowns = useMemo(() => {
    return countdowns
      .filter((cd) => cd.targetDate.startsWith(monthStr))
      .sort((a, b) => a.targetDate.localeCompare(b.targetDate));
  }, [countdowns, monthStr]);

  const pinnedNotes = useMemo(() => {
    return notes.filter((n) => n.isPinned && !n.isArchived && !n.deletedAt);
  }, [notes]);

  const getDaysRemaining = (targetDate: string) => {
    const [y, m, d] = targetDate.split('-').map(Number);
    const target = new Date(y, m - 1, d);
    return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const stripMarkdown = (text: string) => {
    return text.replace(/[#*_`~\[\]()]/g, '').replace(/\n+/g, ' ').trim();
  };

  return (
    <div className="flex-1 overflow-auto px-8 py-4">
      <div className="max-w-6xl mx-auto">
        <h1 data-tauri-drag-region className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          {t('navigation.home')}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          {today.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>

        {/* Heatmaps */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Tasks Heatmap */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              {t('dashboard.heatmap.tasks')}
            </h2>
            <HeatmapGrid data={heatmapData?.tasks ?? {}} color="#3B82F6" />
          </div>

          {/* Habits Heatmap */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              {t('dashboard.heatmap.habits')}
            </h2>
            <HeatmapGrid data={heatmapData?.habits ?? {}} color="#3B82F6" />
          </div>
        </div>

        {/* Bottom sections */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Currently Watching */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {t('dashboard.watching')}
              </h2>
              <Link
                to="/media"
                className="text-xs text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1"
              >
                {t('dashboard.view_all')}
                <ArrowRightIcon className="w-3 h-3" />
              </Link>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
              {watchingMedia.length === 0 ? (
                <div className="p-4 text-center text-gray-400 dark:text-gray-500 text-xs">
                  {t('dashboard.no_watching')}
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {watchingMedia.slice(0, 5).map((item) => (
                    <div key={item.id} className="flex items-center gap-3 px-3 py-2.5">
                      {item.cover ? (
                        <img
                          src={item.cover}
                          alt={item.title}
                          className="w-8 h-11 rounded object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-8 h-11 rounded bg-gray-200 dark:bg-gray-600 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {item.title}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          {item.type === 'movie' ? '🎬' : '📺'}
                          {item.rating ? ` ⭐ ${item.rating}` : ''}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* This Month's Countdowns */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {t('dashboard.this_month_countdowns')}
              </h2>
              <Link
                to="/countdowns"
                className="text-xs text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1"
              >
                {t('dashboard.view_all')}
                <ArrowRightIcon className="w-3 h-3" />
              </Link>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
              {thisMonthCountdowns.length === 0 ? (
                <div className="p-4 text-center text-gray-400 dark:text-gray-500 text-xs">
                  {t('dashboard.no_month_countdowns')}
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {thisMonthCountdowns.map((cd) => {
                    const days = getDaysRemaining(cd.targetDate);
                    return (
                      <div key={cd.id} className="flex items-center gap-3 px-3 py-2.5">
                        <span className="text-base">{COUNTDOWN_ICONS[cd.icon] || '🚩'}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                            {cd.title}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">{cd.targetDate}</p>
                        </div>
                        <span
                          className="text-sm font-bold"
                          style={{ color: days < 0 ? '#9CA3AF' : cd.color || '#F59E0B' }}
                        >
                          {days === 0 ? '🎉' : days > 0 ? `${days}${t('dashboard.days_left')}` : `${Math.abs(days)}${t('dashboard.days_ago')}`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* Pinned Notes */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {t('dashboard.pinned_notes')}
              </h2>
              <Link
                to="/notes"
                className="text-xs text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1"
              >
                {t('dashboard.view_all')}
                <ArrowRightIcon className="w-3 h-3" />
              </Link>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
              {pinnedNotes.length === 0 ? (
                <div className="p-4 text-center text-gray-400 dark:text-gray-500 text-xs">
                  {t('dashboard.no_pinned_notes')}
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {pinnedNotes.slice(0, 5).map((note) => (
                    <div key={note.id} className="px-3 py-2.5">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {note.title}
                      </p>
                      {note.content && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">
                          {stripMarkdown(note.content).slice(0, 60)}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/apple/Documents/Playgrounds/mindless && npx tsc --noEmit 2>&1 | head -20
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/HomePage.tsx
git commit -m "feat: redesign HomePage with heatmaps and new dashboard sections"
```

---

### Task 6: Verify and test

- [ ] **Step 1: Run the dev server**

```bash
cd /Users/apple/Documents/Playgrounds/mindless && npm run tauri dev
```

Expected: App launches, homepage shows two heatmap grids and three list sections below.

- [ ] **Step 2: Visual check**

- Heatmaps render with colored cells
- Hovering shows date + count tooltip
- "Currently Watching" shows media with status=normal
- "This Month" shows countdowns with targetDate in current month
- "Pinned Notes" shows notes with isPinned=true
- Empty states show appropriate messages
- All text is localized (switch language to verify)

- [ ] **Step 3: Run lint**

```bash
cd /Users/apple/Documents/Playgrounds/mindless && npm run lint 2>&1 | tail -10
```

Expected: No new errors.
