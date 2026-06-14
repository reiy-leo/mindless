# Merge englishName/nickname into other_names — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `english_name` and `nickname` columns on `persons` with a multi-value `person_other_names` table, using the same CRUD pattern as `person_phones`.

**Architecture:** New `person_other_names` table with Tauri commands mirroring `person_phones`. Frontend uses `PhoneEmailListEditor` with `type="other_name"`. Data migration inserts existing english_name/nickname rows automatically.

**Tech Stack:** Rust (rusqlite + tauri), React + TypeScript, TanStack Query, Tailwind CSS

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `src-tauri/src/db/migrations.rs` | Modify | Add table + data migration |
| `src-tauri/src/db/models.rs` | Modify | Add `PersonOtherName` struct |
| `src-tauri/src/commands/persons.rs` | Modify | Add 4 CRUD commands |
| `src-tauri/src/lib.rs` | Modify | Register new commands |
| `src/types/person.ts` | Modify | Add `PersonOtherName` + `OtherNameEntry` types |
| `src/lib/api.ts` | Modify | Add 4 API functions |
| `src/queries/usePersonQueries.ts` | Modify | Add query + mutation hooks |
| `src/components/PhoneEmailListEditor.tsx` | Modify | Add `other_name` type support |
| `src/pages/PeoplePage.tsx` | Modify | Replace englishName/nickname UI with other_names |
| `src/i18n/locales/zh/common.json` | Modify | Update translations |
| `src/i18n/locales/en/common.json` | Modify | Update translations |
| `src/i18n/locales/ja/common.json` | Modify | Update translations |
| `drizzle/schema.ts` | Modify | Add `personOtherNames` table |

---

### Task 1: Database Migration & Model

**Files:**
- Modify: `src-tauri/src/db/migrations.rs:370-381`
- Modify: `src-tauri/src/db/models.rs:246-268`

- [ ] **Step 1: Add migration SQL for person_other_names table**

In `src-tauri/src/db/migrations.rs`, after the `ALTER TABLE persons ADD COLUMN deleted_at TEXT;` line (line 380), add:

```rust
// Create person_other_names table
let _ = conn.execute_batch("
    CREATE TABLE IF NOT EXISTS person_other_names (
        id TEXT PRIMARY KEY,
        person_id TEXT NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        label TEXT DEFAULT '别名',
        sort_order REAL NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_person_other_names_person_id ON person_other_names(person_id);
");

// Migrate existing english_name and nickname data
let _ = conn.execute_batch("
    INSERT INTO person_other_names (id, person_id, name, label, sort_order)
    SELECT hex(randomblob(16)), id, english_name, '英文名', 0
    FROM persons WHERE english_name IS NOT NULL AND english_name != '';
");
let _ = conn.execute_batch("
    INSERT INTO person_other_names (id, person_id, name, label, sort_order)
    SELECT hex(randomblob(16)), id, nickname, '昵称', 1
    FROM persons WHERE nickname IS NOT NULL AND nickname != '';
");
```

- [ ] **Step 2: Add PersonOtherName model**

In `src-tauri/src/db/models.rs`, after the `PersonEmail` struct (after line 268), add:

```rust
// Person other name model
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PersonOtherName {
    pub id: String,
    pub person_id: String,
    pub name: String,
    pub label: Option<String>,
    pub sort_order: f64,
}
```

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/db/migrations.rs src-tauri/src/db/models.rs
git commit -m "feat: add person_other_names table and model"
```

---

### Task 2: Backend CRUD Commands

**Files:**
- Modify: `src-tauri/src/commands/persons.rs:495-500`
- Modify: `src-tauri/src/lib.rs:108-112`

- [ ] **Step 1: Add row_to_person_other_name helper and 4 commands**

In `src-tauri/src/commands/persons.rs`, after the `delete_person_email` function (after line 499), add:

```rust
// ==================== Person Other Name Commands ====================

fn row_to_person_other_name(row: &rusqlite::Row) -> rusqlite::Result<PersonOtherName> {
    Ok(PersonOtherName {
        id: row.get("id")?,
        person_id: row.get("person_id")?,
        name: row.get("name")?,
        label: row.get("label")?,
        sort_order: row.get("sort_order")?,
    })
}

