"use client";

import { useAuth } from "@/lib/authContext";
import { useMarketSimulation, type AppRole } from "@/lib/simulationStore";

export const ROLE_LABELS: Record<AppRole, string> = {
  vendor: "Pedagang",
  warteg: "Warteg",
  social_kitchen: "Dapur sosial",
  maggot: "Sentra maggot",
  logistics: "Kurir",
  manager: "Pengelola pasar",
  admin: "Administrator",
};

/** Lets supervisors preview authorized workspaces without changing their authenticated role. */
export function AppSidebar() {
  const { role, setRole } = useMarketSimulation();
  const { user, isRoleAccessible } = useAuth();
  if (user?.role !== "admin" && user?.role !== "manager") return null;
  const roles = (Object.keys(ROLE_LABELS) as AppRole[]).filter(isRoleAccessible);

  return (
    <nav aria-label="Ruang kerja" className="w-full shrink-0 rounded-xl border border-[#d5ded2] bg-[#fffef8] p-3 lg:w-52 lg:self-start">
      <label htmlFor="workspace-role" className="block pb-2 text-sm font-semibold text-[#36594f] lg:hidden">Ruang kerja</label>
      <select id="workspace-role" value={role} onChange={(event) => setRole(event.target.value as AppRole)}
        className="market-input lg:hidden">
        {roles.map((item) => <option key={item} value={item}>{ROLE_LABELS[item]}</option>)}
      </select>
      <p className="hidden px-2 pb-3 text-xs font-bold uppercase tracking-[0.1em] text-[#465c54] lg:block">Ruang kerja</p>
      <div className="hidden gap-1 lg:grid">
        {roles.map((item) => (
          <button key={item} type="button" aria-pressed={role === item} onClick={() => setRole(item)}
            className={`min-h-11 rounded-lg px-3 text-left text-sm font-semibold ${role === item
              ? "bg-[#214d43] text-white" : "text-[#214d43] hover:bg-[#e8efe5]"}`}>
            {ROLE_LABELS[item]}
          </button>
        ))}
      </div>
    </nav>
  );
}
