# Window Menu Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the requested macOS `窗口` menu actions, preserve native system-managed window items, and make `显示主窗口` recreate the main window on the last visited main-page route.

**Architecture:** Keep menu construction in `src-tauri/src/menu.rs`, move window-level actions into Rust, and treat the frontend as the source of route changes only. Because Rust cannot read browser `localStorage` after the main window is closed, mirror the last main-page route into a small Rust `State`, then use that state when recreating the main window.

**Tech Stack:** Tauri 2 (Rust) with macOS private API enabled, React + TypeScript, BrowserRouter, i18next

---

## File Structure

### Modified Files
| File | Purpose |
|------|---------|
| `src-tauri/src/lib.rs` | Register shared route state and the new route-sync command |
| `src-tauri/src/menu.rs` | Extend the window menu, add Rust-side window handlers, recreate main window |
| `src-tauri/Cargo.toml` | Add `urlencoding` for route-safe main-window recreation URLs |
| `src-tauri/tauri.conf.json` | Make the main window label explicit if it is still implicit |
| `src/App.tsx` | Report main-page route changes and restore a requested route on startup |
| `src/hooks/useMenuEvents.ts` | Remove obsolete frontend-only `main_window` behavior; keep label sync updated |
| `src/lib/api.ts` | Add the route-sync invoke wrapper and expand `MenuLabels` |
| `src/i18n/locales/zh/common.json` | Add Chinese labels for new custom window items |
| `src/i18n/locales/en/common.json` | Add English labels for new custom window items |
| `src/i18n/locales/ja/common.json` | Add Japanese labels for new custom window items |

### No New Files
Keep this in existing menu/app files. No new abstraction layer is needed.

---

## Task 1: Persist The Last Main-Page Route In Rust State

**Files:**
- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/src/menu.rs`
- Modify: `src/lib/api.ts`
- Modify: `src/App.tsx`

- [ ] **Step 1: Add shared last-route state in `src-tauri/src/lib.rs`**

Add a tiny state holder near the top of `src-tauri/src/lib.rs` and register it on the builder before `.setup(...)`:

```rust
use std::sync::Mutex;
use tauri::Builder;

pub struct LastMainRoute(pub Mutex<String>);

pub fn run() {
    Builder::default()
        .manage(LastMainRoute(Mutex::new("/".to_string())))
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_positioner::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            window_shadows_v2::set_shadows(app, true);
            let app_handle = app.handle();
            db::migrations::run_migrations(&app_handle)?;
            menu::init_menu(&app_handle)?;
            Ok(())
        })
```

- [ ] **Step 2: Expose a route-sync command from `src-tauri/src/menu.rs`**

Add a small command near `update_menu_language`:

```rust
use tauri::{menu::{Menu, MenuItemBuilder, PredefinedMenuItem, SubmenuBuilder}, AppHandle, Emitter, State, Wry};
use crate::LastMainRoute;

#[tauri::command]
pub async fn set_last_main_route(route: String, state: State<'_, LastMainRoute>) -> Result<(), String> {
    let normalized = if route.starts_with('/') { route } else { format!("/{route}") };
    let mut last_route = state.0.lock().map_err(|_| "failed to lock last route state".to_string())?;
    *last_route = normalized;
    Ok(())
}
```

- [ ] **Step 3: Register the command in `src-tauri/src/lib.rs`**

Add `menu::set_last_main_route` to the existing `invoke_handler` list next to `menu::update_menu_language`:

```rust
            commands::increment_template_usage,
            menu::update_menu_language,
            menu::set_last_main_route,
        ])
