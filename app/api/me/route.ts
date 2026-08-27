import { NextResponse } from "next/server";
import { getSessionContext } from "@/lib/permissions/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
    const session = await getSessionContext();
    if (!session) {
        return NextResponse.json(
            { ok: false, error: "Belum login." },
            { status: 401 },
        );
    }

    const supabase = getSupabaseServerClient();
    const { data: petugas } = await supabase
        .from("petugas")
        .select("nama, desa:desa_id (nama)")
        .eq("id", session.petugasId)
        .maybeSingle();

    const nama = (petugas?.nama as string | undefined) ?? "Pengguna";
    const desaNama =
        (petugas?.desa as { nama?: string } | null | undefined)?.nama ?? null;

    return NextResponse.json({
        ok: true,
        nama,
        role: session.role,
        roleLabel: session.isAdmin ? "Admin Desa" : "Petugas Desa",
        desaNama,
    });
}
