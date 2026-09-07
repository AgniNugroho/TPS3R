import { NextResponse } from "next/server";
import { getSessionContext } from "@/lib/permissions/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function toText(value: unknown): string {
    return typeof value === "string" ? value.trim() : "";
}

export async function GET(request: Request) {
    try {
        const url = new URL(request.url);
        const isPublic = url.searchParams.get("public") === "true";
        const desaId = url.searchParams.get("desa_id");
        const status = url.searchParams.get("status");
        const search = url.searchParams.get("search");

        const supabase = getSupabaseServerClient();

        // ── 1. PUBLIC REQUEST (LANDING PAGE) ──
        if (isPublic) {
            let query = supabase
                .from("postingan")
                .select(`
                    id,
                    desa_id,
                    judul,
                    deskripsi,
                    gambar_url,
                    status,
                    created_at,
                    updated_at,
                    desa:desa_id ( id, nama )
                `)
                .eq("status", "Publik")
                .order("created_at", { ascending: false });

            if (desaId && desaId !== "all") {
                query = query.eq("desa_id", desaId);
            }

            const { data, error } = await query;
            if (error) throw error;
            return NextResponse.json({ ok: true, data: data ?? [] });
        }

        // ── 2. DASHBOARD REQUEST (AUTHENTICATED) ──
        const session = await getSessionContext();
        if (!session) {
            return NextResponse.json(
                { ok: false, error: "Anda harus login untuk mengakses data ini." },
                { status: 401 },
            );
        }

        let query = supabase
            .from("postingan")
            .select(`
                *,
                desa:desa_id ( id, nama ),
                petugas:author_id ( id, nama )
            `)
            .order("created_at", { ascending: false });

        if (!session.isAdmin) {
            if (!session.desaId) {
                return NextResponse.json({ ok: true, data: [] });
            }
            query = query.eq("desa_id", session.desaId);
        } else if (desaId && desaId !== "all") {
            query = query.eq("desa_id", desaId);
        }

        if (status && (status === "Publik" || status === "Draft")) {
            query = query.eq("status", status);
        }

        if (search) {
            query = query.or(`judul.ilike.%${search}%,deskripsi.ilike.%${search}%`);
        }

        const { data, error } = await query;
        if (error) throw error;

        return NextResponse.json({ ok: true, data: data ?? [] });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Terjadi kesalahan saat mengambil postingan.";
        return NextResponse.json(
            { ok: false, error: message },
            { status: 500 },
        );
    }
}

export async function POST(request: Request) {
    try {
        const session = await getSessionContext();
        if (!session) {
            return NextResponse.json(
                { ok: false, error: "Anda harus login untuk membuat postingan." },
                { status: 401 },
            );
        }

        const body = await request.json();
        const judul = toText(body.judul);
        const deskripsi = toText(body.deskripsi);
        const gambarUrl = toText(body.gambar_url);
        const status = body.status === "Draft" ? "Draft" : "Publik";

        const desaId = session.isAdmin ? toText(body.desa_id) : session.desaId;

        if (!judul) {
            return NextResponse.json(
                { ok: false, error: "Judul produk / postingan wajib diisi." },
                { status: 400 },
            );
        }

        if (!deskripsi) {
            return NextResponse.json(
                { ok: false, error: "Deskripsi produk wajib diisi." },
                { status: 400 },
            );
        }

        if (!gambarUrl) {
            return NextResponse.json(
                { ok: false, error: "Foto produk wajib diunggah." },
                { status: 400 },
            );
        }

        if (!desaId) {
            return NextResponse.json(
                { ok: false, error: "Desa wajib dipilih." },
                { status: 400 },
            );
        }

        const supabase = getSupabaseServerClient();
        const { data, error } = await supabase
            .from("postingan")
            .insert([
                {
                    desa_id: desaId,
                    judul,
                    deskripsi,
                    gambar_url: gambarUrl,
                    status,
                    author_id: session.petugasId || null,
                },
            ])
            .select(`
                *,
                desa:desa_id ( id, nama )
            `)
            .single();

        if (error) throw error;

        return NextResponse.json({ ok: true, data }, { status: 201 });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Gagal membuat postingan.";
        return NextResponse.json(
            { ok: false, error: message },
            { status: 500 },
        );
    }
}

