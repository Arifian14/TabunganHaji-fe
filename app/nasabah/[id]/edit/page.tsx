"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AppHeader from "@/components/layout/app-header";
import AppSidebar from "@/components/layout/app-sidebar";
import AuthGuard from "@/components/auth-guard";

type FormFields = { nama: string; email: string; nomorHp: string };
type ApiError = { error: string; message: string; details?: Record<string, string[]> };

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api/v1";

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("bsi_token") ?? "";
}
function authHeaders() {
  const t = getToken();
  return { "Content-Type": "application/json", ...(t ? { Authorization: `Bearer ${t}` } : {}) };
}

function EditNasabahContent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [nik, setNik] = useState("");
  const [fields, setFields] = useState<FormFields>({ nama: "", email: "", nomorHp: "" });
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  /* prefill */
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_URL}/nasabah/${id}`, { headers: authHeaders() });
        if (res.status === 404) { if (!cancelled) setNotFound(true); return; }
        const d = await res.json();
        if (cancelled) return;
        setNik(d.nik ?? "");
        setFields({ nama: d.nama ?? "", email: d.email ?? "", nomorHp: d.nomorHp ?? "" });
      } catch {
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setFields((prev) => ({ ...prev, [name]: value }));
    if (error) setError(null);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/nasabah/${id}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify(fields),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err = d as ApiError;
        const detailMsg = err.details ? Object.values(err.details).flat()[0] : undefined;
        setError(detailMsg ?? err.message ?? "Gagal menyimpan perubahan.");
        setSaving(false);
        return;
      }
      setSuccess(true);
      setTimeout(() => router.push(`/nasabah/${id}`), 900);
    } catch {
      setError("Tidak dapat terhubung ke server. Periksa koneksi Anda.");
      setSaving(false);
    }
  }

  return (
    <div className="bg-neutral-50 text-neutral-900 antialiased flex min-h-screen">
      <AppSidebar activeHref="/nasabah" />
      <div className="flex-1 flex flex-col min-w-0">
        <AppHeader />
        <main className="flex-1 p-6 lg:p-8 bg-neutral-50">
          <div className="max-w-3xl mx-auto">

            {/* Breadcrumb + Title */}
            <div className="mb-6">
              <nav className="flex text-sm text-neutral-500 mb-3">
                <ol className="inline-flex items-center gap-1">
                  <li><Link href="/nasabah" className="hover:text-primary transition-colors">Manajemen Nasabah</Link></li>
                  <li className="flex items-center">
                    <span className="material-symbols-outlined text-sm mx-1">chevron_right</span>
                    <Link href={`/nasabah/${id}`} className="hover:text-primary transition-colors">Detail</Link>
                  </li>
                  <li className="flex items-center">
                    <span className="material-symbols-outlined text-sm mx-1">chevron_right</span>
                    <span className="text-neutral-900 font-medium">Edit</span>
                  </li>
                </ol>
              </nav>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => router.push(`/nasabah/${id}`)}
                  className="w-10 h-10 rounded-full bg-white border border-neutral-200 flex items-center justify-center text-neutral-700 hover:bg-neutral-50 transition-colors shadow-sm"
                >
                  <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <div>
                  <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Edit Data Nasabah</h1>
                  <p className="text-neutral-500 text-sm mt-0.5">Perbarui informasi data pribadi nasabah dengan teliti.</p>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-12 text-center text-neutral-400">
                <span className="material-symbols-outlined text-3xl mb-2 block animate-spin">progress_activity</span>
                Memuat data nasabah...
              </div>
            ) : notFound ? (
              <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-12 text-center">
                <span className="material-symbols-outlined text-5xl text-neutral-300 mb-3">person_off</span>
                <h2 className="text-lg font-semibold text-neutral-700">Nasabah tidak ditemukan</h2>
                <Link href="/nasabah" className="mt-5 inline-block px-5 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90 transition-colors">
                  Kembali ke Daftar Nasabah
                </Link>
              </div>
            ) : success ? (
              <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-12 flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-[32px] text-primary" style={{ fontVariationSettings: '"FILL" 1' }}>check_circle</span>
                </div>
                <h2 className="text-lg font-semibold text-neutral-800">Perubahan Tersimpan</h2>
                <p className="text-sm text-neutral-500 mt-1">Mengalihkan ke halaman detail...</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
                {/* Card header */}
                <div className="px-6 py-5 border-b border-neutral-100 flex items-center gap-3 bg-neutral-50/50">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: '"FILL" 1' }}>edit</span>
                  </div>
                  <h3 className="text-lg font-semibold text-neutral-800">Ubah Data Pribadi</h3>
                </div>

                {/* Error banner */}
                {error && (
                  <div className="mx-6 mt-6 flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-100">
                    <span className="material-symbols-outlined text-red-600 shrink-0 text-xl" style={{ fontVariationSettings: '"FILL" 1' }}>error</span>
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                )}

                {/* Fields */}
                <div className="p-6 md:p-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    {/* NIK (read-only) */}
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1.5" htmlFor="nik">
                        Nomor Induk Kependudukan (NIK)
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="material-symbols-outlined text-neutral-400 text-sm">lock</span>
                        </div>
                        <input
                          id="nik"
                          type="text"
                          value={nik}
                          disabled
                          readOnly
                          className="block w-full pl-10 pr-3 py-2.5 border border-neutral-200 bg-neutral-100 text-neutral-500 rounded-lg text-sm font-mono cursor-not-allowed focus:ring-0"
                        />
                      </div>
                      <p className="mt-1 text-xs text-neutral-400 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">info</span>
                        NIK tidak dapat diubah.
                      </p>
                    </div>

                    {/* Nama */}
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1.5" htmlFor="nama">
                        Nama Lengkap <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="material-symbols-outlined text-neutral-400 text-sm">person</span>
                        </div>
                        <input
                          id="nama" name="nama" type="text" required minLength={3} maxLength={100}
                          placeholder="Sesuai KTP" value={fields.nama} onChange={handleChange} disabled={saving}
                          className="block w-full pl-10 pr-3 py-2.5 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary bg-white placeholder:text-neutral-400 transition-colors disabled:opacity-60"
                        />
                      </div>
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1.5" htmlFor="email">
                        Alamat Email <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="material-symbols-outlined text-neutral-400 text-sm">mail</span>
                        </div>
                        <input
                          id="email" name="email" type="email" required
                          placeholder="contoh@email.com" value={fields.email} onChange={handleChange} disabled={saving}
                          className="block w-full pl-10 pr-3 py-2.5 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary bg-white placeholder:text-neutral-400 transition-colors disabled:opacity-60"
                        />
                      </div>
                    </div>

                    {/* Nomor HP */}
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1.5" htmlFor="nomorHp">
                        Nomor Handphone <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="material-symbols-outlined text-neutral-400 text-sm">call</span>
                        </div>
                        <input
                          id="nomorHp" name="nomorHp" type="tel" required pattern="^08[0-9]{8,11}$"
                          placeholder="08xxxxxxxxxx" value={fields.nomorHp} onChange={handleChange} disabled={saving}
                          className="block w-full pl-10 pr-3 py-2.5 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary bg-white placeholder:text-neutral-400 transition-colors disabled:opacity-60"
                        />
                      </div>
                      <p className="mt-1 text-xs text-neutral-500">Format: Diawali &apos;08&apos;, 10–13 digit.</p>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-neutral-50/50 border-t border-neutral-100 flex items-center justify-end gap-3">
                  <Link
                    href={`/nasabah/${id}`}
                    className="px-5 py-2.5 border border-neutral-300 shadow-sm text-sm font-medium rounded-lg text-neutral-700 bg-white hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
                  >
                    Batal
                  </Link>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2.5 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-primary hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {saving ? (
                      <>
                        <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                        Menyimpan...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[18px]">save</span>
                        Simpan Perubahan
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function EditNasabahPage() {
  return (
    <AuthGuard>
      <EditNasabahContent />
    </AuthGuard>
  );
}
