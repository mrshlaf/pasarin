"use client";

import Script from "next/script";
import { useState, type FormEvent } from "react";
import { PasarinLogo } from "@/components/common/PasarinLogo";

interface TelegramWindow extends Window {
  Telegram?: { WebApp?: { initData: string; ready: () => void; close: () => void } };
}

/** Collects credentials inside the Telegram Mini App so they never appear in chat. */
export default function TelegramLogin() {
  const [initData, setInitData] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  /** Sends credentials to the Pasarin server with the signed Telegram launch data. */
  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
      if (!response.ok) setError(result.error ?? "Akun belum bisa masuk.");
      else {
        form.reset();
        setName(result.name);
      }
    } catch {
      setError("Koneksi terganggu. Coba masuk lagi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-md px-4 py-8">
      <Script src="https://telegram.org/js/telegram-web-app.js" onReady={() => {
        const webApp = (window as TelegramWindow).Telegram?.WebApp;
        webApp?.ready();
        setInitData(webApp?.initData ?? "");
        setLoaded(true);
      }} onError={() => setLoaded(true)} />
      <section className="market-panel p-5 sm:p-7" aria-labelledby="telegram-login-title">
        <PasarinLogo size="sm" showSubtitle={false} />
        <p className="market-eyebrow mt-5">Ruang kerja Telegram</p>
        <h1 id="telegram-login-title" className="mt-1 font-serif text-3xl leading-tight">{name ? "Akun aktif" : "Masuk ke Pasarin"}</h1>
        {name ? (
          <>
            <p role="status" className="mt-2 text-sm leading-6 text-ink-muted">{name} sudah masuk. Buka /menu di chat untuk mulai.</p>
            <button type="button" onClick={() => (window as TelegramWindow).Telegram?.WebApp?.close()}
              className="mt-5 min-h-12 w-full rounded-lg bg-brand px-4 text-sm font-semibold text-cream hover:bg-brand-strong">Kembali ke chat</button>
          </>
        ) : loaded && !initData ? (
          <p role="status" className="mt-2 text-sm leading-6 text-ink-muted">Buka halaman ini lewat tombol Masuk di chat Pasarin.</p>
        ) : (
          <form onSubmit={login} className="mt-5 space-y-4">
            <div>
              <label htmlFor="telegram-identifier" className="mb-1.5 block text-sm font-semibold">Nama pengguna atau email</label>
              <input id="telegram-identifier" name="identifier" className="market-input" autoComplete="username" autoCapitalize="none" spellCheck={false} maxLength={100} required />
            </div>
            <div>
              <label htmlFor="telegram-password" className="mb-1.5 block text-sm font-semibold">Kata sandi</label>
              <input id="telegram-password" name="password" type="password" className="market-input" autoComplete="current-password" maxLength={256} required />
            </div>
            {error && <p role="alert" className="text-sm font-medium text-danger">{error}</p>}
            <button type="submit" disabled={busy || !initData}
              className="min-h-12 w-full rounded-lg bg-brand px-4 text-sm font-semibold text-cream hover:bg-brand-strong disabled:opacity-60">
              {busy ? "Memeriksa akun…" : "Masuk"}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
