"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AppHeader from "@/components/layout/app-header";
import AppSidebar from "@/components/layout/app-sidebar";
import AuthGuard from "@/components/auth-guard";
import { authHeaders, getCurrentUser } from "@/lib/auth";

/* ─── Types ─── */
type Status = "AKTIF" | "SUSPEND" | "TUTUP";
type Tabungan = {
  id: string;
  nomorRekening: string;
  saldo: number | string;
  status: Status;
  nasabahId: string;
};
type ApiError = { error: string; message: string };

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api/v1";
const MIN_NOMINAL = 100_000; /* sesuai backend SetorSchema */

/* ─── Helpers ─── */
function rupiah(n: number | string) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(Number(n));
}
function formatRek(no: string) {
  return no?.replace(/(\d{4})(\d{4})(\d+)/, "$1 $2 $3") ?? no;
}
function onlyDigits(s: string) {
  return s.replace(/\D/g, "");
}
function formatNominal(n: string) {
  if (!n) return "";
  return Number(n).toLocaleString("id-ID");
}

/* ─── Content ─── */
function SetorContent() {
  const router = useRouter();

  const [rekening, setRekening] = useState<Tabungan | null>(null);
  const [loading, setLoading] = useState(true);

  const [nominalRaw, setNominalRaw] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ nominal: number; saldoSesudah: number } | null>(null);

  /* fetch rekening saya */
  useEffect(() => {
    const u = getCurrentUser();
    if (!u) {
      setLoading(false);
      return;
    }
    fetch(`${API_URL}/tabungan-haji/nasabah/${u.sub}`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => {
        const list: Tabungan[] = Array.isArray(d) ? d : (d.data ?? []);
        setRekening(list[0] ?? null);
      })
      .finally(() => setLoading(false));
  }, []);

  const nominalNum = Number(nominalRaw || 0);
  const validNominal = nominalNum >= MIN_NOMINAL;
  const isAktif = rekening?.status === "AKTIF";
  const canSubmit = !!rekening && isAktif && validNominal && !submitting;

  function setNominalChip(v: number) {
    setNominalRaw(String(v));
    if (error) setError(null);
  }

  async function handleSubmit() {
    if (!rekening) {
      setError("Rekening tidak ditemukan.");
      return;
    }
    if (!validNominal) {
      setError(`Nominal minimal ${rupiah(MIN_NOMINAL)}.`);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/tabungan-haji/${rekening.id}/setor`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ nominal: nominalNum }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((d as ApiError).message ?? "Gagal mencatat setoran.");
        setSubmitting(false);
        return;
      }
      const saldoSesudah = Number(d.saldoSesudah ?? Number(rekening.saldo) + nominalNum);
      setSuccess({ nominal: nominalNum, saldoSesudah });
      setTimeout(() => router.replace("/dashboard"), 1800);
    } catch {
      setError("Tidak dapat terhubung ke server. Periksa koneksi Anda.");
      setSubmitting(false);
    }
  }

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-12 text-center text-neutral-400">
        <span className="material-symbols-outlined text-3xl mb-2 block animate-spin">progress_activity</span>
        Memuat rekening Anda...
      </div>
    );
  }

  /* ── Belum punya rekening ── */
  if (!rekening) {
    return (
      <div className="bg-white rounded-xl border border-dashed border-neutral-300 shadow-sm p-10 flex flex-col items-center text-center">
        <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mb-4">
          <span className="material-symbols-outlined text-[32px] text-neutral-400">account_balance_wallet</span>
        </div>
        <h2 className="text-lg font-semibold text-neutral-800">Belum Ada Rekening</h2>
        <p className="text-sm text-neutral-500 mt-1 max-w-md">
          Anda perlu memiliki rekening tabungan haji terlebih dahulu sebelum melakukan setoran.
        </p>
        <Link
          href="/rekening/buka"
          className="mt-5 px-5 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90 transition-colors flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Buka Rekening Sekarang
        </Link>
      </div>
    );
  }

  /* ── Success ── */
  if (success) {
    return (
      <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-10 flex flex-col items-center text-center">
        <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
          <span
            className="material-symbols-outlined text-[32px] text-emerald-600"
            style={{ fontVariationSettings: '"FILL" 1' }}
          >
            check_circle
          </span>
        </div>
        <h2 className="text-lg font-semibold text-neutral-800">Setoran Berhasil</h2>
        <p className="text-sm text-neutral-500 mt-1">
          Setoran <span className="font-semibold text-neutral-800">{rupiah(success.nominal)}</span> telah masuk ke rekening{" "}
          <span className="font-mono text-neutral-800">{formatRek(rekening.nomorRekening)}</span>.
        </p>
        <div className="mt-4 bg-emerald-50 border border-emerald-100 rounded-lg px-4 py-2.5">
          <p className="text-xs text-emerald-700">Saldo Sekarang</p>
          <p className="text-lg font-bold text-emerald-800">{rupiah(success.saldoSesudah)}</p>
        </div>
        <p className="text-xs text-neutral-400 mt-3">Mengalihkan ke dashboard...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-neutral-100 flex items-center gap-3 bg-neutral-50/50">
        <div className="h-10 w-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: '"FILL" 1' }}>
            add_card
          </span>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-neutral-800">Setor ke Rekening Saya</h3>
          <p className="text-xs text-neutral-500">Tambah saldo tabungan haji Anda.</p>
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-6 flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-100">
          <span className="material-symbols-outlined text-red-600 shrink-0 text-xl" style={{ fontVariationSettings: '"FILL" 1' }}>
            error
          </span>
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {!isAktif && (
        <div className="mx-6 mt-6 flex items-start gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
          <span className="material-symbols-outlined text-amber-600 shrink-0 text-xl" style={{ fontVariationSettings: '"FILL" 1' }}>
            warning
          </span>
          <p className="text-sm text-amber-800">
            Rekening Anda berstatus <span className="font-semibold">{rekening.status}</span> dan tidak dapat menerima setoran.
          </p>
        </div>
      )}

      <div className="p-6 md:p-8 space-y-5">
        {/* Kartu rekening */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">Rekening Saya</label>
          <div
            className="rounded-xl shadow-sm p-5 relative overflow-hidden text-white"
            style={{ background: "linear-gradient(to bottom right, #006a62, #1e4f4c)" }}
          >
            <div className="absolute top-0 right-0 opacity-10 pointer-events-none">
              <div className="w-32 h-32 rounded-full bg-white -mr-8 -mt-8" />
            </div>
            <div className="relative z-10">
              <p className="text-white/70 text-xs">Nomor Rekening</p>
              <p className="text-lg font-bold font-mono tracking-widest">{formatRek(rekening.nomorRekening)}</p>
              <div className="mt-4 pt-3 border-t border-white/20">
                <p className="text-white/70 text-xs">Saldo Saat Ini</p>
                <p className="text-2xl font-extrabold tracking-tight">{rupiah(rekening.saldo)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Nominal input */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1.5" htmlFor="nominal">
            Nominal Setoran <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 text-sm font-semibold">Rp</span>
            <input
              id="nominal"
              type="text"
              inputMode="numeric"
              value={formatNominal(nominalRaw)}
              onChange={(e) => { setNominalRaw(onlyDigits(e.target.value)); if (error) setError(null); }}
              placeholder="0"
              disabled={!isAktif}
              className="w-full pl-12 pr-4 py-3 bg-white border border-neutral-300 rounded-lg text-lg font-semibold text-neutral-900 focus:border-primary focus:ring-1 focus:ring-primary transition-colors outline-none disabled:bg-neutral-50 disabled:cursor-not-allowed placeholder:text-neutral-300"
            />
          </div>
          <p className="mt-1.5 text-xs text-neutral-500">Minimum {rupiah(MIN_NOMINAL)}.</p>

          {/* Quick chips */}
          <div className="mt-3 flex flex-wrap gap-2">
            {[100_000, 500_000, 1_000_000, 2_500_000, 5_000_000].map((v) => (
              <button
                key={v}
                type="button"
                disabled={!isAktif}
                onClick={() => setNominalChip(v)}
                className="px-3 py-1.5 text-xs font-medium text-primary border border-primary/30 bg-primary/5 hover:bg-primary/10 rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                + {rupiah(v)}
              </button>
            ))}
          </div>
        </div>

        {/* Estimasi saldo setelah */}
        {validNominal && (
          <div className="bg-emerald-50/70 border border-emerald-100 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-emerald-600">savings</span>
              <div>
                <p className="text-xs text-emerald-700">Saldo Setelah Setoran</p>
                <p className="text-sm font-bold text-emerald-800">{rupiah(Number(rekening.saldo) + nominalNum)}</p>
              </div>
            </div>
            <span className="text-xs font-medium text-emerald-700 bg-white border border-emerald-200 rounded px-2 py-1">
              + {rupiah(nominalNum)}
            </span>
          </div>
        )}

        {/* Info note */}
        <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <span className="material-symbols-outlined text-blue-600 shrink-0 text-[20px]">info</span>
          <p className="text-sm text-blue-800">
            Setoran akan langsung tercatat dan menambah saldo rekening tabungan haji Anda. Untuk
            mendapatkan nomor porsi, saldo total harus mencapai <span className="font-semibold">Rp 25.000.000</span>.
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 bg-neutral-50 border-t border-neutral-100 flex items-center justify-end gap-3">
        <Link
          href="/dashboard"
          className="px-5 py-2.5 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
        >
          Batal
        </Link>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-primary hover:opacity-90 rounded-lg transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <>
              <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
              Memproses...
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-[18px]">check</span>
              Setor Sekarang
            </>
          )}
        </button>
      </div>
    </div>
  );
}

/* ─── Page ─── */
export default function SetorDanaPage() {
  return (
    <AuthGuard>
      <div className="bg-neutral-50 text-neutral-900 antialiased flex min-h-screen">
        <AppSidebar activeHref="/transaksi" />
        <div className="flex-1 flex flex-col min-w-0">
          <AppHeader />
          <main className="flex-1 p-6 lg:p-8 bg-neutral-50">
            <div className="max-w-3xl mx-auto">
              <div className="mb-6">
                <nav className="flex text-sm text-neutral-500 mb-3">
                  <ol className="inline-flex items-center gap-1">
                    <li>
                      <Link href="/dashboard" className="hover:text-primary transition-colors">
                        Beranda
                      </Link>
                    </li>
                    <li className="flex items-center">
                      <span className="material-symbols-outlined text-sm mx-1">chevron_right</span>
                      <span className="text-neutral-900 font-medium">Setor Dana</span>
                    </li>
                  </ol>
                </nav>
                <div className="flex items-center gap-4">
                  <Link
                    href="/dashboard"
                    className="w-10 h-10 rounded-full bg-white border border-neutral-200 flex items-center justify-center text-neutral-700 hover:bg-neutral-50 transition-colors shadow-sm"
                  >
                    <span className="material-symbols-outlined">arrow_back</span>
                  </Link>
                  <div>
                    <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Setor Dana</h1>
                    <p className="text-neutral-500 text-sm mt-0.5">Tambah saldo tabungan haji Anda dengan cepat.</p>
                  </div>
                </div>
              </div>

              <SetorContent />
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
