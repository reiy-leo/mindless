use tauri::AppHandle;
use uuid::Uuid;
use crate::db::models::Habit;

fn get_db(app: &AppHandle) -> Result<rusqlite::Connection, String> {
    let db_path = crate::db::connection::get_db_connection(app);
    rusqlite::Connection::open(&db_path).map_err(|e| format!("Failed to open database: {}", e))
}

#[tauri::command]
pub async fn get_habits(app: AppHandle) -> Result<Vec<Habit>, String> {
    let conn = get_db(&app)?;
    let mut stmt = conn.prepare("SELECT * FROM habits WHERE archived_at IS NULL ORDER BY created_at DESC")
        .map_err(|e| format!("Failed to prepare: {}", e))?;

    let habits = stmt.query_map([], |row| {
        Ok(Habit {
            id: row.get(0)?,
            name: row.get(1)?,
            description: row.get(2)?,
            icon: row.get(3)?,
            color: row.get(4)?,
            target_type: row.get(5)?,
            target_value: row.get(6)?,
            frequency: row.get(7)?,
            frequency_days: row.get(8)?,
            reminder_time: row.get(9)?,
            reminder_enabled: row.get::<_, i32>(10)? != 0,
            current_streak: row.get(11)?,
            longest_streak: row.get(12)?,
            total_completions: row.get(13)?,
            start_date: row.get(14)?,
            created_at: row.get(15)?,
            updated_at: row.get(16)?,
            archived_at: row.get(17)?,
        })
    }).map_err(|e| format!("Failed to query: {}", e))?;

    let result: Result<Vec<_>, _> = habits.collect();
    result.map_err(|e| format!("Failed to collect: {}", e))
}

#[tauri::command]
pub async fn create_habit(
    app: AppHandle,
    name: String,
    frequency: Option<String>,
    reminder_enabled: Option<bool>,
) -> Result<Habit, String> {
    let conn = get_db(&app)?;
    let id = Uuid::new_v4().to_string();
    let frequency = frequency.unwrap_or_else(|| "daily".to_string());
    let reminder = if reminder_enabled.unwrap_or(false) { 1 } else { 0 };

    conn.execute(
        "INSERT INTO habits (id, name, frequency, reminder_enabled, start_date, current_streak, longest_streak, total_completions) VALUES (?1, ?2, ?3, ?4, date('now'), 0, 0, 0)",
        (&id, &name, &frequency, &reminder)
    ).map_err(|e| format!("Failed to create habit: {}", e))?;

    let habit = conn.query_row("SELECT * FROM habits WHERE id = ?1", [&id], |row| {
        Ok(Habit {
            id: row.get(0)?,
            name: row.get(1)?,
            description: row.get(2)?,
            icon: row.get(3)?,
            color: row.get(4)?,
            target_type: row.get(5)?,
            target_value: row.get(6)?,
            frequency: row.get(7)?,
            frequency_days: row.get(8)?,
            reminder_time: row.get(9)?,
            reminder_enabled: row.get::<_, i32>(10)? != 0,
            current_streak: row.get(11)?,
            longest_streak: row.get(12)?,
            total_completions: row.get(13)?,
            start_date: row.get(14)?,
            created_at: row.get(15)?,
            updated_at: row.get(16)?,
            archived_at: row.get(17)?,
        })
    }).map_err(|e| format!("Failed to fetch habit: {}", e))?;

    Ok(habit)
}

#[tauri::command]
pub async fn check_in_habit(app: AppHandle, habit_id: String, date: String) -> Result<(), String> {
    let conn = get_db(&app)?;
    conn.execute(
        "INSERT OR REPLACE INTO habit_logs (habit_id, log_date, completed, value) VALUES (?1, ?2, 1, 1)",
        (&habit_id, &date)
    ).map_err(|e| format!("Failed to check in: {}", e))?;
    Ok(())
}
