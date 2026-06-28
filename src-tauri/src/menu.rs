use tauri::{
    menu::{Menu, MenuItemBuilder, PredefinedMenuItem, SubmenuBuilder},
    AppHandle, Emitter, Manager, PhysicalPosition, PhysicalRect, PhysicalSize, State, WebviewUrl,
    WebviewWindow, WebviewWindowBuilder, Wry,
};

use crate::LastMainRoute;

const MAIN_WINDOW_LABEL: &str = "main";

const MAIN_ROUTES: &[&str] = &[
    "/",
    "/tasks",
    "/habits",
    "/countdowns",
    "/tags",
    "/notes",
    "/people",
    "/media",
    "/settings",
];

fn normalize_main_route(route: &str) -> Result<String, String> {
    let normalized = if route.starts_with('/') {
        route.to_string()
    } else {
        format!("/{route}")
    };

    if MAIN_ROUTES.contains(&normalized.as_str()) {
        Ok(normalized)
    } else {
        Err(format!("invalid main route: {normalized}"))
    }
}

fn focused_window(app: &AppHandle) -> Option<WebviewWindow<Wry>> {
    app.webview_windows()
        .values()
        .find(|window| window.is_focused().unwrap_or(false))
        .cloned()
        .or_else(|| app.get_webview_window(MAIN_WINDOW_LABEL))
}

fn centered_position(
    work_area: PhysicalRect<i32, u32>,
    window_size: PhysicalSize<u32>,
) -> PhysicalPosition<i32> {
    PhysicalPosition::new(
        work_area.position.x
            + ((work_area.size.width.saturating_sub(window_size.width) / 2) as i32),
        work_area.position.y
            + ((work_area.size.height.saturating_sub(window_size.height) / 2) as i32),
    )
}

fn fill_current_monitor(window: &WebviewWindow<Wry>) -> Result<(), String> {
    let monitor = window
        .current_monitor()
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "window has no current monitor".to_string())?;
    let work_area = *monitor.work_area();

    window
        .set_position(work_area.position)
        .map_err(|e| e.to_string())?;
    window.set_size(work_area.size).map_err(|e| e.to_string())
}

fn center_in_current_monitor(window: &WebviewWindow<Wry>) -> Result<(), String> {
    let monitor = window
        .current_monitor()
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "window has no current monitor".to_string())?;
    let position = centered_position(
        *monitor.work_area(),
        window.outer_size().map_err(|e| e.to_string())?,
    );

    window.set_position(position).map_err(|e| e.to_string())
}

fn show_existing_window(window: &WebviewWindow<Wry>) -> Result<(), String> {
    let _ = window.unminimize();
    window.show().map_err(|e| e.to_string())?;
    window.set_focus().map_err(|e| e.to_string())?;
    Ok(())
}

fn main_window_restore_url(route: &str) -> WebviewUrl {
    if route == "/" {
        WebviewUrl::default()
    } else {
        WebviewUrl::App(
            format!("index.html?restorePath={}", urlencoding::encode(route)).into(),
        )
    }
}

