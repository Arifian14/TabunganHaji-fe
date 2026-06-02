/**
 * Shared formatting utilities — Rupiah, nomor rekening, tanggal Indonesia.
 * Sebelumnya tersebar di banyak file, sekarang dipusat.
 */

export function rupiah(n: number | string): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(Number(n));
}

/** Rupiah pendek: 1.500.000.000 → "Rp 1,50 M" */
export function rupiahShort(n: number | string): string {
  const num = Number(n);
  if (num >= 1_000_000_000) return `Rp ${(num / 1_000_000_000).toFixed(2).replace(".", ",")} M`;
  if (num >= 1_000_000) return `Rp ${(num / 1_000_000).toFixed(1).replace(".", ",")} Jt`;
  return rupiah(num);
}

/** Format nomor rekening grouped: 6072811492 → "6072 8114 92" */
export function formatRek(no: string): string {
  return no?.replace(/(\d{4})(\d{4})(\d+)/, "$1 $2 $3") ?? no;
}

/** Mask nomor rekening kecuali 4 digit terakhir: → "•••• •••• 1492" */
export function formatRekMasked(no: string): string {
  if (!no) return "—";
  if (no.length < 4) return no;
  return `•••• •••• ${no.slice(-4)}`;
}

/** Tanggal panjang: "01 Juni 2026" */
export function tanggal(s: string): string {
  return new Date(s).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

/** Tanggal + jam pendek: "01 Jun 2026, 14:32" */
export function tanggalJam(s: string): string {
  return new Date(s).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Tanggal + jam tanpa tahun: "01 Jun, 14:32" */
export function tanggalJamSingkat(s: string): string {
  return new Date(s).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Inisial nama: "Ahmad Fauzi" → "AF" */
export function inisial(nama: string): string {
  return (nama ?? "?")
    .split(" ")
    .map((w) => w[0] ?? "")
    .join("")
    .substring(0, 2)
    .toUpperCase();
}

/** Hanya digit dari string */
export function onlyDigits(s: string): string {
  return s.replace(/\D/g, "");
}

/** Format nominal dengan thousand separator id-ID (untuk input number display) */
export function formatNominal(n: string | number): string {
  if (!n) return "";
  return Number(n).toLocaleString("id-ID");
}
