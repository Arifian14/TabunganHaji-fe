/**
 * Controller untuk operasi CRUD Nasabah.
 *
 * Konteks POV nasabah:
 *   - create()    → registrasi mandiri (public, tanpa auth)
 *   - get()       → baca profil sendiri
 *   - update()    → ubah data profil sendiri
 *   - remove()    → hapus akun sendiri
 *   - list()      → list 1 nasabah (diri sendiri) untuk konsistensi interface
 *
 * Semua method protected (kecuali create) butuh JWT yang valid.
 * Backend tidak (belum) enforce ownership per nasabah, jadi cek frontend
 * pakai getCurrentUser().sub sebagai ID target.
 */
import { api } from "./api";
import { API_URL } from "./api";
import { clearToken } from "./auth";
import type { Nasabah } from "./types";

/* ─── Inputs ─── */

export interface CreateNasabahInput {
  nik: string;
  nama: string;
  email: string;
  nomorHp: string;
  password: string;
}

export interface UpdateNasabahInput {
  nama?: string;
  email?: string;
  nomorHp?: string;
}

/* ─── CRUD ─── */

/** CREATE — registrasi mandiri (public, tanpa auth header) */
export function create(input: CreateNasabahInput): Promise<Nasabah> {
  return api.post<Nasabah>("/nasabah", input, { auth: false });
}

/** READ — get profil nasabah by id */
export function get(id: string): Promise<Nasabah> {
  return api.get<Nasabah>(`/nasabah/${id}`);
}

/** UPDATE — patch data nasabah by id (NIK tidak bisa diubah) */
export function update(id: string, input: UpdateNasabahInput): Promise<Nasabah> {
  return api.patch<Nasabah>(`/nasabah/${id}`, input);
}

/** DELETE — hapus akun nasabah by id (server return 200/204) */
export function remove(id: string): Promise<void> {
  return api.delete<void>(`/nasabah/${id}`);
}

/**
 * LIST — untuk POV nasabah, list adalah dirinya sendiri.
 * Mengikuti signature CRUD generic — tetap return array meskipun isinya 1 entri.
 */
export async function list(id: string): Promise<Nasabah[]> {
  const me = await get(id);
  return [me];
}

/* ─── Login (bantu auto-login setelah register) ─── */

export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginResult {
  token: string;
  nasabah: Nasabah;
}

/** LOGIN — public, return token + nasabah */
export function login(input: LoginInput): Promise<LoginResult> {
  return api.post<LoginResult>("/auth/login", input, { auth: false });
}

/** REGISTER via /auth/register — email + password + optional nasabahId */
export interface RegisterInput {
  email: string;
  password: string;
  nasabahId?: string;
  /* Wajib bila nasabahId tidak diisi */
  nik?: string;
  nama?: string;
  nomorHp?: string;
}

export function register(input: RegisterInput): Promise<{ nasabah: Nasabah }> {
  return api.post<{ nasabah: Nasabah }>("/auth/register", input, { auth: false });
}

/**
 * LOGOUT — revoke token di server (best-effort) lalu hapus local state.
 *
 * Backend tokenBlocklist memasukkan jti ke daftar revoked, jadi walaupun
 * signature JWT masih valid sampai expired, server menolaknya.
 *
 * Best-effort: kalau API call gagal (network/server down/token expired),
 * tetap lanjut clear local. UX-nya: logout selalu jalan di sisi user.
 */
export async function logout(): Promise<void> {
  try {
    await api.post<{ message: string }>("/auth/logout");
  } catch {
    /* swallow — sudah clear local di finally */
  } finally {
    clearToken();
  }
}

/* ─── Export sebagai object satu titik akses ─── */

export const nasabahApi = { list, get, create, update, remove, login, register, logout };

/* re-export API_URL biar konsumer tidak perlu import dari lib/api */
export { API_URL };
