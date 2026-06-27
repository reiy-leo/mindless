# Task Templates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a task template system that allows users to save task configurations as reusable templates and apply them when creating new tasks.

**Architecture:** New `task_templates` SQLite table with CRUD via Rust commands, React Query hooks, template management window (mirroring tag management), template picker overlay in task toolbar, and "save as template" in task context menu.

**Tech Stack:** Tauri 2 (Rust) + rusqlite, React 19 + TypeScript, TanStack React Query, Tailwind CSS, i18next

---

## File Structure

### New Files
| File | Purpose |
|------|---------|
| `src-tauri/src/commands/task_templates.rs` | Rust CRUD commands for task templates |
| `src/pages/dialogs/TemplateManagementDialogPage.tsx` | Template management window UI |
| `src/overlays/TemplatePickerOverlay.tsx` | Template picker overlay for task toolbar |

### Modified Files
| File | Changes |
|------|---------|
| `src-tauri/src/db/migrations.rs` | Add `task_templates` table |
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

---

## Task 1: Database Migration + Rust Model

**Files:**
- Modify: `src-tauri/src/db/migrations.rs`
- Modify: `src-tauri/src/db/models.rs`

- [ ] **Step 1: Add task_templates table to migrations.rs**

Open `src-tauri/src/db/migrations.rs` and find the `run_migrations()` function. Add the following SQL after the existing `CREATE TABLE IF NOT EXISTS` statements (around line 219):

```rust
conn.execute_batch(
    "CREATE TABLE IF NOT EXISTS task_templates (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        title TEXT,
        description TEXT,
        steps TEXT,
        tag_ids TEXT,
        use_count INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );"
).map_err(|e| e.to_string())?;
```

- [ ] **Step 2: Add TaskTemplate struct to models.rs**

Open `src-tauri/src/db/models.rs` and add the following struct after the existing `Tag` struct (around line 63):

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

- [ ] **Step 3: Verify Rust compiles**

Run: `cd src-tauri && cargo check`
Expected: No errors

---

## Task 2: Rust Commands

**Files:**
- Create: `src-tauri/src/commands/task_templates.rs`
- Modify: `src-tauri/src/commands/mod.rs`
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: Create task_templates.rs**

Create `src-tauri/src/commands/task_templates.rs`:

