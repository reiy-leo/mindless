use tauri::AppHandle;
use uuid::Uuid;

use crate::db::models::{Item, ItemGroup, ItemLink, ItemLinkedItem, ItemPurchaseLine};

fn get_db(app: &AppHandle) -> Result<rusqlite::Connection, String> {
    crate::db::connection::open_connection(app)
}

#[cfg_attr(not(test), allow(dead_code))]
#[derive(Debug, Clone)]
pub struct BuiltinItemGroup {
    pub id: &'static str,
    pub name: &'static str,
    pub color: &'static str,
    pub icon: &'static str,
    pub is_builtin: bool,
    pub sort_order: f64,
}

#[cfg_attr(not(test), allow(dead_code))]
pub fn builtin_item_groups() -> Vec<BuiltinItemGroup> {
    vec![
        BuiltinItemGroup { id: "electronics", name: "电子产品", color: "#2563EB", icon: "💻", is_builtin: true, sort_order: 0.0 },
        BuiltinItemGroup { id: "clothing", name: "衣物", color: "#DB2777", icon: "👕", is_builtin: true, sort_order: 1.0 },
        BuiltinItemGroup { id: "daily_goods", name: "日用品", color: "#16A34A", icon: "🧴", is_builtin: true, sort_order: 2.0 },
    ]
}

pub fn can_update_item_group_fields(is_builtin: bool, only_hidden_changed: bool) -> bool {
    !is_builtin || only_hidden_changed
}

pub fn can_delete_item_group(is_builtin: bool) -> bool {
    !is_builtin
}

#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ItemPurchaseLineInput {
    pub name: String,
    pub quantity: Option<f64>,
    pub unit_price: Option<f64>,
    pub note: Option<String>,
    pub sort_order: Option<f64>,
}

#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ItemLinkInput {
    pub url: String,
    pub label: Option<String>,
    pub sort_order: Option<f64>,
}

fn row_to_item_group(row: &rusqlite::Row) -> rusqlite::Result<ItemGroup> {
    Ok(ItemGroup {
        id: row.get("id")?,
        name: row.get("name")?,
        color: row.get("color")?,
        icon: row.get("icon")?,
        is_builtin: row.get::<_, i32>("is_builtin")? != 0,
        is_hidden: row.get::<_, i32>("is_hidden")? != 0,
        sort_order: row.get("sort_order")?,
        created_at: row.get("created_at")?,
        updated_at: row.get("updated_at")?,
        usage_count: row.get("usage_count").ok(),
    })
}

fn row_to_item(row: &rusqlite::Row) -> rusqlite::Result<Item> {
    Ok(Item {
        id: row.get("id")?,
        name: row.get("name")?,
        links: Vec::new(),
        source: row.get("source")?,
        purchase_price: row.get("purchase_price")?,
        purchase_date: row.get("purchase_date")?,
        group_id: row.get("group_id")?,
        tag_ids: row.get("tag_ids")?,
        notes: row.get("notes")?,
        created_at: row.get("created_at")?,
        updated_at: row.get("updated_at")?,
        deleted_at: row.get("deleted_at")?,
    })
}

fn row_to_item_link(row: &rusqlite::Row) -> rusqlite::Result<ItemLink> {
    Ok(ItemLink {
        id: row.get("id")?,
        item_id: row.get("item_id")?,
        url: row.get("url")?,
        label: row.get("label")?,
        sort_order: row.get("sort_order")?,
        created_at: row.get("created_at")?,
        updated_at: row.get("updated_at")?,
    })
}

fn row_to_purchase_line(row: &rusqlite::Row) -> rusqlite::Result<ItemPurchaseLine> {
    Ok(ItemPurchaseLine {
        id: row.get("id")?,
        item_id: row.get("item_id")?,
        name: row.get("name")?,
        quantity: row.get("quantity")?,
        unit_price: row.get("unit_price")?,
        note: row.get("note")?,
        sort_order: row.get("sort_order")?,
        created_at: row.get("created_at")?,
        updated_at: row.get("updated_at")?,
    })
}

fn row_to_linked_item(row: &rusqlite::Row) -> rusqlite::Result<ItemLinkedItem> {
    Ok(ItemLinkedItem {
        id: row.get("id")?,
        item_id: row.get("item_id")?,
        linked_type: row.get("linked_type")?,
        linked_id: row.get("linked_id")?,
    })
}

