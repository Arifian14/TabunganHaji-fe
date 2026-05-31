"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AppHeader from "@/components/layout/app-header";
import AppSidebar from "@/components/layout/app-sidebar";
import AuthGuard from "@/components/auth-guard";
import { authHeaders, getCurrentUser } from "@/lib/auth";

/* ─── Types ─── */
type Status = "AKTIF" | "SUSPEND" | "TUTUP";

type Nasabah = {
  id: string;
  nama: string;
  email: string;
  nik: string;
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
  jenis: "SETOR" | "TARIK";
  nominal: number | string;
  saldoSesudah: number | string;
  waktu: string;
};

type Estimasi = {
  setoranAwalMinimal: number | string;
  sudahMemenuhiSetoranAwal: boolean;
  kekuranganSetoran: number | string;
  nomorPorsi: number;
  kuotaTahunan: number;
  tahunSekarang: number;
  tahunTunggu: number | null;
  estimasiTahunBerangkat: number | null;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api/v1";

/* ─── Helpers ─── */
function rupiah(n: number | string) {
  const num = Number(n);
  if (num >= 1_000_000_000) return `Rp ${(num / 1_000_000_000).toFixed(2).replace(".", ",")} M`;
  if (num >= 1_000_000) return `Rp ${(num / 1_000_000).toFixed(1).replace(".", ",")} Jt`;
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(num);
}
function rupiahFull(n: number | string) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(Number(n));
}
function tanggalJam(s: string) {
  return new Date(s).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}
function tanggal(s: string) {
  return new Date(s).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}
function formatRek(no: string) {
  return no?.replace(/(\d{4})(\d{4})(\d+)/, "$1 $2 $3") ?? no;
}

