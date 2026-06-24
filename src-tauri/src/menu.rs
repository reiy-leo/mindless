use tauri::{
    menu::{Menu, MenuItemBuilder, PredefinedMenuItem, SubmenuBuilder},
    AppHandle, Emitter, Wry,
};

fn build_menu(app: &AppHandle, labels: Option<MenuLabels>) -> Result<Menu<Wry>, String> {
    let l = labels.unwrap_or_else(|| MenuLabels::default_zh());

    let menu = Menu::new(app).map_err(|e| e.to_string())?;

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
        .accelerator("CmdOrCtrl+T")
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

    // --- App menu ---
    let quit = PredefinedMenuItem::quit(app, Some(&l.quit)).map_err(|e| e.to_string())?;
    let app_submenu = SubmenuBuilder::new(app, &l.app_menu)
        .item(&quit)
        .build()
        .map_err(|e| e.to_string())?;

    menu.prepend(&app_submenu).map_err(|e| e.to_string())?;
    menu.append(&tasks_submenu).map_err(|e| e.to_string())?;
    menu.append(&nav_submenu).map_err(|e| e.to_string())?;
    menu.append(&edit_menu).map_err(|e| e.to_string())?;

    Ok(menu)
}

pub fn init_menu(app: &AppHandle) -> Result<(), String> {
    let menu = build_menu(app, None)?;
    app.set_menu(menu).map_err(|e| e.to_string())?;
    setup_menu_handler(app);
    Ok(())
}

fn setup_menu_handler(app: &AppHandle) {
    let app_handle = app.clone();
    app.on_menu_event(move |_app, event| {
        let id = event.id().as_ref();
        match id {
            "priority:3" => { let _ = app_handle.emit("menu:priority", 3); }
            "priority:9" => { let _ = app_handle.emit("menu:priority", 9); }
            "task:set_date" => { let _ = app_handle.emit("menu:task_action", "set_date"); }
            "task:mark_completed" => { let _ = app_handle.emit("menu:task_action", "mark_completed"); }
            "task:mark_closed" => { let _ = app_handle.emit("menu:task_action", "mark_closed"); }
            "task:add_to_today" => { let _ = app_handle.emit("menu:task_action", "add_to_today"); }
            "nav:tasks" => { let _ = app_handle.emit("menu:navigate", "/tasks"); }
            "nav:habits" => { let _ = app_handle.emit("menu:navigate", "/habits"); }
            "nav:countdowns" => { let _ = app_handle.emit("menu:navigate", "/countdowns"); }
            "nav:notes" => { let _ = app_handle.emit("menu:navigate", "/notes"); }
            "nav:manage_tags" => { let _ = app_handle.emit("menu:navigate", "manage_tags"); }
            "nav:manage_attachments" => { let _ = app_handle.emit("menu:navigate", "manage_attachments"); }
            _ => {}
        }
    });
}

#[derive(serde::Deserialize)]
pub struct MenuLabels {
    pub app_menu: String,
    pub quit: String,
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
    pub manage_attachments: String,
    pub edit_menu: String,
}

impl MenuLabels {
    pub fn default_zh() -> Self {
        Self {
            app_menu: "Mindless".into(),
            quit: "退出 Mindless".into(),
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
            manage_attachments: "管理「附件」".into(),
            edit_menu: "编辑".into(),
        }
    }
}

#[tauri::command]
pub async fn update_menu_language(app: AppHandle, labels: MenuLabels) -> Result<(), String> {
    let menu = build_menu(&app, Some(labels))?;
    app.set_menu(menu).map_err(|e| e.to_string())?;
    setup_menu_handler(&app);
    Ok(())
}
