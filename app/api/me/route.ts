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
        .select("nama, nomor_hp, desa:desa_id (nama)")
        .eq("id", session.petugasId)
        .maybeSingle();

    const nama = (petugas?.nama as string | undefined) ?? "Pengguna";
    const nomorHp = (petugas?.nomor_hp as string | null | undefined) ?? null;
    const desaNama =
        (petugas?.desa as { nama?: string } | null | undefined)?.nama ?? null;

    return NextResponse.json({
        ok: true,
        nama,
        nomorHp,
        email: session.email,
        role: session.role,
        roleLabel: session.isAdmin ? "Admin" : "Petugas Desa",
        desaId: session.desaId,
        desaNama,
    });
}

export async function PATCH(request: Request) {
    const session = await getSessionContext();
    if (!session) {
        return NextResponse.json(
            { ok: false, error: "Belum login." },
            { status: 401 },
        );
    }

    let body: { nama?: unknown; nomorHp?: unknown };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json(
            { ok: false, error: "Data tidak valid." },
            { status: 400 },
        );
    }

    const nama = typeof body.nama === "string" ? body.nama.trim() : "";
    const nomorHpRaw =
        typeof body.nomorHp === "string" ? body.nomorHp.trim() : "";

    if (nama.length < 2) {
        return NextResponse.json(
            { ok: false, error: "Nama minimal 2 karakter." },
            { status: 400 },
        );
    }
    if (nomorHpRaw && !/^[0-9+\-\s]{6,20}$/.test(nomorHpRaw)) {
        return NextResponse.json(
            { ok: false, error: "Nomor HP tidak valid." },
            { status: 400 },
        );
    }

    const supabase = getSupabaseServerClient();
    const { error } = await supabase
        .from("petugas")
        .update({ nama, nomor_hp: nomorHpRaw || null })
        .eq("id", session.petugasId);

    if (error) {
        return NextResponse.json(
            { ok: false, error: "Gagal menyimpan profil." },
            { status: 500 },
        );
    }

    return NextResponse.json({ ok: true, nama, nomorHp: nomorHpRaw || null });
}
