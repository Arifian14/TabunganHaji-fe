"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AppHeader from "@/components/layout/app-header";
import AppSidebar from "@/components/layout/app-sidebar";

/* ─── Types ─── */
type Stats = {
  totalNasabah: number;
  rekeningAktif: number;
  rekeningSupend: number;
  rekeningTutup: number;
  totalSetorHariIni: number;
  jumlahTransaksiHariIni: number;
};

type RecentTx = {
  id: string;
  inisial: string;
  nama: string;
  jenis: "SETOR" | "TARIK";
  nominal: number;
  waktu: string;
};

/* ─── Helpers ─── */
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api/v1";

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("bsi_token") ?? "";
}

function authHeaders() {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function formatRupiah(n: number) {
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(2).replace(".", ",")} M`;
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1).replace(".", ",")} Jt`;
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);
}

function toInisial(nama: string) {
  return (nama ?? "NA").split(" ").map((w) => w[0] ?? "").join("").substring(0, 2).toUpperCase();
}

/* ─── Stat Card ─── */
function StatCard({
  label, value, sub, icon, bgIcon, textIcon,
}: {
  label: string; value: string; sub?: string;
  icon: string; bgIcon: string; textIcon: string;
}) {
  return (
    <div className="bg-white p-6 rounded-xl border border-neutral-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
      <div className={`absolute -right-4 -top-4 w-24 h-24 ${bgIcon} rounded-full group-hover:scale-110 transition-transform duration-500 opacity-50 z-0`} />
      <div className="relative z-10 flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-neutral-500 mb-1">{label}</p>
          <h3 className="text-3xl font-bold text-neutral-900 leading-tight">{value}</h3>
          {sub && <p className="text-xs text-neutral-400 mt-1">{sub}</p>}
        </div>
        <div className={`p-3 ${bgIcon} ${textIcon} rounded-lg shrink-0`}>
          <span className="material-symbols-outlined" style={{ fontVariationSettings: '"FILL" 1' }}>{icon}</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Quick Action Button ─── */
function QuickAction({ icon, label, href }: { icon: string; label: string; href: string }) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center justify-center p-4 rounded-lg border border-neutral-200 hover:border-primary hover:bg-teal-50/50 group transition-all"
    >
      <div className="w-10 h-10 rounded-full bg-neutral-100 group-hover:bg-primary group-hover:text-white text-neutral-600 flex items-center justify-center mb-3 transition-colors">
        <span className="material-symbols-outlined">{icon}</span>
      </div>
      <span className="text-sm font-medium text-neutral-700 text-center">{label}</span>
    </Link>
  );
}

