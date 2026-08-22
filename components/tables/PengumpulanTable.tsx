export type PengumpulanHistoryRow = {
  id: number;
  tanggal: string;
  berat_kg: number;
  catatan: string | null;
  anggotaNama: string;
  dusunNama: string;
  petugasNama: string;
};

export function PengumpulanTable({ rows }: { rows: PengumpulanHistoryRow[] }) {
  if (rows.length === 0) {
    return <p className="heading-copy mt-4">Belum ada data pengumpulan yang tercatat.</p>;
  }

  return (
    <div className="mt-8 overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="text-left border-b border-[var(--line)]">
            <th className="py-2 pr-4 font-semibold">Tanggal</th>
            <th className="py-2 pr-4 font-semibold">Anggota</th>
            <th className="py-2 pr-4 font-semibold">Dusun</th>
            <th className="py-2 pr-4 font-semibold text-right">Berat (kg)</th>
            <th className="py-2 pr-4 font-semibold">Petugas</th>
            <th className="py-2 pr-4 font-semibold">Catatan</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-[var(--line)]">
              <td className="py-2 pr-4 whitespace-nowrap">
                {new Date(row.tanggal).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
              </td>
              <td className="py-2 pr-4">{row.anggotaNama}</td>
              <td className="py-2 pr-4">{row.dusunNama}</td>
              <td className="py-2 pr-4 text-right">{row.berat_kg.toLocaleString("id-ID")}</td>
              <td className="py-2 pr-4">{row.petugasNama}</td>
              <td className="py-2 pr-4 text-[var(--muted)]">{row.catatan ?? "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
