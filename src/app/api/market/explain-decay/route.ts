// Rute API penjelasan skor peluruhan satu lot stok.
// Mengembalikan rincian rumus (selalu) dan kalimat penjelasan dari Gemini atau template (lihat decayExplainer).

import { NextRequest } from "next/server";
import { z } from "zod";
import { COMMODITIES } from "@/data/commodities";
import { errorResponse, successResponse, validateJsonBody } from "@/lib/api-response";
import { requireApiRole } from "@/lib/apiAuth";
import { APP_ROLES } from "@/data/accounts";
import { explainDecay, type ExplainAudience } from "@/lib/decayExplainer";
import { explainArrheniusDecay } from "@/lib/pasarinCore";
import { allowRequest } from "@/lib/rateLimit";
import { readMarketSnapshot } from "@/lib/serverSimulationState";

// Selalu dihitung saat diminta karena bergantung pada waktu dan cuaca.
export const dynamic = "force-dynamic";

// Semua peran yang melihat skor susut boleh meminta penjelasan; data lot tetap disaring menurut peran di snapshot.
const roles = APP_ROLES;
// Body hanya berisi ID lot; strictObject menolak field tambahan.
const body = z.strictObject({ stockId: z.string().trim().min(1).max(100) });

// Menjelaskan skor peluruhan lot yang terlihat oleh akun ini.
export async function POST(req: NextRequest) {
  const auth = await requireApiRole(req, roles);
  if (auth.response) return auth.response;
  const { user } = auth;
  // Batas 20 permintaan per 5 menit per akun agar kuota model tidak habis.
  if (!allowRequest("explain-decay:" + user.id, 20, 5 * 60 * 1000)) {
    return errorResponse("Terlalu banyak permintaan. Coba lagi beberapa menit lagi.", 429);
  }
  const input = await validateJsonBody(req, body);
  if (!input.success) return input.errorResponse;
  try {
    // Snapshot sudah disaring menurut peran, jadi pedagang tidak bisa menanyakan lot kios lain.
    const snapshot = await readMarketSnapshot(user);
    const stock = snapshot.stocks.find((item) => item.id === input.data.stockId);
    const health = stock ? snapshot.stockHealth[stock.id] : undefined;
    const commodity = stock ? COMMODITIES.find((item) => item.id === stock.commodityId) : undefined;
    if (!stock || !health || !commodity) return errorResponse("Lot tidak ditemukan atau belum bisa dievaluasi.", 404);
    const breakdown = explainArrheniusDecay(commodity, health.temperatureC, health.humidityPercent, health.hoursElapsed);
    // Saran penutup menyesuaikan peran: pedagang dan pengawas, pembeli, atau kurir.
    const audience: ExplainAudience = user.role === "logistics" ? "kurir" : user.role === "warteg" || user.role === "social_kitchen" || user.role === "maggot" ? "pembeli" : "pedagang";
    return successResponse(await explainDecay(breakdown, false, audience));
  } catch (error) {
    console.error("Cannot explain decay", error);
    return errorResponse("Penjelasan sedang tidak tersedia.", 503);
  }
}
