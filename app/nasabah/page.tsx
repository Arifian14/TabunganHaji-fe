"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AppHeader from "@/components/layout/app-header";
import AppSidebar from "@/components/layout/app-sidebar";

/* ─── Types ─── */
type TabunganItem = {
  id: string;
  nomorRekening: string;
  saldo: number | string;
  status: "AKTIF" | "SUSPEND" | "TUTUP";
};

type Nasabah = {
  id: string;
  nik: string;
  nama: string;
  email: string;
  nomorHp: string;
  tabungan: TabunganItem[];
};

type FilterStatus = "SEMUA" | "AKTIF" | "SUSPEND" | "TUTUP" | "TANPA_REKENING";

const PAGE_SIZE = 10;
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api/v1";

/* ─── Helpers ─── */
function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("bsi_token") ?? "";
}

function toInisial(nama: string) {
  return (nama ?? "?").split(" ").map((w) => w[0] ?? "").join("").substring(0, 2).toUpperCase();
}

function formatRupiah(n: number | string) {
  const num = Number(n);
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(num);
}

const AVATAR_COLORS = [
  "bg-primary/10 text-primary border border-primary/20",
  "bg-amber-100 text-amber-700 border border-amber-200",
  "bg-blue-100 text-blue-700 border border-blue-200",
  "bg-purple-100 text-purple-700 border border-purple-200",
  "bg-teal-100 text-teal-700 border border-teal-200",
  "bg-rose-100 text-rose-700 border border-rose-200",
  "bg-indigo-100 text-indigo-700 border border-indigo-200",
  "bg-orange-100 text-orange-700 border border-orange-200",
];