#[tauri::command]
pub async fn get_person_other_names(app: AppHandle, person_id: String) -> Result<Vec<PersonOtherName>, String> {
    let conn = get_db(&app)?;
    let mut stmt = conn.prepare("SELECT * FROM person_other_names WHERE person_id = ?1 ORDER BY sort_order ASC")
        .map_err(|e| format!("Failed to prepare: {}", e))?;
    let names = stmt.query_map([&person_id], row_to_person_other_name)
        .map_err(|e| format!("Failed to query: {}", e))?;
    let result: Result<Vec<_>, _> = names.collect();
    result.map_err(|e| format!("Failed to collect: {}", e))
}

#[tauri::command]
pub async fn create_person_other_name(
    app: AppHandle,
    person_id: String,
    name: String,
    label: Option<String>,
) -> Result<PersonOtherName, String> {
    let conn = get_db(&app)?;
    let id = Uuid::new_v4().to_string();
    let label = label.as_deref().unwrap_or("别名");

    let max_sort: f64 = conn.query_row(
        "SELECT COALESCE(MAX(sort_order), -1) + 1 FROM person_other_names WHERE person_id = ?1",
        [&person_id],
        |row| row.get(0),
    ).unwrap_or(0.0);

    conn.execute(
        "INSERT INTO person_other_names (id, person_id, name, label, sort_order) VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![&id, &person_id, &name, label, &max_sort],
    ).map_err(|e| format!("Failed to create other name: {}", e))?;

    let n = conn.query_row("SELECT * FROM person_other_names WHERE id = ?1", [&id], row_to_person_other_name)
        .map_err(|e| format!("Failed to fetch other name: {}", e))?;
    Ok(n)
}

#[tauri::command]
pub async fn update_person_other_name(
    app: AppHandle,
    id: String,
    name: Option<String>,
    label: Option<String>,
) -> Result<PersonOtherName, String> {
    let conn = get_db(&app)?;

    let mut sql = String::from("UPDATE person_other_names SET 1=1");
    let mut param_idx = 1;

    if name.is_some() { sql = sql.replace("1=1", &format!("name = ?{}", param_idx)); param_idx += 1; }
    if label.is_some() {
        if sql.contains("1=1") {
            sql = sql.replace("1=1", &format!("label = ?{}", param_idx));
        } else {
            sql.push_str(&format!(", label = ?{}", param_idx));
        }
        param_idx += 1;
    }

    if sql.contains("1=1") {
        let n = conn.query_row("SELECT * FROM person_other_names WHERE id = ?1", [&id], row_to_person_other_name)
            .map_err(|e| format!("Failed to fetch other name: {}", e))?;
        return Ok(n);
    }

    sql.push_str(&format!(" WHERE id = ?{}", param_idx));

    let mut params: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();
    if let Some(ref v) = name { params.push(Box::new(v.clone())); }
    if let Some(ref v) = label { params.push(Box::new(v.clone())); }
    params.push(Box::new(id.clone()));

    let param_refs: Vec<&dyn rusqlite::types::ToSql> = params.iter().map(|p| p.as_ref()).collect();
    conn.execute(&sql, param_refs.as_slice())
        .map_err(|e| format!("Failed to update other name: {}", e))?;

    let n = conn.query_row("SELECT * FROM person_other_names WHERE id = ?1", [&id], row_to_person_other_name)
        .map_err(|e| format!("Failed to fetch other name: {}", e))?;
    Ok(n)
}

#[tauri::command]
pub async fn delete_person_other_name(app: AppHandle, id: String) -> Result<(), String> {
    let conn = get_db(&app)?;
    conn.execute("DELETE FROM person_other_names WHERE id = ?1", [&id])
        .map_err(|e| format!("Failed to delete other name: {}", e))?;
    Ok(())
}
```

Also add the import for `PersonOtherName` at the top of the file (line 3):

```rust
use crate::db::models::{Person, PersonGroup, PersonPhone, PersonEmail, PersonOtherName};
```

- [ ] **Step 2: Register commands in lib.rs**

In `src-tauri/src/lib.rs`, after the `delete_person_email` line (line 112), add:

```rust
            commands::get_person_other_names,
            commands::create_person_other_name,
            commands::update_person_other_name,
            commands::delete_person_other_name,
