"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { HealthStatus } from "@/components/health-status";
import { clearToken, getCurrentUser, getUserInfo } from "@/lib/auth";

function getInisial(nama: string): string {
  return (nama ?? "?").split(" ").map((w) => w[0] ?? "").join("").substring(0, 2).toUpperCase();
}

export default function AppHeader() {
  const router = useRouter();
  const [nama, setNama] = useState<string>("");
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    const info = getUserInfo();
    if (info?.nama) {
      setNama(info.nama);
      setEmail(info.email);
      return;
    }
    /* Fallback: kalau cache hilang, baca email dari JWT */
    const jwt = getCurrentUser();
    if (jwt?.email) {
      setEmail(jwt.email);
      setNama(jwt.email.split("@")[0] ?? jwt.email);
    }
  }, []);

  function handleLogout() {
    clearToken();
    router.push("/login");
  }

  const inisial = nama ? getInisial(nama) : "?";
  const namaPendek = nama ? nama.split(" ")[0] : "";

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between px-6 h-16 w-full bg-white border-b border-neutral-200 shadow-sm">
      {/* Left: Brand (mobile) + Health Status */}
      <div className="flex-1 flex items-center gap-4 min-w-0">
        <h1 className="lg:hidden text-xl font-bold text-primary truncate">BSI Haji Savings</h1>
        <HealthStatus variant="compact" />
      </div>

      {/* Right: User + Logout */}
      <div className="flex items-center gap-3">
        {/* User info (desktop only) */}
        {nama && (
          <div className="hidden md:flex flex-col items-end leading-tight">
            <span className="text-sm font-semibold text-neutral-800 truncate max-w-[160px]">{namaPendek}</span>
            <span className="text-xs text-neutral-500 truncate max-w-[160px]">{email}</span>
          </div>
        )}

        {/* Avatar */}
        <div
          className="h-9 w-9 bg-primary text-on-primary rounded-full flex items-center justify-center font-bold text-sm shadow-sm shrink-0"
          title={nama || "Akun saya"}
        >
          {inisial}
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-1 text-sm text-neutral-500 hover:text-red-600 transition-colors px-2 py-1.5 rounded-lg hover:bg-red-50"
          title="Keluar"
        >
          <span className="material-symbols-outlined text-[18px]">logout</span>
          <span className="font-medium hidden sm:inline">Keluar</span>
        </button>
      </div>
    </header>
  );
}
