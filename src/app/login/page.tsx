/**
 * Halaman Masuk Sesi Pengguna Aplikasi PASARIN (Login Page) (PSR-2).
 * Menyediakan gerbang autentikasi terpusat untuk seluruh peran operasional pasar:
 * pedagang kios, warteg, dapur sosial, sentra maggot, armada kurir, pengelola pasar, dan administrator.
 */

"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
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
        <Link href="/" className="inline-flex min-h-11 items-center rounded-lg" aria-label="Dasbor publik Pasarin"><PasarinLogo size="sm" showSubtitle={false} /></Link>
        <Link href="/" className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-brand hover:bg-brand-soft">
          <ArrowLeft size={16} aria-hidden /><span className="sm:hidden">Ringkasan</span><span className="hidden sm:inline">Dasbor publik</span>
        </Link>
      </header>
      <main className="market-shell grid gap-4 pb-8 sm:gap-5 lg:min-h-[min(42rem,calc(100svh-9rem))] lg:grid-cols-[1fr_1.05fr]">
        <section aria-labelledby="login-heading" className="flex min-w-0 items-center rounded-3xl border border-line bg-surface px-5 py-7 sm:px-10 sm:py-10 lg:order-2 lg:px-12">
          <div className="mx-auto w-full max-w-[390px]">
            <h1 id="login-heading" className="font-serif text-[clamp(2rem,4vw,3rem)] leading-tight tracking-tight">Masuk ke ruang kerja</h1>
            <p className="mt-3 text-sm leading-6 text-ink-muted">Gunakan akun Pasarin Anda. Stok, pesanan, dan tugas pengantaran akan tampil sesuai peran akun.</p>
            <form onSubmit={handleSubmit} className="mt-7 space-y-5" aria-busy={isSubmitting} aria-describedby={errorMessage ? "login-error" : undefined}>
              <div>
                <label htmlFor="identifier" className="mb-1.5 block text-sm font-semibold">Nama pengguna atau email</label>
                <input id="identifier" name="username" type="text" autoComplete="username" autoCapitalize="none" spellCheck={false}
                  value={identifier} onChange={(event) => setIdentifier(event.target.value)}
                  required className="market-input" aria-invalid={Boolean(errorMessage)} aria-describedby={errorMessage ? "login-error" : undefined} disabled={isSubmitting || isAuthenticated} />
              </div>
              <div>
                <label htmlFor="password" className="mb-1.5 block text-sm font-semibold">Kata sandi</label>
                <div className="relative">
                  <input id="password" name="password" type={showPassword ? "text" : "password"}
                    autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)}
                    required className="market-input pr-14" aria-invalid={Boolean(errorMessage)} aria-describedby={errorMessage ? "login-error" : undefined} disabled={isSubmitting || isAuthenticated} />
                  <button type="button" onClick={() => setShowPassword((shown) => !shown)}
                    aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"} aria-pressed={showPassword}
                    className="absolute inset-y-0 right-1 grid min-h-11 w-11 place-items-center rounded-md text-ink-soft hover:bg-brand-soft">
                    {showPassword ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
                  </button>
                </div>
              </div>
              {errorMessage && <p id="login-error" role="alert" className="rounded-lg border border-danger/30 bg-danger-soft p-3 text-sm font-medium text-danger">{errorMessage}</p>}
              <button type="submit" disabled={isSubmitting || isLoading || isAuthenticated}
                className="flex min-h-12 w-full items-center justify-center rounded-lg bg-brand px-4 text-sm font-semibold text-cream hover:bg-brand-strong disabled:cursor-wait disabled:opacity-60">
                {isAuthenticated ? "Membuka ruang kerja…" : isSubmitting ? "Memeriksa akun…" : isLoading ? "Memeriksa sesi…" : "Masuk ke ruang kerja"}
              </button>
            </form>
          </div>
        </section>
        <aside aria-label="Alur kerja pasar" className="flex min-w-0 flex-col justify-between rounded-3xl bg-brand-deep px-5 py-7 text-cream sm:px-10 sm:py-10 lg:order-1 lg:p-12">
          <div>
            <p className="max-w-[14ch] font-serif text-[clamp(2rem,4.5vw,4rem)] leading-[1.08] tracking-tight">Dari catatan pasokan ke serah terima.</p>
            <p className="mt-5 max-w-[39ch] text-sm leading-6 text-sage-soft">Satu alur kerja untuk pedagang, penerima bahan pangan, dan kurir di Pasarin.</p>
          </div>
          <dl className="mt-8 grid border-t border-rail">
            {timeline.map(([time, label]) => (
              <div key={time} className="grid gap-1 border-b border-rail py-4 sm:grid-cols-[6rem_minmax(0,1fr)] sm:items-baseline sm:gap-4">
                <dt className="text-sm font-semibold text-sage-soft">{time}</dt>
                <dd className="text-sm leading-6 text-cream">{label}</dd>
              </div>
            ))}
          </dl>
        </aside>
      </main>
      <footer className="market-shell py-3 text-xs text-ink-muted">PASARIN</footer>
    </div>
  );
}
