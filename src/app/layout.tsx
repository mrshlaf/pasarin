/**
 * Tata Letak Akar Aplikasi PASARIN (Root Layout).
 * Mengonfigurasi metadata SEO, font tipografi Geist, pembungkus AuthProvider,
 * dan penyedia state simulasi pasar (SimulationProvider).
 */

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/authContext";
import { SimulationProvider } from "@/lib/simulationStore";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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

/**
 * Komponen pembungkus tata letak utama aplikasi.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <AuthProvider>
          <SimulationProvider>{children}</SimulationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
