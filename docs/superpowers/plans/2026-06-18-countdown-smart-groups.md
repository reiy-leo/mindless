# Countdown Smart Groups Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a sidebar with smart groups (auto-filters) and user/built-in groups to the countdown page, following existing habit/media group patterns.

**Architecture:** Three categories of groups: (1) **Smart groups** — client-side filters (已完成/已删除/收藏) that query by countdown state, not stored in DB; (2) **Built-in groups** — preset DB rows with `is_preset=1` (节日/生日/纪念日/统计), seeded at migration, immutable; (3) **User groups** — standard CRUD groups. A new `countdown_groups` table mirrors `habit_groups` + `is_preset` from `media_groups`. The `countdowns` table gains `group_id`, `is_favorite`, and `deleted_at` columns. The sidebar follows the `MediaSidebar` pattern: smart groups on top, groups section below with expand/collapse, inline `GroupFormPopup` for create/edit.

**Tech Stack:** React + TypeScript + Vite (frontend), Tauri + Rust + SQLite (backend), React Query (data fetching), Zustand (state), i18next (i18n)

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `src-tauri/src/db/migrations.rs` | Modify | Add `countdown_groups` table, seed presets, alter `countdowns` table |
| `src-tauri/src/db/models.rs` | Modify | Add `CountdownGroup` and `CountdownGroupWithCount` models, update `Countdown` model |
| `src-tauri/src/commands/countdowns.rs` | Modify | Add group CRUD commands + update existing commands for new columns |
| `src-tauri/src/commands/mod.rs` | No change | Already exports `countdowns` module |
| `src-tauri/src/lib.rs` | Modify | Register new commands |
| `src/types/countdown.ts` | Modify | Add `CountdownGroup`, `CountdownGroupWithCount` types, update `Countdown`, `CreateCountdownParams`, `UpdateCountdownParams` |
| `src/lib/api.ts` | Modify | Add group API functions + update countdown APIs for new fields |
| `src/queries/useCountdownQueries.ts` | Modify | Add group hooks + update countdown hooks for new query keys |
| `src/stores/useAppStore.ts` | Modify | Add `selectedCountdownGroupId`, `countdownGroupsPanelWidth` state |
| `src/components/countdown/CountdownSidebar.tsx` | Create | New sidebar component |
| `src/pages/CountdownsPage.tsx` | Modify | Integrate sidebar, group filtering, layout changes |
| `src/i18n/locales/zh/common.json` | Modify | Add group i18n keys |
| `src/i18n/locales/en/common.json` | Modify | Add group i18n keys |
| `src/i18n/locales/ja/common.json` | Modify | Add group i18n keys |

---

## Task 1: Database Migration — `countdown_groups` table + `countdowns` columns

**Files:**
- Modify: `src-tauri/src/db/migrations.rs`

- [ ] **Step 1: Add `countdown_groups` table and seed presets**

In `migrations.rs`, after the existing `countdowns` table creation (around line 127), add a new migration block. Add it inside the `conn.execute_batch` section or as a separate `execute_batch` call after the media migration:

```rust
// Countdown groups table
conn.execute_batch("
    CREATE TABLE IF NOT EXISTS countdown_groups (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        color TEXT DEFAULT '#8B5CF6',
        icon TEXT DEFAULT '📅',
        is_preset INTEGER NOT NULL DEFAULT 0,
        sort_order REAL NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_countdown_groups_sort_order ON countdown_groups(sort_order);
").map_err(|e| format!("Failed to create countdown_groups table: {}", e))?;

// Seed preset groups
conn.execute_batch(
    "INSERT OR IGNORE INTO countdown_groups (id, name, color, icon, is_preset, sort_order) VALUES
        ('preset-holidays', '节日', '#EF4444', '🎄', 1, 1),
        ('preset-birthdays', '生日', '#EC4899', '🎂', 1, 2),
        ('preset-anniversaries', '纪念日', '#8B5CF6', '💍', 1, 3),
        ('preset-statistics', '统计', '#3B82F6', '📊', 1, 4);
").map_err(|e| format!("Failed to insert preset countdown groups: {}", e))?;
```

- [ ] **Step 2: Add new columns to `countdowns` table**

Add these `ALTER TABLE` statements with the existing column-addition pattern (around line 215):

```rust
let _ = conn.execute_batch("ALTER TABLE countdowns ADD COLUMN group_id TEXT REFERENCES countdown_groups(id) ON DELETE SET NULL;");
let _ = conn.execute_batch("ALTER TABLE countdowns ADD COLUMN is_favorite INTEGER NOT NULL DEFAULT 0;");
let _ = conn.execute_batch("ALTER TABLE countdowns ADD COLUMN deleted_at TEXT;");
let _ = conn.execute_batch("CREATE INDEX IF NOT EXISTS idx_countdowns_group_id ON countdowns(group_id);");
let _ = conn.execute_batch("CREATE INDEX IF NOT EXISTS idx_countdowns_is_favorite ON countdowns(is_favorite);");
let _ = conn.execute_batch("CREATE INDEX IF NOT EXISTS idx_countdowns_deleted_at ON countdowns(deleted_at);");
```

- [ ] **Step 3: Verify migration runs**

Run: `cd src-tauri && cargo build`
Expected: Build succeeds with no errors.

---

## Task 2: Rust Models — `CountdownGroup` + updated `Countdown`

**Files:**
- Modify: `src-tauri/src/db/models.rs:145-164`

- [ ] **Step 1: Add `CountdownGroup` model**

After the existing `Countdown` model (line 164), add:

