use tauri::AppHandle;

fn get_db(app: &AppHandle) -> Result<rusqlite::Connection, String> {
    let db_path = crate::db::connection::get_db_connection(app);
    rusqlite::Connection::open(&db_path).map_err(|e| format!("Failed to open database: {}", e))
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
