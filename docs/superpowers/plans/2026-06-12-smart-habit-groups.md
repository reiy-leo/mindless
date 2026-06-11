# Smart Habit Groups Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add smart groups (All, Week, Archived, Deleted) and custom habit groups to the Habits page with a left sidebar panel, matching the Tasks page pattern.

**Architecture:** Add `habit_groups` table and `group_id` column to habits. New Rust commands for group CRUD and archive/unarchive. Refactor HabitsPage to have a left sidebar with smart groups + custom groups, week navigation bar with lunar dates, and context-aware card actions.

**Tech Stack:** Rust (Tauri commands, rusqlite), React + TypeScript, Tailwind CSS, lunar-javascript

---

## Task 1: Database Migration — habit_groups table + group_id column

**Files:**
- Modify: `src-tauri/src/db/migrations.rs:189-195`

- [ ] **Step 1: Add habit_groups table to migration SQL**

In `src-tauri/src/db/migrations.rs`, add the following SQL block before the closing `"#;` on line 189 (after the last CREATE INDEX):

```sql
CREATE TABLE IF NOT EXISTS habit_groups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT DEFAULT '📁',
    color TEXT DEFAULT '#8B5CF6',
    sort_order REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_habit_groups_sort_order ON habit_groups(sort_order);
```

- [ ] **Step 2: Add group_id ALTER TABLE for habits**

In the incremental migration section (after line 207, where `let _ = conn.execute_batch(...)` calls are), add:

```rust
let _ = conn.execute_batch("ALTER TABLE habits ADD COLUMN group_id TEXT REFERENCES habit_groups(id) ON DELETE SET NULL;");
let _ = conn.execute_batch("CREATE INDEX IF NOT EXISTS idx_habits_group_id ON habits(group_id);");
```

- [ ] **Step 3: Verify migration runs**

Run: `cd src-tauri && cargo build`
Expected: Build succeeds, no migration errors.

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/db/migrations.rs
git commit -m "feat: add habit_groups table and group_id column migration"
```

---

## Task 2: Rust Model — HabitGroup struct

**Files:**
- Modify: `src-tauri/src/db/models.rs:115`

- [ ] **Step 1: Add HabitGroup struct**

In `src-tauri/src/db/models.rs`, add after the `HabitLog` struct (after line 128):

```rust
// Habit group model
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HabitGroup {
    pub id: String,
    pub name: String,
    pub icon: Option<String>,
    pub color: Option<String>,
    pub sort_order: f64,
    pub created_at: String,
    pub updated_at: String,
}
```

- [ ] **Step 2: Verify build**

Run: `cd src-tauri && cargo build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/db/models.rs
git commit -m "feat: add HabitGroup model"
```

---

## Task 3: Rust Commands — HabitGroup CRUD

**Files:**
- Modify: `src-tauri/src/commands/habits.rs`
- Modify: `src-tauri/src/lib.rs:52-61`

- [ ] **Step 1: Add row_to_habit_group and import**

In `src-tauri/src/commands/habits.rs`, update the import on line 4 to include HabitGroup:

```rust
use crate::db::models::{Habit, HabitLog, HabitGroup};
```

Add after `row_to_habit_log` function (after line 43):

```rust
fn row_to_habit_group(row: &rusqlite::Row) -> rusqlite::Result<HabitGroup> {
    Ok(HabitGroup {
        id: row.get(0)?,
        name: row.get(1)?,
        icon: row.get(2)?,
        color: row.get(3)?,
        sort_order: row.get(4)?,
        created_at: row.get(5)?,
        updated_at: row.get(6)?,
    })
}
```

- [ ] **Step 2: Add HabitGroup CRUD commands**

Add at the end of `src-tauri/src/commands/habits.rs` (before the file ends):

```rust
// ==================== Habit Group Commands ====================

#[tauri::command]
pub async fn get_habit_groups(app: AppHandle) -> Result<Vec<HabitGroup>, String> {
    let conn = get_db(&app)?;
    let mut stmt = conn.prepare("SELECT * FROM habit_groups ORDER BY sort_order ASC, created_at ASC")
        .map_err(|e| format!("Failed to prepare: {}", e))?;
    let groups = stmt.query_map([], row_to_habit_group)
        .map_err(|e| format!("Failed to query: {}", e))?;
    let result: Result<Vec<_>, _> = groups.collect();
    result.map_err(|e| format!("Failed to collect: {}", e))
}

