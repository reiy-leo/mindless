# 影视页面实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为Mindless应用添加影视管理功能，支持电影和电视剧的分类、观看状态追踪、评分、关联等功能。

**Architecture:** 采用统一表设计，通过type字段区分电影和电视剧季。使用现有的Tauri + React Query + Drizzle ORM架构模式。

**Tech Stack:** React, TypeScript, Tauri, SQLite, Drizzle ORM, React Query, Tailwind CSS

---

## 文件结构

### 前端文件
- `src/types/media.ts` - 影视相关类型定义
- `src/queries/useMediaQueries.ts` - React Query hooks
- `src/pages/MediaPage.tsx` - 主页面组件
- `src/components/media/MediaSidebar.tsx` - 左侧边栏
- `src/components/media/MediaContent.tsx` - 右侧内容区
- `src/components/media/MediaCard.tsx` - 卡片视图组件
- `src/components/media/MediaListItem.tsx` - 列表视图组件
- `src/components/media/MediaItemForm.tsx` - 新建/编辑表单
- `src/components/media/CoverUploader.tsx` - 封面上传组件
- `src/components/media/MultiValueInput.tsx` - 多值输入组件
- `src/components/media/RelationSelector.tsx` - 关联选择器

### 后端文件
- `src-tauri/src/db/models.rs` - 添加影视相关模型
- `src-tauri/src/commands/media.rs` - Tauri命令
- `src-tauri/src/db/migrations.rs` - 数据库迁移

### 配置文件
- `drizzle/schema.ts` - Drizzle schema
- `src/i18n/locales/zh.json` - 中文翻译
- `src/i18n/locales/en.json` - 英文翻译

---

## Task 1: 数据库Schema和类型定义

**Files:**
- Modify: `drizzle/schema.ts`
- Create: `src/types/media.ts`
- Modify: `src-tauri/src/db/models.rs`

- [ ] **Step 1: 添加Drizzle Schema**

在 `drizzle/schema.ts` 文件末尾添加影视相关表：

```typescript
// Media groups table
export const mediaGroups = sqliteTable('media_groups', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  color: text('color').default('#3B82F6'),
  icon: text('icon').default('🎬'),
  sortOrder: real('sort_order').notNull().default(0),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
});

// Media items table (movies and TV seasons)
export const mediaItems = sqliteTable('media_items', {
  id: text('id').primaryKey(),
  type: text('type').notNull(), // 'movie' | 'season'
  title: text('title').notNull(),
  year: integer('year'),
  cover: text('cover'),
  rating: real('rating'),
  status: text('status').notNull().default('normal'), // 'normal' | 'favorite' | 'watched' | 'archived'
  groupId: text('group_id').references(() => mediaGroups.id),
  doubanUrl: text('douban_url'),
  imdbUrl: text('imdb_url'),
  rottenTomatoesUrl: text('rotten_tomatoes_url'),
  tvShowTitle: text('tv_show_title'),
  seasonNumber: integer('season_number'),
  sortOrder: real('sort_order').notNull().default(0),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
});

// Media other names table
export const mediaOtherNames = sqliteTable('media_other_names', {
  id: text('id').primaryKey(),
  mediaItemId: text('media_item_id').notNull().references(() => mediaItems.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  label: text('label').default('别名'),
  sortOrder: real('sort_order').notNull().default(0),
});

// Media watch links table
export const mediaWatchLinks = sqliteTable('media_watch_links', {
  id: text('id').primaryKey(),
  mediaItemId: text('media_item_id').notNull().references(() => mediaItems.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  platform: text('platform'),
  sortOrder: real('sort_order').notNull().default(0),
});

// Media relations table (bidirectional)
export const mediaRelations = sqliteTable('media_relations', {
  id: text('id').primaryKey(),
  mediaItemId: text('media_item_id').notNull().references(() => mediaItems.id, { onDelete: 'cascade' }),
  relatedItemId: text('related_item_id').notNull().references(() => mediaItems.id, { onDelete: 'cascade' }),
  relationType: text('relation_type').default('series'),
});
```

- [ ] **Step 2: 创建TypeScript类型定义**

创建 `src/types/media.ts` 文件：

```typescript
export type MediaType = 'movie' | 'season';
export type MediaStatus = 'normal' | 'favorite' | 'watched' | 'archived';
export type RelationType = 'series' | 'sequel' | 'prequel' | 'spin-off';

export interface MediaGroup {
  id: string;
  name: string;
  color: string;
  icon: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface MediaItem {
  id: string;
  type: MediaType;
  title: string;
  year: number | null;
  cover: string | null;
  rating: number | null;
  status: MediaStatus;
  groupId: string | null;
  doubanUrl: string | null;
  imdbUrl: string | null;
  rottenTomatoesUrl: string | null;
  tvShowTitle: string | null;
  seasonNumber: number | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface MediaOtherName {
  id: string;
  mediaItemId: string;
  name: string;
  label: string;
  sortOrder: number;
}

export interface MediaWatchLink {
  id: string;
  mediaItemId: string;
  url: string;
  platform: string | null;
  sortOrder: number;
}

export interface MediaRelation {
  id: string;
  mediaItemId: string;
  relatedItemId: string;
  relationType: RelationType;
}

export interface MediaItemWithDetails extends MediaItem {
  otherNames: MediaOtherName[];
  watchLinks: MediaWatchLink[];
  relations: MediaRelation[];
}

export interface CreateMediaItemInput {
  type: MediaType;
  title: string;
  year?: number;
  cover?: string;
  rating?: number;
  status?: MediaStatus;
  groupId?: string;
  doubanUrl?: string;
  imdbUrl?: string;
  rottenTomatoesUrl?: string;
  tvShowTitle?: string;
  seasonNumber?: number;
  otherNames?: { name: string; label?: string }[];
  watchLinks?: { url: string; platform?: string }[];
  relatedItemIds?: string[];
}

export interface UpdateMediaItemInput {
  title?: string;
  year?: number;
  cover?: string;
  rating?: number;
  status?: MediaStatus;
  groupId?: string;
  doubanUrl?: string;
  imdbUrl?: string;
  rottenTomatoesUrl?: string;
  tvShowTitle?: string;
  seasonNumber?: number;
  otherNames?: { name: string; label?: string }[];
  watchLinks?: { url: string; platform?: string }[];
  relatedItemIds?: string[];
}
```

- [ ] **Step 3: 添加Rust模型定义**

在 `src-tauri/src/db/models.rs` 文件末尾添加：

```rust
// Media group model
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaGroup {
    pub id: String,
    pub name: String,
    pub color: Option<String>,
    pub icon: Option<String>,
    pub sort_order: f64,
    pub created_at: String,
    pub updated_at: String,
}

// Media item model
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaItem {
    pub id: String,
    pub r#type: String,
    pub title: String,
    pub year: Option<i32>,
    pub cover: Option<String>,
    pub rating: Option<f64>,
    pub status: String,
    pub group_id: Option<String>,
    pub douban_url: Option<String>,
    pub imdb_url: Option<String>,
    pub rotten_tomatoes_url: Option<String>,
    pub tv_show_title: Option<String>,
    pub season_number: Option<i32>,
    pub sort_order: f64,
    pub created_at: String,
    pub updated_at: String,
}

// Media other name model
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaOtherName {
    pub id: String,
    pub media_item_id: String,
    pub name: String,
    pub label: Option<String>,
    pub sort_order: f64,
}

// Media watch link model
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaWatchLink {
    pub id: String,
    pub media_item_id: String,
    pub url: String,
    pub platform: Option<String>,
    pub sort_order: f64,
}

// Media relation model
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaRelation {
    pub id: String,
    pub media_item_id: String,
    pub related_item_id: String,
    pub relation_type: Option<String>,
}
```

