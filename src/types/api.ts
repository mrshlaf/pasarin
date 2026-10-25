/**
 * PASARIN API Standard Type Definitions
 * Aligned with PRD_FIX_PASARIN.md Section 15.4 (Jira PSR-3)
 *
 * Provides standardized envelope for all autonomous sub-agent endpoints,
 * health probes, and client communication.
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
