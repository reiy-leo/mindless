use tauri::AppHandle;
use uuid::Uuid;
use crate::db::models::Countdown;

fn get_db(app: &AppHandle) -> Result<rusqlite::Connection, String> {
    crate::db::connection::open_connection(app)
}

fn row_to_countdown(row: &rusqlite::Row) -> rusqlite::Result<Countdown> {
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
}

#[tauri::command]
pub async fn get_countdowns(app: AppHandle) -> Result<Vec<Countdown>, String> {
    let conn = get_db(&app)?;
    let mut stmt = conn.prepare("SELECT * FROM countdowns ORDER BY target_date ASC")
        .map_err(|e| format!("Failed to prepare: {}", e))?;

    let countdowns = stmt.query_map([], row_to_countdown)
        .map_err(|e| format!("Failed to query: {}", e))?;

    let result: Result<Vec<_>, _> = countdowns.collect();
    result.map_err(|e| format!("Failed to collect: {}", e))
}

#[tauri::command]
pub async fn get_countdown_by_id(app: AppHandle, id: String) -> Result<Countdown, String> {
    let conn = get_db(&app)?;
    let countdown = conn.query_row("SELECT * FROM countdowns WHERE id = ?1", [&id], row_to_countdown)
        .map_err(|e| format!("Failed to fetch countdown: {}", e))?;
    Ok(countdown)
}

#[tauri::command]
pub async fn create_countdown(
    app: AppHandle,
    title: String,
    description: Option<String>,
    icon: Option<String>,
    color: Option<String>,
    target_date: String,
    target_time: Option<String>,
    event_type: Option<String>,
    reminder_enabled: Option<bool>,
    reminder_days_before: Option<i32>,
    reminder_time: Option<String>,
    is_recurring: Option<bool>,
    recurrence_rule: Option<String>,
) -> Result<Countdown, String> {
    let conn = get_db(&app)?;
    let id = Uuid::new_v4().to_string();
    let reminder = if reminder_enabled.unwrap_or(false) { 1 } else { 0 };
    let recurring = if is_recurring.unwrap_or(false) { 1 } else { 0 };
    let icon = icon.unwrap_or_else(|| "flag".to_string());
    let color = color.unwrap_or_else(|| "#EF4444".to_string());
    let event_type = event_type.unwrap_or_else(|| "countdown".to_string());

    conn.execute(
        "INSERT INTO countdowns (id, title, description, icon, color, target_date, target_time, event_type, reminder_enabled, reminder_days_before, reminder_time, is_recurring, recurrence_rule) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
        rusqlite::params![
            id,
            title,
            description.as_deref().unwrap_or(""),
            icon,
            color,
            target_date,
            target_time.as_deref().unwrap_or(""),
            event_type,
            reminder,
            reminder_days_before.unwrap_or(0),
            reminder_time.as_deref().unwrap_or(""),
            recurring,
            recurrence_rule.as_deref().unwrap_or(""),
        ]
    ).map_err(|e| format!("Failed to create countdown: {}", e))?;

    let countdown = conn.query_row("SELECT * FROM countdowns WHERE id = ?1", [&id], row_to_countdown)
        .map_err(|e| format!("Failed to fetch countdown: {}", e))?;

    Ok(countdown)
}