- [ ] **Step 4: 验证类型定义**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add drizzle/schema.ts src/types/media.ts src-tauri/src/db/models.rs
git commit -m "feat(media): add database schema and type definitions"
```

---

## Task 2: 数据库迁移和Rust命令

**Files:**
- Modify: `src-tauri/src/db/migrations.rs`
- Create: `src-tauri/src/commands/media.rs`
- Modify: `src-tauri/src/commands/mod.rs`

- [ ] **Step 1: 添加数据库迁移**

在 `src-tauri/src/db/migrations.rs` 中添加迁移函数：

```rust
pub fn migrate_media_tables(conn: &rusqlite::Connection) -> Result<(), String> {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS media_groups (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            color TEXT DEFAULT '#3B82F6',
            icon TEXT DEFAULT '🎬',
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

        CREATE INDEX IF NOT EXISTS idx_media_items_status ON media_items(status);
        CREATE INDEX IF NOT EXISTS idx_media_items_group_id ON media_items(group_id);
        CREATE INDEX IF NOT EXISTS idx_media_items_type ON media_items(type);
        CREATE INDEX IF NOT EXISTS idx_media_other_names_media_item_id ON media_other_names(media_item_id);
        CREATE INDEX IF NOT EXISTS idx_media_watch_links_media_item_id ON media_watch_links(media_item_id);
        CREATE INDEX IF NOT EXISTS idx_media_relations_media_item_id ON media_relations(media_item_id);
        CREATE INDEX IF NOT EXISTS idx_media_relations_related_item_id ON media_relations(related_item_id);"
    ).map_err(|e| format!("Failed to migrate media tables: {}", e))?;

    Ok(())
}
```

- [ ] **Step 2: 创建Tauri命令文件**

创建 `src-tauri/src/commands/media.rs` 文件：

```rust
use tauri::AppHandle;
use uuid::Uuid;
use crate::db::models::{MediaGroup, MediaItem, MediaOtherName, MediaWatchLink, MediaRelation};

fn get_db(app: &AppHandle) -> Result<rusqlite::Connection, String> {
    crate::db::connection::open_connection(app)
}

// ==================== Media Group Commands ====================

#[tauri::command]
pub async fn get_media_groups(app: AppHandle) -> Result<Vec<MediaGroup>, String> {
    let conn = get_db(&app)?;
    let mut stmt = conn.prepare("SELECT * FROM media_groups ORDER BY sort_order ASC, created_at ASC")
        .map_err(|e| format!("Failed to prepare: {}", e))?;
    let groups = stmt.query_map([], |row| {
        Ok(MediaGroup {
            id: row.get(0)?,
            name: row.get(1)?,
            color: row.get(2)?,
            icon: row.get(3)?,
            sort_order: row.get(4)?,
            created_at: row.get(5)?,
            updated_at: row.get(6)?,
        })
    }).map_err(|e| format!("Failed to query: {}", e))?;
    let result: Result<Vec<_>, _> = groups.collect();
    result.map_err(|e| format!("Failed to collect: {}", e))
}

#[tauri::command]
pub async fn create_media_group(
    app: AppHandle,
    name: String,
    color: Option<String>,
    icon: Option<String>,
) -> Result<MediaGroup, String> {
    let conn = get_db(&app)?;
    let id = Uuid::new_v4().to_string();
    let color = color.as_deref().unwrap_or("#3B82F6");
    let icon = icon.as_deref().unwrap_or("🎬");

    let max_sort: f64 = conn.query_row(
        "SELECT COALESCE(MAX(sort_order), -1) + 1 FROM media_groups",
        [],
        |row| row.get(0),
    ).unwrap_or(0.0);

    conn.execute(
        "INSERT INTO media_groups (id, name, color, icon, sort_order) VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![&id, &name, color, icon, &max_sort],
    ).map_err(|e| format!("Failed to create media group: {}", e))?;

    let group = conn.query_row("SELECT * FROM media_groups WHERE id = ?1", [&id], |row| {
        Ok(MediaGroup {
            id: row.get(0)?,
            name: row.get(1)?,
            color: row.get(2)?,
            icon: row.get(3)?,
            sort_order: row.get(4)?,
            created_at: row.get(5)?,
            updated_at: row.get(6)?,
        })
    }).map_err(|e| format!("Failed to fetch media group: {}", e))?;
    Ok(group)
}

#[tauri::command]
pub async fn update_media_group(
    app: AppHandle,
    id: String,
    name: Option<String>,
    color: Option<String>,
    icon: Option<String>,
) -> Result<MediaGroup, String> {
    let conn = get_db(&app)?;

    let mut sql = String::from("UPDATE media_groups SET updated_at = datetime('now')");
    let mut param_idx = 1;

    if let Some(ref n) = name {
        sql.push_str(&format!(", name = ?{}", param_idx));
        param_idx += 1;
    }
    if let Some(ref c) = color {
        sql.push_str(&format!(", color = ?{}", param_idx));
        param_idx += 1;
    }
    if let Some(ref i) = icon {
        sql.push_str(&format!(", icon = ?{}", param_idx));
        param_idx += 1;
    }

    sql.push_str(&format!(" WHERE id = ?{}", param_idx));

    let mut params: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();
    if let Some(ref n) = name { params.push(Box::new(n.clone())); }
    if let Some(ref c) = color { params.push(Box::new(c.clone())); }
    if let Some(ref i) = icon { params.push(Box::new(i.clone())); }
    params.push(Box::new(id.clone()));

    let param_refs: Vec<&dyn rusqlite::types::ToSql> = params.iter().map(|p| p.as_ref()).collect();
    conn.execute(&sql, param_refs.as_slice())
        .map_err(|e| format!("Failed to update media group: {}", e))?;

    let group = conn.query_row("SELECT * FROM media_groups WHERE id = ?1", [&id], |row| {
        Ok(MediaGroup {
            id: row.get(0)?,
            name: row.get(1)?,
            color: row.get(2)?,
            icon: row.get(3)?,
            sort_order: row.get(4)?,
            created_at: row.get(5)?,
            updated_at: row.get(6)?,
        })
    }).map_err(|e| format!("Failed to fetch media group: {}", e))?;
    Ok(group)
}

#[tauri::command]
pub async fn delete_media_group(app: AppHandle, id: String) -> Result<(), String> {
    let conn = get_db(&app)?;
    conn.execute("DELETE FROM media_groups WHERE id = ?1", [&id])
        .map_err(|e| format!("Failed to delete media group: {}", e))?;
    Ok(())
}

// ==================== Media Item Commands ====================

#[tauri::command]
pub async fn get_media_items(
    app: AppHandle,
    status: Option<String>,
    group_id: Option<String>,
    search: Option<String>,
) -> Result<Vec<MediaItem>, String> {
    let conn = get_db(&app)?;

    let mut sql = String::from("SELECT * FROM media_items WHERE 1=1");
    let mut params: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

    if let Some(ref s) = status {
        sql.push_str(" AND status = ?");
        params.push(Box::new(s.clone()));
    }
    if let Some(ref g) = group_id {
        sql.push_str(" AND group_id = ?");
        params.push(Box::new(g.clone()));
    }
    if let Some(ref search_term) = search {
        sql.push_str(" AND (title LIKE ? OR tv_show_title LIKE ?)");
        let search_pattern = format!("%{}%", search_term);
        params.push(Box::new(search_pattern.clone()));
        params.push(Box::new(search_pattern));
    }

    sql.push_str(" ORDER BY sort_order ASC, created_at DESC");

    let mut stmt = conn.prepare(&sql)
        .map_err(|e| format!("Failed to prepare: {}", e))?;

    let param_refs: Vec<&dyn rusqlite::types::ToSql> = params.iter().map(|p| p.as_ref()).collect();
    let items = stmt.query_map(param_refs.as_slice(), |row| {
        Ok(MediaItem {
            id: row.get(0)?,
            r#type: row.get(1)?,
            title: row.get(2)?,
            year: row.get(3)?,
            cover: row.get(4)?,
            rating: row.get(5)?,
            status: row.get(6)?,
            group_id: row.get(7)?,
            douban_url: row.get(8)?,
            imdb_url: row.get(9)?,
            rotten_tomatoes_url: row.get(10)?,
            tv_show_title: row.get(11)?,
            season_number: row.get(12)?,
            sort_order: row.get(13)?,
            created_at: row.get(14)?,
            updated_at: row.get(15)?,
        })
    }).map_err(|e| format!("Failed to query: {}", e))?;

    let result: Result<Vec<_>, _> = items.collect();
    result.map_err(|e| format!("Failed to collect: {}", e))
}

