use tauri::AppHandle;
use uuid::Uuid;
use crate::db::models::Task;

fn get_db(app: &AppHandle) -> Result<rusqlite::Connection, String> {
    crate::db::connection::open_connection(app)
}

fn row_to_task(row: &rusqlite::Row) -> rusqlite::Result<Task> {
    Ok(Task {
        id: row.get(0)?,
        title: row.get(1)?,
        description: row.get(2)?,
        is_completed: row.get::<_, i32>(3)? != 0,
        priority: row.get(4)?,
        due_date: row.get(5)?,
        due_time: row.get(6)?,
        start_date: row.get(7)?,
        reminder_time: row.get(8)?,
        recurrence_rule: row.get(9)?,
        recurrence_end_date: row.get(10)?,
        list_id: row.get(11)?,
        tag_ids: row.get(12)?,
        sort_by: row.get(13)?,
        group_by: row.get(14)?,
        created_at: row.get(15)?,
        updated_at: row.get(16)?,
        completed_at: row.get(17)?,
        deleted_at: row.get(18)?,
        sort_order: row.get(19)?,
        end_date: row.get(20)?,
        end_time: row.get(21)?,
        parent_task_id: row.get(22)?,
        level: row.get(23)?,
        status: row.get(24)?,
        visible_sections: row.get(25)?,
    })
}

#[tauri::command]
pub async fn get_subtasks(app: AppHandle, task_id: String) -> Result<Vec<Task>, String> {
    let conn = get_db(&app)?;
    let mut stmt = conn.prepare("SELECT * FROM tasks WHERE parent_task_id = ?1 AND deleted_at IS NULL ORDER BY sort_order ASC")
        .map_err(|e| format!("Failed to prepare: {}", e))?;

    let subtasks = stmt.query_map([&task_id], row_to_task)
        .map_err(|e| format!("Failed to query: {}", e))?;

    let result: Result<Vec<_>, _> = subtasks.collect();
    result.map_err(|e| format!("Failed to collect: {}", e))
}

#[tauri::command]
pub async fn get_all_subtasks(app: AppHandle, task_ids: Vec<String>) -> Result<Vec<Task>, String> {
    let conn = get_db(&app)?;
    if task_ids.is_empty() {
        return Ok(vec![]);
    }

    // Build query: get all descendants of the given task IDs
    let placeholders: Vec<String> = task_ids.iter().enumerate().map(|(i, _)| format!("?{}", i + 1)).collect();
    let sql = format!(
        "SELECT * FROM tasks WHERE parent_task_id IN ({}) AND deleted_at IS NULL ORDER BY sort_order ASC",
        placeholders.join(", ")
    );

    let mut stmt = conn.prepare(&sql).map_err(|e| format!("Failed to prepare: {}", e))?;
    let params: Vec<&dyn rusqlite::types::ToSql> = task_ids.iter().map(|id| id as &dyn rusqlite::types::ToSql).collect();
    let subtasks = stmt.query_map(params.as_slice(), row_to_task)
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
) -> Result<Task, String> {
    let conn = get_db(&app)?;
    let id = Uuid::new_v4().to_string();
    let parent_id = parent_subtask_id.clone().filter(|s| !s.is_empty()).unwrap_or(task_id.clone());
    let level = level.unwrap_or(0);

    // Inherit list_id from root task
    let list_id: Option<String> = conn.query_row(
        "SELECT list_id FROM tasks WHERE id = ?1",
        [&task_id],
        |row| row.get(0),
    ).ok();

    // Calculate sort_order within siblings
    let max_sort: f64 = conn.query_row(
        "SELECT COALESCE(MAX(sort_order), -1) + 1 FROM tasks WHERE parent_task_id = ?1 AND deleted_at IS NULL",
        [&parent_id],
        |row| row.get(0),
    ).unwrap_or(0.0);

    conn.execute(
        "INSERT INTO tasks (id, title, description, priority, list_id, sort_order, parent_task_id, level) VALUES (?1, ?2, '', 0, ?3, ?4, ?5, ?6)",
        rusqlite::params![id, title, list_id, max_sort, parent_id, level],
    ).map_err(|e| format!("Failed to create subtask: {}", e))?;

    let task = conn.query_row("SELECT * FROM tasks WHERE id = ?1", [&id], row_to_task)
        .map_err(|e| format!("Failed to fetch subtask: {}", e))?;

    Ok(task)
}

#[tauri::command]
pub async fn update_subtask(
    app: AppHandle,
    id: String,
    title: Option<String>,
    is_completed: Option<bool>,
    sort_order: Option<f64>,
    _task_id: Option<String>,
) -> Result<Task, String> {
    let conn = get_db(&app)?;

    if let Some(ref title) = title {
        conn.execute(
            "UPDATE tasks SET title = ?1, updated_at = datetime('now') WHERE id = ?2",
            (title, &id)
        ).map_err(|e| format!("Failed to update subtask title: {}", e))?;
    }

    if let Some(is_completed) = is_completed {
        let completed_int: i32 = if is_completed { 1 } else { 0 };
        conn.execute(
            "UPDATE tasks SET is_completed = ?1, status = CASE WHEN ?1 = 1 THEN 'completed' ELSE 'pending' END, completed_at = CASE WHEN ?1 = 1 THEN strftime('%Y-%m-%d %H:%M:%f', 'now') ELSE NULL END, updated_at = datetime('now') WHERE id = ?2",
            (completed_int, &id)
        ).map_err(|e| format!("Failed to update subtask completion: {}", e))?;
    }

    if let Some(sort_order) = sort_order {
        conn.execute(
            "UPDATE tasks SET sort_order = ?1, updated_at = datetime('now') WHERE id = ?2",
            (&sort_order, &id)
        ).map_err(|e| format!("Failed to update subtask sort_order: {}", e))?;
    }

    let task = conn.query_row("SELECT * FROM tasks WHERE id = ?1", [&id], row_to_task)
        .map_err(|e| format!("Failed to fetch subtask: {}", e))?;

    Ok(task)
}

#[tauri::command]
pub async fn delete_subtask(app: AppHandle, id: String, _task_id: Option<String>) -> Result<(), String> {
    let conn = get_db(&app)?;

    // Recursively soft-delete subtask and all descendants
    conn.execute(
        "WITH RECURSIVE descendants(id) AS (
            SELECT id FROM tasks WHERE id = ?1
            UNION ALL
            SELECT t.id FROM tasks t INNER JOIN descendants d ON t.parent_task_id = d.id
        )
        UPDATE tasks SET deleted_at = datetime('now'), updated_at = datetime('now')
        WHERE id IN (SELECT id FROM descendants)",
        [&id]
    ).map_err(|e| format!("Failed to delete subtask: {}", e))?;

    Ok(())
}
