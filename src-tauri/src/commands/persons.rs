use tauri::AppHandle;
use uuid::Uuid;
use crate::db::models::{Person, PersonGroup, PersonPhone, PersonEmail, PersonOtherName};

fn get_db(app: &AppHandle) -> Result<rusqlite::Connection, String> {
    crate::db::connection::open_connection(app)
}

fn row_to_person_group(row: &rusqlite::Row) -> rusqlite::Result<PersonGroup> {
    Ok(PersonGroup {
        id: row.get("id")?,
        name: row.get("name")?,
        color: row.get("color")?,
        icon: row.get("icon")?,
        is_pinned: row.get::<_, i32>("is_pinned")? != 0,
        is_archived: row.get::<_, i32>("is_archived")? != 0,
        sort_order: row.get("sort_order")?,
        created_at: row.get("created_at")?,
        updated_at: row.get("updated_at")?,
    })
}

fn row_to_person(row: &rusqlite::Row) -> rusqlite::Result<Person> {
    Ok(Person {
        id: row.get("id")?,
        name: row.get("name")?,
        english_name: row.get("english_name")?,
        nickname: row.get("nickname")?,
        remark: row.get("remark")?,
        group_id: row.get("group_id")?,
        tag_ids: row.get("tag_ids")?,
        avatar: row.get("avatar")?,
        birthday: row.get("birthday")?,
        lunar_birthday: row.get("lunar_birthday")?,
        food_taboos: row.get("food_taboos")?,
        preferences: row.get("preferences")?,
        is_pinned: row.get::<_, i32>("is_pinned")? != 0,
        is_archived: row.get::<_, i32>("is_archived")? != 0,
        sort_order: row.get("sort_order")?,
        created_at: row.get("created_at")?,
        updated_at: row.get("updated_at")?,
        deleted_at: row.get("deleted_at")?,
    })
}

fn row_to_person_phone(row: &rusqlite::Row) -> rusqlite::Result<PersonPhone> {
    Ok(PersonPhone {
        id: row.get("id")?,
        person_id: row.get("person_id")?,
        phone: row.get("phone")?,
        label: row.get("label")?,
        sort_order: row.get("sort_order")?,
    })
}

fn row_to_person_email(row: &rusqlite::Row) -> rusqlite::Result<PersonEmail> {
    Ok(PersonEmail {
        id: row.get("id")?,
        person_id: row.get("person_id")?,
        email: row.get("email")?,
        label: row.get("label")?,
        sort_order: row.get("sort_order")?,
    })
}

fn row_to_person_other_name(row: &rusqlite::Row) -> rusqlite::Result<PersonOtherName> {
    Ok(PersonOtherName {
        id: row.get("id")?,
        person_id: row.get("person_id")?,
        name: row.get("name")?,
        label: row.get("label")?,
        sort_order: row.get("sort_order")?,
    })
}

// ==================== Person Group Commands ====================

#[tauri::command]
pub async fn get_person_groups(app: AppHandle) -> Result<Vec<PersonGroup>, String> {
    let conn = get_db(&app)?;
    let mut stmt = conn.prepare("SELECT * FROM person_groups ORDER BY is_pinned DESC, sort_order ASC, created_at ASC")
        .map_err(|e| format!("Failed to prepare: {}", e))?;
    let groups = stmt.query_map([], row_to_person_group)
        .map_err(|e| format!("Failed to query: {}", e))?;
    let result: Result<Vec<_>, _> = groups.collect();
    result.map_err(|e| format!("Failed to collect: {}", e))
}

#[tauri::command]
pub async fn create_person_group(
    app: AppHandle,
    name: String,
    color: Option<String>,
    icon: Option<String>,
) -> Result<PersonGroup, String> {
    let conn = get_db(&app)?;
    let id = Uuid::new_v4().to_string();
    let color = color.as_deref().unwrap_or("#3B82F6");
    let icon = icon.as_deref().unwrap_or("👥");

    let max_sort: f64 = conn.query_row(
        "SELECT COALESCE(MAX(sort_order), -1) + 1 FROM person_groups",
        [],
        |row| row.get(0),
    ).unwrap_or(0.0);

    conn.execute(
        "INSERT INTO person_groups (id, name, color, icon, sort_order) VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![&id, &name, color, icon, &max_sort],
    ).map_err(|e| format!("Failed to create person group: {}", e))?;

    let group = conn.query_row("SELECT * FROM person_groups WHERE id = ?1", [&id], row_to_person_group)
        .map_err(|e| format!("Failed to fetch person group: {}", e))?;
    Ok(group)
}

