/**
 * System Audit Trail Logger
 * Aligned with PRD_FIX_PASARIN.md Section 7.1 (Table 12 system_audit_trail) & Jira PSR-4
 *
 * Records cryptographic transaction security events, cron sweep triggers,
 * and multi-agent reasoning steps into Supabase with in-memory resilient buffering.
 */

import { supabase } from "@/lib/supabase";
import { SystemAuditTrailRecord } from "@/types/api";

const inMemoryAuditRingBuffer: SystemAuditTrailRecord[] = [];
const MAX_RING_BUFFER_SIZE = 100;

interface RecordAuditParams {
  subsystem: string;
  action_type: string;
  payload: Record<string, unknown>;
  durationMs?: number;
}

/**
 * Persists an audit log entry to Supabase system_audit_trail table
 * and caches it in memory for instant dashboard retrieval.
 */
export async function recordAuditLog(params: RecordAuditParams): Promise<{
  success: boolean;
  eventId: string;
  storage: "supabase" | "in_memory";
}> {
  const eventId = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const occurredAt = new Date().toISOString();

  const record: SystemAuditTrailRecord = {
    event_id: eventId,
    subsystem: params.subsystem,
    action_type: params.action_type,
    payload_json: {
      ...params.payload,
      execution_duration_ms: params.durationMs ?? 0,
    },
    execution_duration_ms: params.durationMs,
    occurred_at: occurredAt,
  };

  // Prepend to ring buffer
  inMemoryAuditRingBuffer.unshift(record);
  if (inMemoryAuditRingBuffer.length > MAX_RING_BUFFER_SIZE) {
    inMemoryAuditRingBuffer.pop();
  }

  // Attempt Supabase persistence if database URL is configured
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const isSupabaseLive = Boolean(supabaseUrl) && !supabaseUrl?.includes("placeholder");

  if (isSupabaseLive) {
    try {
      const { error } = await supabase.from("system_audit_trail").insert([
        {
          event_id: record.event_id,
          subsystem: record.subsystem,
          action_type: record.action_type,
          payload_json: record.payload_json,
          occurred_at: record.occurred_at,
        },
      ]);

      if (!error) {
        return { success: true, eventId, storage: "supabase" };
      }
      console.warn("[Audit Logger] Supabase insert failed, retained in memory:", error.message);
    } catch (err) {
      console.warn("[Audit Logger] Network error persisting audit log, retained in memory:", err);
    }
  }

  return { success: true, eventId, storage: "in_memory" };
}

/**
 * Retrieves the latest recorded audit logs from memory buffer
 */
export function getRecentAuditLogs(limit = 20): SystemAuditTrailRecord[] {
  return inMemoryAuditRingBuffer.slice(0, Math.max(1, limit));
}
