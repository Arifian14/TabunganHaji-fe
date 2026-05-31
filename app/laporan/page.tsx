"use client";

import { useEffect, useMemo, useState } from "react";
import AppHeader from "@/components/layout/app-header";
import AppSidebar from "@/components/layout/app-sidebar";
import AuthGuard from "@/components/auth-guard";

/* ─── Types ─── */
type Status = "AKTIF" | "SUSPEND" | "TUTUP";
type Jenis = "SETOR" | "TARIK";

type Nasabah = {
  id: string;
  nik: string;
  nama: string;
  email: string;
  nomorHp: string;
  createdAt: string;
};

type Tabungan = {
  id: string;
  nomorRekening: string;
  saldo: number | string;
  status: Status;
  dibukaAt: string;
  nasabahId: string;
};

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

type TabKey = "transaksi" | "saldo" | "nasabah";

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
function tanggal(s: string) {
  return new Date(s).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
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
function formatRek(no?: string) {
  return no?.replace(/(\d{4})(\d{4})(\d+)/, "$1 $2 $3") ?? "—";
}
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function firstDayOfMonthISO() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
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

/* ─── Page ─── */
function LaporanContent() {
  const [nasabahList, setNasabahList] = useState<Nasabah[]>([]);
  const [tabunganList, setTabunganList] = useState<Tabungan[]>([]);
  const [transaksiList, setTransaksiList] = useState<Transaksi[]>([]);
  const [loading, setLoading] = useState(true);

  const [tab, setTab] = useState<TabKey>("transaksi");
  const [dateFrom, setDateFrom] = useState(firstDayOfMonthISO());
  const [dateTo, setDateTo] = useState(todayISO());
  const [jenisFilter, setJenisFilter] = useState<"SEMUA" | Jenis>("SEMUA");
  const [statusFilter, setStatusFilter] = useState<"SEMUA" | Status>("SEMUA");

  useEffect(() => {
    const h = authHeaders();
    Promise.allSettled([
      fetch(`${API_URL}/nasabah`, { headers: h }).then((r) => r.json()),
      fetch(`${API_URL}/tabungan-haji`, { headers: h }).then((r) => r.json()),
      fetch(`${API_URL}/transaksi`, { headers: h }).then((r) => r.json()),
    ])
      .then(([nRes, tRes, txRes]) => {
        const naList: Nasabah[] = nRes.status === "fulfilled"
          ? Array.isArray(nRes.value) ? nRes.value : nRes.value.data ?? []
          : [];
        const tbList: Tabungan[] = tRes.status === "fulfilled"
          ? Array.isArray(tRes.value) ? tRes.value : tRes.value.data ?? []
          : [];
        const txList: Transaksi[] = txRes.status === "fulfilled"
          ? Array.isArray(txRes.value) ? txRes.value : txRes.value.data ?? []
          : [];
        setNasabahList(naList);
        setTabunganList(tbList);
        setTransaksiList(txList);
      })
      .finally(() => setLoading(false));
  }, []);

  const namaById = useMemo(() => {
    const m = new Map<string, string>();
    for (const n of nasabahList) m.set(n.id, n.nama);
    return m;
  }, [nasabahList]);

  /* ── Tab: Transaksi ── */
  const filteredTransaksi = useMemo(() => {
    const from = dateFrom ? new Date(dateFrom + "T00:00:00").getTime() : null;
    const to = dateTo ? new Date(dateTo + "T23:59:59").getTime() : null;
    return transaksiList.filter((t) => {
      const tm = new Date(t.waktu).getTime();
      if (from !== null && tm < from) return false;
      if (to !== null && tm > to) return false;
      if (jenisFilter !== "SEMUA" && t.jenis !== jenisFilter) return false;
      return true;
    });
  }, [transaksiList, dateFrom, dateTo, jenisFilter]);

  const summaryTransaksi = useMemo(() => {
    let setor = 0, tarik = 0, countSetor = 0, countTarik = 0;
    for (const t of filteredTransaksi) {
      const n = Number(t.nominal);
      if (t.jenis === "SETOR") { setor += n; countSetor += 1; }
      else { tarik += n; countTarik += 1; }
    }
    return {
      total: filteredTransaksi.length,
      setor, tarik,
      countSetor, countTarik,
      net: setor - tarik,
    };
  }, [filteredTransaksi]);

  /* ── Tab: Saldo Rekening ── */
  const filteredSaldo = useMemo(() => {
    return tabunganList.filter((t) => statusFilter === "SEMUA" || t.status === statusFilter);
  }, [tabunganList, statusFilter]);

  const summarySaldo = useMemo(() => {
    const total = filteredSaldo.reduce((s, t) => s + Number(t.saldo), 0);
    const aktif = tabunganList.filter((t) => t.status === "AKTIF").length;
    const suspend = tabunganList.filter((t) => t.status === "SUSPEND").length;
    const tutup = tabunganList.filter((t) => t.status === "TUTUP").length;
    return { total, aktif, suspend, tutup, jumlah: filteredSaldo.length };
  }, [filteredSaldo, tabunganList]);

  /* ── Tab: Nasabah ── */
  const filteredNasabah = useMemo(() => {
    const from = dateFrom ? new Date(dateFrom + "T00:00:00").getTime() : null;
    const to = dateTo ? new Date(dateTo + "T23:59:59").getTime() : null;
    return nasabahList.filter((n) => {
      const tm = new Date(n.createdAt).getTime();
      if (from !== null && tm < from) return false;
      if (to !== null && tm > to) return false;
      return true;
    });
  }, [nasabahList, dateFrom, dateTo]);

  const summaryNasabah = useMemo(() => {
    const hasRek = new Set(tabunganList.map((t) => t.nasabahId));
    const dengan = filteredNasabah.filter((n) => hasRek.has(n.id)).length;
    return {
      total: filteredNasabah.length,
      dengan,
      tanpa: filteredNasabah.length - dengan,
      keseluruhan: nasabahList.length,
    };
  }, [filteredNasabah, tabunganList, nasabahList]);

  /* ── Export ── */
  function handleExport() {
    const period = `${dateFrom}_to_${dateTo}`;
    if (tab === "transaksi") {
      const rows: (string | number)[][] = [
        ["Waktu", "Nasabah", "No. Rekening", "Jenis", "Nominal", "Saldo Akhir"],
        ...filteredTransaksi.map((t) => [
          tanggalJam(t.waktu),
          namaById.get(t.tabungan?.nasabahId ?? "") ?? "—",
          formatRek(t.tabungan?.nomorRekening),
          t.jenis,
          Number(t.nominal),
          Number(t.saldoSesudah),
        ]),
      ];
      downloadCsv(`laporan-transaksi-${period}.csv`, rows);
    } else if (tab === "saldo") {
      const rows: (string | number)[][] = [
        ["No. Rekening", "Nasabah", "Status", "Saldo", "Dibuka"],
        ...filteredSaldo.map((t) => [
          formatRek(t.nomorRekening),
          namaById.get(t.nasabahId) ?? "—",
          t.status,
          Number(t.saldo),
          tanggal(t.dibukaAt),
        ]),
      ];
      downloadCsv(`laporan-saldo-${todayISO()}.csv`, rows);
    } else {
      const rows: (string | number)[][] = [
        ["NIK", "Nama", "Email", "Nomor HP", "Tanggal Terdaftar"],
        ...filteredNasabah.map((n) => [
          n.nik, n.nama, n.email, n.nomorHp, tanggal(n.createdAt),
        ]),
      ];
      downloadCsv(`laporan-nasabah-${period}.csv`, rows);
    }
  }

  function handlePrint() {
    if (typeof window !== "undefined") window.print();
  }

  const periodeLabel = `${tanggal(dateFrom + "T00:00:00")} – ${tanggal(dateTo + "T00:00:00")}`;

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
        <AppSidebar activeHref="/laporan" />
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
                <h2 className="text-2xl font-bold text-neutral-900 tracking-tight">Laporan</h2>
                <p className="text-neutral-500 mt-1 text-sm">
                  Cetak dan unduh ringkasan transaksi, saldo, serta data nasabah.
                </p>
              </div>
              <div className="flex gap-2 no-print">
                <button
                  onClick={handleExport}
                  disabled={loading}
                  className="flex items-center gap-2 border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50 px-4 py-2 rounded-lg font-medium text-sm transition-colors shadow-sm disabled:opacity-60"
                >
                  <span className="material-symbols-outlined text-[18px]">download</span>
                  Export CSV
                </button>
                <button
                  onClick={handlePrint}
                  disabled={loading}
                  className="flex items-center gap-2 bg-primary hover:opacity-90 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors shadow-sm disabled:opacity-60"
                >
                  <span className="material-symbols-outlined text-[18px]">print</span>
                  Cetak
                </button>
              </div>
            </div>

            {/* Print Header — visible only when printing */}
            <div className="hidden print:block">
              <div className="border-b-2 border-primary pb-3 mb-4">
                <h1 className="text-xl font-bold text-primary">BSI Haji Savings — Laporan</h1>
                <p className="text-sm text-neutral-600 mt-1">
                  {tab === "transaksi" && "Rekap Transaksi"}
                  {tab === "saldo" && "Saldo Rekening"}
                  {tab === "nasabah" && "Daftar Nasabah"}
                  {" · "}Dicetak {tanggalJam(new Date().toISOString())}
                </p>
                {(tab === "transaksi" || tab === "nasabah") && (
                  <p className="text-sm text-neutral-600">Periode: {periodeLabel}</p>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-xl border border-neutral-100 shadow-sm overflow-hidden no-print">
              <div className="flex border-b border-neutral-100">
                <TabButton active={tab === "transaksi"} onClick={() => setTab("transaksi")} icon="receipt_long" label="Rekap Transaksi" />
                <TabButton active={tab === "saldo"} onClick={() => setTab("saldo")} icon="account_balance_wallet" label="Saldo Rekening" />
                <TabButton active={tab === "nasabah"} onClick={() => setTab("nasabah")} icon="groups" label="Daftar Nasabah" />
              </div>

              {/* Filter bar */}
              <div className="p-4 flex flex-col lg:flex-row lg:items-end gap-3 bg-neutral-50/50">
                {(tab === "transaksi" || tab === "nasabah") && (
                  <>
                    <div className="min-w-[160px]">
                      <label className="block text-xs font-medium text-neutral-500 mb-1">Dari Tanggal</label>
                      <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="w-full bg-white border border-neutral-300 rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-primary focus:border-primary shadow-sm outline-none"
                      />
                    </div>
                    <div className="min-w-[160px]">
                      <label className="block text-xs font-medium text-neutral-500 mb-1">Sampai Tanggal</label>
                      <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="w-full bg-white border border-neutral-300 rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-primary focus:border-primary shadow-sm outline-none"
                      />
                    </div>
                  </>
                )}
                {tab === "transaksi" && (
                  <div className="min-w-[160px]">
                    <label className="block text-xs font-medium text-neutral-500 mb-1">Jenis Transaksi</label>
                    <div className="relative">
                      <select
                        value={jenisFilter}
                        onChange={(e) => setJenisFilter(e.target.value as "SEMUA" | Jenis)}
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
                )}
                {tab === "saldo" && (
                  <div className="min-w-[180px]">
                    <label className="block text-xs font-medium text-neutral-500 mb-1">Status Rekening</label>
                    <div className="relative">
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as "SEMUA" | Status)}
                        className="w-full appearance-none bg-white border border-neutral-300 rounded-lg py-2 pl-3 pr-8 text-sm focus:ring-2 focus:ring-primary focus:border-primary shadow-sm cursor-pointer text-neutral-700 outline-none"
                      >
                        <option value="SEMUA">Semua Status</option>
                        <option value="AKTIF">Aktif</option>
                        <option value="SUSPEND">Suspend</option>
                        <option value="TUTUP">Tutup</option>
                      </select>
                      <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500 text-[20px]">
                        arrow_drop_down
                      </span>
                    </div>
                  </div>
                )}
                <div className="lg:ml-auto text-xs text-neutral-500 flex items-center gap-1.5 pt-2 lg:pt-0">
                  <span className="material-symbols-outlined text-[16px] text-neutral-400">info</span>
                  {tab === "transaksi" && `Periode: ${periodeLabel}`}
                  {tab === "saldo" && "Snapshot saldo saat ini"}
                  {tab === "nasabah" && `Berdasarkan tanggal terdaftar: ${periodeLabel}`}
                </div>
              </div>
            </div>

            {/* Summary Cards */}
            {tab === "transaksi" && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <SummaryCard label="Jumlah Transaksi" value={loading ? "—" : summaryTransaksi.total.toLocaleString("id-ID")} icon="receipt_long" tone="primary" />
                <SummaryCard label={`Total Setor (${summaryTransaksi.countSetor})`} value={loading ? "—" : rupiah(summaryTransaksi.setor)} icon="trending_up" tone="success" />
                <SummaryCard label={`Total Tarik (${summaryTransaksi.countTarik})`} value={loading ? "—" : rupiah(summaryTransaksi.tarik)} icon="trending_down" tone="warning" />
                <SummaryCard label="Net Setor – Tarik" value={loading ? "—" : rupiah(summaryTransaksi.net)} icon="account_balance" tone={summaryTransaksi.net >= 0 ? "success" : "danger"} />
              </div>
            )}
            {tab === "saldo" && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <SummaryCard label={`Total Saldo (${summarySaldo.jumlah} rekening)`} value={loading ? "—" : rupiah(summarySaldo.total)} icon="account_balance_wallet" tone="primary" />
                <SummaryCard label="Rekening Aktif" value={loading ? "—" : summarySaldo.aktif.toLocaleString("id-ID")} icon="check_circle" tone="success" />
                <SummaryCard label="Rekening Suspend" value={loading ? "—" : summarySaldo.suspend.toLocaleString("id-ID")} icon="pause_circle" tone="warning" />
                <SummaryCard label="Rekening Tutup" value={loading ? "—" : summarySaldo.tutup.toLocaleString("id-ID")} icon="cancel" tone="danger" />
              </div>
            )}
            {tab === "nasabah" && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <SummaryCard label="Pada Periode" value={loading ? "—" : summaryNasabah.total.toLocaleString("id-ID")} icon="person_add" tone="primary" />
                <SummaryCard label="Sudah Punya Rekening" value={loading ? "—" : summaryNasabah.dengan.toLocaleString("id-ID")} icon="account_balance_wallet" tone="success" />
                <SummaryCard label="Belum Punya Rekening" value={loading ? "—" : summaryNasabah.tanpa.toLocaleString("id-ID")} icon="hourglass_empty" tone="warning" />
                <SummaryCard label="Total Keseluruhan" value={loading ? "—" : summaryNasabah.keseluruhan.toLocaleString("id-ID")} icon="groups" tone="info" />
              </div>
            )}

            {/* Data Table */}
            <div className="bg-white rounded-xl shadow-sm border border-neutral-100 overflow-hidden print-card">
              <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
                <h3 className="text-base font-semibold text-neutral-900">
                  {tab === "transaksi" && "Detail Transaksi"}
                  {tab === "saldo" && "Detail Saldo per Rekening"}
                  {tab === "nasabah" && "Detail Nasabah Terdaftar"}
                </h3>
                <span className="text-xs text-neutral-500">
                  {tab === "transaksi" && `${filteredTransaksi.length} baris`}
                  {tab === "saldo" && `${filteredSaldo.length} baris`}
                  {tab === "nasabah" && `${filteredNasabah.length} baris`}
                </span>
              </div>

              <div className="overflow-x-auto">
                {loading ? (
                  <div className="px-6 py-12 text-center text-neutral-400">
                    <span className="material-symbols-outlined text-3xl mb-2 block animate-spin">progress_activity</span>
                    Memuat data...
                  </div>
                ) : tab === "transaksi" ? (
                  <TransaksiTable rows={filteredTransaksi} namaById={namaById} />
                ) : tab === "saldo" ? (
                  <SaldoTable rows={filteredSaldo} namaById={namaById} />
                ) : (
                  <NasabahTable rows={filteredNasabah} />
                )}
              </div>
            </div>

            {/* Footer note for print */}
            <p className="text-xs text-neutral-400 text-center print:text-neutral-600">
              Laporan dihasilkan oleh sistem BSI Haji Savings.
              Dokumen ini bersifat internal dan tidak untuk distribusi publik.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function LaporanPage() {
  return (
    <AuthGuard>
      <LaporanContent />
    </AuthGuard>
  );
}