```

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/commands/persons.rs src-tauri/src/lib.rs
git commit -m "feat: add person_other_names CRUD commands"
```

---

### Task 3: TypeScript Types & API

**Files:**
- Modify: `src/types/person.ts:48-62`
- Modify: `src/lib/api.ts:725-745`

- [ ] **Step 1: Add PersonOtherName and OtherNameEntry types**

In `src/types/person.ts`, after the `EmailEntry` interface (after line 62), add:

```typescript
export interface PersonOtherName {
  id: string;
  personId: string;
  name: string;
  label: string;
  sortOrder: number;
}

export interface OtherNameEntry {
  id: string;
  label: string;
  value: string;
  note: string;
}
```

- [ ] **Step 2: Add API functions**

In `src/lib/api.ts`, after the `createPersonEmails` function (after line 745), add:

```typescript
// Person Other Name APIs
export async function getPersonOtherNames(personId: string): Promise<PersonOtherName[]> {
  return await invoke<PersonOtherName[]>('get_person_other_names', { person_id: personId });
}

export async function createPersonOtherName(params: {
  personId: string;
  name: string;
  label?: string;
}): Promise<PersonOtherName> {
  return await invoke<PersonOtherName>('create_person_other_name', {
    person_id: params.personId,
    name: params.name,
    label: params.label,
  });
}

export async function updatePersonOtherName(id: string, params: {
  name?: string;
  label?: string;
}): Promise<PersonOtherName> {
  return await invoke<PersonOtherName>('update_person_other_name', { id, ...params });
}

export async function deletePersonOtherName(id: string): Promise<void> {
  return await invoke<void>('delete_person_other_name', { id });
}
```

Also add the import for `PersonOtherName` at the top of api.ts (in the types import).

- [ ] **Step 3: Commit**

```bash
git add src/types/person.ts src/lib/api.ts
git commit -m "feat: add PersonOtherName types and API functions"
```

---

### Task 4: React Query Hooks

**Files:**
- Modify: `src/queries/usePersonQueries.ts:131-145`

- [ ] **Step 1: Add query and mutation hooks**

In `src/queries/usePersonQueries.ts`, after the `useCreatePersonEmails` function (after line 145), add:

```typescript
// ==================== Other Name queries ====================

export function usePersonOtherNames(personId: string | undefined) {
  return useQuery({
    queryKey: ['personOtherNames', personId],
    queryFn: () => api.getPersonOtherNames(personId!),
    enabled: !!personId,
  });
}

// ==================== Other Name mutations ====================

export function useCreatePersonOtherName() {
  return useMutation({
    mutationFn: (params: { personId: string; name: string; label?: string }) =>
      api.createPersonOtherName(params),
  });
}

export function useUpdatePersonOtherName() {
  return useMutation({
    mutationFn: ({ id, ...params }: { id: string; name?: string; label?: string }) =>
      api.updatePersonOtherName(id, params),
  });
}

export function useDeletePersonOtherName() {
  return useMutation({
    mutationFn: (id: string) => api.deletePersonOtherName(id),
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/queries/usePersonQueries.ts
git commit -m "feat: add person_other_names query and mutation hooks"
```

---

### Task 5: PhoneEmailListEditor — Add other_name Type

**Files:**
- Modify: `src/components/PhoneEmailListEditor.tsx:5-11`

- [ ] **Step 1: Update EntryType and add other_name support**

In `src/components/PhoneEmailListEditor.tsx`, change the `EntryType` and update the component:

Change line 5 from:
```typescript
type EntryType = 'phone' | 'email';
```
to:
```typescript
type EntryType = 'phone' | 'email' | 'other_name';
```

Update the `placeholder` logic (line 24) from:
```typescript
const placeholder = type === 'phone' ? '输入手机号' : '输入邮箱地址';
```
to:
```typescript
const placeholder = type === 'phone' ? '输入手机号' : type === 'email' ? '输入邮箱地址' : '输入别名或昵称';
```

