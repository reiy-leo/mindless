use tauri::AppHandle;
use uuid::Uuid;
use serde::Deserialize;
use crate::db::models::CalendarEvent;

fn get_db(app: &AppHandle) -> Result<rusqlite::Connection, String> {
    crate::db::connection::open_connection(app)
}

fn row_to_event(row: &rusqlite::Row) -> rusqlite::Result<CalendarEvent> {
    Ok(CalendarEvent {
        id: row.get(0)?,
        title: row.get(1)?,
        event_date: row.get(2)?,
        event_type: row.get(3)?,
        color: row.get(4)?,
        source: row.get(5)?,
        is_lunar: row.get::<_, i32>(6)? != 0,
        created_at: row.get(7)?,
    })
}

#[tauri::command]
pub async fn get_calendar_events(app: AppHandle) -> Result<Vec<CalendarEvent>, String> {
    let conn = get_db(&app)?;
    let mut stmt = conn.prepare("SELECT * FROM calendar_events ORDER BY event_date ASC")
        .map_err(|e| format!("Failed to prepare: {}", e))?;
    let events = stmt.query_map([], row_to_event)
        .map_err(|e| format!("Failed to query: {}", e))?;
    let result: Result<Vec<_>, _> = events.collect();
    result.map_err(|e| format!("Failed to collect: {}", e))
}

#[tauri::command]
pub async fn get_calendar_events_by_range(app: AppHandle, start_date: String, end_date: String) -> Result<Vec<CalendarEvent>, String> {
    let conn = get_db(&app)?;
    let mut stmt = conn.prepare("SELECT * FROM calendar_events WHERE event_date >= ?1 AND event_date <= ?2 ORDER BY event_date ASC")
        .map_err(|e| format!("Failed to prepare: {}", e))?;
    let events = stmt.query_map([&start_date, &end_date], row_to_event)
        .map_err(|e| format!("Failed to query: {}", e))?;
    let result: Result<Vec<_>, _> = events.collect();
    result.map_err(|e| format!("Failed to collect: {}", e))
}

#[derive(Deserialize)]
pub struct CalendarEventInput {
    pub title: String,
    pub event_date: String,
    pub event_type: Option<String>,
    pub color: Option<String>,
    pub is_lunar: Option<bool>,
}

#[tauri::command]
pub async fn import_calendar_events(app: AppHandle, events: Vec<CalendarEventInput>, source: Option<String>) -> Result<i32, String> {
    let conn = get_db(&app)?;
    let tx = conn.unchecked_transaction().map_err(|e| format!("Failed to begin transaction: {}", e))?;
    let mut count = 0i32;
    let src = source.as_deref().unwrap_or("ics");

    for event in &events {
        let id = Uuid::new_v4().to_string();
        let event_type = event.event_type.as_deref().unwrap_or("holiday");
        let color = event.color.as_deref().unwrap_or("#EF4444");
        let is_lunar = if event.is_lunar.unwrap_or(false) { 1 } else { 0 };

        tx.execute(
            "INSERT OR REPLACE INTO calendar_events (id, title, event_date, event_type, color, source, is_lunar) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            rusqlite::params![&id, &event.title, &event.event_date, event_type, color, src, is_lunar],
        ).map_err(|e| format!("Failed to insert event: {}", e))?;
        count += 1;
    }

    tx.commit().map_err(|e| format!("Failed to commit: {}", e))?;
    Ok(count)
}

#[tauri::command]
pub async fn delete_calendar_events_by_source(app: AppHandle, source: String) -> Result<i32, String> {
    let conn = get_db(&app)?;
    let count = conn.execute(
        "DELETE FROM calendar_events WHERE source = ?1",
        [&source],
    ).map_err(|e| format!("Failed to delete: {}", e))?;
    Ok(count as i32)
}

#[tauri::command]
pub async fn clear_all_calendar_events(app: AppHandle) -> Result<i32, String> {
    let conn = get_db(&app)?;
    let count = conn.execute("DELETE FROM calendar_events", [])
        .map_err(|e| format!("Failed to clear: {}", e))?;
    Ok(count as i32)
}
