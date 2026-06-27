use std::collections::HashMap;
use tauri::AppHandle;
use uuid::Uuid;
use serde::Deserialize;
use chrono::Datelike;
use crate::db::models::{Task, List};

fn get_db(app: &AppHandle) -> Result<rusqlite::Connection, String> {
    crate::db::connection::open_connection(app)
}

/// Convert None or empty-string Options to proper SQL NULL
fn opt_str(opt: &Option<String>) -> Option<&str> {
    opt.as_deref().filter(|s| !s.is_empty())
}

fn row_to_task(row: &rusqlite::Row) -> rusqlite::Result<Task> {
    Ok(Task {
        id: row.get(0)?,
        title: row.get(1)?,
        description: row.get(2)?,
        is_completed: row.get::<_, i32>(3)? != 0,
        priority: row.get(4)?,
        due_date: row.get(5)?,
        due_time: row.get(6)?,
        start_date: row.get(7)?,
        reminder_time: row.get(8)?,
        recurrence_rule: row.get(9)?,
        recurrence_end_date: row.get(10)?,
        list_id: row.get(11)?,
        tag_ids: row.get(12)?,
        sort_by: row.get(13)?,
        group_by: row.get(14)?,
        created_at: row.get(15)?,
        updated_at: row.get(16)?,
        completed_at: row.get(17)?,
        deleted_at: row.get(18)?,
        sort_order: row.get(19)?,
        end_date: row.get(20)?,
        end_time: row.get(21)?,
        parent_task_id: row.get(22)?,
        level: row.get(23)?,
        status: row.get(24)?,
        visible_sections: row.get(25)?,
    })
}

#[tauri::command]
pub async fn create_task(
    app: AppHandle,
    title: String,
    description: Option<String>,
    priority: Option<i32>,
    due_date: Option<String>,
    due_time: Option<String>,
    start_date: Option<String>,
    list_id: Option<String>,
    tag_ids: Option<String>,
    recurrence_rule: Option<String>,
    recurrence_end_date: Option<String>,
    end_date: Option<String>,
    end_time: Option<String>,
    parent_task_id: Option<String>,
    level: Option<i32>,
    status: Option<String>,
) -> Result<Task, String> {
    let conn = get_db(&app)?;
    let id = Uuid::new_v4().to_string();
    let priority = priority.unwrap_or(0);
    let level = level.unwrap_or(0);
    let status = status.unwrap_or_else(|| "pending".to_string());

    let effective_list_id = if list_id.is_none() && parent_task_id.is_some() {
        let pid = parent_task_id.as_ref().unwrap();
        conn.query_row(
            "SELECT list_id FROM tasks WHERE id = ?1",
            [pid],
            |row| row.get::<_, Option<String>>(0),
        ).ok().flatten()
    } else {
        list_id
    };

    // Calculate sort_order within siblings
    let max_sort: f64 = if let Some(ref pid) = parent_task_id {
        conn.query_row(
            "SELECT COALESCE(MAX(sort_order), -1) + 1 FROM tasks WHERE parent_task_id = ?1 AND deleted_at IS NULL",
            [pid],
            |row| row.get(0),
        ).unwrap_or(0.0)
    } else {
        conn.query_row(
            "SELECT COALESCE(MAX(sort_order), -1) + 1 FROM tasks WHERE parent_task_id IS NULL AND deleted_at IS NULL",
            [],
            |row| row.get(0),
        ).unwrap_or(0.0)
    };

    conn.execute(
        "INSERT INTO tasks (id, title, description, priority, due_date, due_time, start_date, list_id, tag_ids, sort_order, recurrence_rule, recurrence_end_date, end_date, end_time, parent_task_id, level, status) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17)",
        rusqlite::params![
            &id,
            &title,
            description.as_deref().unwrap_or(""),
            &priority,
            opt_str(&due_date),
            opt_str(&due_time),
            opt_str(&start_date),
            opt_str(&effective_list_id),
            opt_str(&tag_ids),
            &max_sort,
            opt_str(&recurrence_rule),
            opt_str(&recurrence_end_date),
            opt_str(&end_date),
            opt_str(&end_time),
            opt_str(&parent_task_id),
            &level,
            &status,
        ]
    ).map_err(|e| format!("Failed to create task: {}", e))?;

    let task = conn.query_row("SELECT * FROM tasks WHERE id = ?1", [&id], row_to_task)
        .map_err(|e| format!("Failed to fetch task: {}", e))?;

    Ok(task)
}

