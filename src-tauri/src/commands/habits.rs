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
        group_id: row.get(18)?,
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

// ==================== Streak Calculation ====================

fn parse_date(s: &str) -> Option<chrono::NaiveDate> {
    chrono::NaiveDate::parse_from_str(s, "%Y-%m-%d").ok()
}

fn parse_weekday(s: &str) -> Option<chrono::Weekday> {
    use chrono::Weekday::*;
    match s.trim().to_lowercase().as_str() {
        "mon" => Some(Mon),
        "tue" => Some(Tue),
        "wed" => Some(Wed),
        "thu" => Some(Thu),
        "fri" => Some(Fri),
        "sat" => Some(Sat),
        "sun" => Some(Sun),
        _ => None,
    }
}

/// Get check-in dates that meet the target requirement for a habit.
/// For binary habits: any completed check-in counts.
/// For count/duration habits: only check-ins with value >= target_value count.
/// Returns dates sorted descending.
fn get_valid_checkin_dates(
    conn: &rusqlite::Connection,
    habit_id: &str,
    target_type: &str,
    target_value: i32,
) -> Result<Vec<chrono::NaiveDate>, String> {
    // For binary habits, any check-in counts
    // For count/duration, only check-ins meeting target count
    let sql = if target_type == "binary" || target_value <= 1 {
        "SELECT DISTINCT log_date FROM habit_logs WHERE habit_id = ?1 AND completed = 1 ORDER BY log_date DESC"
    } else {
        "SELECT DISTINCT log_date FROM habit_logs WHERE habit_id = ?1 AND completed = 1 AND value >= ?2 ORDER BY log_date DESC"
    };

    let mut stmt = conn.prepare(sql)
        .map_err(|e| format!("Failed to prepare: {}", e))?;

    let dates: Vec<String> = if target_type == "binary" || target_value <= 1 {
        stmt.query_map([habit_id], |row| row.get(0))
            .map_err(|e| format!("Failed to query: {}", e))?
            .filter_map(|r| r.ok())
            .collect()
    } else {
        stmt.query_map(rusqlite::params![habit_id, target_value], |row| row.get(0))
            .map_err(|e| format!("Failed to query: {}", e))?
            .filter_map(|r| r.ok())
            .collect()
    };

    Ok(dates.iter().filter_map(|d| parse_date(d)).collect())
}

/// Calculate streak based on habit frequency and log history.
fn calculate_streaks(
    conn: &rusqlite::Connection,
    habit_id: &str,
    frequency: &str,
    start_date: &str,
    frequency_days: &str,
    target_type: &str,
    target_value: i32,
) -> Result<(i32, i32), String> {
    match frequency {
        "daily" => calculate_daily_streaks(conn, habit_id, start_date, target_type, target_value),
        "every_x_days" => calculate_every_x_days_streaks(conn, habit_id, start_date, frequency_days, target_type, target_value),
        "weekly" => calculate_weekly_streaks(conn, habit_id, start_date, frequency_days, target_type, target_value),
        "monthly" => calculate_monthly_streaks(conn, habit_id, start_date, target_type, target_value),
        _ => Ok((0, 0)),
    }
}

// ==================== Daily Streaks ====================

