"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AppHeader from "@/components/layout/app-header";
import AppSidebar from "@/components/layout/app-sidebar";

/* ─── Types ─── */
type Status = "AKTIF" | "SUSPEND" | "TUTUP";

type Tabungan = {
  id: string;
  nomorRekening: string;
  saldo: number | string;
  status: Status;
  dibukaAt: string;
};

type Nasabah = {
  id: string;
  nik: string;
  nama: string;
  email: string;
  nomorHp: string;
  createdAt: string;
  tabungan: Tabungan[];
};

type Transaksi = {
  id: string;
  jenis: "SETOR" | "TARIK";
  nominal: number | string;
  saldoSesudah: number | string;
  waktu: string;
};

type Estimasi = {
  setoranAwalMinimal: number | string;
  sudahMemenuhiSetoranAwal: boolean;
  kekuranganSetoran: number | string;
  nomorPorsi: number;
  kuotaTahunan: number;
  tahunSekarang: number;
  tahunTunggu: number | null;
  estimasiTahunBerangkat: number | null;
};

/* ─── Helpers ─── */
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api/v1";

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("bsi_token") ?? "";
}
function authHeaders(extra: Record<string, string> = {}) {
  const t = getToken();
  return { "Content-Type": "application/json", ...(t ? { Authorization: `Bearer ${t}` } : {}), ...extra };
}
function rupiah(n: number | string) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(Number(n));
}
function tanggal(s: string) {
  return new Date(s).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}
