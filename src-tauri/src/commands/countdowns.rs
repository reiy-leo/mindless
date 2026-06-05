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
    let mut stmt = conn.prepare("SELECT * FROM countdowns ORDER BY target_date ASC, target_time ASC")
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

    let mut sql = String::from("UPDATE countdowns SET updated_at = datetime('now')");
    let mut param_idx = 1;
    let mut params: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

    if let Some(ref v) = title {
        sql.push_str(&format!(", title = ?{}", param_idx));
        params.push(Box::new(v.clone()));
        param_idx += 1;
    }
    if let Some(ref v) = description {
        sql.push_str(&format!(", description = ?{}", param_idx));
        params.push(Box::new(v.clone()));
        param_idx += 1;
    }
    if let Some(ref v) = icon {
        sql.push_str(&format!(", icon = ?{}", param_idx));
        params.push(Box::new(v.clone()));
        param_idx += 1;
    }
    if let Some(ref v) = color {
        sql.push_str(&format!(", color = ?{}", param_idx));
        params.push(Box::new(v.clone()));
        param_idx += 1;
    }
    if let Some(ref v) = target_date {
        sql.push_str(&format!(", target_date = ?{}", param_idx));
        params.push(Box::new(v.clone()));
        param_idx += 1;
    }
    if let Some(ref v) = target_time {
        sql.push_str(&format!(", target_time = ?{}", param_idx));
        params.push(Box::new(v.clone()));
        param_idx += 1;
    }
    if let Some(ref v) = event_type {
        sql.push_str(&format!(", event_type = ?{}", param_idx));
        params.push(Box::new(v.clone()));
        param_idx += 1;
    }
    if let Some(v) = reminder_enabled {
        sql.push_str(&format!(", reminder_enabled = ?{}", param_idx));
        params.push(Box::new(if v { 1i32 } else { 0i32 }));
        param_idx += 1;
    }
    if let Some(v) = reminder_days_before {
        sql.push_str(&format!(", reminder_days_before = ?{}", param_idx));
        params.push(Box::new(v));
        param_idx += 1;
    }
    if let Some(ref v) = reminder_time {
        sql.push_str(&format!(", reminder_time = ?{}", param_idx));
        params.push(Box::new(v.clone()));
        param_idx += 1;
    }
    if let Some(v) = is_recurring {
        sql.push_str(&format!(", is_recurring = ?{}", param_idx));
        params.push(Box::new(if v { 1i32 } else { 0i32 }));
        param_idx += 1;
    }
    if let Some(ref v) = recurrence_rule {
        sql.push_str(&format!(", recurrence_rule = ?{}", param_idx));
        params.push(Box::new(v.clone()));
        param_idx += 1;
    }

    sql.push_str(&format!(" WHERE id = ?{}", param_idx));
    params.push(Box::new(id.clone()));

    let param_refs: Vec<&dyn rusqlite::types::ToSql> = params.iter().map(|p| p.as_ref()).collect();
    let mut stmt = conn.prepare(&sql).map_err(|e| format!("Failed to prepare: {}", e))?;
    stmt.execute(param_refs.as_slice())
        .map_err(|e| format!("Failed to update countdown: {}", e))?;

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
