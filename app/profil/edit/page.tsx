"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AppHeader from "@/components/layout/app-header";
import AppSidebar from "@/components/layout/app-sidebar";
import AuthGuard from "@/components/auth-guard";
import { getCurrentUser, getUserInfo, setUserInfo } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { nasabahApi, type UpdateNasabahInput } from "@/lib/nasabah";

type FormFields = UpdateNasabahInput & { nama: string; email: string; nomorHp: string };
type FieldName = "nama" | "email" | "nomorHp";
type FieldErrors = Partial<Record<FieldName, string>>;

/* Helper visual error */
function inputClass(hasError?: string): string {
  return `block w-full pl-10 pr-3 py-2.5 border rounded-lg text-sm focus:ring-2 bg-white placeholder:text-neutral-400 transition-colors disabled:opacity-60 ${
    hasError
      ? "border-red-400 focus:ring-red-500 focus:border-red-500"
      : "border-neutral-300 focus:ring-primary focus:border-primary"
  }`;
}

function FieldErrorMsg({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <p className="mt-1 text-xs text-red-600 flex items-start gap-1">
      <span className="material-symbols-outlined text-[14px] mt-px">error</span>
      <span>{msg}</span>
    </p>
  );
}

function ProfilEditContent() {
  const router = useRouter();

  const [nik, setNik] = useState("");
  const [fields, setFields] = useState<FormFields>({ nama: "", email: "", nomorHp: "" });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const u = getCurrentUser();
    if (!u) {
      setLoading(false);
      return;
    }
    nasabahApi
      .get(u.sub)
      .then((d) => {
        setNik(d.nik ?? "");
        setFields({ nama: d.nama ?? "", email: d.email ?? "", nomorHp: d.nomorHp ?? "" });
      })
      .catch(() => {
        /* AuthGuard akan handle 401 lewat fetch interceptor */
      })
      .finally(() => setLoading(false));
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setFields((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((f) => ({ ...f, [name]: undefined }));
    if (error) setError(null);
  }

  /* Map ApiError.details ke fieldErrors per-input */
  function applyValidationErrors(err: ApiError) {
    const fe: FieldErrors = {};
    if (err.details) {
      (["nama", "email", "nomorHp"] as FieldName[]).forEach((f) => {
        const msg = err.details?.[f]?.[0];
        if (msg) fe[f] = msg;
      });
    }
    setFieldErrors(fe);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const u = getCurrentUser();
    if (!u) return;
    setSaving(true);
    setError(null);
    setFieldErrors({});
    try {
      await nasabahApi.update(u.sub, fields);

      /* Update cache supaya avatar di header & data di page lain ikut update */
      const currentInfo = getUserInfo();
      if (currentInfo) {
        setUserInfo({
          ...currentInfo,
          nama: fields.nama,
          email: fields.email,
          nomorHp: fields.nomorHp,
        });
      }
      setSuccess(true);
      setTimeout(() => router.replace("/profil"), 900);
    } catch (err) {
      if (err instanceof ApiError) {
        applyValidationErrors(err);
        if (!err.details || Object.keys(err.details).length === 0) {
          setError(err.message);
        }
      } else {
        setError("Tidak dapat terhubung ke server. Periksa koneksi Anda.");
      }
      setSaving(false);
    }
  }

  return (
    <div className="bg-neutral-50 text-neutral-900 antialiased flex min-h-screen">
      <AppSidebar activeHref="/profil" />
      <div className="flex-1 flex flex-col min-w-0">
        <AppHeader />
        <main className="flex-1 p-6 lg:p-8 bg-neutral-50">
          <div className="max-w-3xl mx-auto">

            {/* Breadcrumb + Title */}
            <div className="mb-6">
              <nav className="flex text-sm text-neutral-500 mb-3">
                <ol className="inline-flex items-center gap-1">
                  <li><Link href="/profil" className="hover:text-primary transition-colors">Profil</Link></li>
                  <li className="flex items-center">
                    <span className="material-symbols-outlined text-sm mx-1">chevron_right</span>
                    <span className="text-neutral-900 font-medium">Edit</span>
                  </li>
                </ol>
              </nav>
              <div className="flex items-center gap-4">
                <Link
                  href="/profil"
                  className="w-10 h-10 rounded-full bg-white border border-neutral-200 flex items-center justify-center text-neutral-700 hover:bg-neutral-50 transition-colors shadow-sm"
                >
                  <span className="material-symbols-outlined">arrow_back</span>
                </Link>
                <div>
                  <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Edit Profil</h1>
                  <p className="text-neutral-500 text-sm mt-0.5">Perbarui data pribadi Anda.</p>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-12 text-center text-neutral-400">
                <span className="material-symbols-outlined text-3xl mb-2 block animate-spin">progress_activity</span>
                Memuat data profil...
              </div>
            ) : success ? (
              <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-12 flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <span
                    className="material-symbols-outlined text-[32px] text-primary"
                    style={{ fontVariationSettings: '"FILL" 1' }}
                  >
                    check_circle
                  </span>
                </div>
                <h2 className="text-lg font-semibold text-neutral-800">Profil Berhasil Diperbarui</h2>
                <p className="text-sm text-neutral-500 mt-1">Mengalihkan kembali ke halaman profil...</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-neutral-100 flex items-center gap-3 bg-neutral-50/50">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: '"FILL" 1' }}>edit</span>
                  </div>
                  <h3 className="text-lg font-semibold text-neutral-800">Ubah Data Pribadi</h3>
                </div>

                {error && (
                  <div className="mx-6 mt-6 flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-100">
                    <span className="material-symbols-outlined text-red-600 shrink-0 text-xl" style={{ fontVariationSettings: '"FILL" 1' }}>error</span>
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                )}

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
                          aria-invalid={!!fieldErrors.nama}
                          className={inputClass(fieldErrors.nama)}
                        />
                      </div>
                      <FieldErrorMsg msg={fieldErrors.nama} />
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
                          placeholder="email@anda.com" value={fields.email} onChange={handleChange} disabled={saving}
                          aria-invalid={!!fieldErrors.email}
                          className={inputClass(fieldErrors.email)}
                        />
                      </div>
                      <FieldErrorMsg msg={fieldErrors.email} />
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
                          aria-invalid={!!fieldErrors.nomorHp}
                          className={inputClass(fieldErrors.nomorHp)}
                        />
                      </div>
                      {fieldErrors.nomorHp ? (
                        <FieldErrorMsg msg={fieldErrors.nomorHp} />
                      ) : (
                        <p className="mt-1 text-xs text-neutral-500">Format: Diawali &apos;08&apos;, 10–13 digit.</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="px-6 py-4 bg-neutral-50/50 border-t border-neutral-100 flex items-center justify-end gap-3">
                  <Link
                    href="/profil"
                    className="px-5 py-2.5 border border-neutral-300 shadow-sm text-sm font-medium rounded-lg text-neutral-700 bg-white hover:bg-neutral-50 transition-colors"
                  >
                    Batal
                  </Link>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2.5 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-primary hover:opacity-90 transition-colors flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
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

export default function ProfilEditPage() {
  return (
    <AuthGuard>
      <ProfilEditContent />
    </AuthGuard>
  );
}
