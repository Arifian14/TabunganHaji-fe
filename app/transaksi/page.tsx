"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AppHeader from "@/components/layout/app-header";
import AppSidebar from "@/components/layout/app-sidebar";
import AuthGuard from "@/components/auth-guard";
import { authHeaders, getCurrentUser } from "@/lib/auth";

/* ─── Types ─── */
type Jenis = "SETOR" | "TARIK";
type Status = "AKTIF" | "SUSPEND" | "TUTUP";

type Tabungan = {
  id: string;
  nomorRekening: string;
  saldo: number | string;
  status: Status;
  dibukaAt?: string;
  nasabahId: string;
};

type Nasabah = {
  id: string;
  nik: string;
  nama: string;
};

type Transaksi = {
  id: string;
  jenis: Jenis;
  nominal: number | string;
  saldoSebelum?: number | string;
  saldoSesudah: number | string;
  waktu: string;
  referensi?: string;
  metode?: string;
};

type FilterJenis = "SEMUA" | Jenis;

const PAGE_SIZE = 10;
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api/v1";

/* ─── Helpers ─── */
function rupiah(n: number | string) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(Number(n));
}
function tanggal(s?: string) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
}
function tanggalJam(s: string) {
  return new Date(s).toLocaleString("id-ID", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}
function formatRek(no?: string) {
  return no?.replace(/(\d{4})(\d{4})(\d+)/, "$1 $2 $3") ?? "—";
}
function downloadCsv(filename: string, rows: (string | number)[][]) {
  const escape = (v: string | number) => {
    const s = String(v ?? "");
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const csv = "﻿" + rows.map((r) => r.map(escape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ─── Content ─── */
function RiwayatTransaksiContent() {
  const [me, setMe] = useState<Nasabah | null>(null);
  const [rekening, setRekening] = useState<Tabungan | null>(null);
  const [rows, setRows] = useState<Transaksi[]>([]);
  const [loading, setLoading] = useState(true);

  const [jenis, setJenis] = useState<FilterJenis>("SEMUA");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);

  /* fetch nasabah + rekening + transaksi */
  useEffect(() => {
    const u = getCurrentUser();
    if (!u) {
      setLoading(false);
      return;
    }
    const h = authHeaders();

    (async () => {
      try {
        const [naRes, rekRes] = await Promise.allSettled([
          fetch(`${API_URL}/nasabah/${u.sub}`, { headers: h }).then((r) => r.json()),
          fetch(`${API_URL}/tabungan-haji/nasabah/${u.sub}`, { headers: h }).then((r) => r.json()),
        ]);

        if (naRes.status === "fulfilled" && naRes.value && !naRes.value.error) {
          setMe(naRes.value);
        }

        let rek: Tabungan | null = null;
        if (rekRes.status === "fulfilled") {
          const list: Tabungan[] = Array.isArray(rekRes.value) ? rekRes.value : (rekRes.value.data ?? []);
          rek = list[0] ?? null;
          setRekening(rek);
        }

        if (rek) {
          const txRes = await fetch(`${API_URL}/tabungan-haji/${rek.id}/transaksi`, { headers: h });
          if (txRes.ok) {
            const d = await txRes.json();
            const list: Transaksi[] = Array.isArray(d) ? d : (d.data ?? []);
            setRows(list);
          }
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* derive */
  const totals = useMemo(() => {
    let setor = 0, tarik = 0, countSetor = 0, countTarik = 0;
    for (const t of rows) {
      const n = Number(t.nominal);
      if (t.jenis === "SETOR") { setor += n; countSetor += 1; }
      else { tarik += n; countTarik += 1; }
    }
    return { setor, tarik, countSetor, countTarik };
  }, [rows]);

  const filtered = useMemo(() => {
    const from = dateFrom ? new Date(dateFrom + "T00:00:00").getTime() : null;
    const to   = dateTo   ? new Date(dateTo   + "T23:59:59").getTime() : null;
    return rows.filter((t) => {
      if (jenis !== "SEMUA" && t.jenis !== jenis) return false;
      const tm = new Date(t.waktu).getTime();
      if (from !== null && tm < from) return false;
      if (to   !== null && tm > to)   return false;
      return true;
    });
  }, [rows, jenis, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const from = filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to   = Math.min(page * PAGE_SIZE, filtered.length);

  function resetFilters() {
    setJenis("SEMUA");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  }

  /* download CSV (mutasi) */
  function handleDownloadCsv() {
    if (!rekening || filtered.length === 0) return;
    const period = (dateFrom || dateTo) ? `_${dateFrom || "awal"}_to_${dateTo || "akhir"}` : "";
    const rows: (string | number)[][] = [
      ["Mutasi Rekening Tabungan Haji"],
      [`Nama Nasabah`, me?.nama ?? "-"],
      [`Nomor Rekening`, formatRek(rekening.nomorRekening)],
      [`Saldo Saat Ini`, Number(rekening.saldo)],
      [`Status`, rekening.status],
      [`Dicetak`, new Date().toLocaleString("id-ID")],
      [],
      ["Waktu", "Jenis", "Nominal", "Saldo Akhir", "Referensi", "Metode"],
      ...filtered.map((t) => [
        tanggalJam(t.waktu),
        t.jenis,
        Number(t.nominal),
        Number(t.saldoSesudah),
        t.referensi ?? "",
        t.metode ?? "",
      ]),
    ];
    downloadCsv(`mutasi-${rekening.nomorRekening}${period}.csv`, rows);
  }

  function handlePrint() {
    if (typeof window !== "undefined") window.print();
  }

  return (
    <div className="bg-neutral-50 text-neutral-900 antialiased flex min-h-screen">
      <style>{`
        @media print {
          aside, header, .no-print { display: none !important; }
          main { padding: 0 !important; }
          body, .bg-neutral-50 { background: white !important; }
          .print-card { box-shadow: none !important; border-color: #e5e5e5 !important; }
        }
      `}</style>
      <div className="no-print contents">
        <AppSidebar activeHref="/transaksi" />
      </div>
      <div className="flex-1 flex flex-col min-w-0">
        <div className="no-print contents">
          <AppHeader />
        </div>

        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-neutral-50">
          <div className="max-w-7xl mx-auto space-y-6">

            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold text-neutral-900 tracking-tight">Riwayat Transaksi</h2>
                <p className="text-neutral-500 mt-1 text-sm">
                  Mutasi setor dan tarik untuk rekening tabungan haji Anda saja.
                </p>
              </div>
              {rekening && (
                <div className="flex gap-2 no-print">
                  <button
                    onClick={handleDownloadCsv}
                    disabled={loading || filtered.length === 0}
                    className="flex items-center gap-2 border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50 px-4 py-2 rounded-lg font-medium text-sm transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <span className="material-symbols-outlined text-[18px]">download</span>
                    Download CSV
                  </button>
                  <button
                    onClick={handlePrint}
                    disabled={loading || filtered.length === 0}
                    className="flex items-center gap-2 bg-primary hover:opacity-90 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <span className="material-symbols-outlined text-[18px]">print</span>
                    Cetak Mutasi
                  </button>
                </div>
              )}
            </div>

            {/* Print header (only visible when printing) */}
            <div className="hidden print:block">
              <div className="border-b-2 border-primary pb-3 mb-4">
                <h1 className="text-xl font-bold text-primary">BSI Haji Savings — Mutasi Rekening</h1>
                {rekening && (
                  <>
                    <p className="text-sm text-neutral-700 mt-1">
                      <strong>Nasabah:</strong> {me?.nama ?? "—"} ·{" "}
                      <strong>No. Rekening:</strong> <span className="font-mono">{formatRek(rekening.nomorRekening)}</span>
                    </p>
                    <p className="text-sm text-neutral-700">
                      <strong>Saldo:</strong> {rupiah(rekening.saldo)} · <strong>Status:</strong> {rekening.status}
                    </p>
                  </>
                )}
                <p className="text-sm text-neutral-600">
                  Dicetak {new Date().toLocaleString("id-ID")}
                  {(dateFrom || dateTo) && ` · Periode: ${tanggal(dateFrom)} – ${tanggal(dateTo)}`}
                </p>
              </div>
            </div>

            {loading ? (
              <div className="bg-white rounded-xl border border-neutral-100 shadow-sm p-12 text-center text-neutral-400">
                <span className="material-symbols-outlined text-3xl mb-2 block animate-spin">progress_activity</span>
                Memuat riwayat transaksi...
              </div>
            ) : !rekening ? (
              <div className="bg-white rounded-xl border border-dashed border-neutral-300 shadow-sm p-12 flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-[32px] text-neutral-400">receipt_long</span>
                </div>
                <h2 className="text-lg font-semibold text-neutral-800">Belum Ada Rekening</h2>
                <p className="text-sm text-neutral-500 mt-1 max-w-md">
                  Anda perlu memiliki rekening tabungan haji dulu untuk melihat riwayat transaksi.
                </p>
                <Link
                  href="/rekening/buka"
                  className="mt-5 px-5 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90 transition-colors flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">add</span>
                  Buka Rekening Sekarang
                </Link>
              </div>
            ) : (
              <>
                {/* Summary cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 print-card">
                  <SummaryCard label="Transaksi Saya" value={rows.length.toLocaleString("id-ID")} icon="receipt_long" tone="primary" />
                  <SummaryCard label={`Setoran Saya (${totals.countSetor})`} value={rupiah(totals.setor)} icon="trending_up" tone="success" />
                  <SummaryCard label={`Penarikan Saya (${totals.countTarik})`} value={rupiah(totals.tarik)} icon="trending_down" tone="warning" />
                </div>

                {/* Filter bar */}
                <div className="bg-white rounded-xl shadow-sm border border-neutral-100 p-4 flex flex-col lg:flex-row lg:items-end gap-3 no-print">
                  <div className="min-w-[150px]">
                    <label className="block text-xs font-medium text-neutral-500 mb-1">Jenis</label>
                    <div className="relative">
                      <select
                        value={jenis}
                        onChange={(e) => { setJenis(e.target.value as FilterJenis); setPage(1); }}
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
                    <label className="block text-xs font-medium text-neutral-500 mb-1">Dari Tanggal</label>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                      className="w-full bg-white border border-neutral-300 rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-primary focus:border-primary shadow-sm outline-none"
                    />
                  </div>
                  <div className="min-w-[150px]">
                    <label className="block text-xs font-medium text-neutral-500 mb-1">Sampai Tanggal</label>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                      className="w-full bg-white border border-neutral-300 rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-primary focus:border-primary shadow-sm outline-none"
                    />
                  </div>
                  <button
                    onClick={resetFilters}
                    className="text-sm font-medium text-neutral-500 hover:text-neutral-800 px-3 py-2 rounded-lg hover:bg-neutral-50 transition-colors lg:ml-auto"
                  >
                    Reset Filter
                  </button>
                </div>

                {/* Table */}
                <div className="bg-white rounded-xl shadow-sm border border-neutral-100 overflow-hidden print-card">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="bg-neutral-50/50 border-b border-neutral-100 text-neutral-500 uppercase text-xs font-semibold tracking-wider">
                        <tr>
                          <th className="px-6 py-4">Waktu</th>
                          <th className="px-6 py-4">Jenis</th>
                          <th className="px-6 py-4">Referensi</th>
                          <th className="px-6 py-4 text-right">Nominal</th>
                          <th className="px-6 py-4 text-right">Saldo Akhir</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100 text-neutral-700">
                        {paginated.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-6 py-12 text-center text-neutral-400">
                              <span className="material-symbols-outlined text-3xl mb-2 block">receipt_long</span>
                              {jenis !== "SEMUA" || dateFrom || dateTo
                                ? "Tidak ada transaksi yang cocok dengan filter."
                                : "Belum ada transaksi pada rekening Anda."}
                            </td>
                          </tr>
                        ) : (
                          paginated.map((t) => {
                            const setor = t.jenis === "SETOR";
                            return (
                              <tr key={t.id} className="hover:bg-neutral-50/50 transition-colors">
                                <td className="px-6 py-4 text-neutral-600">{tanggalJam(t.waktu)}</td>
                                <td className="px-6 py-4">
                                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${setor ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>
                                    <span className="material-symbols-outlined text-[14px]">{setor ? "arrow_downward" : "arrow_upward"}</span>
                                    {t.jenis}
                                  </span>
                                </td>
                                <td className="px-6 py-4 font-mono text-xs text-neutral-500">{t.referensi ?? "—"}</td>
                                <td className={`px-6 py-4 text-right font-semibold ${setor ? "text-emerald-600" : "text-red-600"}`}>
                                  {setor ? "+ " : "- "}{rupiah(t.nominal)}
                                </td>
                                <td className="px-6 py-4 text-right font-medium text-neutral-900">{rupiah(t.saldoSesudah)}</td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {filtered.length > 0 && (
                    <div className="bg-neutral-50/80 px-6 py-4 border-t border-neutral-100 flex items-center justify-between no-print">
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
                                p === page ? "bg-primary text-white border-primary" : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
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

                {/* Print footer */}
                <p className="text-xs text-neutral-400 text-center print:text-neutral-600 hidden print:block">
                  Mutasi ini dihasilkan oleh sistem BSI Haji Savings. Dokumen bersifat informatif.
                </p>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

/* ─── Summary Card ─── */
function SummaryCard({ label, value, icon, tone }: { label: string; value: string; icon: string; tone: "primary" | "success" | "warning" }) {
  const toneStyles = {
    primary: { bg: "bg-teal-50",    text: "text-primary" },
    success: { bg: "bg-emerald-50", text: "text-emerald-600" },
    warning: { bg: "bg-amber-50",   text: "text-amber-600" },
  }[tone];
  return (
    <div className="bg-white p-5 rounded-xl border border-neutral-100 shadow-sm flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-neutral-500 mb-1">{label}</p>
        <h3 className="text-xl font-bold text-neutral-900 leading-tight">{value}</h3>
      </div>
      <div className={`p-3 ${toneStyles.bg} ${toneStyles.text} rounded-lg shrink-0`}>
        <span className="material-symbols-outlined" style={{ fontVariationSettings: '"FILL" 1' }}>{icon}</span>
      </div>
    </div>
  );
}

/* ─── Page ─── */
export default function RiwayatTransaksiPage() {
  return (
    <AuthGuard>
      <RiwayatTransaksiContent />
    </AuthGuard>
  );
}
