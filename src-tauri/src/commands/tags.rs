use tauri::AppHandle;
use serde::Deserialize;
use uuid::Uuid;
use crate::db::models::Tag;

#[derive(Deserialize)]
pub struct TagMoveItem {
    pub id: String,
    pub parent_id: Option<String>,
    pub level: Option<i32>,
    pub sort_order: Option<f64>,
}

fn get_db(app: &AppHandle) -> Result<rusqlite::Connection, String> {
    crate::db::connection::open_connection(app)
}

fn row_to_tag(row: &rusqlite::Row) -> rusqlite::Result<Tag> {
    Ok(Tag {
        id: row.get(0)?,
        name: row.get(1)?,
        color: row.get(2)?,
        emoji: row.get(3)?,
        parent_id: row.get(4)?,
        level: row.get(5)?,
        sort_order: row.get(6)?,
        created_at: row.get(7)?,
        updated_at: row.get(8)?,
    })
}

#[tauri::command]
pub async fn get_tags(app: AppHandle) -> Result<Vec<Tag>, String> {
    let conn = get_db(&app)?;
    let mut stmt = conn.prepare("SELECT * FROM tags ORDER BY sort_order ASC")
        .map_err(|e| format!("Failed to prepare: {}", e))?;

    let tags = stmt.query_map([], row_to_tag)
        .map_err(|e| format!("Failed to query: {}", e))?;

    let result: Result<Vec<_>, _> = tags.collect();
    result.map_err(|e| format!("Failed to collect: {}", e))
}

#[tauri::command]
pub async fn create_tag(
    app: AppHandle,
    name: String,
    color: Option<String>,
    emoji: Option<String>,
    parent_id: Option<String>,
    level: Option<i32>,
) -> Result<Tag, String> {
    let conn = get_db(&app)?;
    let id = Uuid::new_v4().to_string();
    let level = level.unwrap_or(0);
    let color = color.unwrap_or_else(|| "#3B82F6".to_string());
    let emoji = emoji.unwrap_or_default();

    let max_sort: f64 = conn.query_row(
        "SELECT COALESCE(MAX(sort_order), -1) + 1 FROM tags",
        [],
        |row| row.get(0),
    ).unwrap_or(0.0);

    // Use proper NULL for optional foreign key
    let parent = parent_id.filter(|s| !s.is_empty());

    conn.execute(
        "INSERT INTO tags (id, name, color, emoji, parent_id, level, sort_order) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        rusqlite::params![id, name, color, emoji, parent, level, max_sort]
    ).map_err(|e| format!("Failed to create tag: {}", e))?;

    let tag = conn.query_row("SELECT * FROM tags WHERE id = ?1", [&id], row_to_tag)
        .map_err(|e| format!("Failed to fetch tag: {}", e))?;

    Ok(tag)
}

#[tauri::command]
pub async fn update_tag(
    app: AppHandle,
    id: String,
    name: Option<String>,
    color: Option<String>,
    emoji: Option<String>,
) -> Result<Tag, String> {
    let conn = get_db(&app)?;

    if let Some(ref name) = name {
        conn.execute(
            "UPDATE tags SET name = ?1, updated_at = datetime('now') WHERE id = ?2",
            (name, &id)
        ).map_err(|e| format!("Failed to update tag name: {}", e))?;
    }

    if let Some(ref color) = color {
        conn.execute(
            "UPDATE tags SET color = ?1, updated_at = datetime('now') WHERE id = ?2",
            (color, &id)
        ).map_err(|e| format!("Failed to update tag color: {}", e))?;
    }

    if let Some(ref emoji) = emoji {
        conn.execute(
            "UPDATE tags SET emoji = ?1, updated_at = datetime('now') WHERE id = ?2",
            (emoji, &id)
        ).map_err(|e| format!("Failed to update tag emoji: {}", e))?;
    }

    let tag = conn.query_row("SELECT * FROM tags WHERE id = ?1", [&id], row_to_tag)
        .map_err(|e| format!("Failed to fetch tag: {}", e))?;

    Ok(tag)
}

#[tauri::command]
pub async fn delete_tag(app: AppHandle, id: String) -> Result<(), String> {
    let conn = get_db(&app)?;

    let tx = conn.unchecked_transaction().map_err(|e| format!("Failed to begin transaction: {}", e))?;

    {
        let mut stmt = tx.prepare(
            "WITH RECURSIVE descendants(id) AS (
                SELECT id FROM tags WHERE id = ?1
                UNION ALL
                SELECT t.id FROM tags t INNER JOIN descendants d ON t.parent_id = d.id
            )
            DELETE FROM tags WHERE id IN (SELECT id FROM descendants)"
        ).map_err(|e| format!("Failed to prepare recursive delete: {}", e))?;

        stmt.execute([&id]).map_err(|e| format!("Failed to delete tag tree: {}", e))?;
    }

    tx.commit().map_err(|e| format!("Failed to commit transaction: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn move_tags(app: AppHandle, items: Vec<TagMoveItem>) -> Result<(), String> {
    let conn = get_db(&app)?;
    let tx = conn.unchecked_transaction().map_err(|e| format!("Failed to begin transaction: {}", e))?;

    for item in &items {
        if let Some(ref parent_id) = item.parent_id {
            let parent = if parent_id.is_empty() { None } else { Some(parent_id.as_str()) };
            tx.execute(
                "UPDATE tags SET parent_id = ?1, updated_at = datetime('now') WHERE id = ?2",
                (parent, &item.id),
            ).map_err(|e| format!("Failed to update tag parent: {}", e))?;
        }

        if let Some(level) = item.level {
            tx.execute(
                "UPDATE tags SET level = ?1, updated_at = datetime('now') WHERE id = ?2",
                (level, &item.id),
            ).map_err(|e| format!("Failed to update tag level: {}", e))?;
        }

        if let Some(sort_order) = item.sort_order {
            tx.execute(
                "UPDATE tags SET sort_order = ?1, updated_at = datetime('now') WHERE id = ?2",
                (sort_order, &item.id),
            ).map_err(|e| format!("Failed to update tag sort order: {}", e))?;
        }
    }

    tx.commit().map_err(|e| format!("Failed to commit transaction: {}", e))?;
    Ok(())
}
