use tauri::AppHandle;
use uuid::Uuid;
use crate::db::models::{Task, List};

fn get_db(app: &AppHandle) -> Result<rusqlite::Connection, String> {
    crate::db::connection::open_connection(app)
}

/// Convert None or empty-string Options to proper SQL NULL
fn opt_str(opt: &Option<String>) -> Option<&str> {
    opt.as_deref().filter(|s| !s.is_empty())
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
    })
}

#[tauri::command]
pub async fn create_task(
    app: AppHandle,
    title: String,
    description: Option<String>,
    priority: Option<i32>,
    due_date: Option<String>,
    due_time: Option<String>,
    start_date: Option<String>,
    list_id: Option<String>,
    tag_ids: Option<String>,
) -> Result<Task, String> {
    let conn = get_db(&app)?;
    let id = Uuid::new_v4().to_string();
    let priority = priority.unwrap_or(0);

    conn.execute(
        "INSERT INTO tasks (id, title, description, priority, due_date, due_time, start_date, list_id, tag_ids) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        rusqlite::params![
            &id,
            &title,
            description.as_deref().unwrap_or(""),
            &priority,
            opt_str(&due_date),
            opt_str(&due_time),
            opt_str(&start_date),
            opt_str(&list_id),
            opt_str(&tag_ids),
        ]
    ).map_err(|e| format!("Failed to create task: {}", e))?;

    let task = conn.query_row("SELECT * FROM tasks WHERE id = ?1", [&id], row_to_task)
        .map_err(|e| format!("Failed to fetch task: {}", e))?;

    Ok(task)
}

#[tauri::command]
pub async fn get_tasks(app: AppHandle) -> Result<Vec<Task>, String> {
    let conn = get_db(&app)?;

    let mut stmt = conn.prepare("SELECT * FROM tasks WHERE deleted_at IS NULL ORDER BY sort_order ASC, due_date ASC")
        .map_err(|e| format!("Failed to prepare: {}", e))?;

    let tasks = stmt.query_map([], row_to_task)
        .map_err(|e| format!("Failed to query: {}", e))?;

    let result: Result<Vec<_>, _> = tasks.collect();
    result.map_err(|e| format!("Failed to collect: {}", e))
}

#[tauri::command]
pub async fn get_task_by_id(app: AppHandle, id: String) -> Result<Task, String> {
    let conn = get_db(&app)?;

    let task = conn.query_row("SELECT * FROM tasks WHERE id = ?1 AND deleted_at IS NULL", [&id], row_to_task)
        .map_err(|e| format!("Failed to fetch task: {}", e))?;

    Ok(task)
}

