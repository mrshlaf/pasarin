import { GoogleGenAI } from "@google/genai";
import { getEnv } from "@/lib/env";
import { getServerSimulationState, evaluateMarketStock } from "@/lib/serverSimulationState";
import { getHyperlocalMarketWeather } from "@/lib/weatherAgent";
import { isReadyForDelivery } from "@/types/market";

const jakartaDate = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" });

/** Compares recorded timestamps by the market's business date. */
function isToday(iso: string | undefined, today: string) {
  const date = Date.parse(iso ?? "");
  return Number.isFinite(date) && jakartaDate.format(date) === today;
}

/** Collects operational counts from persisted arrivals, orders and measured age. */
export async function getMarketOperations() {
  const [state, weather] = await Promise.all([getServerSimulationState(), getHyperlocalMarketWeather()]);
  const today = jakartaDate.format(new Date());
  const stock = state.stocks.filter((item) => item.remainingKg > 0);
  const weighed = new Set(stock.filter((item) => item.verifiedAt).map((item) => item.id));
  const pending = state.offers.filter((offer) => offer.status === "pending_vendor" || (offer.status === "active" && !weighed.has(offer.stockId))).length;
  const unpaid = state.offers.filter((offer) => offer.status === "claimed" && offer.paymentStatus === "unpaid").length;
  const ready = state.offers.filter(isReadyForDelivery).length;
  const atRisk = stock.filter((item) => (evaluateMarketStock(item, weather)?.decayScore ?? 0) >= 0.35).length;
  return {
    date: today,
    arrivalsToday: state.stocks.filter((item) => isToday(item.createdAt, today)).length,
    deliveriesToday: state.offers.filter((offer) => isToday(offer.deliveredOn, today)).length,
    inventoryKg: stock.reduce((total, item) => total + (item.verifiedAt ? item.remainingKg : 0), 0),
    activeOffers: state.offers.filter((offer) => offer.status === "active" && weighed.has(offer.stockId)).length,
    pending, unpaid, ready, atRisk,
    workstreams: [
      ...(pending || atRisk ? ["Evaluasi stok dan penawaran"] : []),
      ...(unpaid ? ["Pembayaran pesanan"] : []),
      ...(ready ? ["Pengantaran"] : []),
    ],
    weatherSource: weather.source,
    weatherEstimated: weather.isEstimated ?? false,
  };
}

/** Answers a supervisor using the same market data on web and Telegram. */
export async function answerMarketQuestion(question: string, forceHeuristic = false) {
  const metrics = await getMarketOperations();
  const summary = [
    "Ringkasan " + metrics.date + " WIB.",
    metrics.arrivalsToday + " pasokan masuk dan " + metrics.deliveriesToday + " pengantaran selesai hari ini.",
    metrics.activeOffers + " penawaran tersedia, " + metrics.unpaid + " pesanan menunggu bayar, dan " + metrics.ready + " siap diantar.",
    metrics.workstreams.length + " alur perlu ditangani" + (metrics.workstreams.length ? " · " + metrics.workstreams.join(", ") : "") + ".",
  ].join(" ");
  const key = getEnv().GEMINI_API_KEY;
  if (!key || forceHeuristic) return { summary, source: "data_pasar", metrics };

  try {
    const ai = new GoogleGenAI({ apiKey: key });
    const result = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash-lite",
      contents: JSON.stringify({ question, metrics }),
      config: {
        systemInstruction: "Jawab singkat dalam bahasa Indonesia. Gunakan hanya fakta dan angka dari metrics. Jelaskan bahwa stok berisiko adalah hasil estimasi. Jika data tidak menjawab pertanyaan, sebutkan batasnya. Jangan mengusulkan atau mengeksekusi mutasi apa pun.",
        maxOutputTokens: 450,
        abortSignal: AbortSignal.timeout(10000),
      },
    });
    if (result.text?.trim()) return { summary: result.text.trim(), source: "gemini", metrics };
  } catch (error) {
    console.warn("Gemini market summary unavailable:", error instanceof Error ? error.name : "unknown");
  }
  return { summary, source: "data_pasar", metrics };
}
