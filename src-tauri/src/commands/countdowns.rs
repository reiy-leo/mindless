use tauri::AppHandle;
use uuid::Uuid;
use crate::db::models::Countdown;

fn get_db(app: &AppHandle) -> Result<rusqlite::Connection, String> {
    let db_path = crate::db::connection::get_db_connection(app);
    rusqlite::Connection::open(&db_path).map_err(|e| format!("Failed to open database: {}", e))
}

#[tauri::command]
pub async fn get_countdowns(app: AppHandle) -> Result<Vec<Countdown>, String> {
    let conn = get_db(&app)?;
    let mut stmt = conn.prepare("SELECT * FROM countdowns ORDER BY target_date ASC")
        .map_err(|e| format!("Failed to prepare: {}", e))?;

    let countdowns = stmt.query_map([], |row| {
        Ok(Countdown {
            id: row.get(0)?,
            title: row.get(1)?,
            description: row.get(2)?,
            icon: row.get(3)?,
            color: row.get(4)?,
            target_date: row.get(5)?,
            target_time: row.get(6)?,
            event_type: row.get(7)?,
            reminder_enabled: row.get::<_, i32>(8)? != 0,
            reminder_days_before: row.get(9)?,
            reminder_time: row.get(10)?,
            is_recurring: row.get::<_, i32>(11)? != 0,
            recurrence_rule: row.get(12)?,
            created_at: row.get(13)?,
            updated_at: row.get(14)?,
        })
    }).map_err(|e| format!("Failed to query: {}", e))?;

    let result: Result<Vec<_>, _> = countdowns.collect();
    result.map_err(|e| format!("Failed to collect: {}", e))
}

#[tauri::command]
pub async fn create_countdown(
    app: AppHandle,
    name: String,
    target_date: String,
    reminder_enabled: Option<bool>,
) -> Result<Countdown, String> {
    let conn = get_db(&app)?;
    let id = Uuid::new_v4().to_string();
    let reminder = if reminder_enabled.unwrap_or(false) { 1 } else { 0 };

    conn.execute(
        "INSERT INTO countdowns (id, title, target_date, reminder_enabled) VALUES (?1, ?2, ?3, ?4)",
        (&id, &name, &target_date, &reminder)
    ).map_err(|e| format!("Failed to create countdown: {}", e))?;

    let countdown = conn.query_row("SELECT * FROM countdowns WHERE id = ?1", [&id], |row| {
        Ok(Countdown {
            id: row.get(0)?,
            title: row.get(1)?,
            description: row.get(2)?,
            icon: row.get(3)?,
            color: row.get(4)?,
            target_date: row.get(5)?,
            target_time: row.get(6)?,
            event_type: row.get(7)?,
            reminder_enabled: row.get::<_, i32>(8)? != 0,
            reminder_days_before: row.get(9)?,
            reminder_time: row.get(10)?,
            is_recurring: row.get::<_, i32>(11)? != 0,
            recurrence_rule: row.get(12)?,
            created_at: row.get(13)?,
            updated_at: row.get(14)?,
        })
    }).map_err(|e| format!("Failed to fetch countdown: {}", e))?;

    Ok(countdown)
}