/* ─── Page ─── */
export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentTx, setRecentTx] = useState<RecentTx[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAll() {
      const h = authHeaders();
      try {
        const [nasabahRes, tabunganRes, transaksiRes] = await Promise.allSettled([
          fetch(`${API_URL}/nasabah`, { headers: h }),
          fetch(`${API_URL}/tabungan-haji`, { headers: h }),
          fetch(`${API_URL}/transaksi`, { headers: h }),
        ]);

        let totalNasabah = 0;
        let rekeningAktif = 0, rekeningSupend = 0, rekeningTutup = 0;
        let totalSetorHariIni = 0, jumlahTransaksiHariIni = 0;
        const today = new Date().toDateString();
        const txRows: RecentTx[] = [];
        const namaById = new Map<string, string>();

        if (nasabahRes.status === "fulfilled" && nasabahRes.value.ok) {
          const d = await nasabahRes.value.json();
          const list: { id: string; nama: string }[] = Array.isArray(d) ? d : (d.data ?? []);
          totalNasabah = d.total ?? list.length;
          for (const n of list) namaById.set(n.id, n.nama);
        }

        if (tabunganRes.status === "fulfilled" && tabunganRes.value.ok) {
          const d = await tabunganRes.value.json();
          const list: { status: string }[] = Array.isArray(d) ? d : (d.data ?? []);
          rekeningAktif = list.filter((t) => t.status === "AKTIF").length;
          rekeningSupend = list.filter((t) => t.status === "SUSPEND").length;
          rekeningTutup = list.filter((t) => t.status === "TUTUP").length;
        }

        if (transaksiRes.status === "fulfilled" && transaksiRes.value.ok) {
          const d = await transaksiRes.value.json();
          const list: {
            id: string; jenis: "SETOR" | "TARIK"; nominal: string | number;
            waktu: string; tabungan?: { nasabahId?: string };
          }[] = Array.isArray(d) ? d : (d.data ?? []);

          const todaySetor = list.filter(
            (t) => t.jenis === "SETOR" && new Date(t.waktu).toDateString() === today
          );
          jumlahTransaksiHariIni = todaySetor.length;
          totalSetorHariIni = todaySetor.reduce((s, t) => s + Number(t.nominal), 0);

          list.slice(0, 6).forEach((t) => {
            const nama = namaById.get(t.tabungan?.nasabahId ?? "") ?? "Nasabah";
            txRows.push({
              id: t.id,
              inisial: toInisial(nama),
              nama,
              jenis: t.jenis,
              nominal: Number(t.nominal),
              waktu: new Date(t.waktu).toLocaleTimeString("id-ID", {
                hour: "2-digit", minute: "2-digit",
              }) + " WIB",
            });
          });
        }

        setStats({ totalNasabah, rekeningAktif, rekeningSupend, rekeningTutup, totalSetorHariIni, jumlahTransaksiHariIni });
        setRecentTx(txRows);
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, []);

  /* Donut chart percentages */
  const total = (stats?.rekeningAktif ?? 0) + (stats?.rekeningSupend ?? 0) + (stats?.rekeningTutup ?? 0);
  const aktifPct  = total > 0 ? ((stats?.rekeningAktif  ?? 0) / total) * 100 : 88;
  const suspendPct = total > 0 ? ((stats?.rekeningSupend ?? 0) / total) * 100 : 8;
  const suspendEnd = aktifPct + suspendPct;
  const donutGradient = `conic-gradient(#006a62 0% ${aktifPct.toFixed(1)}%, #f59e0b ${aktifPct.toFixed(1)}% ${suspendEnd.toFixed(1)}%, #ef4444 ${suspendEnd.toFixed(1)}% 100%)`;

  return (
    <div className="bg-neutral-50 text-neutral-900 antialiased flex min-h-screen">
      <AppSidebar activeHref="/dashboard" />

      <div className="flex-1 flex flex-col min-w-0">
        <AppHeader />

        <main className="flex-1 p-6 md:p-8 bg-neutral-50">
          {/* Page Header */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-neutral-900 tracking-tight">Dashboard</h2>
            <p className="text-neutral-500 mt-1">Selamat datang, Admin Haji</p>
          </div>

          {/* ── Stat Cards ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              label="Total Nasabah Terdaftar"
              value={loading ? "—" : (stats?.totalNasabah ?? 0).toLocaleString("id-ID")}
              icon="groups"
              bgIcon="bg-teal-50"
              textIcon="text-primary"
            />
            <StatCard
              label="Rekening Aktif"
              value={loading ? "—" : (stats?.rekeningAktif ?? 0).toLocaleString("id-ID")}
              icon="account_balance_wallet"
              bgIcon="bg-emerald-50"
              textIcon="text-emerald-600"
            />
            <StatCard
              label={loading ? "—" : `${stats?.jumlahTransaksiHariIni ?? 0} Transaksi`}
              value={loading ? "—" : formatRupiah(stats?.totalSetorHariIni ?? 0)}
              sub="Total Setor Hari Ini"
              icon="payments"
              bgIcon="bg-blue-50"
              textIcon="text-blue-600"
            />
            <StatCard
              label="Porsi Baru"
              value="12"
              sub="Estimasi Bulan Ini"
              icon="event"
              bgIcon="bg-amber-50"
              textIcon="text-amber-600"
            />
          </div>

          {/* ── Transaksi + Donut ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

            {/* Transaksi Terbaru */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-neutral-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-neutral-100 flex justify-between items-center">
                <h3 className="text-lg font-bold text-neutral-900">Transaksi Terbaru</h3>
                <Link href="/transaksi" className="text-sm font-medium text-primary hover:underline">
                  Lihat Semua
                </Link>
              </div>
              {loading ? (
                <div className="p-8 text-center text-neutral-400 text-sm">Memuat data...</div>
              ) : recentTx.length === 0 ? (
                <div className="p-8 text-center text-neutral-400 text-sm">Belum ada transaksi.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-neutral-600">
                    <thead className="bg-neutral-50 text-neutral-500 uppercase text-xs font-semibold">
                      <tr>
                        <th className="px-6 py-4">Nasabah</th>
                        <th className="px-6 py-4">Jenis</th>
                        <th className="px-6 py-4">Nominal</th>
                        <th className="px-6 py-4">Waktu</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {recentTx.map((tx) => (
                        <tr key={tx.id} className="hover:bg-neutral-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center text-xs font-bold text-neutral-600 shrink-0">
                                {tx.inisial}
                              </div>
                              <span className="font-medium text-neutral-900">{tx.nama}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                                tx.jenis === "SETOR"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-amber-50 text-amber-700"
                              }`}
                            >
                              {tx.jenis}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-medium text-neutral-900">
                            {formatRupiah(tx.nominal)}
                          </td>
                          <td className="px-6 py-4 text-neutral-500">{tx.waktu}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Status Rekening Donut */}
            <div className="bg-white rounded-xl border border-neutral-100 shadow-sm p-6 flex flex-col">
              <h3 className="text-lg font-bold text-neutral-900 mb-6">Status Rekening</h3>
              <div className="flex-1 flex flex-col items-center justify-center">
                {/* CSS Donut */}
                <div
                  className="relative w-40 h-40 rounded-full flex items-center justify-center"
                  style={{ background: donutGradient }}
                >
                  <div className="w-28 h-28 bg-white rounded-full flex flex-col items-center justify-center shadow-inner">
                    <span className="text-[10px] text-neutral-500 uppercase font-bold tracking-wider">Total</span>
                    <span className="text-xl font-bold text-neutral-900">
                      {loading ? "—" : (total || "—").toLocaleString?.("id-ID") ?? total}
                    </span>
                  </div>
                </div>
                {/* Legend */}
                <div className="w-full mt-8 space-y-3">
                  {[
                    { label: "Aktif",   color: "bg-primary",    count: stats?.rekeningAktif  },
                    { label: "Suspend", color: "bg-amber-500",  count: stats?.rekeningSupend },
                    { label: "Tutup",   color: "bg-red-500",    count: stats?.rekeningTutup  },
                  ].map(({ label, color, count }) => (
                    <div key={label} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${color}`} />
                        <span className="text-neutral-600">{label}</span>
                      </div>
                      <span className="font-medium text-neutral-900">
                        {loading ? "—" : (count ?? 0).toLocaleString("id-ID")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── Aksi Cepat ── */}
          <div className="bg-white rounded-xl border border-neutral-100 shadow-sm p-6">
            <h3 className="text-lg font-bold text-neutral-900 mb-4">Aksi Cepat</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <QuickAction href="/nasabah/register"  icon="person_add"        label="Daftar Nasabah" />
              <QuickAction href="/rekening/buka"     icon="account_balance"   label="Buka Rekening"  />
              <QuickAction href="/transaksi/setor"   icon="add_card"          label="Setor Dana"     />
              <QuickAction href="/laporan"           icon="print"             label="Cetak Laporan"  />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