#[tauri::command]
pub async fn update_person_group(
    app: AppHandle,
    id: String,
    name: Option<String>,
    color: Option<String>,
    icon: Option<String>,
    is_pinned: Option<bool>,
    is_archived: Option<bool>,
) -> Result<PersonGroup, String> {
    let conn = get_db(&app)?;

    let mut sql = String::from("UPDATE person_groups SET updated_at = datetime('now')");
    let mut param_idx = 1;

    if name.is_some() {
        sql.push_str(&format!(", name = ?{}", param_idx));
        param_idx += 1;
    }
    if color.is_some() {
        sql.push_str(&format!(", color = ?{}", param_idx));
        param_idx += 1;
    }
    if icon.is_some() {
        sql.push_str(&format!(", icon = ?{}", param_idx));
        param_idx += 1;
    }
    if is_pinned.is_some() {
        sql.push_str(&format!(", is_pinned = ?{}", param_idx));
        param_idx += 1;
    }
    if is_archived.is_some() {
        sql.push_str(&format!(", is_archived = ?{}", param_idx));
        param_idx += 1;
    }

    sql.push_str(&format!(" WHERE id = ?{}", param_idx));

    let mut params: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();
    if let Some(ref v) = name { params.push(Box::new(v.clone())); }
    if let Some(ref v) = color { params.push(Box::new(v.clone())); }
    if let Some(ref v) = icon { params.push(Box::new(v.clone())); }
    if let Some(v) = is_pinned { params.push(Box::new(v as i32)); }
    if let Some(v) = is_archived { params.push(Box::new(v as i32)); }
    params.push(Box::new(id.clone()));

    let param_refs: Vec<&dyn rusqlite::types::ToSql> = params.iter().map(|p| p.as_ref()).collect();
    conn.execute(&sql, param_refs.as_slice())
        .map_err(|e| format!("Failed to update person group: {}", e))?;

    let group = conn.query_row("SELECT * FROM person_groups WHERE id = ?1", [&id], row_to_person_group)
        .map_err(|e| format!("Failed to fetch person group: {}", e))?;
    Ok(group)
}

#[tauri::command]
pub async fn delete_person_group(app: AppHandle, id: String) -> Result<(), String> {
    let conn = get_db(&app)?;
    conn.execute("UPDATE persons SET group_id = NULL WHERE group_id = ?1", [&id])
        .map_err(|e| format!("Failed to ungroup persons: {}", e))?;
    conn.execute("DELETE FROM person_groups WHERE id = ?1", [&id])
        .map_err(|e| format!("Failed to delete person group: {}", e))?;
    Ok(())
}

// ==================== Person Commands ====================

#[tauri::command]
pub async fn get_persons(app: AppHandle) -> Result<Vec<Person>, String> {
    let conn = get_db(&app)?;
    let mut stmt = conn.prepare("SELECT * FROM persons WHERE deleted_at IS NULL ORDER BY is_pinned DESC, sort_order ASC, created_at DESC")
        .map_err(|e| format!("Failed to prepare: {}", e))?;
    let persons = stmt.query_map([], row_to_person)
        .map_err(|e| format!("Failed to query: {}", e))?;
    let result: Result<Vec<_>, _> = persons.collect();
    result.map_err(|e| format!("Failed to collect: {}", e))
}

#[tauri::command]
pub async fn get_all_persons(app: AppHandle) -> Result<Vec<Person>, String> {
    let conn = get_db(&app)?;
    let mut stmt = conn.prepare("SELECT * FROM persons WHERE deleted_at IS NULL ORDER BY is_pinned DESC, sort_order ASC, created_at DESC")
        .map_err(|e| format!("Failed to prepare: {}", e))?;
    let persons = stmt.query_map([], row_to_person)
        .map_err(|e| format!("Failed to query: {}", e))?;
    let result: Result<Vec<_>, _> = persons.collect();
    result.map_err(|e| format!("Failed to collect: {}", e))
}

#[tauri::command]
pub async fn get_person_by_id(app: AppHandle, id: String) -> Result<Person, String> {
    let conn = get_db(&app)?;
    conn.query_row("SELECT * FROM persons WHERE id = ?1", [&id], row_to_person)
        .map_err(|e| format!("Failed to fetch person: {}", e))
}

