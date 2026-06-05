use tauri::AppHandle;
use uuid::Uuid;
use chrono::Datelike;
use crate::db::models::{Habit, HabitLog};

fn get_db(app: &AppHandle) -> Result<rusqlite::Connection, String> {
    crate::db::connection::open_connection(app)
}

fn row_to_habit(row: &rusqlite::Row) -> rusqlite::Result<Habit> {
    Ok(Habit {
        id: row.get(0)?,
        name: row.get(1)?,
        description: row.get(2)?,
        icon: row.get(3)?,
        color: row.get(4)?,
        target_type: row.get(5)?,
        target_value: row.get(6)?,
        frequency: row.get(7)?,
        frequency_days: row.get(8)?,
        reminder_time: row.get(9)?,
        reminder_enabled: row.get::<_, i32>(10)? != 0,
        current_streak: row.get(11)?,
        longest_streak: row.get(12)?,
        total_completions: row.get(13)?,
        start_date: row.get(14)?,
        created_at: row.get(15)?,
        updated_at: row.get(16)?,
        archived_at: row.get(17)?,
    })
}

fn row_to_habit_log(row: &rusqlite::Row) -> rusqlite::Result<HabitLog> {
    Ok(HabitLog {
        id: row.get(0)?,
        habit_id: row.get(1)?,
        log_date: row.get(2)?,
        log_time: row.get(3)?,
        completed: row.get::<_, i32>(4)? != 0,
        value: row.get(5)?,
        note: row.get(6)?,
    })
}

/// Calculate streak based on habit frequency and log history.
/// Returns (current_streak, longest_streak).
fn calculate_streaks(
    conn: &rusqlite::Connection,
    habit_id: &str,
    frequency: &str,
    start_date: &str,
) -> Result<(i32, i32), String> {
    match frequency {
        "daily" => calculate_daily_streaks(conn, habit_id, start_date),
        "weekly" => calculate_weekly_streaks(conn, habit_id, start_date),
        "monthly" => calculate_monthly_streaks(conn, habit_id, start_date),
        _ => Ok((0, 0)),
    }
}

fn calculate_daily_streaks(
    conn: &rusqlite::Connection,
    habit_id: &str,
    _start_date: &str,
) -> Result<(i32, i32), String> {
    // Get all checked-in dates sorted descending
    let mut stmt = conn.prepare(
        "SELECT DISTINCT log_date FROM habit_logs WHERE habit_id = ?1 AND completed = 1 ORDER BY log_date DESC"
    ).map_err(|e| format!("Failed to prepare: {}", e))?;

    let dates: Vec<String> = stmt.query_map([habit_id], |row| row.get(0))
        .map_err(|e| format!("Failed to query: {}", e))?
        .filter_map(|r| r.ok())
        .collect();

    if dates.is_empty() {
        return Ok((0, 0));
    }

    // Parse dates
    let parsed: Vec<chrono::NaiveDate> = dates
        .iter()
        .filter_map(|d| chrono::NaiveDate::parse_from_str(d, "%Y-%m-%d").ok())
        .collect();

    if parsed.is_empty() {
        return Ok((0, 0));
    }

    let today = chrono::Local::now().date_naive();
    let yesterday = today - chrono::Duration::days(1);

    // Current streak: count consecutive days backward from today or yesterday
    let mut current_streak = 0i32;
    if parsed[0] == today || parsed[0] == yesterday {
        current_streak = 1;
        let mut prev = parsed[0];
        for date in parsed.iter().skip(1) {
            let expected = prev - chrono::Duration::days(1);
            if *date == expected {
                current_streak += 1;
                prev = *date;
            } else if *date == prev {
                continue; // skip duplicates
            } else {
                break;
            }
        }
    }

    let longest = calculate_longest_daily_streak(&parsed);
    let longest = longest.max(current_streak);

    Ok((current_streak, longest))
}