```rust
use tauri::AppHandle;
use uuid::Uuid;
use crate::db::models::TaskTemplate;

#[tauri::command]
pub async fn get_task_templates(app: AppHandle) -> Result<Vec<TaskTemplate>, String> {
    let conn = crate::db::connection::open_connection(&app)?;
    let mut stmt = conn
        .prepare("SELECT id, name, title, description, steps, tag_ids, use_count, created_at, updated_at FROM task_templates ORDER BY use_count DESC, created_at DESC")
        .map_err(|e| e.to_string())?;
    let templates = stmt
        .query_map([], |row| {
            Ok(TaskTemplate {
                id: row.get(0)?,
                name: row.get(1)?,
                title: row.get(2)?,
                description: row.get(3)?,
                steps: row.get(4)?,
                tag_ids: row.get(5)?,
                use_count: row.get(6)?,
                created_at: row.get(7)?,
                updated_at: row.get(8)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    Ok(templates)
}

#[tauri::command]
pub async fn create_task_template(
    app: AppHandle,
    name: String,
    title: Option<String>,
    description: Option<String>,
    steps: Option<String>,
    tag_ids: Option<String>,
) -> Result<TaskTemplate, String> {
    let conn = crate::db::connection::open_connection(&app)?;
    let id = Uuid::new_v4().to_string();
    let now = chrono::Local::now().format("%Y-%m-%dT%H:%M:%S").to_string();
    conn.execute(
        "INSERT INTO task_templates (id, name, title, description, steps, tag_ids, use_count, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, 0, ?7, ?8)",
        rusqlite::params![id, name, title, description, steps, tag_ids, now, now],
    )
    .map_err(|e| e.to_string())?;
    let template = TaskTemplate {
        id,
        name,
        title,
        description,
        steps,
        tag_ids,
        use_count: 0,
        created_at: now.clone(),
        updated_at: now,
    };
    Ok(template)
}

#[tauri::command]
pub async fn update_task_template(
    app: AppHandle,
    id: String,
    name: Option<String>,
    title: Option<String>,
    description: Option<String>,
    steps: Option<String>,
    tag_ids: Option<String>,
) -> Result<TaskTemplate, String> {
    let conn = crate::db::connection::open_connection(&app)?;
    let now = chrono::Local::now().format("%Y-%m-%dT%H:%M:%S").to_string();
    
    let mut updates = vec!["updated_at = ?1".to_string()];
    let mut params: Vec<Box<dyn rusqlite::types::ToSql>> = vec![Box::new(now.clone())];
    let mut param_idx = 2;

    if let Some(n) = name {
        updates.push(format!("name = ?{}", param_idx));
        params.push(Box::new(n));
        param_idx += 1;
    }
    if let Some(t) = title {
        updates.push(format!("title = ?{}", param_idx));
        params.push(Box::new(t));
        param_idx += 1;
    }
    if let Some(d) = description {
        updates.push(format!("description = ?{}", param_idx));
        params.push(Box::new(d));
        param_idx += 1;
    }
    if let Some(s) = steps {
        updates.push(format!("steps = ?{}", param_idx));
        params.push(Box::new(s));
        param_idx += 1;
    }
    if let Some(t) = tag_ids {
        updates.push(format!("tag_ids = ?{}", param_idx));
        params.push(Box::new(t));
        #[allow(unused)]
        { param_idx += 1; }
    }

    let sql = format!("UPDATE task_templates SET {} WHERE id = ?{}", updates.join(", "), param_idx);
    params.push(Box::new(id.clone()));
    
    let params_ref: Vec<&dyn rusqlite::types::ToSql> = params.iter().map(|p| p.as_ref()).collect();
    conn.execute(&sql, params_ref.as_slice()).map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare("SELECT id, name, title, description, steps, tag_ids, use_count, created_at, updated_at FROM task_templates WHERE id = ?1")
        .map_err(|e| e.to_string())?;
    let template = stmt
        .query_row(rusqlite::params![id], |row| {
            Ok(TaskTemplate {
                id: row.get(0)?,
                name: row.get(1)?,
                title: row.get(2)?,
                description: row.get(3)?,
                steps: row.get(4)?,
                tag_ids: row.get(5)?,
                use_count: row.get(6)?,
                created_at: row.get(7)?,
                updated_at: row.get(8)?,
            })
        })
        .map_err(|e| e.to_string())?;
    Ok(template)
}

#[tauri::command]
pub async fn delete_task_template(app: AppHandle, id: String) -> Result<(), String> {
    let conn = crate::db::connection::open_connection(&app)?;
    conn.execute("DELETE FROM task_templates WHERE id = ?1", rusqlite::params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn increment_template_use_count(app: AppHandle, id: String) -> Result<(), String> {
    let conn = crate::db::connection::open_connection(&app)?;
    conn.execute(
        "UPDATE task_templates SET use_count = use_count + 1, updated_at = ?1 WHERE id = ?2",
        rusqlite::params![chrono::Local::now().format("%Y-%m-%dT%H:%M:%S").to_string(), id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}
```

- [ ] **Step 2: Export module in mod.rs**

Open `src-tauri/src/commands/mod.rs` and add:

```rust
pub mod task_templates;
pub use task_templates::*;
```

- [ ] **Step 3: Register commands in lib.rs**

Open `src-tauri/src/lib.rs` and find the `invoke_handler(tauri::generate_handler![...])` call. Add these commands:

```rust
commands::get_task_templates,
commands::create_task_template,
commands::update_task_template,
commands::delete_task_template,
commands::increment_template_use_count,
```

- [ ] **Step 4: Verify Rust compiles**

Run: `cd src-tauri && cargo check`
Expected: No errors

---

## Task 3: Frontend Types + API + React Query Hooks

**Files:**
- Modify: `src/types/task.ts`
- Modify: `src/lib/api.ts`
- Modify: `src/queries/useTaskQueries.ts`

- [ ] **Step 1: Add TaskTemplate interface to task.ts**

Open `src/types/task.ts` and add at the end:

```typescript
export interface TaskTemplate {
  id: string
  name: string
  title: string | null
  description: string | null
  steps: string | null
  tagIds: string | null
  useCount: number
  createdAt: string
  updatedAt: string
}
```

- [ ] **Step 2: Add API functions to api.ts**

Open `src/lib/api.ts` and add:

