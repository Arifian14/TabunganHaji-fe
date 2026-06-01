/**
 * Central type definitions untuk seluruh aplikasi.
 * Semua type konsisten camelCase (FE & BE pakai konvensi yang sama).
 */

export type Status = "AKTIF" | "SUSPEND" | "TUTUP";
export type JenisTransaksi = "SETOR" | "TARIK";

export interface Nasabah {
  id: string;
  nik: string;
  nama: string;
  email: string;
  nomorHp: string;
  createdAt: string;
  updatedAt?: string;
  tabungan?: TabunganHaji[];
}

export interface TabunganHaji {
  id: string;
  nasabahId: string;
  nomorRekening: string;
  /** BigInt di backend, dikirim sebagai string saat di-serialize JSON */
  saldo: number | string;
  status: Status;
  dibukaAt: string;
  nasabah?: Nasabah;
}

export interface Transaksi {
  id: string;
  tabunganId: string;
  jenis: JenisTransaksi;
  nominal: number | string;
  saldoSebelum?: number | string;
  saldoSesudah: number | string;
  referensi: string;
  metode?: string;
  waktu: string;
  tabungan?: TabunganHaji;
}

export interface Estimasi {
  setoranAwalMinimal: number | string;
  sudahMemenuhiSetoranAwal: boolean;
  kekuranganSetoran: number | string;
  nomorPorsi: number;
  kuotaTahunan: number;
  tahunSekarang: number;
  tahunTunggu: number | null;
  estimasiTahunBerangkat: number | null;
}

/** Response generic untuk endpoint list */
export interface ListResponse<T> {
  data: T[];
  total: number;
}

/** Response autentikasi login */
export interface AuthResponse {
  token: string;
  nasabah: Nasabah;
}
