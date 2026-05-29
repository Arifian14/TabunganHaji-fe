"use client";

import { useRouter } from "next/navigation";

type NavItem = {
  href: string;
  icon: string;
  label: string;
};

const mainNavItems: NavItem[] = [
  { href: "/dashboard", icon: "dashboard", label: "Beranda" },
  { href: "/nasabah", icon: "person_search", label: "Manajemen Nasabah" },
  { href: "/transaksi", icon: "receipt_long", label: "Riwayat Transaksi" },
  { href: "/laporan", icon: "assessment", label: "Laporan" },
];

const utilityNavItems: NavItem[] = [
  { href: "/keamanan", icon: "security", label: "Keamanan" },
  { href: "/bantuan", icon: "support_agent", label: "Bantuan" },
];

type AppSidebarProps = {
  activeHref?: string;
};

export default function AppSidebar({ activeHref = "/dashboard" }: AppSidebarProps) {
  const router = useRouter();

  function handleLogout() {
    if (typeof window !== "undefined") localStorage.removeItem("bsi_token");
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
          <p className="text-xs text-neutral-500 font-medium">Internal Staff</p>
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

      {/* Utility Nav + Logout */}
      <div className="px-2 mt-auto space-y-1 pt-4 border-t border-neutral-200">
        {utilityNavItems.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 text-neutral-700 px-4 py-3 mx-2 rounded-lg hover:bg-primary/10 text-sm font-medium transition-colors group"
          >
            <span className="material-symbols-outlined text-[20px] text-neutral-500 group-hover:text-primary transition-colors">
              {item.icon}
            </span>
            <span>{item.label}</span>
          </a>
        ))}
        <div className="px-4 py-3">
          <button
            onClick={handleLogout}
            className="w-full flex justify-center items-center gap-2 border border-red-300 text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            Log Out
          </button>
        </div>
      </div>
    </aside>
  );
}
