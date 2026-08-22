mod api;

use api::UsageEvent;
use serde_json::json;
use tauri::AppHandle;
use tauri_plugin_store::StoreExt;

const STORE_FILE: &str = "settings.json";
const TOKEN_KEY: &str = "sessionToken";

#[tauri::command]
fn has_session_token(app: AppHandle) -> Result<bool, String> {
    Ok(read_token(&app)?.is_some())
}

#[tauri::command]
fn save_session_token(app: AppHandle, token: String) -> Result<(), String> {
    let normalized = api::normalize_token(&token);
    if normalized.is_empty() {
        return Err("Paste the WorkosCursorSessionToken value first.".to_string());
    }
    let store = app.store(STORE_FILE).map_err(|error| error.to_string())?;
    store.set(TOKEN_KEY, json!(normalized));
    store.save().map_err(|error| error.to_string())?;
    Ok(())
}

#[tauri::command]
fn clear_session_token(app: AppHandle) -> Result<(), String> {
    let store = app.store(STORE_FILE).map_err(|error| error.to_string())?;
    store.delete(TOKEN_KEY);
    store.save().map_err(|error| error.to_string())?;
    Ok(())
}

#[tauri::command]
async fn fetch_usage_events(app: AppHandle) -> Result<Vec<UsageEvent>, String> {
    let token = read_token(&app)?.ok_or_else(|| {
        "No session token saved. Open Settings and paste your WorkosCursorSessionToken.".to_string()
    })?;
    api::fetch_usage_events(&token).await
}

fn read_token(app: &AppHandle) -> Result<Option<String>, String> {
    let store = app.store(STORE_FILE).map_err(|error| error.to_string())?;
    Ok(store.get(TOKEN_KEY).and_then(|value| {
        value
            .as_str()
            .map(str::trim)
            .filter(|token| !token.is_empty())
            .map(str::to_string)
    }))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .setup(|app| {
            app.handle()
                .plugin(tauri_plugin_updater::Builder::new().build())?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            has_session_token,
            save_session_token,
            clear_session_token,
            fetch_usage_events
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
