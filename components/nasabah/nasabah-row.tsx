/**
 * NasabahRow — komponen baris untuk menampilkan satu nasabah.
 * Bisa dipakai di /profil (single row, sendiri) atau di list view di masa depan.
 *
 * Props: nasabah + opsional callback aksi (onEdit, onDelete).
 */
import type { Nasabah } from "@/lib/types";

function inisial(nama: string): string {
  return (nama ?? "?")
    .split(" ")
    .map((w) => w[0] ?? "")
    .join("")
    .substring(0, 2)
    .toUpperCase();
}

function tanggal(s: string): string {
  return new Date(s).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export interface NasabahRowProps {
  nasabah: Nasabah;
  variant?: "card" | "compact";
  onEdit?: () => void;
  onDelete?: () => void;
}

export default function NasabahRow({
  nasabah,
  variant = "card",
  onEdit,
  onDelete,
}: NasabahRowProps) {
  if (variant === "compact") {
    return (
      <div className="flex items-center gap-3 px-4 py-3 border-b border-neutral-100 last:border-0">
        <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
          {inisial(nasabah.nama)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-neutral-900 truncate">
            {nasabah.nama}
          </p>
          <p className="text-xs text-neutral-500 truncate font-mono">{nasabah.nik}</p>
        </div>
        <div className="hidden sm:block text-xs text-neutral-500 truncate">
          {nasabah.email}
        </div>
        {(onEdit || onDelete) && (
          <div className="flex items-center gap-1 shrink-0">
            {onEdit && (
              <button
                onClick={onEdit}
                className="p-1.5 text-neutral-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                title="Edit"
              >
                <span className="material-symbols-outlined text-[20px]">edit</span>
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                title="Hapus"
              >
                <span className="material-symbols-outlined text-[20px]">delete</span>
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  /* variant = "card" */
  return (
    <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-6 md:p-8 flex flex-col md:flex-row md:items-center gap-6">
      <div className="w-24 h-24 rounded-full bg-primary/10 text-primary flex items-center justify-center text-3xl font-bold border-4 border-white shadow-md ring-1 ring-neutral-100 shrink-0 mx-auto md:mx-0">
        {inisial(nasabah.nama)}
      </div>

      <div className="flex-1 text-center md:text-left min-w-0">
        <h3 className="text-xl font-bold text-neutral-900 truncate">{nasabah.nama}</h3>
        <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 mt-2">
          Nasabah Aktif
        </div>
        <p className="text-sm text-neutral-500 mt-2">
          Terdaftar sejak{" "}
          <span className="font-medium text-neutral-700">{tanggal(nasabah.createdAt)}</span>
        </p>
      </div>

      {(onEdit || onDelete) && (
        <div className="flex flex-col sm:flex-row gap-2 shrink-0">
          {onEdit && (
            <button
              onClick={onEdit}
              className="flex items-center justify-center gap-2 px-4 py-2.5 border border-primary text-primary rounded-lg font-medium text-sm hover:bg-primary/5 transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">edit</span>
              Edit Data
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="flex items-center justify-center gap-2 px-4 py-2.5 border border-red-200 text-red-600 rounded-lg font-medium text-sm hover:bg-red-50 transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">delete_forever</span>
              Hapus Akun
            </button>
          )}
        </div>
      )}
    </div>
  );
}
