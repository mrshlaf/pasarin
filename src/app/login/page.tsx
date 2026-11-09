/**
 * Halaman Masuk Sesi Pengguna Aplikasi PASARIN (Login Page) (PSR-2).
 * Menyediakan gerbang autentikasi terpusat untuk seluruh peran operasional pasar:
 * pedagang kios, warteg, dapur sosial, sentra maggot, armada kurir, pengelola pasar, dan administrator.
 */

"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Eye, EyeOff } from "lucide-react";
import { PasarinLogo } from "@/components/common/PasarinLogo";
import { useAuth } from "@/lib/authContext";

const timeline = [
  ["Pasokan", "Pedagang mencatat barang masuk"],
  ["Pesanan", "Pembeli mengklaim penawaran"],
  ["Pengantaran", "Kurir mengonfirmasi serah terima"],
];

/**
 * Komponen halaman login yang memvalidasi kredensial pengguna dan mengarahkan ke dasbor peran terkait.
 */
export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, signInWithPassword } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated) router.replace("/dashboard");
  }, [isAuthenticated, router]);

  /**
   * Mengirimkan kredensial masuk pengguna ke layanan otentikasi.
   */
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
      <header className="market-shell flex items-center justify-between gap-3 py-3 sm:py-5">
        <Link href="/" aria-label="Dasbor publik Pasarin"><PasarinLogo size="sm" showSubtitle={false} /></Link>
        <Link href="/" className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-brand hover:bg-brand-soft">
          <ArrowLeft size={16} aria-hidden /> Dasbor publik
        </Link>
      </header>
      <main className="market-shell grid gap-4 pb-5 sm:gap-5 lg:min-h-[min(40rem,calc(100svh-9rem))] lg:grid-cols-[1.12fr_1fr]">
        <section aria-labelledby="login-heading" className="flex min-w-0 items-center rounded-3xl border border-line bg-surface px-5 py-7 sm:px-12 sm:py-10 lg:order-2 lg:px-14">
          <div className="mx-auto w-full max-w-[390px]">
            <p className="market-eyebrow mb-2">Ruang kerja Pasarin</p>
            <h1 id="login-heading" className="font-serif text-[clamp(2rem,4vw,3rem)] leading-tight tracking-tight">Masuk ke Pasarin</h1>
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
                {!isSubmitting && !isAuthenticated && <ArrowRight size={16} aria-hidden />}
              </button>
            </form>
          </div>
        </section>
        <aside aria-label="Alur simulasi pasar" className="flex min-w-0 flex-col justify-between rounded-3xl bg-brand-deep px-6 py-9 text-cream sm:px-12 lg:order-1 lg:p-14">
          <div>
            <p className="max-w-[13ch] font-serif text-[clamp(2.25rem,5.1vw,4.75rem)] leading-none tracking-[-0.035em]">Sisa pasar, sampai ke tujuan.</p>
            <p className="mt-6 max-w-[39ch] text-sm leading-6 text-sage-soft">Pedagang, warteg, dapur sosial, dan kurir bekerja dari satu alur, mulai dari pasokan masuk sampai serah terima.</p>
          </div>
          <dl className="mt-10 grid border-t border-rail">
            {timeline.map(([time, label]) => (
              <div key={time} className="grid grid-cols-[6rem_minmax(0,1fr)] items-baseline gap-2 border-b border-rail py-3 sm:gap-5 sm:py-3.5">
                <dt className="text-sm font-semibold text-sage">{time}</dt>
                <dd className="text-sm text-cream">{label}</dd>
              </div>
            ))}
          </dl>
        </aside>
      </main>
      <footer className="market-shell py-3 text-xs text-ink-muted">PASARIN</footer>
    </div>
  );
}
