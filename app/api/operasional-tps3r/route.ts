import { NextResponse } from "next/server";
import { getSessionContext } from "@/lib/permissions/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function toText(value: unknown): string {
    return typeof value === "string" ? value.trim() : "";
}

function getErrorMessage(error: unknown, defaultMessage: string): string {
    if (typeof error === "object" && error !== null) {
        const anyErr = error as { code?: string; message?: string };
        if (anyErr.code === "PGRST205" || anyErr.code === "42P01") {
            return "Tabel 'operasional_tps3r' belum dibuat di Supabase. Silakan jalankan file migrasi supabase/migrations/20260908_create_pembayaran_member_and_operasional.sql di Supabase SQL Editor.";
        }
        if (anyErr.message) return anyErr.message;
    }
    if (error instanceof Error) return error.message;
    return defaultMessage;
}

export async function GET(request: Request) {
    try {
        const session = await getSessionContext();
        if (!session) {
            return NextResponse.json(
                { ok: false, error: "Anda harus login untuk mengakses data ini." },
                { status: 401 },
            );
        }

        const url = new URL(request.url);
        const desaId = url.searchParams.get("desa_id");
        const periodeBulan = url.searchParams.get("periode_bulan");
        const kategori = url.searchParams.get("kategori");
        const search = url.searchParams.get("search");

        const supabase = getSupabaseServerClient();

        let query = supabase
            .from("operasional_tps3r")
            .select(`
                id,
                desa_id,
                periode_bulan,
                tanggal,
                kategori,
                keterangan,
                nominal,
                petugas_id,
                created_at,
                updated_at,
                desa:desa_id ( id, nama )
            `)
            .order("tanggal", { ascending: false })
            .order("created_at", { ascending: false });

        if (!session.isAdmin) {
            if (!session.desaId) {
                return NextResponse.json({ ok: true, rows: [] });
            }
            query = query.eq("desa_id", session.desaId);
        } else if (desaId && desaId !== "all") {
            query = query.eq("desa_id", desaId);
        }

        if (periodeBulan && periodeBulan !== "all") {
            query = query.eq("periode_bulan", periodeBulan);
        }

        if (kategori && kategori !== "all") {
            query = query.eq("kategori", kategori);
        }

        if (search) {
            query = query.ilike("keterangan", `%${search}%`);
        }

        const { data, error } = await query;
        if (error) {
            if (error.code === "PGRST205" || error.code === "42P01") {
                return NextResponse.json({ ok: true, rows: [] });
            }
            throw error;
        }

        return NextResponse.json({ ok: true, rows: data ?? [], data: data ?? [] });
    } catch (error: unknown) {
        const message = getErrorMessage(error, "Terjadi kesalahan saat memuat data operasional.");
        return NextResponse.json({ ok: false, error: message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const session = await getSessionContext();
        if (!session) {
            return NextResponse.json(
                { ok: false, error: "Anda harus login untuk mencatat biaya operasional." },
                { status: 401 },
            );
        }

        const body = await request.json();
        const periodeBulan = toText(body.periode_bulan);
        const tanggal = toText(body.tanggal) || new Date().toISOString().slice(0, 10);
        const kategori = toText(body.kategori) || "BBM";
        const keterangan = toText(body.keterangan);
        const nominal = Number(body.nominal);
        const desaId = session.isAdmin ? toText(body.desa_id) || session.desaId : session.desaId;

        if (!desaId) {
            return NextResponse.json({ ok: false, error: "Desa wajib ditentukan." }, { status: 400 });
        }

        if (!periodeBulan) {
            return NextResponse.json({ ok: false, error: "Periode bulan wajib ditentukan (contoh: 2026-09)." }, { status: 400 });
        }

        if (!keterangan) {
            return NextResponse.json({ ok: false, error: "Keterangan pengeluaran wajib diisi." }, { status: 400 });
        }

        if (!Number.isFinite(nominal) || nominal <= 0) {
            return NextResponse.json({ ok: false, error: "Nominal pengeluaran harus berupa angka lebih dari 0." }, { status: 400 });
        }

        const supabase = getSupabaseServerClient();

        const { data, error } = await supabase
            .from("operasional_tps3r")
            .insert([
                {
                    desa_id: desaId,
                    periode_bulan: periodeBulan,
                    tanggal,
                    kategori,
                    keterangan,
                    nominal,
                    petugas_id: session.petugasId || null,
                },
            ])
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ ok: true, data, row: data }, { status: 201 });
    } catch (error: unknown) {
        const message = getErrorMessage(error, "Gagal mencatat pengeluaran operasional.");
        return NextResponse.json({ ok: false, error: message }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const session = await getSessionContext();
        if (!session) {
            return NextResponse.json(
                { ok: false, error: "Anda harus login untuk mengedit biaya operasional." },
                { status: 401 },
            );
        }

        const body = await request.json();
        const id = toText(body.id);
        const tanggal = toText(body.tanggal);
        const kategori = toText(body.kategori);
        const keterangan = toText(body.keterangan);
        const nominal = body.nominal !== undefined ? Number(body.nominal) : undefined;

        if (!id) {
            return NextResponse.json({ ok: false, error: "ID operasional wajib disertakan." }, { status: 400 });
        }

        const supabase = getSupabaseServerClient();

        const { data: existing, error: fetchErr } = await supabase
            .from("operasional_tps3r")
            .select("id, desa_id")
            .eq("id", id)
            .maybeSingle();

        if (fetchErr || !existing) {
            return NextResponse.json({ ok: false, error: "Data operasional tidak ditemukan." }, { status: 404 });
        }

        if (!session.isAdmin && existing.desa_id !== session.desaId) {
            return NextResponse.json(
                { ok: false, error: "Anda tidak memiliki izin mengedit data operasional desa lain." },
                { status: 403 },
            );
        }

        const updates: Record<string, unknown> = {
            updated_at: new Date().toISOString(),
        };

        if (tanggal) updates.tanggal = tanggal;
        if (kategori) updates.kategori = kategori;
        if (keterangan) updates.keterangan = keterangan;
        if (nominal !== undefined) {
            if (!Number.isFinite(nominal) || nominal <= 0) {
                return NextResponse.json({ ok: false, error: "Nominal operasional harus lebih dari 0." }, { status: 400 });
            }
            updates.nominal = nominal;
        }

        const { data, error } = await supabase
            .from("operasional_tps3r")
            .update(updates)
            .eq("id", id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ ok: true, data, row: data });
    } catch (error: unknown) {
        const message = getErrorMessage(error, "Gagal memperbarui data operasional.");
        return NextResponse.json({ ok: false, error: message }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const session = await getSessionContext();
        if (!session) {
            return NextResponse.json(
                { ok: false, error: "Anda harus login untuk menghapus biaya operasional." },
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
                // Ignore parse errors
            }
        }

        if (!id) {
            return NextResponse.json({ ok: false, error: "ID operasional wajib disertakan." }, { status: 400 });
        }

        const supabase = getSupabaseServerClient();

        const { data: existing, error: fetchErr } = await supabase
            .from("operasional_tps3r")
            .select("id, desa_id")
            .eq("id", id)
            .maybeSingle();

        if (fetchErr || !existing) {
            return NextResponse.json({ ok: false, error: "Data operasional tidak ditemukan." }, { status: 404 });
        }

        if (!session.isAdmin && existing.desa_id !== session.desaId) {
            return NextResponse.json(
                { ok: false, error: "Anda tidak memiliki izin menghapus data operasional desa lain." },
                { status: 403 },
            );
        }

        const { error } = await supabase.from("operasional_tps3r").delete().eq("id", id);
        if (error) throw error;

        return NextResponse.json({ ok: true });
    } catch (error: unknown) {
        const message = getErrorMessage(error, "Gagal menghapus data operasional.");
        return NextResponse.json({ ok: false, error: message }, { status: 500 });
    }
}