#[tauri::command]
pub async fn create_person(
    app: AppHandle,
    name: String,
    english_name: Option<String>,
    nickname: Option<String>,
    remark: Option<String>,
    group_id: Option<String>,
    tag_ids: Option<String>,
    avatar: Option<String>,
    birthday: Option<String>,
    lunar_birthday: Option<String>,
    food_taboos: Option<String>,
    preferences: Option<String>,
) -> Result<Person, String> {
    println!("[Rust] create_person called: name={}, group_id={:?}", name, group_id);
    let conn = get_db(&app)?;
    let id = Uuid::new_v4().to_string();

    let max_sort: f64 = conn.query_row(
        "SELECT COALESCE(MAX(sort_order), -1) + 1 FROM persons",
        [],
        |row| row.get(0),
    ).unwrap_or(0.0);

    conn.execute(
        "INSERT INTO persons (id, name, english_name, nickname, remark, group_id, tag_ids, avatar, birthday, lunar_birthday, food_taboos, preferences, sort_order) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
        rusqlite::params![&id, &name, english_name, nickname, remark.unwrap_or_default(), group_id, tag_ids, avatar, birthday, lunar_birthday, food_taboos, preferences, &max_sort],
    ).map_err(|e| format!("Failed to create person: {}", e))?;

    let person = conn.query_row("SELECT * FROM persons WHERE id = ?1", [&id], row_to_person)
        .map_err(|e| format!("Failed to fetch person: {}", e))?;
    Ok(person)
}

#[tauri::command]
pub async fn update_person(
    app: AppHandle,
    id: String,
    name: Option<String>,
    english_name: Option<String>,
    nickname: Option<String>,
    remark: Option<String>,
    group_id: Option<String>,
    tag_ids: Option<String>,
    avatar: Option<String>,
    birthday: Option<String>,
    lunar_birthday: Option<String>,
    food_taboos: Option<String>,
    preferences: Option<String>,
    is_pinned: Option<bool>,
    is_archived: Option<bool>,
    sort_order: Option<f64>,
) -> Result<Person, String> {
    let conn = get_db(&app)?;

    let mut sql = String::from("UPDATE persons SET updated_at = datetime('now')");
    let mut param_idx = 1;

    if name.is_some() { sql.push_str(&format!(", name = ?{}", param_idx)); param_idx += 1; }
    if english_name.is_some() { sql.push_str(&format!(", english_name = ?{}", param_idx)); param_idx += 1; }
    if nickname.is_some() { sql.push_str(&format!(", nickname = ?{}", param_idx)); param_idx += 1; }
    if remark.is_some() { sql.push_str(&format!(", remark = ?{}", param_idx)); param_idx += 1; }
    if group_id.is_some() { sql.push_str(&format!(", group_id = ?{}", param_idx)); param_idx += 1; }
    if tag_ids.is_some() { sql.push_str(&format!(", tag_ids = ?{}", param_idx)); param_idx += 1; }
    if avatar.is_some() { sql.push_str(&format!(", avatar = ?{}", param_idx)); param_idx += 1; }
    if birthday.is_some() { sql.push_str(&format!(", birthday = ?{}", param_idx)); param_idx += 1; }
    if lunar_birthday.is_some() { sql.push_str(&format!(", lunar_birthday = ?{}", param_idx)); param_idx += 1; }
    if food_taboos.is_some() { sql.push_str(&format!(", food_taboos = ?{}", param_idx)); param_idx += 1; }
    if preferences.is_some() { sql.push_str(&format!(", preferences = ?{}", param_idx)); param_idx += 1; }
    if is_pinned.is_some() { sql.push_str(&format!(", is_pinned = ?{}", param_idx)); param_idx += 1; }
    if is_archived.is_some() { sql.push_str(&format!(", is_archived = ?{}", param_idx)); param_idx += 1; }
    if sort_order.is_some() { sql.push_str(&format!(", sort_order = ?{}", param_idx)); param_idx += 1; }

    sql.push_str(&format!(" WHERE id = ?{}", param_idx));

    let mut params: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();
    if let Some(ref v) = name { params.push(Box::new(v.clone())); }
    if let Some(ref v) = english_name { params.push(Box::new(v.clone())); }
    if let Some(ref v) = nickname { params.push(Box::new(v.clone())); }
    if let Some(ref v) = remark { params.push(Box::new(v.clone())); }
    if let Some(ref v) = group_id { params.push(Box::new(v.clone())); }
    if let Some(ref v) = tag_ids { params.push(Box::new(v.clone())); }
    if let Some(ref v) = avatar { params.push(Box::new(v.clone())); }
    if let Some(ref v) = birthday { params.push(Box::new(v.clone())); }
    if let Some(ref v) = lunar_birthday { params.push(Box::new(v.clone())); }
    if let Some(ref v) = food_taboos { params.push(Box::new(v.clone())); }
    if let Some(ref v) = preferences { params.push(Box::new(v.clone())); }
    if let Some(v) = is_pinned { params.push(Box::new(v as i32)); }
    if let Some(v) = is_archived { params.push(Box::new(v as i32)); }
    if let Some(v) = sort_order { params.push(Box::new(v)); }
    params.push(Box::new(id.clone()));

    let param_refs: Vec<&dyn rusqlite::types::ToSql> = params.iter().map(|p| p.as_ref()).collect();
    conn.execute(&sql, param_refs.as_slice())
        .map_err(|e| format!("Failed to update person: {}", e))?;

    let person = conn.query_row("SELECT * FROM persons WHERE id = ?1", [&id], row_to_person)
        .map_err(|e| format!("Failed to fetch person: {}", e))?;
    Ok(person)
}