fn calculate_longest_daily_streak(sorted_desc: &[chrono::NaiveDate]) -> i32 {
    if sorted_desc.is_empty() {
        return 0;
    }

    let mut longest = 1i32;
    let mut current = 1i32;

    // sorted_desc is descending, iterate from oldest to newest
    for i in (0..sorted_desc.len() - 1).rev() {
        let diff = (sorted_desc[i] - sorted_desc[i + 1]).num_days();
        if diff == 1 {
            current += 1;
            longest = longest.max(current);
        } else if diff > 1 {
            current = 1;
        }
        // diff == 0 means duplicate, ignore
    }

    longest
}

fn calculate_weekly_streaks(
    conn: &rusqlite::Connection,
    habit_id: &str,
    _start_date: &str,
) -> Result<(i32, i32), String> {
    // Get distinct ISO weeks with check-ins
    let mut stmt = conn.prepare(
        "SELECT DISTINCT strftime('%Y-W%W', log_date) as week FROM habit_logs WHERE habit_id = ?1 AND completed = 1 ORDER BY week DESC"
    ).map_err(|e| format!("Failed to prepare: {}", e))?;

    let weeks: Vec<String> = stmt.query_map([habit_id], |row| row.get(0))
        .map_err(|e| format!("Failed to query: {}", e))?
        .filter_map(|r| r.ok())
        .collect();

    if weeks.is_empty() {
        return Ok((0, 0));
    }

    let current_week = chrono::Local::now().format("%Y-W%W").to_string();
    let last_week = (chrono::Local::now() - chrono::Duration::days(7)).format("%Y-W%W").to_string();

    let mut current_streak = 0i32;
    if weeks[0] == current_week || weeks[0] == last_week {
        current_streak = count_consecutive_weeks(&weeks);
    }

    let longest = count_longest_consecutive_weeks(&weeks);
    let longest = longest.max(current_streak);

    Ok((current_streak, longest))
}

fn count_consecutive_weeks(sorted_desc: &[String]) -> i32 {
    if sorted_desc.is_empty() {
        return 0;
    }
    let mut count = 1i32;
    for i in 1..sorted_desc.len() {
        if let (Some(prev_wk), Some(curr_wk)) = (parse_week(&sorted_desc[i - 1]), parse_week(&sorted_desc[i])) {
            let diff = prev_wk.0 * 52 + prev_wk.1 - (curr_wk.0 * 52 + curr_wk.1);
            if diff == 1 {
                count += 1;
            } else {
                break;
            }
        } else {
            break;
        }
    }
    count
}

fn count_longest_consecutive_weeks(sorted_desc: &[String]) -> i32 {
    if sorted_desc.is_empty() {
        return 0;
    }
    let mut longest = 1i32;
    let mut current = 1i32;
    for i in (0..sorted_desc.len() - 1).rev() {
        if let (Some(next_wk), Some(curr_wk)) = (parse_week(&sorted_desc[i + 1]), parse_week(&sorted_desc[i])) {
            let diff = next_wk.0 * 52 + next_wk.1 - (curr_wk.0 * 52 + curr_wk.1);
            if diff == -1 {
                current += 1;
                longest = longest.max(current);
            } else if diff != 0 {
                current = 1;
            }
        }
    }
    longest
}

fn parse_week(s: &str) -> Option<(i32, i32)> {
    // Format: "YYYY-Www"
    let parts: Vec<&str> = s.split("-W").collect();
    if parts.len() == 2 {
        let year = parts[0].parse::<i32>().ok()?;
        let week = parts[1].parse::<i32>().ok()?;
        Some((year, week))
    } else {
        None
    }
}