#[tauri::command]
pub async fn update_countdown(
    app: AppHandle,
    id: String,
    title: Option<String>,
    description: Option<String>,
    icon: Option<String>,
    color: Option<String>,
    target_date: Option<String>,
    target_time: Option<String>,
    event_type: Option<String>,
    reminder_enabled: Option<bool>,
    reminder_days_before: Option<i32>,
    reminder_time: Option<String>,
    is_recurring: Option<bool>,
    recurrence_rule: Option<String>,
) -> Result<Countdown, String> {
    let conn = get_db(&app)?;

    if let Some(ref title) = title {
        conn.execute("UPDATE countdowns SET title = ?1, updated_at = datetime('now') WHERE id = ?2", (title, &id))
            .map_err(|e| format!("Failed to update title: {}", e))?;
    }
    if let Some(ref description) = description {
        conn.execute("UPDATE countdowns SET description = ?1, updated_at = datetime('now') WHERE id = ?2", (description, &id))
            .map_err(|e| format!("Failed to update description: {}", e))?;
    }
    if let Some(ref icon) = icon {
        conn.execute("UPDATE countdowns SET icon = ?1, updated_at = datetime('now') WHERE id = ?2", (icon, &id))
            .map_err(|e| format!("Failed to update icon: {}", e))?;
    }
    if let Some(ref color) = color {
        conn.execute("UPDATE countdowns SET color = ?1, updated_at = datetime('now') WHERE id = ?2", (color, &id))
            .map_err(|e| format!("Failed to update color: {}", e))?;
    }
    if let Some(ref target_date) = target_date {
        conn.execute("UPDATE countdowns SET target_date = ?1, updated_at = datetime('now') WHERE id = ?2", (target_date, &id))
            .map_err(|e| format!("Failed to update target_date: {}", e))?;
    }
    if let Some(ref target_time) = target_time {
        conn.execute("UPDATE countdowns SET target_time = ?1, updated_at = datetime('now') WHERE id = ?2", (target_time, &id))
            .map_err(|e| format!("Failed to update target_time: {}", e))?;
    }
    if let Some(ref event_type) = event_type {
        conn.execute("UPDATE countdowns SET event_type = ?1, updated_at = datetime('now') WHERE id = ?2", (event_type, &id))
            .map_err(|e| format!("Failed to update event_type: {}", e))?;
    }
    if let Some(reminder_enabled) = reminder_enabled {
        let val: i32 = if reminder_enabled { 1 } else { 0 };
        conn.execute("UPDATE countdowns SET reminder_enabled = ?1, updated_at = datetime('now') WHERE id = ?2", (&val, &id))
            .map_err(|e| format!("Failed to update reminder: {}", e))?;
    }
    if let Some(reminder_days_before) = reminder_days_before {
        conn.execute("UPDATE countdowns SET reminder_days_before = ?1, updated_at = datetime('now') WHERE id = ?2", (&reminder_days_before, &id))
            .map_err(|e| format!("Failed to update reminder_days: {}", e))?;
    }
    if let Some(ref reminder_time) = reminder_time {
        conn.execute("UPDATE countdowns SET reminder_time = ?1, updated_at = datetime('now') WHERE id = ?2", (reminder_time, &id))
            .map_err(|e| format!("Failed to update reminder_time: {}", e))?;
    }
    if let Some(is_recurring) = is_recurring {
        let val: i32 = if is_recurring { 1 } else { 0 };
        conn.execute("UPDATE countdowns SET is_recurring = ?1, updated_at = datetime('now') WHERE id = ?2", (&val, &id))
            .map_err(|e| format!("Failed to update recurring: {}", e))?;
    }
    if let Some(ref recurrence_rule) = recurrence_rule {
        conn.execute("UPDATE countdowns SET recurrence_rule = ?1, updated_at = datetime('now') WHERE id = ?2", (recurrence_rule, &id))
            .map_err(|e| format!("Failed to update recurrence_rule: {}", e))?;
    }

    let countdown = conn.query_row("SELECT * FROM countdowns WHERE id = ?1", [&id], row_to_countdown)
        .map_err(|e| format!("Failed to fetch countdown: {}", e))?;

    Ok(countdown)
}

#[tauri::command]
pub async fn delete_countdown(app: AppHandle, id: String) -> Result<(), String> {
    let conn = get_db(&app)?;
    conn.execute("DELETE FROM countdowns WHERE id = ?1", [&id])
        .map_err(|e| format!("Failed to delete countdown: {}", e))?;
    Ok(())
}