```

- [ ] **Step 4: Add the frontend invoke wrapper in `src/lib/api.ts`**

Append this near the other small `invoke` helpers:

```typescript
export async function setLastMainRoute(route: string): Promise<void> {
  return await invoke('set_last_main_route', { route })
}
```

- [ ] **Step 5: Add route reporting and restore handling in `src/App.tsx`**

Import `useLocation` and `useNavigate`, then add a tiny component above `App()`:

```tsx
import { BrowserRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom'

const MAIN_ROUTES = new Set(['/', '/tasks', '/habits', '/countdowns', '/tags', '/notes', '/people', '/media', '/settings'])

function RouteSyncManager() {
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const restorePath = params.get('restorePath')
    if (location.pathname === '/' && restorePath && MAIN_ROUTES.has(restorePath)) {
      navigate(restorePath, { replace: true })
      return
    }
  }, [location.pathname, location.search, navigate])

  useEffect(() => {
    if (!MAIN_ROUTES.has(location.pathname)) {
      return
    }
    localStorage.setItem('mindless:last-route', location.pathname)
    api.setLastMainRoute(location.pathname).catch(console.error)
  }, [location.pathname])

  return null
}
```

Then mount it inside `<BrowserRouter>` before `<Routes>`:

```tsx
    <BrowserRouter>
      <ErrorBoundary>
        <RouteSyncManager />
        <ThemeManager />
        <ThemeColorManager />
```

- [ ] **Step 6: Verify the plumbing compiles**

Run: `npm run build`

Expected: TypeScript and Vite build complete without `set_last_main_route`/`useLocation`/`useNavigate` errors.

- [ ] **Step 7: Commit the plumbing**

```bash
git add src-tauri/src/lib.rs src-tauri/src/menu.rs src/lib/api.ts src/App.tsx
git commit -m "feat: persist last main route for window restore"
```

---

## Task 2: Expand Window Menu Labels And Locales

**Files:**
- Modify: `src/lib/api.ts`
- Modify: `src/hooks/useMenuEvents.ts`
- Modify: `src/i18n/locales/zh/common.json`
- Modify: `src/i18n/locales/en/common.json`
- Modify: `src/i18n/locales/ja/common.json`

- [ ] **Step 1: Extend `MenuLabels` in `src/lib/api.ts`**

Add the new fields to the existing interface:

```typescript
export interface MenuLabels {
  appMenu: string;
  about: string;
  preferences: string;
  checkUpdate: string;
  services: string;
  hideApp: string;
  hideOthers: string;
  quit: string;
  fileMenu: string;
  newTask: string;
  newNote: string;
  globalSearch: string;
  tasksMenu: string;
  priorityMenu: string;
  priorityTraditional: string;
  priorityAnoxia: string;
  setDate: string;
  markCompleted: string;
  markClosed: string;
  addToToday: string;
  navMenu: string;
  navTasks: string;
  navHabits: string;
  navCountdowns: string;
  navNotes: string;
  manageTags: string;
  manageTaskTemplates: string;
  manageAttachments: string;
  editMenu: string;
  windowMenu: string;
  minimize: string;
  closeWindow: string;
  fillWindow: string;
  centerWindow: string;
  reloadWindow: string;
  showMainWindow: string;
  mainWindow: string;
  bringAllFront: string;
  fullscreen: string;
  helpMenu: string;
  helpCenter: string;
}
```

- [ ] **Step 2: Return those fields from `buildMenuLabels()` in `src/hooks/useMenuEvents.ts`**

Insert the new keys in the returned object:

```typescript
    windowMenu: t('menu.window'),
    minimize: t('menu.minimize'),
    closeWindow: t('menu.close_window'),
    fillWindow: t('menu.fill_window'),
    centerWindow: t('menu.center_window'),
    reloadWindow: t('menu.reload_window'),
    showMainWindow: t('menu.show_main_window'),
    mainWindow: t('menu.main_window'),
    bringAllFront: t('menu.bring_all_front'),
    fullscreen: t('menu.fullscreen'),