#[tauri::command]
pub async fn create_media_item(
    app: AppHandle,
    r#type: String,
    title: String,
    year: Option<i32>,
    cover: Option<String>,
    rating: Option<f64>,
    status: Option<String>,
    group_id: Option<String>,
    douban_url: Option<String>,
    imdb_url: Option<String>,
    rotten_tomatoes_url: Option<String>,
    tv_show_title: Option<String>,
    season_number: Option<i32>,
    other_names: Option<Vec<serde_json::Value>>,
    watch_links: Option<Vec<serde_json::Value>>,
    related_item_ids: Option<Vec<String>>,
) -> Result<MediaItem, String> {
    let conn = get_db(&app)?;
    let id = Uuid::new_v4().to_string();
    let status = status.as_deref().unwrap_or("normal");

    let max_sort: f64 = conn.query_row(
        "SELECT COALESCE(MAX(sort_order), -1) + 1 FROM media_items",
        [],
        |row| row.get(0),
    ).unwrap_or(0.0);

    conn.execute(
        "INSERT INTO media_items (id, type, title, year, cover, rating, status, group_id, douban_url, imdb_url, rotten_tomatoes_url, tv_show_title, season_number, sort_order) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)",
        rusqlite::params![&id, &r#type, &title, year, cover, rating, status, group_id, douban_url, imdb_url, rotten_tomatoes_url, tv_show_title, season_number, &max_sort],
    ).map_err(|e| format!("Failed to create media item: {}", e))?;

    // Insert other names
    if let Some(names) = other_names {
        for (i, name_data) in names.iter().enumerate() {
            let name = name_data["name"].as_str().unwrap_or("");
            let label = name_data["label"].as_str().unwrap_or("别名");
            let name_id = Uuid::new_v4().to_string();
            conn.execute(
                "INSERT INTO media_other_names (id, media_item_id, name, label, sort_order) VALUES (?1, ?2, ?3, ?4, ?5)",
                rusqlite::params![&name_id, &id, name, label, i as f64],
            ).map_err(|e| format!("Failed to create other name: {}", e))?;
        }
    }

    // Insert watch links
    if let Some(links) = watch_links {
        for (i, link_data) in links.iter().enumerate() {
            let url = link_data["url"].as_str().unwrap_or("");
            let platform = link_data["platform"].as_str();
            let link_id = Uuid::new_v4().to_string();
            conn.execute(
                "INSERT INTO media_watch_links (id, media_item_id, url, platform, sort_order) VALUES (?1, ?2, ?3, ?4, ?5)",
                rusqlite::params![&link_id, &id, url, platform, i as f64],
            ).map_err(|e| format!("Failed to create watch link: {}", e))?;
        }
    }

    // Insert relations
    if let Some(related_ids) = related_item_ids {
        for related_id in related_ids {
            let relation_id = Uuid::new_v4().to_string();
            conn.execute(
                "INSERT INTO media_relations (id, media_item_id, related_item_id, relation_type) VALUES (?1, ?2, ?3, ?4)",
                rusqlite::params![&relation_id, &id, related_id, "series"],
            ).map_err(|e| format!("Failed to create relation: {}", e))?;

            // Create reverse relation
            let reverse_relation_id = Uuid::new_v4().to_string();
            conn.execute(
                "INSERT INTO media_relations (id, media_item_id, related_item_id, relation_type) VALUES (?1, ?2, ?3, ?4)",
                rusqlite::params![&reverse_relation_id, related_id, &id, "series"],
            ).map_err(|e| format!("Failed to create reverse relation: {}", e))?;
        }
    }

    let item = conn.query_row("SELECT * FROM media_items WHERE id = ?1", [&id], |row| {
        Ok(MediaItem {
            id: row.get(0)?,
            r#type: row.get(1)?,
            title: row.get(2)?,
            year: row.get(3)?,
            cover: row.get(4)?,
            rating: row.get(5)?,
            status: row.get(6)?,
            group_id: row.get(7)?,
            douban_url: row.get(8)?,
            imdb_url: row.get(9)?,
            rotten_tomatoes_url: row.get(10)?,
            tv_show_title: row.get(11)?,
            season_number: row.get(12)?,
            sort_order: row.get(13)?,
            created_at: row.get(14)?,
            updated_at: row.get(15)?,
        })
    }).map_err(|e| format!("Failed to fetch media item: {}", e))?;
    Ok(item)
}

#[tauri::command]
pub async fn update_media_item(
    app: AppHandle,
    id: String,
    title: Option<String>,
    year: Option<i32>,
    cover: Option<String>,
    rating: Option<f64>,
    status: Option<String>,
    group_id: Option<String>,
    douban_url: Option<String>,
    imdb_url: Option<String>,
    rotten_tomatoes_url: Option<String>,
    tv_show_title: Option<String>,
    season_number: Option<i32>,
    other_names: Option<Vec<serde_json::Value>>,
    watch_links: Option<Vec<serde_json::Value>>,
    related_item_ids: Option<Vec<String>>,
) -> Result<MediaItem, String> {
    let conn = get_db(&app)?;

    let mut sql = String::from("UPDATE media_items SET updated_at = datetime('now')");
    let mut param_idx = 1;

    if title.is_some() { sql.push_str(&format!(", title = ?{}", param_idx)); param_idx += 1; }
    if year.is_some() { sql.push_str(&format!(", year = ?{}", param_idx)); param_idx += 1; }
    if cover.is_some() { sql.push_str(&format!(", cover = ?{}", param_idx)); param_idx += 1; }
    if rating.is_some() { sql.push_str(&format!(", rating = ?{}", param_idx)); param_idx += 1; }
    if status.is_some() { sql.push_str(&format!(", status = ?{}", param_idx)); param_idx += 1; }
    if group_id.is_some() { sql.push_str(&format!(", group_id = ?{}", param_idx)); param_idx += 1; }
    if douban_url.is_some() { sql.push_str(&format!(", douban_url = ?{}", param_idx)); param_idx += 1; }
    if imdb_url.is_some() { sql.push_str(&format!(", imdb_url = ?{}", param_idx)); param_idx += 1; }
    if rotten_tomatoes_url.is_some() { sql.push_str(&format!(", rotten_tomatoes_url = ?{}", param_idx)); param_idx += 1; }
    if tv_show_title.is_some() { sql.push_str(&format!(", tv_show_title = ?{}", param_idx)); param_idx += 1; }
    if season_number.is_some() { sql.push_str(&format!(", season_number = ?{}", param_idx)); param_idx += 1; }

    sql.push_str(&format!(" WHERE id = ?{}", param_idx));

    let mut params: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();
    if let Some(ref t) = title { params.push(Box::new(t.clone())); }
    if let Some(y) = year { params.push(Box::new(y)); }
    if let Some(ref c) = cover { params.push(Box::new(c.clone())); }
    if let Some(r) = rating { params.push(Box::new(r)); }
    if let Some(ref s) = status { params.push(Box::new(s.clone())); }
    if let Some(ref g) = group_id { params.push(Box::new(g.clone())); }
    if let Some(ref d) = douban_url { params.push(Box::new(d.clone())); }
    if let Some(ref i) = imdb_url { params.push(Box::new(i.clone())); }
    if let Some(ref r) = rotten_tomatoes_url { params.push(Box::new(r.clone())); }
    if let Some(ref t) = tv_show_title { params.push(Box::new(t.clone())); }
    if let Some(s) = season_number { params.push(Box::new(s)); }
    params.push(Box::new(id.clone()));

    let param_refs: Vec<&dyn rusqlite::types::ToSql> = params.iter().map(|p| p.as_ref()).collect();
    conn.execute(&sql, param_refs.as_slice())
        .map_err(|e| format!("Failed to update media item: {}", e))?;

    // Update other names
    if let Some(names) = other_names {
        conn.execute("DELETE FROM media_other_names WHERE media_item_id = ?1", [&id])
            .map_err(|e| format!("Failed to delete other names: {}", e))?;
        for (i, name_data) in names.iter().enumerate() {
            let name = name_data["name"].as_str().unwrap_or("");
            let label = name_data["label"].as_str().unwrap_or("别名");
            let name_id = Uuid::new_v4().to_string();
            conn.execute(
                "INSERT INTO media_other_names (id, media_item_id, name, label, sort_order) VALUES (?1, ?2, ?3, ?4, ?5)",
                rusqlite::params![&name_id, &id, name, label, i as f64],
            ).map_err(|e| format!("Failed to create other name: {}", e))?;
        }
    }

    // Update watch links
    if let Some(links) = watch_links {
        conn.execute("DELETE FROM media_watch_links WHERE media_item_id = ?1", [&id])
            .map_err(|e| format!("Failed to delete watch links: {}", e))?;
        for (i, link_data) in links.iter().enumerate() {
            let url = link_data["url"].as_str().unwrap_or("");
            let platform = link_data["platform"].as_str();
            let link_id = Uuid::new_v4().to_string();
            conn.execute(
                "INSERT INTO media_watch_links (id, media_item_id, url, platform, sort_order) VALUES (?1, ?2, ?3, ?4, ?5)",
                rusqlite::params![&link_id, &id, url, platform, i as f64],
            ).map_err(|e| format!("Failed to create watch link: {}", e))?;
        }
    }

    // Update relations
    if let Some(related_ids) = related_item_ids {
        conn.execute("DELETE FROM media_relations WHERE media_item_id = ?1 OR related_item_id = ?1", [&id])
            .map_err(|e| format!("Failed to delete relations: {}", e))?;
        for related_id in related_ids {
            let relation_id = Uuid::new_v4().to_string();
            conn.execute(
                "INSERT INTO media_relations (id, media_item_id, related_item_id, relation_type) VALUES (?1, ?2, ?3, ?4)",
                rusqlite::params![&relation_id, &id, related_id, "series"],
            ).map_err(|e| format!("Failed to create relation: {}", e))?;

            let reverse_relation_id = Uuid::new_v4().to_string();
            conn.execute(
                "INSERT INTO media_relations (id, media_item_id, related_item_id, relation_type) VALUES (?1, ?2, ?3, ?4)",
                rusqlite::params![&reverse_relation_id, related_id, &id, "series"],
            ).map_err(|e| format!("Failed to create reverse relation: {}", e))?;
        }
    }

    let item = conn.query_row("SELECT * FROM media_items WHERE id = ?1", [&id], |row| {
        Ok(MediaItem {
            id: row.get(0)?,
            r#type: row.get(1)?,
            title: row.get(2)?,
            year: row.get(3)?,
            cover: row.get(4)?,
            rating: row.get(5)?,
            status: row.get(6)?,
            group_id: row.get(7)?,
            douban_url: row.get(8)?,
            imdb_url: row.get(9)?,
            rotten_tomatoes_url: row.get(10)?,
            tv_show_title: row.get(11)?,
            season_number: row.get(12)?,
            sort_order: row.get(13)?,
            created_at: row.get(14)?,
            updated_at: row.get(15)?,
        })
    }).map_err(|e| format!("Failed to fetch media item: {}", e))?;
    Ok(item)
}

#[tauri::command]
pub async fn delete_media_item(app: AppHandle, id: String) -> Result<(), String> {
    let conn = get_db(&app)?;
    conn.execute("DELETE FROM media_items WHERE id = ?1", [&id])
        .map_err(|e| format!("Failed to delete media item: {}", e))?;
    Ok(())
}

#[tauri::command]
pub async fn get_media_item_details(app: AppHandle, id: String) -> Result<serde_json::Value, String> {
    let conn = get_db(&app)?;

    let item = conn.query_row("SELECT * FROM media_items WHERE id = ?1", [&id], |row| {
        Ok(MediaItem {
            id: row.get(0)?,
            r#type: row.get(1)?,
            title: row.get(2)?,
            year: row.get(3)?,
            cover: row.get(4)?,
            rating: row.get(5)?,
            status: row.get(6)?,
            group_id: row.get(7)?,
            douban_url: row.get(8)?,
            imdb_url: row.get(9)?,
            rotten_tomatoes_url: row.get(10)?,
            tv_show_title: row.get(11)?,
            season_number: row.get(12)?,
            sort_order: row.get(13)?,
            created_at: row.get(14)?,
            updated_at: row.get(15)?,
        })
    }).map_err(|e| format!("Failed to fetch media item: {}", e))?;

    // Get other names
    let mut stmt = conn.prepare("SELECT * FROM media_other_names WHERE media_item_id = ?1 ORDER BY sort_order ASC")
        .map_err(|e| format!("Failed to prepare: {}", e))?;
    let other_names: Vec<MediaOtherName> = stmt.query_map([&id], |row| {
        Ok(MediaOtherName {
            id: row.get(0)?,
            media_item_id: row.get(1)?,
            name: row.get(2)?,
            label: row.get(3)?,
            sort_order: row.get(4)?,
        })
    }).map_err(|e| format!("Failed to query: {}", e))?.collect::<Result<Vec<_>, _>>().map_err(|e| format!("Failed to collect: {}", e))?;

    // Get watch links
    let mut stmt = conn.prepare("SELECT * FROM media_watch_links WHERE media_item_id = ?1 ORDER BY sort_order ASC")
        .map_err(|e| format!("Failed to prepare: {}", e))?;
    let watch_links: Vec<MediaWatchLink> = stmt.query_map([&id], |row| {
        Ok(MediaWatchLink {
            id: row.get(0)?,
            media_item_id: row.get(1)?,
            url: row.get(2)?,
            platform: row.get(3)?,
            sort_order: row.get(4)?,
        })
    }).map_err(|e| format!("Failed to query: {}", e))?.collect::<Result<Vec<_>, _>>().map_err(|e| format!("Failed to collect: {}", e))?;

    // Get relations
    let mut stmt = conn.prepare("SELECT * FROM media_relations WHERE media_item_id = ?1")
        .map_err(|e| format!("Failed to prepare: {}", e))?;
    let relations: Vec<MediaRelation> = stmt.query_map([&id], |row| {
        Ok(MediaRelation {
            id: row.get(0)?,
            media_item_id: row.get(1)?,
            related_item_id: row.get(2)?,
            relation_type: row.get(3)?,
        })
    }).map_err(|e| format!("Failed to query: {}", e))?.collect::<Result<Vec<_>, _>>().map_err(|e| format!("Failed to collect: {}", e))?;

    let result = serde_json::json!({
        "item": item,
        "otherNames": other_names,
        "watchLinks": watch_links,
        "relations": relations,
    });

    Ok(result)
}
```

- [ ] **Step 3: 注册命令**

在 `src-tauri/src/commands/mod.rs` 中添加：

```rust
pub mod media;
```

并在 `src-tauri/src/lib.rs` 中注册命令：

```rust
.invoke_handler(tauri::generate_handler![
    // ... existing commands
    commands::media::get_media_groups,
    commands::media::create_media_group,
    commands::media::update_media_group,
    commands::media::delete_media_group,
    commands::media::get_media_items,
    commands::media::create_media_item,
    commands::media::update_media_item,
    commands::media::delete_media_item,
    commands::media::get_media_item_details,
])
```

- [ ] **Step 4: 验证Rust代码编译**

Run: `cd src-tauri && cargo check`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/db/migrations.rs src-tauri/src/commands/media.rs src-tauri/src/commands/mod.rs src-tauri/src/lib.rs
git commit -m "feat(media): add database migrations and Tauri commands"
```

---

## Task 3: API层和React Query Hooks

**Files:**
- Modify: `src/lib/api.ts`
- Create: `src/queries/useMediaQueries.ts`

- [ ] **Step 1: 添加API函数**

在 `src/lib/api.ts` 文件末尾添加：

```typescript
// Media Group APIs
export async function getMediaGroups(): Promise<MediaGroup[]> {
  return await invoke<MediaGroup[]>('get_media_groups');
}

export async function createMediaGroup(params: {
  name: string;
  color?: string;
  icon?: string;
}): Promise<MediaGroup> {
  return await invoke<MediaGroup>('create_media_group', params);
}

export async function updateMediaGroup(id: string, params: {
  name?: string;
  color?: string;
  icon?: string;
}): Promise<MediaGroup> {
  return await invoke<MediaGroup>('update_media_group', { id, ...params });
}

export async function deleteMediaGroup(id: string): Promise<void> {
  return await invoke<void>('delete_media_group', { id });
}

// Media Item APIs
export async function getMediaItems(filters?: {
  status?: string;
  groupId?: string;
  search?: string;
}): Promise<MediaItem[]> {
  return await invoke<MediaItem[]>('get_media_items', { filters });
}

export async function createMediaItem(params: CreateMediaItemInput): Promise<MediaItem> {
  return await invoke<MediaItem>('create_media_item', params);
}

export async function updateMediaItem(id: string, params: UpdateMediaItemInput): Promise<MediaItem> {
  return await invoke<MediaItem>('update_media_item', { id, ...params });
}

export async function deleteMediaItem(id: string): Promise<void> {
  return await invoke<void>('delete_media_item', { id });
}

export async function getMediaItemDetails(id: string): Promise<MediaItemWithDetails> {
  return await invoke<MediaItemWithDetails>('get_media_item_details', { id });
}
```

- [ ] **Step 2: 创建React Query Hooks**

创建 `src/queries/useMediaQueries.ts` 文件：

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '@/lib/api';
import type { MediaGroup, MediaItem, CreateMediaItemInput, UpdateMediaItemInput } from '@/types/media';

// Media Group hooks
export function useMediaGroups() {
  return useQuery({
    queryKey: ['mediaGroups'],
    queryFn: api.getMediaGroups,
  });
}

export function useCreateMediaGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { name: string; color?: string; icon?: string }) =>
      api.createMediaGroup(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mediaGroups'] });
    },
  });
}

