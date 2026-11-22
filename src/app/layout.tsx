// Tata Letak Akar Aplikasi PASARIN (Root Layout).
// Mengonfigurasi metadata SEO, font Geist (teks) dan Newsreader (judul), pembungkus AuthProvider,
// dan penyedia state simulasi pasar (SimulationProvider).

import type { Metadata } from "next";
import { Geist, Geist_Mono, Newsreader } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/authContext";
import { SimulationProvider } from "@/lib/simulationStore";

// Font teks utama, diekspos sebagai variabel CSS agar bisa dipakai token tema Tailwind.
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// Font monospace untuk angka dan kode, juga lewat variabel CSS.
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Font judul (serif). Dimuat sebagai webfont agar tampil sama di semua perangkat, tidak bergantung pada Georgia milik sistem.
const display = Newsreader({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

// Judul, deskripsi, dan ikon default yang diwarisi semua halaman.
export const metadata: Metadata = {
  title: "PASARIN · Proactive Market Surplus Redistribution",
  description: "Multi-Agent System berbasis Agentic AI untuk Penyelamatan & Redistribusi Surplus Sayur-Buah Pasar Tradisional",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/apple-icon.png",
  },
};

// Komponen pembungkus tata letak utama aplikasi.
// SimulationProvider ada di dalam AuthProvider karena state pasar bergantung pada akun yang masuk.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} ${display.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <AuthProvider>
          <SimulationProvider>{children}</SimulationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