fn calculate_monthly_streaks(
    conn: &rusqlite::Connection,
    habit_id: &str,
    _start_date: &str,
) -> Result<(i32, i32), String> {
    let mut stmt = conn.prepare(
        "SELECT DISTINCT strftime('%Y-%m', log_date) as month FROM habit_logs WHERE habit_id = ?1 AND completed = 1 ORDER BY month DESC"
    ).map_err(|e| format!("Failed to prepare: {}", e))?;

    let months: Vec<String> = stmt.query_map([habit_id], |row| row.get(0))
        .map_err(|e| format!("Failed to query: {}", e))?
        .filter_map(|r| r.ok())
        .collect();

    if months.is_empty() {
        return Ok((0, 0));
    }

    let current_month = chrono::Local::now().format("%Y-%m").to_string();
    let last_month = {
        let now = chrono::Local::now();
        let prev = now.month() - 1;
        if prev == 0 {
            format!("{}-12", now.year() - 1)
        } else {
            format!("{}-{:02}", now.year(), prev)
        }
    };

    let mut current_streak = 0i32;
    if months[0] == current_month || months[0] == last_month {
        current_streak = 1;
        for i in 1..months.len() {
            if let (Some(prev_m), Some(curr_m)) = (parse_month(&months[i - 1]), parse_month(&months[i])) {
                let diff = prev_m.0 * 12 + prev_m.1 - (curr_m.0 * 12 + curr_m.1);
                if diff == 1 {
                    current_streak += 1;
                } else {
                    break;
                }
            } else {
                break;
            }
        }
    }

    let longest = count_longest_consecutive_months(&months);
    let longest = longest.max(current_streak);

    Ok((current_streak, longest))
}

fn parse_month(s: &str) -> Option<(i32, i32)> {
    let parts: Vec<&str> = s.split('-').collect();
    if parts.len() == 2 {
        let year = parts[0].parse::<i32>().ok()?;
        let month = parts[1].parse::<i32>().ok()?;
        Some((year, month))
    } else {
        None
    }
}

fn count_longest_consecutive_months(sorted_desc: &[String]) -> i32 {
    if sorted_desc.is_empty() {
        return 0;
    }
    let mut longest = 1i32;
    let mut current = 1i32;
    for i in (0..sorted_desc.len() - 1).rev() {
        if let (Some(next_m), Some(curr_m)) = (parse_month(&sorted_desc[i + 1]), parse_month(&sorted_desc[i])) {
            let diff = next_m.0 * 12 + next_m.1 - (curr_m.0 * 12 + curr_m.1);
            if diff == -1 {
                current += 1;
                longest = longest.max(current);
            } else if diff != 0 {
                current = 1;
            }
        }
    }
    longest
}

// ==================== Commands ====================

#[tauri::command]
pub async fn get_habits(app: AppHandle) -> Result<Vec<Habit>, String> {
    let conn = get_db(&app)?;
    let mut stmt = conn.prepare("SELECT * FROM habits WHERE archived_at IS NULL ORDER BY created_at DESC")
        .map_err(|e| format!("Failed to prepare: {}", e))?;

    let habits = stmt.query_map([], row_to_habit)
        .map_err(|e| format!("Failed to query: {}", e))?;

    let result: Result<Vec<_>, _> = habits.collect();
    result.map_err(|e| format!("Failed to collect: {}", e))
}

#[tauri::command]
pub async fn get_habit_by_id(app: AppHandle, id: String) -> Result<Habit, String> {
    let conn = get_db(&app)?;
    let habit = conn.query_row("SELECT * FROM habits WHERE id = ?1 AND archived_at IS NULL", [&id], row_to_habit)
        .map_err(|e| format!("Failed to fetch habit: {}", e))?;
    Ok(habit)
}

#[tauri::command]
pub async fn create_habit(
    app: AppHandle,
    name: String,
    description: Option<String>,
    icon: Option<String>,
    color: Option<String>,
    target_type: Option<String>,
    target_value: Option<i32>,
    frequency: Option<String>,
    frequency_days: Option<String>,
    reminder_time: Option<String>,
    reminder_enabled: Option<bool>,
) -> Result<Habit, String> {
    let conn = get_db(&app)?;
    let id = Uuid::new_v4().to_string();
    let frequency = frequency.unwrap_or_else(|| "daily".to_string());
    let reminder = if reminder_enabled.unwrap_or(false) { 1 } else { 0 };
    let target_type = target_type.unwrap_or_else(|| "binary".to_string());
    let icon = icon.unwrap_or_else(|| "star".to_string());
    let color = color.unwrap_or_else(|| "#8B5CF6".to_string());

    conn.execute(
        "INSERT INTO habits (id, name, description, icon, color, target_type, target_value, frequency, frequency_days, reminder_time, reminder_enabled, start_date, current_streak, longest_streak, total_completions) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, date('now'), 0, 0, 0)",
        rusqlite::params![
            id,
            name,
            description.as_deref().unwrap_or(""),
            icon,
            color,
            target_type,
            target_value.unwrap_or(1),
            frequency,
            frequency_days.as_deref().unwrap_or(""),
            reminder_time.as_deref().unwrap_or(""),
            reminder,
        ]
    ).map_err(|e| format!("Failed to create habit: {}", e))?;

    let habit = conn.query_row("SELECT * FROM habits WHERE id = ?1", [&id], row_to_habit)
        .map_err(|e| format!("Failed to fetch habit: {}", e))?;

    Ok(habit)
}

