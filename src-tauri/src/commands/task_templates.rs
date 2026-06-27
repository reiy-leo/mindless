use tauri::AppHandle;
use uuid::Uuid;
use crate::db::models::TaskTemplate;

fn get_db(app: &AppHandle) -> Result<rusqlite::Connection, String> {
    crate::db::connection::open_connection(app)
}

fn row_to_task_template(row: &rusqlite::Row) -> rusqlite::Result<TaskTemplate> {
    Ok(TaskTemplate {
        id: row.get(0)?,
        name: row.get(1)?,
        title: row.get(2)?,
        description: row.get(3)?,
        steps: row.get(4)?,
        tag_ids: row.get(5)?,
        usage_count: row.get(6)?,
        created_at: row.get(7)?,
        updated_at: row.get(8)?,
    })
}

#[tauri::command]
pub async fn get_task_templates(app: AppHandle) -> Result<Vec<TaskTemplate>, String> {
    let conn = get_db(&app)?;
    let mut stmt = conn
        .prepare("SELECT id, name, title, description, steps, tag_ids, usage_count, created_at, updated_at FROM task_templates ORDER BY usage_count DESC, created_at DESC")
        .map_err(|e| format!("Failed to prepare: {}", e))?;
    let templates = stmt
        .query_map([], row_to_task_template)
        .map_err(|e| format!("Failed to query: {}", e))?;
    let result: Result<Vec<_>, _> = templates.collect();
    result.map_err(|e| format!("Failed to collect: {}", e))
}

#[tauri::command]
pub async fn create_task_template(
    app: AppHandle,
    name: String,
    title: Option<String>,
    description: Option<String>,
    steps: Option<String>,
    tag_ids: Option<String>,
) -> Result<TaskTemplate, String> {
    let conn = get_db(&app)?;
    let id = Uuid::new_v4().to_string();
    let now = chrono::Local::now().format("%Y-%m-%dT%H:%M:%S").to_string();
    conn.execute(
        "INSERT INTO task_templates (id, name, title, description, steps, tag_ids, usage_count, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, 0, ?7, ?8)",
        rusqlite::params![id, name, title, description, steps, tag_ids, now, now],
    )
    .map_err(|e| format!("Failed to create template: {}", e))?;
    let template = TaskTemplate {
        id,
        name,
        title,
        description,
        steps,
        tag_ids,
        usage_count: 0,
        created_at: now.clone(),
        updated_at: now,
    };
    Ok(template)
}

#[tauri::command]
pub async fn update_task_template(
    app: AppHandle,
    id: String,
    name: Option<String>,
    title: Option<String>,
    description: Option<String>,
    steps: Option<String>,
    tag_ids: Option<String>,
) -> Result<TaskTemplate, String> {
    let conn = get_db(&app)?;
    let now = chrono::Local::now().format("%Y-%m-%dT%H:%M:%S").to_string();

    let mut updates = vec!["updated_at = ?1".to_string()];
    let mut params: Vec<Box<dyn rusqlite::types::ToSql>> = vec![Box::new(now.clone())];
    let mut param_idx = 2;

    if let Some(n) = name {
        updates.push(format!("name = ?{}", param_idx));
        params.push(Box::new(n));
        param_idx += 1;
    }
    if let Some(t) = title {
        updates.push(format!("title = ?{}", param_idx));
        params.push(Box::new(t));
        param_idx += 1;
    }
    if let Some(d) = description {
        updates.push(format!("description = ?{}", param_idx));
        params.push(Box::new(d));
        param_idx += 1;
    }
    if let Some(s) = steps {
        updates.push(format!("steps = ?{}", param_idx));
        params.push(Box::new(s));
        param_idx += 1;
    }
    if let Some(t) = tag_ids {
        updates.push(format!("tag_ids = ?{}", param_idx));
        params.push(Box::new(t));
        #[allow(unused_assignments)]
        { param_idx += 1; }
    }

    let sql = format!("UPDATE task_templates SET {} WHERE id = ?{}", updates.join(", "), param_idx);
    params.push(Box::new(id.clone()));

    let params_ref: Vec<&dyn rusqlite::types::ToSql> = params.iter().map(|p| p.as_ref()).collect();
    conn.execute(&sql, params_ref.as_slice()).map_err(|e| format!("Failed to update template: {}", e))?;

    let template = conn.query_row(
        "SELECT id, name, title, description, steps, tag_ids, usage_count, created_at, updated_at FROM task_templates WHERE id = ?1",
        rusqlite::params![id],
        row_to_task_template,
    ).map_err(|e| format!("Failed to fetch updated template: {}", e))?;
    Ok(template)
}

#[tauri::command]
pub async fn delete_task_template(app: AppHandle, id: String) -> Result<(), String> {
    let conn = get_db(&app)?;
    conn.execute("DELETE FROM task_templates WHERE id = ?1", rusqlite::params![id])
        .map_err(|e| format!("Failed to delete template: {}", e))?;
    Ok(())
}

#[tauri::command]
pub async fn get_task_template_by_id(app: AppHandle, id: String) -> Result<Option<TaskTemplate>, String> {
    let conn = get_db(&app)?;
    let result = conn.query_row(
        "SELECT id, name, title, description, steps, tag_ids, usage_count, created_at, updated_at FROM task_templates WHERE id = ?1",
        rusqlite::params![id],
        row_to_task_template,
    );
    match result {
        Ok(template) => Ok(Some(template)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(format!("Failed to query template: {}", e)),
    }
}

#[tauri::command]
pub async fn increment_template_usage(app: AppHandle, id: String) -> Result<(), String> {
    let conn = get_db(&app)?;
    conn.execute(
        "UPDATE task_templates SET usage_count = usage_count + 1, updated_at = ?1 WHERE id = ?2",
        rusqlite::params![chrono::Local::now().format("%Y-%m-%dT%H:%M:%S").to_string(), id],
    )
    .map_err(|e| format!("Failed to increment usage count: {}", e))?;
    Ok(())
}