```typescript
import type { TaskTemplate } from '@/types/task'

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

- [ ] **Step 3: Add React Query hooks to useTaskQueries.ts**

Open `src/queries/useTaskQueries.ts` and add:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '@/lib/api'
import type { TaskTemplate } from '@/types/task'

export function useTaskTemplates() {
  return useQuery({
    queryKey: ['taskTemplates'],
    queryFn: api.getTaskTemplates,
  })
}

export function useCreateTaskTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params: { name: string; title?: string; description?: string; steps?: string; tagIds?: string }) =>
      api.createTaskTemplate(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskTemplates'] })
    },
  })
}

export function useUpdateTaskTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...params }: { id: string; name?: string; title?: string; description?: string; steps?: string; tagIds?: string }) =>
      api.updateTaskTemplate(id, params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskTemplates'] })
    },
  })
}

export function useDeleteTaskTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.deleteTaskTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskTemplates'] })
    },
  })
}

export function useIncrementTemplateUseCount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.incrementTemplateUseCount(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskTemplates'] })
    },
  })
}
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

---

## Task 4: i18n Translations

**Files:**
- Modify: `src/i18n/locales/en/common.json`
- Modify: `src/i18n/locales/zh/common.json`
- Modify: `src/i18n/locales/ja/common.json`

- [ ] **Step 1: Add English translations**

Open `src/i18n/locales/en/common.json` and add to the appropriate sections:

```json
{
  "navigation": {
    "templates": "Templates"
  },
  "menu": {
    "manage_templates": "Manage \"Task Templates\""
  },
  "tasks": {
    "save_as_template": "Save as Template",
    "template_applied": "Template applied"
  },
  "template_mgmt": {
    "title": "Task Template Management",
    "search_placeholder": "Search templates...",
    "no_templates": "No templates yet",
    "create_template": "Create Template",
    "template_name": "Template Name",
    "use_count": "Use Count",
    "created_at": "Created",
    "updated_at": "Modified",
    "delete_confirm": "Delete template \"{{name}}\"?",
    "name_placeholder": "Enter template name",
    "save_as_template_title": "Save as Template",
    "save_as_template_name_label": "Template Name"
  }
}
```

- [ ] **Step 2: Add Chinese translations**

Open `src/i18n/locales/zh/common.json` and add:

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

- [ ] **Step 3: Add Japanese translations**

Open `src/i18n/locales/ja/common.json` and add:

```json
{
  "navigation": {
    "templates": "テンプレート"
  },
  "menu": {
    "manage_templates": "タスクテンプレートの管理"
  },
  "tasks": {
    "save_as_template": "テンプレートとして保存",
    "template_applied": "テンプレートを適用しました"
  },
  "template_mgmt": {
    "title": "タスクテンプレート管理",
    "search_placeholder": "テンプレートを検索...",
    "no_templates": "テンプレートがありません",
    "create_template": "テンプレートを作成",
    "template_name": "テンプレート名",
    "use_count": "使用回数",
    "created_at": "作成日",
    "updated_at": "更新日",
    "delete_confirm": "テンプレート「{{name}}」を削除しますか？",
    "name_placeholder": "テンプレート名を入力",
    "save_as_template_title": "テンプレートとして保存",
    "save_as_template_name_label": "テンプレート名"
  }
}
```

---

## Task 5: Template Management Window

**Files:**
- Create: `src/pages/dialogs/TemplateManagementDialogPage.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create TemplateManagementDialogPage.tsx**

Create `src/pages/dialogs/TemplateManagementDialogPage.tsx`:

