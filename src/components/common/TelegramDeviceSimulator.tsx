"use client";

import { useState } from "react";
import { useMarketSimulation } from "@/lib/simulationStore";
import {
  Send,
  X,
  Bot,
  Check,
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
                <h4 className="text-xs font-bold leading-tight">@pasarin_bot</h4>
                <p className="text-[10px] text-slate-200">Autonomous Market Agent</p>
              </div>
            </div>

            <button
              onClick={onClose}
              type="button"
              className="w-7 h-7 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Filter Pills */}
          <div className="bg-white border-b border-slate-200 px-3 py-1.5 flex gap-1.5 text-[11px]">
            <button
              onClick={() => setChatFilter("all")}
              type="button"
              className={`px-2.5 py-0.5 rounded-full font-semibold transition cursor-pointer ${
                chatFilter === "all" ? "bg-[#2A5C5F] text-white" : "text-slate-500 hover:bg-slate-100"
              }`}
            >
              Semua
            </button>
            <button
              onClick={() => setChatFilter("vendor")}
              type="button"
              className={`px-2.5 py-0.5 rounded-full font-semibold transition cursor-pointer ${
                chatFilter === "vendor" ? "bg-[#2A5C5F] text-white" : "text-slate-500 hover:bg-slate-100"
              }`}
            >
              Kios Pedagang
            </button>
            <button
              onClick={() => setChatFilter("warteg")}
              type="button"
              className={`px-2.5 py-0.5 rounded-full font-semibold transition cursor-pointer ${
                chatFilter === "warteg" ? "bg-[#2A5C5F] text-white" : "text-slate-500 hover:bg-slate-100"
              }`}
            >
              Grup Warteg
            </button>
          </div>

          {/* Messages list */}
          <div className="flex-1 p-3 overflow-y-auto space-y-2.5 bg-[#E8EEF0]/60">
            {filteredNotifs.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                Belum ada pesan siaran untuk filter ini.
              </div>
            ) : (
              filteredNotifs.map((n) => (
                <div key={n.id} className="bg-white rounded-2xl p-3 shadow-2xs text-xs space-y-2 border border-slate-200/50">
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span className="font-semibold text-[#2A5C5F]">{n.recipient}</span>
                    <span>{n.timestamp}</span>
                  </div>

                  <p className="text-slate-700 leading-snug">{n.message}</p>

                  {/* Inline 1-tap buttons */}
                  {n.actionRequired && n.offerId && (
                    <div className="pt-2 border-t border-slate-100 flex gap-2">
                      <button
                        onClick={() => approveOfferByVendor(n.offerId!)}
                        type="button"
                        className="flex-1 py-1.5 rounded-lg bg-[#2A5C5F] hover:bg-[#224C4E] text-white font-bold text-[11px] flex items-center justify-center gap-1 transition cursor-pointer shadow-2xs"
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
              placeholder="Sistem gateway terotomatisasi..."
              className="flex-1 bg-slate-100 text-slate-400 rounded-full px-3 py-1.5 text-xs outline-hidden"
            />
            <div className="w-8 h-8 rounded-full bg-[#2A5C5F] text-white flex items-center justify-center shrink-0">
              <Send className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
