export type UsageEvent = {
  timestamp: number;
  inputTokens: number;
  outputTokens: number;
  cacheTokens: number;
  costUsd: number;
  model: string;
};

export type SpendBucket = {
  key: string;
  label: string;
  spend: number;
};

export type RangeTab =
  | "hourly"
  | "daily"
  | "month"
  | "months3"
  | "months6"
  | "months12"
  | "all";