Update the `label` default in `handleAdd` (line 37) from:
```typescript
label: type === 'phone' ? '手机' : '邮箱',
```
to:
```typescript
label: type === 'phone' ? '手机' : type === 'email' ? '邮箱' : '别名',
```

Update the add button text (line 120) from:
```typescript
添加{type === 'phone' ? '手机号' : '邮箱'}
```
to:
```typescript
添加{type === 'phone' ? '手机号' : type === 'email' ? '邮箱' : '别名'}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/PhoneEmailListEditor.tsx
git commit -m "feat: add other_name type to PhoneEmailListEditor"
```

---

### Task 6: PeoplePage — Create Form

**Files:**
- Modify: `src/pages/PeoplePage.tsx:170-380`

- [ ] **Step 1: Update PersonCreateForm to use other_names**

In `src/pages/PeoplePage.tsx`, update the `PersonCreateForm` component:

1. Update the `onSave` type (lines 174-186) — replace `englishName` and `nickname` with `otherNames`:

```typescript
onSave: (data: {
    name: string;
    otherNames: { name: string; label: string }[];
    birthday: string;
    lunarBirthday: string;
    foodTaboos: string[];
    preferences: string[];
    remark: string;
    avatar: string;
    phones: { phone: string; label: string }[];
    emails: { email: string; label: string }[];
}) => void;
```

2. Replace the state variables (lines 191-192) — remove `englishName` and `nickname`, add `otherNames`:

```typescript
const [otherNames, setOtherNames] = useState<OtherNameEntry[]>([]);
```

3. Update `handleSave` (lines 204-218) — replace `englishName` and `nickname` with `otherNames`:

```typescript
const handleSave = () => {
    onSave({
        name: name || t("people.new_person"),
        otherNames: otherNames.map(n => ({ name: n.value, label: n.label })),
        birthday,
        lunarBirthday,
        foodTaboos,
        preferences,
        remark,
        avatar: avatarSeed,
        phones: phones.map(p => ({ phone: p.value, label: p.label })),
        emails: emails.map(e => ({ email: e.value, label: e.label })),
    });
};
```

4. Replace the englishName and nickname input fields (lines 263-285) with a single `PhoneEmailListEditor`:

```tsx
{/* Other Names */}
<div>
    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
        <div className="flex items-center gap-1">
            <UserIcon className="w-3.5 h-3.5" />
            {t("people.detail.other_names")}
        </div>
    </label>
    <PhoneEmailListEditor
        type="other_name"
        entries={otherNames}
        onChange={setOtherNames}
    />
</div>
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/PeoplePage.tsx
git commit -m "feat: replace englishName/nickname with otherNames in create form"
```

---

### Task 7: PeoplePage — Detail Panel

**Files:**
- Modify: `src/pages/PeoplePage.tsx` (detail section, ~lines 440-1230)

- [ ] **Step 1: Add local state and hooks for other_names**

In the detail panel section, after the existing state declarations (around line 444), add:

```typescript
const [localOtherNames, setLocalOtherNames] = useState<OtherNameEntry[]>([]);
```

Add the query and mutation hooks (around line 430, after the emails hooks):

```typescript
const { data: otherNamesData } = usePersonOtherNames(selectedPersonId || undefined);
const otherNames = otherNamesData ?? [];
const createPersonOtherName = useCreatePersonOtherName();
const deletePersonOtherName = useDeletePersonOtherName();
```

- [ ] **Step 2: Sync other_names in useEffect**

In the main sync `useEffect` (around line 453), add:

```typescript
setLocalOtherNames(otherNames.map(n => ({ id: n.id, label: n.label || '别名', value: n.name, note: '' })));
```

In the clear section (when `!selectedPersonId`), add:

```typescript
setLocalOtherNames([]);
```

Add a new useEffect to sync otherNames from query data (after the phones/emails sync effects):

