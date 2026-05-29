"use client";

import Link from "next/link";
import { useState } from "react";

type FormState = "idle" | "loading" | "success" | "error";

type FormFields = {
  nik: string;
  nama: string;
  email: string;
  nomorHp: string;
  password: string;
};

type ApiError = { error: string; message: string };

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api/v1";

export default function RegisterForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [formState, setFormState] = useState<FormState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{ nama: string; id: string } | null>(null);
  const [fields, setFields] = useState<FormFields>({
    nik: "",
    nama: "",
    email: "",
    nomorHp: "",
    password: "",
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setFields((prev) => ({ ...prev, [name]: value }));
    if (errorMessage) setErrorMessage(null);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormState("loading");
    setErrorMessage(null);

    try {
      const res = await fetch(`${API_URL}/nasabah`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });

      const data = await res.json();

      if (!res.ok) {
        const err = data as ApiError;
        setErrorMessage(err.message ?? "Terjadi kesalahan. Silakan coba lagi.");
        setFormState("error");
        return;
      }

      setSuccessData({ nama: data.nama, id: data.id });
      setFormState("success");
    } catch {
      setErrorMessage("Tidak dapat terhubung ke server. Periksa koneksi Anda.");
      setFormState("error");
    }
  }

  /* ─── Success State ─── */
  if (formState === "success" && successData) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-neutral-100 flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: '"FILL" 1' }}>
              check_circle
            </span>
          </div>
          <h3 className="text-lg font-semibold text-neutral-800">Pendaftaran Berhasil</h3>
        </div>
        <div className="p-8 flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <span
              className="material-symbols-outlined text-[32px] text-primary"
              style={{ fontVariationSettings: '"FILL" 1' }}
            >
              person_check
            </span>
          </div>
          <div>
            <p className="text-base font-medium text-neutral-800">
              Nasabah <span className="text-primary font-bold">{successData.nama}</span> berhasil
              didaftarkan.
            </p>
            <p className="text-sm text-neutral-500 mt-1">ID Nasabah: {successData.id}</p>
          </div>
          <div className="flex gap-3 mt-2 flex-wrap justify-center">
            <Link
              href="/nasabah/register"
              onClick={() => {
                setFormState("idle");
                setSuccessData(null);
                setFields({ nik: "", nama: "", email: "", nomorHp: "", password: "" });
              }}
              className="px-5 py-2.5 border border-neutral-300 text-sm font-medium rounded-lg text-neutral-700 bg-white hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
            >
              Daftarkan Nasabah Lain
            </Link>
            <Link
              href="/nasabah"
              className="px-5 py-2.5 text-sm font-medium rounded-lg text-white bg-primary hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">groups</span>
              Lihat Daftar Nasabah
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isLoading = formState === "loading";

  /* ─── Form State ─── */
  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden"
    >
      {/* Card Header */}
      <div className="px-6 py-5 border-b border-neutral-100 flex items-center gap-3 bg-white">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
          <span
            className="material-symbols-outlined"
            style={{ fontVariationSettings: '"FILL" 1' }}
          >
            person_add
          </span>
        </div>
        <h3 className="text-lg font-semibold text-neutral-800">Data Pribadi</h3>
      </div>

      {/* Error Banner */}
      {formState === "error" && errorMessage && (
        <div className="mx-6 mt-6 flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-100">
          <span
            className="material-symbols-outlined text-red-600 shrink-0 text-xl"
            style={{ fontVariationSettings: '"FILL" 1' }}
          >
            error
          </span>
          <p className="text-sm text-red-800">{errorMessage}</p>
        </div>
      )}

      {/* Form Fields */}
      <div className="p-6 md:p-8">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* NIK */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5" htmlFor="nik">
                Nomor Induk Kependudukan (NIK) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-neutral-400 text-sm">badge</span>
                </div>
                <input
                  id="nik"
                  name="nik"
                  type="text"
                  inputMode="numeric"
                  maxLength={16}
                  pattern="\d{16}"
                  placeholder="Masukkan 16 digit NIK"
                  required
                  value={fields.nik}
                  onChange={handleChange}
                  disabled={isLoading}
                  className="block w-full pl-10 pr-3 py-2.5 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary bg-white placeholder:text-neutral-400 transition-colors disabled:opacity-60"
                />
              </div>
              <p className="mt-1 text-xs text-neutral-500">Pastikan NIK berjumlah 16 digit sesuai KTP.</p>
            </div>

            {/* Nama Lengkap */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5" htmlFor="nama">
                Nama Lengkap (Sesuai KTP) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-neutral-400 text-sm">person</span>
                </div>
                <input
                  id="nama"
                  name="nama"
                  type="text"
                  placeholder="Masukkan nama lengkap"
                  required
                  minLength={3}
                  maxLength={100}
                  value={fields.nama}
                  onChange={handleChange}
                  disabled={isLoading}
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
                  id="email"
                  name="email"
                  type="email"
                  placeholder="contoh@email.com"
                  required
                  value={fields.email}
                  onChange={handleChange}
                  disabled={isLoading}
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
                  id="nomorHp"
                  name="nomorHp"
                  type="tel"
                  pattern="^08[0-9]{8,11}$"
                  placeholder="08xxxxxxxxxx"
                  required
                  value={fields.nomorHp}
                  onChange={handleChange}
                  disabled={isLoading}
                  className="block w-full pl-10 pr-3 py-2.5 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary bg-white placeholder:text-neutral-400 transition-colors disabled:opacity-60"
                />
              </div>
              <p className="mt-1 text-xs text-neutral-500">Format: Diawali &apos;08&apos;, 10–13 digit.</p>
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5" htmlFor="password">
              Password Akun <span className="text-red-500">*</span>
            </label>
            <div className="relative max-w-lg">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="material-symbols-outlined text-neutral-400 text-sm">lock</span>
              </div>
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Buat password akun nasabah"
                required
                minLength={8}
                maxLength={72}
                value={fields.password}
                onChange={handleChange}
                disabled={isLoading}
                className="block w-full pl-10 pr-10 py-2.5 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary bg-white placeholder:text-neutral-400 transition-colors disabled:opacity-60"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-600 transition-colors"
              >
                <span className="material-symbols-outlined text-sm">
                  {showPassword ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>
            <p className="mt-1 text-xs text-neutral-500">Minimal 8 karakter.</p>
          </div>
        </div>
      </div>

      {/* Card Footer */}
      <div className="px-6 py-4 bg-neutral-50/50 border-t border-neutral-100 flex items-center justify-between gap-3">
        {/* Back to Login */}
        <Link
          href="/login"
          className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-primary transition-colors font-medium"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Kembali ke Login
        </Link>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <Link
            href="/nasabah"
            className="px-5 py-2.5 border border-neutral-300 shadow-sm text-sm font-medium rounded-lg text-neutral-700 bg-white hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
          >
            Batal
          </Link>
          <button
            type="submit"
            disabled={isLoading}
            className="px-5 py-2.5 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-primary hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <span className="material-symbols-outlined text-sm">progress_activity</span>
                Mendaftarkan...
              </>
            ) : (
              <>
                Daftar Nasabah
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
