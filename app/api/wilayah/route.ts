import { NextResponse } from "next/server";
import { getSessionContext } from "@/lib/permissions/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type WilayahPayload = {
    kode?: unknown;
    dusun?: unknown;
    rt?: unknown;
    rw?: unknown;
    jumlah_kk?: unknown;
    jumlah_jiwa?: unknown;
    status?: unknown;
    desa_id?: unknown;
};

function toText(value: unknown) {
    return typeof value === "string" ? value.trim() : "";
}

function toCount(value: unknown) {
    const count = Number(value);
    return Number.isInteger(count) && count >= 0 ? count : 0;
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

function getValues(body: WilayahPayload, desaId: string) {
    return {
        kode: toText(body.kode),
        dusun: toText(body.dusun),
        rt: toText(body.rt) || null,
        rw: toText(body.rw) || null,
        jumlah_kk: toCount(body.jumlah_kk),
        jumlah_jiwa: toCount(body.jumlah_jiwa),
        status: toText(body.status) || "Aktif",
        desa_id: desaId,
    };
}

function validate(values: ReturnType<typeof getValues>) {
    if (!values.kode || !values.dusun) {
        return "Kode dan nama dusun wajib diisi.";
    }
    return null;
}

export async function GET(request: Request) {
    try {
        const result = await getSessionOrError();
        if ("error" in result) return result.error;

        const requestedDesaId = new URL(request.url).searchParams.get(
            "desa_id",
        );
        const desaId = result.session.isAdmin
            ? requestedDesaId
            : result.session.desaId;
        if (!desaId && !result.session.isAdmin) {
            return NextResponse.json({ ok: true, rows: [] });
        }

        const supabase = getSupabaseServerClient();
        let query = supabase.from("wilayah").select("*");
        if (desaId) query = query.eq("desa_id", desaId);
        const { data, error } = await query.order("dusun");
        if (error) throw error;
        return NextResponse.json({ ok: true, rows: data ?? [] });
    } catch (error) {
        return NextResponse.json(
            {
                ok: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Gagal memuat wilayah.",
            },
            { status: 500 },
        );
    }
}

export async function POST(request: Request) {
    try {
        const result = await getSessionOrError();
        if ("error" in result) return result.error;

        const body = (await request.json()) as WilayahPayload;
        const desaId = result.session.isAdmin
            ? toText(body.desa_id)
            : result.session.desaId;
        if (!desaId) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "Desa harus dipilih sebelum menambah dusun.",
                },
                { status: 400 },
            );
        }

        const values = getValues(body, desaId);
        const validationError = validate(values);
        if (validationError) {
            return NextResponse.json(
                { ok: false, error: validationError },
                { status: 400 },
            );
        }

        const { data, error } = await getSupabaseServerClient()
            .from("wilayah")
            .insert(values)
            .select()
            .single();
        if (error) throw error;
        return NextResponse.json({ ok: true, data }, { status: 201 });
    } catch (error) {
        return NextResponse.json(
            {
                ok: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Gagal menyimpan wilayah.",
            },
            { status: 500 },
        );
    }
}

export async function PUT(request: Request) {
    try {
        const result = await getSessionOrError();
        if ("error" in result) return result.error;

        const body = (await request.json()) as WilayahPayload & {
            id?: unknown;
        };
        const id = toText(body.id);
        if (!id) {
            return NextResponse.json(
                { ok: false, error: "ID wilayah wajib disertakan." },
                { status: 400 },
            );
        }

        const supabase = getSupabaseServerClient();
        const { data: existing, error: findError } = await supabase
            .from("wilayah")
            .select("desa_id")
            .eq("id", id)
            .maybeSingle();
        if (findError) throw findError;
        if (!existing)
            return NextResponse.json(
                { ok: false, error: "Wilayah tidak ditemukan." },
                { status: 404 },
            );
        if (
            !result.session.isAdmin &&
            existing.desa_id !== result.session.desaId
        ) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "Tidak diizinkan mengubah wilayah desa lain.",
                },
                { status: 403 },
            );
        }

        const desaId = result.session.isAdmin
            ? toText(body.desa_id) || existing.desa_id
            : result.session.desaId;
        const values = getValues(body, desaId as string);
        const validationError = validate(values);
        if (validationError)
            return NextResponse.json(
                { ok: false, error: validationError },
                { status: 400 },
            );

        const { data, error } = await supabase
            .from("wilayah")
            .update(values)
            .eq("id", id)
            .select()
            .single();
        if (error) throw error;
        return NextResponse.json({ ok: true, data });
    } catch (error) {
        return NextResponse.json(
            {
                ok: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Gagal memperbarui wilayah.",
            },
            { status: 500 },
        );
    }
}

export async function DELETE(request: Request) {
    try {
        const result = await getSessionOrError();
        if ("error" in result) return result.error;

        const id = new URL(request.url).searchParams.get("id");
        if (!id)
            return NextResponse.json(
                { ok: false, error: "ID wilayah wajib disertakan." },
                { status: 400 },
            );

        const supabase = getSupabaseServerClient();
        const { data: existing, error: findError } = await supabase
            .from("wilayah")
            .select("desa_id")
            .eq("id", id)
            .maybeSingle();
        if (findError) throw findError;
        if (!existing)
            return NextResponse.json(
                { ok: false, error: "Wilayah tidak ditemukan." },
                { status: 404 },
            );
        if (
            !result.session.isAdmin &&
            existing.desa_id !== result.session.desaId
        ) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "Tidak diizinkan menghapus wilayah desa lain.",
                },
                { status: 403 },
            );
        }

        const { error } = await supabase.from("wilayah").delete().eq("id", id);
        if (error) throw error;
        return NextResponse.json({ ok: true });
    } catch (error) {
        return NextResponse.json(
            {
                ok: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Gagal menghapus wilayah.",
            },
            { status: 500 },
        );
    }
}
