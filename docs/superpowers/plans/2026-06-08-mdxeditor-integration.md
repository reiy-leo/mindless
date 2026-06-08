# MDXEditor Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace custom MarkdownEditor component with MDXEditor from @mdxeditor/editor package

**Architecture:** Create a wrapper component (MDXEditorWrapper) that configures MDXEditor with required plugins, then replace the existing MarkdownEditor usage in TasksPage.tsx

**Tech Stack:** React, TypeScript, @mdxeditor/editor, Vite

---

## File Structure

- **Create:** `src/components/MDXEditorWrapper.tsx` - New wrapper component for MDXEditor
- **Modify:** `src/pages/TasksPage.tsx` - Update import and usage
- **Delete:** `src/components/MarkdownEditor.tsx` - Remove old component
- **Modify:** `package.json` - Add @mdxeditor/editor dependency

---

### Task 1: Install MDXEditor Package

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install @mdxeditor/editor package**

Run: `npm install @mdxeditor/editor`

Expected: Package installed successfully, added to dependencies in package.json

- [ ] **Step 2: Verify installation**

Run: `npm list @mdxeditor/editor`

Expected: Shows installed version

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "deps: add @mdxeditor/editor package"
```

---

### Task 2: Create MDXEditorWrapper Component

**Files:**
- Create: `src/components/MDXEditorWrapper.tsx`

- [ ] **Step 1: Create MDXEditorWrapper component with required plugins**

```tsx
import { MDXEditor, headingsPlugin, listsPlugin, quotePlugin, thematicBreakPlugin, linkPlugin, tablePlugin, codeBlockPlugin } from '@mdxeditor/editor'
import '@mdxeditor/editor/style.css'

interface MDXEditorWrapperProps {
  markdown: string
  onChange: (markdown: string) => void
  placeholder?: string
}

export default function MDXEditorWrapper({ markdown, onChange, placeholder }: MDXEditorWrapperProps) {
  return (
    <MDXEditor
      markdown={markdown}
      onChange={onChange}
      plugins={[
        headingsPlugin(),
        listsPlugin(),
        quotePlugin(),
        thematicBreakPlugin(),
        linkPlugin(),
        tablePlugin(),
        codeBlockPlugin()
      ]}
    />
  )
}
```

- [ ] **Step 2: Verify component compiles**

Run: `npm run build`

Expected: Build succeeds without TypeScript errors

- [ ] **Step 3: Commit**

```bash
git add src/components/MDXEditorWrapper.tsx
git commit -m "feat: create MDXEditorWrapper component"
```

---

### Task 3: Update TasksPage.tsx to Use MDXEditorWrapper

**Files:**
- Modify: `src/pages/TasksPage.tsx`

- [ ] **Step 1: Update import statement**

Change line 25 from:
```tsx
import MarkdownEditor from '@/components/MarkdownEditor';
```
To:
```tsx
import MDXEditorWrapper from '@/components/MDXEditorWrapper';
```

- [ ] **Step 2: Update component usage**

Change lines 395-399 from:
```tsx
<MarkdownEditor
  value={localDesc}
  onChange={handleDescChange}
  placeholder="详细说明"
/>
```
To:
```tsx
<MDXEditorWrapper
  markdown={localDesc}
  onChange={handleDescChange}
/>
```

- [ ] **Step 3: Verify build**

Run: `npm run build`

Expected: Build succeeds without errors

- [ ] **Step 4: Commit**

```bash
git add src/pages/TasksPage.tsx
git commit -m "feat: use MDXEditorWrapper in TasksPage"
```

---

### Task 4: Delete Old MarkdownEditor Component

**Files:**
- Delete: `src/components/MarkdownEditor.tsx`

- [ ] **Step 1: Delete MarkdownEditor.tsx**

Run: `rm src/components/MarkdownEditor.tsx`

- [ ] **Step 2: Verify no other references**

Run: `grep -r "MarkdownEditor" src/`

Expected: No results (only MDXEditorWrapper references remain)

- [ ] **Step 3: Verify build**

Run: `npm run build`

Expected: Build succeeds without errors

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor: remove old MarkdownEditor component"
```

---

### Task 5: Test MDXEditor Integration

**Files:**
- None (testing only)

- [ ] **Step 1: Start development server**

Run: `npm run dev`

Expected: Server starts without errors

- [ ] **Step 2: Test basic editing**

1. Open browser to localhost:5173 (or appropriate port)
2. Navigate to Tasks page
3. Click on a task to open detail view
4. Verify MDXEditor loads in description field
5. Test typing basic markdown (headings, bold, italic)

Expected: Editor works, formatting applied correctly

- [ ] **Step 3: Test required features**

1. Test headings: Type `# Heading` and verify it renders
2. Test lists: Type `- Item` and verify bullet list
3. Test links: Type `[text](url)` and verify link creation
4. Test tables: Use toolbar or markdown syntax
5. Test code blocks: Use triple backticks

Expected: All required features work

- [ ] **Step 4: Test dark mode**

1. Toggle dark mode in browser/OS settings
2. Verify editor styling adapts correctly

Expected: Dark mode works with MDXEditor default styles

- [ ] **Step 5: Test save/load cycle**

1. Edit description with markdown content
2. Save task (auto-save or manual)
3. Refresh page
4. Verify content persists correctly

Expected: Content saves and loads correctly

- [ ] **Step 6: Commit test results (if any test files)**

```bash
git add -A
git commit -m "test: verify MDXEditor integration"
```

---

## Verification Checklist

- [ ] MDXEditor loads without errors
- [ ] Basic editing works (typing, deleting, selecting)
- [ ] Headings render correctly
- [ ] Lists (ordered and unordered) work
- [ ] Links can be created and edited
- [ ] Tables can be created and edited
- [ ] Code blocks work with syntax highlighting
- [ ] Dark mode styling works
- [ ] Content saves to database correctly
- [ ] Content loads from database correctly
- [ ] No console errors during editing
- [ ] Build succeeds with `npm run build`