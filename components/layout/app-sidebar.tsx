"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { nasabahApi } from "@/lib/nasabah";

type NavItem = {
  href: string;
  icon: string;
  label: string;
};

const mainNavItems: NavItem[] = [
  { href: "/dashboard", icon: "dashboard",                label: "Beranda" },
  { href: "/rekening",  icon: "account_balance_wallet",   label: "Rekening" },
  { href: "/transaksi", icon: "receipt_long",             label: "Riwayat Transaksi" },
  { href: "/profil",    icon: "person",                   label: "Profil" },
];

type AppSidebarProps = {
  activeHref?: string;
};

export default function AppSidebar({ activeHref = "/dashboard" }: AppSidebarProps) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    await nasabahApi.logout();
    router.push("/login");
  }

  return (
    <aside className="sticky top-0 h-screen z-30 hidden lg:flex flex-col py-4 bg-neutral-50 border-r border-neutral-200 w-64 shrink-0">

      {/* Brand */}
      <div className="px-6 mb-8 flex items-center gap-3">
        <div className="h-10 w-10 bg-primary rounded-lg flex items-center justify-center text-white font-bold text-base shadow-sm">
          BSI
        </div>
        <div>
          <h1 className="text-[17px] font-black text-primary leading-tight">BSI Haji Savings</h1>
          <p className="text-xs text-neutral-500 font-medium">Tabungan Haji Nasabah</p>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 space-y-1">
        {mainNavItems.map((item) => {
          const isActive =
            activeHref === item.href ||
            (item.href !== "/dashboard" && activeHref.startsWith(item.href));
          return (
            <a
              key={item.href}
              href={item.href}
              className={
                isActive
                  ? "flex items-center gap-3 bg-primary text-white rounded-lg px-4 py-3 mx-2 text-sm font-semibold shadow-sm transition-colors"
                  : "flex items-center gap-3 text-neutral-700 px-4 py-3 mx-2 rounded-lg hover:bg-primary/10 text-sm font-medium transition-colors group"
              }
            >
              <span
                className={`material-symbols-outlined text-[20px] ${isActive ? "" : "text-neutral-500 group-hover:text-primary transition-colors"}`}
                style={isActive ? { fontVariationSettings: '"FILL" 1' } : undefined}
              >
                {item.icon}
              </span>
              <span>{item.label}</span>
            </a>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-4 py-3 mt-auto border-t border-neutral-200 pt-4">
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full flex justify-center items-center gap-2 border border-red-300 text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <span className={`material-symbols-outlined text-[18px] ${loggingOut ? "animate-spin" : ""}`}>
            {loggingOut ? "progress_activity" : "logout"}
          </span>
          {loggingOut ? "Keluar..." : "Log Out"}
        </button>
      </div>
    </aside>
  );
}
