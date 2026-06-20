use tauri::AppHandle;
use uuid::Uuid;
use crate::db::models::{Countdown, CountdownGroup, CountdownGroupWithCount};

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
        group_id: row.get(13)?,
        is_favorite: row.get::<_, i32>(14)? != 0,
        is_completed: row.get::<_, i32>(15)? != 0,
        is_lunar: row.get::<_, i32>(16)? != 0,
        display_mode: row.get(17)?,
        deleted_at: row.get(18)?,
        created_at: row.get(19)?,
        updated_at: row.get(20)?,
    })
}

#[tauri::command]
pub async fn get_countdowns(
    app: AppHandle,
    group_id: Option<String>,
    smart_group: Option<String>,
) -> Result<Vec<Countdown>, String> {
    let conn = get_db(&app)?;

    let (where_clause, params): (String, Vec<Box<dyn rusqlite::types::ToSql>>) = match smart_group.as_deref() {
        Some("favorites") => (
            "WHERE is_favorite = 1 AND deleted_at IS NULL AND is_completed = 0".to_string(),
            vec![],
        ),
        Some("completed") => (
            "WHERE is_completed = 1 AND deleted_at IS NULL".to_string(),
            vec![],
        ),
        Some("missed") => (
            "WHERE is_completed = 0 AND deleted_at IS NULL AND target_date < date('now')".to_string(),
            vec![],
        ),
        Some("deleted") => (
            "WHERE deleted_at IS NOT NULL".to_string(),
            vec![],
        ),
        _ => {
            if let Some(ref gid) = group_id {
                (
                    "WHERE group_id = ?1 AND deleted_at IS NULL AND is_completed = 0".to_string(),
                    vec![Box::new(gid.clone()) as Box<dyn rusqlite::types::ToSql>],
                )
            } else {
                ("WHERE deleted_at IS NULL AND is_completed = 0".to_string(), vec![])
            }
        }
    };

    let sql = format!(
        "SELECT id, title, description, icon, color, target_date, target_time, event_type, reminder_enabled, reminder_days_before, reminder_time, is_recurring, recurrence_rule, group_id, is_favorite, is_completed, is_lunar, display_mode, deleted_at, created_at, updated_at FROM countdowns {} ORDER BY target_date ASC, target_time ASC",
        where_clause
    );

    let mut stmt = conn.prepare(&sql)
        .map_err(|e| format!("Failed to prepare: {}", e))?;

    let param_refs: Vec<&dyn rusqlite::types::ToSql> = params.iter().map(|p| p.as_ref()).collect();
    let countdowns = stmt.query_map(param_refs.as_slice(), row_to_countdown)
        .map_err(|e| format!("Failed to query: {}", e))?;

    let result: Result<Vec<_>, _> = countdowns.collect();
    result.map_err(|e| format!("Failed to collect: {}", e))
}