fn validate_source(source: &Option<String>) -> Result<(), String> {
    if let Some(value) = source {
        let valid = matches!(
            value.as_str(),
            "amazon" | "jd" | "taobao" | "xiaomi_youpin" | "xiaoxiang_supermarket" | "offline_store"
        );
        if !valid {
            return Err(format!("Unsupported item source: {}", value));
        }
    }
    Ok(())
}

fn replace_purchase_lines(
    conn: &rusqlite::Connection,
    item_id: &str,
    purchase_lines: Vec<ItemPurchaseLineInput>,
) -> Result<(), String> {
    conn.execute("DELETE FROM item_purchase_lines WHERE item_id = ?1", [&item_id])
        .map_err(|e| format!("Failed to clear purchase lines: {}", e))?;
    for (index, line) in purchase_lines.into_iter().enumerate() {
        let name = line.name.trim().to_string();
        if name.is_empty() {
            continue;
        }
        let id = Uuid::new_v4().to_string();
        let quantity = line.quantity.unwrap_or(1.0).max(0.0);
        let sort_order = line.sort_order.unwrap_or(index as f64);
        conn.execute(
            "INSERT INTO item_purchase_lines (id, item_id, name, quantity, unit_price, note, sort_order) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            rusqlite::params![&id, item_id, &name, quantity, line.unit_price, line.note, sort_order],
        ).map_err(|e| format!("Failed to save purchase line: {}", e))?;
    }
    Ok(())
}

fn get_item_links_for_conn(conn: &rusqlite::Connection, item_id: &str) -> Result<Vec<ItemLink>, String> {
    let mut stmt = conn.prepare("SELECT * FROM item_links WHERE item_id = ?1 ORDER BY sort_order ASC, created_at ASC")
        .map_err(|e| format!("Failed to prepare item URL links: {}", e))?;
    let rows = stmt.query_map([item_id], row_to_item_link).map_err(|e| format!("Failed to query item URL links: {}", e))?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| format!("Failed to read item URL links: {}", e))
}

fn hydrate_item_links(conn: &rusqlite::Connection, mut item: Item) -> Result<Item, String> {
    item.links = get_item_links_for_conn(conn, &item.id)?;
    Ok(item)
}

fn replace_item_links(
    conn: &rusqlite::Connection,
    item_id: &str,
    links: Vec<ItemLinkInput>,
) -> Result<(), String> {
    conn.execute("DELETE FROM item_links WHERE item_id = ?1", [&item_id])
        .map_err(|e| format!("Failed to clear item URL links: {}", e))?;
    for (index, link) in links.into_iter().enumerate() {
        let url = link.url.trim().to_string();
        if url.is_empty() {
            continue;
        }
        let id = Uuid::new_v4().to_string();
        let label = link.label.map(|value| value.trim().to_string()).filter(|value| !value.is_empty());
        let sort_order = link.sort_order.unwrap_or(index as f64);
        conn.execute(
            "INSERT INTO item_links (id, item_id, url, label, sort_order) VALUES (?1, ?2, ?3, ?4, ?5)",
            rusqlite::params![&id, item_id, &url, label, sort_order],
        ).map_err(|e| format!("Failed to save item URL link: {}", e))?;
    }
    Ok(())
}

#[tauri::command]
pub async fn get_item_groups(app: AppHandle, include_hidden: Option<bool>) -> Result<Vec<ItemGroup>, String> {
    let conn = get_db(&app)?;
    let include_hidden = include_hidden.unwrap_or(false);
    let sql = if include_hidden {
        "SELECT g.*, COUNT(i.id) AS usage_count FROM item_groups g LEFT JOIN items i ON i.group_id = g.id AND i.deleted_at IS NULL GROUP BY g.id ORDER BY g.sort_order ASC, g.created_at ASC"
    } else {
        "SELECT g.*, COUNT(i.id) AS usage_count FROM item_groups g LEFT JOIN items i ON i.group_id = g.id AND i.deleted_at IS NULL WHERE g.is_hidden = 0 GROUP BY g.id ORDER BY g.sort_order ASC, g.created_at ASC"
    };
    let mut stmt = conn.prepare(sql).map_err(|e| format!("Failed to prepare item groups: {}", e))?;
    let rows = stmt.query_map([], row_to_item_group).map_err(|e| format!("Failed to query item groups: {}", e))?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| format!("Failed to read item groups: {}", e))
}

