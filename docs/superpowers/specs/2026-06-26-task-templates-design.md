# Task Templates Feature Design

## Overview

Add a task template system that allows users to save task configurations as reusable templates and apply them when creating new tasks.

## Requirements

1. **New task toolbar**: Add "模板" button that opens template picker, applying template to new task form
2. **Task context menu**: Add "保存为模板" to save current task as a template
3. **Template fields**: Save title, description, steps, tags (NOT dates or priority)
4. **Sidebar + Menu**: Add template button in sidebar bottom, `Cmd+T` shortcut, "管理任务模板" in Navigation menu
5. **Template management window**: Standalone window (like tag management) with list/edit, double-click rename, delete, columns: name/created/modified/use_count

## Data Model

### New Table: `task_templates`

```sql
CREATE TABLE IF NOT EXISTS task_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  title TEXT,
  description TEXT,
  steps TEXT,          -- JSON array of step descriptions
  tag_ids TEXT,        -- comma-separated tag IDs
  use_count INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
)
```

### TypeScript Interface

```typescript
export interface TaskTemplate {
  id: string
  name: string
  title: string | null
  description: string | null
  steps: string | null    // JSON: string[]
  tagIds: string | null   // comma-separated
  useCount: number
  createdAt: string
  updatedAt: string
}
```

### Rust Struct

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskTemplate {
    pub id: String,
    pub name: String,
    pub title: Option<String>,
    pub description: Option<String>,
    pub steps: Option<String>,
    pub tag_ids: Option<String>,
    pub use_count: i32,
    pub created_at: String,
    pub updated_at: String,
}
```

## Rust Commands

New file: `src-tauri/src/commands/task_templates.rs`

| Command | Description |
|---------|-------------|
| `get_task_templates` | List all templates ordered by use_count DESC, created_at DESC |
| `create_task_template` | Create new template with UUID, timestamps |
| `update_task_template` | Update template fields (name, title, description, steps, tag_ids) |
| `delete_task_template` | Delete template by ID |
| `increment_template_use_count` | Increment use_count by 1 |

Registration in `src-tauri/src/lib.rs`:
```rust
commands::get_task_templates,
commands::create_task_template,
commands::update_task_template,
commands::delete_task_template,
commands::increment_template_use_count,
```

## Frontend API Layer

New functions in `src/lib/api.ts`:

```typescript
export async function getTaskTemplates(): Promise<TaskTemplate[]> {
  return await invoke<TaskTemplate[]>('get_task_templates')
}

export async function createTaskTemplate(params: {
  name: string
  title?: string
  description?: string
  steps?: string
  tagIds?: string
}): Promise<TaskTemplate> {
  return await invoke<TaskTemplate>('create_task_template', params)
}

export async function updateTaskTemplate(id: string, params: {
  name?: string
  title?: string
  description?: string
  steps?: string
  tagIds?: string
}): Promise<TaskTemplate> {
  return await invoke<TaskTemplate>('update_task_template', { id, ...params })
}

export async function deleteTaskTemplate(id: string): Promise<void> {
  return await invoke<void>('delete_task_template', { id })
}

export async function incrementTemplateUseCount(id: string): Promise<void> {
  return await invoke<void>('increment_template_use_count', { id })
}
```

## React Query Hooks

Add to `src/queries/useTaskQueries.ts`:

```typescript
export function useTaskTemplates() { ... }
export function useCreateTaskTemplate() { ... }
export function useUpdateTaskTemplate() { ... }
export function useDeleteTaskTemplate() { ... }
export function useIncrementTemplateUseCount() { ... }
```

## UI Components

### 1. Template Management Window

**File**: `src/pages/dialogs/TemplateManagementDialogPage.tsx`

Pattern: Mirror `TagManagementDialogPage.tsx` (678 lines)

**Layout**:
```
OverlayWebviewWindow (closable={false})
  └── div.flex.h-full
      ├── Left panel (w-88): search + "+" button + template list
      └── Right panel (flex-1): TemplateEditPanel
```

**Template List (Left Panel)**:
- Search bar with placeholder "搜索模板..."
- "+" button to create new template
- List items showing:
  - Template name (truncated)
  - Use count badge
- Double-click name to enter edit mode
- Enter to save name, Escape to cancel
- Right-click context menu: Delete

**Edit Panel (Right Panel)**:
- Template name input
- Preview of template fields (title, description, steps count, tags)
- Save/Close buttons

**Window Config**:
```typescript
const win = new WebviewWindow('task-template-management', {
  alwaysOnTop: true,
  closable: false,
  decorations: true,
  height: 500,
  hiddenTitle: true,
  maximizable: false,
  minimizable: false,
  parent: mainWindow,
  resizable: false,
  title: '',
  titleBarStyle: 'overlay',
  url: '/dialog/task-template-management',
  width: 640,
})
```

**Route**: `/dialog/task-template-management` in `App.tsx`

### 2. Template Picker Overlay

**File**: `src/overlays/TemplatePickerOverlay.tsx` or integrate into existing overlay system

Pattern: Similar to `TagListPickerOverlay`

**Behavior**:
- Shows list of all templates with name and use count
- Click to select → emit result with template data
- Auto-close after selection

**Integration in TasksPage**:
- Add template button in inline task toolbar (after Attachment button)
- Icon: `DocumentDuplicateIcon` from `@heroicons/react/24/outline`
- On template select: fill `newTaskTitle`, `newTaskDescription`, `newTaskTagIds`, add steps
- Call `incrementTemplateUseCount(templateId)`

### 3. Save as Template Dialog

**Trigger**: Right-click menu on task → "保存为模板"

**Behavior**:
- Show a simple prompt/dialog asking for template name
- Default name: task title
- On confirm: create template with current task's title, description, steps, tag_ids
- Show success toast/notification

**Implementation**: Use `window.prompt()` or a custom small overlay

## Integration Points

### Sidebar (`src/components/layout/Sidebar.tsx`)

Add to `navItems` array:
```typescript
{ icon: DocumentDuplicateIcon, labelKey: 'navigation.templates', path: '/templates' }
```

Add `handleOpenTemplateManagement` function (same pattern as tag/attachment management).

Position: After Attachments, before Settings.

### Menu Bar (`src-tauri/src/menu.rs`)

Add to Navigation submenu:
```rust
let manage_templates = MenuItemBuilder::with_id("nav:manage_templates", &l.manage_templates)
    .accelerator("CmdOrCtrl+T")
    .build(app)
    .map_err(|e| e.to_string())?;