function avatarColor(nama: string) {
  const hash = [...nama].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

/* ─── Status Badge ─── */
function StatusBadge({ status }: { status: "AKTIF" | "SUSPEND" | "TUTUP" | null }) {
  if (!status) return <span className="text-neutral-400 text-xs">—</span>;
  const cfg = {
    AKTIF:   "bg-green-50 text-green-700 border border-green-200",
    SUSPEND: "bg-amber-50 text-amber-700 border border-amber-200",
    TUTUP:   "bg-red-50 text-red-700 border border-red-200",
  }[status];
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${cfg}`}>
      {status}
    </span>
  );
}

/* ─── Delete Modal ─── */
function DeleteModal({
  nasabah,
  onConfirm,
  onCancel,
  loading,
}: {
  nasabah: Nasabah;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white rounded-xl shadow-xl border border-neutral-200 w-full max-w-md p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-red-600" style={{ fontVariationSettings: '"FILL" 1' }}>
              warning
            </span>
          </div>
          <div>
            <h3 className="text-base font-semibold text-neutral-900">Hapus Nasabah</h3>
            <p className="text-sm text-neutral-500 mt-1">
              Yakin ingin menghapus nasabah <span className="font-semibold text-neutral-800">{nasabah.nama}</span>?
              Tindakan ini tidak dapat dibatalkan.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-colors disabled:opacity-50"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {loading && <span className="material-symbols-outlined text-sm">progress_activity</span>}
            Hapus
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Page ─── */
export default function ManajemenNasabahPage() {
  const [nasabahList, setNasabahList]     = useState<Nasabah[]>([]);
  const [loading, setLoading]             = useState(true);
  const [search, setSearch]               = useState("");
  const [filterStatus, setFilterStatus]   = useState<FilterStatus>("SEMUA");
  const [page, setPage]                   = useState(1);
  const [toDelete, setToDelete]           = useState<Nasabah | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError]     = useState<string | null>(null);

  /* fetch list — parallel: nasabah + tabungan, merge saldo/status */
  useEffect(() => {
    const token = getToken();
    const h: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

    Promise.allSettled([
      fetch(`${API_URL}/nasabah`,        { headers: h }).then((r) => r.json()),
      fetch(`${API_URL}/tabungan-haji`,  { headers: h }).then((r) => r.json()),
    ]).then(([nasabahRes, tabunganRes]) => {
      const nasabahRaw: Omit<Nasabah, "tabungan">[] =
        nasabahRes.status === "fulfilled"
          ? Array.isArray(nasabahRes.value) ? nasabahRes.value : (nasabahRes.value.data ?? [])
          : [];

      const tabunganRaw: (TabunganItem & { nasabahId: string })[] =
        tabunganRes.status === "fulfilled"
          ? Array.isArray(tabunganRes.value) ? tabunganRes.value : (tabunganRes.value.data ?? [])
          : [];

      // Build nasabahId → tabungan map
      const tabMap = new Map<string, TabunganItem[]>();
      for (const t of tabunganRaw) {
        const existing = tabMap.get(t.nasabahId) ?? [];
        tabMap.set(t.nasabahId, [...existing, t]);
      }

      const merged: Nasabah[] = nasabahRaw.map((n) => ({
        ...n,
        tabungan: tabMap.get(n.id) ?? [],
      }));

      setNasabahList(merged);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  /* filter + search */
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return nasabahList.filter((n) => {
      const rekening = n.tabungan?.[0];
      const status   = rekening?.status ?? null;

      const matchSearch =
        !q ||
        n.nama.toLowerCase().includes(q) ||
        n.nik.includes(q) ||
        n.email.toLowerCase().includes(q) ||
        n.nomorHp.includes(q);

      const matchStatus =
        filterStatus === "SEMUA" ||
        (filterStatus === "TANPA_REKENING" && !rekening) ||
        status === filterStatus;

      return matchSearch && matchStatus;
    });
  }, [nasabahList, search, filterStatus]);

  /* pagination */
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function changeSearch(v: string) { setSearch(v); setPage(1); }
  function changeFilter(v: FilterStatus) { setFilterStatus(v); setPage(1); }

  /* delete */
  async function handleDeleteConfirm() {
    if (!toDelete) return;
    setDeleteLoading(true);
    setDeleteError(null);
    const token = getToken();
    try {
      const res = await fetch(`${API_URL}/nasabah/${toDelete.id}`, {
        method: "DELETE",
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setDeleteError(d.message ?? "Gagal menghapus nasabah.");
        return;
      }
      setNasabahList((prev) => prev.filter((n) => n.id !== toDelete.id));
      setToDelete(null);
    } catch {
      setDeleteError("Tidak dapat terhubung ke server.");
    } finally {
      setDeleteLoading(false);
    }
  }

  const from = filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to   = Math.min(page * PAGE_SIZE, filtered.length);

  return (
    <div className="bg-neutral-50 text-neutral-900 antialiased flex min-h-screen">
      <AppSidebar activeHref="/nasabah" />

      {toDelete && (
        <DeleteModal
          nasabah={toDelete}
          onConfirm={handleDeleteConfirm}
          onCancel={() => { setToDelete(null); setDeleteError(null); }}
          loading={deleteLoading}
        />
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <AppHeader />

        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-neutral-50">
          <div className="max-w-7xl mx-auto space-y-6">

            {/* Page Header */}
            <div>
              <h2 className="text-2xl font-bold text-neutral-900">Manajemen Nasabah</h2>
              <p className="text-neutral-500 mt-1 text-sm">Kelola data dan status rekening tabungan haji nasabah.</p>
            </div>

            {/* Delete Error Banner */}
            {deleteError && (
              <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-100 text-sm text-red-800">
                <span className="material-symbols-outlined text-red-600 text-xl" style={{ fontVariationSettings: '"FILL" 1' }}>error</span>
                {deleteError}
              </div>
            )}

            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              {/* Search + Filter */}
              <div className="flex flex-1 w-full sm:w-auto gap-3">
                <div className="relative flex-1 max-w-md">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-[20px]">search</span>
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => changeSearch(e.target.value)}
                    placeholder="Cari nama, NIK, email..."
                    className="w-full pl-9 pr-4 py-2 bg-white border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary shadow-sm outline-none"
                  />
                </div>
                <div className="relative min-w-[150px]">
                  <select
                    value={filterStatus}
                    onChange={(e) => changeFilter(e.target.value as FilterStatus)}
                    className="w-full appearance-none bg-white border border-neutral-300 rounded-lg py-2 pl-3 pr-8 text-sm focus:ring-2 focus:ring-primary focus:border-primary shadow-sm cursor-pointer text-neutral-700 outline-none"
                  >
                    <option value="SEMUA">Semua Status</option>
                    <option value="AKTIF">Aktif</option>
                    <option value="SUSPEND">Suspend</option>
                    <option value="TUTUP">Tutup</option>
                    <option value="TANPA_REKENING">Tanpa Rekening</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500 text-[20px]">arrow_drop_down</span>
                </div>
              </div>

              {/* CTA */}
              <Link
                href="/nasabah/register"
                className="flex items-center justify-center gap-2 bg-primary hover:opacity-90 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors shadow-sm whitespace-nowrap"
              >
                <span className="material-symbols-outlined text-[18px]">person_add</span>
                Daftar Nasabah Baru
              </Link>
            </div>

            {/* Table Card */}
            <div className="bg-white rounded-xl shadow-sm border border-neutral-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-neutral-50/50 border-b border-neutral-100 text-neutral-500 uppercase text-xs font-semibold tracking-wider">
                    <tr>
                      <th className="px-6 py-4">Nasabah</th>
                      <th className="px-6 py-4">NIK</th>
                      <th className="px-6 py-4">No. HP</th>
                      <th className="px-6 py-4">Status Rekening</th>
                      <th className="px-6 py-4 text-right">Saldo</th>
                      <th className="px-6 py-4 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 text-neutral-700">
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-neutral-400">
                          <span className="material-symbols-outlined text-3xl mb-2 block">progress_activity</span>
                          Memuat data nasabah...
                        </td>
                      </tr>
                    ) : paginated.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-neutral-400">
                          <span className="material-symbols-outlined text-3xl mb-2 block">search_off</span>
                          {search || filterStatus !== "SEMUA"
                            ? "Tidak ada nasabah yang sesuai filter."
                            : "Belum ada nasabah terdaftar."}
                        </td>
                      </tr>
                    ) : (
                      paginated.map((n) => {
                        const rekening = n.tabungan?.[0] ?? null;
                        return (
                          <tr key={n.id} className="hover:bg-neutral-50/50 transition-colors">
                            {/* Nasabah */}
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className={`h-9 w-9 rounded-full font-semibold flex items-center justify-center text-sm shrink-0 ${avatarColor(n.nama)}`}>
                                  {toInisial(n.nama)}
                                </div>
                                <div>
                                  <div className="font-medium text-neutral-900">{n.nama}</div>
                                  <div className="text-xs text-neutral-500">{n.email}</div>
                                </div>
                              </div>
                            </td>
                            {/* NIK */}
                            <td className="px-6 py-4 font-mono text-xs text-neutral-600">{n.nik}</td>
                            {/* HP */}
                            <td className="px-6 py-4">{n.nomorHp}</td>
                            {/* Status */}
                            <td className="px-6 py-4">
                              <StatusBadge status={rekening?.status ?? null} />
                            </td>
                            {/* Saldo */}
                            <td className={`px-6 py-4 text-right font-medium ${!rekening || Number(rekening.saldo) === 0 ? "text-neutral-400" : "text-neutral-900"}`}>
                              {rekening ? formatRupiah(rekening.saldo) : "—"}
                            </td>
                            {/* Aksi */}
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-center gap-1">
                                <Link
                                  href={`/nasabah/${n.id}`}
                                  className="p-1.5 text-neutral-400 hover:text-primary hover:bg-primary/5 rounded-md transition-colors"
                                  title="Lihat Detail"
                                >
                                  <span className="material-symbols-outlined text-[20px]">visibility</span>
                                </Link>
                                <Link
                                  href={`/nasabah/${n.id}/edit`}
                                  className="p-1.5 text-neutral-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                  title="Edit"
                                >
                                  <span className="material-symbols-outlined text-[20px]">edit</span>
                                </Link>
                                <button
                                  onClick={() => { setToDelete(n); setDeleteError(null); }}
                                  className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                  title="Hapus"
                                >
                                  <span className="material-symbols-outlined text-[20px]">delete</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {!loading && filtered.length > 0 && (
                <div className="bg-neutral-50/80 px-6 py-4 border-t border-neutral-100 flex items-center justify-between">
                  <span className="text-sm text-neutral-500">
                    Menampilkan <span className="font-medium text-neutral-900">{from}–{to}</span>{" "}
                    dari <span className="font-medium text-neutral-900">{filtered.length}</span> nasabah
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="p-1.5 rounded-md border border-neutral-200 bg-white text-neutral-500 hover:text-neutral-800 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                    </button>
                    {/* Page numbers */}
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let p = i + 1;
                      if (totalPages > 5) {
                        if (page <= 3) p = i + 1;
                        else if (page >= totalPages - 2) p = totalPages - 4 + i;
                        else p = page - 2 + i;
                      }
                      return (
                        <button
                          key={p}
                          onClick={() => setPage(p)}
                          className={`min-w-[32px] px-2 py-1.5 rounded-md border text-sm font-medium transition-colors ${
                            p === page
                              ? "bg-primary text-white border-primary"
                              : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
                          }`}
                        >
                          {p}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="p-1.5 rounded-md border border-neutral-200 bg-white text-neutral-500 hover:text-neutral-800 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
