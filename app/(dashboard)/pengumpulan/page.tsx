import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import WasteFlowForm from "@/components/forms/WasteFlowForms";
import { PengumpulanTable, type PengumpulanHistoryRow } from "@/components/tables/PengumpulanTable";

type HistoryRow = {
  id: number;
  tanggal: string;
  berat_kg: number;
  catatan: string | null;
  petugas_id: string;
  anggota: { nama: string } | { nama: string }[] | null;
  wilayah: { nama_dusun: string } | { nama_dusun: string }[] | null;
  petugas: { nama: string } | { nama: string }[] | null;
};

function getJoinedName(rel: { nama: string } | { nama: string }[] | null | undefined): string {
  if (!rel) return "-";
  return Array.isArray(rel) ? rel[0]?.nama ?? "-" : rel.nama ?? "-";
}

function getJoinedDusun(rel: { nama_dusun: string } | { nama_dusun: string }[] | null | undefined): string {
  if (!rel) return "-";
  return Array.isArray(rel) ? rel[0]?.nama_dusun ?? "-" : rel.nama_dusun ?? "-";
}

export default async function PengumpulanPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: historyData } = await supabase
    .from("pengumpulan")
    .select("id, tanggal, berat_kg, catatan, petugas_id, anggota(nama), wilayah(nama_dusun), petugas(nama)")
    .order("created_at", { ascending: false })
    .limit(20);

  const historyRows: PengumpulanHistoryRow[] = ((historyData ?? []) as HistoryRow[]).map((row) => ({
    id: row.id,
    tanggal: row.tanggal,
    berat_kg: row.berat_kg,
    catatan: row.catatan,
    petugasId: row.petugas_id,
    anggotaNama: getJoinedName(row.anggota),
    dusunNama: getJoinedDusun(row.wilayah),
    petugasNama: getJoinedName(row.petugas),
  }));

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">INPUT OPERASIONAL</p>
          <h1>Total Sampah Masuk</h1>
          <p className="heading-copy">Catat satu total berat dan asal sampah.</p>
        </div>
      </div>

      <WasteFlowForm mode="incoming" />

      {historyRows.length > 0 && (
        <>
          <h2 className="mt-10 mb-2 font-semibold">Riwayat pengumpulan (20 terbaru)</h2>
          <PengumpulanTable rows={historyRows} currentPetugasId={user.id} />
        </>
      )}
    </>
  );
}