#[tauri::command]
pub async fn get_countdown_by_id(app: AppHandle, id: String) -> Result<Countdown, String> {
    let conn = get_db(&app)?;
    let countdown = conn.query_row(
        "SELECT id, title, description, icon, color, target_date, target_time, event_type, reminder_enabled, reminder_days_before, reminder_time, is_recurring, recurrence_rule, group_id, is_favorite, is_completed, is_lunar, display_mode, deleted_at, created_at, updated_at FROM countdowns WHERE id = ?1",
        [&id],
        row_to_countdown,
    ).map_err(|e| format!("Failed to fetch countdown: {}", e))?;
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
    group_id: Option<String>,
    is_lunar: Option<bool>,
    display_mode: Option<String>,
) -> Result<Countdown, String> {
    let conn = get_db(&app)?;
    let id = Uuid::new_v4().to_string();
    let reminder = if reminder_enabled.unwrap_or(false) { 1 } else { 0 };
    let recurring = if is_recurring.unwrap_or(false) { 1 } else { 0 };
    let lunar = if is_lunar.unwrap_or(false) { 1 } else { 0 };
    let icon = icon.unwrap_or_else(|| "flag".to_string());
    let color = color.unwrap_or_else(|| "#EF4444".to_string());
    let event_type = event_type.unwrap_or_else(|| "countdown".to_string());
    let display_mode = display_mode.unwrap_or_else(|| "day".to_string());

    conn.execute(
        "INSERT INTO countdowns (id, title, description, icon, color, target_date, target_time, event_type, reminder_enabled, reminder_days_before, reminder_time, is_recurring, recurrence_rule, group_id, is_lunar, display_mode) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16)",
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
            group_id,
            lunar,
            display_mode,
        ]
    ).map_err(|e| format!("Failed to create countdown: {}", e))?;

    let countdown = conn.query_row(
        "SELECT id, title, description, icon, color, target_date, target_time, event_type, reminder_enabled, reminder_days_before, reminder_time, is_recurring, recurrence_rule, group_id, is_favorite, is_completed, is_lunar, display_mode, deleted_at, created_at, updated_at FROM countdowns WHERE id = ?1",
        [&id],
        row_to_countdown,
    ).map_err(|e| format!("Failed to fetch countdown: {}", e))?;

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
    group_id: Option<String>,
    is_lunar: Option<bool>,
    display_mode: Option<String>,
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
    if let Some(ref v) = group_id {
        sql.push_str(&format!(", group_id = ?{}", param_idx));
        params.push(Box::new(v.clone()));
        param_idx += 1;
    }
    if let Some(v) = is_lunar {
        sql.push_str(&format!(", is_lunar = ?{}", param_idx));
        params.push(Box::new(if v { 1i32 } else { 0i32 }));
        param_idx += 1;
    }
    if let Some(ref v) = display_mode {
        sql.push_str(&format!(", display_mode = ?{}", param_idx));
        params.push(Box::new(v.clone()));
        param_idx += 1;
    }

    sql.push_str(&format!(" WHERE id = ?{}", param_idx));
    params.push(Box::new(id.clone()));

    let param_refs: Vec<&dyn rusqlite::types::ToSql> = params.iter().map(|p| p.as_ref()).collect();
    let mut stmt = conn.prepare(&sql).map_err(|e| format!("Failed to prepare: {}", e))?;
    stmt.execute(param_refs.as_slice())
        .map_err(|e| format!("Failed to update countdown: {}", e))?;

    let countdown = conn.query_row(
        "SELECT id, title, description, icon, color, target_date, target_time, event_type, reminder_enabled, reminder_days_before, reminder_time, is_recurring, recurrence_rule, group_id, is_favorite, is_completed, is_lunar, display_mode, deleted_at, created_at, updated_at FROM countdowns WHERE id = ?1",
        [&id],
        row_to_countdown,
    ).map_err(|e| format!("Failed to fetch countdown: {}", e))?;

    Ok(countdown)
}

#[tauri::command]
pub async fn delete_countdown(app: AppHandle, id: String) -> Result<(), String> {
    let conn = get_db(&app)?;
    conn.execute("UPDATE countdowns SET deleted_at = datetime('now'), updated_at = datetime('now') WHERE id = ?1", [&id])
        .map_err(|e| format!("Failed to delete countdown: {}", e))?;
    Ok(())
}

#[tauri::command]
pub async fn restore_countdown(app: AppHandle, id: String) -> Result<(), String> {
    let conn = get_db(&app)?;
    conn.execute("UPDATE countdowns SET deleted_at = NULL, updated_at = datetime('now') WHERE id = ?1", [&id])
        .map_err(|e| format!("Failed to restore countdown: {}", e))?;
    Ok(())
}