```tsx
import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { PlusIcon, TrashIcon, XMarkIcon, CheckIcon, DocumentDuplicateIcon } from '@heroicons/react/24/outline'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { useTaskTemplates, useCreateTaskTemplate, useUpdateTaskTemplate, useDeleteTaskTemplate } from '@/queries/useTaskQueries'
import type { TaskTemplate } from '@/types/task'
import OverlayWebviewWindow from '@/components/OverlayWebviewWindow'

export default function TemplateManagementDialogPage() {
  const { t } = useTranslation('common')
  const { data: templates = [], isLoading } = useTaskTemplates()
  const createTemplate = useCreateTaskTemplate()
  const updateTemplate = useUpdateTaskTemplate()
  const deleteTemplate = useDeleteTaskTemplate()

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const editInputRef = useRef<HTMLInputElement>(null)

  const filteredTemplates = useMemo(() => {
    if (!searchQuery) return templates
    const q = searchQuery.toLowerCase()
    return templates.filter((tmpl) => tmpl.name.toLowerCase().includes(q))
  }, [templates, searchQuery])

  const selectedTemplate = useMemo(() => {
    return templates.find((tmpl) => tmpl.id === selectedTemplateId) || null
  }, [templates, selectedTemplateId])

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus()
      editInputRef.current.select()
    }
  }, [editingId])

  const handleCreate = useCallback(() => {
    const name = t('template_mgmt.create_template')
    createTemplate.mutate({ name }, {
      onSuccess: (newTemplate) => {
        setSelectedTemplateId(newTemplate.id)
        setEditingId(newTemplate.id)
        setEditingName(newTemplate.name)
      },
    })
  }, [createTemplate, t])

  const handleDelete = useCallback((id: string) => {
    const template = templates.find((tmpl) => tmpl.id === id)
    if (template && window.confirm(t('template_mgmt.delete_confirm', { name: template.name }))) {
      deleteTemplate.mutate(id, {
        onSuccess: () => {
          if (selectedTemplateId === id) {
            setSelectedTemplateId(null)
          }
        },
      })
    }
  }, [templates, deleteTemplate, selectedTemplateId, t])

  const handleStartEdit = useCallback((id: string, name: string) => {
    setEditingId(id)
    setEditingName(name)
  }, [])

  const handleSaveEdit = useCallback(() => {
    if (editingId && editingName.trim()) {
      updateTemplate.mutate({ id: editingId, name: editingName.trim() })
    }
    setEditingId(null)
    setEditingName('')
  }, [editingId, editingName, updateTemplate])

  const handleCancelEdit = useCallback(() => {
    setEditingId(null)
    setEditingName('')
  }, [])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit()
    } else if (e.key === 'Escape') {
      handleCancelEdit()
    }
  }, [handleSaveEdit, handleCancelEdit])

  const formatDate = useCallback((dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString()
    } catch {
      return dateStr
    }
  }, [])

  if (isLoading) {
    return (
      <OverlayWebviewWindow closable={false}>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-sm text-gray-500 dark:text-gray-400">{t('common.loading')}</div>
        </div>
      </OverlayWebviewWindow>
    )
  }

  return (
    <OverlayWebviewWindow closable={false}>
      <div className="flex h-full">
        {/* Left panel: Template list */}
        <div className="w-88 flex flex-col border-r border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div data-tauri-drag-region className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center gap-1.5 h-8" aria-label="window-controls">
                <button
                  onClick={() => getCurrentWindow().close()}
                  className="w-3 h-3 rounded-full bg-[#898989] hover:bg-[#FF3B30] transition-colors group relative"
                  title="Close"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-2.5 h-2.5 m-auto opacity-0 group-hover:opacity-100">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <input
                type="text"
                placeholder={t('template_mgmt.search_placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 px-1.5 py-0.5 text-xs border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleCreate}
                className="p-0.5 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors flex-shrink-0"
              >
                <PlusIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-1.5">
            {filteredTemplates.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400 px-3">
                <DocumentDuplicateIcon className="w-8 h-8 mb-2 text-gray-300 dark:text-gray-600" />
                <p className="text-sm text-center">
                  {searchQuery ? t('template_mgmt.no_templates') : t('template_mgmt.no_templates')}
                </p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {filteredTemplates.map((template) => (
                  <div
                    key={template.id}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${
                      selectedTemplateId === template.id
                        ? 'bg-blue-100 dark:bg-blue-900/30'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                    onClick={() => setSelectedTemplateId(template.id)}
                  >
                    <div className="flex-1 min-w-0">
                      {editingId === template.id ? (
                        <input
                          ref={editInputRef}
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={handleKeyDown}
                          onBlur={handleSaveEdit}
                          className="w-full px-1 py-0.5 text-sm border border-blue-500 rounded focus:outline-none dark:bg-gray-700 dark:text-gray-100"
                        />
                      ) : (
                        <div
                          className="text-sm text-gray-900 dark:text-gray-100 truncate"
                          onDoubleClick={() => handleStartEdit(template.id, template.name)}
                        >
                          {template.name}
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {template.useCount} {t('template_mgmt.use_count').toLowerCase()}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(template.id)
                      }}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <TrashIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right panel: Template details */}
        <div className="flex-1 bg-gray-50 dark:bg-gray-900 flex flex-col">
          {selectedTemplate ? (
            <div className="flex-1 overflow-auto p-4">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('template_mgmt.template_name')}
                  </h3>
                  <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {selectedTemplate.name}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      {t('template_mgmt.created_at')}
                    </h4>
                    <div className="text-sm text-gray-700 dark:text-gray-300">
                      {formatDate(selectedTemplate.createdAt)}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      {t('template_mgmt.updated_at')}
                    </h4>
                    <div className="text-sm text-gray-700 dark:text-gray-300">
                      {formatDate(selectedTemplate.updatedAt)}
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    {t('template_mgmt.use_count')}
                  </h4>
                  <div className="text-sm text-gray-700 dark:text-gray-300">
                    {selectedTemplate.useCount}
                  </div>
                </div>

                {selectedTemplate.title && (
                  <div>
                    <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      {t('tasks.title')}
                    </h4>
                    <div className="text-sm text-gray-700 dark:text-gray-300">
                      {selectedTemplate.title}
                    </div>
                  </div>
                )}

                {selectedTemplate.description && (
                  <div>
                    <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      {t('tasks.description')}
                    </h4>
                    <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {selectedTemplate.description}
                    </div>
                  </div>
                )}

                {selectedTemplate.steps && (
                  <div>
                    <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      {t('tasks.steps')}
                    </h4>
                    <div className="text-sm text-gray-700 dark:text-gray-300">
                      {JSON.parse(selectedTemplate.steps).length} {t('tasks.steps').toLowerCase()}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
              <div className="text-center">
                <DocumentDuplicateIcon className="w-12 h-12 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                <p className="text-sm">{t('template_mgmt.no_templates')}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </OverlayWebviewWindow>
  )
}
```

