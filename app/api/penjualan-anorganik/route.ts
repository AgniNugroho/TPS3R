import { NextResponse } from "next/server";
import { getSessionContext } from "@/lib/permissions/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const VALID_KATEGORI = ["Plastik", "Kardus", "Kaca", "Besi", "Medis", "Lainnya"] as const;
type KategoriAnorganik = (typeof VALID_KATEGORI)[number];

const KATEGORI_TO_COLUMN: Record<string, string> = {
    Plastik: "plastik_kg",
    Kardus: "kardus_kg",
    Kaca: "kaca_kg",
    Besi: "besi_kg",
    Medis: "medis_kg",
    Lainnya: "anorganik_lainnya_kg",
};

async function getAvailableStockKg(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase: any,
    desaId: string,
    kategori: string,
    excludePenjualanId?: string,
): Promise<number> {
    const col = KATEGORI_TO_COLUMN[kategori] || "anorganik_lainnya_kg";
    const [pemilahanRes, penjualanRes] = await Promise.all([
        supabase.from("pemilahan_sampah").select(col).eq("desa_id", desaId),
        supabase.from("penjualan_anorganik").select("id, berat_kg").eq("desa_id", desaId).eq("kategori", kategori),
    ]);

    let totalTerpilah = 0;
    if (pemilahanRes.data && Array.isArray(pemilahanRes.data)) {
        for (const r of pemilahanRes.data) {
            totalTerpilah += Number(r[col] || 0);
        }
    }

    let totalTerjual = 0;
    if (penjualanRes.data && Array.isArray(penjualanRes.data)) {
        for (const r of penjualanRes.data) {
            if (excludePenjualanId && r.id === excludePenjualanId) continue;
            totalTerjual += Number(r.berat_kg || 0);
        }
    }

    return Math.max(0, Math.round((totalTerpilah - totalTerjual) * 100) / 100);
}

function toText(value: unknown): string {
    return typeof value === "string" ? value.trim() : "";
}