#[tauri::command]
pub async fn create_item_group(app: AppHandle, name: String, color: Option<String>, icon: Option<String>) -> Result<ItemGroup, String> {
    let conn = get_db(&app)?;
    let id = Uuid::new_v4().to_string();
    let max_sort: f64 = conn.query_row("SELECT COALESCE(MAX(sort_order), -1) + 1 FROM item_groups", [], |row| row.get(0)).unwrap_or(0.0);
    conn.execute(
        "INSERT INTO item_groups (id, name, color, icon, sort_order) VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![&id, name.trim(), color.as_deref().unwrap_or("#3B82F6"), icon.as_deref().unwrap_or("📦"), max_sort],
    ).map_err(|e| format!("Failed to create item group: {}", e))?;
    conn.query_row("SELECT *, 0 AS usage_count FROM item_groups WHERE id = ?1", [&id], row_to_item_group)
        .map_err(|e| format!("Failed to fetch item group: {}", e))
}

#[tauri::command]
pub async fn update_item_group(
    app: AppHandle,
    id: String,
    name: Option<String>,
    color: Option<String>,
    icon: Option<String>,
    is_hidden: Option<bool>,
) -> Result<ItemGroup, String> {
    let conn = get_db(&app)?;
    let is_builtin: bool = conn.query_row("SELECT is_builtin FROM item_groups WHERE id = ?1", [&id], |row| {
        Ok(row.get::<_, i32>(0)? != 0)
    }).map_err(|e| format!("Item group not found: {}", e))?;
    let only_hidden_changed = name.is_none() && color.is_none() && icon.is_none() && is_hidden.is_some();
    if !can_update_item_group_fields(is_builtin, only_hidden_changed) {
        return Err("Built-in item groups can only be hidden or shown".to_string());
    }

    if let Some(value) = name.as_ref() {
        conn.execute("UPDATE item_groups SET name = ?1, updated_at = datetime('now') WHERE id = ?2", rusqlite::params![value.trim(), &id])
            .map_err(|e| format!("Failed to update item group name: {}", e))?;
    }
    if let Some(value) = color.as_ref() {
        conn.execute("UPDATE item_groups SET color = ?1, updated_at = datetime('now') WHERE id = ?2", rusqlite::params![value, &id])
            .map_err(|e| format!("Failed to update item group color: {}", e))?;
    }
    if let Some(value) = icon.as_ref() {
        conn.execute("UPDATE item_groups SET icon = ?1, updated_at = datetime('now') WHERE id = ?2", rusqlite::params![value, &id])
            .map_err(|e| format!("Failed to update item group icon: {}", e))?;
    }
    if let Some(value) = is_hidden {
        conn.execute("UPDATE item_groups SET is_hidden = ?1, updated_at = datetime('now') WHERE id = ?2", rusqlite::params![if value { 1 } else { 0 }, &id])
            .map_err(|e| format!("Failed to update item group visibility: {}", e))?;
    }
    conn.query_row("SELECT *, 0 AS usage_count FROM item_groups WHERE id = ?1", [&id], row_to_item_group)
        .map_err(|e| format!("Failed to fetch item group: {}", e))
}

#[tauri::command]
pub async fn delete_item_group(app: AppHandle, id: String) -> Result<(), String> {
    let conn = get_db(&app)?;
    let is_builtin: bool = conn.query_row("SELECT is_builtin FROM item_groups WHERE id = ?1", [&id], |row| {
        Ok(row.get::<_, i32>(0)? != 0)
    }).map_err(|e| format!("Item group not found: {}", e))?;
    if !can_delete_item_group(is_builtin) {
        return Err("Built-in item groups cannot be deleted".to_string());
    }
    conn.execute("DELETE FROM item_groups WHERE id = ?1", [&id])
        .map_err(|e| format!("Failed to delete item group: {}", e))?;
    Ok(())
}

