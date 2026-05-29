"use client";

import Link from "next/link";
import { useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api/v1";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message ?? "Email atau password salah.");
        setIsLoading(false);
        return;
      }

      if (data.token) {
        localStorage.setItem("bsi_token", data.token);
      }
      window.location.href = "/dashboard";
    } catch {
      setError("Tidak dapat terhubung ke server. Periksa koneksi Anda.");
      setIsLoading(false);
    }
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

        {/* Login Card */}
        <div className="bg-white w-full rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.06)] border border-neutral-100 overflow-hidden">

          {/* Teal Top Bar */}
          <div className="h-1.5 w-full bg-primary" />

          <div className="p-8 sm:p-10">

            {/* Header */}
            <div className="flex flex-col items-center mb-8 text-center">
              <div className="h-16 w-16 mb-5 bg-primary-container rounded-full flex items-center justify-center">
                <span
                  className="material-symbols-outlined text-[32px] text-on-primary-container"
                  style={{ fontVariationSettings: '"FILL" 1' }}
                >
                  account_balance
                </span>
              </div>
              <h1 className="text-2xl font-bold text-on-surface mb-1 tracking-tight">
                Sistem Tabungan Haji
              </h1>
              <p className="text-sm text-on-surface-variant font-medium">
                Bank Syariah Indonesia
              </p>
            </div>

            {/* Error Banner */}
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

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Email */}
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-on-surface" htmlFor="email">
                  Email Petugas
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="material-symbols-outlined text-outline text-xl">mail</span>
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="petugas@bsi.co.id"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    className="block w-full pl-10 pr-3 py-3 border border-outline-variant bg-surface-container-lowest rounded-lg text-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary focus:bg-white transition-all disabled:opacity-60"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-on-surface" htmlFor="password">
                  Kata Sandi
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="material-symbols-outlined text-outline text-xl">lock</span>
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    className="block w-full pl-10 pr-10 py-3 border border-outline-variant bg-surface-container-lowest rounded-lg text-sm text-on-surface placeholder:text-outline tracking-wider focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary focus:bg-white transition-all disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-outline hover:text-on-surface transition-colors focus:outline-none"
                  >
                    <span className="material-symbols-outlined text-xl">
                      {showPassword ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center gap-2 py-3.5 px-4 rounded-lg text-sm font-bold text-on-primary bg-primary hover:opacity-90 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm group"
              >
                {isLoading ? (
                  <>
                    <span className="material-symbols-outlined text-lg">progress_activity</span>
                    Memproses...
                  </>
                ) : (
                  <>
                    Masuk
                    <span className="material-symbols-outlined text-lg group-hover:translate-x-1 transition-transform duration-200">
                      arrow_forward
                    </span>
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

              {/* Register Link Button */}
              <Link
                href="/nasabah/register"
                className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-lg text-sm font-semibold text-primary border-2 border-primary hover:bg-primary/5 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all duration-200"
              >
                <span className="material-symbols-outlined text-lg">person_add</span>
                Daftar Nasabah Baru
              </Link>
            </form>

            {/* Warning Banner */}
            <div className="mt-7 bg-red-50 rounded-lg border border-red-100 p-4 flex items-start gap-3">
              <span
                className="material-symbols-outlined text-red-600 shrink-0 text-xl"
                style={{ fontVariationSettings: '"FILL" 1' }}
              >
                warning
              </span>
              <p className="text-xs text-red-800 font-medium leading-relaxed">
                Sistem ini terenkripsi dan{" "}
                <span className="font-bold">Hanya untuk petugas BSI</span> yang berwenang.
                Akses tidak sah akan dilacak.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-xs text-on-surface-variant/70 font-medium tracking-wide">
            © 2024 Bank Syariah Indonesia. All rights reserved.
          </p>
        </div>
      </main>
    </div>
  );
}
