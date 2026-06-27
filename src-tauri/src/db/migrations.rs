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

        CREATE TABLE IF NOT EXISTS countdown_groups (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            color TEXT DEFAULT '#3B82F6',
            icon TEXT DEFAULT '📅',
            is_preset INTEGER NOT NULL DEFAULT 0,
            sort_order REAL NOT NULL DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
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
            group_id TEXT REFERENCES countdown_groups(id) ON DELETE SET NULL,
            is_favorite INTEGER NOT NULL DEFAULT 0,
            is_completed INTEGER NOT NULL DEFAULT 0,
            deleted_at TEXT,
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
            ('task_group_by', 'none'),
            ('default_task_sections', '{"steps":true,"subtasks":true,"attachments":true,"notes":true,"persons":true,"media":true}'),
            ('default_task_open_view', 'last'),
            ('today_reset_hour', '0');

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
        CREATE INDEX IF NOT EXISTS idx_countdown_groups_sort_order ON countdown_groups(sort_order);
        CREATE INDEX IF NOT EXISTS idx_calendar_events_date ON calendar_events(event_date);

        CREATE TABLE IF NOT EXISTS habit_groups (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            icon TEXT DEFAULT '📁',
            color TEXT DEFAULT '#8B5CF6',
            sort_order REAL NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE INDEX IF NOT EXISTS idx_habit_groups_sort_order ON habit_groups(sort_order);

        CREATE TABLE IF NOT EXISTS task_templates (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            title TEXT,
            description TEXT,
            steps TEXT,
            tag_ids TEXT,
            usage_count INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
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
            let _ = conn.execute_batch("ALTER TABLE habits ADD COLUMN group_id TEXT REFERENCES habit_groups(id) ON DELETE SET NULL;");
            let _ = conn.execute_batch("CREATE INDEX IF NOT EXISTS idx_habits_group_id ON habits(group_id);");
            let _ = conn.execute_batch("ALTER TABLE habits ADD COLUMN target_unit TEXT DEFAULT '次';");

            // Add countdown columns that were added after initial migration
            let _ = conn.execute_batch("ALTER TABLE countdowns ADD COLUMN group_id TEXT REFERENCES countdown_groups(id) ON DELETE SET NULL;");
            let _ = conn.execute_batch("ALTER TABLE countdowns ADD COLUMN is_favorite INTEGER NOT NULL DEFAULT 0;");
            let _ = conn.execute_batch("ALTER TABLE countdowns ADD COLUMN is_completed INTEGER NOT NULL DEFAULT 0;");
            let _ = conn.execute_batch("ALTER TABLE countdowns ADD COLUMN deleted_at TEXT;");
            let _ = conn.execute_batch("CREATE INDEX IF NOT EXISTS idx_countdowns_group_id ON countdowns(group_id);");
            let _ = conn.execute_batch("CREATE INDEX IF NOT EXISTS idx_countdowns_deleted_at ON countdowns(deleted_at);");
            let _ = conn.execute_batch("CREATE INDEX IF NOT EXISTS idx_countdowns_is_favorite ON countdowns(is_favorite);");
            let _ = conn.execute_batch("CREATE INDEX IF NOT EXISTS idx_countdowns_is_completed ON countdowns(is_completed);");

            // Insert preset countdown groups
            conn.execute_batch(
                "INSERT OR IGNORE INTO countdown_groups (id, name, color, icon, is_preset, sort_order) VALUES
                    ('preset-holiday', '节日', '#EF4444', '🎉', 1, 1),
                    ('preset-birthday', '生日', '#EC4899', '🎂', 1, 2),
                    ('preset-anniversary', '纪念日', '#8B5CF6', '💍', 1, 3),
                    ('preset-stats', '统计', '#3B82F6', '📊', 1, 4);"
            ).map_err(|e| format!("Failed to insert preset countdown groups: {}", e))?;

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

            // Notes tables
            conn.execute_batch("
                CREATE TABLE IF NOT EXISTS note_groups (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    color TEXT DEFAULT '#3B82F6',
                    icon TEXT DEFAULT '📁',
                    sort_order REAL NOT NULL DEFAULT 0,
                    is_archived INTEGER NOT NULL DEFAULT 0,
                    created_at TEXT NOT NULL DEFAULT (datetime('now')),
                    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
                );
                CREATE INDEX IF NOT EXISTS idx_note_groups_sort_order ON note_groups(sort_order);

                CREATE TABLE IF NOT EXISTS notes (
                    id TEXT PRIMARY KEY,
                    title TEXT NOT NULL DEFAULT '',
                    content TEXT DEFAULT '',
                    group_id TEXT REFERENCES note_groups(id) ON DELETE SET NULL,
                    parent_id TEXT REFERENCES notes(id) ON DELETE CASCADE,
                    tag_ids TEXT,
                    is_completed INTEGER NOT NULL DEFAULT 0,
                    is_archived INTEGER NOT NULL DEFAULT 0,
                    is_pinned INTEGER NOT NULL DEFAULT 0,
                    level INTEGER NOT NULL DEFAULT 0,
                    sort_order REAL NOT NULL DEFAULT 0,
                    created_at TEXT NOT NULL DEFAULT (datetime('now')),
                    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
                    completed_at TEXT,
                    deleted_at TEXT,
                    target_date TEXT
                );
                CREATE INDEX IF NOT EXISTS idx_notes_group_id ON notes(group_id);
                CREATE INDEX IF NOT EXISTS idx_notes_parent_id ON notes(parent_id);
                CREATE INDEX IF NOT EXISTS idx_notes_deleted_at ON notes(deleted_at);
                CREATE INDEX IF NOT EXISTS idx_notes_is_archived ON notes(is_archived);
                CREATE INDEX IF NOT EXISTS idx_notes_is_completed ON notes(is_completed);
                CREATE INDEX IF NOT EXISTS idx_notes_target_date ON notes(target_date);
            ").map_err(|e| format!("Notes migration failed: {}", e))?;

            // Add is_pinned column for existing databases
            let _ = conn.execute_batch("ALTER TABLE notes ADD COLUMN is_pinned INTEGER NOT NULL DEFAULT 0;");
            let _ = conn.execute_batch("CREATE INDEX IF NOT EXISTS idx_notes_is_pinned ON notes(is_pinned);");

            // Add target_date column for existing databases
            let _ = conn.execute_batch("ALTER TABLE notes ADD COLUMN target_date TEXT;");
            let _ = conn.execute_batch("CREATE INDEX IF NOT EXISTS idx_notes_target_date ON notes(target_date);");

            // People tables
            conn.execute_batch("
                CREATE TABLE IF NOT EXISTS person_groups (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    color TEXT DEFAULT '#3B82F6',
                    icon TEXT DEFAULT '👥',
                    is_pinned INTEGER NOT NULL DEFAULT 0,
                    is_archived INTEGER NOT NULL DEFAULT 0,
                    sort_order REAL NOT NULL DEFAULT 0,
                    created_at TEXT NOT NULL DEFAULT (datetime('now')),
                    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
                );
                CREATE INDEX IF NOT EXISTS idx_person_groups_sort_order ON person_groups(sort_order);

                CREATE TABLE IF NOT EXISTS persons (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    english_name TEXT,
                    nickname TEXT,
                    remark TEXT DEFAULT '',
                    group_id TEXT REFERENCES person_groups(id) ON DELETE SET NULL,
                    tag_ids TEXT,
                    avatar TEXT,
                    birthday TEXT,
                    lunar_birthday TEXT,
                    food_taboos TEXT,
                    preferences TEXT,
                    is_pinned INTEGER NOT NULL DEFAULT 0,
                    is_archived INTEGER NOT NULL DEFAULT 0,
                    sort_order REAL NOT NULL DEFAULT 0,
                    created_at TEXT NOT NULL DEFAULT (datetime('now')),
                    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
                    deleted_at TEXT
                );
                CREATE INDEX IF NOT EXISTS idx_persons_group_id ON persons(group_id);
                CREATE INDEX IF NOT EXISTS idx_persons_is_archived ON persons(is_archived);
                CREATE INDEX IF NOT EXISTS idx_persons_is_pinned ON persons(is_pinned);
                CREATE INDEX IF NOT EXISTS idx_persons_sort_order ON persons(sort_order);

                CREATE TABLE IF NOT EXISTS person_phones (
                    id TEXT PRIMARY KEY,
                    person_id TEXT NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
                    phone TEXT NOT NULL,
                    label TEXT DEFAULT '手机',
                    sort_order REAL NOT NULL DEFAULT 0
                );
                CREATE INDEX IF NOT EXISTS idx_person_phones_person_id ON person_phones(person_id);

                CREATE TABLE IF NOT EXISTS person_emails (
                    id TEXT PRIMARY KEY,
                    person_id TEXT NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
                    email TEXT NOT NULL,
                    label TEXT DEFAULT '邮箱',
                    sort_order REAL NOT NULL DEFAULT 0
                );
                CREATE INDEX IF NOT EXISTS idx_person_emails_person_id ON person_emails(person_id);
            ").map_err(|e| format!("People migration failed: {}", e))?;

            // Add person columns that were added after initial migration
            let _ = conn.execute_batch("ALTER TABLE persons ADD COLUMN avatar TEXT;");
            let _ = conn.execute_batch("ALTER TABLE persons ADD COLUMN birthday TEXT;");
            let _ = conn.execute_batch("ALTER TABLE persons ADD COLUMN lunar_birthday TEXT;");
            let _ = conn.execute_batch("ALTER TABLE persons ADD COLUMN food_taboos TEXT;");
            let _ = conn.execute_batch("ALTER TABLE persons ADD COLUMN preferences TEXT;");
            let _ = conn.execute_batch("ALTER TABLE persons ADD COLUMN deleted_at TEXT;");

            // Create person_other_names table
            conn.execute_batch("
                CREATE TABLE IF NOT EXISTS person_other_names (
                    id TEXT PRIMARY KEY,
                    person_id TEXT NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
                    name TEXT NOT NULL,
                    label TEXT DEFAULT '别名',
                    sort_order REAL NOT NULL DEFAULT 0
                );
                CREATE INDEX IF NOT EXISTS idx_person_other_names_person_id ON person_other_names(person_id);
            ").map_err(|e| format!("Failed to create person_other_names table: {}", e))?;

            // Migrate existing english_name and nickname data (idempotent: skip if data already migrated)
            conn.execute_batch("
                INSERT INTO person_other_names (id, person_id, name, label, sort_order)
                SELECT hex(randomblob(16)), id, english_name, '英文名', 0
                FROM persons
                WHERE english_name IS NOT NULL AND english_name != ''
                  AND id NOT IN (
                    SELECT person_id FROM person_other_names WHERE label = '英文名'
                  );
            ").map_err(|e| format!("Failed to migrate english_name data: {}", e))?;

            conn.execute_batch("
                INSERT INTO person_other_names (id, person_id, name, label, sort_order)
                SELECT hex(randomblob(16)), id, nickname, '昵称', 1
                FROM persons
                WHERE nickname IS NOT NULL AND nickname != ''
                  AND id NOT IN (
                    SELECT person_id FROM person_other_names WHERE label = '昵称'
                  );
            ").map_err(|e| format!("Failed to migrate nickname data: {}", e))?;

            // Media tables
            migrate_media_tables(&conn)?;

            // Migrate priority values: 1→3, 2→6, 3→9 (must be done in descending order to avoid conflicts)
            let _ = conn.execute_batch("UPDATE tasks SET priority = 9 WHERE priority = 3;");
            let _ = conn.execute_batch("UPDATE tasks SET priority = 6 WHERE priority = 2;");
            let _ = conn.execute_batch("UPDATE tasks SET priority = 3 WHERE priority = 1;");

            println!("Migrations applied successfully");
        }
        Err(e) => {
            return Err(format!("Failed to open database: {}", e));
        }
    }

    Ok(())
}

pub fn migrate_media_tables(conn: &rusqlite::Connection) -> Result<(), String> {
    // Create tables if not exist
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS media_groups (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            color TEXT DEFAULT '#3B82F6',
            icon TEXT DEFAULT '🎬',
            is_preset INTEGER NOT NULL DEFAULT 0,
            sort_order REAL NOT NULL DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS media_items (
            id TEXT PRIMARY KEY,
            type TEXT NOT NULL,
            title TEXT NOT NULL,
            year INTEGER,
            cover TEXT,
            rating REAL,
            status TEXT NOT NULL DEFAULT 'normal',
            group_id TEXT REFERENCES media_groups(id),
            douban_url TEXT,
            imdb_url TEXT,
            rotten_tomatoes_url TEXT,
            tv_show_title TEXT,
            season_number INTEGER,
            sort_order REAL NOT NULL DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS media_item_genres (
            id TEXT PRIMARY KEY,
            media_item_id TEXT NOT NULL REFERENCES media_items(id) ON DELETE CASCADE,
            genre_id TEXT NOT NULL REFERENCES media_groups(id) ON DELETE CASCADE,
            UNIQUE(media_item_id, genre_id)
        );

        CREATE TABLE IF NOT EXISTS media_other_names (
            id TEXT PRIMARY KEY,
            media_item_id TEXT NOT NULL REFERENCES media_items(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            label TEXT DEFAULT '别名',
            sort_order REAL NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS media_watch_links (
            id TEXT PRIMARY KEY,
            media_item_id TEXT NOT NULL REFERENCES media_items(id) ON DELETE CASCADE,
            url TEXT NOT NULL,
            platform TEXT,
            sort_order REAL NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS media_relations (
            id TEXT PRIMARY KEY,
            media_item_id TEXT NOT NULL REFERENCES media_items(id) ON DELETE CASCADE,
            related_item_id TEXT NOT NULL REFERENCES media_items(id) ON DELETE CASCADE,
            relation_type TEXT DEFAULT 'series'
        );

        CREATE TABLE IF NOT EXISTS media_linked_items (
            id TEXT PRIMARY KEY,
            media_item_id TEXT NOT NULL REFERENCES media_items(id) ON DELETE CASCADE,
            linked_type TEXT NOT NULL,
            linked_id TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_media_items_status ON media_items(status);
        CREATE INDEX IF NOT EXISTS idx_media_items_group_id ON media_items(group_id);
        CREATE INDEX IF NOT EXISTS idx_media_items_type ON media_items(type);
        CREATE INDEX IF NOT EXISTS idx_media_other_names_media_item_id ON media_other_names(media_item_id);
        CREATE INDEX IF NOT EXISTS idx_media_watch_links_media_item_id ON media_watch_links(media_item_id);
        CREATE INDEX IF NOT EXISTS idx_media_relations_media_item_id ON media_relations(media_item_id);
        CREATE INDEX IF NOT EXISTS idx_media_relations_related_item_id ON media_relations(related_item_id);
        CREATE INDEX IF NOT EXISTS idx_media_linked_items_media_item_id ON media_linked_items(media_item_id);
    ").map_err(|e| format!("Failed to migrate media tables: {}", e))?;

    // Note linked items (bidirectional relations)
    conn.execute_batch("
        CREATE TABLE IF NOT EXISTS note_linked_items (
            id TEXT PRIMARY KEY,
            note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
            linked_type TEXT NOT NULL,
            linked_id TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_note_linked_items_note_id ON note_linked_items(note_id);
        CREATE INDEX IF NOT EXISTS idx_note_linked_items_linked_id ON note_linked_items(linked_id);
    ").map_err(|e| format!("Failed to migrate note linked items table: {}", e))?;

    // Add is_preset column if not exists
    let has_column: bool = conn.query_row(
        "SELECT COUNT(*) > 0 FROM pragma_table_info('media_groups') WHERE name = 'is_preset'",
        [],
        |row| row.get(0),
    ).unwrap_or(false);

    if !has_column {
        conn.execute("ALTER TABLE media_groups ADD COLUMN is_preset INTEGER NOT NULL DEFAULT 0", [])
            .map_err(|e| format!("Failed to add is_preset column: {}", e))?;
    }

    // Insert preset genres
    conn.execute_batch(
        "INSERT OR IGNORE INTO media_groups (id, name, color, icon, is_preset, sort_order) VALUES
            ('genre-drama', '剧情', '#8B5CF6', '🎭', 1, 1),
            ('genre-comedy', '喜剧', '#FBBF24', '😂', 1, 2),
            ('genre-action', '动作', '#EF4444', '💥', 1, 3),
            ('genre-romance', '爱情', '#EC4899', '💕', 1, 4),
            ('genre-scifi', '科幻', '#3B82F6', '🚀', 1, 5),
            ('genre-animation', '动画', '#10B981', '🎨', 1, 6),
            ('genre-mystery', '悬疑', '#6366F1', '🔍', 1, 7),
            ('genre-thriller', '惊悚', '#DC2626', '😱', 1, 8),
            ('genre-horror', '恐怖', '#1F2937', '👻', 1, 9),
            ('genre-documentary', '纪录片', '#059669', '📹', 1, 10),
            ('genre-short', '短片', '#6B7280', '📎', 1, 11),
            ('genre-erotic', '情色', '#DB2777', '🔥', 1, 12),
            ('genre-gay', '同性', '#7C3AED', '🏳️‍🌈', 1, 13),
            ('genre-music', '音乐', '#2563EB', '🎵', 1, 14),
            ('genre-musical', '歌舞', '#D97706', '💃', 1, 15),
            ('genre-family', '家庭', '#16A34A', '👨‍👩‍👧‍👦', 1, 16),
            ('genre-kids', '儿童', '#F59E0B', '🧸', 1, 17),
            ('genre-biography', '传记', '#78350F', '📖', 1, 18),
            ('genre-history', '历史', '#92400E', '🏛️', 1, 19),
            ('genre-war', '战争', '#4B5563', '⚔️', 1, 20),
            ('genre-crime', '犯罪', '#111827', '🔫', 1, 21),
            ('genre-western', '西部', '#B45309', '🤠', 1, 22),
            ('genre-fantasy', '奇幻', '#A855F7', '🧙', 1, 23),
            ('genre-adventure', '冒险', '#F97316', '🗺️', 1, 24),
            ('genre-disaster', '灾难', '#DC2626', '🌪️', 1, 25),
            ('genre-wuxia', '武侠', '#B91C1C', '🥋', 1, 26),
            ('genre-costume', '古装', '#9333EA', '👘', 1, 27),
            ('genre-sports', '运动', '#059669', '⚽', 1, 28),
            ('genre-noir', '黑色电影', '#374151', '🎬', 1, 29),
            ('genre-variety', '综艺', '#F472B6', '🎪', 1, 30),
            ('genre-art', '文艺', '#C084FC', '🖼️', 1, 31),
            ('genre-youth', '青春', '#38BDF8', '🌱', 1, 32);
    ").map_err(|e| format!("Failed to insert preset genres: {}", e))?;

    // Add is_lunar column to countdowns table if not exists
    let has_is_lunar: bool = conn.query_row(
        "SELECT COUNT(*) > 0 FROM pragma_table_info('countdowns') WHERE name = 'is_lunar'",
        [],
        |row| row.get(0),
    ).unwrap_or(false);

    if !has_is_lunar {
        conn.execute("ALTER TABLE countdowns ADD COLUMN is_lunar INTEGER NOT NULL DEFAULT 0", [])
            .map_err(|e| format!("Failed to add is_lunar column to countdowns: {}", e))?;
    }

    // Add display_mode column to countdowns table if not exists
    let has_display_mode: bool = conn.query_row(
        "SELECT COUNT(*) > 0 FROM pragma_table_info('countdowns') WHERE name = 'display_mode'",
        [],
        |row| row.get(0),
    ).unwrap_or(false);

    if !has_display_mode {
        conn.execute("ALTER TABLE countdowns ADD COLUMN display_mode TEXT NOT NULL DEFAULT 'day'", [])
            .map_err(|e| format!("Failed to add display_mode column to countdowns: {}", e))?;
    }

    // Add target_end_date column to notes table if not exists
    let has_target_end_date: bool = conn.query_row(
        "SELECT COUNT(*) > 0 FROM pragma_table_info('notes') WHERE name = 'target_end_date'",
        [],
        |row| row.get(0),
    ).unwrap_or(false);

    if !has_target_end_date {
        conn.execute("ALTER TABLE notes ADD COLUMN target_end_date TEXT", [])
            .map_err(|e| format!("Failed to add target_end_date column to notes: {}", e))?;
        let _ = conn.execute_batch("CREATE INDEX IF NOT EXISTS idx_notes_target_end_date ON notes(target_end_date);");
    }

    // Add atom column to tags table if not exists
    let has_atom: bool = conn.query_row(
        "SELECT COUNT(*) > 0 FROM pragma_table_info('tags') WHERE name = 'atom'",
        [],
        |row| row.get(0),
    ).unwrap_or(false);

    if !has_atom {
        conn.execute("ALTER TABLE tags ADD COLUMN atom INTEGER NOT NULL DEFAULT 0", [])
            .map_err(|e| format!("Failed to add atom column to tags: {}", e))?;
    }

    // Insert preset atom tags
    conn.execute_batch("
        INSERT OR IGNORE INTO tags (id, name, color, emoji, level, sort_order, atom)
        VALUES ('atom-today', 'today', '#3B82F6', '📌', 0, -1, 1);
    ").map_err(|e| format!("Failed to insert atom tags: {}", e))?;

    // Add status column to tasks table if not exists
    let has_status: bool = conn.query_row(
        "SELECT COUNT(*) > 0 FROM pragma_table_info('tasks') WHERE name = 'status'",
        [],
        |row| row.get(0),
    ).unwrap_or(false);

    if !has_status {
        conn.execute("ALTER TABLE tasks ADD COLUMN status TEXT NOT NULL DEFAULT 'pending'", [])
            .map_err(|e| format!("Failed to add status column to tasks: {}", e))?;
        conn.execute("UPDATE tasks SET status = 'completed' WHERE is_completed = 1", [])
            .map_err(|e| format!("Failed to backfill task status: {}", e))?;
    }

    let _ = conn.execute_batch("ALTER TABLE tasks ADD COLUMN visible_sections TEXT;");

    conn.execute_batch("
        CREATE TABLE IF NOT EXISTS attachments (
            id TEXT PRIMARY KEY,
            task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
            original_filename TEXT NOT NULL,
            filename TEXT NOT NULL,
            added_datetime TEXT NOT NULL DEFAULT (datetime('now')),
            sha256 TEXT NOT NULL,
            local_path TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_attachments_task_id ON attachments(task_id);
    ").map_err(|e| format!("Failed to migrate attachments table: {}", e))?;

            let _ = conn.execute_batch("ALTER TABLE attachments ADD COLUMN local_path TEXT;");

            // Add sync status columns for attachment sync to Git services
            let _ = conn.execute_batch("ALTER TABLE attachments ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'none';");
            let _ = conn.execute_batch("ALTER TABLE attachments ADD COLUMN sync_provider TEXT;");
            let _ = conn.execute_batch("ALTER TABLE attachments ADD COLUMN sync_error TEXT;");

            // Add uploaded_to, raw_url columns for tracking upload details
            let _ = conn.execute_batch("ALTER TABLE attachments ADD COLUMN uploaded_to TEXT;");
            let _ = conn.execute_batch("ALTER TABLE attachments ADD COLUMN raw_url TEXT;");

    // Task linked items (bidirectional relations)
    conn.execute_batch("
        CREATE TABLE IF NOT EXISTS task_linked_items (
            id TEXT PRIMARY KEY,
            task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
            linked_type TEXT NOT NULL,
            linked_id TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_task_linked_items_task_id ON task_linked_items(task_id);
        CREATE INDEX IF NOT EXISTS idx_task_linked_items_linked_id ON task_linked_items(linked_id);
    ").map_err(|e| format!("Failed to migrate task linked items table: {}", e))?;

    // Task templates
    conn.execute_batch("
        CREATE TABLE IF NOT EXISTS task_templates (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            steps TEXT,
            tag_ids TEXT,
            usage_count INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
    ").map_err(|e| format!("Failed to migrate task_templates table: {}", e))?;

    Ok(())
}