#[tauri::command]
pub async fn get_tasks(app: AppHandle) -> Result<Vec<Task>, String> {
    let conn = get_db(&app)?;

    let mut stmt = conn.prepare("SELECT * FROM tasks WHERE deleted_at IS NULL AND parent_task_id IS NULL ORDER BY sort_order ASC, due_date ASC")
        .map_err(|e| format!("Failed to prepare: {}", e))?;

    let tasks = stmt.query_map([], row_to_task)
        .map_err(|e| format!("Failed to query: {}", e))?;

    let result: Result<Vec<_>, _> = tasks.collect();
    result.map_err(|e| format!("Failed to collect: {}", e))
}

#[tauri::command]
pub async fn get_all_tasks(app: AppHandle) -> Result<Vec<Task>, String> {
    let conn = get_db(&app)?;

    let mut stmt = conn.prepare("SELECT * FROM tasks WHERE deleted_at IS NULL ORDER BY sort_order ASC, due_date ASC")
        .map_err(|e| format!("Failed to prepare: {}", e))?;

    let tasks = stmt.query_map([], row_to_task)
        .map_err(|e| format!("Failed to query: {}", e))?;

    let result: Result<Vec<_>, _> = tasks.collect();
    result.map_err(|e| format!("Failed to collect: {}", e))
}

#[tauri::command]
pub async fn get_task_by_id(app: AppHandle, id: String) -> Result<Task, String> {
    let conn = get_db(&app)?;

    let task = conn.query_row("SELECT * FROM tasks WHERE id = ?1 AND deleted_at IS NULL", [&id], row_to_task)
        .map_err(|e| format!("Failed to fetch task: {}", e))?;

    Ok(task)
}

