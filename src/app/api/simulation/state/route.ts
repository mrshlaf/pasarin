import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { DEMO_SEED_OFFERS, DEMO_SEED_TRANSACTIONS } from "@/data/seedData";

const STATE_FILE_PATH = path.join(process.cwd(), "src", "data", "simulationState.json");

interface SimulationSavedState {
  offers: typeof DEMO_SEED_OFFERS;
  transactions: typeof DEMO_SEED_TRANSACTIONS;
}

function readPersistentState(): SimulationSavedState {
  try {
    if (fs.existsSync(STATE_FILE_PATH)) {
      const content = fs.readFileSync(STATE_FILE_PATH, "utf-8");
      const parsed = JSON.parse(content);
      return {
        offers: Array.isArray(parsed.offers) ? parsed.offers : [],
        transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
      };
    }
  } catch (err) {
    console.warn("[SimulationState Read Warning]:", err);
  }
  return { offers: [], transactions: [] };
}

function writePersistentState(state: SimulationSavedState) {
  try {
    fs.writeFileSync(STATE_FILE_PATH, JSON.stringify(state, null, 2), "utf-8");
  } catch (err) {
    console.error("[SimulationState Write Error]:", err);
  }
}

export async function GET() {
  const current = readPersistentState();
  return NextResponse.json({
    success: true,
    data: current,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({ action: "clear" }));
    const action = body.action || "clear";

    if (action === "clear") {
      const emptyState = { offers: [], transactions: [] };
      writePersistentState(emptyState);
      return NextResponse.json({
        success: true,
        message: "Status simulasi berhasil di-reset total dari nol (Kondisi Awal Pagi Hari).",
        data: emptyState,
      });
    }

    if (action === "seed" || action === "seed_all") {
      const seededState = {
        offers: [...DEMO_SEED_OFFERS],
        transactions: [...DEMO_SEED_TRANSACTIONS],
      };
      writePersistentState(seededState);
      return NextResponse.json({
        success: true,
        message: "Seluruh 8 lot demo 3-tier berhasil dimuat untuk pengujian komprehensif.",
        data: seededState,
      });
    }

    if (action === "seed_warteg") {
      const state = {
        offers: DEMO_SEED_OFFERS.filter((o) => o.targetTier === "tier_1"),
        transactions: [],
      };
      writePersistentState(state);
      return NextResponse.json({
        success: true,
        message: "Katalog Warteg (Tier 1) berhasil dimuat (Kangkung, Bayam, Tomat).",
        data: state,
      });
    }

    if (action === "seed_social") {
      const state = {
        offers: DEMO_SEED_OFFERS.filter((o) => o.targetTier === "tier_2"),
        transactions: [],
      };
      writePersistentState(state);
      return NextResponse.json({
        success: true,
        message: "Alokasi Dapur Sosial & Panti (Tier 2) berhasil dimuat (Pakcoy, Buncis).",
        data: state,
      });
    }

    if (action === "seed_maggot") {
      const state = {
        offers: DEMO_SEED_OFFERS.filter((o) => o.targetTier === "tier_3"),
        transactions: [],
      };
      writePersistentState(state);
      return NextResponse.json({
        success: true,
        message: "Muatan Organik Maggot BSF (Tier 3) berhasil dimuat (Sawi Afkir, Terung).",
        data: state,
      });
    }

    if (action === "seed_courier") {
      const state = {
        offers: DEMO_SEED_OFFERS.filter((o) => o.status === "claimed"),
        transactions: [...DEMO_SEED_TRANSACTIONS],
      };
      writePersistentState(state);
      return NextResponse.json({
        success: true,
        message: "Tugas Pengantaran Kurir Viar aktif & Rekening Escrow berhasil disiapkan.",
        data: state,
      });
    }

    return NextResponse.json(
      { success: false, error: "Aksi tidak dikenal. Pilihan: clear, seed, seed_warteg, seed_social, seed_maggot, seed_courier" },
      { status: 400 }
    );
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
