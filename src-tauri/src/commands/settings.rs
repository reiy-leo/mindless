use tauri::AppHandle;
use serde::{Deserialize, Serialize};

fn get_db(app: &AppHandle) -> Result<rusqlite::Connection, String> {
    let db_path = crate::db::connection::get_db_connection(app);
    rusqlite::Connection::open(&db_path).map_err(|e| format!("Failed to open database: {}", e))
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ListSettings {
    #[serde(rename = "listId")]
    pub list_id: String,
    #[serde(rename = "sortBy")]
    pub sort_by: String,
    #[serde(rename = "sortOrder")]
    pub sort_order: String,
    #[serde(rename = "groupBy")]
    pub group_by: String,
    #[serde(rename = "filterStatus")]
    pub filter_status: String,
    #[serde(rename = "viewMode")]
    pub view_mode: String,
}

#[tauri::command]
pub async fn get_list_settings(app: AppHandle, list_id: String) -> Result<Option<ListSettings>, String> {
    let conn = get_db(&app)?;
    let mut stmt = conn.prepare(
        "SELECT list_id, sort_by, sort_order, group_by, filter_status, view_mode FROM list_settings WHERE list_id = ?1"
    ).map_err(|e| format!("Failed to prepare: {}", e))?;

    let mut rows = stmt.query_map(rusqlite::params![list_id], |row| {
        Ok(ListSettings {
            list_id: row.get(0)?,
            sort_by: row.get(1)?,
            sort_order: row.get(2)?,
            group_by: row.get(3)?,
            filter_status: row.get(4)?,
            view_mode: row.get(5)?,
        })
    }).map_err(|e| format!("Failed to query: {}", e))?;

    match rows.next() {
        Some(Ok(settings)) => Ok(Some(settings)),
        Some(Err(e)) => Err(format!("Failed to read settings: {}", e)),
        None => Ok(None),
    }
}

#[tauri::command]
pub async fn save_list_settings(app: AppHandle, settings: ListSettings) -> Result<(), String> {
    let conn = get_db(&app)?;
    conn.execute(
        "INSERT INTO list_settings (list_id, sort_by, sort_order, group_by, filter_status, view_mode)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)
         ON CONFLICT(list_id) DO UPDATE SET
           sort_by = ?2, sort_order = ?3, group_by = ?4, filter_status = ?5, view_mode = ?6",
        rusqlite::params![
            settings.list_id,
            settings.sort_by,
            settings.sort_order,
            settings.group_by,
            settings.filter_status,
            settings.view_mode,
        ],
    ).map_err(|e| format!("Failed to save list settings: {}", e))?;
    Ok(())
}

#[tauri::command]
pub async fn get_settings(app: AppHandle) -> Result<Vec<(String, String)>, String> {
    let conn = get_db(&app)?;
    let mut stmt = conn.prepare("SELECT key, value FROM settings")
        .map_err(|e| format!("Failed to prepare: {}", e))?;

    let settings = stmt.query_map([], |row| {
        Ok((row.get(0)?, row.get(1)?))
    }).map_err(|e| format!("Failed to query: {}", e))?;

    let result: Result<Vec<_>, _> = settings.collect();
    result.map_err(|e| format!("Failed to collect: {}", e))
}

#[tauri::command]
pub async fn update_setting(app: AppHandle, key: String, value: String) -> Result<(), String> {
    let conn = get_db(&app)?;
    conn.execute(
        "INSERT INTO settings (key, value) VALUES (?1, ?2)
         ON CONFLICT(key) DO UPDATE SET value = ?2",
        rusqlite::params![key, value],
    ).map_err(|e| format!("Failed to update setting: {}", e))?;
    Ok(())
}

#[tauri::command]
pub async fn update_settings(app: AppHandle, settings: Vec<(String, String)>) -> Result<(), String> {
    let conn = get_db(&app)?;
    let tx = conn.unchecked_transaction()
        .map_err(|e| format!("Failed to begin transaction: {}", e))?;
    for (key, value) in &settings {
        tx.execute(
            "INSERT INTO settings (key, value) VALUES (?1, ?2)
             ON CONFLICT(key) DO UPDATE SET value = ?2",
            rusqlite::params![key, value],
        ).map_err(|e| format!("Failed to update setting '{}': {}", key, e))?;
    }
    tx.commit().map_err(|e| format!("Failed to commit: {}", e))?;
    Ok(())
}
