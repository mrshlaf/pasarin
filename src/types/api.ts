/**
 * PASARIN API Standard Type Definitions
 * Aligned with PRD_FIX_PASARIN.md Section 15.4 (Jira PSR-3 & PSR-4)
 *
 * Provides standardized envelope for all autonomous sub-agent endpoints,
 * scheduled cron runners, health probes, and audit logging.
 */

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  details?: unknown;
  timestamp: string;
}

export interface ApiPagination {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedApiResponse<T = unknown> extends ApiResponse<T[]> {
  pagination: ApiPagination;
}

export interface HealthCheckData {
  status: 'healthy' | 'degraded' | 'unhealthy';
  service: string;
  version: string;
  environment: string;
  uptimeSeconds: number;
  timestamp: string;
  checks: {
    database: 'connected' | 'configured' | 'unconfigured' | 'error';
    memoryUsageMB: number;
  };
}

export interface AgentSweepTriggerPayload {
  cronSecret?: string;
  forcedTrigger?: boolean;
  targetKiosksCount?: number;
}

export interface SystemAuditTrailRecord {
  event_id: string;
  subsystem: string;
  action_type: string;
  payload_json: Record<string, unknown>;
  execution_duration_ms?: number;
  occurred_at: string;
}

export interface AfternoonSweepResult {
  eventId: string;
  subsystem: string;
  actionType: string;
  schedule: string;
  triggeredAt: string;
  result: string;
  executionDurationMs: number;
  kiosksScanned: number;
  surplusDetectedKg: number;
  allocations: {
    tier1WartegKg: number;
    tier2SocialKg: number;
    tier3MaggotKg: number;
  };
  financials: {
    estimatedCapitalRecoveredIdr: number;
    discountAveragePercent: number;
  };
  auditTrail: {
    logged: boolean;
    storage: 'supabase' | 'in_memory';
  };
}
