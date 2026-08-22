import { requireSuperAdmin } from "@/lib/permissions/rbac";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PetugasManagementClient, type PetugasItem } from "@/components/dashboard/PetugasManagementClient";

export default async function PetugasPage() {
  const { user, profile } = await requireSuperAdmin();
  const supabase = await createSupabaseServerClient();

  const { data: petugasData } = await supabase
    .from("petugas")
    .select("id, nama, email, role, created_at")
    .order("created_at", { ascending: false });

  const petugasList: PetugasItem[] = (petugasData ?? []).map((p) => ({
    id: p.id,
    nama: p.nama,
    email: p.email,
    role: (p.role as "superadmin" | "petugas") ?? "petugas",
    created_at: p.created_at,
  }));

  return (
    <PetugasManagementClient
      currentUserNama={profile.nama}
      currentUserId={user.id}
      petugasList={petugasList}
    />
  );
}