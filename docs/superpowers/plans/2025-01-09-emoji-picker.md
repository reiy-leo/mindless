# Emoji Picker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add emoji picker to ListFormDialog and AdvancedGroupFormDialog, allowing users to select any emoji instead of predefined icons.

**Architecture:** Create a reusable EmojiPickerButton component using @emoji-mart/react. Replace the icon grid in both dialogs with this component. Store emoji character directly instead of icon key.

**Tech Stack:** React, @emoji-mart/react, @emoji-mart/data, Tailwind CSS

---

## File Structure

- Create: `src/components/EmojiPickerButton.tsx` - Reusable emoji picker button with popover
- Modify: `src/components/lists/ListFormDialog.tsx:7-18,34,117-133` - Replace ICON_OPTIONS with EmojiPickerButton
- Modify: `src/components/AdvancedGroupFormDialog.tsx:7-11,29,128-135` - Replace ICON_OPTIONS with EmojiPickerButton

---

### Task 1: Install Dependencies

- [ ] **Step 1: Install emoji-mart packages**

```bash
npm install @emoji-mart/react @emoji-mart/data
```

- [ ] **Step 2: Verify installation**

```bash
grep emoji-mart package.json
```

Expected: Both `@emoji-mart/react` and `@emoji-mart/data` in dependencies

---

### Task 2: Create EmojiPickerButton Component

**Files:**
- Create: `src/components/EmojiPickerButton.tsx`

- [ ] **Step 1: Create EmojiPickerButton component**

```tsx
import { useState, useRef, useEffect } from 'react';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';

interface EmojiPickerButtonProps {
  value: string;
  onChange: (emoji: string) => void;
  className?: string;
}

export default function EmojiPickerButton({ value, onChange, className = '' }: EmojiPickerButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 rounded-lg flex items-center justify-center text-2xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
      >
        {value}
      </button>
      {isOpen && (
        <div className="absolute z-50 mt-1">
          <Picker
            data={data}
            onEmojiSelect={(emoji: any) => {
              onChange(emoji.native);
              setIsOpen(false);
            }}
            theme="auto"
            previewPosition="none"
            skinTonePosition="none"
          />
        </div>
      )}
    </div>
  );
}
```

---

### Task 3: Update ListFormDialog

**Files:**
- Modify: `src/components/lists/ListFormDialog.tsx`

- [ ] **Step 1: Update imports and remove ICON_OPTIONS**

Add import for EmojiPickerButton at top:
```tsx
import EmojiPickerButton from '@/components/EmojiPickerButton';
```

Remove lines 7-18 (ICON_OPTIONS array).

- [ ] **Step 2: Update icon state default**

Change line 34 from:
```tsx
const [icon, setIcon] = useState('folder');
```
To:
```tsx
const [icon, setIcon] = useState('📁');
```

- [ ] **Step 3: Update useEffect default**

Change line 49 from:
```tsx
setIcon('folder');
```
To:
```tsx
setIcon('📁');
```

- [ ] **Step 4: Replace icon grid with EmojiPickerButton**

Replace lines 117-133 (the icon section) with:
```tsx
<div>
  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
    {t('lists.icon')}
  </label>
  <EmojiPickerButton value={icon} onChange={setIcon} />
</div>
```

---

### Task 4: Update AdvancedGroupFormDialog

**Files:**
- Modify: `src/components/AdvancedGroupFormDialog.tsx`

- [ ] **Step 1: Update imports and remove ICON_OPTIONS/ICON_MAP**

Add import for EmojiPickerButton at top:
```tsx
import EmojiPickerButton from '@/components/EmojiPickerButton';
```

Remove lines 7-11 (ICON_OPTIONS and ICON_MAP).

- [ ] **Step 2: Update icon state default**

Change line 29 from:
```tsx
const [icon, setIcon] = useState('folder');
```
To:
```tsx
const [icon, setIcon] = useState('📁');
```

- [ ] **Step 3: Update useEffect default**

Change line 42 from:
```tsx
setIcon('folder');
```
To:
```tsx
setIcon('📁');
```

- [ ] **Step 4: Replace icon grid with EmojiPickerButton**

Replace lines 126-135 (the icon section inside the flex) with:
```tsx
<div className="flex-1">
  <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">{t('advanced_groups.icon')}</label>
  <EmojiPickerButton value={icon} onChange={setIcon} />
</div>
```

---

### Task 5: Verify and Test

- [ ] **Step 1: Run type check**

```bash
npm run typecheck
```

Expected: No type errors

- [ ] **Step 2: Run dev server and test**

```bash
npm run tauri dev
```

Test:
1. Open ListFormDialog - click emoji button, select emoji, verify it displays
2. Open AdvancedGroupFormDialog - click emoji button, select emoji, verify it displays
3. Create/edit a list with custom emoji - verify it saves and displays in sidebar
4. Create/edit an advanced group with custom emoji - verify it saves and displays

- [ ] **Step 3: Commit**

```bash
git add src/components/EmojiPickerButton.tsx src/components/lists/ListFormDialog.tsx src/components/AdvancedGroupFormDialog.tsx package.json package-lock.json
git commit -m "feat: add emoji picker to list and advanced group forms"
```