```typescript
useEffect(() => {
    if (selectedPersonId && lastSyncedRef.current === selectedPersonId) {
        setLocalOtherNames(otherNames.map(n => ({ id: n.id, label: n.label || '别名', value: n.name, note: '' })));
    }
}, [otherNames, selectedPersonId]);
```

- [ ] **Step 3: Replace englishName/nickname UI in detail panel**

Replace the englishName and nickname input sections (around lines 1198-1230) with:

```tsx
{/* Other Names */}
<div>
    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
        <div className="flex items-center gap-1">
            <UserIcon className="w-3.5 h-3.5" />
            {t("people.detail.other_names")}
        </div>
    </label>
    <div className="group">
        <PhoneEmailListEditor
            type="other_name"
            entries={localOtherNames}
            onChange={(entries) => {
                const newEntries = entries as OtherNameEntry[];
                setLocalOtherNames(newEntries);

                const currentIds = otherNames.map(n => n.id);
                const newIds = newEntries.map(e => e.id);
                const deletedIds = currentIds.filter(id => !newIds.includes(id));

                deletedIds.forEach(id => {
                    deletePersonOtherName.mutate(id, {
                        onSuccess: () => {
                            queryClient.invalidateQueries({ queryKey: ["personOtherNames", selectedPerson.id] });
                        },
                    });
                });

                const addedEntries = newEntries.filter(e => !currentIds.includes(e.id));
                addedEntries.forEach(entry => {
                    createPersonOtherName.mutate({
                        personId: selectedPerson.id,
                        name: entry.value,
                        label: entry.label
                    }, {
                        onSuccess: () => {
                            queryClient.invalidateQueries({ queryKey: ["personOtherNames", selectedPerson.id] });
                        },
                    });
                });
            }}
        />
    </div>
</div>
```

- [ ] **Step 4: Remove unused debounce refs**

Remove `englishNameDebounceRef` and `nicknameDebounceRef` declarations (around lines 448-449).

- [ ] **Step 5: Update person list display**

In the person list item (around lines 1078-1088), replace the nickname/englishName display with other_names:

```tsx
{otherNames.length > 0 && (
    <span className="text-xs text-gray-400 dark:text-gray-500 font-normal">
        ({otherNames.map(n => n.name).join(', ')})
    </span>
)}
```

Note: This requires `otherNames` to be available in the list context. Since the list renders all persons (not just the selected one), you'll need to either:
- Query other_names for all persons (expensive), or
- Store other_names preview on the person object, or
- Just show a count or nothing in the list

The simplest approach: keep the list display minimal (just name), and show other_names only in the detail panel.

- [ ] **Step 6: Update search to use other_names**

The search currently filters by `p.name`, `p.englishName`, `p.nickname`. Since other_names are now in a separate table, the simplest approach for search is to query all other_names and build a lookup map. Update the search logic:

```typescript
const otherNamesMap = useMemo(() => {
    const map = new Map<string, string[]>();
    // otherNames would need to be fetched for all persons
    // For now, keep search on person.name only
    return map;
}, []);
```

Alternatively, keep the search simple — only search by `name` (the primary field). Other_names search can be added later if needed.

- [ ] **Step 7: Update handleSaveNewPerson**

In `handleSaveNewPerson` (around line 575), replace `englishName`/`nickname` with `otherNames`:

```typescript
const handleSaveNewPerson = useCallback(
    (data: {
        name: string;
        otherNames: { name: string; label: string }[];
        birthday: string;
        lunarBirthday: string;
        foodTaboos: string[];
        preferences: string[];
        remark: string;
        avatar: string;
        phones: { phone: string; label: string }[];
        emails: { email: string; label: string }[];
    }) => {
        createPerson.mutate(
            {
                name: data.name,
                birthday: data.birthday,
                lunarBirthday: data.lunarBirthday,
                foodTaboos: data.foodTaboos.join(','),
                preferences: data.preferences.join(','),
                remark: data.remark,
                avatar: data.avatar,
                groupId: selectedGroupId || undefined,
            },
            {
                onSuccess: (newPerson) => {
                    // Batch create other names
                    if (data.otherNames.length > 0) {
                        data.otherNames.forEach(n => {
                            createPersonOtherName.mutate({
                                personId: newPerson.id,
                                name: n.name,
                                label: n.label,
                            });
                        });
                    }
                    // Batch create phones
                    if (data.phones.length > 0) {
                        createPersonPhones.mutate({
                            personId: newPerson.id,
                            phones: data.phones,
                        });
                    }
                    // Batch create emails
                    if (data.emails.length > 0) {
                        createPersonEmails.mutate({
                            personId: newPerson.id,
                            emails: data.emails,
                        });
                    }
                    queryClient.invalidateQueries({ queryKey: ["persons"] });
                    queryClient.invalidateQueries({ queryKey: ["allPersons"] });
                    setShowPersonForm(false);
                    setSelectedPersonId(newPerson.id);
                },
            },
        );
    },
    [selectedGroupId, createPerson, createPersonOtherName, createPersonPhones, createPersonEmails, queryClient],
);
```

