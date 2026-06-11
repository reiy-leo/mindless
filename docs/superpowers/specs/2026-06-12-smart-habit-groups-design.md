# Smart Habit Groups Design

## Overview

Add smart groups and custom groups to the Habits page, mirroring the Tasks page pattern with a left sidebar panel.

## Database Changes

### New table: habit_groups
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
```

### Alter habits table
```sql
ALTER TABLE habits ADD COLUMN group_id TEXT REFERENCES habit_groups(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_habits_group_id ON habits(group_id);
```

## Rust Changes

### New model (src-tauri/src/db/models.rs)
```rust
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

### New commands (src-tauri/src/commands/habits.rs)
- `get_habit_groups` — SELECT all from habit_groups ORDER BY sort_order
- `create_habit_group(name, icon, color)` — INSERT
- `update_habit_group(id, name, icon, color)` — UPDATE
- `delete_habit_group(id)` — DELETE (habits get group_id=NULL via FK)
- `get_archived_habits` — SELECT WHERE archived_at IS NOT NULL
- `unarchive_habit(id)` — SET archived_at = NULL
- `hard_delete_habit(id)` — DELETE FROM habits (cascades to habit_logs)
- `move_habit_to_group(habit_id, group_id)` — UPDATE habits SET group_id

### Register in lib.rs
Add all new commands to the invoke_handler.

## TypeScript Changes

### New type (src/types/habit.ts)
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

### New API functions (src/lib/api.ts)
- `getHabitGroups()`, `createHabitGroup()`, `updateHabitGroup()`, `deleteHabitGroup()`
- `getArchivedHabits()`, `unarchiveHabit()`, `hardDeleteHabit()`
- `moveHabitToGroup(habitId, groupId)`

### New queries (src/queries/useHabitQueries.ts)
- `useHabitGroups()`, `useCreateHabitGroup()`, `useUpdateHabitGroup()`, `useDeleteHabitGroup()`
- `useArchivedHabits()`, `useUnarchiveHabit()`, `useHardDeleteHabit()`
- `useMoveHabitToGroup()`

## Frontend Layout

```
┌──────────────────────────────────────────────────────┐
│ [Habits title]                         [Refresh] [+] │
├──────────┬───────────────────────────────────────────┤
│ Smart    │  < Mon Tue Wed Thu Fri Sat Sun >          │ (week bar when 周视图 selected)
│ ──────── │  初一 初二 初三 初四 初五 初六 初七        │
│ ⭐ 所有   │                                           │
│ 📅 周视图  │  ┌─────┐ ┌─────┐ ┌─────┐                 │
│ 📦 已归档  │  │Card1│ │Card2│ │Card3│                 │
│ 🗑 已删除  │  └─────┘ └─────┘ └─────┘                 │
│ ──────── │                                           │
│ Groups   │                                           │
│ 📁 健康   │                                           │
│ 📚 学习   │                                           │
│   [+]    │                                           │
└──────────┴───────────────────────────────────────────┘
```

### Smart Groups
| Group | Behavior |
|-------|----------|
| 所有 | All active habits (archived_at IS NULL), no week bar |
| 周视图 | Week navigation bar + habits, click day to see check-in status |
| 已归档 | Archived habits, cards show Unarchive + Hard Delete buttons |
| 已删除 | Empty state message (hard delete = gone) |

### Week View Details
- 7 buttons in one row, each: day-of-week + solar date + lunar date
- Left/right arrows shift ±7 days
- Selected day highlighted with accent color
- Uses `getLunarDayStr()` from `src/lib/lunar.ts`
- Clicking a day fetches habit_logs for that date to show check-in status

### Custom Groups
- Listed under "Groups" section in sidebar
- Inline creation: click + → type name → Enter
- Right-click or hover → edit/delete icons
- Drag habits to assign groups (future enhancement)
- Group shown as collapsible section header in main area

### Card Behavior by Context
| Context | Delete button | Extra buttons |
|---------|--------------|---------------|
| 所有 / Custom group | Archives (soft) | — |
| 周视图 | Archives | — |
| 已归档 | Hard deletes | Unarchive |

## Store Changes (useAppStore)

```typescript
// Add to AppState:
selectedHabitGroupId: string;  // 'all' | 'week' | 'archived' | 'deleted' | group UUID
setSelectedHabitGroupId: (id: string) => void;
habitGroupsPanelWidth: number;
setHabitGroupsPanelWidth: (w: number | ((prev: number) => number)) => void;
```

Persist `selectedHabitGroupId` and `habitGroupsPanelWidth` to localStorage.

## Implementation Order

1. Database migration (habit_groups table + group_id column)
2. Rust model + commands
3. TypeScript types + API + queries
4. useAppStore additions
5. HabitsPage refactor: sidebar + smart groups + week view
6. HabitGroup CRUD UI in sidebar
7. Card actions update (archive/unarchive/hard delete)
