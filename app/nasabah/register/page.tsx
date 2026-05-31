"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isLoggedIn } from "@/lib/auth";
import RegisterForm from "@/components/nasabah/register-form";

export default function RegisterNasabahPage() {
  const router = useRouter();

  /* Sudah login? Lompat ke dashboard. */
  useEffect(() => {
    if (isLoggedIn()) router.replace("/dashboard");
  }, [router]);

  return (
    <div
      className="min-h-screen flex flex-col py-10 px-4"
      style={{
        backgroundColor: "#fafafa",
        backgroundImage: "radial-gradient(#d4d4d4 1px, transparent 1px)",
        backgroundSize: "20px 20px",
      }}
    >
      <main className="w-full max-w-3xl mx-auto flex-1">
        {/* Brand header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="h-14 w-14 mb-4 bg-primary-container rounded-full flex items-center justify-center shadow-sm">
            <span
              className="material-symbols-outlined text-[28px] text-on-primary-container"
              style={{ fontVariationSettings: '"FILL" 1' }}
            >
              account_balance
            </span>
          </div>
          <h1 className="text-2xl font-bold text-on-surface tracking-tight">
            Daftar Akun Tabungan Haji
          </h1>
          <p className="text-sm text-on-surface-variant font-medium mt-1">
            Bank Syariah Indonesia
          </p>
          <p className="text-sm text-neutral-500 mt-3 max-w-md">
            Buat akun untuk membuka rekening tabungan haji, mencatat setoran, dan memantau estimasi
            keberangkatan Anda.
          </p>
        </div>

        {/* Form Card */}
        <RegisterForm />

        {/* Notice */}
        <div className="mt-6 bg-amber-50 rounded-lg border border-amber-200 p-4 flex items-start gap-3 max-w-3xl">
          <span
            className="material-symbols-outlined text-amber-600 shrink-0 text-xl"
            style={{ fontVariationSettings: '"FILL" 1' }}
          >
            info
          </span>
          <p className="text-xs text-amber-800 leading-relaxed">
            Data yang Anda masukkan akan disimpan dan diverifikasi oleh sistem BSI. Pastikan data
            sesuai dengan KTP — perubahan NIK setelah pendaftaran tidak dapat dilakukan.
          </p>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-on-surface-variant/70 font-medium tracking-wide">
            © 2024 Bank Syariah Indonesia. All rights reserved.
          </p>
        </div>
      </main>
    </div>
  );
}
