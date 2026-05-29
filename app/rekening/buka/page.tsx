"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import AppHeader from "@/components/layout/app-header";
import AppSidebar from "@/components/layout/app-sidebar";

type Nasabah = { id: string; nik: string; nama: string; email: string; nomorHp: string };
type ApiError = { error: string; message: string };

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api/v1";

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("bsi_token") ?? "";
}
function authHeaders() {
  const t = getToken();
  return { "Content-Type": "application/json", ...(t ? { Authorization: `Bearer ${t}` } : {}) };
}
function inisial(nama: string) {
  return (nama ?? "?").split(" ").map((w) => w[0] ?? "").join("").substring(0, 2).toUpperCase();
}

const AVATAR_COLORS = [
  "bg-primary/10 text-primary", "bg-blue-100 text-blue-700", "bg-amber-100 text-amber-700",
  "bg-purple-100 text-purple-700", "bg-teal-100 text-teal-700", "bg-rose-100 text-rose-700",
];
function avatarColor(nama: string) {
  const h = [...nama].reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function BukaRekeningInner() {
  const router = useRouter();
  const params = useSearchParams();
  const preselectId = params.get("nasabah");

  const [eligible, setEligible] = useState<Nasabah[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Nasabah | null>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ nomorRekening: string; nasabahId: string } | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  /* fetch eligible nasabah (no rekening) + handle preselect */
  useEffect(() => {
    const h = authHeaders();
    Promise.allSettled([
      fetch(`${API_URL}/nasabah`, { headers: h }).then((r) => r.json()),
      fetch(`${API_URL}/tabungan-haji`, { headers: h }).then((r) => r.json()),
    ]).then(([nRes, tRes]) => {
      const nList: Nasabah[] = nRes.status === "fulfilled" ? (Array.isArray(nRes.value) ? nRes.value : nRes.value.data ?? []) : [];
      const tList: { nasabahId: string }[] = tRes.status === "fulfilled" ? (Array.isArray(tRes.value) ? tRes.value : tRes.value.data ?? []) : [];
      const hasRek = new Set(tList.map((t) => t.nasabahId));
      const elig = nList.filter((n) => !hasRek.has(n.id));
      setEligible(elig);

      if (preselectId) {
        const pre = nList.find((n) => n.id === preselectId);
        if (pre) {
          setSelected(pre);
          if (hasRek.has(pre.id)) setError("Nasabah ini sudah memiliki rekening tabungan haji.");
        }
      }
    }).finally(() => setLoading(false));
  }, [preselectId]);

  /* close dropdown on outside click */
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return eligible.slice(0, 50);
    return eligible.filter((n) => n.nama.toLowerCase().includes(q) || n.nik.includes(q) || n.email.toLowerCase().includes(q)).slice(0, 50);
  }, [eligible, query]);

  async function handleSubmit() {
    if (!selected) { setError("Silakan pilih nasabah terlebih dahulu."); return; }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/tabungan-haji`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ nasabahId: selected.id }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((d as ApiError).message ?? "Gagal membuka rekening.");
        setSubmitting(false);
        return;
      }
      setSuccess({ nomorRekening: d.nomorRekening, nasabahId: selected.id });
      setTimeout(() => router.push(`/nasabah/${selected.id}`), 1400);
    } catch {
      setError("Tidak dapat terhubung ke server. Periksa koneksi Anda.");
      setSubmitting(false);
    }
  }

  /* success state */
  if (success) {
    return (
      <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-10 flex flex-col items-center text-center">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
          <span className="material-symbols-outlined text-[32px] text-primary" style={{ fontVariationSettings: '"FILL" 1' }}>check_circle</span>
        </div>
        <h2 className="text-lg font-semibold text-neutral-800">Rekening Berhasil Dibuka</h2>
        <p className="text-sm text-neutral-500 mt-1">
          Nomor Rekening: <span className="font-mono font-semibold text-neutral-800">{success.nomorRekening}</span>
        </p>
        <p className="text-xs text-neutral-400 mt-2">Mengalihkan ke halaman detail nasabah...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
      {/* Card header */}
      <div className="px-6 py-5 border-b border-neutral-100 flex items-center gap-3 bg-neutral-50/50">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: '"FILL" 1' }}>account_balance_wallet</span>
        </div>
        <h3 className="text-lg font-semibold text-neutral-800">Pilih Nasabah</h3>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mx-6 mt-6 flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-100">
          <span className="material-symbols-outlined text-red-600 shrink-0 text-xl" style={{ fontVariationSettings: '"FILL" 1' }}>error</span>
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="p-6 md:p-8 space-y-5">
        {/* Nasabah selector */}
        {!selected && (
          <div ref={boxRef} className="relative">
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              Nasabah <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-[20px]">search</span>
              <input
                type="text"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
                onFocus={() => setOpen(true)}
                placeholder="Cari & pilih nasabah..."
                disabled={loading}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-neutral-300 rounded-lg text-sm focus:border-primary focus:ring-1 focus:ring-primary transition-colors outline-none disabled:bg-neutral-50"
              />
            </div>
            {open && (
              <div className="absolute z-20 mt-1 w-full bg-white border border-neutral-200 rounded-lg shadow-lg max-h-72 overflow-y-auto">
                {loading ? (
                  <div className="px-4 py-6 text-center text-sm text-neutral-400">Memuat nasabah...</div>
                ) : filtered.length === 0 ? (
                  <div className="px-4 py-6 text-center text-sm text-neutral-400">
                    {eligible.length === 0 ? "Semua nasabah sudah memiliki rekening." : "Tidak ada nasabah cocok."}
                  </div>
                ) : (
                  filtered.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => { setSelected(n); setOpen(false); setQuery(""); setError(null); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-neutral-50 transition-colors text-left"
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${avatarColor(n.nama)}`}>{inisial(n.nama)}</div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-neutral-900 truncate">{n.nama}</div>
                        <div className="text-xs text-neutral-500 truncate">{n.nik} · {n.email}</div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
            <p className="mt-1.5 text-xs text-neutral-500">Hanya menampilkan nasabah yang belum memiliki rekening.</p>
          </div>
        )}

        {/* Selected customer box */}
        {selected && (
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">Nasabah Terpilih</label>
            <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4 flex items-center gap-4 relative overflow-hidden">
              <div className="absolute inset-y-0 left-0 w-1 bg-primary" />
              <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg shrink-0 ${avatarColor(selected.nama)}`}>{inisial(selected.nama)}</div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] uppercase tracking-wide text-neutral-400 font-medium">Nama Lengkap</p>
                <p className="text-sm font-semibold text-neutral-900 truncate">{selected.nama}</p>
                <p className="text-xs text-neutral-500 truncate">{selected.email} · {selected.nik}</p>
              </div>
              <button
                type="button"
                onClick={() => { setSelected(null); setError(null); }}
                className="text-sm font-medium text-primary hover:text-primary/80 px-3 py-1.5 rounded bg-primary/5 hover:bg-primary/10 transition-colors shrink-0"
              >
                Ganti
              </button>
            </div>
          </div>
        )}

        {/* Detail Rekening Baru */}
        <div className="bg-teal-50/50 border border-teal-100 rounded-lg p-5">
          <h4 className="text-sm font-semibold text-neutral-800 flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-primary text-[20px]">savings</span>
            Detail Rekening Baru
          </h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-600">Saldo Awal</span>
              <span className="text-sm font-semibold text-neutral-900">Rp 0</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-600">Status</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-green-100 text-green-800 tracking-wide">AKTIF</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-600">Nomor Rekening</span>
              <span className="text-sm text-neutral-500 italic">Dibuat otomatis (diawali 60)</span>
            </div>
          </div>
        </div>

        {/* Info note */}
        <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <span className="material-symbols-outlined text-blue-600 shrink-0 text-[20px]">info</span>
          <p className="text-sm text-blue-800">Setiap nasabah hanya dapat memiliki 1 rekening tabungan haji aktif.</p>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 bg-neutral-50 border-t border-neutral-100 flex items-center justify-end gap-3">
        <Link
          href={selected ? `/nasabah/${selected.id}` : "/nasabah"}
          className="px-5 py-2.5 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
        >
          Batal
        </Link>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || !selected}
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-primary hover:opacity-90 rounded-lg transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <>
              <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
              Memproses...
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-[18px]">add</span>
              Buka Rekening
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default function BukaRekeningPage() {
  return (
    <div className="bg-neutral-50 text-neutral-900 antialiased flex min-h-screen">
      <AppSidebar activeHref="/nasabah" />
      <div className="flex-1 flex flex-col min-w-0">
        <AppHeader />
        <main className="flex-1 p-6 lg:p-8 bg-neutral-50">
          <div className="max-w-3xl mx-auto">
            {/* Breadcrumb + title */}
            <div className="mb-6">
              <nav className="flex text-sm text-neutral-500 mb-3">
                <ol className="inline-flex items-center gap-1">
                  <li><Link href="/nasabah" className="hover:text-primary transition-colors">Manajemen Nasabah</Link></li>
                  <li className="flex items-center">
                    <span className="material-symbols-outlined text-sm mx-1">chevron_right</span>
                    <span className="text-neutral-900 font-medium">Buka Rekening</span>
                  </li>
                </ol>
              </nav>
              <div className="flex items-center gap-4">
                <Link href="/nasabah" className="w-10 h-10 rounded-full bg-white border border-neutral-200 flex items-center justify-center text-neutral-700 hover:bg-neutral-50 transition-colors shadow-sm">
                  <span className="material-symbols-outlined">arrow_back</span>
                </Link>
                <div>
                  <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Buka Rekening Tabungan Haji</h1>
                  <p className="text-neutral-500 text-sm mt-0.5">Inisiasi pembukaan rekening tabungan haji baru untuk nasabah terdaftar.</p>
                </div>
              </div>
            </div>

            <Suspense fallback={<div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-12 text-center text-neutral-400">Memuat...</div>}>
              <BukaRekeningInner />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
}
