import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logout } from "@/lib/supabase/actions";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

export default async function DashboardLayout({ children }: LayoutProps<"/">) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: petugasProfile } = await supabase
    .from("petugas")
    .select("nama, role")
    .eq("id", user.id)
    .single();

  const todayLabel = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <DashboardShell
      petugasNama={petugasProfile?.nama ?? user.email ?? "Petugas"}
      role={(petugasProfile?.role as "superadmin" | "petugas") ?? "petugas"}
      todayLabel={todayLabel}
      logoutAction={logout}
    >
      {children}
    </DashboardShell>
  );
}
