"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearToken, getToken } from "@/lib/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api/v1";

let interceptorInstalled = false;

function installFetchInterceptor() {
  if (interceptorInstalled || typeof window === "undefined") return;
  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input, init) => {
    const res = await originalFetch(input, init);
    if (res.status !== 401) return res;

    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
        ? input.toString()
        : (input as Request).url;

    if (!url.startsWith(API_BASE)) return res;
    /* Endpoint auth yang tidak boleh trigger auto-redirect:
     * - /auth/login: error 401 = invalid kredensial, biarkan form handle
     * - /auth/logout: user memang sedang logout, redirect handle sendiri */
    if (url.includes("/auth/login") || url.includes("/auth/logout")) return res;
    if (window.location.pathname.startsWith("/login")) return res;

    clearToken();
    const current = window.location.pathname + window.location.search;
    window.location.href = `/login?from=${encodeURIComponent(current)}&reason=expired`;
    return res;
  };

  interceptorInstalled = true;
}

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    console.log("[AuthGuard] initializing");
    installFetchInterceptor();
    const token = getToken();
    console.log("[AuthGuard] token exists:", !!token, "length:", token?.length ?? 0);
    
    if (!token) {
      console.log("[AuthGuard] no token, redirecting to login");
      const current = window.location.pathname + window.location.search;
      router.replace(`/login?from=${encodeURIComponent(current)}`);
      return;
    }
    console.log("[AuthGuard] token found, allowing access");
    setReady(true);
  }, [router]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="flex flex-col items-center text-neutral-400">
          <span className="material-symbols-outlined text-4xl mb-2 animate-spin">
            progress_activity
          </span>
          <p className="text-sm font-medium">Memverifikasi sesi...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