function tanggalJam(s: string) {
  return new Date(s).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
function inisial(nama: string) {
  return (nama ?? "?").split(" ").map((w) => w[0] ?? "").join("").substring(0, 2).toUpperCase();
}
function formatRek(no: string) {
  return no?.replace(/(\d{4})(\d{4})(\d+)/, "$1 $2 $3") ?? no;
}

const STATUS_BADGE: Record<Status, string> = {
  AKTIF:   "bg-green-50 text-green-700 border border-green-200",
  SUSPEND: "bg-amber-50 text-amber-700 border border-amber-200",
  TUTUP:   "bg-red-50 text-red-700 border border-red-200",
};

/* ─── Page ─── */
export default function DetailNasabahPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [nasabah, setNasabah]   = useState<Nasabah | null>(null);
  const [transaksi, setTransaksi] = useState<Transaksi[]>([]);
  const [loading, setLoading]   = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [showDelete, setShowDelete] = useState(false);
  const [showEstimasi, setShowEstimasi] = useState(false);
  const [showStatus, setShowStatus] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const rekening = nasabah?.tabungan?.[0] ?? null;

  /* fetch detail + transaksi */
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_URL}/nasabah/${id}`, { headers: authHeaders() });
        if (res.status === 404) { if (!cancelled) setNotFound(true); return; }
        const data: Nasabah = await res.json();
        if (cancelled) return;
        setNasabah(data);

        const rek = data.tabungan?.[0];
        if (rek) {
          const txRes = await fetch(`${API_URL}/tabungan-haji/${rek.id}/transaksi`, { headers: authHeaders() });
          if (txRes.ok) {
            const txData = await txRes.json();
            const list: Transaksi[] = Array.isArray(txData) ? txData : (txData.data ?? []);
            if (!cancelled) setTransaksi(list);
          }
        }
      } catch {
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  /* ─── Loading / Not Found ─── */
  if (loading) {
    return (
      <Shell>
        <div className="flex items-center justify-center py-32 text-neutral-400">
          <span className="material-symbols-outlined text-3xl mr-2 animate-spin">progress_activity</span>
          Memuat detail nasabah...
        </div>
      </Shell>
    );
  }
  if (notFound || !nasabah) {
    return (
      <Shell>
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <span className="material-symbols-outlined text-5xl text-neutral-300 mb-3">person_off</span>
          <h2 className="text-lg font-semibold text-neutral-700">Nasabah tidak ditemukan</h2>
          <p className="text-sm text-neutral-500 mt-1">Data nasabah tidak tersedia atau telah dihapus.</p>
          <Link href="/nasabah" className="mt-5 px-5 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90 transition-colors">
            Kembali ke Daftar Nasabah
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      {/* Modals */}
      {showDelete && (
        <DeleteModal
          nasabah={nasabah}
          hasRekening={!!rekening}
          onCancel={() => { setShowDelete(false); setActionError(null); }}
          onDeleted={() => router.push("/nasabah")}
          error={actionError}
          setError={setActionError}
        />
      )}
      {showEstimasi && rekening && (
        <EstimasiModal tabunganId={rekening.id} onClose={() => setShowEstimasi(false)} />
      )}
      {showStatus && rekening && (
        <StatusModal
          tabunganId={rekening.id}
          current={rekening.status}
          onClose={() => { setShowStatus(false); setActionError(null); }}
          onUpdated={(s) => {
            setNasabah((prev) => prev ? { ...prev, tabungan: prev.tabungan.map((t) => t.id === rekening.id ? { ...t, status: s } : t) } : prev);
            setShowStatus(false);
          }}
          error={actionError}
          setError={setActionError}
        />
      )}

      {/* Breadcrumb + Header */}
      <div className="mb-8">
        <nav className="flex text-sm text-neutral-500 mb-4">
          <ol className="inline-flex items-center gap-1">
            <li><Link href="/nasabah" className="hover:text-primary transition-colors">Manajemen Nasabah</Link></li>
            <li className="flex items-center">
              <span className="material-symbols-outlined text-sm mx-1">chevron_right</span>
              <span className="text-neutral-900 font-medium">Detail Nasabah</span>
            </li>
          </ol>
        </nav>
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/nasabah")}
            className="w-10 h-10 rounded-full bg-white border border-neutral-200 flex items-center justify-center text-neutral-700 hover:bg-neutral-50 transition-colors shadow-sm"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Detail Nasabah</h1>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT: Profile */}
        <div className="col-span-1 flex flex-col gap-6">
          <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-6 flex flex-col">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-24 h-24 rounded-full bg-primary/10 text-primary flex items-center justify-center text-3xl font-bold border-4 border-white shadow-md mb-4 ring-1 ring-neutral-100">
                {inisial(nasabah.nama)}
              </div>
              <h2 className="text-xl font-bold text-neutral-900">{nasabah.nama}</h2>
              <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 mt-2">
                Nasabah Reguler
              </div>
            </div>
            <div className="space-y-4 mb-8 flex-1">
              <Field label="NIK" value={nasabah.nik} mono />
              <Divider />
              <Field label="Email" value={nasabah.email} />
              <Divider />
              <Field label="Nomor HP" value={nasabah.nomorHp} />
              <Divider />
              <Field label="Tanggal Terdaftar" value={tanggal(nasabah.createdAt)} />
            </div>
            <div className="flex gap-3 mt-auto">
              <Link
                href={`/nasabah/${nasabah.id}/edit`}
                className="flex-1 py-2.5 px-4 border border-primary text-primary rounded-lg font-medium text-sm hover:bg-primary/5 transition-colors flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">edit</span>
                Edit Data
              </Link>
              <button
                onClick={() => { setShowDelete(true); setActionError(null); }}
                className="py-2.5 px-4 border border-red-200 text-red-600 rounded-lg font-medium text-sm hover:bg-red-50 transition-colors flex items-center justify-center"
                title="Hapus Nasabah"
              >
                <span className="material-symbols-outlined text-sm">delete</span>
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT: Savings + History */}
        <div className="col-span-1 lg:col-span-2 flex flex-col gap-6">

          {rekening ? (
            <div
              className="rounded-xl shadow-md p-6 relative overflow-hidden text-white"
              style={{ background: "linear-gradient(to bottom right, #006a62, #1e4f4c)" }}
            >
              <div className="absolute top-0 right-0 opacity-10 pointer-events-none">
                <div className="w-48 h-48 rounded-full bg-white -mr-12 -mt-12" />
              </div>
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-white/70 text-sm font-medium mb-1">Rekening Tabungan Haji</h3>
                    <div className="text-xl font-bold tracking-widest">{formatRek(rekening.nomorRekening)}</div>
                  </div>
                  <div className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold tracking-wider border border-white/30 flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${rekening.status === "AKTIF" ? "bg-green-400" : rekening.status === "SUSPEND" ? "bg-amber-300" : "bg-red-400"}`} />
                    {rekening.status}
                  </div>
                </div>
                <div className="mb-8">
                  <p className="text-white/70 text-sm mb-1">Saldo Efektif</p>
                  <div className="text-4xl font-extrabold tracking-tight">{rupiah(rekening.saldo)}</div>
                  <p className="text-white/60 text-xs mt-2">Dibuka {tanggal(rekening.dibukaAt)}</p>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-4 mt-6 pt-6 border-t border-white/20">
                  <div className="flex flex-wrap gap-3">
                    <Link href={`/transaksi/setor?tabungan=${rekening.id}`} className="bg-white text-primary px-5 py-2.5 rounded-lg font-bold text-sm shadow-sm hover:bg-neutral-50 transition-colors flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px]">add_card</span>
                      Setor Dana
                    </Link>
                    <Link href={`/transaksi/tarik?tabungan=${rekening.id}`} className="bg-white/10 backdrop-blur-sm border border-white/30 text-white px-5 py-2.5 rounded-lg font-medium text-sm hover:bg-white/20 transition-colors flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px]">payments</span>
                      Tarik Dana
                    </Link>
                    <button onClick={() => setShowEstimasi(true)} className="bg-white/10 backdrop-blur-sm border border-white/30 text-white px-5 py-2.5 rounded-lg font-medium text-sm hover:bg-white/20 transition-colors flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px]">event</span>
                      Estimasi Haji
                    </button>
                  </div>
                  <div className="flex items-center gap-4 text-sm font-medium text-white/80">
                    <button onClick={() => setShowStatus(true)} className="hover:text-white underline-offset-4 hover:underline transition-all">Ubah Status</button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* No rekening */
            <div className="bg-white rounded-xl border border-dashed border-neutral-300 shadow-sm p-10 flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-full bg-neutral-100 flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-neutral-400 text-2xl">account_balance_wallet</span>
              </div>
              <h3 className="text-lg font-semibold text-neutral-800">Belum Ada Rekening Tabungan Haji</h3>
              <p className="text-sm text-neutral-500 mt-1 mb-5">Nasabah ini belum membuka rekening tabungan haji.</p>
              <Link href={`/rekening/buka?nasabah=${nasabah.id}`} className="px-5 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90 transition-colors flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">add</span>
                Buka Rekening
              </Link>
            </div>
          )}

          {/* Transaction History */}
          {rekening && (
            <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden flex-1 flex flex-col">
              <div className="px-6 py-5 border-b border-neutral-100 flex justify-between items-center bg-neutral-50/50">
                <h3 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">history</span>
                  Riwayat Transaksi Terakhir
                </h3>
                <Link href={`/transaksi?tabungan=${rekening.id}`} className="text-sm font-medium text-primary hover:underline transition-colors">Lihat Semua</Link>
              </div>
              {transaksi.length === 0 ? (
                <div className="px-6 py-12 text-center text-neutral-400 text-sm">
                  <span className="material-symbols-outlined text-3xl mb-2 block">receipt_long</span>
                  Belum ada transaksi pada rekening ini.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-neutral-50 text-neutral-500 text-xs uppercase tracking-wider">
                        <th className="px-6 py-4 font-medium border-b border-neutral-200">Tanggal</th>
                        <th className="px-6 py-4 font-medium border-b border-neutral-200">Jenis</th>
                        <th className="px-6 py-4 font-medium border-b border-neutral-200 text-right">Nominal</th>
                        <th className="px-6 py-4 font-medium border-b border-neutral-200 text-right">Saldo Akhir</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm text-neutral-800 divide-y divide-neutral-100">
                      {transaksi.map((t) => {
                        const setor = t.jenis === "SETOR";
                        return (
                          <tr key={t.id} className="hover:bg-neutral-50/50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-neutral-600">{tanggalJam(t.waktu)}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-bold border ${setor ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}>
                                {t.jenis}
                              </span>
                            </td>
                            <td className={`px-6 py-4 whitespace-nowrap text-right font-medium ${setor ? "text-green-600" : "text-red-600"}`}>
                              {setor ? "+ " : "- "}{rupiah(t.nominal)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right font-semibold">{rupiah(t.saldoSesudah)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}

/* ─── Layout Shell ─── */
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-neutral-50 text-neutral-900 antialiased flex min-h-screen">
      <AppSidebar activeHref="/nasabah" />
      <div className="flex-1 flex flex-col min-w-0">
        <AppHeader />
        <main className="flex-1 p-6 lg:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}

/* ─── Small components ─── */
function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs text-neutral-500 mb-1">{label}</p>
      <p className={`text-sm font-medium text-neutral-900 ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}
function Divider() {
  return <div className="w-full h-px bg-neutral-100" />;
}

/* ─── Delete Modal ─── */
function DeleteModal({
  nasabah, hasRekening, onCancel, onDeleted, error, setError,
}: {
  nasabah: Nasabah; hasRekening: boolean;
  onCancel: () => void; onDeleted: () => void;
  error: string | null; setError: (s: string | null) => void;
}) {
  const [loading, setLoading] = useState(false);
  async function confirm() {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${API_URL}/nasabah/${nasabah.id}`, { method: "DELETE", headers: authHeaders() });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.message ?? "Gagal menghapus nasabah.");
        setLoading(false);
        return;
      }
      onDeleted();
    } catch {
      setError("Tidak dapat terhubung ke server.");
      setLoading(false);
    }
  }
  return (
    <ModalShell onClose={onCancel}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-red-600" style={{ fontVariationSettings: '"FILL" 1' }}>warning</span>
        </div>
        <div>
          <h3 className="text-base font-semibold text-neutral-900">Hapus Nasabah</h3>
          <p className="text-sm text-neutral-500 mt-1">
            Yakin ingin menghapus <span className="font-semibold text-neutral-800">{nasabah.nama}</span>? Tindakan ini tidak dapat dibatalkan.
          </p>
          {hasRekening && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1.5 mt-2">
              Nasabah masih memiliki rekening — penghapusan kemungkinan ditolak server.
            </p>
          )}
        </div>
      </div>
      {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
      <div className="flex justify-end gap-3 pt-4">
        <button onClick={onCancel} disabled={loading} className="px-4 py-2 text-sm font-medium border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-colors disabled:opacity-50">Batal</button>
        <button onClick={confirm} disabled={loading} className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2">
          {loading && <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>}
          Hapus
        </button>
      </div>
    </ModalShell>
  );
}

/* ─── Estimasi Modal ─── */
function EstimasiModal({ tabunganId, onClose }: { tabunganId: string; onClose: () => void }) {
  const [data, setData] = useState<Estimasi | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/tabungan-haji/${tabunganId}/estimasi`, { headers: authHeaders() });
        const d = await res.json();
        if (!res.ok) { setErr(d.message ?? "Gagal memuat estimasi."); return; }
        setData(d.estimasi ?? d);
      } catch { setErr("Tidak dapat terhubung ke server."); }
      finally { setLoading(false); }
    })();
  }, [tabunganId]);

  return (
    <ModalShell onClose={onClose}>
      <div className="flex items-center gap-2 mb-4">
        <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: '"FILL" 1' }}>event</span>
        <h3 className="text-base font-semibold text-neutral-900">Estimasi Keberangkatan Haji</h3>
      </div>
      {loading ? (
        <div className="py-8 text-center text-neutral-400 text-sm">
          <span className="material-symbols-outlined text-2xl animate-spin block mb-1">progress_activity</span>
          Menghitung estimasi...
        </div>
      ) : err ? (
        <p className="text-sm text-red-600 py-4">{err}</p>
      ) : data && (
        <div className="space-y-4">
          {data.sudahMemenuhiSetoranAwal ? (
            <div className="text-center bg-primary/5 border border-primary/20 rounded-xl p-5">
              <p className="text-sm text-neutral-500">Perkiraan Tahun Keberangkatan</p>
              <p className="text-4xl font-extrabold text-primary mt-1">{data.estimasiTahunBerangkat}</p>
              <p className="text-xs text-neutral-500 mt-1">± {data.tahunTunggu} tahun lagi dari {data.tahunSekarang}</p>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
              <span className="material-symbols-outlined text-amber-600 shrink-0" style={{ fontVariationSettings: '"FILL" 1' }}>info</span>
              <div>
                <p className="text-sm font-medium text-amber-800">Saldo belum memenuhi setoran awal porsi</p>
                <p className="text-xs text-amber-700 mt-1">Kekurangan {rupiah(data.kekuranganSetoran)} dari minimal {rupiah(data.setoranAwalMinimal)}.</p>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <InfoBox label="Setoran Awal Minimal" value={rupiah(data.setoranAwalMinimal)} />
            <InfoBox label="Kuota Tahunan" value={`${data.kuotaTahunan.toLocaleString("id-ID")} jemaah`} />
            <InfoBox label="Nomor Porsi" value={data.nomorPorsi.toLocaleString("id-ID")} />
            <InfoBox label="Tahun Sekarang" value={String(data.tahunSekarang)} />
          </div>
          <p className="text-xs text-neutral-400 text-center">Estimasi bersifat indikatif dan dapat berubah sesuai kebijakan kuota pemerintah.</p>
        </div>
      )}
      <div className="flex justify-end pt-5">
        <button onClick={onClose} className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:opacity-90 transition-colors">Tutup</button>
      </div>
    </ModalShell>
  );
}
function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-neutral-50 border border-neutral-100 rounded-lg px-3 py-2">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="text-sm font-semibold text-neutral-800 mt-0.5">{value}</p>
    </div>
  );
}

/* ─── Status Modal ─── */
function StatusModal({
  tabunganId, current, onClose, onUpdated, error, setError,
}: {
  tabunganId: string; current: Status;
  onClose: () => void; onUpdated: (s: Status) => void;
  error: string | null; setError: (s: string | null) => void;
}) {
  const [selected, setSelected] = useState<Status>(current);
  const [loading, setLoading] = useState(false);
  const options: Status[] = ["AKTIF", "SUSPEND", "TUTUP"];

  async function save() {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${API_URL}/tabungan-haji/${tabunganId}/status`, {
        method: "PATCH", headers: authHeaders(), body: JSON.stringify({ status: selected }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.message ?? "Gagal mengubah status.");
        setLoading(false);
        return;
      }
      onUpdated(selected);
    } catch {
      setError("Tidak dapat terhubung ke server.");
      setLoading(false);
    }
  }

  return (
    <ModalShell onClose={onClose}>
      <h3 className="text-base font-semibold text-neutral-900 mb-1">Ubah Status Rekening</h3>
      <p className="text-sm text-neutral-500 mb-4">Pilih status baru untuk rekening tabungan haji.</p>
      <div className="space-y-2">
        {options.map((opt) => (
          <label key={opt} className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-colors ${selected === opt ? "border-primary bg-primary/5" : "border-neutral-200 hover:bg-neutral-50"}`}>
            <input type="radio" name="status" checked={selected === opt} onChange={() => setSelected(opt)} className="accent-primary" />
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[opt]}`}>{opt}</span>
            {opt === current && <span className="text-xs text-neutral-400 ml-auto">saat ini</span>}
          </label>
        ))}
      </div>
      {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
      <div className="flex justify-end gap-3 pt-5">
        <button onClick={onClose} disabled={loading} className="px-4 py-2 text-sm font-medium border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-colors disabled:opacity-50">Batal</button>
        <button onClick={save} disabled={loading || selected === current} className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:opacity-90 transition-colors disabled:opacity-50 flex items-center gap-2">
          {loading && <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>}
          Simpan
        </button>
      </div>
    </ModalShell>
  );
}

/* ─── Modal Shell ─── */
function ModalShell({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl border border-neutral-200 w-full max-w-md p-6">{children}</div>
    </div>
  );
}
