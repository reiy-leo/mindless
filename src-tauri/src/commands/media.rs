use tauri::AppHandle;
use uuid::Uuid;
use crate::db::models::{MediaGroup, MediaItem, MediaOtherName, MediaWatchLink, MediaRelation};

fn get_db(app: &AppHandle) -> Result<rusqlite::Connection, String> {
    crate::db::connection::open_connection(app)
}

fn row_to_media_group(row: &rusqlite::Row) -> rusqlite::Result<MediaGroup> {
    Ok(MediaGroup {
        id: row.get("id")?,
        name: row.get("name")?,
        color: row.get("color")?,
        icon: row.get("icon")?,
        sort_order: row.get("sort_order")?,
        created_at: row.get("created_at")?,
        updated_at: row.get("updated_at")?,
    })
}

fn row_to_media_item(row: &rusqlite::Row) -> rusqlite::Result<MediaItem> {
    Ok(MediaItem {
        id: row.get("id")?,
        r#type: row.get("type")?,
        title: row.get("title")?,
        year: row.get("year")?,
        cover: row.get("cover")?,
        rating: row.get("rating")?,
        status: row.get("status")?,
        group_id: row.get("group_id")?,
        douban_url: row.get("douban_url")?,
        imdb_url: row.get("imdb_url")?,
        rotten_tomatoes_url: row.get("rotten_tomatoes_url")?,
        tv_show_title: row.get("tv_show_title")?,
        season_number: row.get("season_number")?,
        sort_order: row.get("sort_order")?,
        created_at: row.get("created_at")?,
        updated_at: row.get("updated_at")?,
    })
}

fn row_to_media_other_name(row: &rusqlite::Row) -> rusqlite::Result<MediaOtherName> {
    Ok(MediaOtherName {
        id: row.get("id")?,
        media_item_id: row.get("media_item_id")?,
        name: row.get("name")?,
        label: row.get("label")?,
        sort_order: row.get("sort_order")?,
    })
}

fn row_to_media_watch_link(row: &rusqlite::Row) -> rusqlite::Result<MediaWatchLink> {
    Ok(MediaWatchLink {
        id: row.get("id")?,
        media_item_id: row.get("media_item_id")?,
        url: row.get("url")?,
        platform: row.get("platform")?,
        sort_order: row.get("sort_order")?,
    })
}

fn row_to_media_relation(row: &rusqlite::Row) -> rusqlite::Result<MediaRelation> {
    Ok(MediaRelation {
        id: row.get("id")?,
        media_item_id: row.get("media_item_id")?,
        related_item_id: row.get("related_item_id")?,
        relation_type: row.get("relation_type")?,
    })
}

// ==================== Media Group Commands ====================

