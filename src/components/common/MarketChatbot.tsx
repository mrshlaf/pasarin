"use client";

// Komponen Asisten PASARIN: tombol "Tanya asisten" dan dialog percakapan.
// Dipakai di dashboard (data akun) dan di landing page (etalase publik) dengan endpoint berbeda.

import { useEffect, useRef, useState } from "react";
import { ArrowRight, MessageCircle, Send, X } from "lucide-react";
import { useAuth } from "@/lib/authContext";
import { apiFetch } from "@/lib/apiFetch";
import { ROLE_LABELS } from "@/components/layout/AppSidebar";
import type { AppRole } from "@/data/accounts";

// Satu gelembung percakapan; `source` hanya ada pada jawaban asisten untuk menandai asal jawabannya.
type Message = { id: number; sender: "user" | "assistant"; text: string; source?: string; suggestions?: string[] };
// Bentuk respons kedua endpoint asisten; jawaban dianggap gagal bila `data.summary` kosong.
type Answer = { success?: boolean; error?: string; data?: { summary?: string; source?: string; suggestions?: string[] } };

// Contoh pertanyaan per peran, disesuaikan dengan data yang boleh dilihat peran tersebut.
const suggestions: Record<AppRole, string[]> = {
  vendor: ["Ringkas stok kios saya", "Apa yang perlu ditimbang?", "Bagaimana diskon dihitung?"],
  warteg: ["Apa penawaran yang tersedia?", "Bagaimana status pesanan saya?", "Bagaimana cara membayar?"],
  social_kitchen: ["Apa donasi yang tersedia?", "Bagaimana status pesanan saya?", "Bagaimana prioritas dapur sosial?"],
  maggot: ["Apa biomassa yang tersedia?", "Bagaimana status pesanan saya?", "Bahan apa yang boleh diklaim?"],
  logistics: ["Apa yang siap diantar?", "Bagaimana kendaraan dipilih?", "Bagaimana konfirmasi serah terima?"],
  manager: ["Ringkas operasional pasar", "Laporan apa saja yang tersedia?", "Berapa stok yang berisiko?"],
  admin: ["Ringkas operasional pasar", "Laporan apa saja yang tersedia?", "Apa yang perlu dievaluasi?"],
};

// Saran untuk pengunjung landing page yang belum masuk.
const publicSuggestions = ["Sayur apa yang tersedia hari ini?", "Bayam paling murah di kios mana?", "Bagaimana cara kerja PASARIN?"];

// Asisten dashboard untuk akun yang sedang masuk; tidak tampil saat belum login.
export function MarketChatbot() {
  const { user } = useAuth();
  // Akun berbeda memulai percakapan baru, termasuk setelah berganti peran.
  return user ? <ChatWorkspace key={`${user.id}:${user.role}`} greeting={`Halo, ${user.name}.`} subtitle={`Ruang kerja ${ROLE_LABELS[user.role]}`}
    intro="Tanyakan data ruang kerja atau cara menggunakan PASARIN. Asisten membantu menjelaskan; tindakan tetap Anda konfirmasi di dashboard."
    suggestions={suggestions[user.role]} endpoint="/api/orchestrator/query" authenticated /> : null;
}

// Asisten landing page: hanya etalase publik dan panduan, tanpa data akun.
export function PublicMarketAssistant() {
  return <ChatWorkspace greeting="Halo!" subtitle="Info publik pasar"
    intro="Tanyakan komoditas, harga, dan kios penjual di etalase pasar, atau cara kerja PASARIN. Data akun seperti pesanan dan saldo hanya terlihat setelah masuk."
    suggestions={publicSuggestions} endpoint="/api/market/assistant" authenticated={false} />;
}

// Teks pembuka, contoh pertanyaan, dan endpoint yang membedakan asisten dashboard dari asisten landing page.
interface WorkspaceProps {
  greeting: string;
  subtitle: string;
  intro: string;
  suggestions: string[];
  endpoint: string;
  authenticated: boolean;
}

