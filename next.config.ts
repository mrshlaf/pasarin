// Konfigurasi Next.js PASARIN.

import type { NextConfig } from "next";

// Konfigurasi Next.js aplikasi PASARIN.
const nextConfig: NextConfig = {
  typescript: {
    // Pada Windows Node v24, spawn child process tsc menghasilkan spawn UNKNOWN karena proteksi shell CVE-2024-27980.
    // Pemeriksaan tipe statis dijalankan terpisah via 'npm run typecheck' (tsc --noEmit) yang telah tervalidasi 0 error.
    // Hanya dilewati di Windows; build Linux (Vercel, CI) tetap gagal bila ada galat tipe.
    ignoreBuildErrors: process.platform === "win32",
  },
  experimental: {
    cpus: 2,
  },
};

export default nextConfig;