```rust
// Countdown group model
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CountdownGroup {
    pub id: String,
    pub name: String,
    pub color: Option<String>,
    pub icon: Option<String>,
    pub is_preset: bool,
    pub sort_order: f64,
    pub created_at: String,
    pub updated_at: String,
}

// Countdown group with usage count
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CountdownGroupWithCount {
    pub id: String,
    pub name: String,
    pub color: Option<String>,
    pub icon: Option<String>,
    pub is_preset: bool,
    pub sort_order: f64,
    pub created_at: String,
    pub updated_at: String,
    pub usage_count: i64,
}
```

- [ ] **Step 2: Update `Countdown` model with new fields**

Modify the existing `Countdown` struct (lines 146-164) to add three new fields:

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Countdown {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub icon: Option<String>,
    pub color: Option<String>,
    pub target_date: String,
    pub target_time: Option<String>,
    pub event_type: String,
    pub reminder_enabled: bool,
    pub reminder_days_before: Option<i32>,
    pub reminder_time: Option<String>,
    pub is_recurring: bool,
    pub recurrence_rule: Option<String>,
    pub group_id: Option<String>,
    pub is_favorite: bool,
    pub deleted_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}
```

- [ ] **Step 3: Verify build**

Run: `cd src-tauri && cargo build`
Expected: Compilation errors in `countdowns.rs` due to missing fields in `row_to_countdown`. This is expected — will be fixed in Task 3.

---

## Task 3: Rust Commands — Group CRUD + Updated Countdown Commands

**Files:**
- Modify: `src-tauri/src/commands/countdowns.rs`

- [ ] **Step 1: Update `row_to_countdown` to include new fields**

Replace the existing `row_to_countdown` function (lines 9-27):

```rust
fn row_to_countdown(row: &rusqlite::Row) -> rusqlite::Result<Countdown> {
    Ok(Countdown {
        id: row.get(0)?,
        title: row.get(1)?,
        description: row.get(2)?,
        icon: row.get(3)?,
        color: row.get(4)?,
        target_date: row.get(5)?,
        target_time: row.get(6)?,
        event_type: row.get(7)?,
        reminder_enabled: row.get::<_, i32>(8)? != 0,
        reminder_days_before: row.get(9)?,
        reminder_time: row.get(10)?,
        is_recurring: row.get::<_, i32>(11)? != 0,
        recurrence_rule: row.get(12)?,
        created_at: row.get(13)?,
        updated_at: row.get(14)?,
        group_id: row.get(15)?,
        is_favorite: row.get::<_, i32>(16).unwrap_or(0) != 0,
        deleted_at: row.get(17)?,
    })
}
```

- [ ] **Step 2: Add `row_to_countdown_group` helper**

```rust
use crate::db::models::{Countdown, CountdownGroup, CountdownGroupWithCount};

fn row_to_countdown_group(row: &rusqlite::Row) -> rusqlite::Result<CountdownGroup> {
    Ok(CountdownGroup {
        id: row.get(0)?,
        name: row.get(1)?,
        color: row.get(2)?,
        icon: row.get(3)?,
        is_preset: row.get::<_, i32>(4)? != 0,
        sort_order: row.get(5)?,
        created_at: row.get(6)?,
        updated_at: row.get(7)?,
    })
}
```

- [ ] **Step 3: Update `get_countdowns` to exclude deleted**

Change the SQL in `get_countdowns` (line 32) to:

```rust
let mut stmt = conn.prepare("SELECT * FROM countdowns WHERE deleted_at IS NULL ORDER BY target_date ASC, target_time ASC")
```

- [ ] **Step 4: Update `create_countdown` to accept `group_id`**

Add `group_id: Option<String>` parameter to `create_countdown` and include it in the INSERT:

```rust
#[tauri::command]
pub async fn create_countdown(
    app: AppHandle,
    title: String,
    description: Option<String>,
    icon: Option<String>,
    color: Option<String>,
    target_date: String,
    target_time: Option<String>,
    event_type: Option<String>,
    reminder_enabled: Option<bool>,
    reminder_days_before: Option<i32>,
    reminder_time: Option<String>,
    is_recurring: Option<bool>,
    recurrence_rule: Option<String>,
    group_id: Option<String>,
) -> Result<Countdown, String> {
    let conn = get_db(&app)?;
    let id = Uuid::new_v4().to_string();
    let reminder = if reminder_enabled.unwrap_or(false) { 1 } else { 0 };
    let recurring = if is_recurring.unwrap_or(false) { 1 } else { 0 };
    let icon = icon.unwrap_or_else(|| "flag".to_string());
    let color = color.unwrap_or_else(|| "#EF4444".to_string());
    let event_type = event_type.unwrap_or_else(|| "countdown".to_string());

    conn.execute(
        "INSERT INTO countdowns (id, title, description, icon, color, target_date, target_time, event_type, reminder_enabled, reminder_days_before, reminder_time, is_recurring, recurrence_rule, group_id) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)",
        rusqlite::params![
            id, title, description.as_deref().unwrap_or(""), icon, color,
            target_date, target_time.as_deref().unwrap_or(""), event_type,
            reminder, reminder_days_before.unwrap_or(0), reminder_time.as_deref().unwrap_or(""),
            recurring, recurrence_rule.as_deref().unwrap_or(""), group_id,
        ]
    ).map_err(|e| format!("Failed to create countdown: {}", e))?;

    let countdown = conn.query_row("SELECT * FROM countdowns WHERE id = ?1", [&id], row_to_countdown)
        .map_err(|e| format!("Failed to fetch countdown: {}", e))?;
    Ok(countdown)
}
```

- [ ] **Step 5: Update `update_countdown` to handle `group_id`, `is_favorite`**

Add `group_id: Option<String>` and `is_favorite: Option<bool>` to the update_countdown params, and handle them in the dynamic SQL builder:

```rust
#[tauri::command]
pub async fn update_countdown(
    app: AppHandle,
    id: String,
    title: Option<String>,
    description: Option<String>,
    icon: Option<String>,
    color: Option<String>,
    target_date: Option<String>,
    target_time: Option<String>,
    event_type: Option<String>,
    reminder_enabled: Option<bool>,
    reminder_days_before: Option<i32>,
    reminder_time: Option<String>,
    is_recurring: Option<bool>,
    recurrence_rule: Option<String>,
    group_id: Option<Option<String>>,
    is_favorite: Option<bool>,
) -> Result<Countdown, String> {
    // ... existing dynamic SQL builder pattern ...
    // Add these blocks:
    if let Some(v) = group_id {
        sql.push_str(&format!(", group_id = ?{}", param_idx));
        params.push(Box::new(v));
        param_idx += 1;
    }
    if let Some(v) = is_favorite {
        sql.push_str(&format!(", is_favorite = ?{}", param_idx));
        params.push(Box::new(if v { 1i32 } else { 0i32 }));
        param_idx += 1;
    }
    // ... rest of existing code ...
}
```

- [ ] **Step 6: Add soft-delete command**

```rust
#[tauri::command]
pub async fn soft_delete_countdown(app: AppHandle, id: String) -> Result<(), String> {
    let conn = get_db(&app)?;
    conn.execute(
        "UPDATE countdowns SET deleted_at = datetime('now'), updated_at = datetime('now') WHERE id = ?1",
        [&id],
    ).map_err(|e| format!("Failed to soft delete countdown: {}", e))?;
    Ok(())
}

