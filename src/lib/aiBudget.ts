// Penjaga kuota panggilan Gemini: batas harian, jeda saat kena 429, dan cache jawaban.
// Hitungan disimpan di memori tiap instans server, jadi batasnya perkiraan, bukan angka global yang presisi.
// Bila batas tercapai atau Gemini sedang dibatasi, pemanggil memakai jawaban dari rumus tanpa AI.

// Tanggal WIB (YYYY-MM-DD); hitungan harian direset saat tanggal berganti.
const dayFormat = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Jakarta" });

// Lama jeda setelah Gemini membalas 429 (kuota habis): 5 menit.
const COOLDOWN_MS = 5 * 60 * 1000;
// Jumlah maksimal jawaban yang disimpan di cache agar memori tidak terus tumbuh.
const MAX_CACHE_ENTRIES = 200;

let currentDay = "";
let used = 0;
let cooldownUntil = 0;
const cache = new Map<string, { value: string; expires: number }>();

// Batas panggilan per hari. Atur lewat AI_DAILY_CALL_LIMIT; bawaannya 200.
export function dailyCallLimit() {
  const configured = Number(process.env.AI_DAILY_CALL_LIMIT);
  return Number.isFinite(configured) && configured > 0 ? Math.floor(configured) : 200;
}

// Mencatat satu panggilan Gemini. False berarti jangan memanggil: batas harian habis atau sedang masa jeda.
export function reserveAiCall(now = Date.now()) {
  const today = dayFormat.format(now);
  if (today !== currentDay) {
    currentDay = today;
    used = 0;
  }
  if (now < cooldownUntil || used >= dailyCallLimit()) return false;
  used++;
  return true;
}

// Mencatat kegagalan panggilan; galat kuota (429 atau RESOURCE_EXHAUSTED) memulai masa jeda.
export function noteAiFailure(error: unknown, now = Date.now()) {
  const status = (error as { status?: number })?.status;
  const text = error instanceof Error ? error.message : String(error);
  if (status === 429 || /429|RESOURCE_EXHAUSTED/i.test(text)) cooldownUntil = now + COOLDOWN_MS;
}

// Mengambil jawaban dari cache bila belum kedaluwarsa.
export function cachedAnswer(key: string, now = Date.now()) {
  const hit = cache.get(key);
  if (!hit) return undefined;
  if (hit.expires <= now) {
    cache.delete(key);
    return undefined;
  }
  return hit.value;
}

// Menyimpan jawaban; entri tertua dibuang bila cache penuh.
export function storeAnswer(key: string, value: string, ttlMs: number, now = Date.now()) {
  if (cache.size >= MAX_CACHE_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, { value, expires: now + ttlMs });
}

// Status penjaga untuk diagnostik dan pengujian.
export function aiBudgetStatus(now = Date.now()) {
  return { day: currentDay, used, limit: dailyCallLimit(), coolingDown: now < cooldownUntil };
}

// Mengosongkan hitungan dan cache; dipakai pengujian.
export function resetAiBudget() {
  currentDay = "";
  used = 0;
  cooldownUntil = 0;
  cache.clear();
}