#[tauri::command]
pub async fn update_task(
    app: AppHandle,
    id: String,
    title: Option<String>,
    description: Option<String>,
    is_completed: Option<bool>,
    priority: Option<i32>,
    due_date: Option<String>,
    due_time: Option<String>,
    start_date: Option<String>,
    list_id: Option<String>,
    tag_ids: Option<String>,
) -> Result<Task, String> {
    let conn = get_db(&app)?;

    // Normalize empty strings to None for FK-safe optional fields
    let list_id = list_id.filter(|s| !s.is_empty());
    let due_date = due_date.filter(|s| !s.is_empty());
    let due_time = due_time.filter(|s| !s.is_empty());
    let start_date = start_date.filter(|s| !s.is_empty());
    let tag_ids = tag_ids.filter(|s| !s.is_empty());

    let mut updates: Vec<String> = Vec::new();
    let mut param_idx = 1;

    // Build dynamic UPDATE query
    let mut sql = String::from("UPDATE tasks SET updated_at = datetime('now')");

    if title.is_some() {
        sql.push_str(&format!(", title = ?{}", param_idx));
        updates.push("title".to_string());
        param_idx += 1;
    }
    if description.is_some() {
        sql.push_str(&format!(", description = ?{}", param_idx));
        updates.push("description".to_string());
        param_idx += 1;
    }
    if is_completed.is_some() {
        sql.push_str(&format!(", is_completed = ?{}, completed_at = CASE WHEN ?{} = 1 THEN datetime('now') ELSE NULL END", param_idx, param_idx));
        updates.push("is_completed".to_string());
        param_idx += 1;
    }
    if priority.is_some() {
        sql.push_str(&format!(", priority = ?{}", param_idx));
        updates.push("priority".to_string());
        param_idx += 1;
    }
    if due_date.is_some() {
        sql.push_str(&format!(", due_date = ?{}", param_idx));
        updates.push("due_date".to_string());
        param_idx += 1;
    }
    if due_time.is_some() {
        sql.push_str(&format!(", due_time = ?{}", param_idx));
        updates.push("due_time".to_string());
        param_idx += 1;
    }
    if start_date.is_some() {
        sql.push_str(&format!(", start_date = ?{}", param_idx));
        updates.push("start_date".to_string());
        param_idx += 1;
    }
    if list_id.is_some() {
        sql.push_str(&format!(", list_id = ?{}", param_idx));
        updates.push("list_id".to_string());
        param_idx += 1;
    }
    if tag_ids.is_some() {
        sql.push_str(&format!(", tag_ids = ?{}", param_idx));
        updates.push("tag_ids".to_string());
        param_idx += 1;
    }

    sql.push_str(&format!(" WHERE id = ?{}", param_idx));

    // Bind parameters dynamically
    let mut stmt = conn.prepare(&sql).map_err(|e| format!("Failed to prepare: {}", e))?;

    let mut params: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

    if let Some(ref v) = title { params.push(Box::new(v.clone())); }
    if let Some(ref v) = description { params.push(Box::new(v.clone())); }
    if let Some(v) = is_completed { params.push(Box::new(if v { 1i32 } else { 0i32 })); }
    if let Some(v) = priority { params.push(Box::new(v)); }
    if let Some(ref v) = due_date { params.push(Box::new(v.clone())); }
    if let Some(ref v) = due_time { params.push(Box::new(v.clone())); }
    if let Some(ref v) = start_date { params.push(Box::new(v.clone())); }
    if let Some(ref v) = list_id { params.push(Box::new(v.clone())); }
    if let Some(ref v) = tag_ids { params.push(Box::new(v.clone())); }
    params.push(Box::new(id.clone()));

    let param_refs: Vec<&dyn rusqlite::types::ToSql> = params.iter().map(|p| p.as_ref()).collect();
    stmt.execute(param_refs.as_slice())
        .map_err(|e| format!("Failed to update task: {}", e))?;

    let task = conn.query_row("SELECT * FROM tasks WHERE id = ?1", [&id], row_to_task)
        .map_err(|e| format!("Failed to fetch task: {}", e))?;

    Ok(task)
}

#[tauri::command]
pub async fn delete_task(app: AppHandle, id: String) -> Result<(), String> {
    let conn = get_db(&app)?;

    // Soft delete: set deleted_at timestamp
    conn.execute(
        "UPDATE tasks SET deleted_at = datetime('now'), updated_at = datetime('now') WHERE id = ?1",
        [&id]
    ).map_err(|e| format!("Failed to delete task: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn get_lists(app: AppHandle) -> Result<Vec<List>, String> {
    let conn = get_db(&app)?;

    let mut stmt = conn.prepare("SELECT * FROM lists ORDER BY sort_order ASC")
        .map_err(|e| format!("Failed to prepare: {}", e))?;

    let lists = stmt.query_map([], |row| {
        Ok(List {
            id: row.get(0)?,
            name: row.get(1)?,
            color: row.get(2)?,
            icon: row.get(3)?,
            sort_order: row.get(4)?,
            created_at: row.get(5)?,
            updated_at: row.get(6)?,
        })
    }).map_err(|e| format!("Failed to query: {}", e))?;

    let result: Result<Vec<_>, _> = lists.collect();
    result.map_err(|e| format!("Failed to collect: {}", e))
}