#[tauri::command]
pub async fn delete_person(app: AppHandle, id: String) -> Result<(), String> {
    let conn = get_db(&app)?;
    conn.execute("DELETE FROM person_phones WHERE person_id = ?1", [&id])
        .map_err(|e| format!("Failed to delete person phones: {}", e))?;
    conn.execute("DELETE FROM person_emails WHERE person_id = ?1", [&id])
        .map_err(|e| format!("Failed to delete person emails: {}", e))?;
    conn.execute("DELETE FROM persons WHERE id = ?1", [&id])
        .map_err(|e| format!("Failed to delete person: {}", e))?;
    Ok(())
}

// ==================== Person Phone Commands ====================

#[tauri::command]
pub async fn get_person_phones(app: AppHandle, person_id: String) -> Result<Vec<PersonPhone>, String> {
    let conn = get_db(&app)?;
    let mut stmt = conn.prepare("SELECT * FROM person_phones WHERE person_id = ?1 ORDER BY sort_order ASC")
        .map_err(|e| format!("Failed to prepare: {}", e))?;
    let phones = stmt.query_map([&person_id], row_to_person_phone)
        .map_err(|e| format!("Failed to query: {}", e))?;
    let result: Result<Vec<_>, _> = phones.collect();
    result.map_err(|e| format!("Failed to collect: {}", e))
}

#[tauri::command]
pub async fn create_person_phone(
    app: AppHandle,
    person_id: String,
    phone: String,
    label: Option<String>,
) -> Result<PersonPhone, String> {
    let conn = get_db(&app)?;
    let id = Uuid::new_v4().to_string();
    let label = label.as_deref().unwrap_or("手机");

    let max_sort: f64 = conn.query_row(
        "SELECT COALESCE(MAX(sort_order), -1) + 1 FROM person_phones WHERE person_id = ?1",
        [&person_id],
        |row| row.get(0),
    ).unwrap_or(0.0);

    conn.execute(
        "INSERT INTO person_phones (id, person_id, phone, label, sort_order) VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![&id, &person_id, &phone, label, &max_sort],
    ).map_err(|e| format!("Failed to create phone: {}", e))?;

    let p = conn.query_row("SELECT * FROM person_phones WHERE id = ?1", [&id], row_to_person_phone)
        .map_err(|e| format!("Failed to fetch phone: {}", e))?;
    Ok(p)
}

