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
