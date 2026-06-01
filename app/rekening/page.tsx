"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AppHeader from "@/components/layout/app-header";
import AppSidebar from "@/components/layout/app-sidebar";
import AuthGuard from "@/components/auth-guard";
import { authHeaders, getCurrentUser } from "@/lib/auth";

/* ─── Types ─── */
type Status = "AKTIF" | "SUSPEND" | "TUTUP";
type Tabungan = {
  id: string;
  nomorRekening: string;
  saldo: number | string;
  status: Status;
  dibukaAt: string;
  nasabahId: string;
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
type ApiError = { error: string; message: string };

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api/v1";

/* ─── Helpers ─── */
function rupiah(n: number | string) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(Number(n));
}
function tanggal(s: string) {
  return new Date(s).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
}
function tanggalJam(s: string) {
  return new Date(s).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}
function formatRek(no: string) {
  return no?.replace(/(\d{4})(\d{4})(\d+)/, "$1 $2 $3") ?? no;
}

const STATUS_BADGE: Record<Status, string> = {
  AKTIF:   "bg-emerald-50 text-emerald-700 border-emerald-200",
  SUSPEND: "bg-amber-50 text-amber-700 border-amber-200",
  TUTUP:   "bg-red-50 text-red-700 border-red-200",
};

/* ─── Content ─── */
function RekeningContent() {
  const router = useRouter();
  const [rekening, setRekening] = useState<Tabungan | null>(null);
  const [transaksi, setTransaksi] = useState<Transaksi[]>([]);
  const [loading, setLoading] = useState(true);

  const [showStatus, setShowStatus] = useState(false);
  const [showEstimasi, setShowEstimasi] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  useEffect(() => {
    const u = getCurrentUser();
    if (!u) {
      setLoading(false);
      return;
    }
    fetch(`${API_URL}/tabungan-haji/nasabah/${u.sub}`, { headers: authHeaders() })
      .then((r) => r.json())
      .then(async (d) => {
        const list: Tabungan[] = Array.isArray(d) ? d : (d.data ?? []);
        const rek = list[0] ?? null;
        setRekening(rek);
        if (rek) {
          const txRes = await fetch(`${API_URL}/tabungan-haji/${rek.id}/transaksi`, { headers: authHeaders() });
          if (txRes.ok) {
            const td = await txRes.json();
            const txList: Transaksi[] = Array.isArray(td) ? td : (td.data ?? []);
            setTransaksi(txList);
          }
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const totalSetor = transaksi.filter((t) => t.jenis === "SETOR").reduce((s, t) => s + Number(t.nominal), 0);
  const recent = transaksi.slice(0, 5);

  return (
    <div className="bg-neutral-50 text-neutral-900 antialiased flex min-h-screen">
      <AppSidebar activeHref="/rekening" />

      {/* Modals */}
      {showStatus && rekening && (
        <StatusModal
          tabunganId={rekening.id}
          current={rekening.status}
          onClose={() => setShowStatus(false)}
          onUpdated={(s) => {
            setRekening((r) => (r ? { ...r, status: s } : r));
            setShowStatus(false);
          }}
        />
      )}
      {showEstimasi && rekening && (
        <EstimasiModal tabunganId={rekening.id} onClose={() => setShowEstimasi(false)} />
      )}
      {showDelete && rekening && (
        <DeleteRekeningModal
          rekening={rekening}
          onCancel={() => setShowDelete(false)}
          onDeleted={() => {
            setRekening(null);
            setShowDelete(false);
            router.replace("/rekening");
          }}
        />
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <AppHeader />

        <main className="flex-1 p-6 md:p-8 bg-neutral-50">
          <div className="max-w-5xl mx-auto space-y-6">

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold text-neutral-900 tracking-tight">Rekening Saya</h2>
                <p className="text-neutral-500 mt-1 text-sm">
                  Kelola rekening tabungan haji Anda di sini.
                </p>
              </div>
            </div>

            {loading ? (
              <div className="bg-white rounded-xl border border-neutral-100 shadow-sm p-12 text-center text-neutral-400">
                <span className="material-symbols-outlined text-3xl mb-2 block animate-spin">progress_activity</span>
                Memuat rekening...
              </div>
            ) : !rekening ? (
              /* ── Empty state ── */
              <div className="bg-white rounded-xl border border-dashed border-neutral-300 shadow-sm p-12 flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-5">
                  <span className="material-symbols-outlined text-[40px] text-primary" style={{ fontVariationSettings: '"FILL" 1' }}>
                    account_balance_wallet
                  </span>
                </div>
                <h3 className="text-xl font-bold text-neutral-800">Belum Ada Rekening</h3>
                <p className="text-sm text-neutral-500 mt-2 max-w-md">
                  Buka rekening tabungan haji untuk mulai menabung dan memantau estimasi keberangkatan Anda.
                </p>
                <Link
                  href="/rekening/buka"
                  className="mt-6 px-6 py-3 bg-primary text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-colors flex items-center gap-2 shadow-sm"
                >
                  <span className="material-symbols-outlined text-[20px]">add_circle</span>
                  Buka Rekening Sekarang
                </Link>
              </div>
            ) : (
              <>
                {/* Hero card */}
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
                        <div className="text-2xl font-bold tracking-widest font-mono">{formatRek(rekening.nomorRekening)}</div>
                      </div>
                      <div className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold tracking-wider border border-white/30 flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${rekening.status === "AKTIF" ? "bg-green-400" : rekening.status === "SUSPEND" ? "bg-amber-300" : "bg-red-400"}`} />
                        {rekening.status}
                      </div>
                    </div>
                    <div className="mb-2">
                      <p className="text-white/70 text-sm mb-1">Saldo Efektif</p>
                      <div className="text-4xl font-extrabold tracking-tight">{rupiah(rekening.saldo)}</div>
                    </div>
                    <p className="text-white/60 text-xs">Dibuka {tanggal(rekening.dibukaAt)}</p>
                  </div>
                </div>

                {/* Quick stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <StatBox label="Transaksi Saya" value={transaksi.length.toLocaleString("id-ID")} icon="receipt_long" tone="primary" />
                  <StatBox label="Setoran Saya" value={rupiah(totalSetor)} icon="trending_up" tone="success" />
                  <StatBox label="Status Rekening" value={rekening.status} icon="verified_user" tone={rekening.status === "AKTIF" ? "success" : rekening.status === "SUSPEND" ? "amber" : "danger"} />
                </div>

                {/* Aksi Rekening Card */}
                <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
                  <div className="px-6 py-5 border-b border-neutral-100 bg-neutral-50/50">
                    <h3 className="text-base font-semibold text-neutral-800 flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-[20px]">bolt</span>
                      Aksi Rekening
                    </h3>
                  </div>
                  <div className="p-6 grid grid-cols-2 md:grid-cols-3 gap-3">
                    <ActionTile href="/transaksi/setor" icon="add_card"   label="Setor Dana"      tone="primary" />
                    <ActionTile href="/transaksi/tarik" icon="payments"   label="Tarik Dana"      tone="amber" />
                    <ActionTile onClick={() => setShowEstimasi(true)} icon="event"       label="Estimasi Haji"   tone="info" />
                    <ActionTile onClick={() => setShowStatus(true)}   icon="edit_note"   label="Ubah Status"     tone="neutral" />
                    <ActionTile href="/transaksi"        icon="receipt_long" label="Riwayat" tone="neutral" />
                    <ActionTile onClick={() => setShowDelete(true)}   icon="delete"      label="Hapus Rekening"  tone="danger" />
                  </div>
                </div>

                {/* Recent transactions */}
                <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
                  <div className="px-6 py-5 border-b border-neutral-100 flex justify-between items-center bg-neutral-50/50">
                    <h3 className="text-base font-semibold text-neutral-800 flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-[20px]">history</span>
                      Riwayat Transaksi Terakhir
                    </h3>
                    <Link href="/transaksi" className="text-sm font-medium text-primary hover:underline">Lihat Semua</Link>
                  </div>
                  {recent.length === 0 ? (
                    <div className="px-6 py-10 text-center text-neutral-400 text-sm">
                      <span className="material-symbols-outlined text-3xl mb-2 block">receipt_long</span>
                      Belum ada transaksi.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-neutral-50 text-neutral-500 text-xs uppercase tracking-wider">
                          <tr>
                            <th className="px-6 py-3 font-medium">Waktu</th>
                            <th className="px-6 py-3 font-medium">Jenis</th>
                            <th className="px-6 py-3 font-medium text-right">Nominal</th>
                            <th className="px-6 py-3 font-medium text-right">Saldo Akhir</th>
                          </tr>
                        </thead>
                        <tbody className="text-neutral-800 divide-y divide-neutral-100">
                          {recent.map((t) => {
                            const setor = t.jenis === "SETOR";
                            return (
                              <tr key={t.id} className="hover:bg-neutral-50/50 transition-colors">
                                <td className="px-6 py-3 text-neutral-600">{tanggalJam(t.waktu)}</td>
                                <td className="px-6 py-3">
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${setor ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>
                                    <span className="material-symbols-outlined text-[14px]">{setor ? "arrow_downward" : "arrow_upward"}</span>
                                    {t.jenis}
                                  </span>
                                </td>
                                <td className={`px-6 py-3 text-right font-semibold ${setor ? "text-emerald-600" : "text-red-600"}`}>
                                  {setor ? "+ " : "- "}{rupiah(t.nominal)}
                                </td>
                                <td className="px-6 py-3 text-right font-medium text-neutral-900">{rupiah(t.saldoSesudah)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

/* ─── Small components ─── */
function StatBox({ label, value, icon, tone }: { label: string; value: string; icon: string; tone: "primary" | "success" | "amber" | "danger" }) {
  const styles = {
    primary: { bg: "bg-teal-50",    text: "text-primary" },
    success: { bg: "bg-emerald-50", text: "text-emerald-600" },
    amber:   { bg: "bg-amber-50",   text: "text-amber-600" },
    danger:  { bg: "bg-red-50",     text: "text-red-600" },
  }[tone];
  return (
    <div className="bg-white p-5 rounded-xl border border-neutral-100 shadow-sm flex items-center justify-between">
      <div>
        <p className="text-xs font-medium text-neutral-500 mb-1">{label}</p>
        <h3 className="text-xl font-bold text-neutral-900 leading-tight">{value}</h3>
      </div>
      <div className={`p-2.5 ${styles.bg} ${styles.text} rounded-lg shrink-0`}>
        <span className="material-symbols-outlined" style={{ fontVariationSettings: '"FILL" 1' }}>{icon}</span>
      </div>
    </div>
  );
}

function ActionTile({
  href, onClick, icon, label, tone,
}: {
  href?: string; onClick?: () => void; icon: string; label: string;
  tone: "primary" | "amber" | "info" | "neutral" | "danger";
}) {
  const styles = {
    primary: { border: "border-primary",      bg: "bg-primary",      text: "text-white", hover: "hover:opacity-90" },
    amber:   { border: "border-amber-300",    bg: "bg-white",        text: "text-amber-700", hover: "hover:bg-amber-50" },
    info:    { border: "border-blue-300",     bg: "bg-white",        text: "text-blue-700",  hover: "hover:bg-blue-50" },
    neutral: { border: "border-neutral-200",  bg: "bg-white",        text: "text-neutral-700", hover: "hover:bg-neutral-50" },
    danger:  { border: "border-red-200",      bg: "bg-white",        text: "text-red-600",   hover: "hover:bg-red-50" },
  }[tone];

  const className = `flex flex-col items-center justify-center gap-2 p-4 rounded-lg border-2 ${styles.border} ${styles.bg} ${styles.text} ${styles.hover} text-sm font-semibold transition-colors group`;
  const content = (
    <>
      <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: '"FILL" 1' }}>{icon}</span>
      <span className="text-center text-xs sm:text-sm">{label}</span>
    </>
  );

  if (href) return <Link href={href} className={className}>{content}</Link>;
  return <button type="button" onClick={onClick} className={className}>{content}</button>;
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
    <ModalShell onClose={onClose} maxWidth="md">
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
  tabunganId, current, onClose, onUpdated,
}: {
  tabunganId: string; current: Status;
  onClose: () => void; onUpdated: (s: Status) => void;
}) {
  const [selected, setSelected] = useState<Status>(current);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const options: Status[] = ["AKTIF", "SUSPEND", "TUTUP"];

  async function save() {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${API_URL}/tabungan-haji/${tabunganId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ status: selected }),
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
    <ModalShell onClose={onClose} maxWidth="md">
      <h3 className="text-base font-semibold text-neutral-900 mb-1">Ubah Status Rekening</h3>
      <p className="text-sm text-neutral-500 mb-4">Pilih status baru untuk rekening tabungan haji Anda.</p>
      <div className="space-y-2">
        {options.map((opt) => (
          <label key={opt} className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-colors ${selected === opt ? "border-primary bg-primary/5" : "border-neutral-200 hover:bg-neutral-50"}`}>
            <input type="radio" name="status" checked={selected === opt} onChange={() => setSelected(opt)} className="accent-primary" />
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${STATUS_BADGE[opt]}`}>{opt}</span>
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

/* ─── Delete Rekening Modal ─── */
function DeleteRekeningModal({
  rekening, onCancel, onDeleted,
}: {
  rekening: Tabungan; onCancel: () => void; onDeleted: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${API_URL}/tabungan-haji/${rekening.id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) {
        const d: ApiError = await res.json().catch(() => ({ error: "ERR", message: "" }));
        setError(d.message ?? "Gagal menghapus rekening. Pastikan saldo Rp 0 dan tidak ada transaksi.");
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
    <ModalShell onClose={onCancel} maxWidth="md">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-red-600" style={{ fontVariationSettings: '"FILL" 1' }}>warning</span>
        </div>
        <div>
          <h3 className="text-base font-semibold text-neutral-900">Hapus Rekening</h3>
          <p className="text-sm text-neutral-500 mt-1">
            Yakin ingin menghapus rekening <span className="font-mono font-semibold text-neutral-800">{formatRek(rekening.nomorRekening)}</span>?
            Tindakan ini tidak dapat dibatalkan.
          </p>
        </div>
      </div>
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 mt-4">
        <span className="font-semibold">Syarat penghapusan:</span> Saldo harus <span className="font-bold">Rp 0</span> dan tidak ada riwayat transaksi.
        Server akan menolak permintaan kalau syarat tidak terpenuhi.
      </div>
      {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
      <div className="flex justify-end gap-3 pt-5">
        <button onClick={onCancel} disabled={loading} className="px-4 py-2 text-sm font-medium border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-colors disabled:opacity-50">Batal</button>
        <button onClick={confirm} disabled={loading} className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2">
          {loading && <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>}
          Hapus Rekening
        </button>
      </div>
    </ModalShell>
  );
}

/* ─── Modal Shell ─── */
function ModalShell({ children, onClose, maxWidth = "md" }: { children: React.ReactNode; onClose: () => void; maxWidth?: "md" | "lg" }) {
  const mw = maxWidth === "lg" ? "max-w-lg" : "max-w-md";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className={`relative bg-white rounded-xl shadow-xl border border-neutral-200 w-full ${mw} p-6`}>{children}</div>
    </div>
  );
}

/* ─── Page ─── */
export default function RekeningPage() {
  return (
    <AuthGuard>
      <RekeningContent />
    </AuthGuard>
  );
}
