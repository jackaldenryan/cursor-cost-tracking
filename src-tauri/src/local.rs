use rusqlite::Connection;
use std::path::PathBuf;

pub fn read_cursor_session_token() -> Option<String> {
    let path = cursor_state_db()?;
    let connection = Connection::open_with_flags(
        &path,
        rusqlite::OpenFlags::SQLITE_OPEN_READ_ONLY | rusqlite::OpenFlags::SQLITE_OPEN_NO_MUTEX,
    )
    .ok()?;
    let access = item_text(&connection, "cursorAuth/accessToken")?;
    if access.is_empty() {
        return None;
    }
    let user_id = item_text(&connection, "adminSettings.cachedAuthId")
        .or_else(|| item_text(&connection, "glass.lastSignedInAuthId"))
        .and_then(user_id_from_auth_id);
    Some(match user_id {
        Some(user_id) => format!("{user_id}%3A%3A{access}"),
        None => access,
    })
}

fn cursor_state_db() -> Option<PathBuf> {
    let home = std::env::var_os("HOME")?;
    let path = PathBuf::from(home)
        .join("Library/Application Support/Cursor/User/globalStorage/state.vscdb");
    path.is_file().then_some(path)
}

fn item_text(connection: &Connection, key: &str) -> Option<String> {
    let value: String = connection
        .query_row(
            "SELECT value FROM ItemTable WHERE key = ?1",
            [key],
            |row| row.get(0),
        )
        .ok()?;
    let trimmed = value.trim();
    if trimmed.is_empty() {
        None
    } else {
        Some(trimmed.to_string())
    }
}

fn user_id_from_auth_id(auth_id: String) -> Option<String> {
    let id = auth_id
        .split('|')
        .next_back()
        .unwrap_or(&auth_id)
        .trim()
        .to_string();
    if id.starts_with("user_") {
        Some(id)
    } else {
        None
    }
}
