---
description: Add a new i18n translation key to all three locale files (zh, en, ja) with consistent structure.
---

# Add i18n Translation Key

Add a new translation key to the Mindless app's three locale files: Chinese (zh), English (en), and Japanese (ja).

## Usage

```
/add-i18n-key <key_path> <zh_text> <en_text> <ja_text>
```

**Example:**
```
/add-i18n-key settings.sync.provider_github GitHub GitHub GitHub
/add-i18n-key tasks.template 模板 Template テンプレート
```

## Steps

### 1. Parse Arguments

Extract from `$ARGUMENTS`:
- `key_path`: Dot-separated key path (e.g., `settings.sync.provider_github`)
- `zh_text`: Chinese translation
- `en_text`: English translation
- `ja_text`: Japanese translation

### 2. Read Current Locale Files

Read all three files to understand the current structure:
- `src/i18n/locales/zh/common.json`
- `src/i18n/locales/en/common.json`
- `src/i18n/locales/ja/common.json`

### 3. Navigate to Key Location

For each file, navigate the JSON structure using the dot-separated key path:
- `settings.sync.provider_github` → `settings` → `sync` → `provider_github`

If intermediate objects don't exist, create them.

### 4. Insert Translation

Add the key-value pair at the correct location in each file:
- zh: `"provider_github": "GitHub"` (or appropriate Chinese text)
- en: `"provider_github": "GitHub"`
- ja: `"provider_github": "GitHub"` (or appropriate Japanese text)

### 5. Verify Structure

After insertion, verify:
- All three files have the same key structure
- JSON is valid (no trailing commas, proper nesting)
- Key is in the correct alphabetical position within its object (if applicable)

### 6. Report

Return:
- Key path added
- Translations added to each locale
- Any issues encountered (e.g., key already exists, structure mismatch)

## Common Key Patterns

Based on the existing codebase, keys typically follow these patterns:

- **Navigation**: `navigation.xxx` (sidebar labels)
- **Settings**: `settings.xxx.yyy` (settings page labels)
- **Entities**: `xxx.fields.yyy`, `xxx.actions.yyy`, `xxx.smart_groups.yyy`
- **Dialogs**: `xxx_mgmt.yyy` (management dialog labels)
- **Common**: `common.yyy` (shared UI labels)

## Gotchas

- **Key uniqueness**: If the key already exists, ask the user whether to overwrite or skip.
- **JSON validation**: Ensure no trailing commas (common JSON error).
- **Alphabetical order**: Keys within an object should be alphabetically sorted for consistency.
- **Namespace**: All keys are under the `common` namespace in i18next config.
