// Modul Pencatatan Jejak Audit Sistem (System Audit Trail) (PSR-4).
// Mencatat seluruh mutasi dan peristiwa operasional penting ke tabel `system_audit_trail` Supabase.
// Mengimplementasikan buffer memori sirkular lokal (kapasitas 100 entri) sebagai fail-safe saat jaringan database terputus.

import { getServiceRoleClient } from "@/lib/supabase";
import { SystemAuditTrailRecord } from "@/types/api";

// Buffer sirkular catatan audit terbaru di memori lokal (PSR-4).
// Selalu diisi, termasuk saat insert Supabase berhasil, sehingga tetap tersedia ketika database offline.
const inMemoryAuditRingBuffer: SystemAuditTrailRecord[] = [];

// Batas maksimal kapasitas ring buffer audit lokal (100 entri) (PSR-4).
const MAX_RING_BUFFER_SIZE = 100;

// Parameter masukan pencatatan peristiwa audit sistem (PSR-4).
interface RecordAuditParams {
  subsystem: string;
  action_type: string;
  payload: Record<string, unknown>;
  // Durasi eksekusi dalam milidetik; dicatat 0 di payload bila tidak diisi.
  durationMs?: number;
}

// Merekam catatan audit sistem ke Supabase atau ring buffer memori lokal.
// Menjamin ketersediaan audit: jika koneksi basis data gagal, rekaman tetap tersimpan
// pada buffer in-memory sehingga sistem operasional pasar tidak mengalami pemblokiran (non-blocking failover).
export async function recordAuditLog(params: RecordAuditParams): Promise<{
  success: boolean;
  eventId: string;
  storage: "supabase" | "in_memory";
}> {
  // ID unik peristiwa: waktu dalam milidetik ditambah akhiran acak agar tidak bentrok.
  const eventId = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const occurredAt = new Date().toISOString();

  // Bentuk rekaman yang disimpan; durasi juga disalin ke payload agar terbaca saat payload ditampilkan sendiri.
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

  // Simpan rekaman peristiwa terbaru ke kepala ring buffer in-memory lokal
  inMemoryAuditRingBuffer.unshift(record);
  if (inMemoryAuditRingBuffer.length > MAX_RING_BUFFER_SIZE) {
    inMemoryAuditRingBuffer.pop();
  }

  // Persistensikan ke tabel basis data Supabase jika kredensial aktif telah terkonfigurasi
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Supabase dianggap aktif hanya bila URL dan kunci service role tersedia.
  const isSupabaseLive = Boolean(supabaseUrl && process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (isSupabaseLive) {
    try {
      // Insert memakai service role karena tabel audit tidak dapat ditulis oleh klien biasa.
      const { error } = await getServiceRoleClient().from("system_audit_trail").insert([
        {
          event_id: record.event_id,
          subsystem: record.subsystem,
          action_type: record.action_type,
          payload_json: record.payload_json,
          execution_duration_ms: record.execution_duration_ms ?? 0,
          occurred_at: record.occurred_at,
        },
      ]);

      // Berhasil tersimpan di database; selain itu jatuh ke penyimpanan memori di bawah.
      if (!error) {
        return { success: true, eventId, storage: "supabase" };
      }
      console.warn("[recordAuditLog] Gagal insert Supabase, fallback ke buffer lokal:", error.message);
    } catch (err) {
      console.warn("[recordAuditLog] Supabase offline, fallback ke buffer lokal:", err);
    }
  }

  // Kegagalan database tidak menggagalkan pemanggil; peristiwa tetap tercatat di buffer memori.
  return { success: true, eventId, storage: "in_memory" };
}

// Mengambil riwayat peristiwa audit terbaru dari buffer memori lokal.
// Berguna untuk diagnostik cepat dashboard pengawas pasar tanpa membebani kuota kueri basis data.
export function getRecentAuditLogs(limit = 20): SystemAuditTrailRecord[] {
  return inMemoryAuditRingBuffer.slice(0, limit);
}
