use tauri::AppHandle;
use uuid::Uuid;
use crate::db::models::{Note, NoteGroup};

fn get_db(app: &AppHandle) -> Result<rusqlite::Connection, String> {
    crate::db::connection::open_connection(app)
}

fn opt_str(opt: &Option<String>) -> Option<&str> {
    opt.as_deref().filter(|s| !s.is_empty())
}

fn row_to_note_group(row: &rusqlite::Row) -> rusqlite::Result<NoteGroup> {
    Ok(NoteGroup {
        id: row.get(0)?,
        name: row.get(1)?,
        color: row.get(2)?,
        icon: row.get(3)?,
        sort_order: row.get(4)?,
        is_archived: row.get::<_, i32>(5)? != 0,
        created_at: row.get(6)?,
        updated_at: row.get(7)?,
    })
}

fn row_to_note(row: &rusqlite::Row) -> rusqlite::Result<Note> {
    Ok(Note {
        id: row.get(0)?,
        title: row.get(1)?,
        content: row.get(2)?,
        group_id: row.get(3)?,
        parent_id: row.get(4)?,
        tag_ids: row.get(5)?,
        is_completed: row.get::<_, i32>(6)? != 0,
        is_archived: row.get::<_, i32>(7)? != 0,
        is_pinned: row.get::<_, i32>(8)? != 0,
        level: row.get(9)?,
        sort_order: row.get(10)?,
        created_at: row.get(11)?,
        updated_at: row.get(12)?,
        completed_at: row.get(13)?,
        deleted_at: row.get(14)?,
    })
}

// ==================== Note Group Commands ====================

#[tauri::command]
pub async fn get_note_groups(app: AppHandle) -> Result<Vec<NoteGroup>, String> {
    let conn = get_db(&app)?;
    let mut stmt = conn.prepare("SELECT * FROM note_groups ORDER BY sort_order ASC, created_at ASC")
        .map_err(|e| format!("Failed to prepare: {}", e))?;
    let groups = stmt.query_map([], row_to_note_group)
        .map_err(|e| format!("Failed to query: {}", e))?;
    let result: Result<Vec<_>, _> = groups.collect();
    result.map_err(|e| format!("Failed to collect: {}", e))
}

#[tauri::command]
pub async fn create_note_group(
    app: AppHandle,
    name: String,
    color: Option<String>,
    icon: Option<String>,
) -> Result<NoteGroup, String> {
    let conn = get_db(&app)?;
    let id = Uuid::new_v4().to_string();
    let color = color.as_deref().unwrap_or("#3B82F6");
    let icon = icon.as_deref().unwrap_or("📁");

    let max_sort: f64 = conn.query_row(
        "SELECT COALESCE(MAX(sort_order), -1) + 1 FROM note_groups",
        [],
        |row| row.get(0),
    ).unwrap_or(0.0);

    conn.execute(
        "INSERT INTO note_groups (id, name, color, icon, sort_order) VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![&id, &name, color, icon, &max_sort],
    ).map_err(|e| format!("Failed to create note group: {}", e))?;

    let group = conn.query_row("SELECT * FROM note_groups WHERE id = ?1", [&id], row_to_note_group)
        .map_err(|e| format!("Failed to fetch note group: {}", e))?;
    Ok(group)
}

