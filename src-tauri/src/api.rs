use serde::{Deserialize, Serialize};
use serde_json::Value;

const USAGE_URL: &str = "https://cursor.com/api/dashboard/get-filtered-usage-events";
const PAGE_SIZE: u32 = 500;
const MAX_PAGES: u32 = 80;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UsageEvent {
    pub timestamp: i64,
    pub input_tokens: u64,
    pub output_tokens: u64,
    pub cache_tokens: u64,
    pub cost_usd: f64,
    pub model: String,
}

#[derive(Debug, Deserialize)]
struct UsagePage {
    #[serde(rename = "usageEventsDisplay", default)]
    usage_events_display: Vec<RawEvent>,
}

#[derive(Debug, Deserialize)]
struct RawEvent {
    timestamp: Option<Value>,
    model: Option<String>,
    #[serde(rename = "tokenUsage")]
    token_usage: Option<RawTokenUsage>,
    #[serde(rename = "chargedCents")]
    charged_cents: Option<Value>,
}

#[derive(Debug, Deserialize)]
struct RawTokenUsage {
    #[serde(rename = "inputTokens")]
    input_tokens: Option<Value>,
    #[serde(rename = "outputTokens")]
    output_tokens: Option<Value>,
    #[serde(rename = "cacheReadTokens")]
    cache_read_tokens: Option<Value>,
    #[serde(rename = "cacheWriteTokens")]
    cache_write_tokens: Option<Value>,
    #[serde(rename = "totalCents")]
    total_cents: Option<Value>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct UsageRequest {
    page: u32,
    page_size: u32,
    #[serde(skip_serializing_if = "Option::is_none")]
    start_date: Option<String>,
    end_date: String,
}

pub fn normalize_token(raw: &str) -> String {
    let mut value = raw.trim().to_string();
    if let Some(rest) = value.strip_prefix("Cookie:") {
        value = rest.trim().to_string();
    }
    if let Some(rest) = value.strip_prefix("WorkosCursorSessionToken=") {
        value = rest.trim().to_string();
    }
    if (value.starts_with('"') && value.ends_with('"'))
        || (value.starts_with('\'') && value.ends_with('\''))
    {
        value = value[1..value.len() - 1].to_string();
    }
    if value.contains("::") && !value.contains("%3A%3A") {
        value = value.replacen("::", "%3A%3A", 1);
    }
    value.trim().to_string()
}

pub async fn fetch_usage_events(token: &str, since_ms: Option<i64>) -> Result<Vec<UsageEvent>, String> {
    let cookie = normalize_token(token);
    if cookie.is_empty() {
        return Err("Session token is empty.".to_string());
    }

    let client = reqwest::Client::builder()
        .user_agent("cursor-cost/0.4.2")
        .build()
        .map_err(|error| error.to_string())?;

    let end = now_ms();
    let mut events = Vec::new();

    for page in 1..=MAX_PAGES {
        let page_events = fetch_page(&client, &cookie, page, since_ms, end).await?;
        let count = page_events.len();
        events.extend(page_events);
        if count < PAGE_SIZE as usize {
            break;
        }
    }

    Ok(events)
}

async fn fetch_page(
    client: &reqwest::Client,
    cookie: &str,
    page: u32,
    start: Option<i64>,
    end: i64,
) -> Result<Vec<UsageEvent>, String> {
    let response = client
        .post(USAGE_URL)
        .header("Cookie", format!("WorkosCursorSessionToken={cookie}"))
        .header("Origin", "https://cursor.com")
        .header("Referer", "https://cursor.com/dashboard")
        .header("Accept", "application/json")
        .json(&UsageRequest {
            page,
            page_size: PAGE_SIZE,
            start_date: start.map(|value| value.to_string()),
            end_date: end.to_string(),
        })
        .send()
        .await
        .map_err(|error| format!("Could not reach cursor.com: {error}"))?;

    let status = response.status();
    if status.as_u16() == 401 || status.as_u16() == 403 {
        return Err(
            "Session token was rejected. Paste a fresh WorkosCursorSessionToken from cursor.com."
                .to_string(),
        );
    }
    if !status.is_success() {
        return Err(format!("Cursor API returned HTTP {status}."));
    }

    let page: UsagePage = response
        .json()
        .await
        .map_err(|error| format!("Cursor API returned unreadable JSON: {error}"))?;

    Ok(page
        .usage_events_display
        .into_iter()
        .filter_map(normalize_event)
        .collect())
}

fn normalize_event(event: RawEvent) -> Option<UsageEvent> {
    let timestamp = parse_i64(event.timestamp.as_ref())?;
    if timestamp <= 0 {
        return None;
    }

    let usage = event.token_usage.unwrap_or(RawTokenUsage {
        input_tokens: None,
        output_tokens: None,
        cache_read_tokens: None,
        cache_write_tokens: None,
        total_cents: None,
    });

    let input_tokens = parse_u64(usage.input_tokens.as_ref());
    let output_tokens = parse_u64(usage.output_tokens.as_ref());
    let cache_tokens =
        parse_u64(usage.cache_read_tokens.as_ref()) + parse_u64(usage.cache_write_tokens.as_ref());
    let cost_usd = parse_f64(usage.total_cents.as_ref())
        .or_else(|| parse_f64(event.charged_cents.as_ref()))
        .unwrap_or(0.0)
        / 100.0;
    let model = event
        .model
        .filter(|value| !value.trim().is_empty())
        .unwrap_or_else(|| "unknown".to_string());

    Some(UsageEvent {
        timestamp,
        input_tokens,
        output_tokens,
        cache_tokens,
        cost_usd,
        model,
    })
}

fn parse_i64(value: Option<&Value>) -> Option<i64> {
    match value? {
        Value::Number(number) => number.as_i64().or_else(|| number.as_f64().map(|n| n as i64)),
        Value::String(text) => text.parse().ok(),
        _ => None,
    }
}

fn parse_u64(value: Option<&Value>) -> u64 {
    match value {
        Some(Value::Number(number)) => number
            .as_u64()
            .or_else(|| number.as_f64().map(|n| n.max(0.0) as u64))
            .unwrap_or(0),
        Some(Value::String(text)) => text.parse().unwrap_or(0),
        _ => 0,
    }
}

fn parse_f64(value: Option<&Value>) -> Option<f64> {
    match value? {
        Value::Number(number) => number.as_f64(),
        Value::String(text) => text.parse().ok(),
        _ => None,
    }
}

fn now_ms() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|duration| duration.as_millis() as i64)
        .unwrap_or(0)
}
