/**
 * HTTP client wrapper untuk backend Tabungan Haji API.
 *
 * Features:
 *   - Token auto-attach dari lib/auth
 *   - Refresh token support (auto-retry on 401 UNAUTHORIZED)
 *   - Idempotency-Key auto-generation untuk POST/PUT
 *   - ApiError class dengan status + code + details per-field
 *   - Handle 204 No Content (return undefined)
 *   - Convenience methods: api.get / api.post / api.put / api.patch / api.delete
 *   - checkHealth() ping ke /health
 */
import { authHeaders, clearToken, getToken, setToken } from "./auth";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api/v1";

const HEALTH_URL = API_URL.replace(/\/api\/v\d+\/?$/, "/health");

/* ─── Helper Functions ─── */

/** Generate UUID v4 untuk Idempotency-Key */
function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Ambil refresh token dari localStorage */
function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("bsi_refresh_token") ?? null;
}

/** Simpan refresh token ke localStorage */
export function setRefreshToken(refreshToken: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("bsi_refresh_token", refreshToken);
}

/** Refresh access token menggunakan refresh token */
async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    clearToken();
    return null;
  }

  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) {
      clearToken();
      return null;
    }

    const data = (await res.json()) as { accessToken?: string };
    if (data.accessToken) {
      setToken(data.accessToken);
      return data.accessToken;
    }
    clearToken();
    return null;
  } catch (err) {
    console.error("[api] refresh token gagal", err);
    clearToken();
    return null;
  }
}

/* ─── ApiError ─── */

export type ApiErrorDetails = Record<string, string[]>;

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: ApiErrorDetails;

  constructor(
    status: number,
    message: string,
    code?: string,
    details?: ApiErrorDetails
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }

  /** Pesan pertama dari validation details, fallback ke .message */
  firstDetail(): string {
    if (this.details) {
      const first = Object.values(this.details).flat()[0];
      if (first) return first;
    }
    return this.message;
  }
}

/* ─── Core request ─── */

interface RequestOptions {
  /** Skip auto-attach Authorization header. Default false. */
  auth?: boolean;
  /** Tambahan headers / RequestInit options */
  init?: RequestInit;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  opts: RequestOptions = {},
  retryCount = 0
): Promise<T> {
  const maxRetries = 1;
  const useAuth = opts.auth !== false;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(useAuth ? (authHeaders() as Record<string, string>) : {}),
    ...(typeof opts.init?.headers === "object" ? (opts.init.headers as Record<string, string>) : {}),
  };

  // Tambahkan Idempotency-Key untuk POST/PUT jika belum ada
  if ((method === "POST" || method === "PUT") && !headers["Idempotency-Key"]) {
    headers["Idempotency-Key"] = generateUUID();
  }

  const reqInit: RequestInit = {
    method,
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    ...opts.init,
  };

  const res = await fetch(`${API_URL}${path}`, reqInit);

  /* 204 No Content (mis. DELETE sukses) */
  if (res.status === 204) {
    return undefined as T;
  }

  /* Parse body */
  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
  }

  /* Handle 401 - coba refresh token */
  if (res.status === 401) {
    const d = data as { error?: string; message?: string } | null;
    const error = d?.error ?? "";

    // Jika token revoke (truly logged out), clear dan throw error
    if (error === "TOKEN_REVOKED") {
      clearToken();
      throw new ApiError(res.status, d?.message ?? "Token sudah tidak berlaku", error, undefined);
    }

    // Jika token tidak valid/kadaluwarsa dan belum retry, coba refresh
    if (error === "UNAUTHORIZED" && retryCount < maxRetries) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        // Retry request dengan token baru
        return request<T>(method, path, body, opts, retryCount + 1);
      }
      // Refresh gagal
      throw new ApiError(res.status, d?.message ?? "Token tidak valid atau kedaluwarsa", error, undefined);
    }

    throw new ApiError(res.status, d?.message ?? `Request gagal (${res.status})`, error, undefined);
  }

  if (!res.ok) {
    const d = data as {
      message?: string;
      error?: string;
      details?: ApiErrorDetails;
    } | null;
    throw new ApiError(
      res.status,
      d?.message ?? `Request gagal (${res.status})`,
      d?.error,
      d?.details
    );
  }

  return data as T;
}

/* ─── Convenience API ─── */

export const api = {
  get: <T>(path: string, opts?: RequestOptions) =>
    request<T>("GET", path, undefined, opts),

  post: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>("POST", path, body, opts),

  put: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>("PUT", path, body, opts),

  patch: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>("PATCH", path, body, opts),

  delete: <T>(path: string, opts?: RequestOptions) =>
    request<T>("DELETE", path, undefined, opts),
};

/* ─── Health check ─── */

export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(HEALTH_URL, { cache: "no-store" });
    if (!res.ok) return false;
    const data = await res.json();
    return data?.status === "ok";
  } catch {
    return false;
  }
}
