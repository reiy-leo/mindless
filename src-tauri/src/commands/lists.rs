use tauri::AppHandle;
use uuid::Uuid;
use crate::db::models::List;

fn get_db(app: &AppHandle) -> Result<rusqlite::Connection, String> {
    crate::db::connection::open_connection(app)
}

fn row_to_list(row: &rusqlite::Row) -> rusqlite::Result<List> {
    Ok(List {
        id: row.get(0)?,
        name: row.get(1)?,
        color: row.get(2)?,
        icon: row.get(3)?,
        sort_order: row.get(4)?,
        created_at: row.get(5)?,
        updated_at: row.get(6)?,
    })
}

#[tauri::command]
pub async fn create_list(
    app: AppHandle,
    name: String,
    color: Option<String>,
    icon: Option<String>,
) -> Result<List, String> {
    let conn = get_db(&app)?;
    let id = Uuid::new_v4().to_string();
    let color = color.unwrap_or_else(|| "#3B82F6".to_string());
    let icon = icon.unwrap_or_else(|| "folder".to_string());

    // Get max sort_order
    let max_order: f64 = conn
        .query_row("SELECT COALESCE(MAX(sort_order), 0) FROM lists", [], |row| row.get(0))
        .unwrap_or(0.0);

    conn.execute(
        "INSERT INTO lists (id, name, color, icon, sort_order) VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![id, name, color, icon, max_order + 1.0],
    )
    .map_err(|e| format!("Failed to create list: {}", e))?;

    let list = conn
        .query_row("SELECT * FROM lists WHERE id = ?1", [&id], row_to_list)
        .map_err(|e| format!("Failed to fetch list: {}", e))?;

    Ok(list)
}

#[tauri::command]
pub async fn update_list(
    app: AppHandle,
    id: String,
    name: Option<String>,
    color: Option<String>,
    icon: Option<String>,
    sort_order: Option<f64>,
) -> Result<List, String> {
    let conn = get_db(&app)?;

    // Prevent updating seed lists
    let seed_ids = ["inbox", "today", "next7days", "eisenhower"];
    if seed_ids.contains(&id.as_str()) {
        return Err("Cannot modify a built-in list".to_string());
    }

    let mut sql = String::from("UPDATE lists SET updated_at = datetime('now')");
    let mut params: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();
    let mut param_idx = 1;

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
    if let Some(v) = sort_order {
        sql.push_str(&format!(", sort_order = ?{}", param_idx));
        params.push(Box::new(v));
        param_idx += 1;
    }

    sql.push_str(&format!(" WHERE id = ?{}", param_idx));
    params.push(Box::new(id.clone()));

    let param_refs: Vec<&dyn rusqlite::types::ToSql> = params.iter().map(|p| p.as_ref()).collect();
    let mut stmt = conn.prepare(&sql).map_err(|e| format!("Failed to prepare: {}", e))?;
    stmt.execute(param_refs.as_slice())
        .map_err(|e| format!("Failed to update list: {}", e))?;

    let list = conn
        .query_row("SELECT * FROM lists WHERE id = ?1", [&id], row_to_list)
        .map_err(|e| format!("Failed to fetch list: {}", e))?;

    Ok(list)
}

#[tauri::command]
pub async fn delete_list(app: AppHandle, id: String) -> Result<(), String> {
    let conn = get_db(&app)?;

    // Prevent deleting seed lists
    let seed_ids = ["inbox", "today", "next7days", "eisenhower"];
    if seed_ids.contains(&id.as_str()) {
        return Err("Cannot delete a built-in list".to_string());
    }

    // Move tasks in this list to inbox
    conn.execute(
        "UPDATE tasks SET list_id = 'inbox', updated_at = datetime('now') WHERE list_id = ?1",
        [&id],
    )
    .map_err(|e| format!("Failed to reassign tasks: {}", e))?;

    // Delete the list
    conn.execute("DELETE FROM lists WHERE id = ?1", [&id])
        .map_err(|e| format!("Failed to delete list: {}", e))?;

    Ok(())
}