#[tauri::command]
pub async fn restore_countdown(app: AppHandle, id: String) -> Result<Countdown, String> {
    let conn = get_db(&app)?;
    conn.execute(
        "UPDATE countdowns SET deleted_at = NULL, updated_at = datetime('now') WHERE id = ?1",
        [&id],
    ).map_err(|e| format!("Failed to restore countdown: {}", e))?;
    let countdown = conn.query_row("SELECT * FROM countdowns WHERE id = ?1", [&id], row_to_countdown)
        .map_err(|e| format!("Failed to fetch countdown: {}", e))?;
    Ok(countdown)
}

#[tauri::command]
pub async fn hard_delete_countdown(app: AppHandle, id: String) -> Result<(), String> {
    let conn = get_db(&app)?;
    conn.execute("DELETE FROM countdowns WHERE id = ?1 AND deleted_at IS NOT NULL", [&id])
        .map_err(|e| format!("Failed to hard delete countdown: {}", e))?;
    Ok(())
}
```

- [ ] **Step 7: Add group CRUD commands**

```rust
#[tauri::command]
pub async fn get_countdown_groups(app: AppHandle) -> Result<Vec<CountdownGroupWithCount>, String> {
    let conn = get_db(&app)?;
    let mut stmt = conn.prepare(
        "SELECT g.*, (SELECT COUNT(*) FROM countdowns c WHERE c.group_id = g.id AND c.deleted_at IS NULL) as usage_count
         FROM countdown_groups g ORDER BY g.sort_order ASC, g.created_at ASC"
    ).map_err(|e| format!("Failed to prepare: {}", e))?;

    let groups = stmt.query_map([], |row| {
        Ok(CountdownGroupWithCount {
            id: row.get(0)?,
            name: row.get(1)?,
            color: row.get(2)?,
            icon: row.get(3)?,
            is_preset: row.get::<_, i32>(4)? != 0,
            sort_order: row.get(5)?,
            created_at: row.get(6)?,
            updated_at: row.get(7)?,
            usage_count: row.get(8)?,
        })
    }).map_err(|e| format!("Failed to query: {}", e))?;

    let result: Result<Vec<_>, _> = groups.collect();
    result.map_err(|e| format!("Failed to collect: {}", e))
}

#[tauri::command]
pub async fn create_countdown_group(
    app: AppHandle,
    name: String,
    icon: Option<String>,
    color: Option<String>,
) -> Result<CountdownGroup, String> {
    let conn = get_db(&app)?;
    let id = Uuid::new_v4().to_string();
    let icon = icon.unwrap_or_else(|| "📅".to_string());
    let color = color.unwrap_or_else(|| "#8B5CF6".to_string());

    let max_order: f64 = conn.query_row(
        "SELECT COALESCE(MAX(sort_order), -1) FROM countdown_groups", [], |row| row.get(0),
    ).unwrap_or(-1.0);

    conn.execute(
        "INSERT INTO countdown_groups (id, name, icon, color, sort_order) VALUES (?1, ?2, ?3, ?4, ?5)",
        (&id, &name, &icon, &color, max_order + 1.0),
    ).map_err(|e| format!("Failed to create countdown group: {}", e))?;

    let group = conn.query_row(
        "SELECT * FROM countdown_groups WHERE id = ?1", [&id], row_to_countdown_group,
    ).map_err(|e| format!("Failed to fetch created group: {}", e))?;
    Ok(group)
}