#[tauri::command]
pub async fn create_habit_group(
    app: AppHandle,
    name: String,
    icon: Option<String>,
    color: Option<String>,
) -> Result<HabitGroup, String> {
    let conn = get_db(&app)?;
    let id = Uuid::new_v4().to_string();
    let icon = icon.unwrap_or_else(|| "📁".to_string());
    let color = color.unwrap_or_else(|| "#8B5CF6".to_string());

    // Get max sort_order
    let max_order: f64 = conn.query_row(
        "SELECT COALESCE(MAX(sort_order), -1) FROM habit_groups",
        [],
        |row| row.get(0),
    ).unwrap_or(-1.0);

    conn.execute(
        "INSERT INTO habit_groups (id, name, icon, color, sort_order) VALUES (?1, ?2, ?3, ?4, ?5)",
        (&id, &name, &icon, &color, max_order + 1.0),
    ).map_err(|e| format!("Failed to create habit group: {}", e))?;

    let group = conn.query_row(
        "SELECT * FROM habit_groups WHERE id = ?1",
        [&id],
        row_to_habit_group,
    ).map_err(|e| format!("Failed to fetch created group: {}", e))?;

    Ok(group)
}

#[tauri::command]
pub async fn update_habit_group(
    app: AppHandle,
    id: String,
    name: Option<String>,
    icon: Option<String>,
    color: Option<String>,
) -> Result<HabitGroup, String> {
    let conn = get_db(&app)?;

    if let Some(n) = &name {
        conn.execute("UPDATE habit_groups SET name = ?1, updated_at = datetime('now') WHERE id = ?2", (n, &id))
            .map_err(|e| format!("Failed to update name: {}", e))?;
    }
    if let Some(i) = &icon {
        conn.execute("UPDATE habit_groups SET icon = ?1, updated_at = datetime('now') WHERE id = ?2", (i, &id))
            .map_err(|e| format!("Failed to update icon: {}", e))?;
    }
    if let Some(c) = &color {
        conn.execute("UPDATE habit_groups SET color = ?1, updated_at = datetime('now') WHERE id = ?2", (c, &id))
            .map_err(|e| format!("Failed to update color: {}", e))?;
    }

    let group = conn.query_row(
        "SELECT * FROM habit_groups WHERE id = ?1",
        [&id],
        row_to_habit_group,
    ).map_err(|e| format!("Failed to fetch updated group: {}", e))?;

    Ok(group)
}

#[tauri::command]
pub async fn delete_habit_group(app: AppHandle, id: String) -> Result<(), String> {
    let conn = get_db(&app)?;
    // Habits in this group get group_id = NULL (ON DELETE SET NULL)
    conn.execute("DELETE FROM habit_groups WHERE id = ?1", [&id])
        .map_err(|e| format!("Failed to delete habit group: {}", e))?;
    Ok(())
}

#[tauri::command]
pub async fn get_archived_habits(app: AppHandle) -> Result<Vec<Habit>, String> {
    let conn = get_db(&app)?;
    let mut stmt = conn.prepare("SELECT * FROM habits WHERE archived_at IS NOT NULL ORDER BY archived_at DESC")
        .map_err(|e| format!("Failed to prepare: {}", e))?;
    let habits = stmt.query_map([], row_to_habit)
        .map_err(|e| format!("Failed to query: {}", e))?;
    let result: Result<Vec<_>, _> = habits.collect();
    result.map_err(|e| format!("Failed to collect: {}", e))
}

#[tauri::command]
pub async fn unarchive_habit(app: AppHandle, id: String) -> Result<Habit, String> {
    let conn = get_db(&app)?;
    conn.execute(
        "UPDATE habits SET archived_at = NULL, updated_at = datetime('now') WHERE id = ?1",
        [&id],
    ).map_err(|e| format!("Failed to unarchive habit: {}", e))?;

    let habit = conn.query_row(
        "SELECT * FROM habits WHERE id = ?1",
        [&id],
        row_to_habit,
    ).map_err(|e| format!("Failed to fetch unarchived habit: {}", e))?;

    // Refresh streaks
    let _ = refresh_single_habit_streaks(&conn, &habit);

    let habit = conn.query_row(
        "SELECT * FROM habits WHERE id = ?1",
        [&id],
        row_to_habit,
    ).map_err(|e| format!("Failed to re-fetch habit: {}", e))?;

    Ok(habit)
}

