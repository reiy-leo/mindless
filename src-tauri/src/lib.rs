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
            commands::reorder_tasks,
            commands::reorder_subtasks,
            commands::reorder_steps,
            commands::get_lists,
            commands::complete_recurring_task,
            // Lists
            commands::create_list,
            commands::update_list,
            commands::delete_list,
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
            commands::get_habit_by_id,
            commands::create_habit,
            commands::update_habit,
            commands::delete_habit,
            commands::check_in_habit,
            commands::get_habit_logs,
            commands::get_today_checkins,
            commands::refresh_habit_streaks,
            // Countdowns
            commands::get_countdowns,
            commands::get_countdown_by_id,
            commands::create_countdown,
            commands::update_countdown,
            commands::delete_countdown,
            // Settings
            commands::get_settings,
            commands::update_setting,
            commands::update_settings,
            // Notifications
            commands::get_due_tasks,
            commands::get_reminder_habits,
            commands::get_reminder_countdowns,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
