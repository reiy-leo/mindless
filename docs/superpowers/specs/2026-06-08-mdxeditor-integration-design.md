# MDXEditor Integration Design

## Overview
Replace custom MarkdownEditor component with MDXEditor from `@mdxeditor/editor` package.

## Requirements
- Replace current `MarkdownEditor.tsx` with MDXEditor
- Required features: code blocks, tables, links, basic formatting
- Use MDXEditor native API (markdown, onChange, ref)
- Use MDXEditor default styles
- Direct replacement (no feature flags or gradual rollout)

## Architecture

### New Component: MDXEditorWrapper
- Location: `src/components/MDXEditorWrapper.tsx`
- Wraps `@mdxeditor/editor` with required plugins
- Props: `markdown`, `onChange`, `ref`
- Imports MDXEditor CSS

### Plugin Configuration
```tsx
plugins={[
  headingsPlugin(),
  listsPlugin(),
  quotePlugin(),
  thematicBreakPlugin(),
  linkPlugin(),
  tablePlugin(),
  codeBlockPlugin()
]}
```

### Integration Points
1. **TasksPage.tsx** (`src/pages/TasksPage.tsx`)
   - Replace `MarkdownEditor` import with `MDXEditorWrapper`
   - Change `value` prop to `markdown`
   - Remove `placeholder` prop

2. **Cleanup**
   - Delete `src/components/MarkdownEditor.tsx`

## Data Flow
1. User types in MDXEditor
2. MDXEditor triggers `onChange` with markdown string
3. TasksPage updates `localDesc` state
4. State persists to database via existing mutation

## Error Handling
- MDXEditor handles internal errors
- No fallback needed (MDXEditor is stable)

## Testing
1. Verify markdown editing works in TasksPage
2. Test required features: headings, lists, quotes, links, tables, code blocks
3. Verify dark mode works with MDXEditor default styles
4. Test save/load cycle with database

## Implementation Steps
1. Install `@mdxeditor/editor` package
2. Create `MDXEditorWrapper.tsx` component
3. Update `TasksPage.tsx` to use new component
4. Delete old `MarkdownEditor.tsx`
5. Test all features

## Dependencies
- `@mdxeditor/editor` (new)
- Existing: `react-markdown`, `remark-gfm` (for MarkdownRenderer, unchanged)