#[tauri::command]
pub async fn update_task(
    app: AppHandle,
    id: String,
    title: Option<String>,
    description: Option<String>,
    is_completed: Option<bool>,
    priority: Option<i32>,
    due_date: Option<String>,
    due_time: Option<String>,
    start_date: Option<String>,
    list_id: Option<String>,
    tag_ids: Option<String>,
    sort_order: Option<f64>,
    parent_task_id: Option<String>,
    level: Option<i32>,
    recurrence_rule: Option<String>,
    recurrence_end_date: Option<String>,
    end_date: Option<String>,
    end_time: Option<String>,
    status: Option<String>,
    visible_sections: Option<String>,
) -> Result<Task, String> {
    let conn = get_db(&app)?;

    // Normalize empty strings to None for FK-safe optional fields
    let list_id = list_id.filter(|s| !s.is_empty());
    let start_date = start_date.filter(|s| !s.is_empty());
    let tag_ids = tag_ids; // keep empty string to allow clearing
    let mut parent_task_id = parent_task_id.filter(|s| !s.is_empty());
    let recurrence_rule = recurrence_rule.filter(|s| !s.is_empty());
    let recurrence_end_date = recurrence_end_date.filter(|s| !s.is_empty());
    // due_date, due_time, end_date, end_time: keep empty string for clearing to NULL

    let mut updates: Vec<String> = Vec::new();
    let mut param_idx = 1;

    // Build dynamic UPDATE query
    let mut sql = String::from("UPDATE tasks SET updated_at = datetime('now')");

    if title.is_some() {
        sql.push_str(&format!(", title = ?{}", param_idx));
        updates.push("title".to_string());
        param_idx += 1;
    }
    if description.is_some() {
        sql.push_str(&format!(", description = ?{}", param_idx));
        updates.push("description".to_string());
        param_idx += 1;
    }
    if is_completed.is_some() {
        let completed = is_completed.unwrap();
        if completed {
            sql.push_str(", is_completed = 1, status = 'completed', completed_at = datetime('now')");
        } else {
            sql.push_str(", is_completed = 0, status = 'pending', completed_at = NULL");
        }
        updates.push("is_completed".to_string());
    }
    if priority.is_some() {
        sql.push_str(&format!(", priority = ?{}", param_idx));
        updates.push("priority".to_string());
        param_idx += 1;
    }
    match due_date {
        Some(ref v) if !v.is_empty() => {
            sql.push_str(&format!(", due_date = ?{}", param_idx));
            updates.push("due_date".to_string());
            param_idx += 1;
        }
        Some(_) => {
            sql.push_str(", due_date = NULL");
            updates.push("due_date".to_string());
        }
        None => {}
    }
    match due_time {
        Some(ref v) if !v.is_empty() => {
            sql.push_str(&format!(", due_time = ?{}", param_idx));
            updates.push("due_time".to_string());
            param_idx += 1;
        }
        Some(_) => {
            sql.push_str(", due_time = NULL");
            updates.push("due_time".to_string());
        }
        None => {}
    }
    if start_date.is_some() {
        sql.push_str(&format!(", start_date = ?{}", param_idx));
        updates.push("start_date".to_string());
        param_idx += 1;
    }
    if list_id.is_some() {
        sql.push_str(&format!(", list_id = ?{}", param_idx));
        updates.push("list_id".to_string());
        param_idx += 1;
    }
    if tag_ids.is_some() {
        let tid = tag_ids.as_ref().unwrap();
        if tid.is_empty() {
            sql.push_str(", tag_ids = NULL");
        } else {
            sql.push_str(&format!(", tag_ids = ?{}", param_idx));
            param_idx += 1;
        }
        updates.push("tag_ids".to_string());
    }
    if parent_task_id.is_some() {
        let parent = parent_task_id.as_ref().unwrap();
        let pid = if parent.is_empty() { None } else { Some(parent.as_str()) };
        sql.push_str(&format!(", parent_task_id = ?{}", param_idx));
        updates.push("parent_task_id".to_string());
        param_idx += 1;
        // Store normalized value back
        parent_task_id = pid.map(|s| s.to_string());
    }
    if level.is_some() {
        sql.push_str(&format!(", level = ?{}", param_idx));
        updates.push("level".to_string());
        param_idx += 1;
    }
    if sort_order.is_some() {
        sql.push_str(&format!(", sort_order = ?{}", param_idx));
        updates.push("sort_order".to_string());
        param_idx += 1;
    }
    if recurrence_rule.is_some() {
        sql.push_str(&format!(", recurrence_rule = ?{}", param_idx));
        updates.push("recurrence_rule".to_string());
        param_idx += 1;
    }
    if recurrence_end_date.is_some() {
        sql.push_str(&format!(", recurrence_end_date = ?{}", param_idx));
        updates.push("recurrence_end_date".to_string());
        param_idx += 1;
    }
    match end_date {
        Some(ref v) if !v.is_empty() => {
            sql.push_str(&format!(", end_date = ?{}", param_idx));
            updates.push("end_date".to_string());
            param_idx += 1;
        }
        Some(_) => {
            sql.push_str(", end_date = NULL");
            updates.push("end_date".to_string());
        }
        None => {}
    }
    match end_time {
        Some(ref v) if !v.is_empty() => {
            sql.push_str(&format!(", end_time = ?{}", param_idx));
            updates.push("end_time".to_string());
            param_idx += 1;
        }
        Some(_) => {
            sql.push_str(", end_time = NULL");
            updates.push("end_time".to_string());
        }
        None => {}
    }
    if status.is_some() {
        let s = status.as_ref().unwrap();
        let is_done = if s == "completed" || s == "closed" { 1 } else { 0 };
        let completed_at_sql = if is_done == 1 { "datetime('now')" } else { "NULL" };
        sql.push_str(&format!(", status = ?{}, is_completed = {}, completed_at = {}", param_idx, is_done, completed_at_sql));
        updates.push("status".to_string());
        param_idx += 1;
    }
    if visible_sections.is_some() {
        sql.push_str(&format!(", visible_sections = ?{}", param_idx));
        updates.push("visible_sections".to_string());
        param_idx += 1;
    }

    sql.push_str(&format!(" WHERE id = ?{}", param_idx));

    // Bind parameters dynamically
    let mut stmt = conn.prepare(&sql).map_err(|e| format!("Failed to prepare: {}", e))?;

    let mut params: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

    if let Some(ref v) = title { params.push(Box::new(v.clone())); }
    if let Some(ref v) = description { params.push(Box::new(v.clone())); }
    if let Some(v) = priority { params.push(Box::new(v)); }
    if let Some(ref v) = due_date { if !v.is_empty() { params.push(Box::new(v.clone())); } }
    if let Some(ref v) = due_time { if !v.is_empty() { params.push(Box::new(v.clone())); } }
    if let Some(ref v) = start_date { params.push(Box::new(v.clone())); }
    if let Some(ref v) = list_id { params.push(Box::new(v.clone())); }
    if let Some(ref v) = tag_ids { if !v.is_empty() { params.push(Box::new(v.clone())); } }
    if let Some(ref v) = parent_task_id { params.push(Box::new(v.clone())); }
    if let Some(v) = level { params.push(Box::new(v)); }
    if let Some(v) = sort_order { params.push(Box::new(v)); }
    if let Some(ref v) = recurrence_rule { params.push(Box::new(v.clone())); }
    if let Some(ref v) = recurrence_end_date { params.push(Box::new(v.clone())); }
    if let Some(ref v) = end_date { if !v.is_empty() { params.push(Box::new(v.clone())); } }
    if let Some(ref v) = end_time { if !v.is_empty() { params.push(Box::new(v.clone())); } }
    if let Some(ref v) = status { params.push(Box::new(v.clone())); }
    if let Some(ref v) = visible_sections { params.push(Box::new(v.clone())); }
    params.push(Box::new(id.clone()));

    let param_refs: Vec<&dyn rusqlite::types::ToSql> = params.iter().map(|p| p.as_ref()).collect();
    stmt.execute(param_refs.as_slice())
        .map_err(|e| format!("Failed to update task: {}", e))?;

    let task = conn.query_row("SELECT * FROM tasks WHERE id = ?1", [&id], row_to_task)
        .map_err(|e| format!("Failed to fetch task: {}", e))?;

    Ok(task)
}