/* ─── Tab Button ─── */
function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: string; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
        active
          ? "border-primary text-primary bg-primary/5"
          : "border-transparent text-neutral-500 hover:text-neutral-800 hover:bg-neutral-50"
      }`}
    >
      <span
        className="material-symbols-outlined text-[20px]"
        style={active ? { fontVariationSettings: '"FILL" 1' } : undefined}
      >
        {icon}
      </span>
      {label}
    </button>
  );
}

/* ─── Summary Card ─── */
function SummaryCard({
  label, value, icon, tone,
}: {
  label: string; value: string; icon: string;
  tone: "primary" | "success" | "warning" | "danger" | "info";
}) {
  const styles = {
    primary: { bg: "bg-teal-50", text: "text-primary" },
    success: { bg: "bg-emerald-50", text: "text-emerald-600" },
    warning: { bg: "bg-amber-50", text: "text-amber-600" },
    danger: { bg: "bg-red-50", text: "text-red-600" },
    info: { bg: "bg-blue-50", text: "text-blue-600" },
  }[tone];
  return (
    <div className="bg-white p-5 rounded-xl border border-neutral-100 shadow-sm flex items-start justify-between print-card">
      <div className="min-w-0">
        <p className="text-xs font-medium text-neutral-500 mb-1 truncate">{label}</p>
        <h3 className="text-xl font-bold text-neutral-900 leading-tight">{value}</h3>
      </div>
      <div className={`p-2.5 ${styles.bg} ${styles.text} rounded-lg shrink-0`}>
        <span className="material-symbols-outlined" style={{ fontVariationSettings: '"FILL" 1' }}>{icon}</span>
      </div>
    </div>
  );
}

/* ─── Tables ─── */
function TransaksiTable({ rows, namaById }: { rows: Transaksi[]; namaById: Map<string, string> }) {
  if (rows.length === 0) return <Empty icon="receipt_long" label="Tidak ada transaksi pada periode ini." />;
  return (
    <table className="w-full text-left text-sm whitespace-nowrap">
      <thead className="bg-neutral-50/50 border-b border-neutral-100 text-neutral-500 uppercase text-xs font-semibold tracking-wider">
        <tr>
          <th className="px-6 py-3">Waktu</th>
          <th className="px-6 py-3">Nasabah</th>
          <th className="px-6 py-3">No. Rekening</th>
          <th className="px-6 py-3">Jenis</th>
          <th className="px-6 py-3 text-right">Nominal</th>
          <th className="px-6 py-3 text-right">Saldo Akhir</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-neutral-100 text-neutral-700">
        {rows.map((t) => {
          const setor = t.jenis === "SETOR";
          const nama = namaById.get(t.tabungan?.nasabahId ?? "") ?? "Nasabah";
          return (
            <tr key={t.id} className="hover:bg-neutral-50/50 transition-colors">
              <td className="px-6 py-3 text-neutral-600">{tanggalJam(t.waktu)}</td>
              <td className="px-6 py-3 font-medium text-neutral-900">{nama}</td>
              <td className="px-6 py-3 font-mono text-xs text-neutral-600">{formatRek(t.tabungan?.nomorRekening)}</td>
              <td className="px-6 py-3">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${setor ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>
                  {t.jenis}
                </span>
              </td>
              <td className={`px-6 py-3 text-right font-semibold ${setor ? "text-emerald-600" : "text-red-600"}`}>
                {setor ? "+ " : "- "}{rupiah(t.nominal)}
              </td>
              <td className="px-6 py-3 text-right font-medium text-neutral-900">{rupiah(t.saldoSesudah)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function SaldoTable({ rows, namaById }: { rows: Tabungan[]; namaById: Map<string, string> }) {
  if (rows.length === 0) return <Empty icon="account_balance_wallet" label="Tidak ada rekening pada filter ini." />;
  const STATUS_BADGE: Record<Status, string> = {
    AKTIF: "bg-green-50 text-green-700 border border-green-200",
    SUSPEND: "bg-amber-50 text-amber-700 border border-amber-200",
    TUTUP: "bg-red-50 text-red-700 border border-red-200",
  };
  return (
    <table className="w-full text-left text-sm whitespace-nowrap">
      <thead className="bg-neutral-50/50 border-b border-neutral-100 text-neutral-500 uppercase text-xs font-semibold tracking-wider">
        <tr>
          <th className="px-6 py-3">No. Rekening</th>
          <th className="px-6 py-3">Nasabah</th>
          <th className="px-6 py-3">Status</th>
          <th className="px-6 py-3">Dibuka</th>
          <th className="px-6 py-3 text-right">Saldo</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-neutral-100 text-neutral-700">
        {rows.map((t) => (
          <tr key={t.id} className="hover:bg-neutral-50/50 transition-colors">
            <td className="px-6 py-3 font-mono text-xs">{formatRek(t.nomorRekening)}</td>
            <td className="px-6 py-3 font-medium text-neutral-900">{namaById.get(t.nasabahId) ?? "—"}</td>
            <td className="px-6 py-3">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[t.status]}`}>{t.status}</span>
            </td>
            <td className="px-6 py-3 text-neutral-600">{tanggal(t.dibukaAt)}</td>
            <td className="px-6 py-3 text-right font-semibold text-neutral-900">{rupiah(t.saldo)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function NasabahTable({ rows }: { rows: Nasabah[] }) {
  if (rows.length === 0) return <Empty icon="groups" label="Tidak ada nasabah terdaftar pada periode ini." />;
  return (
    <table className="w-full text-left text-sm whitespace-nowrap">
      <thead className="bg-neutral-50/50 border-b border-neutral-100 text-neutral-500 uppercase text-xs font-semibold tracking-wider">
        <tr>
          <th className="px-6 py-3">NIK</th>
          <th className="px-6 py-3">Nama</th>
          <th className="px-6 py-3">Email</th>
          <th className="px-6 py-3">No. HP</th>
          <th className="px-6 py-3">Tanggal Terdaftar</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-neutral-100 text-neutral-700">
        {rows.map((n) => (
          <tr key={n.id} className="hover:bg-neutral-50/50 transition-colors">
            <td className="px-6 py-3 font-mono text-xs">{n.nik}</td>
            <td className="px-6 py-3 font-medium text-neutral-900">{n.nama}</td>
            <td className="px-6 py-3 text-neutral-600">{n.email}</td>
            <td className="px-6 py-3">{n.nomorHp}</td>
            <td className="px-6 py-3 text-neutral-600">{tanggal(n.createdAt)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Empty({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="px-6 py-12 text-center text-neutral-400">
      <span className="material-symbols-outlined text-3xl mb-2 block">{icon}</span>
      <p className="text-sm">{label}</p>
    </div>
  );
}