#[tauri::command]
pub async fn update_countdown_group(
    app: AppHandle,
    id: String,
    name: Option<String>,
    icon: Option<String>,
    color: Option<String>,
) -> Result<CountdownGroup, String> {
    let conn = get_db(&app)?;
    // Check is_preset
    let is_preset: bool = conn.query_row(
        "SELECT is_preset FROM countdown_groups WHERE id = ?1", [&id], |row| row.get::<_, i32>(0),
    ).map_err(|e| format!("Group not found: {}", e))? != 0;
    if is_preset {
        return Err("Cannot modify preset group".to_string());
    }

    if let Some(n) = &name {
        conn.execute("UPDATE countdown_groups SET name = ?1, updated_at = datetime('now') WHERE id = ?2", (n, &id))
            .map_err(|e| format!("Failed to update name: {}", e))?;
    }
    if let Some(i) = &icon {
        conn.execute("UPDATE countdown_groups SET icon = ?1, updated_at = datetime('now') WHERE id = ?2", (i, &id))
            .map_err(|e| format!("Failed to update icon: {}", e))?;
    }
    if let Some(c) = &color {
        conn.execute("UPDATE countdown_groups SET color = ?1, updated_at = datetime('now') WHERE id = ?2", (c, &id))
            .map_err(|e| format!("Failed to update color: {}", e))?;
    }

    let group = conn.query_row(
        "SELECT * FROM countdown_groups WHERE id = ?1", [&id], row_to_countdown_group,
    ).map_err(|e| format!("Failed to fetch updated group: {}", e))?;
    Ok(group)
}

#[tauri::command]
pub async fn delete_countdown_group(app: AppHandle, id: String) -> Result<(), String> {
    let conn = get_db(&app)?;
    let is_preset: bool = conn.query_row(
        "SELECT is_preset FROM countdown_groups WHERE id = ?1", [&id], |row| row.get::<_, i32>(0),
    ).map_err(|e| format!("Group not found: {}", e))? != 0;
    if is_preset {
        return Err("Cannot delete preset group".to_string());
    }
    // Unassign countdowns from this group
    conn.execute("UPDATE countdowns SET group_id = NULL, updated_at = datetime('now') WHERE group_id = ?1", [&id])
        .map_err(|e| format!("Failed to unassign countdowns: {}", e))?;
    conn.execute("DELETE FROM countdown_groups WHERE id = ?1", [&id])
        .map_err(|e| format!("Failed to delete group: {}", e))?;
    Ok(())
}

#[tauri::command]
pub async fn dissolve_countdown_group(app: AppHandle, id: String) -> Result<(), String> {
    let conn = get_db(&app)?;
    let is_preset: bool = conn.query_row(
        "SELECT is_preset FROM countdown_groups WHERE id = ?1", [&id], |row| row.get::<_, i32>(0),
    ).map_err(|e| format!("Group not found: {}", e))? != 0;
    if is_preset {
        return Err("Cannot dissolve preset group".to_string());
    }
    conn.execute("UPDATE countdowns SET group_id = NULL, updated_at = datetime('now') WHERE group_id = ?1", [&id])
        .map_err(|e| format!("Failed to unassign countdowns: {}", e))?;
    conn.execute("DELETE FROM countdown_groups WHERE id = ?1", [&id])
        .map_err(|e| format!("Failed to delete group: {}", e))?;
    Ok(())
}
```

- [ ] **Step 8: Register new commands in `lib.rs`**

In `src-tauri/src/lib.rs`, add to the countdowns command block (after line 80):

```rust
commands::get_countdown_groups,
commands::create_countdown_group,
commands::update_countdown_group,
commands::delete_countdown_group,
commands::dissolve_countdown_group,
commands::soft_delete_countdown,
commands::restore_countdown,
commands::hard_delete_countdown,
```

- [ ] **Step 9: Verify build**

Run: `cd src-tauri && cargo build`
Expected: Build succeeds.

---

## Task 4: TypeScript Types

**Files:**
- Modify: `src/types/countdown.ts`

- [ ] **Step 1: Add new types and update existing ones**

```typescript
export type EventType = 'countdown' | 'countup';