#[tauri::command]
pub async fn update_person_phone(
    app: AppHandle,
    id: String,
    phone: Option<String>,
    label: Option<String>,
) -> Result<PersonPhone, String> {
    let conn = get_db(&app)?;

    let mut sql = String::from("UPDATE person_phones SET 1=1");
    let mut param_idx = 1;

    if phone.is_some() { sql = sql.replace("1=1", &format!("phone = ?{}", param_idx)); param_idx += 1; }
    if label.is_some() {
        if sql.contains("1=1") {
            sql = sql.replace("1=1", &format!("label = ?{}", param_idx));
        } else {
            sql.push_str(&format!(", label = ?{}", param_idx));
        }
        param_idx += 1;
    }

    if sql.contains("1=1") {
        // nothing to update
        let p = conn.query_row("SELECT * FROM person_phones WHERE id = ?1", [&id], row_to_person_phone)
            .map_err(|e| format!("Failed to fetch phone: {}", e))?;
        return Ok(p);
    }

    sql.push_str(&format!(" WHERE id = ?{}", param_idx));

    let mut params: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();
    if let Some(ref v) = phone { params.push(Box::new(v.clone())); }
    if let Some(ref v) = label { params.push(Box::new(v.clone())); }
    params.push(Box::new(id.clone()));

    let param_refs: Vec<&dyn rusqlite::types::ToSql> = params.iter().map(|p| p.as_ref()).collect();
    conn.execute(&sql, param_refs.as_slice())
        .map_err(|e| format!("Failed to update phone: {}", e))?;

    let p = conn.query_row("SELECT * FROM person_phones WHERE id = ?1", [&id], row_to_person_phone)
        .map_err(|e| format!("Failed to fetch phone: {}", e))?;
    Ok(p)
}

#[tauri::command]
pub async fn delete_person_phone(app: AppHandle, id: String) -> Result<(), String> {
    let conn = get_db(&app)?;
    conn.execute("DELETE FROM person_phones WHERE id = ?1", [&id])
        .map_err(|e| format!("Failed to delete phone: {}", e))?;
    Ok(())
}

// ==================== Person Email Commands ====================

#[tauri::command]
pub async fn get_person_emails(app: AppHandle, person_id: String) -> Result<Vec<PersonEmail>, String> {
    let conn = get_db(&app)?;
    let mut stmt = conn.prepare("SELECT * FROM person_emails WHERE person_id = ?1 ORDER BY sort_order ASC")
        .map_err(|e| format!("Failed to prepare: {}", e))?;
    let emails = stmt.query_map([&person_id], row_to_person_email)
        .map_err(|e| format!("Failed to query: {}", e))?;
    let result: Result<Vec<_>, _> = emails.collect();
    result.map_err(|e| format!("Failed to collect: {}", e))
}

#[tauri::command]
pub async fn create_person_email(
    app: AppHandle,
    person_id: String,
    email: String,
    label: Option<String>,
) -> Result<PersonEmail, String> {
    let conn = get_db(&app)?;
    let id = Uuid::new_v4().to_string();
    let label = label.as_deref().unwrap_or("邮箱");

    let max_sort: f64 = conn.query_row(
        "SELECT COALESCE(MAX(sort_order), -1) + 1 FROM person_emails WHERE person_id = ?1",
        [&person_id],
        |row| row.get(0),
    ).unwrap_or(0.0);

    conn.execute(
        "INSERT INTO person_emails (id, person_id, email, label, sort_order) VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![&id, &person_id, &email, label, &max_sort],
    ).map_err(|e| format!("Failed to create email: {}", e))?;

    let e = conn.query_row("SELECT * FROM person_emails WHERE id = ?1", [&id], row_to_person_email)
        .map_err(|e| format!("Failed to fetch email: {}", e))?;
    Ok(e)
}

#[tauri::command]
pub async fn update_person_email(
    app: AppHandle,
    id: String,
    email: Option<String>,
    label: Option<String>,
) -> Result<PersonEmail, String> {
    let conn = get_db(&app)?;

    let mut sql = String::from("UPDATE person_emails SET 1=1");
    let mut param_idx = 1;

    if email.is_some() { sql = sql.replace("1=1", &format!("email = ?{}", param_idx)); param_idx += 1; }
    if label.is_some() {
        if sql.contains("1=1") {
            sql = sql.replace("1=1", &format!("label = ?{}", param_idx));
        } else {
            sql.push_str(&format!(", label = ?{}", param_idx));
        }
        param_idx += 1;
    }

    if sql.contains("1=1") {
        let e = conn.query_row("SELECT * FROM person_emails WHERE id = ?1", [&id], row_to_person_email)
            .map_err(|e| format!("Failed to fetch email: {}", e))?;
        return Ok(e);
    }

    sql.push_str(&format!(" WHERE id = ?{}", param_idx));

    let mut params: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();
    if let Some(ref v) = email { params.push(Box::new(v.clone())); }
    if let Some(ref v) = label { params.push(Box::new(v.clone())); }
    params.push(Box::new(id.clone()));

    let param_refs: Vec<&dyn rusqlite::types::ToSql> = params.iter().map(|p| p.as_ref()).collect();
    conn.execute(&sql, param_refs.as_slice())
        .map_err(|e| format!("Failed to update email: {}", e))?;

    let e = conn.query_row("SELECT * FROM person_emails WHERE id = ?1", [&id], row_to_person_email)
        .map_err(|e| format!("Failed to fetch email: {}", e))?;
    Ok(e)
}