- [ ] **Step 2: Add route in App.tsx**

Open `src/App.tsx` and find the dialog routes section (around line 477). Add:

```tsx
<Route path="/dialog/task-template-management" element={<TemplateManagementDialogPage />} />
```

Add the import at the top:

```tsx
import TemplateManagementDialogPage from '@/pages/dialogs/TemplateManagementDialogPage'
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

---

## Task 6: Template Picker Overlay

**Files:**
- Create: `src/overlays/TemplatePickerOverlay.tsx`

- [ ] **Step 1: Create TemplatePickerOverlay.tsx**

Create `src/overlays/TemplatePickerOverlay.tsx`:

```tsx
import { useState, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { DocumentDuplicateIcon } from '@heroicons/react/24/outline'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { useTaskTemplates } from '@/queries/useTaskQueries'
import type { TaskTemplate } from '@/types/task'

interface TemplatePickerOverlayProps {
  onSelect: (template: TaskTemplate) => void
  onClose: () => void
}

export default function TemplatePickerOverlay({ onSelect, onClose }: TemplatePickerOverlayProps) {
  const { t } = useTranslation('common')
  const { data: templates = [], isLoading } = useTaskTemplates()
  const [searchQuery, setSearchQuery] = useState('')

  const filteredTemplates = useMemo(() => {
    if (!searchQuery) return templates
    const q = searchQuery.toLowerCase()
    return templates.filter((tmpl) => tmpl.name.toLowerCase().includes(q))
  }, [templates, searchQuery])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4">
          <div className="text-sm text-gray-500 dark:text-gray-400">{t('common.loading')}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 w-80 max-h-96 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
          <input
            type="text"
            placeholder={t('template_mgmt.search_placeholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
        </div>
        <div className="flex-1 overflow-auto p-1.5">
          {filteredTemplates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-gray-500 dark:text-gray-400">
              <DocumentDuplicateIcon className="w-8 h-8 mb-2 text-gray-300 dark:text-gray-600" />
              <p className="text-sm">{t('template_mgmt.no_templates')}</p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {filteredTemplates.map((template) => (
                <button
                  key={template.id}
                  className="w-full px-3 py-2 text-left rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  onClick={() => onSelect(template)}
                >
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {template.name}
                  </div>
                  {template.title && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                      {template.title}
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {template.useCount} {t('template_mgmt.use_count').toLowerCase()}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

---

## Task 7: Sidebar + Menu Bar + Keyboard Shortcuts

**Files:**
- Modify: `src/components/layout/Sidebar.tsx`
- Modify: `src-tauri/src/menu.rs`
- Modify: `src/hooks/useKeyboardShortcuts.ts`
- Modify: `src/hooks/useMenuEvents.ts`

- [ ] **Step 1: Add template button to Sidebar.tsx**

Open `src/components/layout/Sidebar.tsx` and add to imports:

```tsx
import { DocumentDuplicateIcon } from 'lucide-react'
```

Add to `navItems` array (after attachments, before settings):

```tsx
{ icon: DocumentDuplicateIcon, labelKey: 'navigation.templates', path: '/templates' },
```

Add ref:

```tsx
const templateWinRef = useRef<WebviewWindow | null>(null)
```

Add handler function (after `handleOpenAttachmentManagement`):

```tsx
const handleOpenTemplateManagement = async () => {
  if (templateWinRef.current) {
    try {
      await templateWinRef.current.setFocus()
      return
    } catch {
      templateWinRef.current = null
    }
  }

  try {
    const mainWindow = getCurrentWindow()
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
    templateWinRef.current = win
    win.once('tauri://error', () => { templateWinRef.current = null })
    win.once('tauri://destroyed', () => { templateWinRef.current = null })
  } catch (err) {
    console.error('Error creating task-template-management window:', err)
  }
}
```

Add rendering block (after attachments block, before settings block):

```tsx
if (item.path === '/templates') {
  return (
    <button
      type="button"
      className={buttonClass}
      key={item.path}
      onClick={handleOpenTemplateManagement}
      style={{
        color: isActive ? `hsl(from var(--theme-color) h s 80)` : `hsl(from var(--theme-color) h s 30)`,
        position: 'relative',
        zIndex: 2,
      }}
    >
      {showIcon && <Icon className="w-5 h-5" />}
      {showText && (
        <p
          className={sidebarMode === 'both' ? 'text-[10px]' : sidebarMode === 'text' ? 'text-lg' : 'text-xs'}
        >
          {t(item.labelKey)}
        </p>
      )}
    </button>
  )
}
```

- [ ] **Step 2: Add menu item in menu.rs**

Open `src-tauri/src/menu.rs` and find the Navigation submenu section (around line 107). Add after `manage_attachments`:

```rust
let manage_templates = MenuItemBuilder::with_id("nav:manage_templates", &l.manage_templates)
    .accelerator("CmdOrCtrl+T")
    .build(app)
    .map_err(|e| e.to_string())?;
```

Update `nav_submenu` to include the new item:

```rust
let nav_submenu = SubmenuBuilder::new(app, &l.nav_menu)
    .item(&nav_tasks)
    .item(&nav_habits)
    .item(&nav_countdowns)
    .item(&nav_notes)
    .separator()
    .item(&manage_tags)
    .item(&manage_attachments)
    .item(&manage_templates)
    .build()
    .map_err(|e| e.to_string())?;
```

Update `MenuLabels` struct to add `manage_templates` field:

```rust
pub manage_templates: String,
```

Update `update_menu_language` function to set the new field:

```rust
l.manage_templates = payload.manage_templates.clone();
```

- [ ] **Step 3: Update keyboard shortcuts in useKeyboardShortcuts.ts**

Open `src/hooks/useKeyboardShortcuts.ts`. Change the Cmd+T handler from navigating to tasks to opening template management:

```typescript
// Cmd+T: Template management dialog (changed from navigate to tasks)
if (e.key === 't') {
  e.preventDefault();
  openTemplateManagementDialog();
  return;
}

// Cmd+Shift+T: Tasks (changed from Cmd+T)
if (e.key === 'T' && e.shiftKey) {
  e.preventDefault();
  navigate('/tasks');
  return;
}
```

Add `openTemplateManagementDialog` function (similar to `openTagManagementDialog`):

```typescript
const openTemplateManagementDialog = async () => {
  try {
    const existing = await WebviewWindow.getByLabel('task-template-management');
    if (existing) {
      await existing.setFocus();
      return;
    }
  } catch {}

  const mainWindow = getCurrentWindow();
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
  });
  win.once('tauri://error', () => {});
};
```

- [ ] **Step 4: Add menu event handler in useMenuEvents.ts**

Open `src/hooks/useMenuEvents.ts` and find the `menu:navigate` event handler. Add case:

```typescript
case 'manage_templates':
  openDialog('task-template-management', '/dialog/task-template-management', 640, 500);
  break;
```

- [ ] **Step 5: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

---

## Task 8: Task Toolbar Template Button

**Files:**
- Modify: `src/pages/TasksPage.tsx`

- [ ] **Step 1: Add template button to inline task toolbar**

Open `src/pages/TasksPage.tsx` and find the inline task form toolbar (around line 3305). Add a new button after the Attachment button:

```tsx
{/* Template */}
<button
  className="p-1.5 rounded transition-colors hover:bg-theme-100 dark:hover:bg-theme-700 text-theme-400 dark:text-theme-500"
  onClick={() => setShowTemplatePicker(true)}
  title={t('tasks.template')}
  type="button"
>
  <DocumentDuplicateIcon className="w-4 h-4" />
</button>
```

Add state for template picker:

```typescript
const [showTemplatePicker, setShowTemplatePicker] = useState(false)
```

Add template picker rendering (before the closing `</div>` of the inline form):

```tsx
{showTemplatePicker && (
  <TemplatePickerOverlay
    onSelect={(template) => {
      handleApplyTemplate(template)
      setShowTemplatePicker(false)
    }}
    onClose={() => setShowTemplatePicker(false)}
  />
)}
```

Add handler to apply template:

```typescript
const handleApplyTemplate = useCallback((template: TaskTemplate) => {
  if (template.title) setNewTaskTitle(template.title)
  if (template.description) setNewTaskDescription(template.description)
  if (template.tagIds) setNewTaskTagIds(template.tagIds.split(',').filter(Boolean))
  // Steps will be applied after task creation
  incrementTemplateUseCount(template.id)
  toast.success(t('tasks.template_applied'))
}, [t])
```

Add imports at the top:

```tsx
import TemplatePickerOverlay from '@/overlays/TemplatePickerOverlay'
import { useIncrementTemplateUseCount } from '@/queries/useTaskQueries'
import type { TaskTemplate } from '@/types/task'
import { DocumentDuplicateIcon } from '@heroicons/react/24/outline'
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

---

## Task 9: Right-Click "Save as Template"

**Files:**
- Modify: `src/pages/TasksPage.tsx`

- [ ] **Step 1: Add "Save as Template" to context menu**

Open `src/pages/TasksPage.tsx` and find the right-click context menu (around line 3711). Add a new button after "Set List" and before the separator:

```tsx
<button
  className="w-full px-3 py-1.5 text-left text-sm hover:bg-theme-100 dark:hover:bg-theme-700 flex items-center gap-2"
  onClick={() => {
    handleSaveAsTemplate(task)
    setTaskContextMenu(null)
  }}
>
  <DocumentDuplicateIcon className="w-4 h-4 text-theme-400" />
  {t('tasks.save_as_template')}
</button>
```

Add handler function:

```typescript
const handleSaveAsTemplate = useCallback((task: Task) => {
  const name = window.prompt(t('template_mgmt.save_as_template_title'), task.title)
  if (name) {
    const steps = task.steps?.map((s) => s.description) || []
    createTaskTemplate({
      name,
      title: task.title,
      description: task.description || undefined,
      steps: steps.length > 0 ? JSON.stringify(steps) : undefined,
      tagIds: task.tagIds || undefined,
    })
    toast.success(t('tasks.template_applied'))
  }
}, [createTaskTemplate, t])
```

Add import:

```tsx
import { useCreateTaskTemplate } from '@/queries/useTaskQueries'
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

---

## Task 10: Final Verification

- [ ] **Step 1: Run full type check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 2: Run Rust check**

Run: `cd src-tauri && cargo check`
Expected: No errors

- [ ] **Step 3: Run build**

Run: `npm run build`
Expected: Successful build

- [ ] **Step 4: Manual testing checklist**

1. Open app and verify sidebar shows Templates button
2. Click Templates button → Template management window opens
3. Create new template → Template appears in list
4. Double-click template name → Edit mode, Enter saves
5. Delete template → Template removed
6. Open Tasks page → New task toolbar shows template button
7. Click template button → Template picker overlay appears
8. Select template → Form fields populated
9. Right-click task → "Save as Template" option appears
10. Click "Save as Template" → Name prompt, template created
11. Press Cmd+T → Template management opens
12. Press Cmd+Shift+T → Navigate to Tasks page
13. Menu bar → Navigation → "管理任务模板" works
