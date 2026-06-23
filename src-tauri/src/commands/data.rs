use tauri::AppHandle;
use rusqlite::types::ValueRef;
use serde_json::{json, Value};

fn get_db(app: &AppHandle) -> Result<rusqlite::Connection, String> {
    let db_path = crate::db::connection::get_db_connection(app);
    rusqlite::Connection::open(&db_path).map_err(|e| format!("Failed to open database: {}", e))
}

/// Tables to export/import, in dependency order (parent tables before child tables).
const TABLES: &[&str] = &[
    "lists",
    "settings",
    "tags",
    "tasks",
    "steps",
    "habits",
    "habit_logs",
    "countdowns",
    "calendar_events",
    "list_settings",
];

/// Deletion order respects foreign key constraints (child tables before parent tables).
const DELETION_ORDER: &[&str] = &[
    "habit_logs",
    "steps",
    "tasks",
    "tags",
    "habits",
    "countdowns",
    "calendar_events",
    "list_settings",
    "lists",
    "settings",
];

/// Convert a rusqlite Row into a serde_json::Value (JSON object) using pre-fetched column names.
fn row_to_json_with_names(column_names: &[String], row: &rusqlite::Row) -> rusqlite::Result<Value> {
    let mut map = serde_json::Map::new();
    for (i, name) in column_names.iter().enumerate() {
        let val = match row.get_ref(i)? {
            ValueRef::Null => Value::Null,
            ValueRef::Integer(i) => json!(i),
            ValueRef::Real(f) => json!(f),
            ValueRef::Text(s) => json!(String::from_utf8_lossy(s).to_string()),
            ValueRef::Blob(b) => json!(base64_encode(b)),
        };
        map.insert(name.clone(), val);
    }
    Ok(Value::Object(map))
}

/// Simple base64 encoding for blob data.
pub fn base64_encode(data: &[u8]) -> String {
    const CHARS: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut result = String::new();
    for chunk in data.chunks(3) {
        let b0 = chunk[0] as u32;
        let b1 = if chunk.len() > 1 { chunk[1] as u32 } else { 0 };
        let b2 = if chunk.len() > 2 { chunk[2] as u32 } else { 0 };
        let triple = (b0 << 16) | (b1 << 8) | b2;
        result.push(CHARS[((triple >> 18) & 0x3F) as usize] as char);
        result.push(CHARS[((triple >> 12) & 0x3F) as usize] as char);
        if chunk.len() > 1 {
            result.push(CHARS[((triple >> 6) & 0x3F) as usize] as char);
        } else {
            result.push('=');
        }
        if chunk.len() > 2 {
            result.push(CHARS[(triple & 0x3F) as usize] as char);
        } else {
            result.push('=');
        }
    }
    result
}

/// Extract a value from a JSON Value for use as a rusqlite parameter.
fn extract_param(val: &Value) -> Box<dyn rusqlite::types::ToSql> {
    match val {
        Value::Null => Box::new(Option::<String>::None),
        Value::Bool(b) => Box::new(*b as i32),
        Value::Number(n) => {
            if let Some(i) = n.as_i64() {
                Box::new(i)
            } else if let Some(f) = n.as_f64() {
                Box::new(f)
            } else {
                Box::new(Option::<String>::None)
            }
        }
        Value::String(s) => Box::new(s.clone()),
        _ => Box::new(val.to_string()),
    }
}

#[tauri::command]
pub async fn export_all_data(app: AppHandle) -> Result<String, String> {
    let conn = get_db(&app)?;
    let mut result = serde_json::Map::new();

    for &table in TABLES {
        let sql = format!("SELECT * FROM {}", table);
        let mut stmt = conn
            .prepare(&sql)
            .map_err(|e| format!("Failed to prepare query for {}: {}", table, e))?;

        let column_names: Vec<String> = stmt
            .column_names()
            .iter()
            .map(|s| s.to_string())
            .collect();
        let rows = stmt
            .query_map([], move |row| row_to_json_with_names(&column_names, row))
            .map_err(|e| format!("Failed to query {}: {}", table, e))?;

        let mut table_data = Vec::new();
        for row in rows {
            table_data.push(row.map_err(|e| format!("Failed to read row from {}: {}", table, e))?);
        }

        result.insert(table.to_string(), Value::Array(table_data));
    }

    serde_json::to_string_pretty(&Value::Object(result))
        .map_err(|e| format!("Failed to serialize data: {}", e))
}

#[tauri::command]
pub async fn import_all_data(app: AppHandle, json: String) -> Result<(), String> {
    let data: Value =
        serde_json::from_str(&json).map_err(|e| format!("Invalid JSON: {}", e))?;

    let conn = get_db(&app)?;

    // Disable foreign keys during import to avoid constraint violations
    conn.execute_batch("PRAGMA foreign_keys = OFF;")
        .map_err(|e| format!("Failed to disable foreign keys: {}", e))?;

    let tx = conn
        .unchecked_transaction()
        .map_err(|e| format!("Failed to begin transaction: {}", e))?;

    // Clear all existing data (child tables first to respect any remaining constraints)
    for &table in DELETION_ORDER {
        let sql = format!("DELETE FROM {}", table);
        tx.execute(&sql, [])
            .map_err(|e| format!("Failed to clear table {}: {}", table, e))?;
    }

    // Import data from JSON
    for &table in TABLES {
        let table_data = match data.get(table) {
            Some(Value::Array(arr)) => arr,
            _ => continue,
        };

        if table_data.is_empty() {
            continue;
        }

        // Use the first row to determine column names
        let first_row = table_data[0].as_object().ok_or_else(|| {
            format!("Invalid row format in table {}", table)
        })?;
        let columns: Vec<String> = first_row.keys().cloned().collect();
        let placeholders: Vec<String> = (1..=columns.len())
            .map(|i| format!("?{}", i))
            .collect();

        let insert_sql = format!(
            "INSERT OR REPLACE INTO {} ({}) VALUES ({})",
            table,
            columns.join(", "),
            placeholders.join(", ")
        );

        for (idx, row_val) in table_data.iter().enumerate() {
            let row = row_val.as_object().ok_or_else(|| {
                format!("Invalid row format in table {} at index {}", table, idx)
            })?;

            let params: Vec<Box<dyn rusqlite::types::ToSql>> = columns
                .iter()
                .map(|col| {
                    let val = row.get(col).unwrap_or(&Value::Null);
                    extract_param(val)
                })
                .collect();

            let param_refs: Vec<&dyn rusqlite::types::ToSql> =
                params.iter().map(|p| p.as_ref()).collect();

            tx.execute(&insert_sql, param_refs.as_slice()).map_err(|e| {
                format!("Failed to insert row {} into {}: {}", idx, table, e)
            })?;
        }
    }

    tx.commit()
        .map_err(|e| format!("Failed to commit transaction: {}", e))?;

    // Re-enable foreign keys
    conn.execute_batch("PRAGMA foreign_keys = ON;")
        .map_err(|e| format!("Failed to re-enable foreign keys: {}", e))?;

    Ok(())
}
