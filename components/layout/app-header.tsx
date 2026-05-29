"use client";

import { useRouter } from "next/navigation";

export default function AppHeader() {
  const router = useRouter();

  function handleLogout() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("bsi_token");
    }
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between px-6 h-16 w-full bg-white border-b border-neutral-200 shadow-sm">
      {/* Left: Search */}
      <div className="flex-1 flex items-center">
        <div className="relative w-full max-w-md hidden md:block">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-[20px]">
            search
          </span>
          <input
            className="w-full pl-10 pr-4 py-2 bg-neutral-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary transition-shadow outline-none placeholder-neutral-400"
            placeholder="Cari data nasabah, transaksi..."
            type="text"
          />
        </div>
        <h1 className="lg:hidden text-xl font-bold text-primary">BSI Haji Savings</h1>
      </div>

      {/* Right: Actions + User */}
      <div className="flex items-center gap-1">
        <button className="p-2 text-primary hover:bg-neutral-50 rounded-full transition-colors relative">
          <span className="material-symbols-outlined text-[20px]">notifications</span>
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </button>
        <button className="p-2 text-primary hover:bg-neutral-50 rounded-full transition-colors">
          <span className="material-symbols-outlined text-[20px]">help</span>
        </button>
        <button className="p-2 text-primary hover:bg-neutral-50 rounded-full transition-colors">
          <span className="material-symbols-outlined text-[20px]">settings</span>
        </button>
        <div className="ml-3 h-8 w-8 bg-primary text-on-primary rounded-full flex items-center justify-center font-bold text-sm cursor-pointer shadow-sm">
          AH
        </div>
        <button
          onClick={handleLogout}
          className="ml-2 hidden sm:flex items-center gap-1 text-sm text-neutral-500 hover:text-red-600 transition-colors px-2 py-1.5 rounded-lg hover:bg-red-50"
        >
          <span className="material-symbols-outlined text-[18px]">logout</span>
          <span className="font-medium">Keluar</span>
        </button>
      </div>
    </header>
  );
}