#[tauri::command]
pub async fn get_items(app: AppHandle, group_id: Option<String>, search: Option<String>) -> Result<Vec<Item>, String> {
    let conn = get_db(&app)?;
    let mut sql = String::from("SELECT * FROM items WHERE deleted_at IS NULL");
    let mut params: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();
    if let Some(ref group) = group_id {
        sql.push_str(&format!(" AND group_id = ?{}", params.len() + 1));
        params.push(Box::new(group.clone()));
    }
    if let Some(ref q) = search {
        sql.push_str(&format!(" AND (name LIKE ?{} OR notes LIKE ?{})", params.len() + 1, params.len() + 2));
        let pattern = format!("%{}%", q);
        params.push(Box::new(pattern.clone()));
        params.push(Box::new(pattern));
    }
    sql.push_str(" ORDER BY updated_at DESC, created_at DESC");
    let param_refs: Vec<&dyn rusqlite::types::ToSql> = params.iter().map(|p| p.as_ref()).collect();
    let mut stmt = conn.prepare(&sql).map_err(|e| format!("Failed to prepare items: {}", e))?;
    let rows = stmt.query_map(param_refs.as_slice(), row_to_item).map_err(|e| format!("Failed to query items: {}", e))?;
    let items = rows.collect::<Result<Vec<_>, _>>().map_err(|e| format!("Failed to read items: {}", e))?;
    items.into_iter().map(|item| hydrate_item_links(&conn, item)).collect()
}

#[tauri::command]
pub async fn get_item_by_id(app: AppHandle, id: String) -> Result<Item, String> {
    let conn = get_db(&app)?;
    let item = conn.query_row("SELECT * FROM items WHERE id = ?1", [&id], row_to_item)
        .map_err(|e| format!("Item not found: {}", e))?;
    hydrate_item_links(&conn, item)
}

#[tauri::command]
pub async fn create_item(
    app: AppHandle,
    name: String,
    source: Option<String>,
    purchase_price: Option<f64>,
    purchase_date: Option<String>,
    group_id: Option<String>,
    tag_ids: Option<String>,
    notes: Option<String>,
    links: Option<Vec<ItemLinkInput>>,
    purchase_lines: Option<Vec<ItemPurchaseLineInput>>,
) -> Result<Item, String> {
    validate_source(&source)?;
    let conn = get_db(&app)?;
    let id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO items (id, name, source, purchase_price, purchase_date, group_id, tag_ids, notes) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        rusqlite::params![&id, name.trim(), source, purchase_price, purchase_date, group_id, tag_ids, notes],
    ).map_err(|e| format!("Failed to create item: {}", e))?;
    replace_item_links(&conn, &id, links.unwrap_or_default())?;
    replace_purchase_lines(&conn, &id, purchase_lines.unwrap_or_default())?;
    let item = conn.query_row("SELECT * FROM items WHERE id = ?1", [&id], row_to_item)
        .map_err(|e| format!("Failed to fetch item: {}", e))?;
    hydrate_item_links(&conn, item)
}

#[tauri::command]
pub async fn update_item(
    app: AppHandle,
    id: String,
    name: Option<String>,
    source: Option<String>,
    purchase_price: Option<f64>,
    purchase_date: Option<String>,
    group_id: Option<String>,
    tag_ids: Option<String>,
    notes: Option<String>,
    links: Option<Vec<ItemLinkInput>>,
    purchase_lines: Option<Vec<ItemPurchaseLineInput>>,
) -> Result<Item, String> {
    validate_source(&source)?;
    let conn = get_db(&app)?;
    if let Some(value) = name.as_ref() {
        conn.execute("UPDATE items SET name = ?1, updated_at = datetime('now') WHERE id = ?2", rusqlite::params![value.trim(), &id])
            .map_err(|e| format!("Failed to update item name: {}", e))?;
    }
    conn.execute(
        "UPDATE items SET source = COALESCE(?1, source), purchase_price = ?2, purchase_date = ?3, group_id = ?4, tag_ids = ?5, notes = ?6, updated_at = datetime('now') WHERE id = ?7",
        rusqlite::params![source, purchase_price, purchase_date, group_id, tag_ids, notes, &id],
    ).map_err(|e| format!("Failed to update item: {}", e))?;
    if let Some(links) = links {
        replace_item_links(&conn, &id, links)?;
    }
    if let Some(lines) = purchase_lines {
        replace_purchase_lines(&conn, &id, lines)?;
    }
    let item = conn.query_row("SELECT * FROM items WHERE id = ?1", [&id], row_to_item)
        .map_err(|e| format!("Failed to fetch item: {}", e))?;
    hydrate_item_links(&conn, item)
}

