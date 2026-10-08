"use client";

import { useState } from "react";
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
  const { role } = useMarketSimulation();
  const [showTelegram, setShowTelegram] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800 antialiased selection:bg-orange-500 selection:text-white">
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
  return (
    <SimulationProvider>
      <DashboardContent />
    </SimulationProvider>
  );
}