export function useUpdateMediaGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...params }: { id: string; name?: string; color?: string; icon?: string }) =>
      api.updateMediaGroup(id, params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mediaGroups'] });
    },
  });
}

export function useDeleteMediaGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteMediaGroup(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mediaGroups'] });
      queryClient.invalidateQueries({ queryKey: ['mediaItems'] });
    },
  });
}

// Media Item hooks
export function useMediaItems(filters?: { status?: string; groupId?: string; search?: string }) {
  return useQuery({
    queryKey: ['mediaItems', filters],
    queryFn: () => api.getMediaItems(filters),
  });
}

export function useMediaItemDetails(id: string | null) {
  return useQuery({
    queryKey: ['mediaItemDetails', id],
    queryFn: () => api.getMediaItemDetails(id!),
    enabled: !!id,
  });
}

export function useCreateMediaItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: CreateMediaItemInput) => api.createMediaItem(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mediaItems'] });
    },
  });
}

export function useUpdateMediaItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...params }: { id: string } & UpdateMediaItemInput) =>
      api.updateMediaItem(id, params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mediaItems'] });
      queryClient.invalidateQueries({ queryKey: ['mediaItemDetails'] });
    },
  });
}

export function useDeleteMediaItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteMediaItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mediaItems'] });
    },
  });
}
```

- [ ] **Step 3: 添加类型导入**

在 `src/lib/api.ts` 文件顶部添加：

```typescript
import type { MediaGroup, MediaItem, MediaItemWithDetails, CreateMediaItemInput, UpdateMediaItemInput } from '@/types/media';
```

- [ ] **Step 4: 验证TypeScript编译**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/api.ts src/queries/useMediaQueries.ts
git commit -m "feat(media): add API layer and React Query hooks"
```