function getErrorMessage(error: unknown, defaultMessage: string): string {
    if (typeof error === "object" && error !== null) {
        const anyErr = error as { code?: string; message?: string };
        if (anyErr.code === "PGRST205" || anyErr.code === "42P01") {
            return "Tabel 'penjualan_anorganik' belum dibuat di Supabase. Silakan jalankan file migrasi supabase/migrations/20260908_create_penjualan_anorganik.sql di Supabase SQL Editor.";
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
        const bulan = url.searchParams.get("bulan"); // e.g. '2026-09'
        const kategori = url.searchParams.get("kategori");
        const statusSetoran = url.searchParams.get("status_setoran");
        const search = url.searchParams.get("search");

        const supabase = getSupabaseServerClient();

        let query = supabase
            .from("penjualan_anorganik")
            .select(`
                id,
                desa_id,
                tanggal,
                pembeli,
                kontak_pembeli,
                kategori,
                berat_kg,
                harga_per_kg,
                total_pendapatan,
                status_setoran,
                tanggal_setor,
                catatan,
                petugas_id,
                created_at,
                updated_at,
                desa:desa_id ( id, nama )
            `)
            .order("tanggal", { ascending: false })
            .order("created_at", { ascending: false });

        if (!session.isAdmin) {
            if (!session.desaId) {
                return NextResponse.json(
                    { ok: false, error: "Akun Anda belum terhubung ke desa manapun." },
                    { status: 403 },
                );
            }
            query = query.eq("desa_id", session.desaId);
        } else if (desaId && desaId !== "all") {
            query = query.eq("desa_id", desaId);
        }

        if (bulan) {
            // Match tanggal starting with 'YYYY-MM'
            const [yearStr, monthStr] = bulan.split("-");
            if (yearStr && monthStr) {
                const start = `${bulan}-01`;
                const nextMonthDate = new Date(parseInt(yearStr, 10), parseInt(monthStr, 10), 1);
                const nextMonthStr = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, "0")}-01`;
                query = query.gte("tanggal", start).lt("tanggal", nextMonthStr);
            }
        }

        if (kategori && kategori !== "all") {
            query = query.eq("kategori", kategori);
        }

        if (statusSetoran && statusSetoran !== "all") {
            query = query.eq("status_setoran", statusSetoran);
        }

        if (search) {
            const cleanSearch = search.trim();
            if (cleanSearch) {
                query = query.or(`pembeli.ilike.%${cleanSearch}%,catatan.ilike.%${cleanSearch}%`);
            }
        }

        const { data, error } = await query;
        if (error) {
            return NextResponse.json(
                { ok: false, error: getErrorMessage(error, "Gagal memuat data penjualan anorganik.") },
                { status: 500 },
            );
        }

        return NextResponse.json({ ok: true, rows: data || [] });
    } catch (err) {
        return NextResponse.json(
            { ok: false, error: getErrorMessage(err, "Terjadi kesalahan internal.") },
            { status: 500 },
        );
    }
}

export async function POST(request: Request) {
    try {
        const session = await getSessionContext();
        if (!session) {
            return NextResponse.json(
                { ok: false, error: "Anda harus login untuk mengakses data ini." },
                { status: 401 },
            );
        }

        const body = await request.json();
        if (!body || typeof body !== "object") {
            return NextResponse.json(
                { ok: false, error: "Body request tidak valid." },
                { status: 400 },
            );
        }

        // Determine target desa_id
        let desaId = toText(body.desa_id);
        if (!session.isAdmin) {
            if (!session.desaId) {
                return NextResponse.json(
                    { ok: false, error: "Akun Anda belum terhubung ke desa manapun." },
                    { status: 403 },
                );
            }
            desaId = session.desaId;
        } else if (!desaId) {
            return NextResponse.json(
                { ok: false, error: "Pilih desa untuk mencatat penjualan anorganik." },
                { status: 400 },
            );
        }

        // Support both single item and batch items
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rawItems: any[] = Array.isArray(body.items) ? body.items : [body];
        if (rawItems.length === 0) {
            return NextResponse.json(
                { ok: false, error: "Daftar barang penjualan tidak boleh kosong." },
                { status: 400 },
            );
        }

        const rowsToInsert = [];
        for (const item of rawItems) {
            const pembeli = toText(item.pembeli || body.pembeli);
            if (!pembeli) {
                return NextResponse.json(
                    { ok: false, error: "Nama pembeli / pengepul wajib diisi." },
                    { status: 400 },
                );
            }

            const kategori = toText(item.kategori) as KategoriAnorganik;
            if (!VALID_KATEGORI.includes(kategori)) {
                return NextResponse.json(
                    { ok: false, error: `Kategori '${kategori}' tidak valid. Pilih dari: ${VALID_KATEGORI.join(", ")}.` },
                    { status: 400 },
                );
            }

            const beratKg = Number(item.berat_kg);
            if (!Number.isFinite(beratKg) || beratKg <= 0) {
                return NextResponse.json(
                    { ok: false, error: "Berat (kg) harus lebih besar dari 0." },
                    { status: 400 },
                );
            }

            const hargaPerKg = Number(item.harga_per_kg);
            if (!Number.isFinite(hargaPerKg) || hargaPerKg < 0) {
                return NextResponse.json(
                    { ok: false, error: "Harga per kg harus berupa angka nol atau lebih." },
                    { status: 400 },
                );
            }

            const supabaseClient = getSupabaseServerClient();
            const availableStock = await getAvailableStockKg(supabaseClient, desaId, kategori);
            if (availableStock <= 0) {
                return NextResponse.json(
                    {
                        ok: false,
                        error: `Stok ${kategori} siap jual saat ini 0 kg (habis). Input penjualan tidak dapat dilakukan.`,
                    },
                    { status: 400 },
                );
            }
            if (beratKg > availableStock) {
                return NextResponse.json(
                    {
                        ok: false,
                        error: `Berat penjualan (${beratKg} kg) melebihi sisa stok ${kategori} siap jual (${availableStock} kg). Input tidak dapat dilakukan.`,
                    },
                    { status: 400 },
                );
            }

            const totalPendapatan = Math.round(beratKg * hargaPerKg);

            const tanggal = toText(item.tanggal || body.tanggal) || new Date().toISOString().slice(0, 10);
            const statusSetoran = item.status_setoran === "Sudah Disetor" ? "Sudah Disetor" : "Belum Disetor";
            const tanggalSetor = statusSetoran === "Sudah Disetor"
                ? (toText(item.tanggal_setor) || tanggal)
                : null;

            rowsToInsert.push({
                desa_id: desaId,
                tanggal,
                pembeli,
                kontak_pembeli: toText(item.kontak_pembeli || body.kontak_pembeli) || null,
                kategori,
                berat_kg: beratKg,
                harga_per_kg: hargaPerKg,
                total_pendapatan: totalPendapatan,
                status_setoran: statusSetoran,
                tanggal_setor: tanggalSetor,
                catatan: toText(item.catatan || body.catatan) || null,
                petugas_id: session.petugasId || null,
            });
        }

        const supabase = getSupabaseServerClient();
        const { data, error } = await supabase
            .from("penjualan_anorganik")
            .insert(rowsToInsert)
            .select();

        if (error) {
            return NextResponse.json(
                { ok: false, error: getErrorMessage(error, "Gagal menyimpan penjualan anorganik.") },
                { status: 500 },
            );
        }

        return NextResponse.json({ ok: true, rows: data || [] }, { status: 201 });
    } catch (err) {
        return NextResponse.json(
            { ok: false, error: getErrorMessage(err, "Terjadi kesalahan internal.") },
            { status: 500 },
        );
    }
}

export async function PUT(request: Request) {
    try {
        const session = await getSessionContext();
        if (!session) {
            return NextResponse.json(
                { ok: false, error: "Anda harus login untuk mengakses data ini." },
                { status: 401 },
            );
        }

        const body = await request.json();
        const id = toText(body?.id);
        if (!id) {
            return NextResponse.json(
                { ok: false, error: "ID penjualan wajib disertakan." },
                { status: 400 },
            );
        }

        const pembeli = toText(body.pembeli);
        if (!pembeli) {
            return NextResponse.json(
                { ok: false, error: "Nama pembeli / pengepul wajib diisi." },
                { status: 400 },
            );
        }

        const kategori = toText(body.kategori) as KategoriAnorganik;
        if (!VALID_KATEGORI.includes(kategori)) {
            return NextResponse.json(
                { ok: false, error: `Kategori '${kategori}' tidak valid.` },
                { status: 400 },
            );
        }

        const beratKg = Number(body.berat_kg);
        if (!Number.isFinite(beratKg) || beratKg <= 0) {
            return NextResponse.json(
                { ok: false, error: "Berat (kg) harus lebih besar dari 0." },
                { status: 400 },
            );
        }

        const hargaPerKg = Number(body.harga_per_kg);
        if (!Number.isFinite(hargaPerKg) || hargaPerKg < 0) {
            return NextResponse.json(
                { ok: false, error: "Harga per kg harus berupa angka nol atau lebih." },
                { status: 400 },
            );
        }

        const supabase = getSupabaseServerClient();

        // Fetch existing record to check desa_id and past weight
        const { data: existingData } = await supabase
            .from("penjualan_anorganik")
            .select("id, desa_id, berat_kg, kategori")
            .eq("id", id)
            .maybeSingle();

        if (!existingData) {
            return NextResponse.json(
                { ok: false, error: "Data penjualan tidak ditemukan." },
                { status: 404 },
            );
        }

        const targetDesaId = existingData.desa_id || session.desaId;
        if (targetDesaId) {
            const availableStock = await getAvailableStockKg(supabase, targetDesaId, kategori, id);
            if (beratKg > availableStock) {
                return NextResponse.json(
                    {
                        ok: false,
                        error: `Berat penjualan (${beratKg} kg) melebihi sisa stok ${kategori} siap jual (${availableStock} kg). Input tidak dapat dilakukan.`,
                    },
                    { status: 400 },
                );
            }
        }

        const totalPendapatan = Math.round(beratKg * hargaPerKg);
        const tanggal = toText(body.tanggal) || new Date().toISOString().slice(0, 10);
        const statusSetoran = body.status_setoran === "Sudah Disetor" ? "Sudah Disetor" : "Belum Disetor";
        const tanggalSetor = statusSetoran === "Sudah Disetor"
            ? (toText(body.tanggal_setor) || tanggal)
            : null;

        const updatePayload = {
            tanggal,
            pembeli,
            kontak_pembeli: toText(body.kontak_pembeli) || null,
            kategori,
            berat_kg: beratKg,
            harga_per_kg: hargaPerKg,
            total_pendapatan: totalPendapatan,
            status_setoran: statusSetoran,
            tanggal_setor: tanggalSetor,
            catatan: toText(body.catatan) || null,
            updated_at: new Date().toISOString(),
        };

        let query = supabase.from("penjualan_anorganik").update(updatePayload).eq("id", id);

        if (!session.isAdmin) {
            if (!session.desaId) {
                return NextResponse.json(
                    { ok: false, error: "Akun Anda belum terhubung ke desa manapun." },
                    { status: 403 },
                );
            }
            query = query.eq("desa_id", session.desaId);
        }

        const { data, error } = await query.select();
        if (error) {
            return NextResponse.json(
                { ok: false, error: getErrorMessage(error, "Gagal memperbarui penjualan anorganik.") },
                { status: 500 },
            );
        }

        if (!data || data.length === 0) {
            return NextResponse.json(
                { ok: false, error: "Data penjualan tidak ditemukan atau tidak memiliki akses." },
                { status: 404 },
            );
        }

        return NextResponse.json({ ok: true, row: data[0] });
    } catch (err) {
        return NextResponse.json(
            { ok: false, error: getErrorMessage(err, "Terjadi kesalahan internal.") },
            { status: 500 },
        );
    }
}

export async function DELETE(request: Request) {
    try {
        const session = await getSessionContext();
        if (!session) {
            return NextResponse.json(
                { ok: false, error: "Anda harus login untuk mengakses data ini." },
                { status: 401 },
            );
        }

        const url = new URL(request.url);
        const id = toText(url.searchParams.get("id"));
        if (!id) {
            return NextResponse.json(
                { ok: false, error: "ID penjualan wajib disertakan." },
                { status: 400 },
            );
        }

        const supabase = getSupabaseServerClient();
        let query = supabase.from("penjualan_anorganik").delete().eq("id", id);

        if (!session.isAdmin) {
            if (!session.desaId) {
                return NextResponse.json(
                    { ok: false, error: "Akun Anda belum terhubung ke desa manapun." },
                    { status: 403 },
                );
            }
            query = query.eq("desa_id", session.desaId);
        }

        const { error } = await query;
        if (error) {
            return NextResponse.json(
                { ok: false, error: getErrorMessage(error, "Gagal menghapus data penjualan.") },
                { status: 500 },
            );
        }

        return NextResponse.json({ ok: true });
    } catch (err) {
        return NextResponse.json(
            { ok: false, error: getErrorMessage(err, "Terjadi kesalahan internal.") },
            { status: 500 },
        );
    }
}
