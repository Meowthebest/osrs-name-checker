export type CheckStatus =
  | "taken"
  | "possibly_available"
  | "invalid"
  | "unknown"
  | "rate_limited"
  | "error";

export type Confidence = "high" | "medium" | "low" | "unknown";

export type ProviderStatus =
  "found" | "not_found" | "unavailable" | "rate_limited" | "timeout" | "error";

export interface ProviderDetails {
  overallRank?: number;
  overallLevel?: number;
  combatLevel?: number;
}

export interface ProviderResult {
  providerId: string;
  providerName: string;
  status: ProviderStatus;
  responseTimeMs: number;
  profileUrl?: string;
  details?: ProviderDetails;
  message?: string;
  official: boolean;
}

export interface CheckResult {
  query: string;
  normalizedUsername: string;
  status: CheckStatus;
  confidence: Confidence;
  summary: string;
  confidenceExplanation: string;
  checkedAt: string;
  responseTimeMs: number;
  sources: ProviderResult[];
  warnings: string[];
}

export interface ValidationResult {
  valid: boolean;
  original: string;
  display: string;
  normalized: string;
  error?: string;
}

export interface BulkResponse {
  totalSubmitted: number;
  totalProcessed: number;
  duplicatesRemoved: number;
  checkedAt: string;
  results: CheckResult[];
}