export interface CountdownGroup {
  id: string;
  name: string;
  color: string;
  icon: string;
  isPreset: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CountdownGroupWithCount extends CountdownGroup {
  usageCount: number;
}

export interface Countdown {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  targetDate: string;
  targetTime?: string;
  eventType: EventType;
  reminderEnabled: boolean;
  reminderDaysBefore: number;
  reminderTime?: string;
  isRecurring: boolean;
  recurrenceRule?: string;
  groupId?: string;
  isFavorite: boolean;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCountdownParams {
  title: string;
  description?: string;
  icon?: string;
  color?: string;
  targetDate: string;
  targetTime?: string;
  eventType?: EventType;
  reminderEnabled?: boolean;
  reminderDaysBefore?: number;
  reminderTime?: string;
  isRecurring?: boolean;
  recurrenceRule?: string;
  groupId?: string;
}

export interface UpdateCountdownParams {
  title?: string;
  description?: string;
  icon?: string;
  color?: string;
  targetDate?: string;
  targetTime?: string;
  eventType?: EventType;
  reminderEnabled?: boolean;
  reminderDaysBefore?: number;
  reminderTime?: string;
  isRecurring?: boolean;
  recurrenceRule?: string;
  groupId?: string | null;
  isFavorite?: boolean;
}
```

---

## Task 5: API Layer

**Files:**
- Modify: `src/lib/api.ts`

- [ ] **Step 1: Add countdown group API functions**

After the existing countdown APIs (line 372), add:

```typescript
// Countdown Group APIs
export async function getCountdownGroups(): Promise<CountdownGroupWithCount[]> {
  return await invoke<CountdownGroupWithCount[]>('get_countdown_groups');
}

export async function createCountdownGroup(params: {
  name: string; icon?: string; color?: string;
}): Promise<CountdownGroup> {
  return await invoke<CountdownGroup>('create_countdown_group', params);
}

export async function updateCountdownGroup(id: string, params: {
  name?: string; icon?: string; color?: string;
}): Promise<CountdownGroup> {
  return await invoke<CountdownGroup>('update_countdown_group', { id, ...params });
}

export async function deleteCountdownGroup(id: string): Promise<void> {
  return await invoke<void>('delete_countdown_group', { id });
}

export async function dissolveCountdownGroup(id: string): Promise<void> {
  return await invoke<void>('dissolve_countdown_group', { id });
}

export async function softDeleteCountdown(id: string): Promise<void> {
  return await invoke<void>('soft_delete_countdown', { id });
}

export async function restoreCountdown(id: string): Promise<Countdown> {
  return await invoke<Countdown>('restore_countdown', { id });
}

export async function hardDeleteCountdown(id: string): Promise<void> {
  return await invoke<void>('hard_delete_countdown', { id });
}
```

- [ ] **Step 2: Update `createCountdown` to include `groupId`**

Update the `createCountdown` function params to include `groupId?: string`.

- [ ] **Step 3: Update `updateCountdown` to include new fields**

Update the `updateCountdown` function params to include `groupId?: string | null` and `isFavorite?: boolean`.

- [ ] **Step 4: Add `getDeletedCountdowns` API**

```typescript
export async function getDeletedCountdowns(): Promise<Countdown[]> {
  return await invoke<Countdown[]>('get_deleted_countdowns');
}

export async function getFavoriteCountdowns(): Promise<Countdown[]> {
  return await invoke<Countdown[]>('get_favorite_countdowns');
}
```

**Note:** For the smart groups (已完成, 已删除, 收藏), we can either:
- Option A: Add dedicated Rust commands (`get_deleted_countdowns`, `get_favorite_countdowns`, `get_completed_countdowns`)
- Option B: Fetch all countdowns and filter client-side

**Recommended: Option B** — Client-side filtering is simpler and avoids extra DB queries. The smart groups filter from the existing `countdowns` array:
- 已完成: `targetDate < today` (for countdown type)
- 已删除: `deletedAt !== null` (fetch separately or filter)
- 收藏: `isFavorite === true`

For 已Deleted, we need a separate fetch since `get_countdowns` excludes deleted. Add a `getDeletedCountdowns` command.

---

## Task 6: React Query Hooks

**Files:**
- Modify: `src/queries/useCountdownQueries.ts`

- [ ] **Step 1: Add group hooks**

```typescript
export function useCountdownGroups() {
  return useQuery({
    queryKey: ['countdown-groups'],
    queryFn: () => api.getCountdownGroups(),
  });
}

export function useCreateCountdownGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { name: string; icon?: string; color?: string }) =>
      api.createCountdownGroup(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['countdown-groups'] });
    },
  });
}

export function useUpdateCountdownGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...params }: { id: string; name?: string; icon?: string; color?: string }) =>
      api.updateCountdownGroup(id, params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['countdown-groups'] });
    },
  });
}

export function useDeleteCountdownGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteCountdownGroup(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['countdown-groups'] });
      queryClient.invalidateQueries({ queryKey: ['countdowns'] });
    },
  });
}

export function useDissolveCountdownGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.dissolveCountdownGroup(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['countdown-groups'] });
      queryClient.invalidateQueries({ queryKey: ['countdowns'] });
    },
  });
}
```

- [ ] **Step 2: Add soft-delete/restore hooks**

```typescript
export function useSoftDeleteCountdown() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.softDeleteCountdown(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['countdowns'] });
      queryClient.invalidateQueries({ queryKey: ['deleted-countdowns'] });
    },
  });
}

export function useRestoreCountdown() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.restoreCountdown(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['countdowns'] });
      queryClient.invalidateQueries({ queryKey: ['deleted-countdowns'] });
    },
  });
}

export function useHardDeleteCountdown() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.hardDeleteCountdown(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deleted-countdowns'] });
    },
  });
}

export function useDeletedCountdowns() {
  return useQuery({
    queryKey: ['deleted-countdowns'],
    queryFn: () => api.getDeletedCountdowns(),
  });
}
```

- [ ] **Step 3: Update `useDeleteCountdown` to use soft-delete**

Change the existing `useDeleteCountdown` to call `softDeleteCountdown` instead of `deleteCountdown`. Keep the hard-delete as a separate hook.

---

## Task 7: Zustand Store

**Files:**
- Modify: `src/stores/useAppStore.ts`

- [ ] **Step 1: Add countdown group state**

Add to the state interface (around line 60):

```typescript
selectedCountdownGroupId: string;
countdownGroupsPanelWidth: number;
```

Add to the initial state (around line 116):

```typescript
selectedCountdownGroupId: 'all',
countdownGroupsPanelWidth: 192,
```

Add setters:

```typescript
setSelectedCountdownGroupId: (id: string) => set({ selectedCountdownGroupId: id }),
setCountdownGroupsPanelWidth: (width) =>
  set((state) => ({
    countdownGroupsPanelWidth: typeof width === 'function' ? width(state.countdownGroupsPanelWidth) : width,
  })),