#[tauri::command]
pub async fn delete_task(app: AppHandle, id: String) -> Result<(), String> {
    let conn = get_db(&app)?;

    // Recursively soft-delete task and all descendants
    conn.execute(
        "WITH RECURSIVE descendants(id) AS (
            SELECT id FROM tasks WHERE id = ?1
            UNION ALL
            SELECT t.id FROM tasks t INNER JOIN descendants d ON t.parent_task_id = d.id
        )
        UPDATE tasks SET deleted_at = datetime('now'), updated_at = datetime('now')
        WHERE id IN (SELECT id FROM descendants)",
        [&id]
    ).map_err(|e| format!("Failed to delete task: {}", e))?;

    Ok(())
}

#[derive(Deserialize)]
pub struct ReorderItem {
    pub id: String,
    #[serde(rename = "sortOrder")]
    pub sort_order: f64,
}

#[tauri::command]
pub async fn reorder_tasks(app: AppHandle, items: Vec<ReorderItem>) -> Result<(), String> {
    let conn = get_db(&app)?;
    let tx = conn.unchecked_transaction().map_err(|e| format!("Failed to begin transaction: {}", e))?;
    for item in &items {
        tx.execute(
            "UPDATE tasks SET sort_order = ?1, updated_at = datetime('now') WHERE id = ?2",
            (&item.sort_order, &item.id),
        ).map_err(|e| format!("Failed to reorder task: {}", e))?;
    }
    tx.commit().map_err(|e| format!("Failed to commit: {}", e))?;
    Ok(())
}

