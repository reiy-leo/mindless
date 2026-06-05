use serde::Serialize;
use tauri::AppHandle;

fn get_db(app: &AppHandle) -> Result<rusqlite::Connection, String> {
    let db_path = crate::db::connection::get_db_connection(app);
    rusqlite::Connection::open(&db_path).map_err(|e| format!("Failed to open database: {}", e))
}

#[derive(Debug, Serialize)]
pub struct TaskReminder {
    pub id: String,
    pub title: String,
    pub due_date: Option<String>,
    pub due_time: Option<String>,
    pub priority: i32,
}

#[derive(Debug, Serialize)]
pub struct HabitReminder {
    pub id: String,
    pub name: String,
    pub reminder_time: Option<String>,
    pub current_streak: i32,
}

#[derive(Debug, Serialize)]
pub struct CountdownReminder {
    pub id: String,
    pub title: String,
    pub target_date: String,
    pub days_remaining: i64,
}

/// Get tasks due today (or overdue) that are not completed
#[tauri::command]
pub async fn get_due_tasks(app: AppHandle) -> Result<Vec<TaskReminder>, String> {
    let conn = get_db(&app)?;

    let today = chrono::Local::now().format("%Y-%m-%d").to_string();

    let mut stmt = conn.prepare(
        "SELECT id, title, due_date, due_time, priority
         FROM tasks
         WHERE is_completed = 0
           AND deleted_at IS NULL
           AND due_date IS NOT NULL
           AND due_date <= ?1
         ORDER BY due_date ASC, priority DESC"
    ).map_err(|e| format!("Failed to prepare: {}", e))?;

    let tasks = stmt.query_map([&today], |row| {
        Ok(TaskReminder {
            id: row.get(0)?,
            title: row.get(1)?,
            due_date: row.get(2)?,
            due_time: row.get(3)?,
            priority: row.get(4)?,
        })
    }).map_err(|e| format!("Failed to query: {}", e))?;

    let result: Result<Vec<_>, _> = tasks.collect();
    result.map_err(|e| format!("Failed to collect: {}", e))
}

/// Get habits with reminders enabled that haven't been checked in today
#[tauri::command]
pub async fn get_reminder_habits(app: AppHandle) -> Result<Vec<HabitReminder>, String> {
    let conn = get_db(&app)?;

    let today = chrono::Local::now().format("%Y-%m-%d").to_string();

    let mut stmt = conn.prepare(
        "SELECT h.id, h.name, h.reminder_time, h.current_streak
         FROM habits h
         WHERE h.reminder_enabled = 1
           AND h.archived_at IS NULL
           AND NOT EXISTS (
               SELECT 1 FROM habit_logs hl
               WHERE hl.habit_id = h.id AND hl.log_date = ?1
           )
         ORDER BY h.reminder_time ASC"
    ).map_err(|e| format!("Failed to prepare: {}", e))?;

    let habits = stmt.query_map([&today], |row| {
        Ok(HabitReminder {
            id: row.get(0)?,
            name: row.get(1)?,
            reminder_time: row.get(2)?,
            current_streak: row.get(3)?,
        })
    }).map_err(|e| format!("Failed to query: {}", e))?;

    let result: Result<Vec<_>, _> = habits.collect();
    result.map_err(|e| format!("Failed to collect: {}", e))
}

/// Get countdowns approaching within their reminder window
#[tauri::command]
pub async fn get_reminder_countdowns(app: AppHandle) -> Result<Vec<CountdownReminder>, String> {
    let conn = get_db(&app)?;

    let now = chrono::Local::now().date_naive();

    let mut stmt = conn.prepare(
        "SELECT id, title, target_date, reminder_days_before
         FROM countdowns
         WHERE reminder_enabled = 1
           AND target_date IS NOT NULL"
    ).map_err(|e| format!("Failed to prepare: {}", e))?;

    let countdowns = stmt.query_map([], |row| {
        let id: String = row.get(0)?;
        let title: String = row.get(1)?;
        let target_date: String = row.get(2)?;
        let days_before: i64 = row.get::<_, Option<i64>>(3)?.unwrap_or(0);
        Ok((id, title, target_date, days_before))
    }).map_err(|e| format!("Failed to query: {}", e))?;

    let mut result = Vec::new();
    for row in countdowns {
        let (id, title, target_date, days_before) = row.map_err(|e| format!("Row error: {}", e))?;
        if let Ok(target) = chrono::NaiveDate::parse_from_str(&target_date, "%Y-%m-%d") {
            let days_remaining = (target - now).num_days();
            // Include if within reminder window and not past (or just past today)
            if days_remaining >= 0 && days_remaining <= days_before {
                result.push(CountdownReminder {
                    id,
                    title,
                    target_date,
                    days_remaining,
                });
            }
        }
    }

    Ok(result)
}