```

Add to the persist partialize (around line 192):

```typescript
selectedCountdownGroupId: state.selectedCountdownGroupId,
countdownGroupsPanelWidth: state.countdownGroupsPanelWidth,
```

---

## Task 8: i18n Keys

**Files:**
- Modify: `src/i18n/locales/zh/common.json`
- Modify: `src/i18n/locales/en/common.json`
- Modify: `src/i18n/locales/ja/common.json`

- [ ] **Step 1: Add Chinese i18n keys**

Add inside the `"countdowns"` object in `zh/common.json`:

```json
"groups": {
  "title": "分组",
  "all": "全部",
  "completed": "已完成",
  "deleted": "已删除",
  "favorites": "收藏",
  "holidays": "节日",
  "birthdays": "生日",
  "anniversaries": "纪念日",
  "statistics": "统计",
  "new_group": "新建分组",
  "edit_group": "编辑分组",
  "dissolve": "解散分组",
  "dissolve_confirm": "确定解散此分组？组内倒数日将变为未分组。",
  "delete_confirm": "确定删除此分组？",
  "preset_cannot_modify": "预设分组不可修改",
  "preset_cannot_delete": "预设分组不可删除"
},
"restore": "恢复",
"hard_delete": "永久删除",
"hard_delete_confirm": "确定永久删除？此操作不可撤销。",
"restore_confirm": "确定恢复此倒数日？",
"mark_favorite": "收藏",
"unfavorite": "取消收藏"
```

- [ ] **Step 2: Add English i18n keys**

```json
"groups": {
  "title": "Groups",
  "all": "All",
  "completed": "Completed",
  "deleted": "Deleted",
  "favorites": "Favorites",
  "holidays": "Holidays",
  "birthdays": "Birthdays",
  "anniversaries": "Anniversaries",
  "statistics": "Statistics",
  "new_group": "New Group",
  "edit_group": "Edit Group",
  "dissolve": "Dissolve Group",
  "dissolve_confirm": "Dissolve this group? Countdowns will become ungrouped.",
  "delete_confirm": "Delete this group?",
  "preset_cannot_modify": "Preset groups cannot be modified",
  "preset_cannot_delete": "Preset groups cannot be deleted"
},
"restore": "Restore",
"hard_delete": "Delete Permanently",
"hard_delete_confirm": "Permanently delete? This cannot be undone.",
"restore_confirm": "Restore this countdown?",
"mark_favorite": "Favorite",
"unfavorite": "Unfavorite"
```

- [ ] **Step 3: Add Japanese i18n keys**

```json
"groups": {
  "title": "グループ",
  "all": "すべて",
  "completed": "完了",
  "deleted": "削除済み",
  "favorites": "お気に入り",
  "holidays": "祝日",
  "birthdays": "誕生日",
  "anniversaries": "記念日",
  "statistics": "統計",
  "new_group": "新しいグループ",
  "edit_group": "グループを編集",
  "dissolve": "グループを解散",
  "dissolve_confirm": "このグループを解散しますか？カウントダウンは未分類になります。",
  "delete_confirm": "このグループを削除しますか？",
  "preset_cannot_modify": "プリセットグループは変更できません",
  "preset_cannot_delete": "プリセットグループは削除できません"
},
"restore": "復元",
"hard_delete": "完全に削除",
"hard_delete_confirm": "完全に削除しますか？この操作は元に戻せません。",
"restore_confirm": "このカウントダウンを復元しますか？",
"mark_favorite": "お気に入り",
"unfavorite": "お気に入り解除"
```

---

## Task 9: CountdownSidebar Component

**Files:**
- Create: `src/components/countdown/CountdownSidebar.tsx`

- [ ] **Step 1: Create the sidebar component**

Follow the `MediaSidebar` pattern. The sidebar has two sections:
1. **Smart groups** (top): 全部, 收藏, 已完成, 已Deleted — hardcoded, not from DB
2. **Groups** (bottom): Built-in + user-created groups from DB, with create/edit/delete

```tsx
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  PlusIcon, PencilIcon, TrashIcon,
  ClockIcon, StarIcon, CheckCircleIcon, TrashIcon as DeletedIcon,
  CalendarIcon, CakeIcon, HeartIcon, ChartBarIcon,
} from '@heroicons/react/24/outline';
import { useCountdownGroups, useCreateCountdownGroup, useUpdateCountdownGroup, useDeleteCountdownGroup } from '@/queries/useCountdownQueries';
import type { CountdownGroupWithCount } from '@/types/countdown';
import GroupFormPopup from '@/components/ui/GroupFormPopup';

type SmartGroupId = 'all' | 'favorites' | 'completed' | 'deleted';

const SMART_GROUPS: { id: SmartGroupId | 'divider'; icon?: React.ComponentType<{ className?: string }>; labelKey?: string }[] = [
  { id: 'all', icon: ClockIcon, labelKey: 'countdowns.groups.all' },
  { id: 'favorites', icon: StarIcon, labelKey: 'countdowns.groups.favorites' },
  { id: 'divider' },
  { id: 'completed', icon: CheckCircleIcon, labelKey: 'countdowns.groups.completed' },
  { id: 'deleted', icon: DeletedIcon, labelKey: 'countdowns.groups.deleted' },
];

interface CountdownSidebarProps {
  selectedSmartGroup: SmartGroupId | null;
  selectedGroupId: string | null;
  onSelectSmartGroup: (groupId: SmartGroupId) => void;
  onSelectGroup: (groupId: string) => void;
  width: number;
  counts: {
    all: number;
    favorites: number;
    completed: number;
    deleted: number;
  };
}

