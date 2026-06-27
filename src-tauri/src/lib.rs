#![allow(unexpected_cfgs)]

mod commands;
mod db;
mod menu;

use tauri::Builder;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    Builder::default()
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
            commands::get_heatmap_data,
            commands::get_lists,
            commands::complete_recurring_task,
            commands::get_task_linked_items,
            commands::link_task_item,
            commands::unlink_task_item,
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
            commands::get_atom_tag,
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
            commands::restore_countdown,
            commands::toggle_countdown_favorite,
            commands::toggle_countdown_completed,
            commands::get_countdown_groups,
            commands::create_countdown_group,
            commands::update_countdown_group,
            commands::delete_countdown_group,
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
            commands::get_note_linked_items,
            commands::get_notes_linked_to,
            commands::link_note_item,
            commands::unlink_note_item,
            // Persons
            commands::get_person_groups,
            commands::create_person_group,
            commands::update_person_group,
            commands::delete_person_group,
            commands::get_persons,
            commands::get_all_persons,
            commands::get_person_by_id,
            commands::create_person,
            commands::update_person,
            commands::delete_person,
            commands::get_person_phones,
            commands::create_person_phone,
            commands::update_person_phone,
            commands::delete_person_phone,
            commands::get_person_emails,
            commands::create_person_email,
            commands::update_person_email,
            commands::delete_person_email,
            commands::get_person_other_names,
            commands::create_person_other_name,
            commands::update_person_other_name,
            commands::delete_person_other_name,
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
            // Sync
            commands::save_pat,
            commands::load_pat,
            commands::delete_pat,
            commands::get_db_base64,
            commands::get_app_data_dir,
            // Media
            commands::media::get_media_groups,
            commands::media::create_media_group,
            commands::media::update_media_group,
            commands::media::delete_media_group,
            commands::media::get_media_items,
            commands::media::create_media_item,
            commands::media::update_media_item,
            commands::media::delete_media_item,
            commands::media::get_media_item_details,
            commands::media::get_media_watch_history,
            commands::media::create_media_watch_history,
            commands::media::update_media_watch_history,
            commands::media::delete_media_watch_history,
            commands::media::get_media_groups_with_count,
            commands::media::get_media_item_genres,
            commands::media::update_media_item_genres,
            // Attachments
            commands::create_attachment,
            commands::get_attachments_by_task,
            commands::get_attachment_by_id,
            commands::read_file_bytes,
            commands::delete_attachment,
            commands::cache_attachment_image,
            commands::read_image_data_url,
            commands::get_all_attachments,
            commands::update_attachment_filename,
            commands::delete_attachment_local_cache,
            commands::update_attachment_sync_status,
            commands::read_clipboard_image,
            // Task Templates
            commands::get_task_templates,
            commands::get_task_template_by_id,
            commands::create_task_template,
            commands::update_task_template,
            commands::delete_task_template,
            commands::increment_template_usage,
            menu::update_menu_language,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
