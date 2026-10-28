// System audit logger dengan Supabase persistence & in-memory fallback buffer (PSR-4)

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

// Simpan event audit ke Supabase atau ring buffer in-memory
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

  // Simpan ke ring buffer
  inMemoryAuditRingBuffer.unshift(record);
  if (inMemoryAuditRingBuffer.length > MAX_RING_BUFFER_SIZE) {
    inMemoryAuditRingBuffer.pop();
  }

  // Coba persist ke Supabase jika URL sudah diset
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
          execution_duration_ms: record.execution_duration_ms ?? 0,
          occurred_at: record.occurred_at,
        },
      ]);

      if (!error) {
        return { success: true, eventId, storage: "supabase" };
      }
      console.warn("[recordAuditLog] Gagal insert Supabase, fallback ke buffer lokal:", error.message);
    } catch (err) {
      console.warn("[recordAuditLog] Supabase offline, fallback ke buffer lokal:", err);
    }
  }

  return { success: true, eventId, storage: "in_memory" };
}

// Ambil riwayat audit log terbaru
export function getRecentAuditLogs(limit = 20): SystemAuditTrailRecord[] {
  return inMemoryAuditRingBuffer.slice(0, limit);
}