#[tauri::command]
pub async fn delete_item(app: AppHandle, id: String) -> Result<(), String> {
    let conn = get_db(&app)?;
    let mut stmt = conn.prepare("SELECT local_path FROM attachments WHERE owner_type = 'item' AND owner_id = ?1")
        .map_err(|e| format!("Failed to prepare attachment cleanup: {}", e))?;
    let paths = stmt.query_map([&id], |row| row.get::<_, Option<String>>(0))
        .map_err(|e| format!("Failed to query item attachments: {}", e))?;
    for path in paths {
        if let Ok(Some(path)) = path {
            let _ = std::fs::remove_file(path);
        }
    }
    conn.execute("DELETE FROM attachments WHERE owner_type = 'item' AND owner_id = ?1", [&id])
        .map_err(|e| format!("Failed to delete item attachments: {}", e))?;
    conn.execute("DELETE FROM items WHERE id = ?1", [&id])
        .map_err(|e| format!("Failed to delete item: {}", e))?;
    Ok(())
}

#[tauri::command]
pub async fn get_item_purchase_lines(app: AppHandle, item_id: String) -> Result<Vec<ItemPurchaseLine>, String> {
    let conn = get_db(&app)?;
    let mut stmt = conn.prepare("SELECT * FROM item_purchase_lines WHERE item_id = ?1 ORDER BY sort_order ASC")
        .map_err(|e| format!("Failed to prepare purchase lines: {}", e))?;
    let rows = stmt.query_map([&item_id], row_to_purchase_line).map_err(|e| format!("Failed to query purchase lines: {}", e))?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| format!("Failed to read purchase lines: {}", e))
}

#[tauri::command]
pub async fn get_item_linked_items(app: AppHandle, item_id: String) -> Result<Vec<ItemLinkedItem>, String> {
    let conn = get_db(&app)?;
    let mut stmt = conn.prepare("SELECT * FROM item_linked_items WHERE item_id = ?1")
        .map_err(|e| format!("Failed to prepare item links: {}", e))?;
    let rows = stmt.query_map([&item_id], row_to_linked_item).map_err(|e| format!("Failed to query item links: {}", e))?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| format!("Failed to read item links: {}", e))
}

#[tauri::command]
pub async fn link_item(app: AppHandle, item_id: String, linked_type: String, linked_id: String) -> Result<ItemLinkedItem, String> {
    let conn = get_db(&app)?;
    let existing: Option<ItemLinkedItem> = conn.query_row(
        "SELECT * FROM item_linked_items WHERE item_id = ?1 AND linked_type = ?2 AND linked_id = ?3",
        rusqlite::params![&item_id, &linked_type, &linked_id],
        row_to_linked_item,
    ).ok();
    if let Some(link) = existing {
        return Ok(link);
    }
    let id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO item_linked_items (id, item_id, linked_type, linked_id) VALUES (?1, ?2, ?3, ?4)",
        rusqlite::params![&id, &item_id, &linked_type, &linked_id],
    ).map_err(|e| format!("Failed to link item: {}", e))?;
    conn.query_row("SELECT * FROM item_linked_items WHERE id = ?1", [&id], row_to_linked_item)
        .map_err(|e| format!("Failed to fetch item link: {}", e))
}

#[tauri::command]
pub async fn unlink_item(app: AppHandle, id: String) -> Result<(), String> {
    let conn = get_db(&app)?;
    conn.execute("DELETE FROM item_linked_items WHERE id = ?1", [&id])
        .map_err(|e| format!("Failed to unlink item: {}", e))?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::{builtin_item_groups, can_delete_item_group, can_update_item_group_fields};

    #[test]
    fn built_in_item_groups_are_hide_only() {
        let groups = builtin_item_groups();

        assert_eq!(
            groups.iter().map(|group| group.id).collect::<Vec<_>>(),
            vec!["electronics", "clothing", "daily_goods"]
        );
        assert!(groups.iter().all(|group| group.is_builtin));
        assert!(!can_update_item_group_fields(true, false));
        assert!(can_update_item_group_fields(true, true));
        assert!(!can_delete_item_group(true));
        assert!(can_delete_item_group(false));
    }
}
