use tauri::AppHandle;
use std::path::PathBuf;

/// 运行数据库迁移
pub fn run_migrations(app: &AppHandle) -> Result<(), String> {
    let db_path = crate::db::connection::get_db_connection(app);

    // SQL migrations
    let sql = r#"
        CREATE TABLE IF NOT EXISTS lists (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            color TEXT DEFAULT '#3B82F6',
            icon TEXT DEFAULT 'folder',
            sort_order REAL NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS tasks (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT DEFAULT '',
            is_completed INTEGER NOT NULL DEFAULT 0,
            priority INTEGER NOT NULL DEFAULT 0,
            due_date TEXT,
            due_time TEXT,
            start_date TEXT,
            reminder_time TEXT,
            recurrence_rule TEXT,
            recurrence_end_date TEXT,
            list_id TEXT REFERENCES lists(id),
            tag_ids TEXT,
            sort_by TEXT NOT NULL DEFAULT 'due_date',
            group_by TEXT NOT NULL DEFAULT 'none',
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            completed_at TEXT,
            deleted_at TEXT,
            sort_order REAL NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS tags (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            color TEXT DEFAULT '#3B82F6',
            emoji TEXT DEFAULT '',
            parent_id TEXT REFERENCES tags(id),
            level INTEGER NOT NULL DEFAULT 0,
            sort_order REAL NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS subtasks (
            id TEXT PRIMARY KEY,
            task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
            parent_subtask_id TEXT REFERENCES subtasks(id),
            title TEXT NOT NULL,
            is_completed INTEGER NOT NULL DEFAULT 0,
            sort_order REAL NOT NULL DEFAULT 0,
            level INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS steps (
            id TEXT PRIMARY KEY,
            task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
            description TEXT NOT NULL,
            due_date TEXT,
            due_time TEXT,
            is_completed INTEGER NOT NULL DEFAULT 0,
            sort_order REAL NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS habits (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT DEFAULT '',
            icon TEXT DEFAULT 'star',
            color TEXT DEFAULT '#8B5CF6',
            target_type TEXT NOT NULL DEFAULT 'binary',
            target_value INTEGER DEFAULT 1,
            frequency TEXT NOT NULL DEFAULT 'daily',
            frequency_days TEXT,
            reminder_time TEXT,
            reminder_enabled INTEGER NOT NULL DEFAULT 0,
            current_streak INTEGER NOT NULL DEFAULT 0,
            longest_streak INTEGER NOT NULL DEFAULT 0,
            total_completions INTEGER NOT NULL DEFAULT 0,
            start_date TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            archived_at TEXT
        );

        CREATE TABLE IF NOT EXISTS habit_logs (
            id TEXT PRIMARY KEY,
            habit_id TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
            log_date TEXT NOT NULL,
            log_time TEXT NOT NULL DEFAULT (datetime('now')),
            completed INTEGER NOT NULL DEFAULT 1,
            value INTEGER DEFAULT 0,
            note TEXT DEFAULT '',
            UNIQUE(habit_id, log_date)
        );

        CREATE TABLE IF NOT EXISTS countdowns (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT DEFAULT '',
            icon TEXT DEFAULT 'flag',
            color TEXT DEFAULT '#EF4444',
            target_date TEXT NOT NULL,
            target_time TEXT,
            event_type TEXT NOT NULL DEFAULT 'countdown',
            reminder_enabled INTEGER NOT NULL DEFAULT 0,
            reminder_days_before INTEGER DEFAULT 0,
            reminder_time TEXT,
            is_recurring INTEGER NOT NULL DEFAULT 0,
            recurrence_rule TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS list_settings (
            list_id TEXT PRIMARY KEY,
            sort_by TEXT NOT NULL DEFAULT 'dueDate',
            sort_order TEXT NOT NULL DEFAULT 'asc',
            group_by TEXT NOT NULL DEFAULT 'none',
            filter_status TEXT NOT NULL DEFAULT 'all',
            view_mode TEXT NOT NULL DEFAULT 'list'
        );

        INSERT OR IGNORE INTO lists (id, name, color, icon) VALUES
            ('inbox', 'Inbox', '#3B82F6', 'inbox'),
            ('today', 'Today', '#10B981', 'calendar'),
            ('next7days', 'Next 7 Days', '#F59E0B', 'clock'),
            ('eisenhower', 'Eisenhower Matrix', '#8B5CF6', 'grid');

        INSERT OR IGNORE INTO settings (key, value) VALUES
            ('language', 'zh'),
            ('theme', 'system'),
            ('start_day_of_week', '1'),
            ('notification_enabled', '1'),
            ('default_list_id', 'inbox'),
            ('priority_mode', 'simple'),
            ('task_sort_by', 'due_date'),
            ('task_group_by', 'none');

        CREATE TABLE IF NOT EXISTS calendar_events (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            event_date TEXT NOT NULL,
            event_type TEXT NOT NULL DEFAULT 'holiday',
            color TEXT DEFAULT '#EF4444',
            source TEXT DEFAULT '',
            is_lunar INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE INDEX IF NOT EXISTS idx_tasks_list_id ON tasks(list_id);
        CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
        CREATE INDEX IF NOT EXISTS idx_tasks_start_date ON tasks(start_date);
        CREATE INDEX IF NOT EXISTS idx_tasks_is_completed ON tasks(is_completed);
        CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
        CREATE INDEX IF NOT EXISTS idx_tasks_deleted_at ON tasks(deleted_at);
        CREATE INDEX IF NOT EXISTS idx_tasks_sort_order ON tasks(sort_order);
        CREATE INDEX IF NOT EXISTS idx_tags_parent_id ON tags(parent_id);
        CREATE INDEX IF NOT EXISTS idx_tags_level ON tags(level);
        CREATE INDEX IF NOT EXISTS idx_subtasks_task_id ON subtasks(task_id);
        CREATE INDEX IF NOT EXISTS idx_subtasks_parent_id ON subtasks(parent_subtask_id);
        CREATE INDEX IF NOT EXISTS idx_subtasks_level ON subtasks(level);
        CREATE INDEX IF NOT EXISTS idx_steps_task_id ON steps(task_id);
        CREATE INDEX IF NOT EXISTS idx_steps_due_date ON steps(due_date);
        CREATE INDEX IF NOT EXISTS idx_habits_archived_at ON habits(archived_at);
        CREATE INDEX IF NOT EXISTS idx_habit_logs_habit_id ON habit_logs(habit_id);
        CREATE INDEX IF NOT EXISTS idx_habit_logs_log_date ON habit_logs(log_date);
        CREATE INDEX IF NOT EXISTS idx_countdowns_target_date ON countdowns(target_date);
        CREATE INDEX IF NOT EXISTS idx_calendar_events_date ON calendar_events(event_date);
    "#;

    // Use rusqlite directly for migrations
    let db_path_buf = PathBuf::from(&db_path);
    match rusqlite::Connection::open(&db_path_buf) {
        Ok(conn) => {
            conn.execute_batch(sql).map_err(|e| format!("Migration failed: {}", e))?;

            // Try adding new columns (ignore if they already exist)
            let _ = conn.execute_batch("ALTER TABLE tasks ADD COLUMN end_date TEXT;");
            let _ = conn.execute_batch("ALTER TABLE tasks ADD COLUMN end_time TEXT;");
            let _ = conn.execute_batch("ALTER TABLE tasks ADD COLUMN parent_task_id TEXT;");
            let _ = conn.execute_batch("ALTER TABLE tasks ADD COLUMN level INTEGER NOT NULL DEFAULT 0;");
            let _ = conn.execute_batch("ALTER TABLE lists ADD COLUMN is_pinned INTEGER NOT NULL DEFAULT 0;");
            let _ = conn.execute_batch("ALTER TABLE lists ADD COLUMN is_archived INTEGER NOT NULL DEFAULT 0;");
            
            // Update existing lists to have default values for new columns
            let _ = conn.execute_batch("UPDATE lists SET is_pinned = 0 WHERE is_pinned IS NULL;");
            let _ = conn.execute_batch("UPDATE lists SET is_archived = 0 WHERE is_archived IS NULL;");

            // Migrate existing subtasks into tasks table (if subtasks table exists)
            let has_subtasks: bool = conn.query_row(
                "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='subtasks'",
                [],
                |row| row.get::<_, i32>(0),
            ).unwrap_or(0) > 0;

            if has_subtasks {
                // Check if subtasks table has data
                let subtask_count: i32 = conn.query_row(
                    "SELECT COUNT(*) FROM subtasks",
                    [],
                    |row| row.get(0),
                ).unwrap_or(0);

                if subtask_count > 0 {
                    // Insert subtasks as tasks, mapping task_id -> parent_task_id
                    conn.execute_batch(
                        "INSERT INTO tasks (id, title, description, is_completed, priority, list_id, sort_order, parent_task_id, level, created_at, updated_at)
                         SELECT s.id, s.title, '', s.is_completed, 0, t.list_id, s.sort_order, s.task_id, s.level, s.created_at, s.updated_at
                         FROM subtasks s
                         JOIN tasks t ON s.task_id = t.id
                         WHERE s.parent_subtask_id IS NULL"
                    ).map_err(|e| format!("Failed to migrate top-level subtasks: {}", e))?;

                    // Insert nested subtasks (with parent_subtask_id)
                    conn.execute_batch(
                        "INSERT INTO tasks (id, title, description, is_completed, priority, list_id, sort_order, parent_task_id, level, created_at, updated_at)
                         SELECT s.id, s.title, '', s.is_completed, 0, t.list_id, s.sort_order, s.parent_subtask_id, s.level, s.created_at, s.updated_at
                         FROM subtasks s
                         JOIN tasks t ON s.task_id = t.id
                         WHERE s.parent_subtask_id IS NOT NULL"
                    ).map_err(|e| format!("Failed to migrate nested subtasks: {}", e))?;

                    // Drop the old subtasks table
                    conn.execute_batch("DROP TABLE IF EXISTS subtasks;")
                        .map_err(|e| format!("Failed to drop subtasks table: {}", e))?;

                    println!("Migrated {} subtasks to tasks table", subtask_count);
                } else {
                    // Empty subtasks table, just drop it
                    conn.execute_batch("DROP TABLE IF EXISTS subtasks;")
                        .map_err(|e| format!("Failed to drop subtasks table: {}", e))?;
                }
            }

            // Add index for parent_task_id
            conn.execute_batch("CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id ON tasks(parent_task_id);")
                .map_err(|e| format!("Failed to create index: {}", e))?;

            println!("Migrations applied successfully");
        }
        Err(e) => {
            return Err(format!("Failed to open database: {}", e));
        }
    }

    Ok(())
}
