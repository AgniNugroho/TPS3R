import { requireSuperAdmin } from "@/lib/permissions/rbac";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  WilayahManagementClient,
  type WilayahItem,
} from "@/components/dashboard/WilayahManagementClient";

export default async function WilayahPage() {
  const { profile } = await requireSuperAdmin();
  const supabase = await createSupabaseServerClient();

  const [{ data: wilayahData }, { data: anggotaCountData }] = await Promise.all([
    supabase.from("wilayah").select("id, nama_dusun, kode_wilayah, created_at").order("nama_dusun"),
    supabase.from("anggota").select("wilayah_id"),
  ]);

  // Hitung jumlah anggota per wilayah_id
  const countMap: Record<number, number> = {};
  (anggotaCountData ?? []).forEach((row) => {
    if (row.wilayah_id) {
      countMap[row.wilayah_id] = (countMap[row.wilayah_id] || 0) + 1;
    }
  });

  const wilayahList: WilayahItem[] = (wilayahData ?? []).map((w) => ({
    id: w.id,
    nama_dusun: w.nama_dusun,
    kode_wilayah: w.kode_wilayah,
    created_at: w.created_at,
    totalAnggota: countMap[w.id] || 0,
  }));

  return (
    <WilayahManagementClient
      currentUserNama={profile.nama}
      wilayahList={wilayahList}
    />
  );
}