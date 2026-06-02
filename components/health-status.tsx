"use client";

import { useEffect, useState } from "react";
import { checkHealth } from "@/lib/api";

type Status = "checking" | "online" | "offline";

const REFRESH_MS = 30_000;

export function HealthStatus({ variant = "compact" }: { variant?: "compact" | "card" }) {
  const [status, setStatus] = useState<Status>("checking");
  const [lastChecked, setLastChecked] = useState<string | null>(null);

  async function check() {
    setStatus("checking");
    const ok = await checkHealth();
    setStatus(ok ? "online" : "offline");
    setLastChecked(new Date().toLocaleTimeString("id-ID"));
  }

  useEffect(() => {
    check();
    const id = setInterval(check, REFRESH_MS);
    const onFocus = () => check();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  const cfg = {
    checking: { dot: "bg-neutral-400",  text: "text-neutral-600", bg: "bg-neutral-100", label: "Mengecek..." },
    online:   { dot: "bg-emerald-500",  text: "text-emerald-700", bg: "bg-emerald-50",  label: "API Online" },
    offline:  { dot: "bg-red-500",      text: "text-red-700",     bg: "bg-red-50",      label: "API Offline" },
  }[status];

  /* ── COMPACT (untuk header) ── */
  if (variant === "compact") {
    return (
      <button
        type="button"
        onClick={check}
        title={lastChecked ? `${cfg.label} · dicek ${lastChecked} · klik untuk refresh` : cfg.label}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full ${cfg.bg} hover:opacity-80 transition-opacity text-xs font-medium`}
      >
        <span className="relative flex h-2 w-2 shrink-0">
          {status === "online" && (
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
          )}
          <span className={`relative inline-flex rounded-full h-2 w-2 ${cfg.dot}`} />
        </span>
        <span className={`${cfg.text} hidden sm:inline`}>{cfg.label}</span>
      </button>
    );
  }

  /* ── CARD (untuk halaman bantuan/keamanan/dashboard) ── */
  return (
    <div className="flex items-center gap-3 rounded-lg border border-neutral-200 p-3 bg-white">
      <span className="relative flex h-2.5 w-2.5 shrink-0">
        {status === "online" && (
          <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
        )}
        <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${cfg.dot}`} />
      </span>
      <span className={`text-sm font-medium ${cfg.text}`}>{cfg.label}</span>
      {lastChecked && (
        <span className="text-xs text-neutral-400">· dicek {lastChecked}</span>
      )}
      <button
        type="button"
        onClick={check}
        disabled={status === "checking"}
        className="ml-auto rounded-md border border-neutral-200 px-3 py-1 text-sm hover:bg-neutral-50 disabled:opacity-50 transition-colors"
      >
        Cek ulang
      </button>
    </div>
  );
}