#[tauri::command]
pub async fn hard_delete_habit(app: AppHandle, id: String) -> Result<(), String> {
    let conn = get_db(&app)?;
    // Only allow hard delete for archived habits
    conn.execute(
        "DELETE FROM habits WHERE id = ?1 AND archived_at IS NOT NULL",
        [&id],
    ).map_err(|e| format!("Failed to hard delete habit: {}", e))?;
    Ok(())
}

#[tauri::command]
pub async fn move_habit_to_group(app: AppHandle, habit_id: String, group_id: Option<String>) -> Result<(), String> {
    let conn = get_db(&app)?;
    conn.execute(
        "UPDATE habits SET group_id = ?1, updated_at = datetime('now') WHERE id = ?2",
        (group_id, &habit_id),
    ).map_err(|e| format!("Failed to move habit to group: {}", e))?;
    Ok(())
}
```

- [ ] **Step 3: Register commands in lib.rs**

In `src-tauri/src/lib.rs`, add after line 61 (after `commands::refresh_habit_streaks,`):

```rust
commands::get_habit_groups,
commands::create_habit_group,
commands::update_habit_group,
commands::delete_habit_group,
commands::get_archived_habits,
commands::unarchive_habit,
commands::hard_delete_habit,
commands::move_habit_to_group,
```

- [ ] **Step 4: Verify build**

Run: `cd src-tauri && cargo build`
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/commands/habits.rs src-tauri/src/lib.rs
git commit -m "feat: add habit group CRUD, archive/unarchive, hard delete commands"
```

---

## Task 4: TypeScript Types + API + Queries

**Files:**
- Modify: `src/types/habit.ts`
- Modify: `src/lib/api.ts:244`
- Modify: `src/queries/useHabitQueries.ts`

- [ ] **Step 1: Add HabitGroup type**

In `src/types/habit.ts`, add after the `TodayCheckinInfo` interface (after line 66):

```typescript
export interface HabitGroup {
  id: string;
  name: string;
  icon: string;
  color: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}
```

- [ ] **Step 2: Add API functions**

In `src/lib/api.ts`, add after `refreshHabitStreaks` function (after line 244), before the Countdown APIs section:

```typescript
export async function getHabitGroups(): Promise<HabitGroup[]> {
  return await invoke<HabitGroup[]>('get_habit_groups');
}

export async function createHabitGroup(params: {
  name: string;
  icon?: string;
  color?: string;
}): Promise<HabitGroup> {
  return await invoke<HabitGroup>('create_habit_group', params);
}

export async function updateHabitGroup(id: string, params: {
  name?: string;
  icon?: string;
  color?: string;
}): Promise<HabitGroup> {
  return await invoke<HabitGroup>('update_habit_group', { id, ...params });
}

export async function deleteHabitGroup(id: string): Promise<void> {
  return await invoke<void>('delete_habit_group', { id });
}

export async function getArchivedHabits(): Promise<Habit[]> {
  return await invoke<Habit[]>('get_archived_habits');
}

export async function unarchiveHabit(id: string): Promise<Habit> {
  return await invoke<Habit>('unarchive_habit', { id });
}

export async function hardDeleteHabit(id: string): Promise<void> {
  return await invoke<void>('hard_delete_habit', { id });
}

export async function moveHabitToGroup(habitId: string, groupId: string | null): Promise<void> {
  return await invoke<void>('move_habit_to_group', { habitId, groupId });
}
```

Also add the import for `HabitGroup` at the top of `src/lib/api.ts` — find the existing type imports and add `HabitGroup` to the import from `@/types/habit`.

- [ ] **Step 3: Add React Query hooks**

In `src/queries/useHabitQueries.ts`, add at the end of the file:

