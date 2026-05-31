const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api/v1";

const HEALTH_URL = API_URL.replace(/\/api\/v\d+\/?$/, "/health");

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