#[tauri::command]
pub async fn toggle_countdown_favorite(app: AppHandle, id: String) -> Result<Countdown, String> {
    let conn = get_db(&app)?;
    conn.execute("UPDATE countdowns SET is_favorite = CASE WHEN is_favorite = 1 THEN 0 ELSE 1 END, updated_at = datetime('now') WHERE id = ?1", [&id])
        .map_err(|e| format!("Failed to toggle favorite: {}", e))?;

    let countdown = conn.query_row(
        "SELECT id, title, description, icon, color, target_date, target_time, event_type, reminder_enabled, reminder_days_before, reminder_time, is_recurring, recurrence_rule, group_id, is_favorite, is_completed, is_lunar, display_mode, deleted_at, created_at, updated_at FROM countdowns WHERE id = ?1",
        [&id],
        row_to_countdown,
    ).map_err(|e| format!("Failed to fetch countdown: {}", e))?;

    Ok(countdown)
}

#[tauri::command]
pub async fn toggle_countdown_completed(app: AppHandle, id: String) -> Result<Countdown, String> {
    let conn = get_db(&app)?;
    conn.execute("UPDATE countdowns SET is_completed = CASE WHEN is_completed = 1 THEN 0 ELSE 1 END, updated_at = datetime('now') WHERE id = ?1", [&id])
        .map_err(|e| format!("Failed to toggle completed: {}", e))?;

    let countdown = conn.query_row(
        "SELECT id, title, description, icon, color, target_date, target_time, event_type, reminder_enabled, reminder_days_before, reminder_time, is_recurring, recurrence_rule, group_id, is_favorite, is_completed, is_lunar, display_mode, deleted_at, created_at, updated_at FROM countdowns WHERE id = ?1",
        [&id],
        row_to_countdown,
    ).map_err(|e| format!("Failed to fetch countdown: {}", e))?;

    Ok(countdown)
}

// ==================== Countdown Groups ====================

fn row_to_countdown_group(row: &rusqlite::Row) -> rusqlite::Result<CountdownGroup> {
    Ok(CountdownGroup {
        id: row.get(0)?,
        name: row.get(1)?,
        color: row.get(2)?,
        icon: row.get(3)?,
        is_preset: row.get::<_, i32>(4)? != 0,
        sort_order: row.get(5)?,
        created_at: row.get(6)?,
        updated_at: row.get(7)?,
    })
}

#[tauri::command]
pub async fn get_countdown_groups(app: AppHandle) -> Result<Vec<CountdownGroupWithCount>, String> {
    let conn = get_db(&app)?;
    let mut stmt = conn.prepare(
        "SELECT g.id, g.name, g.color, g.icon, g.is_preset, g.sort_order, g.created_at, g.updated_at,
                COUNT(c.id) as count
         FROM countdown_groups g
         LEFT JOIN countdowns c ON c.group_id = g.id AND c.deleted_at IS NULL
         GROUP BY g.id
         ORDER BY g.sort_order ASC"
    ).map_err(|e| format!("Failed to prepare: {}", e))?;

    let groups = stmt.query_map([], |row| {
        Ok(CountdownGroupWithCount {
            id: row.get(0)?,
            name: row.get(1)?,
            color: row.get(2)?,
            icon: row.get(3)?,
            is_preset: row.get::<_, i32>(4)? != 0,
            sort_order: row.get(5)?,
            created_at: row.get(6)?,
            updated_at: row.get(7)?,
            count: row.get(8)?,
        })
    }).map_err(|e| format!("Failed to query: {}", e))?;

    let result: Result<Vec<_>, _> = groups.collect();
    result.map_err(|e| format!("Failed to collect: {}", e))
}

