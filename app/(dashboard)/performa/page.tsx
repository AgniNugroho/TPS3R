import { requireSuperAdmin } from "@/lib/permissions/rbac";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  PerformaManagementClient,
  type TableStat,
} from "@/components/dashboard/PerformaManagementClient";

export default async function PerformaPage() {
  const { profile } = await requireSuperAdmin();
  const supabase = await createSupabaseServerClient();

  const startTime = Date.now();

  const [
    { count: totalPetugas },
    { count: totalWilayah },
    { count: totalAnggota },
  ] = await Promise.all([
    supabase.from("petugas").select("id", { count: "exact", head: true }),
    supabase.from("wilayah").select("id", { count: "exact", head: true }),
    supabase.from("anggota").select("id", { count: "exact", head: true }),
  ]);

  const latencyMs = Date.now() - startTime;

  const tableStats: TableStat[] = [
    {
      tableName: "petugas",
      rowCount: totalPetugas ?? 0,
      description: "Data akun profil petugas lapangan dan superadmin.",
      badgeTone: "teal",
    },
    {
      tableName: "wilayah",
      rowCount: totalWilayah ?? 0,
      description: "Daftar dusun dan kode wilayah layanan TPS3R.",
      badgeTone: "blue",
    },
    {
      tableName: "anggota",
      rowCount: totalAnggota ?? 0,
      description: "Data kepala keluarga/warga nasabah TPS3R.",
      badgeTone: "lime",
    },
  ];

  const serviceRoleKeyConfigured = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const supabaseUrlConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);

  return (
    <PerformaManagementClient
      currentUserNama={profile.nama}
      initialLatencyMs={latencyMs}
      tableStats={tableStats}
      serviceRoleKeyConfigured={serviceRoleKeyConfigured}
      supabaseUrlConfigured={supabaseUrlConfigured}
    />
  );
}
