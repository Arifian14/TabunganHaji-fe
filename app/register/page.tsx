"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isLoggedIn } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { nasabahApi, type RegisterInput } from "@/lib/nasabah";

type FieldName = "email" | "password" | "nasabahId";
type FieldErrors = Partial<Record<FieldName, string>>;

function inputClass(hasError?: string, padRight: string = "pr-3"): string {
  return `block w-full pl-10 ${padRight} py-3 border rounded-lg text-sm focus:ring-2 bg-surface-container-lowest placeholder:text-outline transition-colors disabled:opacity-60 ${
    hasError
      ? "border-red-400 focus:ring-red-500 focus:border-red-500"
      : "border-outline-variant focus:ring-primary focus:border-primary focus:bg-white"
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

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [fields, setFields] = useState<RegisterInput>({
    email: "",
    password: "",
    nasabahId: "",
  });

  /* Sudah login? Skip ke dashboard */
  useEffect(() => {
    if (isLoggedIn()) router.replace("/dashboard");
  }, [router]);

  function handleChange(name: FieldName, value: string) {
    setFields((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((f) => ({ ...f, [name]: undefined }));
    if (error) setError(null);
  }

  function applyValidationErrors(err: ApiError) {
    const fe: FieldErrors = {};
    if (err.details) {
      (["email", "password", "nasabahId"] as FieldName[]).forEach((f) => {
        const msg = err.details?.[f]?.[0];
        if (msg) fe[f] = msg;
      });
    }
    setFieldErrors(fe);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setFieldErrors({});

    /* Build payload: kosong-kan nasabahId kalau tidak diisi (jadi undefined) */
    const payload: RegisterInput = {
      email: fields.email,
      password: fields.password,
    };
    if (fields.nasabahId && fields.nasabahId.trim().length > 0) {
      payload.nasabahId = fields.nasabahId.trim();
    }

    try {
      await nasabahApi.register(payload);
      setSuccess(true);
      setTimeout(() => router.replace("/login?registered=1"), 1200);
    } catch (err) {
      if (err instanceof ApiError) {
        applyValidationErrors(err);
        if (!err.details || Object.keys(err.details).length === 0) {
          setError(err.message);
        } else if (err.details.nasabahId?.[0]) {
          /* Pesan refine yang minta nik/nama/nomorHp — info ke user */
          setError(
            "Untuk pendaftaran baru tanpa nasabahId, lengkapi data diri lebih dulu lewat halaman pendaftaran lengkap."
          );
        }
      } else {
        setError("Tidak dapat terhubung ke server. Periksa koneksi Anda.");
      }
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div
        className="min-h-screen flex flex-col justify-center items-center p-4"
        style={{
          backgroundColor: "#fafafa",
          backgroundImage: "radial-gradient(#d4d4d4 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      >
        <div className="bg-white w-full max-w-md rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.06)] border border-neutral-100 p-10 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <span
              className="material-symbols-outlined text-[32px] text-primary"
              style={{ fontVariationSettings: '"FILL" 1' }}
            >
              check_circle
            </span>
          </div>
          <h2 className="text-lg font-semibold text-neutral-800">Pendaftaran Berhasil</h2>
          <p className="text-sm text-neutral-500 mt-1">Mengalihkan ke halaman masuk...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col justify-center items-center p-4"
      style={{
        backgroundColor: "#fafafa",
        backgroundImage: "radial-gradient(#d4d4d4 1px, transparent 1px)",
        backgroundSize: "20px 20px",
      }}
    >
      <main className="w-full max-w-md flex flex-col items-center">
        <div className="bg-white w-full rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.06)] border border-neutral-100 overflow-hidden">
          <div className="h-1.5 w-full bg-primary" />

          <div className="p-8 sm:p-10">
            {/* Header */}
            <div className="flex flex-col items-center mb-8 text-center">
              <div className="h-16 w-16 mb-5 bg-primary-container rounded-full flex items-center justify-center">
                <span
                  className="material-symbols-outlined text-[32px] text-on-primary-container"
                  style={{ fontVariationSettings: '"FILL" 1' }}
                >
                  person_add
                </span>
              </div>
              <h1 className="text-2xl font-bold text-on-surface mb-1 tracking-tight">
                Daftar Akun
              </h1>
              <p className="text-sm text-on-surface-variant font-medium">
                Bank Syariah Indonesia
              </p>
            </div>

            {/* Error banner */}
            {error && (
              <div className="mb-5 flex items-start gap-3 p-3 bg-error-container rounded-lg border border-error/20">
                <span
                  className="material-symbols-outlined text-error text-xl shrink-0"
                  style={{ fontVariationSettings: '"FILL" 1' }}
                >
                  error
                </span>
                <p className="text-sm text-on-surface-variant">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-on-surface" htmlFor="email">
                  Email <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="material-symbols-outlined text-outline text-xl">mail</span>
                  </div>
                  <input
                    id="email"
                    type="email"
                    placeholder="email@anda.com"
                    required
                    value={fields.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    disabled={loading}
                    aria-invalid={!!fieldErrors.email}
                    className={inputClass(fieldErrors.email)}
                  />
                </div>
                <FieldErrorMsg msg={fieldErrors.email} />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-on-surface" htmlFor="password">
                  Kata Sandi <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="material-symbols-outlined text-outline text-xl">lock</span>
                  </div>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Minimal 8 karakter"
                    required
                    minLength={8}
                    maxLength={72}
                    value={fields.password}
                    onChange={(e) => handleChange("password", e.target.value)}
                    disabled={loading}
                    aria-invalid={!!fieldErrors.password}
                    className={inputClass(fieldErrors.password, "pr-10")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-outline hover:text-on-surface transition-colors"
                  >
                    <span className="material-symbols-outlined text-xl">
                      {showPassword ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                </div>
                <FieldErrorMsg msg={fieldErrors.password} />
              </div>

              {/* Nasabah ID (optional) */}
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-on-surface" htmlFor="nasabahId">
                  ID Nasabah <span className="text-neutral-400 font-normal">(opsional)</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="material-symbols-outlined text-outline text-xl">badge</span>
                  </div>
                  <input
                    id="nasabahId"
                    type="text"
                    placeholder="UUID nasabah jika sudah terdaftar"
                    value={fields.nasabahId ?? ""}
                    onChange={(e) => handleChange("nasabahId", e.target.value)}
                    disabled={loading}
                    aria-invalid={!!fieldErrors.nasabahId}
                    className={inputClass(fieldErrors.nasabahId)}
                  />
                </div>
                {fieldErrors.nasabahId ? (
                  <FieldErrorMsg msg={fieldErrors.nasabahId} />
                ) : (
                  <p className="mt-1 text-xs text-on-surface-variant">
                    Isi jika Anda sudah jadi nasabah BSI tapi belum punya akun digital.
                  </p>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 py-3.5 px-4 rounded-lg text-sm font-bold text-on-primary bg-primary hover:opacity-90 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
              >
                {loading ? (
                  <>
                    <span className="material-symbols-outlined text-lg">progress_activity</span>
                    Mendaftarkan...
                  </>
                ) : (
                  <>
                    Daftar
                    <span className="material-symbols-outlined text-lg">arrow_forward</span>
                  </>
                )}
              </button>

              {/* Divider */}
              <div className="relative my-1">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-neutral-200" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white px-3 text-xs text-on-surface-variant font-medium">
                    atau
                  </span>
                </div>
              </div>

              <Link
                href="/nasabah/register"
                className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-lg text-sm font-semibold text-primary border-2 border-primary hover:bg-primary/5 transition-all"
              >
                <span className="material-symbols-outlined text-lg">edit_note</span>
                Daftar Lengkap (NIK + data diri)
              </Link>

              <Link
                href="/login"
                className="block text-center text-sm text-on-surface-variant hover:text-primary font-medium transition-colors"
              >
                Sudah punya akun? Masuk
              </Link>
            </form>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-on-surface-variant/70 font-medium tracking-wide">
            © 2024 Bank Syariah Indonesia. All rights reserved.
          </p>
        </div>
      </main>
    </div>
  );
}
