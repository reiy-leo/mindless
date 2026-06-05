use std::path::PathBuf;
use tauri::{AppHandle, Manager};

/// 获取数据库连接路径
pub fn get_db_path(app: &AppHandle) -> PathBuf {
    let app_dir = app.path().app_data_dir().unwrap();
    std::fs::create_dir_all(&app_dir).unwrap();
    app_dir.join("mindless.db")
}

/// 获取数据库连接字符串
pub fn get_db_connection(app: &AppHandle) -> String {
    let db_path = get_db_path(app);
    db_path.to_string_lossy().to_string()
}

/// 打开数据库连接并启用外键约束
pub fn open_connection(app: &AppHandle) -> Result<rusqlite::Connection, String> {
    let db_path = get_db_connection(app);
    let conn = rusqlite::Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;
    conn.execute_batch("PRAGMA foreign_keys = ON;")
        .map_err(|e| format!("Failed to enable foreign keys: {}", e))?;
    Ok(conn)
}
