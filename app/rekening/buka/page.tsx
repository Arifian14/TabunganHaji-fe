"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AppHeader from "@/components/layout/app-header";
import AppSidebar from "@/components/layout/app-sidebar";
import AuthGuard from "@/components/auth-guard";
import { authHeaders, getCurrentUser } from "@/lib/auth";

/* ─── Types ─── */
type Nasabah = { id: string; nik: string; nama: string; email: string; nomorHp: string };
type Tabungan = { id: string; nomorRekening: string; saldo: number | string; status: string; nasabahId: string };
type ApiError = { error: string; message: string };

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api/v1";

/* ─── Helpers ─── */
function inisial(nama: string) {
  return (nama ?? "?").split(" ").map((w) => w[0] ?? "").join("").substring(0, 2).toUpperCase();
}

/* ─── Inner Content ─── */
function BukaRekeningContent() {
  const router = useRouter();

  const [me, setMe] = useState<Nasabah | null>(null);
  const [existingRek, setExistingRek] = useState<Tabungan | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ nomorRekening: string } | null>(null);

  /* fetch profil saya + rekening saya */
  useEffect(() => {
    const u = getCurrentUser();
    if (!u) {
      setLoading(false);
      return;
    }
    const h = authHeaders();

    Promise.allSettled([
      fetch(`${API_URL}/nasabah/${u.sub}`, { headers: h }).then((r) => r.json()),
      fetch(`${API_URL}/tabungan-haji/nasabah/${u.sub}`, { headers: h }).then((r) => r.json()),
    ])
      .then(([naRes, rekRes]) => {
        if (naRes.status === "fulfilled" && naRes.value && !naRes.value.error) {
          setMe(naRes.value);
        }
        if (rekRes.status === "fulfilled") {
          const list: Tabungan[] = Array.isArray(rekRes.value) ? rekRes.value : (rekRes.value.data ?? []);
          if (list[0]) setExistingRek(list[0]);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit() {
    const u = getCurrentUser();
    if (!u) {
      setError("Sesi tidak valid. Silakan login kembali.");
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`${API_URL}/tabungan-haji`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ nasabahId: u.sub }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((d as ApiError).message ?? "Gagal membuka rekening.");
        setSubmitting(false);
        return;
      }
      setSuccess({ nomorRekening: d.nomorRekening });
      setTimeout(() => router.replace("/dashboard"), 1600);
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
        Memuat data Anda...
      </div>
    );
  }

  /* ── Sudah punya rekening ── */
  if (existingRek) {
    return (
      <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-10 flex flex-col items-center text-center">
        <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mb-4">
          <span
            className="material-symbols-outlined text-[32px] text-amber-600"
            style={{ fontVariationSettings: '"FILL" 1' }}
          >
            info
          </span>
        </div>
        <h2 className="text-lg font-semibold text-neutral-800">Anda Sudah Memiliki Rekening</h2>
        <p className="text-sm text-neutral-500 mt-1">
          Setiap nasabah hanya dapat memiliki satu rekening tabungan haji aktif.
        </p>
        <div className="mt-4 bg-neutral-50 border border-neutral-200 rounded-lg px-4 py-3 font-mono text-sm text-neutral-700">
          {existingRek.nomorRekening.replace(/(\d{4})(\d{4})(\d+)/, "$1 $2 $3")}
        </div>
        <Link
          href="/dashboard"
          className="mt-5 px-5 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90 transition-colors flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Kembali ke Dashboard
        </Link>
      </div>
    );
  }

  /* ── Success ── */
  if (success) {
    return (
      <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-10 flex flex-col items-center text-center">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
          <span
            className="material-symbols-outlined text-[32px] text-primary"
            style={{ fontVariationSettings: '"FILL" 1' }}
          >
            check_circle
          </span>
        </div>
        <h2 className="text-lg font-semibold text-neutral-800">Rekening Berhasil Dibuka</h2>
        <p className="text-sm text-neutral-500 mt-1">
          Selamat! Rekening tabungan haji Anda telah aktif.
        </p>
        <div className="mt-4 bg-primary/5 border border-primary/20 rounded-lg px-4 py-3 font-mono text-base font-semibold text-primary">
          {success.nomorRekening.replace(/(\d{4})(\d{4})(\d+)/, "$1 $2 $3")}
        </div>
        <p className="text-xs text-neutral-400 mt-3">Mengalihkan ke dashboard...</p>
      </div>
    );
  }

  /* ── Form (belum punya rekening) ── */
  return (
    <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-neutral-100 flex items-center gap-3 bg-neutral-50/50">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: '"FILL" 1' }}>
            account_balance_wallet
          </span>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-neutral-800">Konfirmasi Pembukaan Rekening</h3>
          <p className="text-xs text-neutral-500">Periksa data Anda sebelum melanjutkan.</p>
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

      <div className="p-6 md:p-8 space-y-5">
        {/* Profil saya */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">Data Pemilik Rekening</label>
          <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4 flex items-center gap-4 relative overflow-hidden">
            <div className="absolute inset-y-0 left-0 w-1 bg-primary" />
            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg shrink-0">
              {inisial(me?.nama ?? "?")}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] uppercase tracking-wide text-neutral-400 font-medium">Nama Lengkap</p>
              <p className="text-sm font-semibold text-neutral-900 truncate">{me?.nama ?? "—"}</p>
              <p className="text-xs text-neutral-500 truncate font-mono">{me?.nik ?? "—"}</p>
              <p className="text-xs text-neutral-500 truncate">{me?.email ?? "—"}</p>
            </div>
          </div>
        </div>

        {/* Detail Rekening Baru */}
        <div className="bg-teal-50/50 border border-teal-100 rounded-lg p-5">
          <h4 className="text-sm font-semibold text-neutral-800 flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-primary text-[20px]">savings</span>
            Detail Rekening Baru
          </h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-600">Jenis</span>
              <span className="text-sm font-semibold text-neutral-900">Tabungan Haji</span>
            </div>
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
          <div className="text-sm text-blue-800 space-y-1">
            <p>• Setoran awal untuk mendapatkan nomor porsi haji adalah <span className="font-semibold">Rp 25.000.000</span>.</p>
            <p>• Anda hanya bisa memiliki satu rekening tabungan haji.</p>
            <p>• Pembukaan rekening gratis, tidak ada biaya administrasi.</p>
          </div>
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
          disabled={submitting || !me}
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

/* ─── Page ─── */
export default function BukaRekeningPage() {
  return (
    <AuthGuard>
      <div className="bg-neutral-50 text-neutral-900 antialiased flex min-h-screen">
        <AppSidebar activeHref="/dashboard" />
        <div className="flex-1 flex flex-col min-w-0">
          <AppHeader />
          <main className="flex-1 p-6 lg:p-8 bg-neutral-50">
            <div className="max-w-3xl mx-auto">
              {/* Breadcrumb + title */}
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
                      <span className="text-neutral-900 font-medium">Buka Rekening</span>
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
                    <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Buka Rekening Tabungan Haji</h1>
                    <p className="text-neutral-500 text-sm mt-0.5">Mulai perjalanan menabung untuk haji Anda hari ini.</p>
                  </div>
                </div>
              </div>

              <BukaRekeningContent />
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
