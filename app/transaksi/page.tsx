"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import AppHeader from "@/components/layout/app-header";
import AppSidebar from "@/components/layout/app-sidebar";
import AuthGuard from "@/components/auth-guard";

/* ─── Types ─── */
type Jenis = "SETOR" | "TARIK";

type Transaksi = {
  id: string;
  jenis: Jenis;
  nominal: number | string;
  saldoSesudah: number | string;
  waktu: string;
  tabungan?: {
    id?: string;
    nomorRekening?: string;
    nasabahId?: string;
  };
};

type Nasabah = { id: string; nama: string };

type FilterJenis = "SEMUA" | Jenis;

const PAGE_SIZE = 10;
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api/v1";

/* ─── Helpers ─── */
function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("bsi_token") ?? "";
}
function authHeaders(): HeadersInit {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}
function rupiah(n: number | string) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(Number(n));
}
function tanggalJam(s: string) {
  return new Date(s).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
function inisial(nama: string) {
  return (nama ?? "?").split(" ").map((w) => w[0] ?? "").join("").substring(0, 2).toUpperCase();
}
function formatRek(no?: string) {
  return no?.replace(/(\d{4})(\d{4})(\d+)/, "$1 $2 $3") ?? "—";
}

/* ─── Page ─── */
function RiwayatTransaksiInner() {
  const params = useSearchParams();
  const tabunganFilter = params.get("tabungan");

  const [rows, setRows] = useState<Transaksi[]>([]);
  const [namaById, setNamaById] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [jenis, setJenis] = useState<FilterJenis>("SEMUA");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const h = authHeaders();
    Promise.allSettled([
      fetch(`${API_URL}/transaksi`, { headers: h }).then((r) => r.json()),
      fetch(`${API_URL}/nasabah`, { headers: h }).then((r) => r.json()),
    ])
      .then(([txRes, naRes]) => {
        const txList: Transaksi[] =
          txRes.status === "fulfilled"
            ? Array.isArray(txRes.value)
              ? txRes.value
              : txRes.value.data ?? []
            : [];

        const naList: Nasabah[] =
          naRes.status === "fulfilled"
            ? Array.isArray(naRes.value)
              ? naRes.value
              : naRes.value.data ?? []
            : [];

        const map = new Map<string, string>();
        for (const n of naList) map.set(n.id, n.nama);
        setNamaById(map);
        setRows(txList);
      })
      .finally(() => setLoading(false));
  }, []);

  /* derive */
  const totals = useMemo(() => {
    let setor = 0;
    let tarik = 0;
    let countSetor = 0;
    let countTarik = 0;
    for (const t of rows) {
      const n = Number(t.nominal);
      if (t.jenis === "SETOR") {
        setor += n;
        countSetor += 1;
      } else {
        tarik += n;
        countTarik += 1;
      }
    }
    return { setor, tarik, countSetor, countTarik };
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    const from = dateFrom ? new Date(dateFrom + "T00:00:00").getTime() : null;
    const to = dateTo ? new Date(dateTo + "T23:59:59").getTime() : null;

    return rows.filter((t) => {
      if (tabunganFilter && t.tabungan?.id !== tabunganFilter) return false;
      if (jenis !== "SEMUA" && t.jenis !== jenis) return false;

      const tm = new Date(t.waktu).getTime();
      if (from !== null && tm < from) return false;
      if (to !== null && tm > to) return false;

      if (!q) return true;
      const nama = namaById.get(t.tabungan?.nasabahId ?? "") ?? "";
      const rek = t.tabungan?.nomorRekening ?? "";
      return (
        nama.toLowerCase().includes(q) ||
        rek.includes(q) ||
        t.id.toLowerCase().includes(q)
      );
    });
  }, [rows, search, jenis, dateFrom, dateTo, namaById, tabunganFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const from = filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, filtered.length);

  function resetPage<T>(fn: (v: T) => void) {
    return (v: T) => {
      fn(v);
      setPage(1);
    };
  }
  function resetFilters() {
    setSearch("");
    setJenis("SEMUA");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900 tracking-tight">Riwayat Transaksi</h2>
          <p className="text-neutral-500 mt-1 text-sm">
            {tabunganFilter
              ? "Menampilkan transaksi untuk satu rekening."
              : "Daftar seluruh transaksi setor dan tarik tabungan haji."}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/transaksi/setor"
            className="flex items-center gap-2 bg-primary hover:opacity-90 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">add_card</span>
            Setor
          </Link>
          <Link
            href="/transaksi/tarik"
            className="flex items-center gap-2 border border-primary text-primary hover:bg-primary/5 px-4 py-2 rounded-lg font-medium text-sm transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">payments</span>
            Tarik
          </Link>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard
          label="Total Transaksi"
          value={loading ? "—" : rows.length.toLocaleString("id-ID")}
          icon="receipt_long"
          tone="primary"
        />
        <SummaryCard
          label={`Total Setor (${totals.countSetor})`}
          value={loading ? "—" : rupiah(totals.setor)}
          icon="trending_up"
          tone="success"
        />
        <SummaryCard
          label={`Total Tarik (${totals.countTarik})`}
          value={loading ? "—" : rupiah(totals.tarik)}
          icon="trending_down"
          tone="warning"
        />
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-xl shadow-sm border border-neutral-100 p-4 flex flex-col lg:flex-row lg:items-end gap-3">
        <div className="flex-1 min-w-0">
          <label className="block text-xs font-medium text-neutral-500 mb-1">Cari</label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-[20px]">search</span>
            <input
              type="text"
              value={search}
              onChange={(e) => resetPage(setSearch)(e.target.value)}
              placeholder="Nama nasabah, no. rekening, atau ID transaksi..."
              className="w-full pl-9 pr-3 py-2 bg-white border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary shadow-sm outline-none"
            />
          </div>
        </div>
        <div className="min-w-[150px]">
          <label className="block text-xs font-medium text-neutral-500 mb-1">Jenis</label>
          <div className="relative">
            <select
              value={jenis}
              onChange={(e) => resetPage(setJenis)(e.target.value as FilterJenis)}
              className="w-full appearance-none bg-white border border-neutral-300 rounded-lg py-2 pl-3 pr-8 text-sm focus:ring-2 focus:ring-primary focus:border-primary shadow-sm cursor-pointer text-neutral-700 outline-none"
            >
              <option value="SEMUA">Semua</option>
              <option value="SETOR">Setor</option>
              <option value="TARIK">Tarik</option>
            </select>
            <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500 text-[20px]">
              arrow_drop_down
            </span>
          </div>
        </div>
        <div className="min-w-[150px]">
          <label className="block text-xs font-medium text-neutral-500 mb-1">Dari</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => resetPage(setDateFrom)(e.target.value)}
            className="w-full bg-white border border-neutral-300 rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-primary focus:border-primary shadow-sm outline-none"
          />
        </div>
        <div className="min-w-[150px]">
          <label className="block text-xs font-medium text-neutral-500 mb-1">Sampai</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => resetPage(setDateTo)(e.target.value)}
            className="w-full bg-white border border-neutral-300 rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-primary focus:border-primary shadow-sm outline-none"
          />
        </div>
        <button
          onClick={resetFilters}
          className="text-sm font-medium text-neutral-500 hover:text-neutral-800 px-3 py-2 rounded-lg hover:bg-neutral-50 transition-colors"
        >
          Reset
        </button>
      </div>

      {/* Table card */}
      <div className="bg-white rounded-xl shadow-sm border border-neutral-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-neutral-50/50 border-b border-neutral-100 text-neutral-500 uppercase text-xs font-semibold tracking-wider">
              <tr>
                <th className="px-6 py-4">Waktu</th>
                <th className="px-6 py-4">Nasabah</th>
                <th className="px-6 py-4">No. Rekening</th>
                <th className="px-6 py-4">Jenis</th>
                <th className="px-6 py-4 text-right">Nominal</th>
                <th className="px-6 py-4 text-right">Saldo Akhir</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-neutral-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-neutral-400">
                    <span className="material-symbols-outlined text-3xl mb-2 block animate-spin">progress_activity</span>
                    Memuat transaksi...
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-neutral-400">
                    <span className="material-symbols-outlined text-3xl mb-2 block">receipt_long</span>
                    {search || jenis !== "SEMUA" || dateFrom || dateTo
                      ? "Tidak ada transaksi yang cocok dengan filter."
                      : "Belum ada transaksi tercatat."}
                  </td>
                </tr>
              ) : (
                paginated.map((t) => {
                  const setor = t.jenis === "SETOR";
                  const nama = namaById.get(t.tabungan?.nasabahId ?? "") ?? "Nasabah";
                  return (
                    <tr key={t.id} className="hover:bg-neutral-50/50 transition-colors">
                      <td className="px-6 py-4 text-neutral-600">{tanggalJam(t.waktu)}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                            {inisial(nama)}
                          </div>
                          <span className="font-medium text-neutral-900">{nama}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-neutral-600">
                        {formatRek(t.tabungan?.nomorRekening)}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                            setor
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          <span className="material-symbols-outlined text-[14px]">
                            {setor ? "arrow_downward" : "arrow_upward"}
                          </span>
                          {t.jenis}
                        </span>
                      </td>
                      <td
                        className={`px-6 py-4 text-right font-semibold ${
                          setor ? "text-emerald-600" : "text-red-600"
                        }`}
                      >
                        {setor ? "+ " : "- "}
                        {rupiah(t.nominal)}
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-neutral-900">
                        {rupiah(t.saldoSesudah)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && filtered.length > 0 && (
          <div className="bg-neutral-50/80 px-6 py-4 border-t border-neutral-100 flex items-center justify-between">
            <span className="text-sm text-neutral-500">
              Menampilkan <span className="font-medium text-neutral-900">{from}–{to}</span>{" "}
              dari <span className="font-medium text-neutral-900">{filtered.length}</span> transaksi
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-md border border-neutral-200 bg-white text-neutral-500 hover:text-neutral-800 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">chevron_left</span>
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let p = i + 1;
                if (totalPages > 5) {
                  if (page <= 3) p = i + 1;
                  else if (page >= totalPages - 2) p = totalPages - 4 + i;
                  else p = page - 2 + i;
                }
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`min-w-[32px] px-2 py-1.5 rounded-md border text-sm font-medium transition-colors ${
                      p === page
                        ? "bg-primary text-white border-primary"
                        : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-md border border-neutral-200 bg-white text-neutral-500 hover:text-neutral-800 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">chevron_right</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Summary Card ─── */
function SummaryCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon: string;
  tone: "primary" | "success" | "warning";
}) {
  const toneStyles = {
    primary: { bg: "bg-teal-50", text: "text-primary" },
    success: { bg: "bg-emerald-50", text: "text-emerald-600" },
    warning: { bg: "bg-amber-50", text: "text-amber-600" },
  }[tone];
  return (
    <div className="bg-white p-5 rounded-xl border border-neutral-100 shadow-sm flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-neutral-500 mb-1">{label}</p>
        <h3 className="text-2xl font-bold text-neutral-900 leading-tight">{value}</h3>
      </div>
      <div className={`p-3 ${toneStyles.bg} ${toneStyles.text} rounded-lg shrink-0`}>
        <span
          className="material-symbols-outlined"
          style={{ fontVariationSettings: '"FILL" 1' }}
        >
          {icon}
        </span>
      </div>
    </div>
  );
}

/* ─── Page Wrapper ─── */
export default function RiwayatTransaksiPage() {
  return (
    <AuthGuard>
    <div className="bg-neutral-50 text-neutral-900 antialiased flex min-h-screen">
      <AppSidebar activeHref="/transaksi" />
      <div className="flex-1 flex flex-col min-w-0">
        <AppHeader />
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-neutral-50">
          <Suspense
            fallback={
              <div className="max-w-7xl mx-auto bg-white rounded-xl border border-neutral-100 shadow-sm p-12 text-center text-neutral-400">
                <span className="material-symbols-outlined text-3xl mb-2 block animate-spin">progress_activity</span>
                Memuat...
              </div>
            }
          >
            <RiwayatTransaksiInner />
          </Suspense>
        </main>
      </div>
    </div>
    </AuthGuard>
  );
}