#[tauri::command]
pub async fn reorder_subtasks(app: AppHandle, items: Vec<ReorderItem>) -> Result<(), String> {
    let conn = get_db(&app)?;
    let tx = conn.unchecked_transaction().map_err(|e| format!("Failed to begin transaction: {}", e))?;
    for item in &items {
        tx.execute(
            "UPDATE tasks SET sort_order = ?1, updated_at = datetime('now') WHERE id = ?2",
            (&item.sort_order, &item.id),
        ).map_err(|e| format!("Failed to reorder subtask: {}", e))?;
    }
    tx.commit().map_err(|e| format!("Failed to commit: {}", e))?;
    Ok(())
}

#[tauri::command]
pub async fn reorder_steps(app: AppHandle, items: Vec<ReorderItem>) -> Result<(), String> {
    let conn = get_db(&app)?;
    let tx = conn.unchecked_transaction().map_err(|e| format!("Failed to begin transaction: {}", e))?;
    for item in &items {
        tx.execute(
            "UPDATE steps SET sort_order = ?1, updated_at = datetime('now') WHERE id = ?2",
            (&item.sort_order, &item.id),
        ).map_err(|e| format!("Failed to reorder step: {}", e))?;
    }
    tx.commit().map_err(|e| format!("Failed to commit: {}", e))?;
    Ok(())
}

#[tauri::command]
pub async fn get_lists(app: AppHandle) -> Result<Vec<List>, String> {
    let conn = get_db(&app)?;

    let mut stmt = conn.prepare("SELECT * FROM lists ORDER BY sort_order ASC")
        .map_err(|e| format!("Failed to prepare: {}", e))?;

    let lists = stmt.query_map([], |row| {
        Ok(List {
            id: row.get(0)?,
            name: row.get(1)?,
            color: row.get(2)?,
            icon: row.get(3)?,
            sort_order: row.get(4)?,
            created_at: row.get(5)?,
            updated_at: row.get(6)?,
            is_pinned: row.get::<_, i32>(7).unwrap_or(0) != 0,
            is_archived: row.get::<_, i32>(8).unwrap_or(0) != 0,
        })
    }).map_err(|e| format!("Failed to query: {}", e))?;

    let result: Result<Vec<_>, _> = lists.collect();
    result.map_err(|e| format!("Failed to collect: {}", e))
}

/// Parse a recurrence rule string like "daily", "weekly", "monthly", "yearly",
/// "every_2_days", "every_3_weeks", etc. Returns (frequency, interval).
fn parse_recurrence_rule(rule: &str) -> (String, i64) {
    if rule.starts_with("every_") {
        // e.g. "every_2_days", "every_3_weeks", "every_2_months"
        let parts: Vec<&str> = rule.split('_').collect();
        if parts.len() >= 3 {
            let interval: i64 = parts[1].parse().unwrap_or(1);
            let freq = parts[2].to_string();
            return (freq, interval);
        }
    }
    match rule {
        "daily" => ("days".to_string(), 1),
        "weekly" => ("weeks".to_string(), 1),
        "monthly" => ("months".to_string(), 1),
        "yearly" => ("years".to_string(), 1),
        _ => ("days".to_string(), 1),
    }
}

/// Advance a date string by the given recurrence rule.
fn advance_date(date_str: &str, rule: &str) -> Option<String> {
    let date = chrono::NaiveDate::parse_from_str(date_str, "%Y-%m-%d").ok()?;
    let (freq, interval) = parse_recurrence_rule(rule);
    let next = match freq.as_str() {
        "days" | "day" => date + chrono::Duration::days(interval),
        "weeks" | "week" => date + chrono::Duration::weeks(interval),
        "months" | "month" => {
            // Add months manually
            let total_months = date.year() as i64 * 12 + date.month() as i64 - 1 + interval;
            let new_year = (total_months / 12) as i32;
            let new_month = (total_months % 12 + 1) as u32;
            let new_day = date.day().min(days_in_month(new_year, new_month));
            chrono::NaiveDate::from_ymd_opt(new_year, new_month, new_day)?
        }
        "years" | "year" => {
            let new_year = date.year() + interval as i32;
            let new_day = date.day().min(days_in_month(new_year, date.month()));
            chrono::NaiveDate::from_ymd_opt(new_year, date.month(), new_day)?
        }
        _ => date + chrono::Duration::days(1),
    };
    Some(next.format("%Y-%m-%d").to_string())
}

