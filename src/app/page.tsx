"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/authContext";
import {
  SimulationProvider,
  useMarketSimulation,
} from "@/lib/simulationStore";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { RoleWorkflowStepper } from "@/components/common/RoleWorkflowStepper";
import { MarketClockController } from "@/components/common/MarketClockController";
import { TelegramDeviceSimulator } from "@/components/common/TelegramDeviceSimulator";

import { VendorDashboard } from "@/components/roles/VendorDashboard";
import { WartegDashboard } from "@/components/roles/WartegDashboard";
import { SocialKitchenDashboard } from "@/components/roles/SocialKitchenDashboard";
import { MaggotDashboard } from "@/components/roles/MaggotDashboard";
import { LogisticsDashboard } from "@/components/roles/LogisticsDashboard";
import { ManagerDashboard } from "@/components/roles/ManagerDashboard";
import { AdminDashboard } from "@/components/roles/AdminDashboard";

function DashboardContent() {
  const { role, setRole } = useMarketSimulation();
  const { user } = useAuth();
  const [showTelegram, setShowTelegram] = useState(false);

  // Kunci otomatis peran workspace sesuai peran akun pengguna yang login (Role Isolation)
  useEffect(() => {
    if (user && user.role !== "admin" && user.role !== "manager" && role !== user.role) {
      setRole(user.role);
    }
  }, [user, role, setRole]);

  return (
    <div className="min-h-screen bg-[#FBFDFD] flex flex-col font-sans text-slate-800 antialiased selection:bg-[#2A5C5F] selection:text-white">
      {/* App Header with Live Telemetry */}
      <AppHeader onOpenTelegram={() => setShowTelegram(true)} />

      {/* Main Workspace: Sidebar + Role Dashboard */}
      <div className="flex-1 flex flex-col lg:flex-row w-full max-w-[1720px] mx-auto">
        <AppSidebar />

        <main className="flex-1 p-4 lg:p-6 overflow-y-auto">
          {/* Universal Workflow Stepper */}
          <RoleWorkflowStepper />

          {/* Interactive Circadian Market Clock Controller */}
          <MarketClockController />

          {/* Role-Specific Isolated Workspaces */}
          {role === "vendor" && <VendorDashboard />}
          {role === "warteg" && <WartegDashboard />}
          {role === "social_kitchen" && <SocialKitchenDashboard />}
          {role === "maggot" && <MaggotDashboard />}
          {role === "logistics" && <LogisticsDashboard />}
          {role === "manager" && <ManagerDashboard />}
          {role === "admin" && <AdminDashboard />}
        </main>
      </div>

      {/* Telegram Smartphone Simulator Modal */}
      <TelegramDeviceSimulator
        isOpen={showTelegram}
        onClose={() => setShowTelegram(false)}
      />
    </div>
  );
}
export default function Home() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  // Proteksi rute: arahkan pengguna yang belum terautentikasi ke halaman /login (PSR-40)
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FBFDFD] flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-3 border-[#2A5C5F] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-slate-600">Memuat sesi pengguna PASARIN...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#FBFDFD] flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-slate-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-slate-600">Mengarahkan ke halaman login...</p>
        </div>
      </div>
    );
  }

  return (
    <SimulationProvider>
      <DashboardContent />
    </SimulationProvider>
  );
}
