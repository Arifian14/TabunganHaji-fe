const TOKEN_KEY = "bsi_token";

export function getToken(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(TOKEN_KEY) ?? "";
}

export function setToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
}

export function isLoggedIn(): boolean {
  return getToken().length > 0;
}

export function authHeaders(extra: Record<string, string> = {}): HeadersInit {
  const t = getToken();
  return {
    ...(t ? { Authorization: `Bearer ${t}` } : {}),
    ...extra,
  };
}

export interface JwtPayload {
  sub: string;
  email: string;
  jti?: string;
  iat?: number;
  exp?: number;
}

export function decodeToken(token: string): JwtPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const b64url = parts[1];
    const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const json = typeof atob === "function" ? atob(padded) : Buffer.from(padded, "base64").toString("utf-8");
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

export function getCurrentUser(): JwtPayload | null {
  const token = getToken();
  if (!token) return null;
  return decodeToken(token);
}
