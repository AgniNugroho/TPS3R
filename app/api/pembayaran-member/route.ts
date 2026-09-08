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
            return "Tabel 'pembayaran_member' belum dibuat di Supabase. Silakan jalankan file migrasi supabase/migrations/20260908_create_pembayaran_member_and_operasional.sql di Supabase SQL Editor.";
        }
        if (anyErr.code === "23505") {
            return "Data ini sudah tercatat membayar untuk periode bulan yang dipilih.";
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
                {
                    ok: false,
                    error: "Anda harus login untuk mengakses data ini.",
                },
                { status: 401 },
            );
        }

        const url = new URL(request.url);
        const desaId = url.searchParams.get("desa_id");
        const periodeBulan = url.searchParams.get("periode_bulan");
        const metode = url.searchParams.get("metode");
        const status = url.searchParams.get("status");
        const search = url.searchParams.get("search");

        const supabase = getSupabaseServerClient();

        let query = supabase
            .from("pembayaran_member")
            .select(
                `
                id,
                desa_id,
                member_id,
                wilayah_id,
                periode_bulan,
                tanggal_bayar,
                nominal,
                metode_pembayaran,
                status,
                catatan,
                petugas_id,
                created_at,
                updated_at,
                member:member_id (
                    id,
                    kode_member,
                    nama,
                    nomor_hp,
                    wilayah:wilayah_id (
                        id,
                        dusun,
                        rt,
                        rw
                    )
                ),
                wilayah:wilayah_id (
                    id,
                    dusun,
                    rt,
                    rw
                ),
                desa:desa_id ( id, nama )
            `,
            )
            .order("tanggal_bayar", { ascending: false })
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

        if (metode && metode !== "all") {
            query = query.eq("metode_pembayaran", metode);
        }

        if (status && status !== "all") {
            query = query.eq("status", status);
        }

        const { data, error } = await query;
        if (error) {
            if (error.code === "PGRST205" || error.code === "42P01") {
                return NextResponse.json({ ok: true, rows: [] });
            }
            throw error;
        }

        let rows = data ?? [];

        if (search) {
            const q = search.toLowerCase();
            rows = rows.filter((r) => {
                const member = r.member as {
                    nama?: string;
                    kode_member?: string;
                    wilayah?: { dusun?: string };
                } | null;
                const wilayah = r.wilayah as { dusun?: string } | null;
                const nama = member?.nama?.toLowerCase() || "";
                const kode = member?.kode_member?.toLowerCase() || "";
                const dusun =
                    (member?.wilayah?.dusun || wilayah?.dusun)?.toLowerCase() ||
                    "";
                const catatan = (r.catatan as string)?.toLowerCase() || "";
                return (
                    nama.includes(q) ||
                    kode.includes(q) ||
                    dusun.includes(q) ||
                    catatan.includes(q)
                );
            });
        }

        return NextResponse.json({ ok: true, rows, data: rows });
    } catch (error: unknown) {
        const message = getErrorMessage(
            error,
            "Terjadi kesalahan saat memuat data pembayaran member.",
        );
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
                {
                    ok: false,
                    error: "Anda harus login untuk mencatat pembayaran.",
                },
                { status: 401 },
            );
        }

        const body = await request.json();
        const memberId = toText(body.member_id);
        const wilayahId = toText(body.wilayah_id);
        const periodeBulan = toText(body.periode_bulan);
        const tanggalBayar =
            toText(body.tanggal_bayar) || new Date().toISOString().slice(0, 10);
        const nominal = Number(body.nominal);
        const metodePembayaran =
            body.metode_pembayaran === "Transfer" ? "Transfer" : "Cash";
        const status = body.status === "Pending" ? "Pending" : "Lunas";
        const catatan = toText(body.catatan);

        if (!memberId && !wilayahId) {
            return NextResponse.json(
                { ok: false, error: "Member atau dusun wajib dipilih." },
                { status: 400 },
            );
        }

        if (!periodeBulan) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "Periode bulan wajib ditentukan (contoh: 2026-09).",
                },
                { status: 400 },
            );
        }

        if (!Number.isFinite(nominal) || nominal <= 0) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "Nominal pembayaran harus berupa angka lebih dari 0.",
                },
                { status: 400 },
            );
        }

        const supabase = getSupabaseServerClient();

        // Resolve payer's desa_id, either from the member or the dusun/wilayah
        let desaId: string | null = null;
        if (memberId) {
            const { data: memberData, error: memberErr } = await supabase
                .from("member_bank_sampah")
                .select("id, desa_id, nama")
                .eq("id", memberId)
                .single();

            if (memberErr || !memberData) {
                return NextResponse.json(
                    { ok: false, error: "Data member tidak ditemukan." },
                    { status: 404 },
                );
            }
            desaId = memberData.desa_id;
        } else {
            const { data: wilayahData, error: wilayahErr } = await supabase
                .from("wilayah")
                .select("id, desa_id")
                .eq("id", wilayahId)
                .single();

            if (wilayahErr || !wilayahData) {
                return NextResponse.json(
                    { ok: false, error: "Data dusun tidak ditemukan." },
                    { status: 404 },
                );
            }
            desaId = wilayahData.desa_id;
        }

        if (!session.isAdmin && desaId !== session.desaId) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "Anda tidak memiliki izin mencatat pembayaran untuk desa lain.",
                },
                { status: 403 },
            );
        }

        const { data, error } = await supabase
            .from("pembayaran_member")
            .insert([
                {
                    desa_id: desaId,
                    member_id: memberId || null,
                    wilayah_id: wilayahId || null,
                    periode_bulan: periodeBulan,
                    tanggal_bayar: tanggalBayar,
                    nominal,
                    metode_pembayaran: metodePembayaran,
                    status,
                    catatan: catatan || null,
                    petugas_id: session.petugasId || null,
                },
            ])
            .select(
                `
                id,
                desa_id,
                member_id,
                periode_bulan,
                tanggal_bayar,
                nominal,
                metode_pembayaran,
                status,
                catatan,
                member:member_id ( id, kode_member, nama ),
                wilayah:wilayah_id ( id, dusun )
            `,
            )
            .single();

        if (error) throw error;

        return NextResponse.json(
            { ok: true, data, row: data },
            { status: 201 },
        );
    } catch (error: unknown) {
        const message = getErrorMessage(
            error,
            "Gagal mencatat pembayaran member.",
        );
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
                {
                    ok: false,
                    error: "Anda harus login untuk mengedit pembayaran.",
                },
                { status: 401 },
            );
        }

        const body = await request.json();
        const id = toText(body.id);
        const nominal =
            body.nominal !== undefined ? Number(body.nominal) : undefined;
        const metodePembayaran = toText(body.metode_pembayaran);
        const tanggalBayar = toText(body.tanggal_bayar);
        const status = toText(body.status);
        const catatan =
            body.catatan !== undefined ? toText(body.catatan) : undefined;

        if (!id) {
            return NextResponse.json(
                { ok: false, error: "ID pembayaran wajib disertakan." },
                { status: 400 },
            );
        }

        const supabase = getSupabaseServerClient();

        const { data: existing, error: fetchErr } = await supabase
            .from("pembayaran_member")
            .select("id, desa_id")
            .eq("id", id)
            .maybeSingle();

        if (fetchErr || !existing) {
            return NextResponse.json(
                { ok: false, error: "Data pembayaran tidak ditemukan." },
                { status: 404 },
            );
        }

        if (!session.isAdmin && existing.desa_id !== session.desaId) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "Anda tidak memiliki izin mengedit data pembayaran desa lain.",
                },
                { status: 403 },
            );
        }

        const updates: Record<string, unknown> = {
            updated_at: new Date().toISOString(),
        };

        if (nominal !== undefined) {
            if (!Number.isFinite(nominal) || nominal <= 0) {
                return NextResponse.json(
                    {
                        ok: false,
                        error: "Nominal pembayaran harus lebih dari 0.",
                    },
                    { status: 400 },
                );
            }
            updates.nominal = nominal;
        }

        if (metodePembayaran) {
            updates.metode_pembayaran =
                metodePembayaran === "Transfer" ? "Transfer" : "Cash";
        }

        if (tanggalBayar) updates.tanggal_bayar = tanggalBayar;
        if (status) updates.status = status;
        if (catatan !== undefined) updates.catatan = catatan || null;

        const { data, error } = await supabase
            .from("pembayaran_member")
            .update(updates)
            .eq("id", id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ ok: true, data, row: data });
    } catch (error: unknown) {
        const message = getErrorMessage(
            error,
            "Gagal memperbarui data pembayaran.",
        );
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
                {
                    ok: false,
                    error: "Anda harus login untuk menghapus data pembayaran.",
                },
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
            return NextResponse.json(
                { ok: false, error: "ID pembayaran wajib disertakan." },
                { status: 400 },
            );
        }

        const supabase = getSupabaseServerClient();

        const { data: existing, error: fetchErr } = await supabase
            .from("pembayaran_member")
            .select("id, desa_id")
            .eq("id", id)
            .maybeSingle();

        if (fetchErr || !existing) {
            return NextResponse.json(
                { ok: false, error: "Data pembayaran tidak ditemukan." },
                { status: 404 },
            );
        }

        if (!session.isAdmin && existing.desa_id !== session.desaId) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "Anda tidak memiliki izin menghapus data pembayaran desa lain.",
                },
                { status: 403 },
            );
        }

        const { error } = await supabase
            .from("pembayaran_member")
            .delete()
            .eq("id", id);
        if (error) throw error;

        return NextResponse.json({ ok: true });
    } catch (error: unknown) {
        const message = getErrorMessage(
            error,
            "Gagal menghapus data pembayaran.",
        );
        return NextResponse.json(
            { ok: false, error: message },
            { status: 500 },
        );
    }
}
