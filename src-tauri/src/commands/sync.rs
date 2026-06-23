use tauri::AppHandle;
use tauri::Manager;
use keyring::Entry;

const SERVICE: &str = "mindless-sync";

fn entry_for(account: &str) -> Result<Entry, String> {
    Entry::new(SERVICE, account).map_err(|e| format!("Keychain entry error: {}", e))
}

#[tauri::command]
pub async fn save_pat(account: String, pat: String) -> Result<(), String> {
    let entry = entry_for(&account)?;
    entry.set_password(&pat).map_err(|e| format!("Failed to save PAT: {}", e))
}

#[tauri::command]
pub async fn load_pat(account: String) -> Result<Option<String>, String> {
    let entry = entry_for(&account)?;
    match entry.get_password() {
        Ok(p) => Ok(Some(p)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(format!("Failed to load PAT: {}", e)),
    }
}

#[tauri::command]
pub async fn delete_pat(account: String) -> Result<(), String> {
    let entry = entry_for(&account)?;
    match entry.delete_credential() {
        Ok(()) => Ok(()),
        Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(format!("Failed to delete PAT: {}", e)),
    }
}

#[tauri::command]
pub async fn get_db_base64(app: AppHandle) -> Result<String, String> {
    let db_path = crate::db::connection::get_db_path(&app);
    let bytes = std::fs::read(&db_path)
        .map_err(|e| format!("Failed to read database file: {}", e))?;
    Ok(crate::commands::data::base64_encode(&bytes))
}

#[tauri::command]
pub async fn get_app_data_dir(app: AppHandle) -> Result<String, String> {
    let dir = app.path().app_data_dir().map_err(|e| format!("Failed to get app data dir: {}", e))?;
    Ok(dir.to_string_lossy().to_string())
}