```

- [ ] **Step 3: Add locale keys in `src/i18n/locales/zh/common.json`**

Under the existing `menu` section, add:

```json
{
  "fill_window": "填充",
  "center_window": "居中",
  "reload_window": "重新载入",
  "show_main_window": "显示主窗口"
}
```

- [ ] **Step 4: Add locale keys in `src/i18n/locales/en/common.json`**

```json
{
  "fill_window": "Fill",
  "center_window": "Center",
  "reload_window": "Reload",
  "show_main_window": "Show Main Window"
}
```

- [ ] **Step 5: Add locale keys in `src/i18n/locales/ja/common.json`**

```json
{
  "fill_window": "拡大",
  "center_window": "中央に配置",
  "reload_window": "再読み込み",
  "show_main_window": "メインウィンドウを表示"
}
```

- [ ] **Step 6: Verify the frontend still builds**

Run: `npm run build`

Expected: Build passes and `buildMenuLabels()` satisfies `MenuLabels` without missing-property errors.

- [ ] **Step 7: Commit the label changes**

```bash
git add src/lib/api.ts src/hooks/useMenuEvents.ts src/i18n/locales/zh/common.json src/i18n/locales/en/common.json src/i18n/locales/ja/common.json
git commit -m "feat: add window menu labels"
```

---

## Task 3: Implement Rust-Side Window Menu Actions

**Files:**
- Modify: `src-tauri/src/menu.rs`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/tauri.conf.json`

- [ ] **Step 1: Make the main-window label explicit in `src-tauri/tauri.conf.json`**

Add `"label": "main"` to the existing window definition so startup and recreation share the same identity:

```json
"windows": [
  {
    "label": "main",
    "title": "Mindless",
    "width": 1200,
    "height": 800,
    "minWidth": 800,
    "minHeight": 600,
    "resizable": true,
    "fullscreen": false,
    "decorations": true,
    "titleBarStyle": "Overlay",
    "hiddenTitle": true
  }
]
```

- [ ] **Step 2: Add focused-window helpers and main-window recreation in `src-tauri/src/menu.rs`**

Add imports and helpers near the top of the file:

```rust
use tauri::{
    menu::{Menu, MenuItemBuilder, PredefinedMenuItem, SubmenuBuilder},
    AppHandle, Emitter, Manager, State, WebviewUrl, WebviewWindow, WebviewWindowBuilder, Wry,
};
use crate::LastMainRoute;

const MAIN_WINDOW_LABEL: &str = "main";

fn focused_window(app: &AppHandle) -> Option<WebviewWindow<Wry>> {
    app.webview_windows()
        .values()
        .find(|window| window.is_focused().unwrap_or(false))
        .cloned()
        .or_else(|| app.get_webview_window(MAIN_WINDOW_LABEL))
}

fn show_existing_window(window: &WebviewWindow<Wry>) -> Result<(), String> {
    window.show().map_err(|e| e.to_string())?;
    window.unminimize().map_err(|e| e.to_string())?;
    window.set_focus().map_err(|e| e.to_string())?;
    Ok(())
}

fn build_main_window(app: &AppHandle, route: &str) -> Result<WebviewWindow<Wry>, String> {
    let restore_path = route.trim().to_string();
    let url = if restore_path == "/" {
        WebviewUrl::default()
    } else {
        WebviewUrl::App(format!("index.html?restorePath={}", urlencoding::encode(&restore_path)).into())
    };

    WebviewWindowBuilder::new(app, MAIN_WINDOW_LABEL, url)
        .title("Mindless")
        .inner_size(1200.0, 800.0)
        .min_inner_size(800.0, 600.0)
        .resizable(true)
        .fullscreen(false)
        .decorations(true)
        .hidden_title(true)
        .title_bar_style(tauri::TitleBarStyle::Overlay)
        .build()
        .map_err(|e| e.to_string())
}

fn show_or_create_main_window(app: &AppHandle, state: &State<'_, LastMainRoute>) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(MAIN_WINDOW_LABEL) {
        return show_existing_window(&window);
    }

    let route = state
        .0
        .lock()
        .map_err(|_| "failed to lock last route state".to_string())?
        .clone();

    let window = build_main_window(app, &route)?;
    show_existing_window(&window)
}
```

Add `urlencoding = "2"` to `src-tauri/Cargo.toml` if the crate is not already present.

- [ ] **Step 3: Add the new menu items and register the submenu as the macOS windows menu**

In `build_menu(...)`, create the new custom items before `window_submenu`:

```rust
    let fill_window = MenuItemBuilder::with_id("window:fill", &l.fill_window)
        .accelerator("Ctrl+Fn+F")
        .build(app)
        .map_err(|e| e.to_string())?;
    let center_window = MenuItemBuilder::with_id("window:center", &l.center_window)
        .accelerator("Ctrl+Fn+C")
        .build(app)
        .map_err(|e| e.to_string())?;
    let reload_window = MenuItemBuilder::with_id("window:reload", &l.reload_window)
        .accelerator("CmdOrCtrl+Shift+R")
        .build(app)
        .map_err(|e| e.to_string())?;
    let show_main_window = MenuItemBuilder::with_id("window:show_main", &l.show_main_window)
        .build(app)
        .map_err(|e| e.to_string())?;
```

Then include them in the submenu and mark it as the native windows menu:

```rust
    let window_submenu = SubmenuBuilder::new(app, &l.window_menu)
        .item(&minimize)
        .item(&close_window)
        .separator()
        .item(&fill_window)
        .item(&center_window)
        .item(&reload_window)
        .separator()
        .item(&show_main_window)
        .item(&bring_all_front)
        .separator()
        .item(&fullscreen)
        .build()
        .map_err(|e| e.to_string())?;

    #[cfg(target_os = "macos")]
    window_submenu
        .set_as_windows_menu_for_nsapp()
        .map_err(|e| e.to_string())?;
```

- [ ] **Step 4: Implement the menu handlers in `src-tauri/src/menu.rs`**

Replace the window branch in `setup_menu_handler(...)` with Rust-side actions:

```rust
fn setup_menu_handler(app: &AppHandle) {
    let app_handle = app.clone();
    app.on_menu_event(move |_app, event| {
        let id = event.id().as_ref();
        match id {
            "window:fill" => {
                if let Some(window) = focused_window(&app_handle) {
                    #[cfg(target_os = "macos")]
                    unsafe {
                        use cocoa::base::{id, nil};
                        use objc::{msg_send, sel, sel_impl};

                        let ns_window = window.ns_window().map_err(|e| e.to_string()).ok().map(|raw| raw as id);
                        if let Some(ns_window) = ns_window.filter(|w| *w != nil) {
                            let _: () = msg_send![ns_window, performZoom:nil];
                        }
                    }
                }
            }
            "window:center" => {
                if let Some(window) = focused_window(&app_handle) {
                    let _ = window.center();
                }
            }
            "window:reload" => {
                if let Some(window) = focused_window(&app_handle) {
                    let _ = window.reload();
                }
            }
            "window:show_main" => {
                let state = app_handle.state::<LastMainRoute>();
                let _ = show_or_create_main_window(&app_handle, &state);
            }
            "window:main_window" => {
                let state = app_handle.state::<LastMainRoute>();
                let _ = show_or_create_main_window(&app_handle, &state);
            }
            _ => {}
        }
    });
}
```

After this step, the menu no longer depends on the frontend to show the main window, reload the focused window, or center/fill it.

- [ ] **Step 5: Extend `MenuLabels` on the Rust side**

Add matching fields to the Rust struct and default labels:

```rust
pub struct MenuLabels {
    pub app_menu: String,
    pub about: String,
    pub preferences: String,
    pub check_update: String,
    pub services: String,
    pub hide_app: String,
    pub hide_others: String,
    pub quit: String,
    pub file_menu: String,
    pub new_task: String,
    pub new_note: String,
    pub global_search: String,
    pub tasks_menu: String,
    pub priority_menu: String,
    pub priority_traditional: String,
    pub priority_anoxia: String,
    pub set_date: String,
    pub mark_completed: String,
    pub mark_closed: String,
    pub add_to_today: String,
    pub nav_menu: String,
    pub nav_tasks: String,
    pub nav_habits: String,
    pub nav_countdowns: String,
    pub nav_notes: String,
    pub manage_tags: String,
    pub manage_task_templates: String,
    pub manage_attachments: String,
    pub edit_menu: String,
    pub window_menu: String,
    pub minimize: String,
    pub close_window: String,
    pub fill_window: String,
    pub center_window: String,
    pub reload_window: String,
    pub show_main_window: String,
    pub main_window: String,
    pub bring_all_front: String,
    pub fullscreen: String,
    pub help_menu: String,
    pub help_center: String,
}
```

