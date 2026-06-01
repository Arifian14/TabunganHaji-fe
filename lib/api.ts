/**
 * HTTP client wrapper untuk backend Tabungan Haji API.
 *
 * Features:
 *   - Token auto-attach dari lib/auth
 *   - ApiError class dengan status + code + details per-field (untuk validation errors)
 *   - Handle 204 No Content (return undefined)
 *   - Convenience methods: api.get / api.post / api.put / api.patch / api.delete
 *   - checkHealth() ping ke /health
 */
import { authHeaders } from "./auth";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api/v1";

const HEALTH_URL = API_URL.replace(/\/api\/v\d+\/?$/, "/health");

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
  opts: RequestOptions = {}
): Promise<T> {
  const useAuth = opts.auth !== false;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(useAuth ? authHeaders() : {}),
    ...(opts.init?.headers ?? {}),
  };

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

/* ─── Health ping ─── */

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