#[tauri::command]
pub async fn create_countdown_group(
    app: AppHandle,
    name: String,
    color: Option<String>,
    icon: Option<String>,
) -> Result<CountdownGroup, String> {
    let conn = get_db(&app)?;
    let id = Uuid::new_v4().to_string();
    let color = color.unwrap_or_else(|| "#3B82F6".to_string());
    let icon = icon.unwrap_or_else(|| "📅".to_string());

    // Get max sort order
    let max_order: f64 = conn.query_row(
        "SELECT COALESCE(MAX(sort_order), 0) FROM countdown_groups",
        [],
        |row| row.get(0),
    ).unwrap_or(0.0);

    conn.execute(
        "INSERT INTO countdown_groups (id, name, color, icon, sort_order) VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![id, name, color, icon, max_order + 1.0],
    ).map_err(|e| format!("Failed to create group: {}", e))?;

    let group = conn.query_row(
        "SELECT id, name, color, icon, is_preset, sort_order, created_at, updated_at FROM countdown_groups WHERE id = ?1",
        [&id],
        row_to_countdown_group,
    ).map_err(|e| format!("Failed to fetch group: {}", e))?;

    Ok(group)
}

#[tauri::command]
pub async fn update_countdown_group(
    app: AppHandle,
    id: String,
    name: Option<String>,
    color: Option<String>,
    icon: Option<String>,
) -> Result<CountdownGroup, String> {
    let conn = get_db(&app)?;

    // Check if preset
    let is_preset: bool = conn.query_row(
        "SELECT is_preset FROM countdown_groups WHERE id = ?1",
        [&id],
        |row| Ok(row.get::<_, i32>(0)? != 0),
    ).map_err(|e| format!("Failed to fetch group: {}", e))?;

    if is_preset {
        return Err("Cannot modify preset group".to_string());
    }

    let mut sql = String::from("UPDATE countdown_groups SET updated_at = datetime('now')");
    let mut param_idx = 1;
    let mut params: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

    if let Some(ref v) = name {
        sql.push_str(&format!(", name = ?{}", param_idx));
        params.push(Box::new(v.clone()));
        param_idx += 1;
    }
    if let Some(ref v) = color {
        sql.push_str(&format!(", color = ?{}", param_idx));
        params.push(Box::new(v.clone()));
        param_idx += 1;
    }
    if let Some(ref v) = icon {
        sql.push_str(&format!(", icon = ?{}", param_idx));
        params.push(Box::new(v.clone()));
        param_idx += 1;
    }

    sql.push_str(&format!(" WHERE id = ?{}", param_idx));
    params.push(Box::new(id.clone()));

    let param_refs: Vec<&dyn rusqlite::types::ToSql> = params.iter().map(|p| p.as_ref()).collect();
    let mut stmt = conn.prepare(&sql).map_err(|e| format!("Failed to prepare: {}", e))?;
    stmt.execute(param_refs.as_slice())
        .map_err(|e| format!("Failed to update group: {}", e))?;

    let group = conn.query_row(
        "SELECT id, name, color, icon, is_preset, sort_order, created_at, updated_at FROM countdown_groups WHERE id = ?1",
        [&id],
        row_to_countdown_group,
    ).map_err(|e| format!("Failed to fetch group: {}", e))?;

    Ok(group)
}

#[tauri::command]
pub async fn delete_countdown_group(app: AppHandle, id: String) -> Result<(), String> {
    let conn = get_db(&app)?;

    // Check if preset
    let is_preset: bool = conn.query_row(
        "SELECT is_preset FROM countdown_groups WHERE id = ?1",
        [&id],
        |row| Ok(row.get::<_, i32>(0)? != 0),
    ).map_err(|e| format!("Failed to fetch group: {}", e))?;

    if is_preset {
        return Err("Cannot delete preset group".to_string());
    }

    // Clear group_id from countdowns in this group
    conn.execute("UPDATE countdowns SET group_id = NULL WHERE group_id = ?1", [&id])
        .map_err(|e| format!("Failed to clear group from countdowns: {}", e))?;

    // Delete the group
    conn.execute("DELETE FROM countdown_groups WHERE id = ?1", [&id])
        .map_err(|e| format!("Failed to delete group: {}", e))?;

    Ok(())
}
