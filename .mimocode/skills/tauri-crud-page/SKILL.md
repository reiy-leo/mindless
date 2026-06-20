---
name: tauri-crud-page
description: Add a new CRUD entity page to the Mindless Tauri+React app. Guides through the standard 10-step file creation sequence: migrations → models → commands → types → api → queries → store → sidebar → routes → i18n → page component.
---

# Add New Entity CRUD Page

Standard workflow for adding a full-stack entity page to the Mindless app (Tauri 2 + React + TypeScript + SQLite + Zustand + TanStack React Query).

## Before You Start

1. **Read existing patterns** — Pick the closest existing entity and read its files as reference:
   - Simple entity: `persons` (persons.rs, usePersonQueries.ts, PeoplePage.tsx)
   - Rich entity with relations: `media` (media.rs, useMediaQueries.ts, MediaPage.tsx)
   - Entity with editor: `notes` (notes.rs, useNoteQueries.ts, NotesPage.tsx)
2. **Confirm the data model** with the user before writing any code.
3. **Check existing tables** in `src-tauri/src/db/migrations.rs` and `drizzle/schema.ts`.

## Standard 10-Step Sequence

Execute in order. Each step must compile before proceeding.

### Step 1: Database Schema + Rust Models

**Files**: `src-tauri/src/db/migrations.rs`, `src-tauri/src/db/models.rs`

- Add migration function (e.g. `migrate_xxx_tables`) — use `CREATE TABLE IF NOT EXISTS`
- For new columns on existing tables: `ALTER TABLE ADD COLUMN` + `pragma_table_info` check
- Use `INSERT OR IGNORE` + `is_preset` for preset data
- All `SELECT` must use **explicit column names** (never `SELECT *`)
- Add Rust struct in `models.rs` with `row.get("col_name")` (named columns, not positional)

**Gotcha**: `CREATE INDEX` must come AFTER `ALTER TABLE ADD COLUMN` in a separate batch.

### Step 2: Rust Commands

**Files**: `src-tauri/src/commands/xxx.rs`, `src-tauri/src/commands/mod.rs`, `src-tauri/src/lib.rs`

- Standard commands: `get_all`, `get_by_id`, `create` (UUID + MAX(sort_order)+1), `update` (dynamic SQL builder), `delete`
- Dynamic update: use `params.len() + 1` for parameter indexing
- Register in `lib.rs` with `.invoke_handler(generate_handler![...])`
- Add `pub mod xxx;` in `commands/mod.rs`

**Gotcha**: Struct with camelCase fields (e.g. `sortOrder`) needs `#[serde(rename_all = "camelCase")]`.

### Step 3: TypeScript Types

**Files**: `src/types/xxx.ts`, `src/types/index.ts`

- Define interfaces matching Rust structs
- DB nullable → Rust `Option<T>` → TS `T | null` (all three must align)
- Export from `src/types/index.ts`

### Step 4: API Layer

**Files**: `src/lib/api.ts`

- Add `invoke<T>('command_name', { param1, param2 })` wrappers
- Parameters must be **camelCase** and **flat** (no nested objects)
- Each function: `export async function xxx(params): Promise<ReturnType>`

**Gotcha**: Do NOT use snake_case keys. Tauri v2 auto-converts camelCase→snake_case.

### Step 5: React Query Hooks

**Files**: `src/queries/useXxxQueries.ts`

- Standard hooks: `useXxxs()`, `useXxx(id)`, `useCreateXxx()`, `useUpdateXxx()`, `useDeleteXxx()`
- **Mutation invalidation MUST be in `mutate()` call's `onSuccess`**, NOT in `useMutation` options
- Use `queryClient.invalidateQueries({ queryKey: ['xxxs'] })` with correct prefix

**Gotcha**: React Query v5 deprecated `useMutation({ onSuccess })` — it may silently not fire.

### Step 6: Store Configuration (if needed)

**Files**: `src/stores/useAppStore.ts`

- Add panel width state: `xxxPanelWidth: number` with setter
- Include in `partialize` for localStorage persistence
- Pattern: `typeof width === 'function' ? width(state.xxx) : width`

### Step 7: Sidebar Navigation

**Files**: `src/components/layout/Sidebar.tsx`

- Add nav item to `navItems` array with icon + `navigation.xxx` i18n key
- For sidebar buttons opening overlay windows: use `WebviewWindow.getByLabel()` + on-demand creation

### Step 8: App Routing

**Files**: `src/App.tsx`

