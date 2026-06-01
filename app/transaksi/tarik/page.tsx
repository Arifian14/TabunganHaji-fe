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
const MIN_NOMINAL = 50_000;

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
function TarikContent() {
  const router = useRouter();

  const [rekening, setRekening] = useState<Tabungan | null>(null);
  const [loading, setLoading] = useState(true);

  const [nominalRaw, setNominalRaw] = useState("");
  const [confirmAck, setConfirmAck] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ nominal: number; saldoSesudah: number } | null>(null);

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
  const saldoSekarang = rekening ? Number(rekening.saldo) : 0;
  const overdraw = !!rekening && nominalNum > saldoSekarang;
  const validNominal = nominalNum >= MIN_NOMINAL;
  const isAktif = rekening?.status === "AKTIF";
  const hasSaldo = saldoSekarang > 0;
  const canSubmit = !!rekening && isAktif && hasSaldo && validNominal && !overdraw && confirmAck && !submitting;

  function setMax() {
    if (!rekening) return;
    setNominalRaw(String(saldoSekarang));
  }
  function setNominalChip(v: number) {
    setNominalRaw(String(Math.min(v, saldoSekarang)));
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
    if (overdraw) {
      setError("Nominal melebihi saldo rekening.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/tabungan-haji/${rekening.id}/tarik`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ nominal: nominalNum }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((d as ApiError).message ?? "Gagal mencatat penarikan.");
        setSubmitting(false);
        return;
      }
      const saldoSesudah = Number(d.saldoSesudah ?? saldoSekarang - nominalNum);
      setSuccess({ nominal: nominalNum, saldoSesudah });
      setTimeout(() => router.replace("/rekening"), 1800);
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
          Anda belum memiliki rekening tabungan haji yang dapat ditarik.
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
        <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mb-4">
          <span
            className="material-symbols-outlined text-[32px] text-amber-600"
            style={{ fontVariationSettings: '"FILL" 1' }}
          >
            check_circle
          </span>
        </div>
        <h2 className="text-lg font-semibold text-neutral-800">Penarikan Berhasil</h2>
        <p className="text-sm text-neutral-500 mt-1">
          Penarikan <span className="font-semibold text-neutral-800">{rupiah(success.nominal)}</span> telah dicatat untuk rekening{" "}
          <span className="font-mono text-neutral-800">{formatRek(rekening.nomorRekening)}</span>.
        </p>
        <div className="mt-4 bg-amber-50 border border-amber-100 rounded-lg px-4 py-2.5">
          <p className="text-xs text-amber-700">Sisa Saldo</p>
          <p className="text-lg font-bold text-amber-800">{rupiah(success.saldoSesudah)}</p>
        </div>
        <p className="text-xs text-neutral-400 mt-3">Mengalihkan ke dashboard...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-neutral-100 flex items-center gap-3 bg-neutral-50/50">
        <div className="h-10 w-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: '"FILL" 1' }}>
            payments
          </span>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-neutral-800">Tarik dari Rekening Saya</h3>
          <p className="text-xs text-neutral-500">Kurangi saldo rekening tabungan haji Anda.</p>
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
            Rekening Anda berstatus <span className="font-semibold">{rekening.status}</span> dan tidak dapat ditarik.
          </p>
        </div>
      )}

      {isAktif && !hasSaldo && (
        <div className="mx-6 mt-6 flex items-start gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
          <span className="material-symbols-outlined text-amber-600 shrink-0 text-xl" style={{ fontVariationSettings: '"FILL" 1' }}>
            info
          </span>
          <p className="text-sm text-amber-800">Saldo Anda Rp 0 — tidak ada dana yang dapat ditarik.</p>
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
                <p className="text-white/70 text-xs">Saldo Tersedia</p>
                <p className="text-2xl font-extrabold tracking-tight">{rupiah(saldoSekarang)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Nominal input */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-sm font-medium text-neutral-700" htmlFor="nominal">
              Nominal Penarikan <span className="text-red-500">*</span>
            </label>
            {hasSaldo && (
              <button
                type="button"
                onClick={setMax}
                className="text-xs font-semibold text-primary hover:underline"
              >
                MAX
              </button>
            )}
          </div>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 text-sm font-semibold">Rp</span>
            <input
              id="nominal"
              type="text"
              inputMode="numeric"
              value={formatNominal(nominalRaw)}
              onChange={(e) => { setNominalRaw(onlyDigits(e.target.value)); if (error) setError(null); }}
              placeholder="0"
              disabled={!isAktif || !hasSaldo}
              className={`w-full pl-12 pr-4 py-3 bg-white border rounded-lg text-lg font-semibold text-neutral-900 focus:ring-1 transition-colors outline-none disabled:bg-neutral-50 disabled:cursor-not-allowed placeholder:text-neutral-300 ${
                overdraw
                  ? "border-red-400 focus:border-red-500 focus:ring-red-500"
                  : "border-neutral-300 focus:border-primary focus:ring-primary"
              }`}
            />
          </div>
          <p className="mt-1.5 text-xs text-neutral-500">Minimum {rupiah(MIN_NOMINAL)}.</p>

          <div className="mt-3 flex flex-wrap gap-2">
            {[100_000, 500_000, 1_000_000, 2_500_000, 5_000_000].map((v) => (
              <button
                key={v}
                type="button"
                disabled={!isAktif || !hasSaldo || v > saldoSekarang}
                onClick={() => setNominalChip(v)}
                className="px-3 py-1.5 text-xs font-medium text-amber-700 border border-amber-300 bg-amber-50 hover:bg-amber-100 rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {rupiah(v)}
              </button>
            ))}
          </div>
        </div>

        {/* Estimasi sisa saldo */}
        {validNominal && !overdraw && (
          <div className="bg-amber-50/70 border border-amber-100 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-amber-600">account_balance_wallet</span>
              <div>
                <p className="text-xs text-amber-700">Sisa Saldo Setelah Penarikan</p>
                <p className="text-sm font-bold text-amber-800">{rupiah(saldoSekarang - nominalNum)}</p>
              </div>
            </div>
            <span className="text-xs font-medium text-red-700 bg-white border border-red-200 rounded px-2 py-1">
              − {rupiah(nominalNum)}
            </span>
          </div>
        )}

        {/* Overdraw warning */}
        {overdraw && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <span
              className="material-symbols-outlined text-red-600 shrink-0"
              style={{ fontVariationSettings: '"FILL" 1' }}
            >
              error
            </span>
            <div>
              <p className="text-sm font-semibold text-red-800">Saldo tidak mencukupi</p>
              <p className="text-xs text-red-700 mt-0.5">
                Penarikan melebihi saldo sebesar {rupiah(nominalNum - saldoSekarang)}.
              </p>
            </div>
          </div>
        )}

        {/* Confirmation checkbox */}
        <div className="border border-neutral-200 rounded-lg p-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmAck}
              onChange={(e) => setConfirmAck(e.target.checked)}
              className="mt-0.5 accent-primary w-4 h-4"
            />
            <span className="text-sm text-neutral-700">
              Saya mengerti penarikan ini akan mengurangi saldo dan dapat mempengaruhi estimasi
              keberangkatan haji saya.
            </span>
          </label>
        </div>

        {/* Info note */}
        <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <span className="material-symbols-outlined text-blue-600 shrink-0 text-[20px]">info</span>
          <p className="text-sm text-blue-800">
            Penarikan tabungan haji bersifat final. Jika saldo turun di bawah Rp 25.000.000, nomor
            porsi haji Anda bisa dibatalkan.
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 bg-neutral-50 border-t border-neutral-100 flex items-center justify-end gap-3">
        <Link
          href="/rekening"
          className="px-5 py-2.5 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
        >
          Batal
        </Link>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <>
              <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
              Memproses...
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-[18px]">check</span>
              Tarik Sekarang
            </>
          )}
        </button>
      </div>
    </div>
  );
}

/* ─── Page ─── */
export default function TarikDanaPage() {
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
                      <Link href="/rekening" className="hover:text-primary transition-colors">
                        Rekening
                      </Link>
                    </li>
                    <li className="flex items-center">
                      <span className="material-symbols-outlined text-sm mx-1">chevron_right</span>
                      <span className="text-neutral-900 font-medium">Tarik Dana</span>
                    </li>
                  </ol>
                </nav>
                <div className="flex items-center gap-4">
                  <Link
                    href="/rekening"
                    className="w-10 h-10 rounded-full bg-white border border-neutral-200 flex items-center justify-center text-neutral-700 hover:bg-neutral-50 transition-colors shadow-sm"
                  >
                    <span className="material-symbols-outlined">arrow_back</span>
                  </Link>
                  <div>
                    <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Tarik Dana</h1>
                    <p className="text-neutral-500 text-sm mt-0.5">Kurangi saldo rekening tabungan haji Anda.</p>
                  </div>
                </div>
              </div>

              <TarikContent />
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
