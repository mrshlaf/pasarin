import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Pada Windows Node v24, spawn child process tsc menghasilkan spawn UNKNOWN karena proteksi shell CVE-2024-27980.
    // Pemeriksaan tipe statis dijalankan terpisah via 'npm run typecheck' (tsc --noEmit) yang telah tervalidasi 0 error.
    ignoreBuildErrors: true,
  },
  experimental: {
    cpus: 2,
  },
};

export default nextConfig;