fn days_in_month(year: i32, month: u32) -> u32 {
    // Get the number of days in a given month
    let next_month = if month == 12 {
        chrono::NaiveDate::from_ymd_opt(year + 1, 1, 1)
    } else {
        chrono::NaiveDate::from_ymd_opt(year, month + 1, 1)
    };
    if let Some(nm) = next_month {
        (nm - chrono::Duration::days(1)).day()
    } else {
        28
    }
}

#[tauri::command]
pub async fn complete_recurring_task(
    app: AppHandle,
    id: String,
) -> Result<Option<Task>, String> {
    let conn = get_db(&app)?;

    // Fetch the task
    let task = conn.query_row(
        "SELECT * FROM tasks WHERE id = ?1 AND deleted_at IS NULL",
        [&id],
        row_to_task,
    ).map_err(|e| format!("Failed to fetch task: {}", e))?;

    // If no recurrence rule, just mark as complete
    let rule = match &task.recurrence_rule {
        Some(r) if !r.is_empty() => r.clone(),
        _ => {
            conn.execute(
                "UPDATE tasks SET is_completed = 1, status = 'completed', completed_at = datetime('now'), updated_at = datetime('now') WHERE id = ?1",
                [&id],
            ).map_err(|e| format!("Failed to complete task: {}", e))?;
            return Ok(None);
        }
    };

    // Check if we've reached the recurrence end date
    if let Some(ref end_date) = task.recurrence_end_date {
        let today = chrono::Local::now().format("%Y-%m-%d").to_string();
        if today > *end_date {
            conn.execute(
                "UPDATE tasks SET is_completed = 1, status = 'completed', completed_at = datetime('now'), updated_at = datetime('now') WHERE id = ?1",
                [&id],
            ).map_err(|e| format!("Failed to complete task: {}", e))?;
            return Ok(None);
        }
    }

    // Calculate next due_date and start_date
    let next_due_date = task.due_date.as_ref().and_then(|d| advance_date(d, &rule));
    let next_start_date = task.start_date.as_ref().and_then(|d| advance_date(d, &rule));

    // Mark current task as complete
    conn.execute(
        "UPDATE tasks SET is_completed = 1, status = 'completed', completed_at = datetime('now'), updated_at = datetime('now') WHERE id = ?1",
        [&id],
    ).map_err(|e| format!("Failed to complete task: {}", e))?;

    // Create next occurrence
    let new_id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO tasks (id, title, description, priority, due_date, due_time, start_date, list_id, tag_ids, sort_order, recurrence_rule, recurrence_end_date, end_date, end_time)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)",
        rusqlite::params![
            &new_id,
            &task.title,
            &task.description,
            &task.priority,
            opt_str(&next_due_date),
            &task.due_time,
            opt_str(&next_start_date),
            &task.list_id,
            &task.tag_ids,
            &task.sort_order,
            &task.recurrence_rule,
            &task.recurrence_end_date,
            &task.end_date,
            &task.end_time,
        ]
    ).map_err(|e| format!("Failed to create recurring task: {}", e))?;

    let new_task = conn.query_row("SELECT * FROM tasks WHERE id = ?1", [&new_id], row_to_task)
        .map_err(|e| format!("Failed to fetch new task: {}", e))?;

    Ok(Some(new_task))
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HeatmapData {
    pub tasks: HashMap<String, i32>,
    pub habits: HashMap<String, i32>,
}