/* ─── Stat Card ─── */
function StatCard({
  label, value, sub, icon, tone,
}: {
  label: string; value: string; sub?: string;
  icon: string; tone: "primary" | "success" | "info" | "amber";
}) {
  const toneStyles = {
    primary: { bg: "bg-teal-50",    text: "text-primary" },
    success: { bg: "bg-emerald-50", text: "text-emerald-600" },
    info:    { bg: "bg-blue-50",    text: "text-blue-600" },
    amber:   { bg: "bg-amber-50",   text: "text-amber-600" },
  }[tone];
  return (
    <div className="bg-white p-6 rounded-xl border border-neutral-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
      <div className={`absolute -right-4 -top-4 w-24 h-24 ${toneStyles.bg} rounded-full group-hover:scale-110 transition-transform duration-500 opacity-50 z-0`} />
      <div className="relative z-10 flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-neutral-500 mb-1">{label}</p>
          <h3 className="text-2xl font-bold text-neutral-900 leading-tight truncate">{value}</h3>
          {sub && <p className="text-xs text-neutral-400 mt-1">{sub}</p>}
        </div>
        <div className={`p-3 ${toneStyles.bg} ${toneStyles.text} rounded-lg shrink-0`}>
          <span className="material-symbols-outlined" style={{ fontVariationSettings: '"FILL" 1' }}>{icon}</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Quick Action ─── */
function QuickAction({ icon, label, href, tone = "neutral" }: { icon: string; label: string; href: string; tone?: "neutral" | "primary" }) {
  const isPrimary = tone === "primary";
  return (
    <Link
      href={href}
      className={`flex flex-col items-center justify-center p-4 rounded-lg border transition-all group ${
        isPrimary
          ? "border-primary bg-primary text-white hover:opacity-90"
          : "border-neutral-200 hover:border-primary hover:bg-teal-50/50"
      }`}
    >
      <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-3 transition-colors ${
        isPrimary
          ? "bg-white/20 text-white"
          : "bg-neutral-100 group-hover:bg-primary group-hover:text-white text-neutral-600"
      }`}>
        <span className="material-symbols-outlined">{icon}</span>
      </div>
      <span className={`text-sm font-medium text-center ${isPrimary ? "text-white" : "text-neutral-700"}`}>{label}</span>
    </Link>
  );
}

/* ─── Status Badge ─── */
function StatusBadge({ status }: { status: Status }) {
  const cfg = {
    AKTIF:   { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
    SUSPEND: { bg: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-200" },
    TUTUP:   { bg: "bg-red-50",     text: "text-red-700",     border: "border-red-200" },
  }[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text} border ${cfg.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${status === "AKTIF" ? "bg-emerald-500" : status === "SUSPEND" ? "bg-amber-500" : "bg-red-500"}`} />
      {status}
    </span>
  );
}

/* ─── Page Content ─── */
function DashboardContent() {
  const [nasabah, setNasabah] = useState<Nasabah | null>(null);
  const [rekening, setRekening] = useState<Tabungan | null>(null);
  const [transaksi, setTransaksi] = useState<Transaksi[]>([]);
  const [estimasi, setEstimasi] = useState<Estimasi | null>(null);
  const [loading, setLoading] = useState(true);

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
          setNasabah(naRes.value);
        }

        let rekData: Tabungan | null = null;
        if (rekRes.status === "fulfilled") {
          const list: Tabungan[] = Array.isArray(rekRes.value) ? rekRes.value : (rekRes.value.data ?? []);
          rekData = list[0] ?? null;
          setRekening(rekData);
        }

        if (rekData) {
          const [txRes, estRes] = await Promise.allSettled([
            fetch(`${API_URL}/tabungan-haji/${rekData.id}/transaksi`, { headers: h }).then((r) => r.json()),
            fetch(`${API_URL}/tabungan-haji/${rekData.id}/estimasi`, { headers: h }).then((r) => r.json()),
          ]);
          if (txRes.status === "fulfilled") {
            const list: Transaksi[] = Array.isArray(txRes.value) ? txRes.value : (txRes.value.data ?? []);
            setTransaksi(list);
          }
          if (estRes.status === "fulfilled" && estRes.value) {
            setEstimasi(estRes.value.estimasi ?? estRes.value);
          }
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* derived stats */
  const totalSetor = transaksi
    .filter((t) => t.jenis === "SETOR")
    .reduce((s, t) => s + Number(t.nominal), 0);
  const lastTx = transaksi.slice(0, 5);

  const displayName = nasabah?.nama ?? getCurrentUser()?.email ?? "Pengguna";
  const firstName = displayName.split(" ")[0];

  return (
    <div className="bg-neutral-50 text-neutral-900 antialiased flex min-h-screen">
      <AppSidebar activeHref="/dashboard" />

      <div className="flex-1 flex flex-col min-w-0">
        <AppHeader />

        <main className="flex-1 p-6 md:p-8 bg-neutral-50">
          {/* Welcome */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-neutral-900 tracking-tight">
              Assalamu&apos;alaikum, {firstName} 👋
            </h2>
            <p className="text-neutral-500 mt-1">
              {loading ? "Memuat data Anda..." : rekening ? "Pantau perjalanan tabungan haji Anda di sini." : "Selesaikan langkah berikutnya untuk memulai."}
            </p>
          </div>

          {loading ? (
            <div className="bg-white rounded-xl border border-neutral-100 shadow-sm p-16 text-center text-neutral-400">
              <span className="material-symbols-outlined text-4xl mb-3 block animate-spin">progress_activity</span>
              Memuat data tabungan haji Anda...
            </div>
          ) : !rekening ? (
            /* ── EMPTY STATE: Belum punya rekening ── */
            <div className="bg-white rounded-xl border border-dashed border-neutral-300 shadow-sm p-12 flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-5">
                <span className="material-symbols-outlined text-[40px] text-primary" style={{ fontVariationSettings: '"FILL" 1' }}>
                  account_balance_wallet
                </span>
              </div>
              <h3 className="text-xl font-bold text-neutral-800">Anda Belum Memiliki Rekening Tabungan Haji</h3>
              <p className="text-sm text-neutral-500 mt-2 max-w-md">
                Buka rekening tabungan haji untuk mulai menabung dan memantau estimasi tahun keberangkatan Anda.
              </p>
              <Link
                href="/rekening/buka"
                className="mt-6 px-6 py-3 bg-primary text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-colors flex items-center gap-2 shadow-sm"
              >
                <span className="material-symbols-outlined text-[20px]">add_circle</span>
                Buka Rekening Sekarang
              </Link>
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl text-xs text-neutral-500">
                <div className="flex items-start gap-2 bg-neutral-50 p-3 rounded-lg">
                  <span className="material-symbols-outlined text-primary text-base shrink-0">verified</span>
                  <span>Akun gratis, tanpa biaya pembukaan</span>
                </div>
                <div className="flex items-start gap-2 bg-neutral-50 p-3 rounded-lg">
                  <span className="material-symbols-outlined text-primary text-base shrink-0">savings</span>
                  <span>Setoran awal porsi {rupiahFull(25_000_000)}</span>
                </div>
                <div className="flex items-start gap-2 bg-neutral-50 p-3 rounded-lg">
                  <span className="material-symbols-outlined text-primary text-base shrink-0">event</span>
                  <span>Estimasi keberangkatan otomatis</span>
                </div>
              </div>
            </div>
          ) : (
            /* ── PUNYA REKENING ── */
            <>
              {/* Stat Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard
                  label="Saldo Saya"
                  value={rupiahFull(rekening.saldo)}
                  sub={`Sejak ${tanggal(rekening.dibukaAt)}`}
                  icon="account_balance_wallet"
                  tone="primary"
                />
                <StatCard
                  label="Estimasi Berangkat"
                  value={estimasi?.estimasiTahunBerangkat ? String(estimasi.estimasiTahunBerangkat) : "—"}
                  sub={
                    estimasi?.estimasiTahunBerangkat
                      ? `± ${estimasi.tahunTunggu} tahun lagi`
                      : estimasi
                      ? `Kurang ${rupiah(estimasi.kekuranganSetoran)} untuk porsi`
                      : "Hitung dulu setoran awal"
                  }
                  icon="event"
                  tone="info"
                />
                <StatCard
                  label="Total Setoran"
                  value={rupiah(totalSetor)}
                  sub={`${transaksi.filter((t) => t.jenis === "SETOR").length} kali setor`}
                  icon="trending_up"
                  tone="success"
                />
                <StatCard
                  label="Status Rekening"
                  value={rekening.status}
                  sub={`No. ${formatRek(rekening.nomorRekening)}`}
                  icon="verified_user"
                  tone={rekening.status === "AKTIF" ? "success" : rekening.status === "SUSPEND" ? "amber" : "primary"}
                />
              </div>

              {/* Rekening Card */}
              <div
                className="rounded-xl shadow-md p-6 mb-8 relative overflow-hidden text-white"
                style={{ background: "linear-gradient(to bottom right, #006a62, #1e4f4c)" }}
              >
                <div className="absolute top-0 right-0 opacity-10 pointer-events-none">
                  <div className="w-48 h-48 rounded-full bg-white -mr-12 -mt-12" />
                </div>
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="text-white/70 text-sm font-medium mb-1">Rekening Tabungan Haji</h3>
                      <div className="text-xl font-bold tracking-widest">{formatRek(rekening.nomorRekening)}</div>
                    </div>
                    <StatusBadge status={rekening.status} />
                  </div>
                  <div className="mb-6">
                    <p className="text-white/70 text-sm mb-1">Saldo Efektif</p>
                    <div className="text-4xl font-extrabold tracking-tight">{rupiahFull(rekening.saldo)}</div>
                    {estimasi && !estimasi.sudahMemenuhiSetoranAwal && (
                      <p className="text-amber-300 text-xs mt-2 flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">info</span>
                        Kurang {rupiah(estimasi.kekuranganSetoran)} untuk mendapatkan nomor porsi
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-3 pt-4 border-t border-white/20">
                    <Link
                      href={`/transaksi/setor?tabungan=${rekening.id}`}
                      className="bg-white text-primary px-5 py-2.5 rounded-lg font-bold text-sm shadow-sm hover:bg-neutral-50 transition-colors flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-[18px]">add_card</span>
                      Setor Dana
                    </Link>
                    <Link
                      href={`/transaksi/tarik?tabungan=${rekening.id}`}
                      className="bg-white/10 backdrop-blur-sm border border-white/30 text-white px-5 py-2.5 rounded-lg font-medium text-sm hover:bg-white/20 transition-colors flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-[18px]">payments</span>
                      Tarik Dana
                    </Link>
                    <Link
                      href={`/nasabah/${rekening.nasabahId}`}
                      className="bg-white/10 backdrop-blur-sm border border-white/30 text-white px-5 py-2.5 rounded-lg font-medium text-sm hover:bg-white/20 transition-colors flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-[18px]">event</span>
                      Estimasi Haji
                    </Link>
                  </div>
                </div>
              </div>

              {/* Transaksi + Aksi Cepat */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Transaksi Terakhir */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-neutral-100 shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-neutral-100 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-neutral-900">Transaksi Terakhir</h3>
                    <Link
                      href={`/transaksi?tabungan=${rekening.id}`}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      Lihat Semua
                    </Link>
                  </div>
                  {lastTx.length === 0 ? (
                    <div className="p-10 text-center text-neutral-400 text-sm">
                      <span className="material-symbols-outlined text-3xl mb-2 block">receipt_long</span>
                      Belum ada transaksi pada rekening Anda.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm text-neutral-600">
                        <thead className="bg-neutral-50 text-neutral-500 uppercase text-xs font-semibold">
                          <tr>
                            <th className="px-6 py-4">Waktu</th>
                            <th className="px-6 py-4">Jenis</th>
                            <th className="px-6 py-4 text-right">Nominal</th>
                            <th className="px-6 py-4 text-right">Saldo Akhir</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                          {lastTx.map((tx) => {
                            const setor = tx.jenis === "SETOR";
                            return (
                              <tr key={tx.id} className="hover:bg-neutral-50 transition-colors">
                                <td className="px-6 py-4 text-neutral-600">{tanggalJam(tx.waktu)}</td>
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
                                    {tx.jenis}
                                  </span>
                                </td>
                                <td className={`px-6 py-4 text-right font-semibold ${setor ? "text-emerald-600" : "text-red-600"}`}>
                                  {setor ? "+ " : "- "}{rupiahFull(tx.nominal)}
                                </td>
                                <td className="px-6 py-4 text-right font-medium text-neutral-900">
                                  {rupiahFull(tx.saldoSesudah)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Aksi Cepat */}
                <div className="bg-white rounded-xl border border-neutral-100 shadow-sm p-6">
                  <h3 className="text-lg font-bold text-neutral-900 mb-4">Aksi Cepat</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <QuickAction
                      href={`/transaksi/setor?tabungan=${rekening.id}`}
                      icon="add_card"
                      label="Setor Dana"
                      tone="primary"
                    />
                    <QuickAction
                      href={`/transaksi/tarik?tabungan=${rekening.id}`}
                      icon="payments"
                      label="Tarik Dana"
                    />
                    <QuickAction
                      href={`/transaksi?tabungan=${rekening.id}`}
                      icon="receipt_long"
                      label="Riwayat"
                    />
                    <QuickAction
                      href={`/nasabah/${rekening.nasabahId}`}
                      icon="person"
                      label="Profil Saya"
                    />
                  </div>
                  {/* Tips card */}
                  <div className="mt-6 bg-teal-50/50 border border-teal-100 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-primary text-base shrink-0">tips_and_updates</span>
                      <div className="text-xs text-neutral-700">
                        <p className="font-semibold mb-1">Tahukah Anda?</p>
                        <p className="text-neutral-500 leading-relaxed">
                          Setoran rutin tiap bulan mempercepat pencapaian setoran awal porsi haji ({rupiah(25_000_000)}).
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  );
}