#[tauri::command]
pub async fn update_note_group(
    app: AppHandle,
    id: String,
    name: Option<String>,
    color: Option<String>,
    icon: Option<String>,
    is_archived: Option<bool>,
) -> Result<NoteGroup, String> {
    let conn = get_db(&app)?;

    let mut sql = String::from("UPDATE note_groups SET updated_at = datetime('now')");
    let mut param_idx = 1;

    if name.is_some() {
        sql.push_str(&format!(", name = ?{}", param_idx));
        param_idx += 1;
    }
    if color.is_some() {
        sql.push_str(&format!(", color = ?{}", param_idx));
        param_idx += 1;
    }
    if icon.is_some() {
        sql.push_str(&format!(", icon = ?{}", param_idx));
        param_idx += 1;
    }
    if is_archived.is_some() {
        sql.push_str(&format!(", is_archived = ?{}", param_idx));
        param_idx += 1;
    }

    sql.push_str(&format!(" WHERE id = ?{}", param_idx));

    let mut params: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();
    if let Some(ref v) = name { params.push(Box::new(v.clone())); }
    if let Some(ref v) = color { params.push(Box::new(v.clone())); }
    if let Some(ref v) = icon { params.push(Box::new(v.clone())); }
    if let Some(v) = is_archived { params.push(Box::new(if v { 1i32 } else { 0i32 })); }
    params.push(Box::new(id.clone()));

    let params_ref: Vec<&dyn rusqlite::types::ToSql> = params.iter().map(|p| p.as_ref()).collect();
    conn.execute(&sql, params_ref.as_slice())
        .map_err(|e| format!("Failed to update note group: {}", e))?;

    let group = conn.query_row("SELECT * FROM note_groups WHERE id = ?1", [&id], row_to_note_group)
        .map_err(|e| format!("Failed to fetch note group: {}", e))?;
    Ok(group)
}

#[tauri::command]
pub async fn delete_note_group(app: AppHandle, id: String) -> Result<(), String> {
    let conn = get_db(&app)?;
    conn.execute("DELETE FROM note_groups WHERE id = ?1", [&id])
        .map_err(|e| format!("Failed to delete note group: {}", e))?;
    Ok(())
}

// ==================== Note Commands ====================

const NOTE_COLUMNS: &str = "id, title, content, group_id, parent_id, tag_ids, is_completed, is_archived, is_pinned, level, sort_order, created_at, updated_at, completed_at, deleted_at";

#[tauri::command]
pub async fn get_notes(app: AppHandle) -> Result<Vec<Note>, String> {
    let conn = get_db(&app)?;
    let sql = format!("SELECT {} FROM notes WHERE deleted_at IS NULL AND parent_id IS NULL ORDER BY updated_at DESC", NOTE_COLUMNS);
    let mut stmt = conn.prepare(&sql)
        .map_err(|e| format!("Failed to prepare: {}", e))?;
    let notes = stmt.query_map([], row_to_note)
        .map_err(|e| format!("Failed to query: {}", e))?;
    let result: Result<Vec<_>, _> = notes.collect();
    result.map_err(|e| format!("Failed to collect: {}", e))
}

#[tauri::command]
pub async fn get_all_notes(app: AppHandle) -> Result<Vec<Note>, String> {
    let conn = get_db(&app)?;
    let sql = format!("SELECT {} FROM notes WHERE deleted_at IS NULL ORDER BY updated_at DESC", NOTE_COLUMNS);
    let mut stmt = conn.prepare(&sql)
        .map_err(|e| format!("Failed to prepare: {}", e))?;
    let notes = stmt.query_map([], row_to_note)
        .map_err(|e| format!("Failed to query: {}", e))?;
    let result: Result<Vec<_>, _> = notes.collect();
    result.map_err(|e| format!("Failed to collect: {}", e))
}

#[tauri::command]
pub async fn get_note_by_id(app: AppHandle, id: String) -> Result<Note, String> {
    let conn = get_db(&app)?;
    let sql = format!("SELECT {} FROM notes WHERE id = ?1 AND deleted_at IS NULL", NOTE_COLUMNS);
    let note = conn.query_row(&sql, [&id], row_to_note)
        .map_err(|e| format!("Failed to fetch note: {}", e))?;
    Ok(note)
}

#[tauri::command]
pub async fn get_sub_notes(app: AppHandle, parent_id: String) -> Result<Vec<Note>, String> {
    let conn = get_db(&app)?;
    let sql = format!("SELECT {} FROM notes WHERE parent_id = ?1 AND deleted_at IS NULL ORDER BY sort_order ASC, created_at ASC", NOTE_COLUMNS);
    let mut stmt = conn.prepare(&sql)
        .map_err(|e| format!("Failed to prepare: {}", e))?;
    let notes = stmt.query_map([&parent_id], row_to_note)
        .map_err(|e| format!("Failed to query: {}", e))?;
    let result: Result<Vec<_>, _> = notes.collect();
    result.map_err(|e| format!("Failed to collect: {}", e))
}

