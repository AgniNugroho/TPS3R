import { NextResponse } from "next/server";
import { getSessionContext } from "@/lib/permissions/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type MemberPayload = {
    id?: unknown;
    kode_member?: unknown;
    nama?: unknown;
    desa_id?: unknown;
    wilayah_id?: unknown;
    nomor_hp?: unknown;
    alamat?: unknown;
    status?: unknown;
};

function toText(value: unknown): string {
    return typeof value === "string" ? value.trim() : "";
}

function toNullableText(value: unknown): string | null {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

async function getSessionOrError() {
    const session = await getSessionContext();
    if (!session) {
        return {
            error: NextResponse.json(
                {
                    ok: false,
                    error: "Anda harus login untuk mengakses data ini.",
                },
                { status: 401 },
            ),
        };
    }
    return { session };
}

export async function GET(request: Request) {
    try {
        const auth = await getSessionOrError();
        if ("error" in auth) return auth.error;

        const url = new URL(request.url);
        const requestedDesaId = url.searchParams.get("desa_id");
        const wilayahId = url.searchParams.get("wilayah_id");
        const status = url.searchParams.get("status");
        const search = url.searchParams.get("search");

        const desaId = auth.session.isAdmin
            ? requestedDesaId
            : auth.session.desaId;

        if (!desaId && !auth.session.isAdmin) {
            return NextResponse.json({ ok: true, rows: [] });
        }

        const supabase = getSupabaseServerClient();
        let query = supabase.from("member_bank_sampah").select(`
            *,
            wilayah:wilayah_id (
                id,
                kode,
                dusun,
                rt,
                rw
            )
        `);

        if (desaId) {
            query = query.eq("desa_id", desaId);
        }

        if (wilayahId) {
            query = query.eq("wilayah_id", wilayahId);
        }

        if (status) {
            query = query.eq("status", status);
        }

        if (search) {
            query = query.or(`nama.ilike.%${search}%,kode_member.ilike.%${search}%`);
        }

        const { data, error } = await query
            .order("status", { ascending: true })
            .order("nama", { ascending: true });

        if (error) throw error;

        return NextResponse.json(
            { ok: true, rows: data ?? [] },
            { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" } },
        );
    } catch (error) {
        return NextResponse.json(
            {
                ok: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Gagal memuat data member.",
            },
            { status: 500 },
        );
    }
}

export async function POST(request: Request) {
    try {
        const auth = await getSessionOrError();
        if ("error" in auth) return auth.error;

        const body = (await request.json()) as MemberPayload;
        const nama = toText(body.nama);
        if (!nama) {
            return NextResponse.json(
                { ok: false, error: "Nama member wajib diisi." },
                { status: 400 },
            );
        }

        const targetDesaId = auth.session.isAdmin
            ? toText(body.desa_id) || (auth.session.desaId ?? "")
            : (auth.session.desaId ?? "");

        if (!targetDesaId) {
            return NextResponse.json(
                { ok: false, error: "Desa wajib ditentukan untuk member." },
                { status: 400 },
            );
        }

        const supabase = getSupabaseServerClient();

        // If kode_member is not provided, generate a readable one
        let kodeMember = toNullableText(body.kode_member);
        if (!kodeMember) {
            const { count } = await supabase
                .from("member_bank_sampah")
                .select("*", { count: "exact", head: true })
                .eq("desa_id", targetDesaId);
            kodeMember = `MBR-${String((count ?? 0) + 1).padStart(3, "0")}`;
        }

        const payload = {
            kode_member: kodeMember,
            nama,
            desa_id: targetDesaId,
            wilayah_id: toNullableText(body.wilayah_id),
            nomor_hp: toNullableText(body.nomor_hp),
            alamat: toNullableText(body.alamat),
            status: toText(body.status) || "Aktif",
        };

        const { data, error } = await supabase
            .from("member_bank_sampah")
            .insert(payload)
            .select(`
                *,
                wilayah:wilayah_id (
                    id,
                    kode,
                    dusun,
                    rt,
                    rw
                )
            `)
            .single();

        if (error) throw error;

        return NextResponse.json(
            { ok: true, data },
            { status: 201, headers: { "Cache-Control": "no-store" } },
        );
    } catch (error) {
        return NextResponse.json(
            {
                ok: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Gagal menyimpan data member.",
            },
            { status: 500 },
        );
    }
}

export async function PUT(request: Request) {
    try {
        const auth = await getSessionOrError();
        if ("error" in auth) return auth.error;

        const body = (await request.json()) as MemberPayload;
        const id = toText(body.id);
        const nama = toText(body.nama);

        if (!id) {
            return NextResponse.json(
                { ok: false, error: "ID member wajib disertakan." },
                { status: 400 },
            );
        }

        if (!nama) {
            return NextResponse.json(
                { ok: false, error: "Nama member tidak boleh kosong." },
                { status: 400 },
            );
        }

        const supabase = getSupabaseServerClient();

        // Check permission: verify existing record's desa_id
        const { data: existing, error: findError } = await supabase
            .from("member_bank_sampah")
            .select("id, desa_id")
            .eq("id", id)
            .maybeSingle();

        if (findError || !existing) {
            return NextResponse.json(
                { ok: false, error: "Data member tidak ditemukan." },
                { status: 404 },
            );
        }

        if (!auth.session.isAdmin && existing.desa_id !== auth.session.desaId) {
            return NextResponse.json(
                { ok: false, error: "Anda tidak memiliki izin mengubah member desa ini." },
                { status: 403 },
            );
        }

        const payload: Record<string, unknown> = {
            nama,
            kode_member: toNullableText(body.kode_member),
            wilayah_id: toNullableText(body.wilayah_id),
            nomor_hp: toNullableText(body.nomor_hp),
            alamat: toNullableText(body.alamat),
            status: toText(body.status) || "Aktif",
        };

        if (auth.session.isAdmin && body.desa_id) {
            payload.desa_id = toText(body.desa_id);
        }

        const { data, error } = await supabase
            .from("member_bank_sampah")
            .update(payload)
            .eq("id", id)
            .select(`
                *,
                wilayah:wilayah_id (
                    id,
                    kode,
                    dusun,
                    rt,
                    rw
                )
            `)
            .single();

        if (error) throw error;

        return NextResponse.json(
            { ok: true, data },
            { headers: { "Cache-Control": "no-store" } },
        );
    } catch (error) {
        return NextResponse.json(
            {
                ok: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Gagal memperbarui data member.",
            },
            { status: 500 },
        );
    }
}

export async function DELETE(request: Request) {
    try {
        const auth = await getSessionOrError();
        if ("error" in auth) return auth.error;

        const url = new URL(request.url);
        const id = url.searchParams.get("id");

        if (!id) {
            return NextResponse.json(
                { ok: false, error: "ID member wajib disertakan." },
                { status: 400 },
            );
        }

        const supabase = getSupabaseServerClient();

        const { data: existing, error: findError } = await supabase
            .from("member_bank_sampah")
            .select("id, desa_id")
            .eq("id", id)
            .maybeSingle();

        if (findError || !existing) {
            return NextResponse.json(
                { ok: false, error: "Data member tidak ditemukan." },
                { status: 404 },
            );
        }

        if (!auth.session.isAdmin && existing.desa_id !== auth.session.desaId) {
            return NextResponse.json(
                { ok: false, error: "Anda tidak memiliki izin menghapus member desa ini." },
                { status: 403 },
            );
        }

        const { error } = await supabase
            .from("member_bank_sampah")
            .delete()
            .eq("id", id);

        if (error) throw error;

        return NextResponse.json(
            { ok: true, message: "Member berhasil dihapus." },
            { headers: { "Cache-Control": "no-store" } },
        );
    } catch (error) {
        return NextResponse.json(
            {
                ok: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Gagal menghapus data member.",
            },
            { status: 500 },
        );
    }
}
