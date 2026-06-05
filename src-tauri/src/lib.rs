mod commands;
mod db;

use tauri::Builder;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    Builder::default()
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            // Run database migrations
            let app_handle = app.handle();
            db::migrations::run_migrations(&app_handle)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Tasks
            commands::create_task,
            commands::get_tasks,
            commands::get_task_by_id,
            commands::update_task,
            commands::delete_task,
            commands::get_lists,
            // Subtasks
            commands::get_subtasks,
            commands::create_subtask,
            commands::update_subtask,
            commands::delete_subtask,
            // Steps
            commands::get_steps,
            commands::create_step,
            commands::update_step,
            commands::delete_step,
            // Tags
            commands::get_tags,
            commands::create_tag,
            commands::update_tag,
            commands::delete_tag,
            // Habits
            commands::get_habits,
            commands::create_habit,
            commands::check_in_habit,
            // Countdowns
            commands::get_countdowns,
            commands::create_countdown,
            // Settings
            commands::get_settings,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