fn build_main_window(app: &AppHandle, route: &str) -> Result<WebviewWindow<Wry>, String> {
    WebviewWindowBuilder::new(app, MAIN_WINDOW_LABEL, main_window_restore_url(route))
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

fn build_menu(app: &AppHandle, labels: Option<MenuLabels>) -> Result<Menu<Wry>, String> {
    let l = labels.unwrap_or_else(|| MenuLabels::default_zh());

    let menu = Menu::new(app).map_err(|e| e.to_string())?;

    // --- App menu ---
    let icon_bytes = include_bytes!("../icons/icon.png");
    let icon = tauri::image::Image::from_bytes(icon_bytes).ok();
    let about_metadata = tauri::menu::AboutMetadataBuilder::new()
        .name(Some("Mindless"))
        .icon(icon)
        .build();
    let about = PredefinedMenuItem::about(app, Some(&l.about), Some(about_metadata)).map_err(|e| e.to_string())?;
    let settings = MenuItemBuilder::with_id("app:preferences", &l.preferences)
        .accelerator("CmdOrCtrl+,")
        .build(app)
        .map_err(|e| e.to_string())?;
    let check_update = MenuItemBuilder::with_id("app:check_update", &l.check_update)
        .build(app)
        .map_err(|e| e.to_string())?;
    let services = PredefinedMenuItem::services(app, Some(&l.services)).map_err(|e| e.to_string())?;
    let hide = PredefinedMenuItem::hide(app, Some(&l.hide_app)).map_err(|e| e.to_string())?;
    let hide_others = PredefinedMenuItem::hide_others(app, Some(&l.hide_others)).map_err(|e| e.to_string())?;
    let quit = PredefinedMenuItem::quit(app, Some(&l.quit)).map_err(|e| e.to_string())?;
    let app_submenu = SubmenuBuilder::new(app, &l.app_menu)
        .item(&about)
        .separator()
        .item(&settings)
        .item(&check_update)
        .separator()
        .item(&services)
        .separator()
        .item(&hide)
        .item(&hide_others)
        .separator()
        .item(&quit)
        .build()
        .map_err(|e| e.to_string())?;

    // --- File menu ---
    let new_task = MenuItemBuilder::with_id("file:new_task", &l.new_task)
        .accelerator("CmdOrCtrl+N")
        .build(app)
        .map_err(|e| e.to_string())?;
    let new_note = MenuItemBuilder::with_id("file:new_note", &l.new_note)
        .accelerator("CmdOrCtrl+Shift+N")
        .build(app)
        .map_err(|e| e.to_string())?;
    let global_search = MenuItemBuilder::with_id("file:global_search", &l.global_search)
        .accelerator("CmdOrCtrl+Shift+F")
        .build(app)
        .map_err(|e| e.to_string())?;

    let file_submenu = SubmenuBuilder::new(app, &l.file_menu)
        .item(&new_task)
        .item(&new_note)
        .separator()
        .item(&global_search)
        .build()
        .map_err(|e| e.to_string())?;

    // --- Tasks submenu ---
    let priority_traditional = MenuItemBuilder::with_id("priority:3", &l.priority_traditional)
        .accelerator("CmdOrCtrl+Shift+1")
        .build(app)
        .map_err(|e| e.to_string())?;
    let priority_anoxia = MenuItemBuilder::with_id("priority:9", &l.priority_anoxia)
        .accelerator("CmdOrCtrl+Shift+2")
        .build(app)
        .map_err(|e| e.to_string())?;
    let set_date = MenuItemBuilder::with_id("task:set_date", &l.set_date)
        .build(app)
        .map_err(|e| e.to_string())?;
    let mark_completed = MenuItemBuilder::with_id("task:mark_completed", &l.mark_completed)
        .build(app)
        .map_err(|e| e.to_string())?;
    let mark_closed = MenuItemBuilder::with_id("task:mark_closed", &l.mark_closed)
        .build(app)
        .map_err(|e| e.to_string())?;
    let add_to_today = MenuItemBuilder::with_id("task:add_to_today", &l.add_to_today)
        .build(app)
        .map_err(|e| e.to_string())?;

    let priority_submenu = SubmenuBuilder::new(app, &l.priority_menu)
        .item(&priority_traditional)
        .item(&priority_anoxia)
        .build()
        .map_err(|e| e.to_string())?;

    let tasks_submenu = SubmenuBuilder::new(app, &l.tasks_menu)
        .item(&priority_submenu)
        .separator()
        .item(&set_date)
        .separator()
        .item(&mark_completed)
        .item(&mark_closed)
        .separator()
        .item(&add_to_today)
        .build()
        .map_err(|e| e.to_string())?;

    // --- Navigation submenu ---
    let nav_tasks = MenuItemBuilder::with_id("nav:tasks", &l.nav_tasks)
        .accelerator("CmdOrCtrl+Shift+T")
        .build(app)
        .map_err(|e| e.to_string())?;
    let nav_habits = MenuItemBuilder::with_id("nav:habits", &l.nav_habits)
        .accelerator("CmdOrCtrl+H")
        .build(app)
        .map_err(|e| e.to_string())?;
    let nav_countdowns = MenuItemBuilder::with_id("nav:countdowns", &l.nav_countdowns)
        .accelerator("CmdOrCtrl+D")
        .build(app)
        .map_err(|e| e.to_string())?;
    let nav_notes = MenuItemBuilder::with_id("nav:notes", &l.nav_notes)
        .build(app)
        .map_err(|e| e.to_string())?;
    let manage_tags = MenuItemBuilder::with_id("nav:manage_tags", &l.manage_tags)
        .accelerator("CmdOrCtrl+B")
        .build(app)
        .map_err(|e| e.to_string())?;
    let manage_task_templates = MenuItemBuilder::with_id("nav:manage_task_templates", &l.manage_task_templates)
        .accelerator("CmdOrCtrl+T")
        .build(app)
        .map_err(|e| e.to_string())?;
    let manage_attachments = MenuItemBuilder::with_id("nav:manage_attachments", &l.manage_attachments)
        .accelerator("CmdOrCtrl+Shift+B")
        .build(app)
        .map_err(|e| e.to_string())?;

    let nav_submenu = SubmenuBuilder::new(app, &l.nav_menu)
        .item(&nav_tasks)
        .item(&nav_habits)
        .item(&nav_countdowns)
        .item(&nav_notes)
        .separator()
        .item(&manage_tags)
        .item(&manage_task_templates)
        .item(&manage_attachments)
        .build()
        .map_err(|e| e.to_string())?;

    // --- Edit menu ---
    let edit_menu = SubmenuBuilder::new(app, &l.edit_menu)
        .item(&PredefinedMenuItem::undo(app, None).map_err(|e| e.to_string())?)
        .item(&PredefinedMenuItem::redo(app, None).map_err(|e| e.to_string())?)
        .separator()
        .item(&PredefinedMenuItem::cut(app, None).map_err(|e| e.to_string())?)
        .item(&PredefinedMenuItem::copy(app, None).map_err(|e| e.to_string())?)
        .item(&PredefinedMenuItem::paste(app, None).map_err(|e| e.to_string())?)
        .item(&PredefinedMenuItem::select_all(app, None).map_err(|e| e.to_string())?)
        .build()
        .map_err(|e| e.to_string())?;

    // --- Window menu ---
    let minimize = PredefinedMenuItem::minimize(app, Some(&l.minimize)).map_err(|e| e.to_string())?;
    let close_window = PredefinedMenuItem::close_window(app, Some(&l.close_window)).map_err(|e| e.to_string())?;
    let fullscreen = PredefinedMenuItem::fullscreen(app, Some(&l.fullscreen)).map_err(|e| e.to_string())?;
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
    let bring_all_front = PredefinedMenuItem::bring_all_to_front(app, Some(&l.bring_all_front)).map_err(|e| e.to_string())?;

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

    // --- Help menu ---
    let help_center = MenuItemBuilder::with_id("help:center", &l.help_center)
        .build(app)
        .map_err(|e| e.to_string())?;

    let help_submenu = SubmenuBuilder::new(app, &l.help_menu)
        .item(&help_center)
        .build()
        .map_err(|e| e.to_string())?;

    // --- Assemble menu in macOS order ---
    menu.prepend(&app_submenu).map_err(|e| e.to_string())?;
    menu.append(&file_submenu).map_err(|e| e.to_string())?;
    menu.append(&tasks_submenu).map_err(|e| e.to_string())?;
    menu.append(&nav_submenu).map_err(|e| e.to_string())?;
    menu.append(&edit_menu).map_err(|e| e.to_string())?;
    menu.append(&window_submenu).map_err(|e| e.to_string())?;
    menu.append(&help_submenu).map_err(|e| e.to_string())?;

    Ok(menu)
}

pub fn init_menu(app: &AppHandle) -> Result<(), String> {
    let menu = build_menu(app, None)?;
    app.set_menu(menu).map_err(|e| e.to_string())?;
    setup_menu_handler(app);
    Ok(())
}

#[tauri::command]
pub async fn set_last_main_route(route: String, state: State<'_, LastMainRoute>) -> Result<(), String> {
    let normalized = normalize_main_route(&route)?;
    let mut last_route = state
        .0
        .lock()
        .map_err(|_| "failed to lock last route state".to_string())?;
    *last_route = normalized;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::{centered_position, main_window_restore_url, normalize_main_route};
    use tauri::{PhysicalPosition, PhysicalRect, PhysicalSize, WebviewUrl};

    #[test]
    fn accepts_known_main_routes() {
        assert_eq!(normalize_main_route("/tasks").unwrap(), "/tasks");
        assert_eq!(normalize_main_route("settings").unwrap(), "/settings");
    }

    #[test]
    fn rejects_unknown_routes() {
        assert!(normalize_main_route("/settings/profile").is_err());
        assert!(normalize_main_route("unknown").is_err());
    }

    #[test]
    fn builds_restore_url_for_main_window() {
        assert!(matches!(main_window_restore_url("/"), WebviewUrl::App(_)));

        match main_window_restore_url("/notes") {
            WebviewUrl::App(path) => assert_eq!(path.to_string_lossy(), "index.html?restorePath=%2Fnotes"),
            _ => panic!("expected app url"),
        }
    }

    #[test]
    fn centers_window_inside_current_monitor_work_area() {
        let work_area = PhysicalRect {
            position: PhysicalPosition::new(-1728, 25),
            size: PhysicalSize::new(1728, 1080),
        };
        let window_size = PhysicalSize::new(1200, 800);

        assert_eq!(
            centered_position(work_area, window_size),
            PhysicalPosition::new(-1464, 165)
        );
    }
}

fn setup_menu_handler(app: &AppHandle) {
    let app_handle = app.clone();
    app.on_menu_event(move |_app, event| {
        let id = event.id().as_ref();
        match id {
            // App
            "app:check_update" => { let _ = app_handle.emit("menu:navigate", "check_update"); }
            "app:preferences" => { let _ = app_handle.emit("menu:navigate", "preferences"); }
            // File
            "file:new_task" => { let _ = app_handle.emit("menu:navigate", "new_task"); }
            "file:new_note" => { let _ = app_handle.emit("menu:navigate", "new_note"); }
            "file:global_search" => { let _ = app_handle.emit("menu:navigate", "global_search"); }
            // Task priority
            "priority:3" => { let _ = app_handle.emit("menu:priority", 3); }
            "priority:9" => { let _ = app_handle.emit("menu:priority", 9); }
            // Task actions
            "task:set_date" => { let _ = app_handle.emit("menu:task_action", "set_date"); }
            "task:mark_completed" => { let _ = app_handle.emit("menu:task_action", "mark_completed"); }
            "task:mark_closed" => { let _ = app_handle.emit("menu:task_action", "mark_closed"); }
            "task:add_to_today" => { let _ = app_handle.emit("menu:task_action", "add_to_today"); }
            // Navigation
            "nav:tasks" => { let _ = app_handle.emit("menu:navigate", "/tasks"); }
            "nav:habits" => { let _ = app_handle.emit("menu:navigate", "/habits"); }
            "nav:countdowns" => { let _ = app_handle.emit("menu:navigate", "/countdowns"); }
            "nav:notes" => { let _ = app_handle.emit("menu:navigate", "/notes"); }
            "nav:manage_tags" => { let _ = app_handle.emit("menu:navigate", "manage_tags"); }
            "nav:manage_task_templates" => { let _ = app_handle.emit("menu:navigate", "manage_task_templates"); }
            "nav:manage_attachments" => { let _ = app_handle.emit("menu:navigate", "manage_attachments"); }
            // Window
            "window:fill" => {
                if let Some(window) = focused_window(&app_handle) {
                    let _ = fill_current_monitor(&window);
                }
            }
            "window:center" => {
                if let Some(window) = focused_window(&app_handle) {
                    let _ = center_in_current_monitor(&window);
                }
            }
            "window:reload" => {
                if let Some(window) = focused_window(&app_handle) {
                    let _ = window.reload();
                }
            }
            "window:show_main" | "window:main_window" => {
                let state = app_handle.state::<LastMainRoute>();
                let _ = show_or_create_main_window(&app_handle, &state);
            }
            // Help
            "help:center" => { let _ = app_handle.emit("menu:navigate", "help_center"); }
            _ => {}
        }
    });
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
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
    pub bring_all_front: String,
    pub fullscreen: String,
    pub help_menu: String,
    pub help_center: String,
}

impl MenuLabels {
    pub fn default_zh() -> Self {
        Self {
            app_menu: "Mindless".into(),
            about: "关于 Mindless".into(),
            preferences: "偏好设置…".into(),
            check_update: "检查更新…".into(),
            services: "服务".into(),
            hide_app: "隐藏 Mindless".into(),
            hide_others: "隐藏其他".into(),
            quit: "退出 Mindless".into(),
            file_menu: "文件".into(),
            new_task: "新建任务".into(),
            new_note: "新建笔记".into(),
            global_search: "全局搜索".into(),
            tasks_menu: "任务".into(),
            priority_menu: "设置优先级".into(),
            priority_traditional: "传统 (低)".into(),
            priority_anoxia: "缺氧 (高)".into(),
            set_date: "设置日期".into(),
            mark_completed: "标记已完成".into(),
            mark_closed: "标记已关闭".into(),
            add_to_today: "添加到「今天」".into(),
            nav_menu: "导航".into(),
            nav_tasks: "切换到「任务」".into(),
            nav_habits: "切换到「习惯」".into(),
            nav_countdowns: "切换到「倒数日」".into(),
            nav_notes: "切换到「笔记」".into(),
            manage_tags: "管理「标签」".into(),
            manage_task_templates: "管理「任务模板」".into(),
            manage_attachments: "管理「附件」".into(),
            edit_menu: "编辑".into(),
            window_menu: "窗口".into(),
            minimize: "最小化".into(),
            close_window: "关闭窗口".into(),
            fill_window: "填充".into(),
            center_window: "居中".into(),
            reload_window: "重新载入".into(),
            show_main_window: "显示主窗口".into(),
            bring_all_front: "前置全部窗口".into(),
            fullscreen: "进入全屏".into(),
            help_menu: "帮助".into(),
            help_center: "帮助中心".into(),
        }
    }
}

#[tauri::command]
pub async fn update_menu_language(app: AppHandle, labels: MenuLabels) -> Result<(), String> {
    let menu = build_menu(&app, Some(labels))?;
    app.set_menu(menu).map_err(|e| e.to_string())?;
    Ok(())
}