export default function CountdownSidebar({
  selectedSmartGroup,
  selectedGroupId,
  onSelectSmartGroup,
  onSelectGroup,
  width,
  counts,
}: CountdownSidebarProps) {
  const { t } = useTranslation('common');
  const { data: groups = [] } = useCountdownGroups();
  const createGroup = useCreateCountdownGroup();
  const updateGroup = useUpdateCountdownGroup();
  const deleteGroup = useDeleteCountdownGroup();

  const [groupsExpanded, setGroupsExpanded] = useState(true);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState<CountdownGroupWithCount | null>(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupColor, setNewGroupColor] = useState('#8B5CF6');
  const [newGroupIcon, setNewGroupIcon] = useState('📅');
  const [groupFormTriggerRect, setGroupFormTriggerRect] = useState<DOMRect | null>(null);

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    await createGroup.mutateAsync({ name: newGroupName, color: newGroupColor, icon: newGroupIcon });
    setNewGroupName('');
    setShowGroupForm(false);
  };

  const handleUpdateGroup = async () => {
    if (!editingGroup || !newGroupName.trim()) return;
    await updateGroup.mutateAsync({ id: editingGroup.id, name: newGroupName, color: newGroupColor, icon: newGroupIcon });
    setEditingGroup(null);
    setNewGroupName('');
    setShowGroupForm(false);
  };

  const handleDeleteGroup = async (id: string) => {
    if (window.confirm(t('countdowns.groups.delete_confirm'))) {
      await deleteGroup.mutateAsync(id);
    }
  };

  const startEditGroup = (e: React.MouseEvent, group: CountdownGroupWithCount) => {
    setEditingGroup(group);
    setNewGroupName(group.name);
    setNewGroupColor(group.color || '#8B5CF6');
    setNewGroupIcon(group.icon || '📅');
    setGroupFormTriggerRect((e.currentTarget as HTMLElement).getBoundingClientRect());
    setShowGroupForm(true);
  };

  const getCountForSmartGroup = (id: SmartGroupId) => {
    if (id === 'all') return counts.all;
    if (id === 'favorites') return counts.favorites;
    if (id === 'completed') return counts.completed;
    if (id === 'deleted') return counts.deleted;
    return 0;
  };

  return (
    <div className="flex flex-col h-full border-r border-gray-200 dark:border-gray-700" style={{ width }}>
      {/* Smart Groups */}
      <div className="p-3 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
          {t('countdowns.groups.title')}
        </h3>
        <div className="space-y-1">
          {SMART_GROUPS.map((group) => {
            if (group.id === 'divider') {
              return <div key="divider" className="my-1 border-t border-gray-200 dark:border-gray-700" />;
            }
            const Icon = group.icon!;
            const isSelected = selectedSmartGroup === group.id;
            const count = getCountForSmartGroup(group.id as SmartGroupId);
            return (
              <button
                key={group.id}
                onClick={() => onSelectSmartGroup(group.id as SmartGroupId)}
                className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md text-sm transition-colors ${
                  isSelected
                    ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4" />
                  <span>{t(group.labelKey!)}</span>
                </div>
                {count > 0 && <span className="text-xs text-gray-400">{count}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Groups (built-in + user) */}
      <div className="flex-1 overflow-auto p-3">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => setGroupsExpanded(!groupsExpanded)}
            className="flex items-center gap-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider"
          >
            <span>{t('countdowns.groups.title')}</span>
            <span>{groupsExpanded ? '▼' : '▶'}</span>
          </button>
          <button
            onClick={(e) => {
              setEditingGroup(null);
              setNewGroupName('');
              setNewGroupColor('#8B5CF6');
              setNewGroupIcon('📅');
              setGroupFormTriggerRect((e.currentTarget as HTMLElement).getBoundingClientRect());
              setShowGroupForm(true);
            }}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
            title={t('countdowns.groups.new_group')}
          >
            <PlusIcon className="w-4 h-4" />
          </button>
        </div>

        {groupsExpanded && (
          <div className="space-y-1">
            {groups.map((group) => (
              <div
                key={group.id}
                className={`group flex items-center justify-between px-2 py-1.5 rounded-md text-sm cursor-pointer transition-colors ${
                  selectedGroupId === group.id
                    ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
                onClick={() => onSelectGroup(group.id)}
              >
                <div className="flex items-center gap-2">
                  <span>{group.icon || '📅'}</span>
                  <span>{group.name}</span>
                  {group.usageCount > 0 && (
                    <span className="text-xs text-gray-400 dark:text-gray-500">({group.usageCount})</span>
                  )}
                </div>
                {!group.isPreset && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                    <button
                      onClick={(e) => { e.stopPropagation(); startEditGroup(e, group); }}
                      className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                      title={t('countdowns.groups.edit_group')}
                    >
                      <PencilIcon className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteGroup(group.id); }}
                      className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                      title={t('common.delete')}
                    >
                      <TrashIcon className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <GroupFormPopup
          isOpen={showGroupForm}
          onClose={() => { setShowGroupForm(false); setEditingGroup(null); }}
          onSubmit={editingGroup ? handleUpdateGroup : handleCreateGroup}
          triggerRect={groupFormTriggerRect}
          name={newGroupName}
          onNameChange={setNewGroupName}
          icon={newGroupIcon}
          onIconChange={setNewGroupIcon}
          color={newGroupColor}
          onColorChange={setNewGroupColor}
          namePlaceholder={t('countdowns.groups.new_group')}
          isEditing={!!editingGroup}
        />
      </div>
    </div>
  );
}
```

---

## Task 10: Integrate Sidebar into CountdownsPage

**Files:**
- Modify: `src/pages/CountdownsPage.tsx`

- [ ] **Step 1: Add imports and sidebar state**

Add imports at the top:

```typescript
import CountdownSidebar from '@/components/countdown/CountdownSidebar';
import { ResizeHandle } from '@/components/ResizeHandle';
import { useCountdownGroups, useSoftDeleteCountdown, useRestoreCountdown, useHardDeleteCountdown, useDeletedCountdowns } from '@/queries/useCountdownQueries';
import { useAppStore } from '@/stores/useAppStore';
```

- [ ] **Step 2: Update main page component with sidebar**

In the `CountdownsPage` component, add:

```typescript
const {
  selectedCountdownGroupId,
  setSelectedCountdownGroupId,
  countdownGroupsPanelWidth,
  setCountdownGroupsPanelWidth,
} = useAppStore();

const [selectedSmartGroup, setSelectedSmartGroup] = useState<'all' | 'favorites' | 'completed' | 'deleted'>('all');
const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

const { data: groups = [] } = useCountdownGroups();
const { data: deletedCountdowns = [] } = useDeletedCountdowns();
const softDelete = useSoftDeleteCountdown();
const restore = useRestoreCountdown();
const hardDelete = useHardDeleteCountdown();
```

- [ ] **Step 3: Compute smart group counts and filtered list**

```typescript
const smartGroupCounts = useMemo(() => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return {
    all: countdowns.length,
    favorites: countdowns.filter(c => c.isFavorite).length,
    completed: countdowns.filter(c => {
      if (c.eventType === 'countup') return false;
      const [y, m, d] = c.targetDate.split('-').map(Number);
      return new Date(y, m - 1, d) < now;
    }).length,
    deleted: deletedCountdowns.length,
  };
}, [countdowns, deletedCountdowns]);

const filteredCountdowns = useMemo(() => {
  if (selectedSmartGroup === 'deleted') return deletedCountdowns;
  if (selectedGroupId) return countdowns.filter(c => c.groupId === selectedGroupId);

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  switch (selectedSmartGroup) {
    case 'favorites':
      return countdowns.filter(c => c.isFavorite);
    case 'completed':
      return countdowns.filter(c => {
        if (c.eventType === 'countup') return false;
        const [y, m, d] = c.targetDate.split('-').map(Number);
        return new Date(y, m - 1, d) < now;
      });
    default:
      return countdowns;
  }
}, [countdowns, deletedCountdowns, selectedSmartGroup, selectedGroupId]);
```

- [ ] **Step 4: Update JSX layout to include sidebar**

Wrap the page content in a flex layout with the sidebar:

```tsx
return (
  <div className="flex-1 flex overflow-hidden" style={{ backgroundColor: 'var(--theme-bg-2)' }}>
    {/* Sidebar */}
    <CountdownSidebar
      selectedSmartGroup={selectedSmartGroup}
      selectedGroupId={selectedGroupId}
      onSelectSmartGroup={(id) => { setSelectedSmartGroup(id); setSelectedGroupId(null); }}
      onSelectGroup={(id) => { setSelectedGroupId(id); setSelectedSmartGroup('all'); }}
      width={countdownGroupsPanelWidth}
      counts={smartGroupCounts}
    />
    <ResizeHandle onResize={(delta) => setCountdownGroupsPanelWidth((w) => Math.max(160, Math.min(400, w + delta))} />

    {/* Main content */}
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* existing page header + content, using filteredCountdowns instead of countdowns */}
    </div>
  </div>
);
```

- [ ] **Step 5: Update delete to use soft-delete**

Change the `handleDelete` function to use `softDelete.mutate` instead of `deleteCountdown.mutate`.

- [ ] **Step 6: Add favorite toggle to CountdownCard**

Add a star button to each `CountdownCard` that toggles `isFavorite`:

```tsx
<button
  onClick={(e) => { e.stopPropagation(); onToggleFavorite?.(); }}
  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
  title={countdown.isFavorite ? t('countdowns.unfavorite') : t('countdowns.mark_favorite')}
>
  <StarIcon className={`w-4 h-4 ${countdown.isFavorite ? 'text-yellow-400 fill-yellow-400' : 'text-gray-400'}`} />
</button>
```

- [ ] **Step 7: Add restore/hard-delete UI for deleted view**

When `selectedSmartGroup === 'deleted'`, show countdown cards with "Restore" and "Permanently Delete" buttons instead of the usual edit/delete.

---

## Task 11: Verify & Test

- [ ] **Step 1: Build Rust backend**

Run: `cd src-tauri && cargo build`
Expected: Build succeeds.

- [ ] **Step 2: Run dev mode**

Run: `npm run tauri dev`
Expected: App launches, countdown page shows sidebar with smart groups and preset groups.

- [ ] **Step 3: Test preset groups**

- Verify 节日, 生日, 纪念日, 统计 appear in sidebar
- Verify they cannot be edited or deleted (no edit/delete buttons shown)

- [ ] **Step 4: Test user groups**

- Create a new group with emoji, name, color
- Edit the group
- Delete the group (verify countdowns become ungrouped)

- [ ] **Step 5: Test smart groups**

- Create a countdown, mark as favorite → appears in 收藏
- Create a countdown with past date → appears in 已完成
- Soft-delete a countdown → appears in 已删除
- Restore from 已删除 → back in 全部

- [ ] **Step 6: Test sidebar resize**

- Drag the resize handle to verify panel width changes

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(countdowns): add smart groups sidebar with preset and user groups"
```

---

## Design Decisions Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Smart groups storage | Client-side filter | No DB overhead; matches habit "all/week/archived/deleted" pattern |
| Built-in groups storage | DB with `is_preset=1` | Matches `media_groups` pattern; allows consistent group assignment |
| Soft delete vs hard delete | `deleted_at` column | Allows restore; matches tasks/notes pattern |
| Favorite | `is_favorite` column | Simple boolean; no separate favorites table needed |
| Completed | Derived from `target_date < today` | No extra column; countdowns are naturally "completed" when date passes |
| Sidebar component | Separate `CountdownSidebar.tsx` | Follows `MediaSidebar` pattern; reusable, focused |
| Group form | Reuse `GroupFormPopup` | Existing component with emoji picker + color picker |
| Preset group protection | `is_preset` check in Rust commands | Server-side enforcement; UI also hides edit/delete for presets |