- Add `<Route path="/xxx" element={<XxxPage />} />`
- Import the page component
- For dialog windows: add route `/dialog/xxx` at top-level `<Routes>` (not inside AppLayout)

### Step 9: Internationalization

**Files**: `src/i18n/locales/zh/common.json`, `src/i18n/locales/en/common.json`, `src/i18n/locales/ja/common.json`

- Add keys under `navigation.xxx` for sidebar
- Add keys under `xxx.fields.*`, `xxx.actions.*`, `xxx.smart_groups.*`, `xxx.message.*`
- All three files must have the same key structure

### Step 10: Page Component

**Files**: `src/pages/XxxPage.tsx`

- Use `useTranslation()`, Tailwind CSS, query hooks from step 5
- Three-column layout: groups panel | list | detail (for complex entities)
- Context menu pattern: `useState<{ x, y, type, id } | null>`, `onContextMenu → e.preventDefault()`
- Smart groups: virtual filters (All/Archived/Completed), not DB rows
- Custom groups: DB rows with color/icon/sort_order, right-click menu (edit/pin/archive/delete)

**Gotcha**: Clickable `<div>` needs `role="button" tabIndex={0} onKeyDown` for accessibility.

## Smart Group Variant

Many pages (Media, Notes, People, Countdowns, Tasks) use a two-layer group design. If the entity needs groups, add these steps after the standard 10-step sequence.

### Step 11: Groups Table + Preset Groups

**Files**: `src-tauri/src/db/migrations.rs`, `src-tauri/src/db/models.rs`

- Create `xxx_groups` table: `id TEXT PK, name TEXT, icon TEXT, color TEXT, sort_order REAL, is_preset INTEGER DEFAULT 0, created_at TEXT, updated_at TEXT`
- Insert preset groups with `INSERT OR IGNORE` + `is_preset = 1`
- Rust struct: `XxxGroup` with `#[serde(rename_all = "camelCase")]`

### Step 12: Group Commands

**Files**: `src-tauri/src/commands/xxx.rs`

- `get_xxx_groups`, `create_xxx_group`, `update_xxx_group`, `delete_xxx_group`
- **Preset protection**: `update`/`delete` must check `is_preset` and reject if preset
- `get_xxx` accepts optional `group_id` or `smart_group` filter parameter
- Smart group filters: virtual WHERE clauses (e.g., `deleted_at IS NOT NULL` for "deleted", `favorited_at IS NOT NULL` for "favorites")

### Step 13: Sidebar Component

**Files**: `src/components/xxx/XxxSidebar.tsx`

- Smart groups section: virtual filters rendered as `IconButton` list (e.g., All, Favorites, Archived, Deleted)
- Custom groups section: expandable list with count badge + `GroupFormPopup`
- Group CRUD popup: name input + `Tw22ColorPickerButton` + emoji icon via `EmojiPickerButton`
- Right-click context menu on groups: edit, pin/unpin, archive, delete
- Preset groups: no right-click menu (or restricted menu without delete)

**Reference**: `src/components/media/MediaSidebar.tsx` (rich example), `src/components/notes/NotesSidebar.tsx`

### Step 14: Soft Delete (if needed)

- Add `deleted_at` column to entity table
- "Deleted" smart group: filter `deleted_at IS NOT NULL`
- Restore action: `SET deleted_at = NULL`
- Hard delete: only from "Deleted" group

## Post-Implementation Checklist

- [ ] `cargo check` — Rust compiles
- [ ] `npx tsc --noEmit` — TypeScript compiles
- [ ] `npm run build` — Vite builds
- [ ] `npm run tauri dev` — App launches, migrations run
- [ ] Test CRUD: create, read, update, delete
- [ ] Test smart groups / filtering
- [ ] Test i18n: switch between zh/en/ja

## Quick Reference: File Paths

```
src-tauri/src/db/migrations.rs    — DB schema
src-tauri/src/db/models.rs        — Rust structs
src-tauri/src/commands/xxx.rs     — Tauri commands
src-tauri/src/commands/mod.rs     — module export
src-tauri/src/lib.rs              — command registration
src/types/xxx.ts                  — TS interfaces
src/types/index.ts                — type exports
src/lib/api.ts                    — invoke wrappers
src/queries/useXxxQueries.ts      — React Query hooks
src/stores/useAppStore.ts         — Zustand store
src/components/layout/Sidebar.tsx — navigation
src/App.tsx                       — routing
src/i18n/locales/{zh,en,ja}/common.json — translations
src/pages/XxxPage.tsx             — page component
```
