# Window Menu Enhancements Design

## Overview

Enhance the macOS `窗口` menu with a small set of app-specific actions while preserving native system-managed window items. The app should add shortcuts for fill, center, and reload, add a robust `显示主窗口` action that recreates the main window when needed, and keep macOS-managed items such as `移动和调整大小` and `全屏幕拼贴` under system control.

## Requirements

1. Add `填充` with shortcut `Ctrl+Fn+F`
2. Add `居中` with shortcut `Ctrl+Fn+C`
3. Add `重新载入` with shortcut `Cmd+Shift+R`
4. Add `显示主窗口`; if the main window no longer exists, create a new one
5. Restore a recreated main window to the last visited main-page route
6. Keep macOS native window-management items system-managed, including `移动和调整大小` and `全屏幕拼贴`, with availability controlled by the OS

## Scope

This design only covers macOS window menu behavior.

Out of scope:
- Reworking non-window menus
- Adding custom replacements for native macOS window-management items
- Changing dialog/overlay window behavior beyond what is needed for `显示主窗口`

## Approach

Use the existing Rust-side menu construction in `src-tauri/src/menu.rs` as the primary integration point.

- Keep native/predefined menu items where Tauri already exposes them
- Add only four custom window menu commands: `fill`, `center`, `reload`, `show_main`
- Handle window-level actions in Rust instead of routing them through frontend events when possible
- Persist the last visited main-window route in the frontend and use it only when recreating the main window

This is the smallest change that preserves native macOS menu behavior and avoids building fake system items in the app layer.

## Menu Design

### Window Menu Structure

The `窗口` menu remains Rust-defined in `src-tauri/src/menu.rs`.

Existing items kept:
- `最小化`
- `关闭窗口`
- `前置全部窗口`
- `进入全屏`

New custom items:
- `填充`
- `居中`
- `重新载入`
- `显示主窗口`

Native system-managed items:
- `移动和调整大小`
- `全屏幕拼贴`
- Any related macOS-managed submenu/items exposed by the native menu stack

The app should not recreate these native items manually. If Tauri exposes them directly, use that. If not, add a minimal macOS-native bridge only for attaching the real system items to the `窗口` menu.

## Behavior

### 1. Fill

Menu id: `window:fill`

Behavior:
- Applies to the currently focused window
- Invokes the macOS fill/zoom behavior for that window
- Does nothing if no app window can be resolved

### 2. Center

Menu id: `window:center`

Behavior:
- Applies to the currently focused window
- Centers the window on the current display
- Does nothing if no app window can be resolved

### 3. Reload

Menu id: `window:reload`

Behavior:
- Applies to the currently focused webview window
- Reloads the current window content
- Should not depend on frontend event dispatch

### 4. Show Main Window

Menu id: `window:show_main`

Behavior:
- If the main window exists:
  - show it if hidden
  - unminimize it if minimized
  - focus it
- If the main window does not exist:
  - create a new main window
  - open it on the last visited main-page route
  - then focus it

Fallback:
- If no stored route is available, open the default main page

## Last Route Persistence

Persist the main window route in the frontend.

### Rules

- Save only top-level main-window routes such as `/tasks`, `/habits`, `/countdowns`, `/notes`
- Do not save dialog routes such as `/dialog/*`
- Do not save overlay routes
- Update the stored value whenever the main window route changes

### Storage

- Use `localStorage`
- Suggested key: `mindless:last-route`

### Restore Rules

- Rust uses the stored route only when recreating the main window
- Existing windows keep their current state and are not force-navigated by `显示主窗口`

## Implementation Areas

### Rust

#### `src-tauri/src/menu.rs`

Modify:
- Add the new window menu items and accelerators
- Extend the window menu layout
- Add menu handlers for `window:fill`, `window:center`, `window:reload`, `window:show_main`
- Add a helper to resolve the focused window
- Add a helper to show or recreate the main window

Potential helper responsibilities:
- resolve focused window or fall back to main window
- show/unminimize/focus a known window
- build a main window with a route-aware URL

#### `src-tauri/src/lib.rs`

Modify only if needed to share main-window creation logic during setup and recreation. Keep this minimal.

### Frontend

#### `src/hooks/useMenuEvents.ts`

Modify:
- Remove the current `main_window` frontend-only focus behavior
- Keep frontend event handling only for actions that still need UI-side dispatch

#### Route owner

Likely modify `src/App.tsx` or the smallest existing route-aware location.

Add:
- a route persistence effect for main-window pages
- a narrow filter so dialog and overlay routes are ignored

## Main Window Identity

The recreated main window should reuse the app's standard main-window label if one already exists in the project conventions. If no explicit helper exists today, add the smallest shared constant/helper needed to avoid label drift between startup and recreation.

## macOS Integration Notes

- The project already enables `tauri` with `macos-private-api`, which is compatible with keeping some behavior macOS-native
- `移动和调整大小` and `全屏幕拼贴` must remain genuine macOS-controlled menu items
- If Tauri cannot expose those items directly, use the smallest macOS-native shim needed to attach the real `NSMenuItem` entries instead of implementing app-owned approximations

## Files to Modify

| File | Action |
|------|--------|
| `src-tauri/src/menu.rs` | Modify window menu items and handlers |
| `src/App.tsx` or equivalent route owner | Persist last main-window route |
| `src/hooks/useMenuEvents.ts` | Remove obsolete `main_window` frontend-only handling |
| `src-tauri/src/lib.rs` | Modify only if main-window creation logic must be shared |

## Testing

### Manual Checks

1. Open the app and confirm the `窗口` menu shows the new custom items
2. Verify `Cmd+Shift+R` reloads the focused main window
3. Verify `Ctrl+Fn+C` centers the focused window
4. Verify `Ctrl+Fn+F` triggers the intended fill behavior
5. Navigate to a main route, close the main window, use `显示主窗口`, and confirm the recreated window opens on the last visited route
6. Confirm dialog and overlay routes are not restored as the main window destination
7. Confirm native items such as `移动和调整大小` and `全屏幕拼贴` remain OS-controlled and only appear/enable when macOS allows them

### Risk Checks

- Verify Tauri accepts the requested accelerators on macOS, especially `Ctrl+Fn+F` and `Ctrl+Fn+C`
- Verify the focused-window resolution is correct when a dialog window is active
- Verify reloading a non-main window does not break dialog-only flows

## Open Questions Resolved

- `显示主窗口` recreates the main window when missing: yes
- Recreated main window destination: restore the last visited main-page route
- `移动和调整大小` and `全屏幕拼贴`: keep them native and system-managed

## Notes

- No git commit is included in this step because the current request is to save the design to a file.
