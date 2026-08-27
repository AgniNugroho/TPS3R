import { requireSuperAdmin } from "@/lib/permissions/rbac";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  AnggotaManagementClient,
  type AnggotaItem,
  type WilayahOption,
} from "@/components/dashboard/AnggotaManagementClient";

type AnggotaQueryRow = {
  id: number;
  nama: string;
  wilayah_id: number | null;
  alamat: string | null;
  created_at: string;
  wilayah: { nama_dusun: string } | { nama_dusun: string }[] | null;
};

export default async function AnggotaPage() {
  const { profile } = await requireSuperAdmin();
  const supabase = await createSupabaseServerClient();

  const [{ data: anggotaData }, { data: wilayahData }] = await Promise.all([
    supabase
      .from("anggota")
      .select("id, nama, wilayah_id, alamat, created_at, wilayah(nama_dusun)")
      .order("nama"),
    supabase.from("wilayah").select("id, nama_dusun").order("nama_dusun"),
  ]);

  const anggotaList: AnggotaItem[] = ((anggotaData ?? []) as AnggotaQueryRow[]).map((a) => {
    const dusun = Array.isArray(a.wilayah) ? a.wilayah[0]?.nama_dusun : a.wilayah?.nama_dusun;
    return {
      id: a.id,
      nama: a.nama,
      wilayah_id: a.wilayah_id,
      alamat: a.alamat,
      created_at: a.created_at,
      dusunNama: dusun || "Tanpa Dusun",
    };
  });

  const wilayahList: WilayahOption[] = (wilayahData ?? []).map((w) => ({
    id: w.id,
    nama_dusun: w.nama_dusun,
  }));

  return (
    <AnggotaManagementClient
      currentUserNama={profile.nama}
      anggotaList={anggotaList}
      wilayahList={wilayahList}
    />
  );
}
