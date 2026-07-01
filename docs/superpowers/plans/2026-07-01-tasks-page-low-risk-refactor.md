# Tasks Page Low-Risk Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Shrink `src/pages/TasksPage.tsx` through staged extraction while preserving task filtering, grouping, selection, overlay, and menu behavior.

**Architecture:** Move pure task matching/grouping code to `src/lib/tasks/*` first, then extract small UI components under `src/components/tasks/*` without changing data ownership. `TasksPage.tsx` remains the orchestrator for queries, mutations, and page-level state until each extracted component has a clear prop boundary.

**Tech Stack:** React, TypeScript, Tauri events, TanStack Query, node:test, Vite.

---

### Task 1: Extract Advanced Group Date Matching

**Files:**
- Create: `src/lib/tasks/taskFiltering.ts`
- Create: `src/lib/tasks/taskFiltering.test.ts`
- Modify: `src/pages/TasksPage.tsx`

- [x] Add tests for date preset matching, date range overlap, and legacy date filter compatibility.
- [x] Move local date helper functions and `matchAdvancedGroup` logic into `taskFiltering.ts`.
- [x] Update `TasksPage.tsx` to import `matchAdvancedGroup`.
- [x] Run `rtk node --test src/lib/tasks/taskFiltering.test.ts`.
- [x] Run `rtk npm run build`.

### Task 2: Extract Task View Settings Helpers

**Files:**
- Create: `src/lib/tasks/taskViewSettings.ts`
- Create: `src/lib/tasks/taskViewSettings.test.ts`
- Modify: `src/pages/TasksPage.tsx`

- [x] Add tests for status-specific settings fallback and saved `all` settings.
- [x] Move `DEFAULT_STATUS_VIEW_SETTINGS` and `getStatusViewSettings`.
- [x] Update imports in `TasksPage.tsx`.
- [x] Run focused tests and build.

### Task 3: Extract Low-State UI Components

**Files:**
- Create: `src/components/tasks/list/TaskRow.tsx`
- Create: `src/components/tasks/menus/TaskContextMenu.tsx`
- Create: `src/components/tasks/menus/ListContextMenu.tsx`
- Modify: `src/pages/TasksPage.tsx`

- [x] Move `TaskRow` first because it has a clear prop boundary.
- [x] Move context menu rendering after `TaskRow` compiles.
- [x] Keep all mutation callbacks owned by `TasksPage.tsx`.
- [x] Run `rtk npm run build` after each component extraction.

### Task 4: Extract Large Page Panels

**Files:**
- Create: `src/components/tasks/detail/TaskDetailPanel.tsx`
- Create: `src/components/tasks/list/TaskListPane.tsx`
- Create: `src/components/tasks/sidebar/TaskSidebar.tsx`
- Modify: `src/pages/TasksPage.tsx`

- [x] Move `TaskDetailPanel` without splitting its internal attachment logic.
- [x] Move list pane rendering while preserving `taskGroups` as grouped data.
- [x] Move sidebar rendering while keeping selected-list state in `TasksPage.tsx`.
- [x] Run `rtk npm run build` after each panel extraction.

### Task 5: Component Directory Cleanup

**Files:**
- Move task-specific controls into `src/components/tasks/controls/`
- Move task view components into `src/components/tasks/views/`
- Modify imports in affected files.

- [x] Move `TaskGroupControls.tsx`, `TaskSortControls.tsx`, and `OxygenNotIncludedPriorityPicker.tsx` to `controls/`.
- [x] Move `CalendarView.tsx`, `KanbanView.tsx`, and `EisenhowerMatrixView.tsx` to `views/`.
- [x] Leave generic root components in place unless they are task-only.
- [x] Run `rtk npm run build`.