```

Update `nav_submenu`:
```rust
.item(&manage_tags)
.item(&manage_attachments)
.item(&manage_templates)
```

### Keyboard Shortcuts (`src/hooks/useKeyboardShortcuts.ts`)

**Conflict Resolution**:
- Change "Switch to Tasks" from `Cmd+T` to `Cmd+Shift+T`
- Add `Cmd+T` for template management dialog

```typescript
// Cmd+Shift+T: Tasks (changed from Cmd+T)
if (e.key === 'T' && e.shiftKey) {
  e.preventDefault();
  navigate('/tasks');
  return;
}

// Cmd+T: Template management dialog
if (e.key === 't') {
  e.preventDefault();
  openTemplateManagementDialog();
  return;
}
```

### Right-Click Menu (`src/pages/TasksPage.tsx`)

Add "保存为模板" option after "Set List" and before separator:

```typescript
<button
  className="w-full px-3 py-1.5 text-left text-sm hover:bg-theme-100 dark:hover:bg-theme-700 flex items-center gap-2"
  onClick={() => handleSaveAsTemplate(task)}
>
  <DocumentDuplicateIcon className="w-4 h-4 text-theme-400" />
  {t('tasks.save_as_template')}
</button>
```

### Menu Events (`src/hooks/useMenuEvents.ts`)

Add case:
```typescript
case 'manage_templates':
  openDialog('task-template-management', '/dialog/task-template-management', 640, 500);
  break;
```

## i18n Keys

Add to `src/i18n/locales/en/common.json` and `zh`:

```json
{
  "navigation": {
    "templates": "模板"
  },
  "menu": {
    "manage_templates": "管理\"任务模板\""
  },
  "tasks": {
    "save_as_template": "保存为模板",
    "template_applied": "模板已应用"
  },
  "template_mgmt": {
    "title": "任务模板管理",
    "search_placeholder": "搜索模板...",
    "no_templates": "暂无模板",
    "create_template": "创建模板",
    "template_name": "模板名称",
    "use_count": "使用次数",
    "created_at": "创建日期",
    "updated_at": "修改日期",
    "delete_confirm": "确定删除模板\"{{name}}\"吗？",
    "name_placeholder": "输入模板名称",
    "save_as_template_title": "保存为模板",
    "save_as_template_name_label": "模板名称"
  }
}
```

## File Changes Summary

### New Files
| File | Purpose |
|------|---------|
| `src-tauri/src/commands/task_templates.rs` | Rust CRUD commands |
| `src/pages/dialogs/TemplateManagementDialogPage.tsx` | Template management window |
| `src/overlays/TemplatePickerOverlay.tsx` | Template picker overlay (or integrate into existing) |

### Modified Files
| File | Changes |
|------|---------|
| `src-tauri/src/db/migrations.rs` | Add `task_templates` table creation |
| `src-tauri/src/db/models.rs` | Add `TaskTemplate` struct |
| `src-tauri/src/commands/mod.rs` | Export task_templates module |
| `src-tauri/src/lib.rs` | Register new commands |
| `src-tauri/src/menu.rs` | Add "管理任务模板" in Navigation submenu |
| `src/types/task.ts` | Add `TaskTemplate` interface |
| `src/lib/api.ts` | Add API wrapper functions |
| `src/queries/useTaskQueries.ts` | Add React Query hooks |
| `src/App.tsx` | Add route for template management dialog |
| `src/components/layout/Sidebar.tsx` | Add template button |
| `src/hooks/useKeyboardShortcuts.ts` | Change Cmd+T, add template shortcut |
| `src/hooks/useMenuEvents.ts` | Add menu event handler |
| `src/pages/TasksPage.tsx` | Add template button in toolbar, "保存为模板" in context menu |
| `src/i18n/locales/en/common.json` | Add English translations |
| `src/i18n/locales/zh/common.json` | Add Chinese translations |
| `src/i18n/locales/ja/common.json` | Add Japanese translations |

## Implementation Order

1. Database migration + Rust model + Rust commands
2. Frontend API layer + React Query hooks
3. Template management window (full CRUD)
4. Template picker overlay
5. Integration: sidebar, menu bar, keyboard shortcuts
6. Integration: task toolbar template button
7. Integration: right-click "保存为模板"
8. i18n translations
9. Testing & verification

## Verification

1. Create template via management window
2. Edit template name (double-click → Enter)
3. Delete template
4. Apply template from task toolbar
5. Save task as template via right-click
6. Verify Cmd+T opens template management
7. Verify Cmd+Shift+T navigates to tasks
8. Verify menu bar "管理任务模板" works
9. Verify use_count increments on template use
10. Verify template fields (title, description, steps, tags) are correctly applied