#[tauri::command]
pub async fn update_habit(
    app: AppHandle,
    id: String,
    name: Option<String>,
    description: Option<String>,
    icon: Option<String>,
    color: Option<String>,
    frequency: Option<String>,
    frequency_days: Option<String>,
    reminder_time: Option<String>,
    reminder_enabled: Option<bool>,
) -> Result<Habit, String> {
    let conn = get_db(&app)?;

    if let Some(ref name) = name {
        conn.execute("UPDATE habits SET name = ?1, updated_at = datetime('now') WHERE id = ?2", (name, &id))
            .map_err(|e| format!("Failed to update name: {}", e))?;
    }
    if let Some(ref description) = description {
        conn.execute("UPDATE habits SET description = ?1, updated_at = datetime('now') WHERE id = ?2", (description, &id))
            .map_err(|e| format!("Failed to update description: {}", e))?;
    }
    if let Some(ref icon) = icon {
        conn.execute("UPDATE habits SET icon = ?1, updated_at = datetime('now') WHERE id = ?2", (icon, &id))
            .map_err(|e| format!("Failed to update icon: {}", e))?;
    }
    if let Some(ref color) = color {
        conn.execute("UPDATE habits SET color = ?1, updated_at = datetime('now') WHERE id = ?2", (color, &id))
            .map_err(|e| format!("Failed to update color: {}", e))?;
    }
    if let Some(ref frequency) = frequency {
        conn.execute("UPDATE habits SET frequency = ?1, updated_at = datetime('now') WHERE id = ?2", (frequency, &id))
            .map_err(|e| format!("Failed to update frequency: {}", e))?;
    }
    if let Some(ref frequency_days) = frequency_days {
        conn.execute("UPDATE habits SET frequency_days = ?1, updated_at = datetime('now') WHERE id = ?2", (frequency_days, &id))
            .map_err(|e| format!("Failed to update frequency_days: {}", e))?;
    }
    if let Some(ref reminder_time) = reminder_time {
        conn.execute("UPDATE habits SET reminder_time = ?1, updated_at = datetime('now') WHERE id = ?2", (reminder_time, &id))
            .map_err(|e| format!("Failed to update reminder_time: {}", e))?;
    }
    if let Some(reminder_enabled) = reminder_enabled {
        let val: i32 = if reminder_enabled { 1 } else { 0 };
        conn.execute("UPDATE habits SET reminder_enabled = ?1, updated_at = datetime('now') WHERE id = ?2", (&val, &id))
            .map_err(|e| format!("Failed to update reminder: {}", e))?;
    }

    let habit = conn.query_row("SELECT * FROM habits WHERE id = ?1", [&id], row_to_habit)
        .map_err(|e| format!("Failed to fetch habit: {}", e))?;

    Ok(habit)
}

#[tauri::command]
pub async fn delete_habit(app: AppHandle, id: String) -> Result<(), String> {
    let conn = get_db(&app)?;
    // Soft delete: set archived_at
    conn.execute(
        "UPDATE habits SET archived_at = datetime('now'), updated_at = datetime('now') WHERE id = ?1",
        [&id]
    ).map_err(|e| format!("Failed to archive habit: {}", e))?;
    Ok(())
}

