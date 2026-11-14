"use client";

import Script from "next/script";
import { useState, type FormEvent } from "react";
import { Eye, EyeOff, Send } from "lucide-react";
import { PasarinLogo } from "@/components/common/PasarinLogo";

interface TelegramWindow extends Window {
  Telegram?: { WebApp?: { initData: string; ready: () => void; close: () => void } };
}

export default function TelegramLogin() {
  const [initData, setInitData] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !initData) return;
    const form = event.currentTarget;
    const values = new FormData(form);
    setError("");
    setBusy(true);
    try {
      const response = await fetch("/api/telegram/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData, identifier: values.get("identifier"), password: values.get("password") }),
      });
      const result = await response.json();
      if (!response.ok) setError(result.error ?? "Akun belum bisa masuk. Periksa nama pengguna dan kata sandi Anda.");
      else {
        form.reset();
        setName(result.name);
      }
    } catch {
      setError("Koneksi terganggu. Periksa koneksi, lalu coba masuk lagi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-dvh bg-canvas px-4 py-5 text-ink sm:py-10">
      <Script src="https://telegram.org/js/telegram-web-app.js" onReady={() => {
        const webApp = (window as TelegramWindow).Telegram?.WebApp;
        webApp?.ready();
        setInitData(webApp?.initData ?? "");
        setLoaded(true);
      }} onError={() => setLoaded(true)} />
      <div className="mx-auto w-full max-w-md">
        <div className="rounded-t-3xl bg-brand-deep px-5 py-6 text-cream sm:px-7">
          <PasarinLogo size="sm" showSubtitle={false} variant="white" />
          <p className="mt-5 text-sm leading-6 text-sage-soft">Akses akun Pasarin dari Telegram</p>
        </div>
        <section className="rounded-b-3xl border border-t-0 border-line bg-surface p-5 sm:p-7" aria-labelledby="telegram-login-title">
          <h1 id="telegram-login-title" className="font-serif text-[clamp(1.8rem,6vw,2.25rem)] leading-tight tracking-tight">{name ? "Akun berhasil terhubung" : "Masuk ke Pasarin"}</h1>
          {name ? <>
            <p role="status" className="mt-3 text-sm leading-6 text-ink-soft">{name} sudah masuk. Kembali ke chat Pasarin dan kirim <strong>/menu</strong> untuk membuka pilihan kegiatan.</p>
            <button type="button" onClick={() => (window as TelegramWindow).Telegram?.WebApp?.close()} className="mt-6 min-h-12 w-full rounded-lg bg-brand px-4 text-sm font-semibold text-cream hover:bg-brand-strong">Kembali ke chat</button>
          </> : !loaded ? (
            <p role="status" className="mt-4 rounded-xl border border-line bg-canvas p-4 text-sm leading-6 text-ink-soft">Menyiapkan sesi Telegram. Formulir masuk akan tampil setelah sesi tersedia.</p>
          ) : !initData ? <>
            <p role="status" className="mt-4 rounded-xl border border-line bg-canvas p-4 text-sm leading-6 text-ink-soft">Sesi Telegram tidak tersedia. Buka bot Pasarin, lalu pilih tombol Masuk di chat untuk menghubungkan akun.</p>
            <a href="https://t.me/agent_pasarin_bot" className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 text-sm font-semibold text-cream hover:bg-brand-strong"><Send size={17} aria-hidden />Buka bot Pasarin</a>
          </> : <>
            <p className="mt-3 text-sm leading-6 text-ink-muted">Masukkan akun pasar Anda untuk menggunakannya melalui chat Pasarin.</p>
            <form onSubmit={login} className="mt-6 space-y-5" aria-busy={busy} aria-describedby={error ? "telegram-login-error" : undefined}>
              <div>
                <label htmlFor="telegram-identifier" className="mb-1.5 block text-sm font-semibold">Nama pengguna atau email</label>
                <input id="telegram-identifier" name="identifier" className="market-input" autoComplete="username" autoCapitalize="none" spellCheck={false} maxLength={100} required disabled={busy} aria-invalid={Boolean(error)} aria-describedby={error ? "telegram-login-error" : undefined} />
              </div>
              <div>
                <label htmlFor="telegram-password" className="mb-1.5 block text-sm font-semibold">Kata sandi</label>
                <div className="relative">
                  <input id="telegram-password" name="password" type={showPassword ? "text" : "password"} className="market-input pr-14" autoComplete="current-password" maxLength={256} required disabled={busy} aria-invalid={Boolean(error)} aria-describedby={error ? "telegram-login-error" : undefined} />
                  <button type="button" onClick={() => setShowPassword((shown) => !shown)} aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"} aria-pressed={showPassword} className="absolute inset-y-0 right-1 grid min-h-11 w-11 place-items-center rounded-md text-ink-soft hover:bg-brand-soft">{showPassword ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}</button>
                </div>
              </div>
              {error && <p id="telegram-login-error" role="alert" className="rounded-lg border border-danger/30 bg-danger-soft p-3 text-sm font-medium leading-6 text-danger">{error}</p>}
              <button type="submit" disabled={busy} className="min-h-12 w-full rounded-lg bg-brand px-4 text-sm font-semibold text-cream hover:bg-brand-strong disabled:cursor-wait disabled:opacity-60">{busy ? "Memeriksa akun…" : "Masuk melalui Telegram"}</button>
            </form>
          </>}
        </section>
      </div>
    </main>
  );
}