```typescript
export function useHabitGroups() {
  return useQuery({
    queryKey: ['habit-groups'],
    queryFn: () => api.getHabitGroups(),
  });
}

export function useCreateHabitGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { name: string; icon?: string; color?: string }) =>
      api.createHabitGroup(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habit-groups'] });
    },
  });
}

export function useUpdateHabitGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...params }: { id: string; name?: string; icon?: string; color?: string }) =>
      api.updateHabitGroup(id, params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habit-groups'] });
    },
  });
}

export function useDeleteHabitGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteHabitGroup(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habit-groups'] });
      queryClient.invalidateQueries({ queryKey: ['habits'] });
    },
  });
}

export function useArchivedHabits() {
  return useQuery({
    queryKey: ['archived-habits'],
    queryFn: () => api.getArchivedHabits(),
  });
}

export function useUnarchiveHabit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.unarchiveHabit(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      queryClient.invalidateQueries({ queryKey: ['archived-habits'] });
    },
  });
}

export function useHardDeleteHabit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.hardDeleteHabit(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['archived-habits'] });
    },
  });
}

export function useMoveHabitToGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ habitId, groupId }: { habitId: string; groupId: string | null }) =>
      api.moveHabitToGroup(habitId, groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
    },
  });
}
```

Also add the import for `HabitGroup` type if needed in the import statement at line 3.

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npm run typecheck` (or `npx tsc --noEmit`)
Expected: No type errors.

- [ ] **Step 5: Commit**

```bash
git add src/types/habit.ts src/lib/api.ts src/queries/useHabitQueries.ts
git commit -m "feat: add habit group types, API functions, and React Query hooks"
```

---

## Task 5: Store — Add habit group state to useAppStore

**Files:**
- Modify: `src/stores/useAppStore.ts`

- [ ] **Step 1: Add state fields and actions**

In `src/stores/useAppStore.ts`, add to the `AppState` interface (after line 52, after `detailPanelWidth`):

```typescript
selectedHabitGroupId: string;
habitGroupsPanelWidth: number;
```

Add the corresponding setters (after line 70):

```typescript
setSelectedHabitGroupId: (id: string) => void;
setHabitGroupsPanelWidth: (width: number | ((prev: number) => number)) => void;
```

Add default values in the `create` call (after line 89):

```typescript
selectedHabitGroupId: 'all',
habitGroupsPanelWidth: 192,
```

Add setter implementations (after line 120):

```typescript
setSelectedHabitGroupId: (id) => set({ selectedHabitGroupId: id }),
setHabitGroupsPanelWidth: (width) =>
  set((state) => ({
    habitGroupsPanelWidth: typeof width === 'function' ? width(state.habitGroupsPanelWidth) : width,
  })),
```

Add to `partialize` (after line 135):

```typescript
selectedHabitGroupId: state.selectedHabitGroupId,
habitGroupsPanelWidth: state.habitGroupsPanelWidth,
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npm run typecheck`
Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add src/stores/useAppStore.ts
git commit -m "feat: add selectedHabitGroupId and habitGroupsPanelWidth to store"
```

---

## Task 6: HabitsPage Refactor — Sidebar + Smart Groups + Week View

**Files:**
- Modify: `src/pages/HabitsPage.tsx`

This is the largest task. The HabitsPage needs to be restructured from a single-column layout to a sidebar + main content layout.

- [ ] **Step 1: Add new imports**

At the top of `src/pages/HabitsPage.tsx`, add imports:

```typescript
import { useHabitGroups, useCreateHabitGroup, useUpdateHabitGroup, useDeleteHabitGroup,
  useArchivedHabits, useUnarchiveHabit, useHardDeleteHabit, useMoveHabitToGroup,
} from '@/queries/useHabitQueries';
import { useAppStore } from '@/stores/useAppStore';
import { ResizeHandle } from '@/components/ResizeHandle';
import {
  EyeIcon, EyeSlashIcon, ArchiveBoxIcon, CalendarDaysIcon,
  TrashIcon as TrashIconSolid,
} from '@heroicons/react/24/outline';
```

Note: Check if `ResizeHandle` component exists. If not, create a simple one or use the existing pattern from TasksPage.

- [ ] **Step 2: Add WeekView component**