#[tauri::command]
pub async fn check_in_habit(app: AppHandle, habit_id: String, date: String) -> Result<(), String> {
    let conn = get_db(&app)?;

    // Insert or replace the check-in log
    conn.execute(
        "INSERT OR REPLACE INTO habit_logs (id, habit_id, log_date, completed, value) VALUES (?1, ?2, ?3, 1, 1)",
        (Uuid::new_v4().to_string(), &habit_id, &date)
    ).map_err(|e| format!("Failed to check in: {}", e))?;

    // Fetch habit details for streak calculation
    let (frequency, start_date) = conn.query_row(
        "SELECT frequency, start_date FROM habits WHERE id = ?1",
        [&habit_id],
        |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
    ).map_err(|e| format!("Failed to fetch habit: {}", e))?;

    // Calculate updated streaks
    let (current_streak, longest_streak) = calculate_streaks(&conn, &habit_id, &frequency, &start_date)?;

    // Count total completions
    let total: i32 = conn.query_row(
        "SELECT COUNT(*) FROM habit_logs WHERE habit_id = ?1 AND completed = 1",
        [&habit_id],
        |row| row.get(0)
    ).unwrap_or(0);

    // Update habit record
    conn.execute(
        "UPDATE habits SET current_streak = ?1, longest_streak = ?2, total_completions = ?3, updated_at = datetime('now') WHERE id = ?4",
        (&current_streak, &longest_streak, &total, &habit_id)
    ).map_err(|e| format!("Failed to update streaks: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn get_habit_logs(
    app: AppHandle,
    habit_id: String,
    start_date: Option<String>,
    end_date: Option<String>,
) -> Result<Vec<HabitLog>, String> {
    let conn = get_db(&app)?;

    let sql = match (&start_date, &end_date) {
        (Some(_), Some(_)) => "SELECT * FROM habit_logs WHERE habit_id = ?1 AND log_date >= ?2 AND log_date <= ?3 ORDER BY log_date DESC",
        (Some(_), None) => "SELECT * FROM habit_logs WHERE habit_id = ?1 AND log_date >= ?2 ORDER BY log_date DESC",
        (None, Some(_)) => "SELECT * FROM habit_logs WHERE habit_id = ?1 AND log_date <= ?2 ORDER BY log_date DESC",
        (None, None) => "SELECT * FROM habit_logs WHERE habit_id = ?1 ORDER BY log_date DESC",
    };

    let mut stmt = conn.prepare(sql).map_err(|e| format!("Failed to prepare: {}", e))?;

    let logs: Vec<HabitLog> = match (&start_date, &end_date) {
        (Some(sd), Some(ed)) => {
            stmt.query_map(rusqlite::params![&habit_id, sd, ed], row_to_habit_log)
                .map_err(|e| format!("Failed to query: {}", e))?
                .filter_map(|r| r.ok())
                .collect()
        }
        (Some(sd), None) => {
            stmt.query_map(rusqlite::params![&habit_id, sd], row_to_habit_log)
                .map_err(|e| format!("Failed to query: {}", e))?
                .filter_map(|r| r.ok())
                .collect()
        }
        (None, Some(ed)) => {
            stmt.query_map(rusqlite::params![&habit_id, ed], row_to_habit_log)
                .map_err(|e| format!("Failed to query: {}", e))?
                .filter_map(|r| r.ok())
                .collect()
        }
        (None, None) => {
            stmt.query_map([&habit_id], row_to_habit_log)
                .map_err(|e| format!("Failed to query: {}", e))?
                .filter_map(|r| r.ok())
                .collect()
        }
    };

    Ok(logs)
}

#[tauri::command]
pub async fn get_today_checkins(app: AppHandle) -> Result<Vec<String>, String> {
    let conn = get_db(&app)?;
    let today = chrono::Local::now().format("%Y-%m-%d").to_string();

    let mut stmt = conn.prepare(
        "SELECT DISTINCT habit_id FROM habit_logs WHERE log_date = ?1 AND completed = 1"
    ).map_err(|e| format!("Failed to prepare: {}", e))?;

    let ids: Vec<String> = stmt.query_map([&today], |row| row.get(0))
        .map_err(|e| format!("Failed to query: {}", e))?
        .filter_map(|r| r.ok())
        .collect();

    Ok(ids)
}
