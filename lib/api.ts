const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api/v1";

const HEALTH_URL = API_URL.replace("api/v1", "/health");

/**
 * Generate UUID v4 untuk Idempotency-Key
 */
function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Ambil access token dari localStorage
 */
function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("bsi_token") ?? null;
}

/**
 * Ambil refresh token dari localStorage
 */
function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("bsi_refresh_token") ?? null;
}

/**
 * Simpan access token dan refresh token ke localStorage
 */
function setTokens(accessToken: string, refreshToken: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("bsi_token", accessToken);
  localStorage.setItem("bsi_refresh_token", refreshToken);
}

/**
 * Hapus tokens dari localStorage dan redirect ke login
 */
function clearTokensAndRedirect(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("bsi_token");
  localStorage.removeItem("bsi_refresh_token");
  // Redirect ke login (akan ditangani oleh layout guard atau manually)
  window.location.href = "/login";
}

/**
 * Refresh access token menggunakan refresh token
 */
async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    clearTokensAndRedirect();
    return null;
  }

  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) {
      // Jika refresh gagal, logout dan redirect
      clearTokensAndRedirect();
      return null;
    }

    const data = (await res.json()) as { accessToken: string };
    const newAccessToken = data.accessToken;
    // Update access token di localStorage
    localStorage.setItem("bsi_token", newAccessToken);
    return newAccessToken;
  } catch (err) {
    console.error("[api] refresh token gagal", err);
    clearTokensAndRedirect();
    return null;
  }
}

/**
 * Global fetch wrapper dengan:
 * - Auto-add Authorization header
 * - Auto-add Idempotency-Key untuk POST/PUT (jika belum ada)
 * - Auto-retry on 401 UNAUTHORIZED (dengan refresh token)
 * - Redirect ke login on 401 TOKEN_REVOKED atau refresh gagal
 */
export async function apiFetch(
  url: string,
  options?: RequestInit,
  retryCount = 0
): Promise<Response> {
  const maxRetries = 1; // Coba refresh hanya 1x

  // Build final URL
  const fullUrl = url.startsWith("http") ? url : `${API_URL}${url}`;

  // Siapkan headers
  const headers = new Headers(options?.headers ?? {});
  const accessToken = getAccessToken();
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  // Tambahkan Idempotency-Key untuk POST/PUT jika belum ada
  const method = (options?.method ?? "GET").toUpperCase();
  if ((method === "POST" || method === "PUT") && !headers.has("Idempotency-Key")) {
    headers.set("Idempotency-Key", generateUUID());
  }

  // Siapkan request
  const req: RequestInit = {
    ...options,
    headers,
  };

  // Kirim request
  let res = await fetch(fullUrl, req);

  // Handle 401 responses
  if (res.status === 401) {
    const body = (await res.json()) as { error?: string; message?: string };
    const error = body.error ?? "";

    // Jika token revoke, logout langsung
    if (error === "TOKEN_REVOKED") {
      console.warn("[api] token sudah direvoke, logout dan redirect ke login");
      clearTokensAndRedirect();
      return res;
    }

    // Jika token tidak valid/kadaluwarsa dan belum retry, coba refresh
    if (error === "UNAUTHORIZED" && retryCount < maxRetries) {
      console.warn("[api] token kadaluwarsa, mencoba refresh...");
      const newToken = await refreshAccessToken();
      if (newToken) {
        // Retry request dengan token baru
        return apiFetch(url, options, retryCount + 1);
      }
      // Refresh gagal → already redirected by refreshAccessToken()
      return res;
    }

    // Jika sudah retry dan masih 401, atau error lain → logout
    clearTokensAndRedirect();
  }

  return res;
}

export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(HEALTH_URL);
    if (!res.ok) return false;
    return (await res.json())?.status === "ok";
  } catch (error) {
    return false;
  }
}