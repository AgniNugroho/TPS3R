import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type UserProfile = {
  id: string;
  nama: string;
  email: string;
  role: "superadmin" | "petugas";
  created_at?: string;
};

export async function getCurrentUserWithRole(): Promise<{
  user: any | null;
  profile: UserProfile | null;
  isSuperAdmin: boolean;
}> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, profile: null, isSuperAdmin: false };
  }

  const { data: profile } = await supabase
    .from("petugas")
    .select("id, nama, email, role, created_at")
    .eq("id", user.id)
    .single();

  const userRole = (profile?.role as "superadmin" | "petugas") ?? "petugas";

  return {
    user,
    profile: profile
      ? { ...profile, role: userRole }
      : {
          id: user.id,
          nama: user.user_metadata?.nama ?? user.email ?? "Petugas",
          email: user.email ?? "",
          role: userRole,
        },
    isSuperAdmin: userRole === "superadmin",
  };
}

export async function requireAuth() {
  const { user, profile, isSuperAdmin } = await getCurrentUserWithRole();
  if (!user) {
    redirect("/login");
  }
  return { user, profile: profile!, isSuperAdmin };
}

export async function requireSuperAdmin() {
  const { user, profile, isSuperAdmin } = await getCurrentUserWithRole();
  if (!user) {
    redirect("/login");
  }
  if (!isSuperAdmin) {
    redirect("/");
  }
  return { user, profile: profile!, isSuperAdmin };
}