fn calculate_daily_streaks(
    conn: &rusqlite::Connection,
    habit_id: &str,
    start_date: &str,
    target_type: &str,
    target_value: i32,
) -> Result<(i32, i32), String> {
    let parsed = get_valid_checkin_dates(conn, habit_id, target_type, target_value)?;
    if parsed.is_empty() {
        return Ok((0, 0));
    }

    let start = parse_date(start_date).unwrap_or(*parsed.last().unwrap());
    let today = chrono::Local::now().date_naive();
    let yesterday = today - chrono::Duration::days(1);

    // Current streak: count consecutive days backward from today or yesterday
    // Only count days >= start_date
    let mut current_streak = 0i32;
    if parsed[0] >= start && (parsed[0] == today || parsed[0] == yesterday) {
        current_streak = 1;
        let mut prev = parsed[0];
        for date in parsed.iter().skip(1) {
            if *date < start {
                break;
            }
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

    let longest = calculate_longest_daily_streak(&parsed, &start);
    let longest = longest.max(current_streak);

    Ok((current_streak, longest))
}

fn calculate_longest_daily_streak(sorted_desc: &[chrono::NaiveDate], start: &chrono::NaiveDate) -> i32 {
    if sorted_desc.is_empty() {
        return 0;
    }

    let mut longest = 0i32;
    let mut current = 0i32;
    let mut prev_date: Option<chrono::NaiveDate> = None;

    // Iterate from oldest to newest
    for i in (0..sorted_desc.len()).rev() {
        let d = sorted_desc[i];
        if d < *start {
            continue;
        }
        match prev_date {
            None => {
                current = 1;
            }
            Some(prev) => {
                let diff = (d - prev).num_days();
                if diff == 1 {
                    current += 1;
                } else if diff > 1 {
                    current = 1;
                }
                // diff == 0 means duplicate, ignore
            }
        }
        longest = longest.max(current);
        prev_date = Some(d);
    }

    longest
}

// ==================== Every X Days Streaks ====================

fn calculate_every_x_days_streaks(
    conn: &rusqlite::Connection,
    habit_id: &str,
    start_date: &str,
    frequency_days: &str,
    target_type: &str,
    target_value: i32,
) -> Result<(i32, i32), String> {
    let interval: i64 = frequency_days.trim().parse().unwrap_or(1);
    let interval = interval.max(1);
    let start = match parse_date(start_date) {
        Some(d) => d,
        None => return Ok((0, 0)),
    };

    let parsed = get_valid_checkin_dates(conn, habit_id, target_type, target_value)?;
    if parsed.is_empty() {
        return Ok((0, 0));
    }

    let today = chrono::Local::now().date_naive();

    // Calculate period index for each check-in date
    // Period N covers: start + N*interval .. start + (N+1)*interval - 1
    let get_period = |d: chrono::NaiveDate| -> Option<i64> {
        if d < start {
            return None;
        }
        Some((d - start).num_days() / interval)
    };

    // Get unique period indices, sorted descending
    let mut periods: Vec<i64> = parsed
        .iter()
        .filter_map(|d| get_period(*d))
        .collect();
    periods.sort_unstable();
    periods.dedup();
    periods.reverse();

    if periods.is_empty() {
        return Ok((0, 0));
    }

    let today_period = get_period(today).unwrap_or(-1);
    let prev_period = today_period - 1;

    // Current streak: consecutive periods from current or previous period
    let mut current_streak = 0i32;
    if periods[0] == today_period || periods[0] == prev_period {
        current_streak = 1;
        for i in 1..periods.len() {
            if periods[i - 1] - periods[i] == 1 {
                current_streak += 1;
            } else {
                break;
            }
        }
    }

    // Longest streak
    let mut longest = 1i32;
    let mut current = 1i32;
    for i in 1..periods.len() {
        let diff = periods[i - 1] - periods[i];
        if diff == 1 {
            current += 1;
            longest = longest.max(current);
        } else {
            current = 1;
        }
    }
    longest = longest.max(current_streak);

    Ok((current_streak, longest))
}

// ==================== Weekly Streaks ====================

fn calculate_weekly_streaks(
    conn: &rusqlite::Connection,
    habit_id: &str,
    start_date: &str,
    frequency_days: &str,
    target_type: &str,
    target_value: i32,
) -> Result<(i32, i32), String> {
    let parsed = get_valid_checkin_dates(conn, habit_id, target_type, target_value)?;
    if parsed.is_empty() {
        return Ok((0, 0));
    }

    let start = parse_date(start_date).unwrap_or(*parsed.last().unwrap());

    // Parse custom days (e.g. "mon,wed,fri")
    let custom_days: Vec<chrono::Weekday> = if frequency_days.is_empty() {
        vec![]
    } else {
        frequency_days.split(',')
            .filter_map(|s| parse_weekday(s))
            .collect()
    };

    let has_custom_days = !custom_days.is_empty();

    // Get ISO weeks with valid check-ins
    // A week is valid if it has at least one check-in on an allowed day
    let mut valid_weeks: Vec<(i32, u32)> = Vec::new(); // (year, iso_week)
    {
        let mut seen = std::collections::HashSet::new();
        for date in &parsed {
            if *date < start {
                continue;
            }
            if has_custom_days && !custom_days.iter().any(|wd| date.weekday() == *wd) {
                continue;
            }
            let iso_week = date.iso_week();
            let key = (iso_week.year(), iso_week.week());
            if seen.insert(key) {
                valid_weeks.push(key);
            }
        }
    }

    // Sort descending
    valid_weeks.sort_by(|a, b| b.cmp(a));

    if valid_weeks.is_empty() {
        return Ok((0, 0));
    }

    let now = chrono::Local::now().date_naive();
    let current_iso = now.iso_week();
    let current_week = (current_iso.year(), current_iso.week());
    let last_week_date = now - chrono::Duration::days(7);
    let last_iso = last_week_date.iso_week();
    let prev_week = (last_iso.year(), last_iso.week());

    let mut current_streak = 0i32;
    if valid_weeks[0] == current_week || valid_weeks[0] == prev_week {
        current_streak = 1;
        for i in 1..valid_weeks.len() {
            if is_consecutive_week(valid_weeks[i - 1], valid_weeks[i]) {
                current_streak += 1;
            } else {
                break;
            }
        }
    }

    // Longest streak
    let mut longest = 1i32;
    let mut current = 1i32;
    for i in 1..valid_weeks.len() {
        if is_consecutive_week(valid_weeks[i - 1], valid_weeks[i]) {
            current += 1;
            longest = longest.max(current);
        } else {
            current = 1;
        }
    }
    longest = longest.max(current_streak);

    Ok((current_streak, longest))
}

/// Check if two ISO weeks are consecutive (newer is exactly 1 week after older).
/// Uses date-based calculation to correctly handle year boundaries.
fn is_consecutive_week(newer: (i32, u32), older: (i32, u32)) -> bool {
    // Convert each (year, iso_week) to a representative Monday date
    let to_monday = |year: i32, week: u32| -> Option<chrono::NaiveDate> {
        let jan4 = chrono::NaiveDate::from_ymd_opt(year, 1, 4)?;
        let iso_year_start = jan4 - chrono::Duration::days(jan4.weekday().num_days_from_monday() as i64);
        Some(iso_year_start + chrono::Duration::days((week as i64 - 1) * 7))
    };

    match (to_monday(newer.0, newer.1), to_monday(older.0, older.1)) {
        (Some(n), Some(o)) => (n - o).num_days() == 7,
        _ => false,
    }
}

// ==================== Monthly Streaks ====================

fn calculate_monthly_streaks(
    conn: &rusqlite::Connection,
    habit_id: &str,
    start_date: &str,
    target_type: &str,
    target_value: i32,
) -> Result<(i32, i32), String> {
    let parsed = get_valid_checkin_dates(conn, habit_id, target_type, target_value)?;
    if parsed.is_empty() {
        return Ok((0, 0));
    }

    let start = parse_date(start_date).unwrap_or(*parsed.last().unwrap());

    // Get unique months with check-ins >= start_date
    let mut months: Vec<(i32, u32)> = Vec::new();
    {
        let mut seen = std::collections::HashSet::new();
        for date in &parsed {
            if *date < start {
                continue;
            }
            let key = (date.year(), date.month());
            if seen.insert(key) {
                months.push(key);
            }
        }
    }

    months.sort_by(|a, b| b.cmp(a));

    if months.is_empty() {
        return Ok((0, 0));
    }

    let now = chrono::Local::now().date_naive();
    let current_month = (now.year(), now.month());
    let prev_month = if now.month() == 1 {
        (now.year() - 1, 12u32)
    } else {
        (now.year(), now.month() - 1)
    };

    let mut current_streak = 0i32;
    if months[0] == current_month || months[0] == prev_month {
        current_streak = 1;
        for i in 1..months.len() {
            if is_consecutive_month(months[i - 1], months[i]) {
                current_streak += 1;
            } else {
                break;
            }
        }
    }

    // Longest
    let mut longest = 1i32;
    let mut current = 1i32;
    for i in 1..months.len() {
        if is_consecutive_month(months[i - 1], months[i]) {
            current += 1;
            longest = longest.max(current);
        } else {
            current = 1;
        }
    }
    longest = longest.max(current_streak);

    Ok((current_streak, longest))
}

fn is_consecutive_month(newer: (i32, u32), older: (i32, u32)) -> bool {
    let newer_val = newer.0 as i64 * 12 + newer.1 as i64;
    let older_val = older.0 as i64 * 12 + older.1 as i64;
    newer_val - older_val == 1
}

// ==================== Streak Refresh Helper ====================

/// Recalculate streaks for a single habit and update the database.
fn refresh_single_habit_streaks(conn: &rusqlite::Connection, habit: &Habit) -> Result<(), String> {
    let frequency_days = habit.frequency_days.as_deref().unwrap_or("");
    let target_type = habit.target_type.as_str();
    let target_value = habit.target_value.unwrap_or(1);

    let (current_streak, longest_streak) = calculate_streaks(
        conn, &habit.id, &habit.frequency, &habit.start_date,
        frequency_days, target_type, target_value,
    )?;

    // Only update if changed
    if current_streak != habit.current_streak || longest_streak != habit.longest_streak {
        conn.execute(
            "UPDATE habits SET current_streak = ?1, longest_streak = ?2, updated_at = datetime('now') WHERE id = ?3",
            (&current_streak, &longest_streak, &habit.id),
        ).map_err(|e| format!("Failed to update streaks: {}", e))?;
    }

    Ok(())
}

// ==================== Commands ====================

#[tauri::command]
pub async fn get_habits(app: AppHandle) -> Result<Vec<Habit>, String> {
    let conn = get_db(&app)?;

    // First, refresh all streaks (catches up on missed days)
    let mut all_stmt = conn.prepare("SELECT * FROM habits WHERE archived_at IS NULL ORDER BY created_at DESC")
        .map_err(|e| format!("Failed to prepare: {}", e))?;
    let habits: Vec<Habit> = all_stmt.query_map([], row_to_habit)
        .map_err(|e| format!("Failed to query: {}", e))?
        .filter_map(|r| r.ok())
        .collect();

    // Refresh streaks for all habits
    for habit in &habits {
        let _ = refresh_single_habit_streaks(&conn, habit);
    }

    // Re-fetch to get updated streak values
    let mut stmt = conn.prepare("SELECT * FROM habits WHERE archived_at IS NULL ORDER BY created_at DESC")
        .map_err(|e| format!("Failed to prepare: {}", e))?;
    let result_habits = stmt.query_map([], row_to_habit)
        .map_err(|e| format!("Failed to query: {}", e))?;
    let result: Result<Vec<_>, _> = result_habits.collect();
    result.map_err(|e| format!("Failed to collect: {}", e))
}

#[tauri::command]
pub async fn get_habit_by_id(app: AppHandle, id: String) -> Result<Habit, String> {
    let conn = get_db(&app)?;
    let mut habit = conn.query_row("SELECT * FROM habits WHERE id = ?1 AND archived_at IS NULL", [&id], row_to_habit)
        .map_err(|e| format!("Failed to fetch habit: {}", e))?;

    // Refresh streak for this habit
    let _ = refresh_single_habit_streaks(&conn, &habit);

    // Re-fetch
    habit = conn.query_row("SELECT * FROM habits WHERE id = ?1 AND archived_at IS NULL", [&id], row_to_habit)
        .map_err(|e| format!("Failed to re-fetch habit: {}", e))?;

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
    start_date: Option<String>,
) -> Result<Habit, String> {
    let conn = get_db(&app)?;
    let id = Uuid::new_v4().to_string();
    let frequency = frequency.unwrap_or_else(|| "daily".to_string());
    let reminder = if reminder_enabled.unwrap_or(false) { 1 } else { 0 };
    let target_type = target_type.unwrap_or_else(|| "binary".to_string());
    let icon = icon.unwrap_or_else(|| "star".to_string());
    let color = color.unwrap_or_else(|| "#8B5CF6".to_string());
    let start_date = start_date.unwrap_or_else(|| chrono::Local::now().format("%Y-%m-%d").to_string());

    conn.execute(
        "INSERT INTO habits (id, name, description, icon, color, target_type, target_value, frequency, frequency_days, reminder_time, reminder_enabled, start_date, current_streak, longest_streak, total_completions) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, 0, 0, 0)",
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
            start_date,
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
    target_type: Option<String>,
    target_value: Option<i32>,
    frequency: Option<String>,
    frequency_days: Option<String>,
    reminder_time: Option<String>,
    reminder_enabled: Option<bool>,
    start_date: Option<String>,
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
    if let Some(ref target_type) = target_type {
        conn.execute("UPDATE habits SET target_type = ?1, updated_at = datetime('now') WHERE id = ?2", (target_type, &id))
            .map_err(|e| format!("Failed to update target_type: {}", e))?;
    }
    if let Some(target_value) = target_value {
        conn.execute("UPDATE habits SET target_value = ?1, updated_at = datetime('now') WHERE id = ?2", (&target_value, &id))
            .map_err(|e| format!("Failed to update target_value: {}", e))?;
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
    if let Some(ref start_date) = start_date {
        conn.execute("UPDATE habits SET start_date = ?1, updated_at = datetime('now') WHERE id = ?2", (start_date, &id))
            .map_err(|e| format!("Failed to update start_date: {}", e))?;
    }

    // Recalculate streaks after update (frequency/start_date may have changed)
    let habit = conn.query_row("SELECT * FROM habits WHERE id = ?1", [&id], row_to_habit)
        .map_err(|e| format!("Failed to fetch habit: {}", e))?;
    let _ = refresh_single_habit_streaks(&conn, &habit);

    // Re-fetch with updated streaks
    let habit = conn.query_row("SELECT * FROM habits WHERE id = ?1", [&id], row_to_habit)
        .map_err(|e| format!("Failed to re-fetch habit: {}", e))?;

    Ok(habit)
}

#[tauri::command]
pub async fn delete_habit(app: AppHandle, id: String) -> Result<(), String> {
    let conn = get_db(&app)?;
    conn.execute(
        "UPDATE habits SET archived_at = datetime('now'), updated_at = datetime('now') WHERE id = ?1",
        [&id]
    ).map_err(|e| format!("Failed to archive habit: {}", e))?;
    Ok(())
}

#[tauri::command]
pub async fn check_in_habit(app: AppHandle, habit_id: String, date: String, value: Option<i32>) -> Result<(), String> {
    let conn = get_db(&app)?;
    let val = value.unwrap_or(1);

    // Insert or replace the check-in log with the provided value
    conn.execute(
        "INSERT OR REPLACE INTO habit_logs (id, habit_id, log_date, completed, value) VALUES (?1, ?2, ?3, 1, ?4)",
        (Uuid::new_v4().to_string(), &habit_id, &date, &val)
    ).map_err(|e| format!("Failed to check in: {}", e))?;

    // Fetch habit details for streak calculation
    let habit = conn.query_row(
        "SELECT * FROM habits WHERE id = ?1",
        [&habit_id],
        row_to_habit,
    ).map_err(|e| format!("Failed to fetch habit: {}", e))?;

    let frequency_days = habit.frequency_days.as_deref().unwrap_or("");

    // Calculate updated streaks (now value-aware)
    let (current_streak, longest_streak) = calculate_streaks(
        &conn, &habit_id, &habit.frequency, &habit.start_date,
        frequency_days, &habit.target_type, habit.target_value.unwrap_or(1),
    )?;

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
pub async fn refresh_habit_streaks(app: AppHandle) -> Result<(), String> {
    let conn = get_db(&app)?;

    let mut stmt = conn.prepare("SELECT * FROM habits WHERE archived_at IS NULL")
        .map_err(|e| format!("Failed to prepare: {}", e))?;
    let habits: Vec<Habit> = stmt.query_map([], row_to_habit)
        .map_err(|e| format!("Failed to query: {}", e))?
        .filter_map(|r| r.ok())
        .collect();

    for habit in &habits {
        let _ = refresh_single_habit_streaks(&conn, habit);
    }

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
pub async fn get_today_checkins(app: AppHandle) -> Result<Vec<TodayCheckinInfo>, String> {
    let conn = get_db(&app)?;
    let today = chrono::Local::now().format("%Y-%m-%d").to_string();

    let mut stmt = conn.prepare(
        "SELECT hl.habit_id, hl.value FROM habit_logs hl WHERE hl.log_date = ?1 AND hl.completed = 1"
    ).map_err(|e| format!("Failed to prepare: {}", e))?;

    let infos: Vec<TodayCheckinInfo> = stmt.query_map([&today], |row| {
        Ok(TodayCheckinInfo {
            habit_id: row.get(0)?,
            value: row.get::<_, Option<i32>>(1)?.unwrap_or(1),
        })
    })
        .map_err(|e| format!("Failed to query: {}", e))?
        .filter_map(|r| r.ok())
        .collect();

    Ok(infos)
}

#[derive(Debug, serde::Serialize)]
pub struct TodayCheckinInfo {
    pub habit_id: String,
    pub value: i32,
}
