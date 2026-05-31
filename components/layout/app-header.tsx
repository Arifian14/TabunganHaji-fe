"use client";

import { useRouter } from "next/navigation";
import { HealthStatus } from "@/components/health-status";
import { clearToken } from "@/lib/auth";

export default function AppHeader() {
  const router = useRouter();

  function handleLogout() {
    clearToken();
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between px-6 h-16 w-full bg-white border-b border-neutral-200 shadow-sm">
      {/* Left: Brand (mobile) + Health Status */}
      <div className="flex-1 flex items-center gap-4 min-w-0">
        <h1 className="lg:hidden text-xl font-bold text-primary truncate">BSI Haji Savings</h1>
        <HealthStatus variant="compact" />
      </div>

      {/* Right: User + Logout */}
      <div className="flex items-center gap-2">
        <div
          className="h-8 w-8 bg-primary text-on-primary rounded-full flex items-center justify-center font-bold text-sm shadow-sm"
          title="Akun saya"
        >
          AH
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-1 text-sm text-neutral-500 hover:text-red-600 transition-colors px-2 py-1.5 rounded-lg hover:bg-red-50"
        >
          <span className="material-symbols-outlined text-[18px]">logout</span>
          <span className="font-medium hidden sm:inline">Keluar</span>
        </button>
      </div>
    </header>
  );
}
