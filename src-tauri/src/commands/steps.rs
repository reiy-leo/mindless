use tauri::AppHandle;
use uuid::Uuid;
use crate::db::models::Step;

fn get_db(app: &AppHandle) -> Result<rusqlite::Connection, String> {
    crate::db::connection::open_connection(app)
}

fn row_to_step(row: &rusqlite::Row) -> rusqlite::Result<Step> {
    Ok(Step {
        id: row.get(0)?,
        task_id: row.get(1)?,
        description: row.get(2)?,
        due_date: row.get(3)?,
        due_time: row.get(4)?,
        is_completed: row.get::<_, i32>(5)? != 0,
        sort_order: row.get(6)?,
        created_at: row.get(7)?,
        updated_at: row.get(8)?,
    })
}

#[tauri::command]
pub async fn get_steps(app: AppHandle, task_id: String) -> Result<Vec<Step>, String> {
    let conn = get_db(&app)?;
    let mut stmt = conn.prepare("SELECT * FROM steps WHERE task_id = ?1 ORDER BY sort_order ASC")
        .map_err(|e| format!("Failed to prepare: {}", e))?;

    let steps = stmt.query_map([&task_id], row_to_step)
        .map_err(|e| format!("Failed to query: {}", e))?;

    let result: Result<Vec<_>, _> = steps.collect();
    result.map_err(|e| format!("Failed to collect: {}", e))
}

#[tauri::command]
pub async fn create_step(
    app: AppHandle,
    task_id: String,
    description: String,
    due_date: Option<String>,
    due_time: Option<String>,
) -> Result<Step, String> {
    let conn = get_db(&app)?;
    let id = Uuid::new_v4().to_string();

    let max_sort: f64 = conn.query_row(
        "SELECT COALESCE(MAX(sort_order), -1) + 1 FROM steps WHERE task_id = ?1",
        [&task_id],
        |row| row.get(0),
    ).unwrap_or(0.0);

    conn.execute(
        "INSERT INTO steps (id, task_id, description, due_date, due_time, sort_order) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        (&id, &task_id, &description, due_date.as_deref().unwrap_or(""), due_time.as_deref().unwrap_or(""), &max_sort)
    ).map_err(|e| format!("Failed to create step: {}", e))?;

    let step = conn.query_row("SELECT * FROM steps WHERE id = ?1", [&id], row_to_step)
        .map_err(|e| format!("Failed to fetch step: {}", e))?;

    Ok(step)
}

#[tauri::command]
pub async fn update_step(
    app: AppHandle,
    id: String,
    description: Option<String>,
    due_date: Option<String>,
    due_time: Option<String>,
    is_completed: Option<bool>,
    sort_order: Option<f64>,
) -> Result<Step, String> {
    let conn = get_db(&app)?;

    if let Some(ref description) = description {
        conn.execute(
            "UPDATE steps SET description = ?1, updated_at = datetime('now') WHERE id = ?2",
            (description, &id)
        ).map_err(|e| format!("Failed to update step description: {}", e))?;
    }

    if let Some(ref due_date) = due_date {
        conn.execute(
            "UPDATE steps SET due_date = ?1, updated_at = datetime('now') WHERE id = ?2",
            (due_date, &id)
        ).map_err(|e| format!("Failed to update step due_date: {}", e))?;
    }

    if let Some(ref due_time) = due_time {
        conn.execute(
            "UPDATE steps SET due_time = ?1, updated_at = datetime('now') WHERE id = ?2",
            (due_time, &id)
        ).map_err(|e| format!("Failed to update step due_time: {}", e))?;
    }

    if let Some(is_completed) = is_completed {
        let completed_int: i32 = if is_completed { 1 } else { 0 };
        conn.execute(
            "UPDATE steps SET is_completed = ?1, updated_at = datetime('now') WHERE id = ?2",
            (&completed_int, &id)
        ).map_err(|e| format!("Failed to update step completion: {}", e))?;
    }

    if let Some(sort_order) = sort_order {
        conn.execute(
            "UPDATE steps SET sort_order = ?1, updated_at = datetime('now') WHERE id = ?2",
            (&sort_order, &id)
        ).map_err(|e| format!("Failed to update step sort_order: {}", e))?;
    }

    let step = conn.query_row("SELECT * FROM steps WHERE id = ?1", [&id], row_to_step)
        .map_err(|e| format!("Failed to fetch step: {}", e))?;

    Ok(step)
}

#[tauri::command]
pub async fn delete_step(app: AppHandle, id: String) -> Result<(), String> {
    let conn = get_db(&app)?;

    conn.execute("DELETE FROM steps WHERE id = ?1", [&id])
        .map_err(|e| format!("Failed to delete step: {}", e))?;

    Ok(())
}
