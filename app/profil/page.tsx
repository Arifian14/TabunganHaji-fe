"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AppHeader from "@/components/layout/app-header";
import AppSidebar from "@/components/layout/app-sidebar";
import AuthGuard from "@/components/auth-guard";
import NasabahRow from "@/components/nasabah/nasabah-row";
import { getCurrentUser } from "@/lib/auth";
import { ApiError, api } from "@/lib/api";
import { nasabahApi } from "@/lib/nasabah";
import type { Nasabah, TabunganHaji } from "@/lib/types";

/* ─── Helpers ─── */
function tanggal(s: string) {
  return new Date(s).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
}

/* ─── Content ─── */
function ProfilContent() {
  const router = useRouter();
  const [me, setMe] = useState<Nasabah | null>(null);
  const [rekening, setRekening] = useState<TabunganHaji | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDelete, setShowDelete] = useState(false);

  useEffect(() => {
    const u = getCurrentUser();
    if (!u) {
      setLoading(false);
      return;
    }
    Promise.allSettled([
      nasabahApi.get(u.sub),
      api.get<TabunganHaji[] | { data: TabunganHaji[] }>(`/tabungan-haji/nasabah/${u.sub}`),
    ])
      .then(([naRes, rekRes]) => {
        if (naRes.status === "fulfilled") {
          setMe(naRes.value);
        }
        if (rekRes.status === "fulfilled") {
          const list: TabunganHaji[] = Array.isArray(rekRes.value)
            ? rekRes.value
            : (rekRes.value as { data?: TabunganHaji[] }).data ?? [];
          setRekening(list[0] ?? null);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-neutral-50 text-neutral-900 antialiased flex min-h-screen">
      <AppSidebar activeHref="/profil" />

      {showDelete && me && (
        <DeleteAccountModal
          nasabah={me}
          hasRekening={!!rekening}
          onCancel={() => setShowDelete(false)}
          onDeleted={async () => {
            await nasabahApi.logout();
            router.replace("/login");
          }}
        />
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <AppHeader />

        <main className="flex-1 p-6 md:p-8 bg-neutral-50">
          <div className="max-w-4xl mx-auto space-y-6">

            {/* Page Header */}
            <div>
              <h2 className="text-2xl font-bold text-neutral-900 tracking-tight">Profil Saya</h2>
              <p className="text-neutral-500 mt-1 text-sm">
                Kelola informasi pribadi Anda.
              </p>
            </div>

            {loading ? (
              <div className="bg-white rounded-xl border border-neutral-100 shadow-sm p-12 text-center text-neutral-400">
                <span className="material-symbols-outlined text-3xl mb-2 block animate-spin">progress_activity</span>
                Memuat profil...
              </div>
            ) : !me ? (
              <div className="bg-white rounded-xl border border-neutral-100 shadow-sm p-12 text-center">
                <span className="material-symbols-outlined text-5xl text-neutral-300 mb-3 block">person_off</span>
                <h2 className="text-lg font-semibold text-neutral-700">Profil tidak ditemukan</h2>
                <p className="text-sm text-neutral-500 mt-1">Sesi Anda mungkin tidak valid. Coba login ulang.</p>
              </div>
            ) : (
              <>
                {/* Profile Hero — pakai komponen NasabahRow reusable */}
                <NasabahRow
                  nasabah={me}
                  variant="card"
                  onEdit={() => router.push("/profil/edit")}
                  onDelete={() => setShowDelete(true)}
                />

                {/* Detail Card */}
                <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
                  <div className="px-6 py-5 border-b border-neutral-100 bg-neutral-50/50">
                    <h3 className="text-base font-semibold text-neutral-800 flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-[20px]">badge</span>
                      Informasi Pribadi
                    </h3>
                  </div>
                  <div className="divide-y divide-neutral-100">
                    <Field label="Nama Lengkap" value={me.nama} icon="person" />
                    <Field label="NIK (KTP)" value={me.nik} icon="badge" mono />
                    <Field label="Email" value={me.email} icon="mail" />
                    <Field label="Nomor HP" value={me.nomorHp} icon="call" />
                    <Field label="Tanggal Terdaftar" value={tanggal(me.createdAt)} icon="event" />
                    <Field label="ID Nasabah" value={me.id} icon="fingerprint" mono small />
                  </div>
                </div>

                {/* Rekening Quick Card */}
                {rekening && (
                  <div className="bg-teal-50/50 border border-teal-100 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <span className="material-symbols-outlined" style={{ fontVariationSettings: '"FILL" 1' }}>
                          account_balance_wallet
                        </span>
                      </div>
                      <div>
                        <p className="text-xs text-neutral-500">Rekening Tabungan Haji</p>
                        <p className="text-sm font-mono font-semibold text-neutral-800">
                          {rekening.nomorRekening.replace(/(\d{4})(\d{4})(\d+)/, "$1 $2 $3")}
                        </p>
                      </div>
                    </div>
                    <Link
                      href="/rekening"
                      className="text-sm font-medium text-primary hover:underline flex items-center gap-1"
                    >
                      Lihat Rekening
                      <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                    </Link>
                  </div>
                )}

                {/* Warning Card */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex items-start gap-3">
                  <span
                    className="material-symbols-outlined text-amber-600 shrink-0 text-xl"
                    style={{ fontVariationSettings: '"FILL" 1' }}
                  >
                    warning
                  </span>
                  <div className="text-sm text-amber-800">
                    <p className="font-semibold mb-1">Hati-hati dengan penghapusan akun</p>
                    <p className="text-xs leading-relaxed">
                      Menghapus akun akan menghapus seluruh data Anda secara permanen. Pastikan
                      saldo rekening telah ditarik dan rekening sudah ditutup sebelum menghapus akun.
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

/* ─── Field Row ─── */
function Field({ label, value, icon, mono, small }: { label: string; value: string; icon: string; mono?: boolean; small?: boolean }) {
  return (
    <div className="flex items-start gap-4 px-6 py-4 hover:bg-neutral-50/50 transition-colors">
      <div className="w-9 h-9 rounded-full bg-neutral-100 text-neutral-500 flex items-center justify-center shrink-0">
        <span className="material-symbols-outlined text-[18px]">{icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-neutral-500 mb-0.5">{label}</p>
        <p className={`font-medium text-neutral-900 truncate ${mono ? "font-mono" : ""} ${small ? "text-xs" : "text-sm"}`}>
          {value}
        </p>
      </div>
    </div>
  );
}

/* ─── Delete Account Modal ─── */
function DeleteAccountModal({
  nasabah,
  hasRekening,
  onCancel,
  onDeleted,
}: {
  nasabah: Nasabah;
  hasRekening: boolean;
  onCancel: () => void;
  onDeleted: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState("");

  const matchOk = confirmText.trim().toUpperCase() === "HAPUS";

  async function confirm() {
    setLoading(true);
    setError(null);
    try {
      await nasabahApi.remove(nasabah.id);
      onDeleted();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.firstDetail());
      } else {
        setError("Tidak dapat terhubung ke server.");
      }
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white rounded-xl shadow-xl border border-neutral-200 w-full max-w-md p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-red-600" style={{ fontVariationSettings: '"FILL" 1' }}>
              delete_forever
            </span>
          </div>
          <div>
            <h3 className="text-base font-semibold text-neutral-900">Hapus Akun Permanen</h3>
            <p className="text-sm text-neutral-500 mt-1">
              Anda akan menghapus akun <span className="font-semibold text-neutral-800">{nasabah.nama}</span>{" "}
              beserta semua data terkait. Tindakan ini <span className="font-bold">tidak dapat dibatalkan</span>.
            </p>
          </div>
        </div>

        {hasRekening && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
            <span className="font-semibold">Catatan:</span> Anda masih memiliki rekening tabungan haji.
            Server kemungkinan akan menolak penghapusan kalau saldo &gt; 0 atau ada riwayat transaksi.
            Tutup rekening terlebih dahulu di menu Rekening.
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-neutral-600 mb-1.5">
            Ketik <span className="font-bold text-red-600">HAPUS</span> untuk konfirmasi
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="HAPUS"
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-colors disabled:opacity-50"
          >
            Batal
          </button>
          <button
            onClick={confirm}
            disabled={loading || !matchOk}
            className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {loading && <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>}
            Hapus Permanen
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Page ─── */
export default function ProfilPage() {
  return (
    <AuthGuard>
      <ProfilContent />
    </AuthGuard>
  );
}