Also update `handleCopyPerson` (around line 680) to remove `englishName`/`nickname`.

- [ ] **Step 8: Commit**

```bash
git add src/pages/PeoplePage.tsx
git commit -m "feat: replace englishName/nickname with otherNames in detail panel"
```

---

### Task 8: i18n Translations

**Files:**
- Modify: `src/i18n/locales/zh/common.json`
- Modify: `src/i18n/locales/en/common.json`
- Modify: `src/i18n/locales/ja/common.json`

- [ ] **Step 1: Update Chinese translations**

In `src/i18n/locales/zh/common.json`, in the `people.detail` section, replace:

```json
"english_name": "英文名",
"english_name_placeholder": "输入英文名",
"nickname": "昵称",
"nickname_placeholder": "输入昵称",
```

with:

```json
"other_names": "别名或昵称",
"other_names_placeholder": "输入别名或昵称",
```

- [ ] **Step 2: Update English translations**

In `src/i18n/locales/en/common.json`, replace:

```json
"english_name": "English Name",
"english_name_placeholder": "Enter English name",
"nickname": "Nickname",
"nickname_placeholder": "Enter nickname",
```

with:

```json
"other_names": "Aliases",
"other_names_placeholder": "Enter alias or nickname",
```

- [ ] **Step 3: Update Japanese translations**

In `src/i18n/locales/ja/common.json`, replace:

```json
"english_name": "英語名",
"english_name_placeholder": "英語名を入力",
"nickname": "ニックネーム",
"nickname_placeholder": "ニックネームを入力",
```

with:

```json
"other_names": "別名・ニックネーム",
"other_names_placeholder": "別名を入力",
```

- [ ] **Step 4: Commit**

```bash
git add src/i18n/locales/zh/common.json src/i18n/locales/en/common.json src/i18n/locales/ja/common.json
git commit -m "feat: update i18n translations for other_names"
```

---

### Task 9: Drizzle Schema

**Files:**
- Modify: `drizzle/schema.ts:150-165`

- [ ] **Step 1: Add personOtherNames table and update persons**

In `drizzle/schema.ts`, add the new table after the `persons` table definition:

```typescript
export const personOtherNames = sqliteTable('person_other_names', {
  id: text('id').primaryKey(),
  personId: text('person_id').notNull().references(() => persons.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  label: text('label').default('别名'),
  sortOrder: real('sort_order').notNull().default(0),
});
```

Remove `englishName` and `nickname` from the `persons` table definition (lines 154-155).

- [ ] **Step 2: Commit**

```bash
git add drizzle/schema.ts
git commit -m "feat: update drizzle schema with personOtherNames table"
```

---

### Task 10: Build Verification

- [ ] **Step 1: Run TypeScript check**

```bash
npx tsc --noEmit 2>&1
```

Expected: Only the pre-existing `DatePickerDialogPage.tsx` unused import error.

- [ ] **Step 2: Run Rust build check**

```bash
cd src-tauri && cargo check 2>&1
```

Expected: No errors.

- [ ] **Step 3: Fix any compilation errors**

If there are errors from references to `englishName` or `nickname` in places not covered by this plan (e.g., `handleCopyPerson`, global search), fix them.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "fix: resolve remaining englishName/nickname references"
```