---

## Task 4: 国际化和Store配置

**Files:**
- Modify: `src/i18n/locales/zh.json`
- Modify: `src/i18n/locales/en.json`
- Modify: `src/stores/useAppStore.ts`

- [ ] **Step 1: 添加中文翻译**

在 `src/i18n/locales/zh.json` 中添加：

```json
{
  "media": {
    "title": "影视",
    "smart_groups": {
      "all": "所有",
      "favorites": "收藏",
      "normal": "正常",
      "watched": "已看完",
      "archived": "已归档"
    },
    "actions": {
      "new": "新建",
      "edit": "编辑",
      "delete": "删除",
      "save": "保存",
      "cancel": "取消",
      "new_group": "新建分组",
      "edit_group": "编辑分组",
      "delete_group": "删除分组"
    },
    "fields": {
      "title": "名称",
      "otherNames": "其他名称",
      "year": "年份",
      "rating": "评分",
      "cover": "封面",
      "doubanUrl": "豆瓣链接",
      "imdbUrl": "IMDB链接",
      "rottenTomatoesUrl": "蓝番茄链接",
      "watchLinks": "在线观看链接",
      "relations": "关联影片",
      "status": "观看状态",
      "group": "分组",
      "type": "类型",
      "tvShowTitle": "剧名",
      "seasonNumber": "季号"
    },
    "status": {
      "normal": "正常",
      "favorite": "收藏",
      "watched": "已看完",
      "archived": "已归档"
    },
    "type": {
      "movie": "电影",
      "season": "电视剧季"
    },
    "placeholder": {
      "search": "搜索影片...",
      "title": "请输入名称",
      "year": "请输入年份",
      "rating": "请输入评分",
      "doubanUrl": "请输入豆瓣链接",
      "imdbUrl": "请输入IMDB链接",
      "rottenTomatoesUrl": "请输入蓝番茄链接",
      "watchLink": "请输入观看链接",
      "otherName": "请输入其他名称",
      "tvShowTitle": "请输入剧名",
      "seasonNumber": "请输入季号"
    },
    "message": {
      "confirm_delete": "确定要删除这个影片吗？",
      "confirm_delete_group": "确定要删除这个分组吗？",
      "no_items": "暂无影片",
      "loading": "加载中..."
    }
  }
}
```

- [ ] **Step 2: 添加英文翻译**

在 `src/i18n/locales/en.json` 中添加：

```json
{
  "media": {
    "title": "Media",
    "smart_groups": {
      "all": "All",
      "favorites": "Favorites",
      "normal": "Normal",
      "watched": "Watched",
      "archived": "Archived"
    },
    "actions": {
      "new": "New",
      "edit": "Edit",
      "delete": "Delete",
      "save": "Save",
      "cancel": "Cancel",
      "new_group": "New Group",
      "edit_group": "Edit Group",
      "delete_group": "Delete Group"
    },
    "fields": {
      "title": "Title",
      "otherNames": "Other Names",
      "year": "Year",
      "rating": "Rating",
      "cover": "Cover",
      "doubanUrl": "Douban URL",
      "imdbUrl": "IMDB URL",
      "rottenTomatoesUrl": "Rotten Tomatoes URL",
      "watchLinks": "Watch Links",
      "relations": "Related Items",
      "status": "Status",
      "group": "Group",
      "type": "Type",
      "tvShowTitle": "TV Show Title",
      "seasonNumber": "Season Number"
    },
    "status": {
      "normal": "Normal",
      "favorite": "Favorite",
      "watched": "Watched",
      "archived": "Archived"
    },
    "type": {
      "movie": "Movie",
      "season": "TV Season"
    },
    "placeholder": {
      "search": "Search media...",
      "title": "Enter title",
      "year": "Enter year",
      "rating": "Enter rating",
      "doubanUrl": "Enter Douban URL",
      "imdbUrl": "Enter IMDB URL",
      "rottenTomatoesUrl": "Enter Rotten Tomatoes URL",
      "watchLink": "Enter watch link",
      "otherName": "Enter other name",
      "tvShowTitle": "Enter TV show title",
      "seasonNumber": "Enter season number"
    },
    "message": {
      "confirm_delete": "Are you sure you want to delete this item?",
      "confirm_delete_group": "Are you sure you want to delete this group?",
      "no_items": "No media items",
      "loading": "Loading..."
    }
  }
}
```

- [ ] **Step 3: 添加Store状态**

在 `src/stores/useAppStore.ts` 中添加：

```typescript
interface AppState {
  // ... existing state
  mediaSidebarWidth: number;
  mediaDetailPanelWidth: number;
  mediaViewMode: 'grid' | 'list';
  setMediaSidebarWidth: (width: number) => void;
  setMediaDetailPanelWidth: (width: number) => void;
  setMediaViewMode: (mode: 'grid' | 'list') => void;
}

// In the store implementation:
mediaSidebarWidth: 240,
mediaDetailPanelWidth: 320,
mediaViewMode: 'grid',
setMediaSidebarWidth: (width) => set({ mediaSidebarWidth: width }),
setMediaDetailPanelWidth: (width) => set({ mediaDetailPanelWidth: width }),
setMediaViewMode: (mode) => set({ mediaViewMode: mode }),
```

- [ ] **Step 4: 验证TypeScript编译**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/i18n/locales/zh.json src/i18n/locales/en.json src/stores/useAppStore.ts
git commit -m "feat(media): add internationalization and store configuration"
```

---

## Task 5: MediaSidebar组件

**Files:**
- Create: `src/components/media/MediaSidebar.tsx`

- [ ] **Step 1: 创建MediaSidebar组件**

创建 `src/components/media/MediaSidebar.tsx` 文件：

```typescript
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  StarIcon,
  BookOpenIcon,
  ArchiveBoxIcon,
  CheckCircleIcon,
  FilmIcon,
} from '@heroicons/react/24/outline';
import { useMediaGroups, useCreateMediaGroup, useUpdateMediaGroup, useDeleteMediaGroup } from '@/queries/useMediaQueries';
import type { MediaGroup } from '@/types/media';

type SmartGroupId = 'all' | 'favorites' | 'normal' | 'watched' | 'archived';

const SMART_GROUPS: { id: SmartGroupId; icon: React.ComponentType<{ className?: string }>; labelKey: string }[] = [
  { id: 'all', icon: BookOpenIcon, labelKey: 'media.smart_groups.all' },
  { id: 'favorites', icon: StarIcon, labelKey: 'media.smart_groups.favorites' },
  { id: 'normal', icon: FilmIcon, labelKey: 'media.smart_groups.normal' },
  { id: 'watched', icon: CheckCircleIcon, labelKey: 'media.smart_groups.watched' },
  { id: 'archived', icon: ArchiveBoxIcon, labelKey: 'media.smart_groups.archived' },
];

interface MediaSidebarProps {
  selectedSmartGroup: SmartGroupId | null;
  selectedGroupId: string | null;
  onSelectSmartGroup: (groupId: SmartGroupId) => void;
  onSelectGroup: (groupId: string) => void;
  width: number;
}

