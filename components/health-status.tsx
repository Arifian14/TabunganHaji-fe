"use client"
import { useEffect, useState } from "react";
import { checkHealth } from "@/lib/api";

type Status = "checking" | "online" | "offline";

export function HealthStatus(){
    const [status, setStatus] = useState<Status>("checking");
  const [lastChecked, setLastChecked] = useState<string | null>(null);

  async function cek() {
    setStatus("checking");
    const ok = await checkHealth();
    setStatus(ok ? "online" : "offline");
    setLastChecked(new Date().toLocaleTimeString("id-ID"));
  }
  useEffect(() => { cek(); }, []);

  const cfg = {
    checking: { label: "Mengecek API...", dot: "bg-gray-400", text: "text-gray-600" },
    online: { label: "API Online", dot: "bg-emerald-500", text: "text-emerald-700" },
    offline: { label: "API Offline", dot: "bg-red-500", text: "text-red-700" },
  }[status];

  return (
    <div className="flex items-center gap-3 rounded-lg border p-3">
      <span className={`h-2.5 w-2.5 rounded-full ${cfg.dot}`} />
      <span className={`text-sm font-medium ${cfg.text}`}>{cfg.label}</span>
      {lastChecked && <span className="text-xs text-gray-400">· dicek {lastChecked}</span>}
      <button onClick={cek} disabled={status === "checking"} className="ml-auto rounded-md border px-3 py-1 text-sm hover:bg-gray-50 disabled:opacity-50">Cek ulang</button>
    </div>
  );
}