And in `default_zh()`:

```rust
            window_menu: "窗口".into(),
            minimize: "最小化".into(),
            close_window: "关闭窗口".into(),
            fill_window: "填充".into(),
            center_window: "居中".into(),
            reload_window: "重新载入".into(),
            show_main_window: "显示主窗口".into(),
            main_window: "主窗口".into(),
            bring_all_front: "前置全部窗口".into(),
            fullscreen: "进入全屏".into(),
```

- [ ] **Step 6: Verify Rust compiles after the menu changes**

Run: `cargo check --manifest-path src-tauri/Cargo.toml`

Expected: `Finished` without missing trait imports or `MenuLabels` field errors.

- [ ] **Step 7: Commit the Rust menu implementation**

```bash
git add src-tauri/src/menu.rs src-tauri/src/lib.rs src-tauri/tauri.conf.json src-tauri/Cargo.toml
git commit -m "feat: add native window menu actions"
```

---

## Task 4: Remove Obsolete Frontend Handling And Verify End-To-End Behavior

**Files:**
- Modify: `src/hooks/useMenuEvents.ts`
- Modify: `src/App.tsx`

- [ ] **Step 1: Remove the frontend-only `main_window` switch case**

Delete this branch from `listen<string>('menu:navigate', ...)` in `src/hooks/useMenuEvents.ts`:

```typescript
          case 'main_window':
            getCurrentWindow().setFocus().catch(console.error)
            break
```

Also remove the now-unused import if `getCurrentWindow` is no longer referenced in that file.

- [ ] **Step 2: Keep `RouteSyncManager` mounted for all router sessions**

Confirm the app shell still mounts it at the top level:

```tsx
    <BrowserRouter>
      <ErrorBoundary>
        <RouteSyncManager />
        <ThemeManager />
        <ThemeColorManager />
        <FontSizeManager />
        <SettingsSync />
```

- [ ] **Step 3: Run the full frontend build**

Run: `npm run build`

Expected: Successful build with no unused-import or route-manager type errors.

- [ ] **Step 4: Run the desktop smoke check**

Run: `npm run tauri dev`

Expected: The app launches and the `窗口` menu contains:
- `填充`
- `居中`
- `重新载入`
- `显示主窗口`
- native macOS items managed by the system when available

- [ ] **Step 5: Manually verify the required behaviors**

Check these flows in the running app:

```text
1. Navigate to /notes, close the main window, then choose 窗口 -> 显示主窗口.
   Expected: a new main window opens on /notes.

2. Focus the main window and press Cmd+Shift+R.
   Expected: the current webview reloads.

3. Focus the main window and trigger 窗口 -> 居中.
   Expected: the window centers on the active display.

4. Focus the main window and trigger 窗口 -> 填充.
   Expected: the macOS zoom/fill behavior runs.

5. Open a dialog window, then trigger 窗口 -> 显示主窗口.
   Expected: the main window is shown or recreated; the dialog is not treated as the app shell.

6. Inspect the 窗口 menu.
   Expected: macOS-owned entries such as 移动和调整大小 / 全屏幕拼贴 appear only when the OS exposes them.
```

- [ ] **Step 6: Commit the cleanup and verification pass**

```bash
git add src/hooks/useMenuEvents.ts src/App.tsx
git commit -m "refactor: move window menu actions to rust"
```

---

## Self-Review Notes

- Spec coverage: this plan covers all four custom actions, main-window recreation, last-route restore, and preservation of native macOS-managed window items.
- Implementation correction: the design doc said `localStorage` alone would back restore state, but that is not sufficient once the main window is closed. This plan keeps the `localStorage` write for frontend continuity while mirroring the route into Rust `State`, which is what the recreation path actually reads.
- Placeholder scan: no `TODO`/`TBD` items remain; each task names exact files and commands.

---

## Final Verification Commands

Run these before calling the work complete:

```bash
cargo check --manifest-path src-tauri/Cargo.toml
npm run build
```

Expected:
- Rust check passes
- Frontend build passes
- Manual smoke checks above pass in `npm run tauri dev`
