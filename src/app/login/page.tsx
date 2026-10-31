"use client";

/**
 * Halaman Masuk / Login Sistem PASARIN (PSR-40).
 * Menyediakan antarmuka otentikasi akun terintegrasi Supabase Auth,
 * kredensial dummy ringkas (username & password sama), serta penegakan isolasi peran (Role Isolation).
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/authContext";
import { AppRole } from "@/lib/simulationStore";
import { PasarinLogo } from "@/components/common/PasarinLogo";
import {
  Lock,
  User,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, signInWithEmailPassword } = useAuth();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState<AppRole>("vendor");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Jika sesi telah aktif, alihkan secara otomatis ke halaman dashboard utama
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/");
    }
  }, [isAuthenticated, isLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const result = await signInWithEmailPassword(identifier, password, selectedRole);
      if (result.success) {
        router.push("/");
      } else {
        setErrorMessage(result.error || "Gagal masuk: periksa kembali username/email dan kata sandi Anda.");
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Terjadi kesalahan koneksi autentikasi.");
    } finally {
      setIsSubmitting(false);
    }
  };


  if (isLoading || isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#FBFDFD] flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-3 border-[#2A5C5F] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-slate-600">Memeriksa sesi otentikasi PASARIN...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBFDFD] flex flex-col justify-between p-4 sm:p-6 lg:p-8 font-sans text-slate-800 antialiased selection:bg-[#2A5C5F] selection:text-white">
      {/* Top Header */}
      <header className="max-w-md w-full mx-auto flex items-center justify-center pb-2">
        <PasarinLogo size="md" />
      </header>

      {/* Main Single Centered Form Card */}
      <main className="max-w-md w-full mx-auto my-6 bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-xs">
        <div className="mb-5 text-center">
          <h1 className="text-lg font-black text-slate-900 tracking-tight">
            Masuk ke Sistem PASARIN
          </h1>
          <p className="text-xs text-slate-600 mt-1 font-medium">
            Gunakan username dan kata sandi untuk mengakses dashboard los pasar.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs font-semibold flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Username atau Email
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Masukkan username atau email"
                required
                className="w-full text-xs font-medium pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:border-[#2A5C5F] focus:ring-1 focus:ring-[#2A5C5F] outline-none transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Kata Sandi
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full text-xs font-medium pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:border-[#2A5C5F] focus:ring-1 focus:ring-[#2A5C5F] outline-none transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Peran Akun Operasional
            </label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as AppRole)}
              className="w-full text-xs font-bold py-2.5 px-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:border-[#2A5C5F] outline-none transition"
            >
              <option value="vendor">Pedagang Lapak (30 Kios Kramat Jati)</option>
              <option value="warteg">Pembeli Warteg (Surplus Terdiskon 50-70%)</option>
              <option value="social_kitchen">Dapur Sosial & Panti Asuhan (Tier 2)</option>
              <option value="maggot">Sentra Maggot BSF & Biokonversi (Tier 3)</option>
              <option value="logistics">Kurir Logistik & Armada Pengangkut</option>
              <option value="manager">Pengelola Pasar (Perumda Pasar Jaya)</option>
              <option value="admin">Administrator Sistem (Full Supervisory)</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 px-4 mt-1 rounded-xl bg-[#2A5C5F] hover:bg-[#1E4345] text-white text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow-xs disabled:opacity-50"
          >
            <span>{isSubmitting ? "Memproses Autentikasi..." : "Masuk ke Sistem PASARIN"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>


        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-center gap-2 text-[10px] text-slate-500 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>Role Isolation Aktif: Akun dikunci sesuai wewenang peran.</span>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-md w-full mx-auto pt-4 border-t border-slate-200 text-center text-[11px] text-slate-500 font-medium">
        Departemen Teknik Elektro · Fakultas Teknik Universitas Indonesia 2026
      </footer>
    </div>
  );
}