export async function PUT(request: Request) {
    try {
        const session = await getSessionContext();
        if (!session) {
            return NextResponse.json(
                { ok: false, error: "Anda harus login untuk mengedit postingan." },
                { status: 401 },
            );
        }

        const body = await request.json();
        const id = toText(body.id);
        const judul = toText(body.judul);
        const deskripsi = toText(body.deskripsi);
        const gambarUrl = toText(body.gambar_url);
        const status = body.status === "Draft" ? "Draft" : "Publik";

        if (!id) {
            return NextResponse.json(
                { ok: false, error: "ID postingan wajib disertakan." },
                { status: 400 },
            );
        }

        const supabase = getSupabaseServerClient();

        // Check existing post
        const { data: existing, error: fetchErr } = await supabase
            .from("postingan")
            .select("id, desa_id")
            .eq("id", id)
            .maybeSingle();

        if (fetchErr || !existing) {
            return NextResponse.json(
                { ok: false, error: "Postingan tidak ditemukan." },
                { status: 404 },
            );
        }

        // Authorization check
        if (!session.isAdmin && existing.desa_id !== session.desaId) {
            return NextResponse.json(
                { ok: false, error: "Anda tidak memiliki izin mengedit postingan dari desa lain." },
                { status: 403 },
            );
        }

        const updates: Record<string, unknown> = {
            updated_at: new Date().toISOString(),
        };

        if (judul) updates.judul = judul;
        if (deskripsi) updates.deskripsi = deskripsi;
        if (gambarUrl) updates.gambar_url = gambarUrl;
        if (status) updates.status = status;

        if (session.isAdmin && body.desa_id) {
            updates.desa_id = toText(body.desa_id);
        }

        const { data, error } = await supabase
            .from("postingan")
            .update(updates)
            .eq("id", id)
            .select(`
                *,
                desa:desa_id ( id, nama )
            `)
            .single();

        if (error) throw error;

        return NextResponse.json({ ok: true, data });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Gagal memperbarui postingan.";
        return NextResponse.json(
            { ok: false, error: message },
            { status: 500 },
        );
    }
}

export async function DELETE(request: Request) {
    try {
        const session = await getSessionContext();
        if (!session) {
            return NextResponse.json(
                { ok: false, error: "Anda harus login untuk menghapus postingan." },
                { status: 401 },
            );
        }

        const url = new URL(request.url);
        let id = url.searchParams.get("id");

        if (!id) {
            try {
                const body = await request.json();
                id = toText(body?.id);
            } catch {
                // Ignore body parse errors if query param was expected
            }
        }

        if (!id) {
            return NextResponse.json(
                { ok: false, error: "ID postingan wajib diisi." },
                { status: 400 },
            );
        }

        const supabase = getSupabaseServerClient();

        // Check existing post
        const { data: existing, error: fetchErr } = await supabase
            .from("postingan")
            .select("id, desa_id")
            .eq("id", id)
            .maybeSingle();

        if (fetchErr || !existing) {
            return NextResponse.json(
                { ok: false, error: "Postingan tidak ditemukan." },
                { status: 404 },
            );
        }

        // Authorization check
        if (!session.isAdmin && existing.desa_id !== session.desaId) {
            return NextResponse.json(
                { ok: false, error: "Anda tidak memiliki izin menghapus postingan dari desa lain." },
                { status: 403 },
            );
        }

        const { error } = await supabase.from("postingan").delete().eq("id", id);
        if (error) throw error;

        return NextResponse.json({ ok: true });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Gagal menghapus postingan.";
        return NextResponse.json(
            { ok: false, error: message },
            { status: 500 },
        );
    }
}
