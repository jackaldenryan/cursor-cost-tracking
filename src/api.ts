import { invoke } from "@tauri-apps/api/core";
import type { UsageEvent } from "./types";

export function hasSessionToken(): Promise<boolean> {
  return invoke("has_session_token");
}

export function saveSessionToken(token: string): Promise<void> {
  return invoke("save_session_token", { token });
}

export function clearSessionToken(): Promise<void> {
  return invoke("clear_session_token");
}

export function fetchUsageEvents(): Promise<UsageEvent[]> {
  return invoke("fetch_usage_events");
}