#[tauri::command]
pub async fn get_media_groups(app: AppHandle) -> Result<Vec<MediaGroup>, String> {
    let conn = get_db(&app)?;
    let mut stmt = conn.prepare("SELECT * FROM media_groups ORDER BY sort_order ASC, created_at ASC")
        .map_err(|e| format!("Failed to prepare: {}", e))?;
    let groups = stmt.query_map([], row_to_media_group)
        .map_err(|e| format!("Failed to query: {}", e))?;
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

    let group = conn.query_row("SELECT * FROM media_groups WHERE id = ?1", [&id], row_to_media_group)
        .map_err(|e| format!("Failed to fetch media group: {}", e))?;
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
    let mut params: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

    if let Some(ref n) = name {
        sql.push_str(&format!(", name = ?{}", params.len() + 1));
        params.push(Box::new(n.clone()));
    }
    if let Some(ref c) = color {
        sql.push_str(&format!(", color = ?{}", params.len() + 1));
        params.push(Box::new(c.clone()));
    }
    if let Some(ref i) = icon {
        sql.push_str(&format!(", icon = ?{}", params.len() + 1));
        params.push(Box::new(i.clone()));
    }

    sql.push_str(&format!(" WHERE id = ?{}", params.len() + 1));
    params.push(Box::new(id.clone()));

    let param_refs: Vec<&dyn rusqlite::types::ToSql> = params.iter().map(|p| p.as_ref()).collect();
    conn.execute(&sql, param_refs.as_slice())
        .map_err(|e| format!("Failed to update media group: {}", e))?;

    let group = conn.query_row("SELECT * FROM media_groups WHERE id = ?1", [&id], row_to_media_group)
        .map_err(|e| format!("Failed to fetch media group: {}", e))?;
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
        sql.push_str(&format!(" AND status = ?{}", params.len() + 1));
        params.push(Box::new(s.clone()));
    }
    if let Some(ref g) = group_id {
        sql.push_str(&format!(" AND group_id = ?{}", params.len() + 1));
        params.push(Box::new(g.clone()));
    }
    if let Some(ref search_term) = search {
        let idx1 = params.len() + 1;
        let idx2 = params.len() + 2;
        sql.push_str(&format!(" AND (title LIKE ?{} OR tv_show_title LIKE ?{})", idx1, idx2));
        let search_pattern = format!("%{}%", search_term);
        params.push(Box::new(search_pattern.clone()));
        params.push(Box::new(search_pattern));
    }

    sql.push_str(" ORDER BY sort_order ASC, created_at DESC");

    let mut stmt = conn.prepare(&sql)
        .map_err(|e| format!("Failed to prepare: {}", e))?;

    let param_refs: Vec<&dyn rusqlite::types::ToSql> = params.iter().map(|p| p.as_ref()).collect();
    let items = stmt.query_map(param_refs.as_slice(), row_to_media_item)
        .map_err(|e| format!("Failed to query: {}", e))?;

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

    if let Some(related_ids) = related_item_ids {
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

    let item = conn.query_row("SELECT * FROM media_items WHERE id = ?1", [&id], row_to_media_item)
        .map_err(|e| format!("Failed to fetch media item: {}", e))?;
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
    let mut params: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

    if title.is_some() { sql.push_str(&format!(", title = ?{}", params.len() + 1)); params.push(Box::new(title.unwrap())); }
    if year.is_some() { sql.push_str(&format!(", year = ?{}", params.len() + 1)); params.push(Box::new(year.unwrap())); }
    if cover.is_some() { sql.push_str(&format!(", cover = ?{}", params.len() + 1)); params.push(Box::new(cover.unwrap())); }
    if rating.is_some() { sql.push_str(&format!(", rating = ?{}", params.len() + 1)); params.push(Box::new(rating.unwrap())); }
    if status.is_some() { sql.push_str(&format!(", status = ?{}", params.len() + 1)); params.push(Box::new(status.unwrap())); }
    if group_id.is_some() { sql.push_str(&format!(", group_id = ?{}", params.len() + 1)); params.push(Box::new(group_id.unwrap())); }
    if douban_url.is_some() { sql.push_str(&format!(", douban_url = ?{}", params.len() + 1)); params.push(Box::new(douban_url.unwrap())); }
    if imdb_url.is_some() { sql.push_str(&format!(", imdb_url = ?{}", params.len() + 1)); params.push(Box::new(imdb_url.unwrap())); }
    if rotten_tomatoes_url.is_some() { sql.push_str(&format!(", rotten_tomatoes_url = ?{}", params.len() + 1)); params.push(Box::new(rotten_tomatoes_url.unwrap())); }
    if tv_show_title.is_some() { sql.push_str(&format!(", tv_show_title = ?{}", params.len() + 1)); params.push(Box::new(tv_show_title.unwrap())); }
    if season_number.is_some() { sql.push_str(&format!(", season_number = ?{}", params.len() + 1)); params.push(Box::new(season_number.unwrap())); }

    sql.push_str(&format!(" WHERE id = ?{}", params.len() + 1));
    params.push(Box::new(id.clone()));

    let param_refs: Vec<&dyn rusqlite::types::ToSql> = params.iter().map(|p| p.as_ref()).collect();
    conn.execute(&sql, param_refs.as_slice())
        .map_err(|e| format!("Failed to update media item: {}", e))?;

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

    let item = conn.query_row("SELECT * FROM media_items WHERE id = ?1", [&id], row_to_media_item)
        .map_err(|e| format!("Failed to fetch media item: {}", e))?;
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

    let item = conn.query_row("SELECT * FROM media_items WHERE id = ?1", [&id], row_to_media_item)
        .map_err(|e| format!("Failed to fetch media item: {}", e))?;

    let mut stmt = conn.prepare("SELECT * FROM media_other_names WHERE media_item_id = ?1 ORDER BY sort_order ASC")
        .map_err(|e| format!("Failed to prepare: {}", e))?;
    let other_names: Vec<MediaOtherName> = stmt.query_map([&id], row_to_media_other_name)
        .map_err(|e| format!("Failed to query: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect: {}", e))?;

    let mut stmt = conn.prepare("SELECT * FROM media_watch_links WHERE media_item_id = ?1 ORDER BY sort_order ASC")
        .map_err(|e| format!("Failed to prepare: {}", e))?;
    let watch_links: Vec<MediaWatchLink> = stmt.query_map([&id], row_to_media_watch_link)
        .map_err(|e| format!("Failed to query: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect: {}", e))?;

    let mut stmt = conn.prepare("SELECT * FROM media_relations WHERE media_item_id = ?1")
        .map_err(|e| format!("Failed to prepare: {}", e))?;
    let relations: Vec<MediaRelation> = stmt.query_map([&id], row_to_media_relation)
        .map_err(|e| format!("Failed to query: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect: {}", e))?;

    let result = serde_json::json!({
        "item": item,
        "otherNames": other_names,
        "watchLinks": watch_links,
        "relations": relations,
    });

    Ok(result)
}