#[tauri::command]
pub async fn get_all_sub_notes(app: AppHandle, note_ids: Vec<String>) -> Result<Vec<Note>, String> {
    if note_ids.is_empty() { return Ok(vec![]); }
    let conn = get_db(&app)?;
    let placeholders: Vec<String> = note_ids.iter().enumerate().map(|(i, _)| format!("?{}", i + 1)).collect();
    let sql = format!(
        "SELECT {} FROM notes WHERE parent_id IN ({}) AND deleted_at IS NULL ORDER BY sort_order ASC, created_at ASC",
        NOTE_COLUMNS,
        placeholders.join(", ")
    );
    let mut stmt = conn.prepare(&sql).map_err(|e| format!("Failed to prepare: {}", e))?;
    let params: Vec<&dyn rusqlite::types::ToSql> = note_ids.iter().map(|id| id as &dyn rusqlite::types::ToSql).collect();
    let notes = stmt.query_map(params.as_slice(), row_to_note)
        .map_err(|e| format!("Failed to query: {}", e))?;
    let result: Result<Vec<_>, _> = notes.collect();
    result.map_err(|e| format!("Failed to collect: {}", e))
}

#[tauri::command]
pub async fn create_note(
    app: AppHandle,
    title: String,
    content: Option<String>,
    group_id: Option<String>,
    parent_id: Option<String>,
    tag_ids: Option<String>,
    level: Option<i32>,
) -> Result<Note, String> {
    let conn = get_db(&app)?;
    let id = Uuid::new_v4().to_string();
    let level = level.unwrap_or(0);

    let effective_group_id = if group_id.is_none() && parent_id.is_some() {
        let pid = parent_id.as_ref().unwrap();
        conn.query_row(
            "SELECT group_id FROM notes WHERE id = ?1",
            [pid],
            |row| row.get::<_, Option<String>>(0),
        ).ok().flatten()
    } else {
        group_id
    };

    let max_sort: f64 = if let Some(ref pid) = parent_id {
        conn.query_row(
            "SELECT COALESCE(MAX(sort_order), -1) + 1 FROM notes WHERE parent_id = ?1 AND deleted_at IS NULL",
            [pid],
            |row| row.get(0),
        ).unwrap_or(0.0)
    } else {
        0.0
    };

    conn.execute(
        "INSERT INTO notes (id, title, content, group_id, parent_id, tag_ids, level, sort_order) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        rusqlite::params![
            &id,
            &title,
            content.as_deref().unwrap_or(""),
            opt_str(&effective_group_id),
            opt_str(&parent_id),
            opt_str(&tag_ids),
            &level,
            &max_sort,
        ],
    ).map_err(|e| format!("Failed to create note: {}", e))?;

    let note = conn.query_row(&format!("SELECT {} FROM notes WHERE id = ?1", NOTE_COLUMNS), [&id], row_to_note)
        .map_err(|e| format!("Failed to fetch note: {}", e))?;
    Ok(note)
}