Add a `WeekView` component before the `HabitsPage` function. This renders a horizontal bar with 7 day buttons showing solar + lunar dates:

```tsx
// ==================== Week View Bar ====================
function WeekView({
  selectedDate,
  onSelectDate,
}: {
  selectedDate: string;
  onSelectDate: (date: string) => void;
}) {
  const { t } = useTranslation('common');
  const [weekOffset, setWeekOffset] = useState(0);

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // Calculate the start of the week (Monday)
  const getWeekStart = (offset: number) => {
    const d = new Date(today);
    const dayOfWeek = d.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Monday = start
    d.setDate(d.getDate() + diff + offset * 7);
    return d;
  };

  const weekStart = getWeekStart(weekOffset);
  const days: { date: Date; dateStr: string; dayName: string }[] = [];
  const dayKeys = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    days.push({
      date: d,
      dateStr: d.toISOString().split('T')[0],
      dayName: t(`habits.days.${dayKeys[i]}`),
    });
  }

  return (
    <div className="flex items-center gap-1 mb-4">
      <button
        onClick={() => setWeekOffset(weekOffset - 1)}
        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
      >
        <ChevronLeftIcon className="w-4 h-4 text-gray-500" />
      </button>
      <div className="flex-1 grid grid-cols-7 gap-1">
        {days.map((day) => {
          const parts = day.dateStr.split('-').map(Number);
          const lunarStr = getLunarDayStr(parts[0], parts[1], parts[2]);
          const isSelected = day.dateStr === selectedDate;
          const isToday = day.dateStr === todayStr;

          return (
            <button
              key={day.dateStr}
              onClick={() => onSelectDate(day.dateStr)}
              className={`flex flex-col items-center py-1.5 px-1 rounded-lg transition-all text-xs ${
                isSelected
                  ? 'bg-blue-50 dark:bg-blue-900/30 ring-2 ring-blue-400'
                  : isToday
                    ? 'bg-gray-100 dark:bg-gray-700 font-bold'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <span className={`text-[10px] ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>
                {day.dayName}
              </span>
              <span className={`text-sm font-semibold ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-gray-800 dark:text-gray-200'}`}>
                {day.date.getDate()}
              </span>
              <span className={`text-[10px] ${isSelected ? 'text-blue-500 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`}>
                {lunarStr}
              </span>
            </button>
          );
        })}
      </div>
      <button
        onClick={() => setWeekOffset(weekOffset + 1)}
        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
      >
        <ChevronRightIcon className="w-4 h-4 text-gray-500" />
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Refactor main HabitsPage with sidebar**

Replace the `HabitsPage` function with a sidebar layout. Key changes:

1. Add state for `selectedDate` (for week view) and `newGroupName` (for inline group creation)
2. Use `useAppStore` for `selectedHabitGroupId`, `setSelectedHabitGroupId`, `habitGroupsPanelWidth`, `setHabitGroupsPanelWidth`
3. Fetch `useHabitGroups()`, `useArchivedHabits()` conditionally
4. Render sidebar with smart groups + custom groups
5. Render main content based on selected group
6. Show week bar when "week" group is selected

The sidebar structure:

```tsx
<div className="flex-1 flex overflow-hidden">
  {/* Groups Panel */}
  <div style={{ width: habitGroupsPanelWidth }} className="flex-shrink-0 border-r border-gray-200 dark:border-gray-700 overflow-auto">
    {/* Smart Groups */}
    <div className="px-2 pt-2 pb-1 border-b border-gray-100 dark:border-gray-700">
      <div className="space-y-px">
        {smartGroups.map(sg => (
          <button key={sg.id} onClick={() => setSelectedHabitGroupId(sg.id)}
            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-sm ...`}>
            {sg.icon}
            <span className="flex-1 truncate">{t(sg.labelKey)}</span>
            {sg.count > 0 && <span className="text-xs text-gray-400">{sg.count}</span>}
          </button>
        ))}
      </div>
    </div>

    {/* Custom Groups */}
    <div className="overflow-auto px-2 py-2">
      <div className="flex items-center justify-between mb-1 px-1.5">
        <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
          {t('habits.groups.title')}
        </span>
        <button onClick={handleCreateGroup} className="p-0.5 rounded hover:bg-gray-100 ...">
          <PlusIcon className="w-3.5 h-3.5 text-gray-400" />
        </button>
      </div>
      <div className="space-y-px">
        {habitGroups.map(group => (
          <button key={group.id} onClick={() => setSelectedHabitGroupId(group.id)}
            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-sm ...`}>
            <span>{group.icon}</span>
            <span className="flex-1 truncate">{group.name}</span>
            <span className="text-xs text-gray-400">{groupCounts[group.id] || 0}</span>
          </button>
        ))}
      </div>
    </div>
  </div>

  <ResizeHandle onResize={(delta) => setHabitGroupsPanelWidth(w => Math.max(160, Math.min(400, w + delta)))} />

  {/* Main Content */}
  <div className="flex-1 overflow-auto px-8 py-4">
    {/* Title bar */}
    {selectedHabitGroupId === 'week' && <WeekView selectedDate={selectedDate} onSelectDate={setSelectedDate} />}
    {/* Habit cards grid or empty state */}
  </div>
</div>
```

- [ ] **Step 4: Add filtering logic**

Filter habits based on selected group:
- `'all'`: all active habits (archived_at IS NULL)
- `'week'`: all active habits, but check-in values shown for `selectedDate` instead of today
- `'archived'`: use `useArchivedHabits()` data
- `'deleted'`: show empty state
- UUID: filter habits by `group_id === selectedHabitGroupId`

For the week view, replace `useTodayCheckinMap()` with a query for the selected date's check-in values. Use `useHabitLogs` for each habit, or create a batch query. Simplest approach: use `getHabitLogs(habitId, selectedDate, selectedDate)` — but this is per-habit. Better: create a `getCheckinsByDate(date)` API that returns a Map.

- [ ] **Step 5: Update HabitCard actions based on context**

Modify `HabitCard` to accept optional `onUnarchive` and `onHardDelete` props. Show different buttons based on context:
- Normal: Edit + Archive buttons (existing)
- Archived: Edit + Unarchive + Hard Delete buttons

- [ ] **Step 6: Add inline group creation**

Add state `showNewGroup` and `newGroupName`. When user clicks + in groups section, show an inline input. On Enter, call `createHabitGroup`. On Escape, cancel.

- [ ] **Step 7: Add group context menu / edit**

On hover over a custom group row, show edit + delete icons. Edit opens inline rename. Delete confirms and calls `deleteHabitGroup`.

- [ ] **Step 8: Verify everything works**

Run: `npm run tauri dev`
Test:
- Smart groups (All, Week, Archived, Deleted) switch correctly
- Week view shows 7 days with lunar dates, left/right navigation works
- Custom groups can be created, renamed, deleted
- Habits can be moved between groups
- Archive moves habit to Archived group
- Unarchive restores from Archived
- Hard delete removes permanently from Archived

- [ ] **Step 9: Commit**

```bash
git add src/pages/HabitsPage.tsx
git commit -m "feat: refactor HabitsPage with sidebar, smart groups, week view, and custom groups"
```

---

## Task 7: i18n — Add translation keys

**Files:**
- Modify: `src/locales/zh/common.json` (and `en/common.json` if exists)

- [ ] **Step 1: Add habit group translation keys**

Find the `habits` section in the locale file and add:

```json
{
  "habits": {
    "groups": {
      "title": "习惯组",
      "all": "所有",
      "week": "周视图",
      "archived": "已归档",
      "deleted": "已删除",
      "new_group": "新建习惯组",
      "rename": "重命名",
      "delete_group": "删除组",
      "delete_confirm": "确定删除这个习惯组吗？组内的习惯不会被删除。"
    },
    "unarchive": "恢复",
    "hard_delete": "永久删除",
    "hard_delete_confirm": "确定永久删除这个习惯吗？此操作不可撤销。",
    "no_archived": "没有已归档的习惯",
    "no_deleted": "已删除的习惯无法恢复"
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/locales/
git commit -m "feat: add habit group i18n keys"
```

---

## Implementation Order

Execute tasks in order: 1 → 2 → 3 → 4 → 5 → 6 → 7

Tasks 1-5 are small, independent layers. Task 6 is the main UI refactor. Task 7 can be done in parallel with Task 6.
