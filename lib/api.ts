const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api/v1"

const HEALTH_URL = API_URL.replace('api/v1','/health');

export async function checkHealth(): Promise<boolean> {
    try {
        const res = await fetch(HEALTH_URL);
        if (!res.ok) return false;
        return (await res.json())?.status === "ok";
    } catch (error) {
        return false
    }
}