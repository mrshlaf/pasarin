/**
 * Modul Pencatatan Jejak Audit Sistem (System Audit Trail) (PSR-4).
 * Mencatat seluruh mutasi dan peristiwa operasional penting ke tabel `system_audit_trail` Supabase.
 * Mengimplementasikan buffer memori sirkular lokal (kapasitas 100 entri) sebagai fail-safe saat jaringan database terputus.
 */

import { supabase } from "@/lib/supabase";
import { SystemAuditTrailRecord } from "@/types/api";

const inMemoryAuditRingBuffer: SystemAuditTrailRecord[] = [];
const MAX_RING_BUFFER_SIZE = 100;

/**
 * Parameter masukan pencatatan peristiwa audit sistem.
 */
interface RecordAuditParams {
  subsystem: string;
  action_type: string;
  payload: Record<string, unknown>;
  durationMs?: number;
}

/**
 * Merekam catatan audit sistem ke Supabase atau ring buffer memori lokal.
 * Menjamin ketersediaan audit: jika koneksi basis data gagal, rekaman tetap tersimpan
 * pada buffer in-memory sehingga sistem operasional pasar tidak mengalami pemblokiran (non-blocking failover).
 *
 * @param params - Parameter peristiwa audit mencakup subsistem asal, tipe aksi, payload rincian, dan durasi eksekusi (ms).
 * @returns Status keberhasilan perekaman, ID unik peristiwa (eventId), dan media penyimpanan yang digunakan ("supabase" | "in_memory").
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

/**
 * Mengambil riwayat peristiwa audit terbaru dari buffer memori lokal.
 * Berguna untuk diagnostik cepat dashboard pengawas pasar tanpa membebani kuota kueri basis data.
 *
 * @param limit - Jumlah maksimal rekaman yang diambil (default: 20).
 * @returns Larik rekaman jejak audit sistem terbaru terurut dari yang paling baru.
 */
export function getRecentAuditLogs(limit = 20): SystemAuditTrailRecord[] {
  return inMemoryAuditRingBuffer.slice(0, limit);
}
