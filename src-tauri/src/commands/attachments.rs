use std::path::PathBuf;
use tauri::{AppHandle, Manager};
use uuid::Uuid;
use sha2::{Sha256, Digest};
use crate::db::models::Attachment;

fn get_db(app: &AppHandle) -> Result<rusqlite::Connection, String> {
    crate::db::connection::open_connection(app)
}

fn get_attachments_dir(app: &AppHandle) -> PathBuf {
    let app_dir = app.path().app_data_dir().unwrap();
    let dir = app_dir.join("attachments");
    std::fs::create_dir_all(&dir).unwrap();
    dir
}

fn is_image_file(filename: &str) -> bool {
    let ext = filename.rsplit('.').next().unwrap_or("").to_lowercase();
    matches!(ext.as_str(), "jpg" | "jpeg" | "png" | "gif" | "webp" | "svg" | "bmp")
}

fn row_to_attachment(row: &rusqlite::Row) -> rusqlite::Result<Attachment> {
    Ok(Attachment {
        id: row.get(0)?,
        task_id: row.get(1)?,
        original_filename: row.get(2)?,
        filename: row.get(3)?,
        added_datetime: row.get(4)?,
        sha256: row.get(5)?,
        local_path: row.get(6)?,
    })
}

#[tauri::command]
pub async fn create_attachment(
    app: AppHandle,
    task_id: String,
    original_filename: String,
    file_bytes: Vec<u8>,
) -> Result<Attachment, String> {
    let conn = get_db(&app)?;
    let id = Uuid::new_v7(uuid::Timestamp::now(uuid::NoContext)).to_string();

    let ext = original_filename
        .rsplit('.')
        .next()
        .map(|e| format!(".{}", e))
        .unwrap_or_default();
    let filename = format!("{}{}", Uuid::new_v4().to_string(), ext);

    let mut hasher = Sha256::new();
    hasher.update(&file_bytes);
    let sha256 = format!("{:x}", hasher.finalize());

    let local_path = if is_image_file(&original_filename) {
        let dir = get_attachments_dir(&app);
        let file_path = dir.join(&filename);
        std::fs::write(&file_path, &file_bytes)
            .map_err(|e| format!("Failed to save local attachment: {}", e))?;
        Some(file_path.to_string_lossy().to_string())
    } else {
        None
    };

    conn.execute(
        "INSERT INTO attachments (id, task_id, original_filename, filename, sha256, local_path) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        rusqlite::params![&id, &task_id, &original_filename, &filename, &sha256, &local_path],
    ).map_err(|e| format!("Failed to create attachment: {}", e))?;

    Ok(Attachment {
        id,
        task_id,
        original_filename,
        filename,
        added_datetime: chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string(),
        sha256,
        local_path,
    })
}

#[tauri::command]
pub async fn get_attachments_by_task(
    app: AppHandle,
    task_id: String,
) -> Result<Vec<Attachment>, String> {
    let conn = get_db(&app)?;
    let mut stmt = conn
        .prepare("SELECT id, task_id, original_filename, filename, added_datetime, sha256, local_path FROM attachments WHERE task_id = ?1 ORDER BY added_datetime")
        .map_err(|e| format!("Failed to prepare query: {}", e))?;

    let rows = stmt
        .query_map([&task_id], row_to_attachment)
        .map_err(|e| format!("Failed to query attachments: {}", e))?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to read attachments: {}", e))
}

#[tauri::command]
pub async fn read_file_bytes(
    _app: AppHandle,
    path: String,
) -> Result<Vec<u8>, String> {
    std::fs::read(&path).map_err(|e| format!("Failed to read file: {}", e))
}

#[tauri::command]
pub async fn delete_attachment(
    app: AppHandle,
    id: String,
) -> Result<Attachment, String> {
    let conn = get_db(&app)?;
    let attachment: Attachment = conn.query_row(
        "SELECT id, task_id, original_filename, filename, added_datetime, sha256, local_path FROM attachments WHERE id = ?1",
        [&id],
        row_to_attachment,
    ).map_err(|e| format!("Attachment not found: {}", e))?;

    conn.execute("DELETE FROM attachments WHERE id = ?1", [&id])
        .map_err(|e| format!("Failed to delete attachment: {}", e))?;

    if let Some(ref path) = attachment.local_path {
        let _ = std::fs::remove_file(path);
    }

    Ok(attachment)
}

#[tauri::command]
pub async fn cache_attachment_image(
    app: AppHandle,
    id: String,
    filename: String,
    file_bytes: Vec<u8>,
) -> Result<String, String> {
    let dir = get_attachments_dir(&app);
    let file_path = dir.join(&filename);
    std::fs::write(&file_path, &file_bytes)
        .map_err(|e| format!("Failed to save cached attachment: {}", e))?;
    let path_str = file_path.to_string_lossy().to_string();

    let conn = get_db(&app)?;
    conn.execute(
        "UPDATE attachments SET local_path = ?1 WHERE id = ?2",
        rusqlite::params![&path_str, &id],
    ).map_err(|e| format!("Failed to update local_path: {}", e))?;

    Ok(path_str)
}

#[tauri::command]
pub async fn get_all_attachments(app: AppHandle) -> Result<Vec<Attachment>, String> {
    let conn = get_db(&app)?;
    let mut stmt = conn
        .prepare("SELECT id, task_id, original_filename, filename, added_datetime, sha256, local_path FROM attachments ORDER BY added_datetime DESC")
        .map_err(|e| format!("Failed to prepare query: {}", e))?;

    let rows = stmt
        .query_map([], row_to_attachment)
        .map_err(|e| format!("Failed to query attachments: {}", e))?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to read attachments: {}", e))
}

#[tauri::command]
pub async fn update_attachment_filename(
    app: AppHandle,
    id: String,
    original_filename: String,
) -> Result<(), String> {
    let conn = get_db(&app)?;
    conn.execute(
        "UPDATE attachments SET original_filename = ?1 WHERE id = ?2",
        rusqlite::params![&original_filename, &id],
    ).map_err(|e| format!("Failed to update attachment filename: {}", e))?;
    Ok(())
}

#[tauri::command]
pub async fn delete_attachment_local_cache(app: AppHandle, id: String) -> Result<(), String> {
    let conn = get_db(&app)?;
    let local_path: Option<String> = conn.query_row(
        "SELECT local_path FROM attachments WHERE id = ?1",
        [&id],
        |row| row.get(0),
    ).map_err(|e| format!("Attachment not found: {}", e))?;

    if let Some(ref path) = local_path {
        let _ = std::fs::remove_file(path);
    }

    conn.execute(
        "UPDATE attachments SET local_path = NULL WHERE id = ?1",
        [&id],
    ).map_err(|e| format!("Failed to update attachment: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn read_image_data_url(
    _app: AppHandle,
    path: String,
) -> Result<String, String> {
    let bytes = std::fs::read(&path)
        .map_err(|e| format!("Failed to read image: {}", e))?;
    let ext = path.rsplit('.').next().unwrap_or("").to_lowercase();
    let mime = match ext.as_str() {
        "jpg" | "jpeg" => "image/jpeg",
        "png" => "image/png",
        "gif" => "image/gif",
        "webp" => "image/webp",
        "svg" => "image/svg+xml",
        "bmp" => "image/bmp",
        _ => "application/octet-stream",
    };
    let b64 = super::data::base64_encode(&bytes);
    Ok(format!("data:{};base64,{}", mime, b64))
}
