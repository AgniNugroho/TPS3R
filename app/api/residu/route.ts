import { NextResponse } from "next/server";
import { getSessionContext } from "@/lib/permissions/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type ResiduPayload = {
    tanggal?: unknown;
    lokasi?: unknown;
    sumber?: unknown;
    berat_kg?: unknown;
    jenis_residu?: unknown;
    tujuan_akhir?: unknown;
    keterangan?: unknown;
    desa_id?: unknown;
};

function toText(value: unknown) {
    return typeof value === "string" ? value.trim() : "";
}

function toWeight(value: unknown) {
    const weight = Number(value);
    return Number.isFinite(weight) && weight >= 0 ? weight : 0;
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

function getValues(body: ResiduPayload, desaId: string) {
    return {
        tanggal: toText(body.tanggal) || new Date().toISOString().slice(0, 10),
        lokasi: toText(body.lokasi),
        sumber: toText(body.sumber) || null,
        berat_kg: toWeight(body.berat_kg),
        jenis_residu: toText(body.jenis_residu),
        tujuan_akhir: toText(body.tujuan_akhir) || null,
        keterangan: toText(body.keterangan) || null,
        desa_id: desaId,
    };
}

function validate(values: ReturnType<typeof getValues>) {
    if (!values.lokasi || !values.jenis_residu) {
        return "Lokasi dan jenis residu wajib diisi.";
    }
    if (values.berat_kg <= 0) {
        return "Berat residu harus lebih dari 0 kg.";
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
        let query = supabase.from("residu").select("*");
        if (desaId) query = query.eq("desa_id", desaId);
        const { data, error } = await query
            .order("tanggal", { ascending: false })
            .order("created_at", { ascending: false });
        if (error) throw error;
        return NextResponse.json({ ok: true, rows: data ?? [] });
    } catch (error) {
        return NextResponse.json(
            {
                ok: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Gagal memuat data residu.",
            },
            { status: 500 },
        );
    }
}

export async function POST(request: Request) {
    try {
        const result = await getSessionOrError();
        if ("error" in result) return result.error;

        const body = (await request.json()) as ResiduPayload;
        const desaId = result.session.isAdmin
            ? toText(body.desa_id)
            : result.session.desaId;
        if (!desaId) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "Desa harus dipilih sebelum menambah residu.",
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
            .from("residu")
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
                        : "Gagal menyimpan residu.",
            },
            { status: 500 },
        );
    }
}

export async function PUT(request: Request) {
    try {
        const result = await getSessionOrError();
        if ("error" in result) return result.error;

        const body = (await request.json()) as ResiduPayload & {
            id?: unknown;
        };
        const id = toText(body.id);
        if (!id) {
            return NextResponse.json(
                { ok: false, error: "ID residu wajib disertakan." },
                { status: 400 },
            );
        }

        const supabase = getSupabaseServerClient();
        const { data: existing, error: findError } = await supabase
            .from("residu")
            .select("desa_id")
            .eq("id", id)
            .maybeSingle();
        if (findError) throw findError;
        if (!existing)
            return NextResponse.json(
                { ok: false, error: "Data residu tidak ditemukan." },
                { status: 404 },
            );
        if (
            !result.session.isAdmin &&
            existing.desa_id !== result.session.desaId
        ) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "Tidak diizinkan mengubah data residu desa lain.",
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
            .from("residu")
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
                        : "Gagal memperbarui residu.",
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
                { ok: false, error: "ID residu wajib disertakan." },
                { status: 400 },
            );

        const supabase = getSupabaseServerClient();
        const { data: existing, error: findError } = await supabase
            .from("residu")
            .select("desa_id")
            .eq("id", id)
            .maybeSingle();
        if (findError) throw findError;
        if (!existing)
            return NextResponse.json(
                { ok: false, error: "Data residu tidak ditemukan." },
                { status: 404 },
            );
        if (
            !result.session.isAdmin &&
            existing.desa_id !== result.session.desaId
        ) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "Tidak diizinkan menghapus data residu desa lain.",
                },
                { status: 403 },
            );
        }

        const { error } = await supabase.from("residu").delete().eq("id", id);
        if (error) throw error;
        return NextResponse.json({ ok: true });
    } catch (error) {
        return NextResponse.json(
            {
                ok: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Gagal menghapus residu.",
            },
            { status: 500 },
        );
    }
}
