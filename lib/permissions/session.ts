import {
    getSupabaseServerClient,
    getSupabaseSessionClient,
} from "@/lib/supabase/server";

export type PetugasRole = "admin" | "petugas";

export type SessionContext = {
    userId: string;
    email: string | null;
    petugasId: string;
    role: PetugasRole;
    desaId: string | null;
    isAdmin: boolean;
};

/** Resolves the signed-in user's petugas record (role + desa scope). Returns null when unauthenticated. */
export async function getSessionContext(): Promise<SessionContext | null> {
    const sessionClient = await getSupabaseSessionClient();
    const {
        data: { user },
    } = await sessionClient.auth.getUser();
    if (!user) return null;

    const supabase = getSupabaseServerClient();
    const { data: petugas, error } = await supabase
        .from("petugas")
        .select("id, role, desa_id")
        .eq("user_id", user.id)
        .maybeSingle();

    if (error || !petugas) return null;

    const role = (petugas.role as PetugasRole) ?? "petugas";
    return {
        userId: user.id,
        email: user.email ?? null,
        petugasId: petugas.id as string,
        role,
        desaId: (petugas.desa_id as string | null) ?? null,
        isAdmin: role === "admin",
    };
}
