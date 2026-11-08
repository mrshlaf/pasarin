"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { PasarinLogo } from "@/components/common/PasarinLogo";
import { useAuth } from "@/lib/authContext";

const timeline = [
  ["Pasokan", "Pedagang mencatat barang masuk"],
  ["Pesanan", "Pembeli mengklaim penawaran"],
  ["Pengantaran", "Kurir mengonfirmasi serah terima"],
];

/** Shows the same account sign-in entry point for every role. */
export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, signInWithPassword } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated) router.replace("/");
  }, [isAuthenticated, router]);

  /** Submits credentials and presents the result without exposing provider internals. */
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    setErrorMessage("");
    setIsSubmitting(true);
    try {
      const result = await signInWithPassword(identifier, password);
      if (!result.success) setErrorMessage(result.error ?? "Periksa akun Anda dan coba lagi.");
    } catch {
      setErrorMessage("Koneksi sedang terganggu. Coba masuk kembali.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-dvh bg-canvas text-ink">
      <header className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-5 py-5 sm:px-9">
        <PasarinLogo size="md" />
        <span className="text-right text-xs font-semibold text-ink-muted">Pasar Induk Kramat Jati</span>
      </header>
      <main className="mx-auto grid max-w-[1440px] gap-5 px-5 pb-5 sm:px-9 lg:min-h-[650px] lg:grid-cols-[1.12fr_1fr] lg:gap-8">
        <section aria-labelledby="login-heading" className="flex min-w-0 items-center rounded-3xl border border-line bg-surface px-5 py-9 sm:px-12 lg:order-2 lg:px-14">
          <div className="mx-auto w-full max-w-[390px]">
            <h1 id="login-heading" className="font-serif text-4xl tracking-tight sm:text-5xl">Masuk ke Pasarin</h1>
            <p className="mt-3 text-sm leading-6 text-ink-muted">Gunakan akun Anda untuk melihat stok, penawaran, atau tugas pengantaran sesuai peran.</p>
            <form onSubmit={handleSubmit} className="mt-7 space-y-4">
              <div>
                <label htmlFor="identifier" className="mb-1.5 block text-sm font-semibold">Nama pengguna atau email</label>
                <input id="identifier" name="username" type="text" autoComplete="username" autoCapitalize="none" spellCheck={false}
                  value={identifier} onChange={(event) => setIdentifier(event.target.value)}
                  required className="market-input" aria-invalid={Boolean(errorMessage)} />
              </div>
              <div>
                <label htmlFor="password" className="mb-1.5 block text-sm font-semibold">Kata sandi</label>
                <div className="relative">
                  <input id="password" name="password" type={showPassword ? "text" : "password"}
                    autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)}
                    required className="market-input pr-14" aria-invalid={Boolean(errorMessage)} />
                  <button type="button" onClick={() => setShowPassword((shown) => !shown)}
                    aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                    className="absolute inset-y-1 right-1 grid w-11 place-items-center rounded-md text-ink-muted hover:bg-brand-soft">
                    {showPassword ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
                  </button>
                </div>
              </div>
              {errorMessage && <p role="alert" className="rounded-lg border border-danger/30 bg-danger-soft p-3 text-sm font-medium text-danger">{errorMessage}</p>}
              <button type="submit" disabled={isSubmitting || isLoading || isAuthenticated}
                className="flex min-h-12 w-full items-center justify-center gap-3 rounded-lg bg-brand px-4 text-sm font-semibold text-cream hover:bg-brand-strong disabled:opacity-60">
                {isAuthenticated ? "Membuka ruang kerja…" : isSubmitting ? "Memeriksa akun…" : "Masuk"}
              </button>
            </form>
            <details className="mt-6 border-t border-line pt-4 text-[13px] leading-5 text-ink-muted">
              <summary className="cursor-pointer font-semibold text-ink">Akun</summary>
              <p className="mt-2">
                Pedagang pasar1 sampai pasar30, warteg1 sampai warteg100, sosial1 sampai sosial3,
                maggot1 sampai maggot2, kurir1 sampai kurir5, pengelola1, dan admin1.
                Kata sandi sama dengan nama pengguna.
              </p>
            </details>
          </div>
        </section>
        <aside aria-label="Alur simulasi pasar" className="flex min-w-0 flex-col justify-between rounded-3xl bg-brand-deep px-6 py-9 text-cream sm:px-12 lg:order-1 lg:p-14">
          <div>
            <p className="max-w-[12ch] font-serif text-[clamp(2.6rem,5.1vw,5.2rem)] leading-[0.96] tracking-[-0.04em]">Sisa pasar, sampai ke tujuan.</p>
            <p className="mt-6 max-w-[39ch] text-sm leading-6 text-sage-soft">Pedagang, warteg, dapur sosial, dan kurir bekerja dari satu alur, mulai dari pasokan masuk sampai serah terima.</p>
          </div>
          <dl className="mt-10 grid border-t border-rail">
            {timeline.map(([time, label]) => (
              <div key={time} className="flex items-center gap-5 border-b border-rail py-3.5">
                <dt className="w-24 shrink-0 text-sm font-semibold text-sage">{time}</dt>
                <dd className="text-sm text-cream">{label}</dd>
              </div>
            ))}
          </dl>
        </aside>
      </main>
      <footer className="mx-auto max-w-[1440px] px-5 py-3 text-xs text-ink-muted sm:px-9">Prototipe akademik, Teknik Elektro, Universitas Indonesia.</footer>
    </div>
  );
}
