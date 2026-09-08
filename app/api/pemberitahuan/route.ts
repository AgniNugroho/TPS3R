import { NextResponse } from "next/server";
import { getSessionContext } from "@/lib/permissions/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function toText(value: unknown): string {
    return typeof value === "string" ? value.trim() : "";
}

function toNullableDate(value: unknown): string | null {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

function getErrorMessage(error: unknown, defaultMessage: string): string {
    if (typeof error === "object" && error !== null) {
        const anyErr = error as { code?: string; message?: string };
        if (anyErr.code === "PGRST205" || anyErr.code === "42P01") {
            return "Tabel 'pemberitahuan' belum dibuat di Supabase. Silakan jalankan file migrasi supabase/migrations/20260907_create_pemberitahuan.sql di Supabase SQL Editor.";
        }
        if (anyErr.message) return anyErr.message;
    }
    if (error instanceof Error) return error.message;
    return defaultMessage;
}

export async function GET(request: Request) {
    try {
        const url = new URL(request.url);
        const isPublic = url.searchParams.get("public") === "true";
        const desaId = url.searchParams.get("desa_id");
        const status = url.searchParams.get("status");
        const kategori = url.searchParams.get("kategori");
        const search = url.searchParams.get("search");

        const supabase = getSupabaseServerClient();

        // ── 1. PUBLIC REQUEST (LANDING PAGE) ──
        if (isPublic) {
            let query = supabase
                .from("pemberitahuan")
                .select(`
                    id,
                    desa_id,
                    judul,
                    isi,
                    kategori,
                    tingkat_urgensi,
                    status,
                    tanggal_mulai,
                    tanggal_selesai,
                    created_at,
                    updated_at,
                    desa:desa_id ( id, nama )
                `)
                .eq("status", "Aktif")
                .order("created_at", { ascending: false });

            if (desaId && desaId !== "all") {
                query = query.eq("desa_id", desaId);
            }

            const { data, error } = await query;
            if (error) {
                // If the table does not exist yet, return empty list gracefully for landing page
                if (error.code === "PGRST205" || error.code === "42P01") {
                    return NextResponse.json({ ok: true, data: [] });
                }
                throw error;
            }
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
            .from("pemberitahuan")
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

        if (status && status !== "all") {
            query = query.eq("status", status);
        }

        if (kategori && kategori !== "all") {
            query = query.eq("kategori", kategori);
        }

        if (search) {
            query = query.or(`judul.ilike.%${search}%,isi.ilike.%${search}%`);
        }

        const { data, error } = await query;
        if (error) throw error;

        return NextResponse.json({ ok: true, data: data ?? [] });
    } catch (error: unknown) {
        const message = getErrorMessage(error, "Terjadi kesalahan saat mengambil pemberitahuan.");
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
                { ok: false, error: "Anda harus login untuk membuat pemberitahuan." },
                { status: 401 },
            );
        }

        const body = await request.json();
        const judul = toText(body.judul);
        const isi = toText(body.isi);
        const kategori = toText(body.kategori) || "Operasional";
        const tingkatUrgensi = toText(body.tingkat_urgensi) || "Normal";
        const status = body.status === "Diarsipkan" ? "Diarsipkan" : "Aktif";
        const tanggalMulai = toNullableDate(body.tanggal_mulai) || new Date().toISOString().slice(0, 10);
        const tanggalSelesai = toNullableDate(body.tanggal_selesai);

        const desaId = session.isAdmin ? toText(body.desa_id) : session.desaId;

        if (!judul) {
            return NextResponse.json(
                { ok: false, error: "Judul pemberitahuan wajib diisi." },
                { status: 400 },
            );
        }

        if (!isi) {
            return NextResponse.json(
                { ok: false, error: "Isi pemberitahuan wajib diisi." },
                { status: 400 },
            );
        }

        if (!desaId) {
            return NextResponse.json(
                { ok: false, error: "Desa wajib ditentukan." },
                { status: 400 },
            );
        }

        const supabase = getSupabaseServerClient();
        const { data, error } = await supabase
            .from("pemberitahuan")
            .insert([
                {
                    desa_id: desaId,
                    judul,
                    isi,
                    kategori,
                    tingkat_urgensi: tingkatUrgensi,
                    status,
                    tanggal_mulai: tanggalMulai,
                    tanggal_selesai: tanggalSelesai,
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
        const message = getErrorMessage(error, "Gagal membuat pemberitahuan.");
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
                { ok: false, error: "Anda harus login untuk mengedit pemberitahuan." },
                { status: 401 },
            );
        }

        const body = await request.json();
        const id = toText(body.id);
        const judul = toText(body.judul);
        const isi = toText(body.isi);
        const kategori = toText(body.kategori);
        const tingkatUrgensi = toText(body.tingkat_urgensi);
        const status = toText(body.status);
        const tanggalMulai = toNullableDate(body.tanggal_mulai);
        const tanggalSelesai = toNullableDate(body.tanggal_selesai);

        if (!id) {
            return NextResponse.json(
                { ok: false, error: "ID pemberitahuan wajib disertakan." },
                { status: 400 },
            );
        }

        const supabase = getSupabaseServerClient();

        // Check existing announcement
        const { data: existing, error: fetchErr } = await supabase
            .from("pemberitahuan")
            .select("id, desa_id")
            .eq("id", id)
            .maybeSingle();

        if (fetchErr || !existing) {
            return NextResponse.json(
                { ok: false, error: "Pemberitahuan tidak ditemukan." },
                { status: 404 },
            );
        }

        // Authorization check
        if (!session.isAdmin && existing.desa_id !== session.desaId) {
            return NextResponse.json(
                { ok: false, error: "Anda tidak memiliki izin mengedit pemberitahuan dari desa lain." },
                { status: 403 },
            );
        }

        const updates: Record<string, unknown> = {
            updated_at: new Date().toISOString(),
        };

        if (judul) updates.judul = judul;
        if (isi) updates.isi = isi;
        if (kategori) updates.kategori = kategori;
        if (tingkatUrgensi) updates.tingkat_urgensi = tingkatUrgensi;
        if (status) updates.status = status;
        if (tanggalMulai) updates.tanggal_mulai = tanggalMulai;
        updates.tanggal_selesai = tanggalSelesai;

        if (session.isAdmin && body.desa_id) {
            updates.desa_id = toText(body.desa_id);
        }

        const { data, error } = await supabase
            .from("pemberitahuan")
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
        const message = getErrorMessage(error, "Gagal memperbarui pemberitahuan.");
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
                { ok: false, error: "Anda harus login untuk menghapus pemberitahuan." },
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
                // Ignore body parse errors
            }
        }

        if (!id) {
            return NextResponse.json(
                { ok: false, error: "ID pemberitahuan wajib diisi." },
                { status: 400 },
            );
        }

        const supabase = getSupabaseServerClient();

        // Check existing announcement
        const { data: existing, error: fetchErr } = await supabase
            .from("pemberitahuan")
            .select("id, desa_id")
            .eq("id", id)
            .maybeSingle();

        if (fetchErr || !existing) {
            return NextResponse.json(
                { ok: false, error: "Pemberitahuan tidak ditemukan." },
                { status: 404 },
            );
        }

        // Authorization check
        if (!session.isAdmin && existing.desa_id !== session.desaId) {
            return NextResponse.json(
                { ok: false, error: "Anda tidak memiliki izin menghapus pemberitahuan dari desa lain." },
                { status: 403 },
            );
        }

        const { error } = await supabase.from("pemberitahuan").delete().eq("id", id);
        if (error) throw error;

        return NextResponse.json({ ok: true });
    } catch (error: unknown) {
        const message = getErrorMessage(error, "Gagal menghapus pemberitahuan.");
        return NextResponse.json(
            { ok: false, error: message },
            { status: 500 },
        );
    }
}
