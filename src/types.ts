export type UsageEvent = {
  timestamp: number;
  inputTokens: number;
  outputTokens: number;
  cacheTokens: number;
  costUsd: number;
  model: string;
};

export type SpendSegment = {
  model: string;
  spend: number;
};

export type SpendBucket = {
  key: string;
  label: string;
  spend: number;
  segments: SpendSegment[];
};

export type ModelTotal = {
  model: string;
  spend: number;
};

export type BucketSize = "15m" | "1h" | "1d" | "1w" | "1mo";

export type ViewRange = {
  start: Date | null;
  end: Date;
  preset: string | null;
};
