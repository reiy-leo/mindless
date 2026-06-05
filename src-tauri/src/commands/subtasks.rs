use tauri::AppHandle;
use uuid::Uuid;
use crate::db::models::Subtask;

fn get_db(app: &AppHandle) -> Result<rusqlite::Connection, String> {
    crate::db::connection::open_connection(app)
}

fn row_to_subtask(row: &rusqlite::Row) -> rusqlite::Result<Subtask> {
    Ok(Subtask {
        id: row.get(0)?,
        task_id: row.get(1)?,
        parent_subtask_id: row.get(2)?,
        title: row.get(3)?,
        is_completed: row.get::<_, i32>(4)? != 0,
        sort_order: row.get(5)?,
        level: row.get(6)?,
        created_at: row.get(7)?,
        updated_at: row.get(8)?,
    })
}

#[tauri::command]
pub async fn get_subtasks(app: AppHandle, task_id: String) -> Result<Vec<Subtask>, String> {
    let conn = get_db(&app)?;
    let mut stmt = conn.prepare("SELECT * FROM subtasks WHERE task_id = ?1 ORDER BY sort_order ASC")
        .map_err(|e| format!("Failed to prepare: {}", e))?;

    let subtasks = stmt.query_map([&task_id], row_to_subtask)
        .map_err(|e| format!("Failed to query: {}", e))?;

    let result: Result<Vec<_>, _> = subtasks.collect();
    result.map_err(|e| format!("Failed to collect: {}", e))
}

#[tauri::command]
pub async fn create_subtask(
    app: AppHandle,
    task_id: String,
    title: String,
    parent_subtask_id: Option<String>,
    level: Option<i32>,
) -> Result<Subtask, String> {
    let conn = get_db(&app)?;
    let id = Uuid::new_v4().to_string();
    let level = level.unwrap_or(0);

    let max_sort: f64 = conn.query_row(
        "SELECT COALESCE(MAX(sort_order), -1) + 1 FROM subtasks WHERE task_id = ?1",
        [&task_id],
        |row| row.get(0),
    ).unwrap_or(0.0);

    // Use proper NULL for optional foreign key
    let parent_id = parent_subtask_id.filter(|s| !s.is_empty());

    conn.execute(
        "INSERT INTO subtasks (id, task_id, parent_subtask_id, title, sort_order, level) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        rusqlite::params![id, task_id, parent_id, title, max_sort, level]
    ).map_err(|e| format!("Failed to create subtask: {}", e))?;

    let subtask = conn.query_row("SELECT * FROM subtasks WHERE id = ?1", [&id], row_to_subtask)
        .map_err(|e| format!("Failed to fetch subtask: {}", e))?;

    Ok(subtask)
}

#[tauri::command]
pub async fn update_subtask(
    app: AppHandle,
    id: String,
    title: Option<String>,
    is_completed: Option<bool>,
    sort_order: Option<f64>,
) -> Result<Subtask, String> {
    let conn = get_db(&app)?;

    if let Some(ref title) = title {
        conn.execute(
            "UPDATE subtasks SET title = ?1, updated_at = datetime('now') WHERE id = ?2",
            (title, &id)
        ).map_err(|e| format!("Failed to update subtask title: {}", e))?;
    }

    if let Some(is_completed) = is_completed {
        let completed_int: i32 = if is_completed { 1 } else { 0 };
        conn.execute(
            "UPDATE subtasks SET is_completed = ?1, updated_at = datetime('now') WHERE id = ?2",
            (&completed_int, &id)
        ).map_err(|e| format!("Failed to update subtask completion: {}", e))?;
    }

    if let Some(sort_order) = sort_order {
        conn.execute(
            "UPDATE subtasks SET sort_order = ?1, updated_at = datetime('now') WHERE id = ?2",
            (&sort_order, &id)
        ).map_err(|e| format!("Failed to update subtask sort_order: {}", e))?;
    }

    let subtask = conn.query_row("SELECT * FROM subtasks WHERE id = ?1", [&id], row_to_subtask)
        .map_err(|e| format!("Failed to fetch subtask: {}", e))?;

    Ok(subtask)
}

#[tauri::command]
pub async fn delete_subtask(app: AppHandle, id: String) -> Result<(), String> {
    let conn = get_db(&app)?;

    // Collect all descendant IDs using recursive CTE, then delete in one transaction
    let tx = conn.unchecked_transaction().map_err(|e| format!("Failed to begin transaction: {}", e))?;

    {
        let mut stmt = tx.prepare(
            "WITH RECURSIVE descendants(id) AS (
                SELECT id FROM subtasks WHERE id = ?1
                UNION ALL
                SELECT s.id FROM subtasks s INNER JOIN descendants d ON s.parent_subtask_id = d.id
            )
            DELETE FROM subtasks WHERE id IN (SELECT id FROM descendants)"
        ).map_err(|e| format!("Failed to prepare recursive delete: {}", e))?;

        stmt.execute([&id]).map_err(|e| format!("Failed to delete subtask tree: {}", e))?;
    }

    tx.commit().map_err(|e| format!("Failed to commit transaction: {}", e))?;

    Ok(())
}
