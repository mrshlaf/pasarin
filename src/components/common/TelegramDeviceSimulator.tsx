"use client";

import { useState } from "react";
import { useMarketSimulation, TelegramNotification } from "@/lib/simulationStore";
import {
  Send,
  X,
  Bot,
  Check,
  AlertTriangle,
  ArrowRight,
  Sparkles,
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

  if (!isOpen) return null;

  const filteredNotifs = notifications.filter((n) => {
    if (chatFilter === "all") return true;
    return n.role === chatFilter;
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      {/* Smartphone frame container */}
      <div className="bg-slate-900 rounded-[2.5rem] p-3 shadow-2xl max-w-sm w-full border-4 border-slate-700 relative">
        {/* Phone Speaker Notch */}
        <div className="w-24 h-4 bg-slate-800 rounded-full mx-auto mb-2 flex items-center justify-center">
          <div className="w-3 h-1 bg-slate-700 rounded-full" />
        </div>

        {/* Screen Content */}
        <div className="bg-slate-100 rounded-4xl overflow-hidden flex flex-col h-[580px]">
          {/* Telegram Header */}
          <div className="bg-[#24A1DE] text-white p-3.5 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold leading-tight">@pasarin_bot</h4>
                <p className="text-[10px] text-white/80">Autonomous Market Agent</p>
              </div>
            </div>

            <button
              onClick={onClose}
              type="button"
              className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Filter Pills */}
          <div className="bg-white border-b border-slate-200 px-3 py-1.5 flex gap-1.5 text-[11px]">
            <button
              onClick={() => setChatFilter("all")}
              type="button"
              className={`px-2.5 py-0.5 rounded-full font-semibold transition ${
                chatFilter === "all" ? "bg-[#24A1DE] text-white" : "text-slate-500 hover:bg-slate-100"
              }`}
            >
              Semua
            </button>
            <button
              onClick={() => setChatFilter("vendor")}
              type="button"
              className={`px-2.5 py-0.5 rounded-full font-semibold transition ${
                chatFilter === "vendor" ? "bg-[#24A1DE] text-white" : "text-slate-500 hover:bg-slate-100"
              }`}
            >
              Kios Pedagang
            </button>
            <button
              onClick={() => setChatFilter("warteg")}
              type="button"
              className={`px-2.5 py-0.5 rounded-full font-semibold transition ${
                chatFilter === "warteg" ? "bg-[#24A1DE] text-white" : "text-slate-500 hover:bg-slate-100"
              }`}
            >
              Grup Warteg
            </button>
          </div>

          {/* Messages list */}
          <div className="flex-1 p-3 overflow-y-auto space-y-2.5 bg-[#7595AA]/20">
            {filteredNotifs.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                Belum ada pesan siaran bot untuk filter ini.
              </div>
            ) : (
              filteredNotifs.map((n) => (
                <div key={n.id} className="bg-white rounded-2xl p-3 shadow-2xs text-xs space-y-2">
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span className="font-semibold text-[#24A1DE]">{n.recipient}</span>
                    <span>{n.timestamp}</span>
                  </div>

                  <p className="text-slate-800 leading-snug">{n.message}</p>

                  {/* Inline 1-tap buttons if action required */}
                  {n.actionRequired && n.offerId && (
                    <div className="pt-2 border-t border-slate-100 flex gap-2">
                      <button
                        onClick={() => approveOfferByVendor(n.offerId!)}
                        type="button"
                        className="flex-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center justify-center gap-1 transition shadow-2xs cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Setuju Jual
                      </button>
                      <button
                        onClick={() => rejectOfferByVendor(n.offerId!)}
                        type="button"
                        className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] transition cursor-pointer"
                      >
                        Lewati
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Simulated Input Field */}
          <div className="bg-white p-2.5 border-t border-slate-200 flex items-center gap-2">
            <input
              type="text"
              readOnly
              placeholder="Perintah bot otomatis (read-only)..."
              className="flex-1 bg-slate-100 text-slate-400 rounded-full px-3 py-1.5 text-xs outline-hidden"
            />
            <div className="w-8 h-8 rounded-full bg-[#24A1DE] text-white flex items-center justify-center shrink-0">
              <Send className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