#[tauri::command]
pub async fn update_note(
    app: AppHandle,
    id: String,
    title: Option<String>,
    content: Option<String>,
    group_id: Option<String>,
    tag_ids: Option<String>,
    is_completed: Option<bool>,
    is_archived: Option<bool>,
    is_pinned: Option<bool>,
    sort_order: Option<f64>,
) -> Result<Note, String> {
    let conn = get_db(&app)?;

    let group_id = group_id.filter(|s| !s.is_empty());
    let tag_ids = tag_ids.filter(|s| !s.is_empty());

    let mut sql = String::from("UPDATE notes SET updated_at = datetime('now')");
    let mut param_idx = 1;

    if title.is_some() {
        sql.push_str(&format!(", title = ?{}", param_idx));
        param_idx += 1;
    }
    if content.is_some() {
        sql.push_str(&format!(", content = ?{}", param_idx));
        param_idx += 1;
    }
    if group_id.is_some() {
        sql.push_str(&format!(", group_id = ?{}", param_idx));
        param_idx += 1;
    }
    if tag_ids.is_some() {
        sql.push_str(&format!(", tag_ids = ?{}", param_idx));
        param_idx += 1;
    }
    if is_completed.is_some() {
        sql.push_str(&format!(", is_completed = ?{}, completed_at = CASE WHEN ?{} = 1 THEN datetime('now') ELSE NULL END", param_idx, param_idx));
        param_idx += 1;
    }
    if is_archived.is_some() {
        sql.push_str(&format!(", is_archived = ?{}", param_idx));
        param_idx += 1;
    }
    if is_pinned.is_some() {
        sql.push_str(&format!(", is_pinned = ?{}", param_idx));
        param_idx += 1;
    }
    if sort_order.is_some() {
        sql.push_str(&format!(", sort_order = ?{}", param_idx));
        param_idx += 1;
    }

    sql.push_str(&format!(" WHERE id = ?{}", param_idx));

    let mut params: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();
    if let Some(ref v) = title { params.push(Box::new(v.clone())); }
    if let Some(ref v) = content { params.push(Box::new(v.clone())); }
    if let Some(ref v) = group_id { params.push(Box::new(v.clone())); }
    if let Some(ref v) = tag_ids { params.push(Box::new(v.clone())); }
    if let Some(v) = is_completed { params.push(Box::new(if v { 1i32 } else { 0i32 })); }
    if let Some(v) = is_archived { params.push(Box::new(if v { 1i32 } else { 0i32 })); }
    if let Some(v) = is_pinned { params.push(Box::new(if v { 1i32 } else { 0i32 })); }
    if let Some(v) = sort_order { params.push(Box::new(v)); }
    params.push(Box::new(id.clone()));

    let params_ref: Vec<&dyn rusqlite::types::ToSql> = params.iter().map(|p| p.as_ref()).collect();
    conn.execute(&sql, params_ref.as_slice())
        .map_err(|e| format!("Failed to update note: {}", e))?;

    let note = conn.query_row(&format!("SELECT {} FROM notes WHERE id = ?1", NOTE_COLUMNS), [&id], row_to_note)
        .map_err(|e| format!("Failed to fetch note: {}", e))?;
    Ok(note)
}

#[tauri::command]
pub async fn delete_note(app: AppHandle, id: String) -> Result<(), String> {
    let conn = get_db(&app)?;
    conn.execute("UPDATE notes SET deleted_at = datetime('now'), updated_at = datetime('now') WHERE id = ?1", [&id])
        .map_err(|e| format!("Failed to delete note: {}", e))?;
    Ok(())
}

#[tauri::command]
pub async fn archive_note(app: AppHandle, id: String) -> Result<Note, String> {
    let conn = get_db(&app)?;
    conn.execute("UPDATE notes SET is_archived = 1, updated_at = datetime('now') WHERE id = ?1", [&id])
        .map_err(|e| format!("Failed to archive note: {}", e))?;
    let note = conn.query_row(&format!("SELECT {} FROM notes WHERE id = ?1", NOTE_COLUMNS), [&id], row_to_note)
        .map_err(|e| format!("Failed to fetch note: {}", e))?;
    Ok(note)
}

#[tauri::command]
pub async fn unarchive_note(app: AppHandle, id: String) -> Result<Note, String> {
    let conn = get_db(&app)?;
    conn.execute("UPDATE notes SET is_archived = 0, updated_at = datetime('now') WHERE id = ?1", [&id])
        .map_err(|e| format!("Failed to unarchive note: {}", e))?;
    let note = conn.query_row(&format!("SELECT {} FROM notes WHERE id = ?1", NOTE_COLUMNS), [&id], row_to_note)
        .map_err(|e| format!("Failed to fetch note: {}", e))?;
    Ok(note)
}

#[tauri::command]
pub async fn complete_note(app: AppHandle, id: String) -> Result<Note, String> {
    let conn = get_db(&app)?;
    conn.execute(
        "UPDATE notes SET is_completed = CASE WHEN is_completed = 1 THEN 0 ELSE 1 END, completed_at = CASE WHEN is_completed = 0 THEN datetime('now') ELSE NULL END, updated_at = datetime('now') WHERE id = ?1",
        [&id],
    ).map_err(|e| format!("Failed to complete note: {}", e))?;
    let note = conn.query_row(&format!("SELECT {} FROM notes WHERE id = ?1", NOTE_COLUMNS), [&id], row_to_note)
        .map_err(|e| format!("Failed to fetch note: {}", e))?;
    Ok(note)
}