export default function MediaSidebar({
  selectedSmartGroup,
  selectedGroupId,
  onSelectSmartGroup,
  onSelectGroup,
  width,
}: MediaSidebarProps) {
  const { t } = useTranslation('common');
  const { data: groups = [] } = useMediaGroups();
  const createGroup = useCreateMediaGroup();
  const updateGroup = useUpdateMediaGroup();
  const deleteGroup = useDeleteMediaGroup();

  const [groupsExpanded, setGroupsExpanded] = useState(true);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState<MediaGroup | null>(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupColor, setNewGroupColor] = useState('#3B82F6');
  const [newGroupIcon, setNewGroupIcon] = useState('🎬');

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    await createGroup.mutateAsync({
      name: newGroupName,
      color: newGroupColor,
      icon: newGroupIcon,
    });
    setNewGroupName('');
    setShowGroupForm(false);
  };

  const handleUpdateGroup = async () => {
    if (!editingGroup || !newGroupName.trim()) return;
    await updateGroup.mutateAsync({
      id: editingGroup.id,
      name: newGroupName,
      color: newGroupColor,
      icon: newGroupIcon,
    });
    setEditingGroup(null);
    setNewGroupName('');
    setShowGroupForm(false);
  };

  const handleDeleteGroup = async (id: string) => {
    if (window.confirm(t('media.message.confirm_delete_group'))) {
      await deleteGroup.mutateAsync(id);
    }
  };

  const startEditGroup = (group: MediaGroup) => {
    setEditingGroup(group);
    setNewGroupName(group.name);
    setNewGroupColor(group.color || '#3B82F6');
    setNewGroupIcon(group.icon || '🎬');
    setShowGroupForm(true);
  };

  return (
    <div className="flex flex-col h-full border-r border-gray-200 dark:border-gray-700" style={{ width }}>
      {/* Smart Groups */}
      <div className="p-3 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
          {t('media.title')}
        </h3>
        <div className="space-y-1">
          {SMART_GROUPS.map((group) => {
            const Icon = group.icon;
            const isSelected = selectedSmartGroup === group.id;
            return (
              <button
                key={group.id}
                onClick={() => onSelectSmartGroup(group.id)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${
                  isSelected
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{t(group.labelKey)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Media Groups */}
      <div className="flex-1 overflow-auto p-3">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => setGroupsExpanded(!groupsExpanded)}
            className="flex items-center gap-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider"
          >
            <span>{t('media.fields.group')}</span>
            <span>{groupsExpanded ? '▼' : '▶'}</span>
          </button>
          <button
            onClick={() => {
              setEditingGroup(null);
              setNewGroupName('');
              setNewGroupColor('#3B82F6');
              setNewGroupIcon('🎬');
              setShowGroupForm(true);
            }}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
            title={t('media.actions.new_group')}
          >
            <PlusIcon className="w-4 h-4" />
          </button>
        </div>

        {groupsExpanded && (
          <div className="space-y-1">
            {groups.map((group) => (
              <div
                key={group.id}
                className={`flex items-center justify-between px-2 py-1.5 rounded-md text-sm cursor-pointer transition-colors ${
                  selectedGroupId === group.id
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
                onClick={() => onSelectGroup(group.id)}
              >
                <div className="flex items-center gap-2">
                  <span>{group.icon || '🎬'}</span>
                  <span>{group.name}</span>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      startEditGroup(group);
                    }}
                    className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                    title={t('media.actions.edit_group')}
                  >
                    <PencilIcon className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteGroup(group.id);
                    }}
                    className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                    title={t('media.actions.delete_group')}
                  >
                    <TrashIcon className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Group Form */}
        {showGroupForm && (
          <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
            <input
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder={t('media.placeholder.title')}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded mb-2 bg-white dark:bg-gray-900"
            />
            <div className="flex gap-2 mb-2">
              <input
                type="color"
                value={newGroupColor}
                onChange={(e) => setNewGroupColor(e.target.value)}
                className="w-8 h-8 rounded cursor-pointer"
              />
              <input
                type="text"
                value={newGroupIcon}
                onChange={(e) => setNewGroupIcon(e.target.value)}
                placeholder="Icon"
                className="flex-1 px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={editingGroup ? handleUpdateGroup : handleCreateGroup}
                className="flex-1 px-3 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                {t('media.actions.save')}
              </button>
              <button
                onClick={() => {
                  setShowGroupForm(false);
                  setEditingGroup(null);
                }}
                className="flex-1 px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                {t('media.actions.cancel')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 验证TypeScript编译**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/media/MediaSidebar.tsx
git commit -m "feat(media): add MediaSidebar component"
```

---

## Task 6: MediaCard和MediaListItem组件

**Files:**
- Create: `src/components/media/MediaCard.tsx`
- Create: `src/components/media/MediaListItem.tsx`

- [ ] **Step 1: 创建MediaCard组件**

创建 `src/components/media/MediaCard.tsx` 文件：

```typescript
import { useTranslation } from 'react-i18next';
import { StarIcon } from '@heroicons/react/24/solid';
import type { MediaItem } from '@/types/media';

interface MediaCardProps {
  item: MediaItem;
  onClick: (item: MediaItem) => void;
}

export default function MediaCard({ item, onClick }: MediaCardProps) {
  const { t } = useTranslation('common');

  const statusColors = {
    normal: 'bg-gray-100 dark:bg-gray-700',
    favorite: 'bg-yellow-100 dark:bg-yellow-900',
    watched: 'bg-green-100 dark:bg-green-900',
    archived: 'bg-gray-200 dark:bg-gray-600',
  };

  return (
    <div
      className="group relative bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer overflow-hidden"
      onClick={() => onClick(item)}
    >
      {/* Cover Image */}
      <div className="aspect-[2/3] bg-gray-200 dark:bg-gray-700 relative">
        {item.cover ? (
          <img
            src={item.cover}
            alt={item.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <span className="text-4xl">🎬</span>
          </div>
        )}

        {/* Status Badge */}
        <div className={`absolute top-2 left-2 px-2 py-1 rounded text-xs font-medium ${statusColors[item.status]}`}>
          {t(`media.status.${item.status}`)}
        </div>

        {/* Rating */}
        {item.rating && (
          <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/70 text-white px-2 py-1 rounded text-xs">
            <StarIcon className="w-3 h-3 text-yellow-400" />
            <span>{item.rating.toFixed(1)}</span>
          </div>
        )}

        {/* Type Badge */}
        <div className="absolute bottom-2 left-2 px-2 py-1 rounded text-xs font-medium bg-black/70 text-white">
          {t(`media.type.${item.type}`)}
        </div>
      </div>

      {/* Title */}
      <div className="p-3">
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
          {item.title}
        </h3>
        {item.year && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {item.year}
          </p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 创建MediaListItem组件**

创建 `src/components/media/MediaListItem.tsx` 文件：

```typescript
import { useTranslation } from 'react-i18next';
import { StarIcon } from '@heroicons/react/24/solid';
import type { MediaItem } from '@/types/media';

interface MediaListItemProps {
  item: MediaItem;
  onClick: (item: MediaItem) => void;
}

export default function MediaListItem({ item, onClick }: MediaListItemProps) {
  const { t } = useTranslation('common');

  const statusColors = {
    normal: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
    favorite: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300',
    watched: 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300',
    archived: 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300',
  };

  return (
    <div
      className="flex items-center gap-4 p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => onClick(item)}
    >
      {/* Cover Thumbnail */}
      <div className="w-12 h-16 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden flex-shrink-0">
        {item.cover ? (
          <img
            src={item.cover}
            alt={item.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <span className="text-lg">🎬</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
          {item.title}
        </h3>
        <div className="flex items-center gap-2 mt-1">
          {item.year && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {item.year}
            </span>
          )}
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[item.status]}`}>
            {t(`media.status.${item.status}`)}
          </span>
        </div>
      </div>

      {/* Rating */}
      {item.rating && (
        <div className="flex items-center gap-1 text-sm text-gray-700 dark:text-gray-300">
          <StarIcon className="w-4 h-4 text-yellow-400" />
          <span>{item.rating.toFixed(1)}</span>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: 验证TypeScript编译**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/media/MediaCard.tsx src/components/media/MediaListItem.tsx
git commit -m "feat(media): add MediaCard and MediaListItem components"
```

---

## Task 7: MediaItemForm组件

**Files:**
- Create: `src/components/media/MediaItemForm.tsx`
- Create: `src/components/media/CoverUploader.tsx`
- Create: `src/components/media/MultiValueInput.tsx`
- Create: `src/components/media/RelationSelector.tsx`

- [ ] **Step 1: 创建CoverUploader组件**

创建 `src/components/media/CoverUploader.tsx` 文件：

```typescript
import { useRef } from 'react';
import { PhotoIcon } from '@heroicons/react/24/outline';

interface CoverUploaderProps {
  value: string | null;
  onChange: (url: string | null) => void;
}

export default function CoverUploader({ value, onChange }: CoverUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      onChange(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemove = () => {
    onChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        Cover
      </label>
      <div className="flex items-center gap-4">
        <div className="w-24 h-32 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
          {value ? (
            <img src={value} alt="Cover" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <PhotoIcon className="w-8 h-8" />
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Upload
          </button>
          {value && (
            <button
              type="button"
              onClick={handleRemove}
              className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              Remove
            </button>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 创建MultiValueInput组件**

创建 `src/components/media/MultiValueInput.tsx` 文件：

```typescript
import { useState } from 'react';
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface MultiValueInputProps {
  value: { name: string; label?: string }[];
  onChange: (value: { name: string; label?: string }[]) => void;
  placeholder?: string;
  showLabel?: boolean;
}

export default function MultiValueInput({
  value,
  onChange,
  placeholder = 'Add item',
  showLabel = false,
}: MultiValueInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [inputLabel, setInputLabel] = useState('');

  const handleAdd = () => {
    if (!inputValue.trim()) return;
    onChange([...value, { name: inputValue, label: inputLabel || undefined }]);
    setInputValue('');
    setInputLabel('');
  };

  const handleRemove = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        {showLabel && (
          <input
            type="text"
            value={inputLabel}
            onChange={(e) => setInputLabel(e.target.value)}
            placeholder="Label"
            className="w-24 px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900"
          />
        )}
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900"
        />
        <button
          type="button"
          onClick={handleAdd}
          className="px-2 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          <PlusIcon className="w-4 h-4" />
        </button>
      </div>

      {/* List */}
      <div className="space-y-1">
        {value.map((item, index) => (
          <div
            key={index}
            className="flex items-center gap-2 px-2 py-1.5 bg-gray-50 dark:bg-gray-800 rounded"
          >
            {showLabel && item.label && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {item.label}:
              </span>
            )}
            <span className="flex-1 text-sm text-gray-700 dark:text-gray-300">
              {item.name}
            </span>
            <button
              type="button"
              onClick={() => handleRemove(index)}
              className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              <XMarkIcon className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 创建RelationSelector组件**

创建 `src/components/media/RelationSelector.tsx` 文件：

```typescript
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useMediaItems } from '@/queries/useMediaQueries';
import type { MediaItem } from '@/types/media';

interface RelationSelectorProps {
  value: string[];
  onChange: (value: string[]) => void;
  currentItemId?: string;
}

export default function RelationSelector({ value, onChange, currentItemId }: RelationSelectorProps) {
  const { t } = useTranslation('common');
  const [search, setSearch] = useState('');
  const { data: items = [] } = useMediaItems({ search: search || undefined });

  const filteredItems = items.filter(
    (item) => item.id !== currentItemId && !value.includes(item.id)
  );

  const handleAdd = (item: MediaItem) => {
    onChange([...value, item.id]);
    setSearch('');
  };

  const handleRemove = (id: string) => {
    onChange(value.filter((v) => v !== id));
  };

  const selectedItems = items.filter((item) => value.includes(item.id));

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {t('media.fields.relations')}
      </label>

      {/* Search Input */}
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={t('media.placeholder.search')}
        className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900"
      />

      {/* Search Results */}
      {search && filteredItems.length > 0 && (
        <div className="max-h-40 overflow-auto border border-gray-200 dark:border-gray-700 rounded">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
              onClick={() => handleAdd(item)}
            >
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {item.title}
              </span>
              {item.year && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  ({item.year})
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Selected Items */}
      <div className="space-y-1">
        {selectedItems.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-2 px-2 py-1.5 bg-gray-50 dark:bg-gray-800 rounded"
          >
            <span className="flex-1 text-sm text-gray-700 dark:text-gray-300">
              {item.title}
            </span>
            {item.year && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                ({item.year})
              </span>
            )}
            <button
              type="button"
              onClick={() => handleRemove(item.id)}
              className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              <XMarkIcon className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 创建MediaItemForm组件**

创建 `src/components/media/MediaItemForm.tsx` 文件：

```typescript
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { XMarkIcon } from '@heroicons/react/24/outline';
import CoverUploader from './CoverUploader';
import MultiValueInput from './MultiValueInput';
import RelationSelector from './RelationSelector';
import { useCreateMediaItem, useUpdateMediaItem, useMediaItemDetails } from '@/queries/useMediaQueries';
import type { MediaItem, CreateMediaItemInput, UpdateMediaItemInput } from '@/types/media';

interface MediaItemFormProps {
  item?: MediaItem | null;
  onClose: () => void;
}

export default function MediaItemForm({ item, onClose }: MediaItemFormProps) {
  const { t } = useTranslation('common');
  const createItem = useCreateMediaItem();
  const updateItem = useUpdateMediaItem();
  const { data: details } = useMediaItemDetails(item?.id || null);

  const [formData, setFormData] = useState({
    type: 'movie' as 'movie' | 'season',
    title: '',
    year: '',
    cover: null as string | null,
    rating: '',
    status: 'normal' as 'normal' | 'favorite' | 'watched' | 'archived',
    groupId: '',
    doubanUrl: '',
    imdbUrl: '',
    rottenTomatoesUrl: '',
    tvShowTitle: '',
    seasonNumber: '',
    otherNames: [] as { name: string; label?: string }[],
    watchLinks: [] as { url: string; platform?: string }[],
    relatedItemIds: [] as string[],
  });

  useEffect(() => {
    if (item) {
      setFormData({
        type: item.type,
        title: item.title,
        year: item.year?.toString() || '',
        cover: item.cover,
        rating: item.rating?.toString() || '',
        status: item.status,
        groupId: item.groupId || '',
        doubanUrl: item.doubanUrl || '',
        imdbUrl: item.imdbUrl || '',
        rottenTomatoesUrl: item.rottenTomatoesUrl || '',
        tvShowTitle: item.tvShowTitle || '',
        seasonNumber: item.seasonNumber?.toString() || '',
        otherNames: details?.otherNames?.map((n) => ({ name: n.name, label: n.label })) || [],
        watchLinks: details?.watchLinks?.map((l) => ({ url: l.url, platform: l.platform || undefined })) || [],
        relatedItemIds: details?.relations?.map((r) => r.relatedItemId) || [],
      });
    }
  }, [item, details]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const data: CreateMediaItemInput | UpdateMediaItemInput = {
      type: formData.type,
      title: formData.title,
      year: formData.year ? parseInt(formData.year) : undefined,
      cover: formData.cover || undefined,
      rating: formData.rating ? parseFloat(formData.rating) : undefined,
      status: formData.status,
      groupId: formData.groupId || undefined,
      doubanUrl: formData.doubanUrl || undefined,
      imdbUrl: formData.imdbUrl || undefined,
      rottenTomatoesUrl: formData.rottenTomatoesUrl || undefined,
      tvShowTitle: formData.tvShowTitle || undefined,
      seasonNumber: formData.seasonNumber ? parseInt(formData.seasonNumber) : undefined,
      otherNames: formData.otherNames,
      watchLinks: formData.watchLinks,
      relatedItemIds: formData.relatedItemIds,
    };

    try {
      if (item) {
        await updateItem.mutateAsync({ id: item.id, ...data });
      } else {
        await createItem.mutateAsync(data as CreateMediaItemInput);
      }
      onClose();
    } catch (error) {
      console.error('Failed to save media item:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {item ? t('media.actions.edit') : t('media.actions.new')}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('media.fields.type')}
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as 'movie' | 'season' })}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900"
            >
              <option value="movie">{t('media.type.movie')}</option>
              <option value="season">{t('media.type.season')}</option>
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('media.fields.title')}
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900"
            />
          </div>

          {/* TV Show fields */}
          {formData.type === 'season' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('media.fields.tvShowTitle')}
                </label>
                <input
                  type="text"
                  value={formData.tvShowTitle}
                  onChange={(e) => setFormData({ ...formData, tvShowTitle: e.target.value })}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('media.fields.seasonNumber')}
                </label>
                <input
                  type="number"
                  value={formData.seasonNumber}
                  onChange={(e) => setFormData({ ...formData, seasonNumber: e.target.value })}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900"
                />
              </div>
            </div>
          )}

          {/* Year and Rating */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('media.fields.year')}
              </label>
              <input
                type="number"
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('media.fields.rating')}
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="10"
                value={formData.rating}
                onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900"
              />
            </div>
          </div>

          {/* Status and Group */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('media.fields.status')}
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900"
              >
                <option value="normal">{t('media.status.normal')}</option>
                <option value="favorite">{t('media.status.favorite')}</option>
                <option value="watched">{t('media.status.watched')}</option>
                <option value="archived">{t('media.status.archived')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('media.fields.group')}
              </label>
              <select
                value={formData.groupId}
                onChange={(e) => setFormData({ ...formData, groupId: e.target.value })}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900"
              >
                <option value="">None</option>
                {/* Groups will be loaded from API */}
              </select>
            </div>
          </div>

          {/* Cover */}
          <CoverUploader
            value={formData.cover}
            onChange={(url) => setFormData({ ...formData, cover: url })}
          />

          {/* Other Names */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('media.fields.otherNames')}
            </label>
            <MultiValueInput
              value={formData.otherNames}
              onChange={(value) => setFormData({ ...formData, otherNames: value })}
              placeholder={t('media.placeholder.otherName')}
              showLabel
            />
          </div>

          {/* Links */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Links
            </label>
            <input
              type="url"
              value={formData.doubanUrl}
              onChange={(e) => setFormData({ ...formData, doubanUrl: e.target.value })}
              placeholder={t('media.placeholder.doubanUrl')}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900"
            />
            <input
              type="url"
              value={formData.imdbUrl}
              onChange={(e) => setFormData({ ...formData, imdbUrl: e.target.value })}
              placeholder={t('media.placeholder.imdbUrl')}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900"
            />
            <input
              type="url"
              value={formData.rottenTomatoesUrl}
              onChange={(e) => setFormData({ ...formData, rottenTomatoesUrl: e.target.value })}
              placeholder={t('media.placeholder.rottenTomatoesUrl')}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900"
            />
          </div>

          {/* Watch Links */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('media.fields.watchLinks')}
            </label>
            <MultiValueInput
              value={formData.watchLinks.map((l) => ({ name: l.url, label: l.platform }))}
              onChange={(value) => setFormData({
                ...formData,
                watchLinks: value.map((v) => ({ url: v.name, platform: v.label })),
              })}
              placeholder={t('media.placeholder.watchLink')}
              showLabel
            />
          </div>

          {/* Relations */}
          <RelationSelector
            value={formData.relatedItemIds}
            onChange={(value) => setFormData({ ...formData, relatedItemIds: value })}
            currentItemId={item?.id}
          />

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <button
              type="submit"
              disabled={createItem.isPending || updateItem.isPending}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {t('media.actions.save')}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              {t('media.actions.cancel')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: 验证TypeScript编译**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/media/CoverUploader.tsx src/components/media/MultiValueInput.tsx src/components/media/RelationSelector.tsx src/components/media/MediaItemForm.tsx
git commit -m "feat(media): add MediaItemForm and related components"
```

---

## Task 8: MediaContent组件

**Files:**
- Create: `src/components/media/MediaContent.tsx`

- [ ] **Step 1: 创建MediaContent组件**

创建 `src/components/media/MediaContent.tsx` 文件：

```typescript
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PlusIcon, Squares2X2Icon, ListBulletIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useMediaItems } from '@/queries/useMediaQueries';
import MediaCard from './MediaCard';
import MediaListItem from './MediaListItem';
import MediaItemForm from './MediaItemForm';
import type { MediaItem } from '@/types/media';

type SmartGroupId = 'all' | 'favorites' | 'normal' | 'watched' | 'archived';

interface MediaContentProps {
  selectedSmartGroup: SmartGroupId | null;
  selectedGroupId: string | null;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
}

export default function MediaContent({
  selectedSmartGroup,
  selectedGroupId,
  viewMode,
  onViewModeChange,
}: MediaContentProps) {
  const { t } = useTranslation('common');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<MediaItem | null>(null);

  // Build filters
  const filters: { status?: string; groupId?: string; search?: string } = {};
  if (selectedSmartGroup && selectedSmartGroup !== 'all') {
    filters.status = selectedSmartGroup;
  }
  if (selectedGroupId) {
    filters.groupId = selectedGroupId;
  }
  if (search) {
    filters.search = search;
  }

  const { data: items = [], isLoading } = useMediaItems(filters);

  const handleItemClick = (item: MediaItem) => {
    setEditingItem(item);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingItem(null);
  };

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-3 p-3 border-b border-gray-200 dark:border-gray-700">
        {/* Search */}
        <div className="flex-1 relative">
          <MagnifyingGlassIcon className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('media.placeholder.search')}
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900"
          />
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded p-0.5">
          <button
            onClick={() => onViewModeChange('grid')}
            className={`p-1.5 rounded ${
              viewMode === 'grid'
                ? 'bg-white dark:bg-gray-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
            title="Grid"
          >
            <Squares2X2Icon className="w-4 h-4" />
          </button>
          <button
            onClick={() => onViewModeChange('list')}
            className={`p-1.5 rounded ${
              viewMode === 'list'
                ? 'bg-white dark:bg-gray-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
            title="List"
          >
            <ListBulletIcon className="w-4 h-4" />
          </button>
        </div>

        {/* New Button */}
        <button
          onClick={() => {
            setEditingItem(null);
            setShowForm(true);
          }}
          className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-blue-500 rounded hover:bg-blue-600"
        >
          <PlusIcon className="w-4 h-4" />
          {t('media.actions.new')}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-3">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            {t('media.message.loading')}
          </div>
        ) : items.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            {t('media.message.no_items')}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {items.map((item) => (
              <MediaCard key={item.id} item={item} onClick={handleItemClick} />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <MediaListItem key={item.id} item={item} onClick={handleItemClick} />
            ))}
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <MediaItemForm
          item={editingItem}
          onClose={handleCloseForm}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: 验证TypeScript编译**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/media/MediaContent.tsx
git commit -m "feat(media): add MediaContent component"
```

---

## Task 9: MediaPage主页面

**Files:**
- Create: `src/pages/MediaPage.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: 创建MediaPage组件**

创建 `src/pages/MediaPage.tsx` 文件：

```typescript
import { useState } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { ResizeHandle } from '@/components/ResizeHandle';
import MediaSidebar from '@/components/media/MediaSidebar';
import MediaContent from '@/components/media/MediaContent';

type SmartGroupId = 'all' | 'favorites' | 'normal' | 'watched' | 'archived';

export default function MediaPage() {
  const { mediaSidebarWidth, mediaViewMode, setMediaSidebarWidth, setMediaViewMode } = useAppStore();

  const [selectedSmartGroup, setSelectedSmartGroup] = useState<SmartGroupId | null>('all');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  const handleSelectSmartGroup = (groupId: SmartGroupId) => {
    setSelectedSmartGroup(groupId);
    setSelectedGroupId(null);
  };

  const handleSelectGroup = (groupId: string) => {
    setSelectedSmartGroup(null);
    setSelectedGroupId(groupId);
  };

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <MediaSidebar
        selectedSmartGroup={selectedSmartGroup}
        selectedGroupId={selectedGroupId}
        onSelectSmartGroup={handleSelectSmartGroup}
        onSelectGroup={handleSelectGroup}
        width={mediaSidebarWidth}
      />

      {/* Resize Handle */}
      <ResizeHandle
        direction="horizontal"
        onResize={(delta) => setMediaSidebarWidth(mediaSidebarWidth + delta)}
      />

      {/* Content */}
      <MediaContent
        selectedSmartGroup={selectedSmartGroup}
        selectedGroupId={selectedGroupId}
        viewMode={mediaViewMode}
        onViewModeChange={setMediaViewMode}
      />
    </div>
  );
}
```

- [ ] **Step 2: 添加路由**

在 `src/App.tsx` 中添加：

```typescript
import MediaPage from '@/pages/MediaPage';

// In the router configuration:
{
  path: '/media',
  element: <MediaPage />,
}
```

- [ ] **Step 3: 验证TypeScript编译**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/pages/MediaPage.tsx src/App.tsx
git commit -m "feat(media): add MediaPage and routing"
```

---

## Task 10: 测试和验证

**Files:**
- Test: Manual testing

- [ ] **Step 1: 启动开发服务器**

Run: `npm run tauri dev`
Expected: Application starts without errors

- [ ] **Step 2: 测试基础功能**

1. 导航到影视页面
2. 创建一个新的影视组
3. 创建一个新的电影
4. 创建一个新的电视剧季
5. 测试Grid和List视图切换
6. 测试搜索功能
7. 测试智能分组筛选

- [ ] **Step 3: 测试表单功能**

1. 测试封面上传
2. 测试多值输入（其他名称、观看链接）
3. 测试关联选择器
4. 测试编辑功能

- [ ] **Step 4: 测试删除功能**

1. 删除一个影视组
2. 删除一个影片
3. 验证级联删除

- [ ] **Step 5: 验证数据持久化**

1. 关闭应用
2. 重新打开应用
3. 验证数据是否保存

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "test(media): verify all media features working"
```

---

## Self-Review Checklist

- [ ] 所有spec中的需求都有对应的实现任务
- [ ] 没有TBD、TODO或占位符
- [ ] 类型、方法签名和属性名在所有任务中保持一致
- [ ] 所有代码步骤都包含完整的代码
- [ ] 所有测试步骤都有明确的预期结果

---

**Plan complete and saved to `docs/superpowers/plans/2026-06-15-media-page.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
