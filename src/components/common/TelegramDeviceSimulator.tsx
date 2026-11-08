"use client";

import { useState } from "react";
import { useMarketSimulation } from "@/lib/simulationStore";
import {
  Send,
  X,
  Bot,
  Check,
  ExternalLink,
} from "lucide-react";

interface TelegramDeviceSimulatorProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TelegramDeviceSimulator({
  isOpen,
  onClose,
}: TelegramDeviceSimulatorProps) {
  const { notifications, approveOfferByVendor, rejectOfferByVendor } = useMarketSimulation();
  const [chatFilter, setChatFilter] = useState<"all" | "vendor" | "warteg">("all");
  const [inputCommand, setInputCommand] = useState("");
  const [chatFeed, setChatFeed] = useState<Array<{ id: string; sender: "user" | "bot"; text: string; time: string }>>([
    {
      id: "init_1",
      sender: "bot",
      text: "👋 Halo! Bot resmi PASARIN (@agent_pasarin_bot) aktif terhubung ke peladen.\nKetik /start, /status, /surplus, atau /login <user> <pass> untuk bertransaksi.",
      time: "04:30 WIB",
    },
  ]);
  const [isSending, setIsSending] = useState(false);

  const handleSendCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCommand.trim() || isSending) return;
    const cmd = inputCommand.trim();
    setInputCommand("");

    const nowStr = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB";
    setChatFeed((prev) => [...prev, { id: `u_${Date.now()}`, sender: "user", text: cmd, time: nowStr }]);
    setIsSending(true);

    try {
      const res = await fetch("/api/telegram/webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Telegram-Bot-Api-Secret-Token": "pasarin-telegram-webhook-secret-2026",
        },
        body: JSON.stringify({
          update_id: Date.now(),
          message: {
            message_id: Date.now(),
            chat: { id: 6126029646, type: "private" },
            date: Math.floor(Date.now() / 1000),
            text: cmd,
          },
        }),
      });
      const json = await res.json();
      // Polling / immediate response simulation
      const botReply =
        cmd === "/start"
          ? "👋 Selamat datang di Bot Resmi PASARIN! (@agent_pasarin_bot)\nKetik /login <user> <pass> untuk masuk akun resmi atau /role untuk memilih peran."
          : cmd.startsWith("/login")
          ? json.actionTaken === "login_success"
            ? "✅ Login Berhasil! Akun Anda terotentikasi resmi."
            : "❌ Akses Ditolak: Kredensial tidak valid."
          : cmd === "/logout"
          ? "🚪 Anda berhasil logout dari sesi Telegram."
          : cmd === "/surplus"
          ? "🥦 Katalog surplus aktif berhasil diproses sesuai peran Anda."
          : `✅ Perintah '${cmd}' diterima oleh server (@agent_pasarin_bot).`;

      setChatFeed((prev) => [...prev, { id: `b_${Date.now()}`, sender: "bot", text: botReply, time: nowStr }]);
    } catch {
      setChatFeed((prev) => [
        ...prev,
        { id: `b_${Date.now()}`, sender: "bot", text: `✅ Perintah '${cmd}' terkirim ke gateway bot.`, time: nowStr },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      {/* Smartphone frame container */}
      <div className="bg-[#0F171A] rounded-[2.5rem] p-3 shadow-2xl max-w-sm w-full border-4 border-slate-700/80 relative">
        {/* Notch */}
        <div className="w-24 h-3.5 bg-slate-800 rounded-full mx-auto mb-2 flex items-center justify-center">
          <div className="w-3 h-1 bg-slate-700 rounded-full" />
        </div>

        {/* Screen */}
        <div className="bg-slate-100 rounded-4xl overflow-hidden flex flex-col h-[580px]">
          {/* Header */}
          <div className="bg-[#2A5C5F] text-white p-3.5 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center text-white">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold leading-tight">@agent_pasarin_bot</h4>
                <p className="text-[10px] text-emerald-300 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>Live Connected</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <a
                href="https://t.me/agent_pasarin_bot"
                target="_blank"
                rel="noopener noreferrer"
                className="px-2 py-1 bg-white/20 hover:bg-white/30 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition"
                title="Buka bot asli di aplikasi Telegram HP"
              >
                <span>Buka di HP</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
              <button
                onClick={onClose}
                type="button"
                className="w-7 h-7 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          {/* Filter Pills */}
          <div className="bg-white border-b border-slate-200 px-3 py-1.5 flex gap-1.5 text-[11px]">
            <button
              onClick={() => setChatFilter("all")}
              type="button"
              className={`px-2.5 py-0.5 rounded-full font-bold transition cursor-pointer ${
                chatFilter === "all" ? "bg-[#2A5C5F] text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Semua
            </button>
            <button
              onClick={() => setChatFilter("vendor")}
              type="button"
              className={`px-2.5 py-0.5 rounded-full font-bold transition cursor-pointer ${
                chatFilter === "vendor" ? "bg-[#2A5C5F] text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Kios Pedagang
            </button>
            <button
              onClick={() => setChatFilter("warteg")}
              type="button"
              className={`px-2.5 py-0.5 rounded-full font-bold transition cursor-pointer ${
                chatFilter === "warteg" ? "bg-[#2A5C5F] text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Grup Warteg
            </button>
          </div>

          {/* Messages list */}
          <div className="flex-1 p-3 overflow-y-auto space-y-2.5 bg-[#E8EEF0]/60">
            {filteredNotifs.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs font-medium">
                Belum ada pesan siaran untuk filter ini.
              </div>
            ) : (
              filteredNotifs.map((n) => (
                <div key={n.id} className="bg-white rounded-2xl p-3 shadow-2xs text-xs space-y-2 border border-slate-200">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-bold text-[#075985]">{n.recipient}</span>
                    <span className="text-slate-500 font-medium">{n.timestamp}</span>
                  </div>

                  <p className="text-slate-800 leading-snug font-medium">{n.message}</p>

                  {/* Inline 1-tap buttons */}
                  {n.actionRequired && n.offerId && (
                    <div className="pt-2 border-t border-slate-100 flex gap-2">
                      <button
                        onClick={() => approveOfferByVendor(n.offerId!)}
                        type="button"
                        className="flex-1 py-1.5 rounded-lg bg-[#0369A1] hover:bg-[#075985] text-white font-bold text-[11px] flex items-center justify-center gap-1 transition cursor-pointer shadow-xs"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Setuju Jual
                      </button>
                      <button
                        onClick={() => rejectOfferByVendor(n.offerId!)}
                        type="button"
                        className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-[11px] border border-slate-200 transition cursor-pointer"
                      >
                        Lewati
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Interactive Input Form */}
          <form onSubmit={handleSendCommand} className="bg-white p-2 border-t border-slate-200 flex items-center gap-2">
            <input
              type="text"
              value={inputCommand}
              onChange={(e) => setInputCommand(e.target.value)}
              placeholder="Ketik /start, /status, /surplus, /login..."
              className="flex-1 bg-slate-100 text-slate-800 rounded-full px-3 py-1.5 text-xs outline-none font-medium focus:ring-1 focus:ring-[#2A5C5F]"
            />
            <button
              type="submit"
              disabled={isSending}
              className="w-8 h-8 rounded-full bg-[#0088cc] hover:bg-[#0077b5] text-white flex items-center justify-center shrink-0 cursor-pointer shadow-xs transition"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
      </div>
    </div>
  );
}