// Dialog percakapan satu pertanyaan per kirim, dengan batas 1.000 karakter, batas waktu 25 detik, dan tombol coba lagi.
// Permintaan dashboard memakai token sesi; landing page memakai fetch biasa tanpa kredensial.
function ChatWorkspace({ greeting, subtitle, intro, suggestions: prompts, endpoint, authenticated }: WorkspaceProps) {
  // State percakapan: dialog terbuka, isi kolom, status memuat, galat, pertanyaan terakhir untuk coba lagi, dan riwayat pesan.
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [retryQuery, setRetryQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  // Ref ke elemen dialog, kolom input, tombol pemicu (untuk mengembalikan fokus), dan area gulir.
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const transcript = useRef<HTMLDivElement>(null);
  // controller membatalkan permintaan berjalan; inFlight mencegah kirim ganda; nextId memberi ID unik tiap pesan.
  const controller = useRef<AbortController | null>(null);
  const inFlight = useRef(false);
  const nextId = useRef(0);

  // Batalkan permintaan yang masih berjalan saat komponen dilepas agar tidak ada setState setelah unmount.
  useEffect(() => () => controller.current?.abort(), []);
  // Sinkronkan state `open` dengan API modal native <dialog>, lalu fokuskan kolom pertanyaan.
  useEffect(() => {
    if (open) {
      dialog.current?.showModal();
      input.current?.focus();
    } else {
      dialog.current?.close();
    }
  }, [open]);
  // Gulir transkrip ke pesan terbaru setiap ada jawaban, status memuat, atau galat baru.
  useEffect(() => {
    const area = transcript.current;
    if (area) area.scrollTop = area.scrollHeight;
  }, [messages, loading, error, open]);

  // Pesan asisten terakhir; saran pertanyaan lanjutan hanya ditampilkan di bawahnya.
  const lastAssistantId = [...messages].reverse().find((message) => message.sender === "assistant")?.id;

  // Menutup dialog dan mengembalikan fokus keyboard ke tombol "Tanya asisten".
  function close() {
    setOpen(false);
    trigger.current?.focus();
  }

  // Mengirim pertanyaan ke endpoint asisten; diabaikan bila kosong, lebih dari 1.000 karakter, atau masih ada permintaan berjalan.
  // Saat `retry`, pertanyaan tidak ditambahkan lagi ke transkrip karena sudah tampil sebelumnya.
  async function send(text: string, retry = false) {
    const question = text.trim();
    // Pertanyaan kosong atau lebih dari 1.000 karakter diabaikan, begitu juga bila permintaan sebelumnya belum selesai.
    if (!question || question.length > 1000 || inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    setError("");
    setRetryQuery(question);
    setQuery("");
    if (!retry) setMessages((previous) => [...previous, { id: ++nextId.current, sender: "user", text: question }]);
    const request = new AbortController();
    controller.current = request;
    // Permintaan dibatalkan setelah 25 detik agar pengguna tidak menunggu tanpa akhir.
    const timeout = window.setTimeout(() => request.abort(), 25000);
    try {
      // Dashboard memakai apiFetch (membawa token sesi); landing page memakai fetch biasa tanpa kredensial.
      const response = await (authenticated ? apiFetch : fetch)(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: question }),
        signal: request.signal,
      });
      const result: Answer = await response.json();
      if (!response.ok || !result.success || !result.data?.summary) {
        throw new Error(result.error || "Jawaban belum tersedia. Silakan coba lagi.");
      }
      const answer = { text: result.data.summary, source: result.data.source, suggestions: result.data.suggestions };
      setMessages((previous) => [...previous, {
        id: ++nextId.current, sender: "assistant", ...answer,
      }]);
    } catch (cause) {
      // Pembatalan karena batas waktu diberi pesan khusus; galat lain memakai pesan dari server.
      setError(request.signal.aborted ? "Permintaan terlalu lama. Silakan coba lagi." : cause instanceof Error ? cause.message : "Koneksi terputus. Silakan coba lagi.");
    } finally {
      window.clearTimeout(timeout);
      inFlight.current = false;
      setLoading(false);
      input.current?.focus();
    }
  }

  return (
    <>
      {/* Tombol melayang pembuka asisten. */}
      <button ref={trigger} type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open}
        aria-controls="market-assistant" className="market-chat-trigger">
        <MessageCircle size={19} aria-hidden /> <span>Tanya asisten</span>
      </button>
      {/* Dialog modal native; Escape dan klik di luar kotak menutupnya. */}
      <dialog ref={dialog} id="market-assistant" aria-labelledby="market-assistant-title" className="market-chat-dialog"
        onCancel={(event) => { event.preventDefault(); close(); }}
        onClick={(event) => { if (event.target === event.currentTarget) close(); }}>
        <div className="flex h-full min-h-0 flex-col">
          {/* Kepala dialog: judul, subjudul peran, dan tombol tutup. */}
          <header className="flex shrink-0 items-center justify-between gap-4 border-b border-line px-5 py-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand"><MessageCircle size={21} aria-hidden /></span>
              <div><h2 id="market-assistant-title" className="font-serif text-xl text-ink">Asisten PASARIN</h2>
                <p className="mt-0.5 text-xs text-ink-muted">{subtitle}</p></div>
            </div>
            <button type="button" onClick={close} aria-label="Tutup asisten" className="grid size-11 shrink-0 place-items-center rounded-lg text-ink-muted hover:bg-brand-soft"><X size={20} aria-hidden /></button>
          </header>

          {/* Area percakapan yang bisa digulir. */}
          <div ref={transcript} className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-canvas px-5 py-5">
            {/* Sebelum ada pesan: sapaan, penjelasan singkat, dan contoh pertanyaan yang bisa langsung diklik. */}
            {messages.length === 0 ? (
              <div className="py-4">
                <p className="text-xs font-semibold text-brand">Bantuan untuk aktivitas pasar</p>
                <h3 className="mt-3 font-serif text-3xl leading-tight text-ink">{greeting}<br />Ada yang ingin ditanyakan?</h3>
                <p className="mt-3 text-sm leading-6 text-ink-muted">{intro}</p>
                <div className="mt-6 grid gap-2">
                  {prompts.map((text) => <button key={text} type="button" onClick={() => void send(text)}
                    className="flex min-h-12 items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-left text-sm text-ink hover:border-line-strong hover:bg-brand-soft">
                    <span>{text}</span><ArrowRight size={16} className="shrink-0 text-brand" aria-hidden />
                  </button>)}
                </div>
              </div>
            ) : (
              <div role="log" aria-label="Percakapan dengan asisten" aria-live="polite" aria-relevant="additions" className="space-y-5">
                {messages.map((message) => <div key={message.id} className={message.sender === "user" ? "ml-8" : "mr-3"}>
                  <p className="mb-1.5 text-xs font-semibold text-ink-muted">{message.sender === "user" ? "Anda" : "Asisten PASARIN"}</p>
                  <div className={`whitespace-pre-wrap break-words rounded-2xl px-4 py-3 text-sm leading-6 ${message.sender === "user" ? "bg-brand text-cream" : "border border-line bg-surface text-ink"}`}>
                    {message.text}
                  </div>
                  {message.source && <p className="mt-1.5 text-xs text-ink-muted">{message.source === "gemini" ? `Jawaban AI berdasarkan ${authenticated ? "data ruang kerja" : "etalase publik"}` : "Ringkasan data dan panduan PASARIN"}</p>}
                  {/* Saran pertanyaan lanjutan: hanya di jawaban terakhir dan saat tidak sedang memuat. */}
                  {message.id === lastAssistantId && !loading && message.suggestions && message.suggestions.length > 0 && (
                    <div className="mt-3 grid gap-2" aria-label="Pertanyaan lanjutan">
                      <p className="text-xs font-semibold text-ink-muted">Pertanyaan lanjutan</p>
                      {message.suggestions.map((text) => <button key={text} type="button" onClick={() => void send(text)}
                        className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-line bg-surface px-3 py-2 text-left text-[13px] font-medium text-ink hover:border-brand">
                        <span>{text}</span><ArrowRight size={14} className="shrink-0 text-brand" aria-hidden />
                      </button>)}
                    </div>
                  )}
                </div>)}
              </div>
            )}
            {/* Status memuat dan galat dengan tombol coba lagi. */}
            {loading && <p role="status" className="mt-5 text-sm text-ink-muted">Menyiapkan jawaban…</p>}
            {error && <div role="alert" className="mt-4 rounded-xl border border-danger/30 bg-danger-soft p-3 text-sm text-danger">
              <p>{error}</p><button type="button" disabled={loading} onClick={() => void send(retryQuery, true)} className="mt-1 min-h-11 font-semibold underline underline-offset-4">Coba lagi</button>
            </div>}
          </div>
          {/* Kolom pertanyaan; tombol kirim nonaktif saat kosong atau sedang memuat. */}
          <footer className="shrink-0 border-t border-line bg-surface px-4 pb-4 pt-3">
            <form onSubmit={(event) => { event.preventDefault(); void send(query); }} className="flex items-center gap-2">
              <label htmlFor="market-chat-input" className="sr-only">Pertanyaan untuk asisten</label>
              <input ref={input} id="market-chat-input" value={query} onChange={(event) => setQuery(event.target.value)} maxLength={1000}
                placeholder="Tulis pertanyaan Anda…" autoComplete="off" className="market-input min-w-0 flex-1" />
              <button type="submit" disabled={loading || !query.trim()} aria-label="Kirim pertanyaan" className="grid size-12 shrink-0 place-items-center rounded-xl bg-brand text-cream hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-50"><Send size={18} aria-hidden /></button>
            </form>
            <p className="mt-2 text-xs leading-5 text-ink-muted">Periksa jawaban sebelum mengambil keputusan. Asisten tidak mengubah stok atau transaksi.</p>
          </footer>
        </div>
      </dialog>
    </>
  );
}