#[tauri::command]
pub async fn delete_person_email(app: AppHandle, id: String) -> Result<(), String> {
    let conn = get_db(&app)?;
    conn.execute("DELETE FROM person_emails WHERE id = ?1", [&id])
        .map_err(|e| format!("Failed to delete email: {}", e))?;
    Ok(())
}

// ==================== Person Other Name Commands ====================

#[tauri::command]
pub async fn get_person_other_names(app: AppHandle, person_id: String) -> Result<Vec<PersonOtherName>, String> {
    let conn = get_db(&app)?;
    let mut stmt = conn.prepare("SELECT * FROM person_other_names WHERE person_id = ?1 ORDER BY sort_order ASC")
        .map_err(|e| format!("Failed to prepare: {}", e))?;
    let names = stmt.query_map([&person_id], row_to_person_other_name)
        .map_err(|e| format!("Failed to query: {}", e))?;
    let result: Result<Vec<_>, _> = names.collect();
    result.map_err(|e| format!("Failed to collect: {}", e))
}

#[tauri::command]
pub async fn create_person_other_name(
    app: AppHandle,
    person_id: String,
    name: String,
    label: Option<String>,
) -> Result<PersonOtherName, String> {
    let conn = get_db(&app)?;
    let id = Uuid::new_v4().to_string();
    let label = label.as_deref().unwrap_or("别名");

    let max_sort: f64 = conn.query_row(
        "SELECT COALESCE(MAX(sort_order), -1) + 1 FROM person_other_names WHERE person_id = ?1",
        [&person_id],
        |row| row.get(0),
    ).unwrap_or(0.0);

    conn.execute(
        "INSERT INTO person_other_names (id, person_id, name, label, sort_order) VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![&id, &person_id, &name, label, &max_sort],
    ).map_err(|e| format!("Failed to create other name: {}", e))?;

    let n = conn.query_row("SELECT * FROM person_other_names WHERE id = ?1", [&id], row_to_person_other_name)
        .map_err(|e| format!("Failed to fetch other name: {}", e))?;
    Ok(n)
}

#[tauri::command]
pub async fn update_person_other_name(
    app: AppHandle,
    id: String,
    name: Option<String>,
    label: Option<String>,
) -> Result<PersonOtherName, String> {
    let conn = get_db(&app)?;

    let mut sql = String::from("UPDATE person_other_names SET 1=1");
    let mut param_idx = 1;

    if name.is_some() { sql = sql.replace("1=1", &format!("name = ?{}", param_idx)); param_idx += 1; }
    if label.is_some() {
        if sql.contains("1=1") {
            sql = sql.replace("1=1", &format!("label = ?{}", param_idx));
        } else {
            sql.push_str(&format!(", label = ?{}", param_idx));
        }
        param_idx += 1;
    }

    if sql.contains("1=1") {
        let n = conn.query_row("SELECT * FROM person_other_names WHERE id = ?1", [&id], row_to_person_other_name)
            .map_err(|e| format!("Failed to fetch other name: {}", e))?;
        return Ok(n);
    }

    sql.push_str(&format!(" WHERE id = ?{}", param_idx));

    let mut params: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();
    if let Some(ref v) = name { params.push(Box::new(v.clone())); }
    if let Some(ref v) = label { params.push(Box::new(v.clone())); }
    params.push(Box::new(id.clone()));

    let param_refs: Vec<&dyn rusqlite::types::ToSql> = params.iter().map(|p| p.as_ref()).collect();
    conn.execute(&sql, param_refs.as_slice())
        .map_err(|e| format!("Failed to update other name: {}", e))?;

    let n = conn.query_row("SELECT * FROM person_other_names WHERE id = ?1", [&id], row_to_person_other_name)
        .map_err(|e| format!("Failed to fetch other name: {}", e))?;
    Ok(n)
}

#[tauri::command]
pub async fn delete_person_other_name(app: AppHandle, id: String) -> Result<(), String> {
    let conn = get_db(&app)?;
    conn.execute("DELETE FROM person_other_names WHERE id = ?1", [&id])
        .map_err(|e| format!("Failed to delete other name: {}", e))?;
    Ok(())
}