#[tauri::command]
pub async fn get_heatmap_data(app: AppHandle) -> Result<HeatmapData, String> {
    let conn = get_db(&app)?;

    let one_year_ago = {
        let now = chrono::Utc::now().date_naive();
        (now - chrono::Duration::days(364)).format("%Y-%m-%d").to_string()
    };

    let mut task_map: HashMap<String, i32> = HashMap::new();
    {
        let mut stmt = conn
            .prepare("SELECT DATE(completed_at) as d, COUNT(*) FROM tasks WHERE completed_at IS NOT NULL AND completed_at >= ?1 GROUP BY d")
            .map_err(|e| format!("Failed to prepare task heatmap query: {}", e))?;
        let rows = stmt.query_map([&one_year_ago], |row| {
                Ok((row.get::<_, String>(0)?, row.get::<_, i32>(1)?))
            })
            .map_err(|e| format!("Failed to query task heatmap: {}", e))?;
        for row in rows {
            let (date, count) = row.map_err(|e| format!("Row error: {}", e))?;
            task_map.insert(date, count);
        }
    }

    let mut habit_map: HashMap<String, i32> = HashMap::new();
    {
        let mut stmt = conn
            .prepare("SELECT log_date, COUNT(*) FROM habit_logs WHERE completed = 1 AND log_date >= ?1 GROUP BY log_date")
            .map_err(|e| format!("Failed to prepare habit heatmap query: {}", e))?;
        let rows = stmt.query_map([&one_year_ago], |row| {
                Ok((row.get::<_, String>(0)?, row.get::<_, i32>(1)?))
            })
            .map_err(|e| format!("Failed to query habit heatmap: {}", e))?;
        for row in rows {
            let (date, count) = row.map_err(|e| format!("Row error: {}", e))?;
            habit_map.insert(date, count);
        }
    }

    Ok(HeatmapData {
        tasks: task_map,
        habits: habit_map,
    })
}

// ==================== Task Linked Items ====================

#[tauri::command]
pub async fn get_task_linked_items(app: AppHandle, task_id: String) -> Result<Vec<crate::db::models::TaskLinkedItem>, String> {
    let conn = get_db(&app)?;
    let mut stmt = conn.prepare(
        "SELECT id, task_id, linked_type, linked_id FROM task_linked_items WHERE task_id = ?1"
    ).map_err(|e| format!("Failed to prepare statement: {}", e))?;
    let items = stmt.query_map([&task_id], |row| {
        Ok(crate::db::models::TaskLinkedItem {
            id: row.get(0)?,
            task_id: row.get(1)?,
            linked_type: row.get(2)?,
            linked_id: row.get(3)?,
        })
    }).map_err(|e| format!("Failed to query task linked items: {}", e))?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|e| format!("Failed to collect task linked items: {}", e))?;
    Ok(items)
}

#[tauri::command]
pub async fn link_task_item(app: AppHandle, task_id: String, linked_type: String, linked_id: String) -> Result<crate::db::models::TaskLinkedItem, String> {
    let conn = get_db(&app)?;
    let existing: Option<String> = conn.query_row(
        "SELECT id FROM task_linked_items WHERE task_id = ?1 AND linked_type = ?2 AND linked_id = ?3",
        rusqlite::params![task_id, linked_type, linked_id],
        |row| row.get(0),
    ).ok();
    if let Some(id) = existing {
        return Ok(crate::db::models::TaskLinkedItem { id, task_id, linked_type, linked_id });
    }
    let id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO task_linked_items (id, task_id, linked_type, linked_id) VALUES (?1, ?2, ?3, ?4)",
        rusqlite::params![&id, &task_id, &linked_type, &linked_id],
    ).map_err(|e| format!("Failed to link task item: {}", e))?;
    Ok(crate::db::models::TaskLinkedItem { id, task_id, linked_type, linked_id })
}

#[tauri::command]
pub async fn unlink_task_item(app: AppHandle, id: String) -> Result<(), String> {
    let conn = get_db(&app)?;
    conn.execute("DELETE FROM task_linked_items WHERE id = ?1", [&id])
        .map_err(|e| format!("Failed to unlink task item: {}", e))?;
    Ok(())
}
