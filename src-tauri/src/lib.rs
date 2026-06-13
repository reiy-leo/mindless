mod commands;
mod db;

use tauri::Builder;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    Builder::default()
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_positioner::init())
        .setup(|app| {
            let app_handle = app.handle();
            db::migrations::run_migrations(&app_handle)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Tasks
            commands::create_task,
            commands::get_tasks,
            commands::get_all_tasks,
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
            commands::get_all_subtasks,
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
            commands::move_tags,
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
            commands::get_habit_groups,
            commands::create_habit_group,
            commands::update_habit_group,
            commands::delete_habit_group,
            commands::get_archived_habits,
            commands::unarchive_habit,
            commands::hard_delete_habit,
            commands::move_habit_to_group,
            commands::dissolve_habit_group,
            commands::delete_habit_group_with_habits,
            // Countdowns
            commands::get_countdowns,
            commands::get_countdown_by_id,
            commands::create_countdown,
            commands::update_countdown,
            commands::delete_countdown,
            // Notes
            commands::get_note_groups,
            commands::create_note_group,
            commands::update_note_group,
            commands::delete_note_group,
            commands::get_notes,
            commands::get_all_notes,
            commands::get_note_by_id,
            commands::get_sub_notes,
            commands::get_all_sub_notes,
            commands::create_note,
            commands::update_note,
            commands::delete_note,
            commands::archive_note,
            commands::unarchive_note,
            commands::complete_note,
            // Settings
            commands::get_settings,
            commands::update_setting,
            commands::update_settings,
            commands::get_list_settings,
            commands::save_list_settings,
            // Notifications
            commands::get_due_tasks,
            commands::get_reminder_habits,
            commands::get_reminder_countdowns,
            // Calendar Events
            commands::get_calendar_events,
            commands::get_calendar_events_by_range,
            commands::import_calendar_events,
            commands::delete_calendar_events_by_source,
            commands::clear_all_calendar_events,
            // Data Export/Import
            commands::export_all_data,
            commands::import_all_data,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
