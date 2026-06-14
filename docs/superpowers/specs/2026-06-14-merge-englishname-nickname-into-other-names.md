# Merge englishName/nickname into other_names

## Goal

Replace the single-value `english_name` and `nickname` columns on `persons` with a multi-value `person_other_names` table, using the same interaction pattern as phone numbers (`PhoneEmailListEditor`).

## Scope

- Database: new `person_other_names` table, data migration, drop old columns
- Backend (Rust): new `PersonOtherName` model + 5 CRUD commands
- Frontend (TS): new API functions, React Query hooks, PeoplePage UI changes
- i18n: new "other_names" translations, remove old english_name/nickname keys
- Drizzle schema: update to match new table

## Data Model

### New table: `person_other_names`

| Column     | Type    | Notes                              |
|------------|---------|------------------------------------|
| id         | TEXT PK | UUID                               |
| person_id  | TEXT    | FK → persons(id) ON DELETE CASCADE |
| name       | TEXT    | The alias/nickname value           |
| label      | TEXT    | Default "别名", options: 别名/英文名/昵称/其他 |
| sort_order | REAL    | Default 0                          |

### Rust model

```rust
pub struct PersonOtherName {
    pub id: String,
    pub person_id: String,
    pub name: String,
    pub label: Option<String>,
    pub sort_order: f64,
}
```

### TS type

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

## Data Migration

SQL migration in `migrations.rs`:

1. `CREATE TABLE IF NOT EXISTS person_other_names (...)`
2. Insert existing `english_name` values as label="英文名"
3. Insert existing `nickname` values as label="昵称"
4. Skip NULL or empty values
5. Keep old columns (don't drop) for safety — drop in a future migration

## Backend Commands (persons.rs)

New commands following the person_phones pattern:

- `get_person_other_names(app, person_id) → Vec<PersonOtherName>`
- `create_person_other_name(app, person_id, name, label) → PersonOtherName`
- `update_person_other_name(app, id, name, label) → PersonOtherName`
- `delete_person_other_name(app, id) → ()`

## Frontend Changes

### API (api.ts)

New functions: `getPersonOtherNames`, `createPersonOtherName`, `updatePersonOtherName`, `deletePersonOtherName`

### React Query (usePersonQueries.ts)

New hooks: `usePersonOtherNames`, `useCreatePersonOtherName`, `useDeletePersonOtherName`

### PeoplePage.tsx

**Create form:** Replace englishName + nickname inputs with `PhoneEmailListEditor` type="other_name"

**Detail panel:** Replace englishName + nickname inputs with `PhoneEmailListEditor` using local state pattern (same as phones/emails fix)

**Person list:** Show other_names in the list item subtitle (replaces englishName display)

**Search:** Search across `person_other_names.name` in addition to `persons.name`

**Save handler:** Pass other_names array to createPerson, then batch-create entries

### PhoneEmailListEditor.tsx

Add `type="other_name"` support with label options: 别名/英文名/昵称/其他

## i18n

### zh/common.json

- Add: `"other_names": "别名或昵称"`, `"other_names_placeholder": "输入别名或昵称"`
- Remove: `"english_name"`, `"english_name_placeholder"`, `"nickname"`, `"nickname_placeholder"`

### en/common.json

- Add: `"other_names": "Aliases"`, `"other_names_placeholder": "Enter alias or nickname"`
- Remove: `"english_name"`, `"english_name_placeholder"`, `"nickname"`, `"nickname_placeholder"`

### ja/common.json

- Add: `"other_names": "別名・ニックネーム"`, `"other_names_placeholder": "別名を入力"`
- Remove old keys

## Files to Modify

1. `src-tauri/src/db/migrations.rs` — new table + data migration
2. `src-tauri/src/db/models.rs` — add PersonOtherName struct
3. `src-tauri/src/commands/persons.rs` — add CRUD commands
4. `src-tauri/src/lib.rs` — register new commands
5. `src/types/person.ts` — add PersonOtherName, OtherNameEntry types
6. `src/lib/api.ts` — add API functions
7. `src/queries/usePersonQueries.ts` — add query/mutation hooks
8. `src/pages/PeoplePage.tsx` — UI changes
9. `src/components/PhoneEmailListEditor.tsx` — add other_name type
10. `src/i18n/locales/zh/common.json` — translations
11. `src/i18n/locales/en/common.json` — translations
12. `src/i18n/locales/ja/common.json` — translations
13. `drizzle/schema.ts` — add personOtherNames table
