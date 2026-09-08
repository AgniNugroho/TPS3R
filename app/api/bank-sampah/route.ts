import { NextResponse } from "next/server";
import { getSessionContext } from "@/lib/permissions/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type BankSampahPayload = {
    id?: unknown;
    member_id?: unknown;
    tanggal?: unknown;
    nasabah_id?: unknown;
    nama_nasabah?: unknown;
    jenis_sampah?: unknown;
    berat_kg?: unknown;
    harga_per_kg?: unknown;
    jenis_transaksi?: unknown;
    petugas_id?: unknown;
    desa_id?: unknown;
    sampah_masuk_id?: unknown;
};

function toText(value: unknown): string {
    return typeof value === "string" ? value.trim() : "";
}

function toNullableText(value: unknown): string | null {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
}

function toNumber(value: unknown): number {
    const num = Number(value);
    return Number.isFinite(num) && num >= 0 ? num : 0;
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

function getSanitizedItem(item: BankSampahPayload, desaId: string) {
    const namaNasabah = toText(item.nama_nasabah);
    const tanggal = toText(item.tanggal) || new Date().toISOString().slice(0, 10);
    const beratKg = toNumber(item.berat_kg);
    const hargaPerKg = toNumber(item.harga_per_kg);
    const jenisSampah = toText(item.jenis_sampah) || "Campur";
    const jenisTransaksi = toText(item.jenis_transaksi) || "Setor";
    const nasabahId = toNullableText(item.nasabah_id);
    const memberId = toNullableText(item.member_id);
    const petugasId = toNullableText(item.petugas_id);

    return {
        tanggal,
        member_id: memberId,
        nasabah_id: nasabahId,
        nama_nasabah: namaNasabah,
        jenis_sampah: jenisSampah,
        berat_kg: beratKg,
        harga_per_kg: hargaPerKg,
        jenis_transaksi: jenisTransaksi,
        petugas_id: petugasId,
        desa_id: desaId,
    };
}

async function syncSampahMasukOnCreate(
    supabase: ReturnType<typeof getSupabaseServerClient>,
    bankItem: {
        id: string;
        tanggal: string;
        nama_nasabah: string;
        berat_kg: number;
        jenis_sampah?: string | null;
        member_id?: string | null;
        nasabah_id?: string | null;
        petugas_id?: string | null;
        desa_id: string;
    }
) {
    try {
        let asalSampah = bankItem.nama_nasabah;
        let wilayahId: string | null = null;

        if (bankItem.member_id) {
            const { data: member } = await supabase
                .from("member_bank_sampah")
                .select("nama, wilayah_id, wilayah:wilayah_id(dusun)")
                .eq("id", bankItem.member_id)
                .maybeSingle();

            if (member) {
                const dusun = (member.wilayah as { dusun?: string } | null)?.dusun;
                asalSampah = dusun ? `${dusun} - ${member.nama}` : member.nama;
                wilayahId = member.wilayah_id;
            }
        } else if (bankItem.nasabah_id) {
            wilayahId = bankItem.nasabah_id;
        }

        if (!wilayahId && bankItem.desa_id) {
            const { data: matchedWilayah } = await supabase
                .from("wilayah")
                .select("id, dusun")
                .eq("desa_id", bankItem.desa_id)
                .ilike("dusun", `%${bankItem.nama_nasabah}%`)
                .limit(1)
                .maybeSingle();
            if (matchedWilayah) wilayahId = matchedWilayah.id;
        }

        const keterangan = `Pencatatan Bank Sampah [ref:${bankItem.id}]`;

        const { data: inserted, error } = await supabase
            .from("sampah_masuk")
            .insert({
                tanggal: bankItem.tanggal,
                asal_sampah: asalSampah,
                wilayah_id: wilayahId,
                member_id: bankItem.member_id || null,
                total_berat_kg: bankItem.berat_kg,
                keterangan,
                desa_id: bankItem.desa_id,
                petugas_id: bankItem.petugas_id || null,
            })
            .select("id")
            .single();

        if (error) {
            console.error("Gagal sync ke sampah_masuk:", error.message);
            return null;
        }

        try {
            await supabase
                .from("bank_sampah")
                .update({ sampah_masuk_id: inserted.id })
                .eq("id", bankItem.id);
        } catch {
            // Ignore if column does not exist yet
        }

        return inserted?.id || null;
    } catch (err) {
        console.error("Error in syncSampahMasukOnCreate:", err);
        return null;
    }
}

async function syncSampahMasukOnUpdate(
    supabase: ReturnType<typeof getSupabaseServerClient>,
    bankItemId: string,
    updatedValues: {
        tanggal: string;
        berat_kg: number;
        nama_nasabah: string;
        member_id?: string | null;
        nasabah_id?: string | null;
        desa_id?: string | null;
    }
) {
    try {
        const { data: match } = await supabase
            .from("sampah_masuk")
            .select("id")
            .ilike("keterangan", `%[ref:${bankItemId}]%`)
            .maybeSingle();

        if (match) {
            let asalSampah = updatedValues.nama_nasabah;
            let wilayahId: string | null = null;

            if (updatedValues.member_id) {
                const { data: member } = await supabase
                    .from("member_bank_sampah")
                    .select("nama, wilayah_id, wilayah:wilayah_id(dusun)")
                    .eq("id", updatedValues.member_id)
                    .maybeSingle();
                if (member) {
                    const dusun = (member.wilayah as { dusun?: string } | null)?.dusun;
                    asalSampah = dusun ? `${dusun} - ${member.nama}` : member.nama;
                    wilayahId = member.wilayah_id;
                }
            } else if (updatedValues.nasabah_id) {
                wilayahId = updatedValues.nasabah_id;
            }

            await supabase
                .from("sampah_masuk")
                .update({
                    tanggal: updatedValues.tanggal,
                    total_berat_kg: updatedValues.berat_kg,
                    asal_sampah: asalSampah,
                    ...(wilayahId ? { wilayah_id: wilayahId } : {}),
                })
                .eq("id", match.id);
        }
    } catch (err) {
        console.error("Error in syncSampahMasukOnUpdate:", err);
    }
}

async function syncSampahMasukOnDelete(
    supabase: ReturnType<typeof getSupabaseServerClient>,
    bankItemId: string
) {
    try {
        const { data: match } = await supabase
            .from("sampah_masuk")
            .select("id")
            .ilike("keterangan", `%[ref:${bankItemId}]%`)
            .maybeSingle();

        if (match) {
            await supabase.from("sampah_masuk").delete().eq("id", match.id);
        }
    } catch (err) {
        console.error("Error in syncSampahMasukOnDelete:", err);
    }
}

export async function GET(request: Request) {
    try {
        const result = await getSessionOrError();
        if ("error" in result) return result.error;

        const url = new URL(request.url);
        const requestedDesaId = url.searchParams.get("desa_id");
        const bulan = url.searchParams.get("bulan"); // 1 - 12
        const tahun = url.searchParams.get("tahun"); // e.g. 2026
        const tanggal = url.searchParams.get("tanggal"); // YYYY-MM-DD
        const search = url.searchParams.get("search");
        const namaNasabah = url.searchParams.get("nama_nasabah");
        const memberId = url.searchParams.get("member_id");

        const desaId = result.session.isAdmin
            ? requestedDesaId
            : result.session.desaId;

        if (!desaId && !result.session.isAdmin) {
            return NextResponse.json({ ok: true, rows: [] });
        }

        const supabase = getSupabaseServerClient();
        let query = supabase.from("bank_sampah").select("*");

        if (desaId) {
            query = query.eq("desa_id", desaId);
        }

        if (memberId) {
            query = query.eq("member_id", memberId);
        }

        if (tanggal) {
            query = query.eq("tanggal", tanggal);
        } else if (tahun && bulan) {
            const yearNum = parseInt(tahun, 10);
            const monthNum = parseInt(bulan, 10);
            if (!isNaN(yearNum) && !isNaN(monthNum) && monthNum >= 1 && monthNum <= 12) {
                const startDate = `${yearNum}-${String(monthNum).padStart(2, "0")}-01`;
                const lastDay = new Date(yearNum, monthNum, 0).getDate();
                const endDate = `${yearNum}-${String(monthNum).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
                query = query.gte("tanggal", startDate).lte("tanggal", endDate);
            }
        } else if (tahun) {
            const yearNum = parseInt(tahun, 10);
            if (!isNaN(yearNum)) {
                query = query.gte("tanggal", `${yearNum}-01-01`).lte("tanggal", `${yearNum}-12-31`);
            }
        }

        if (namaNasabah) {
            query = query.eq("nama_nasabah", namaNasabah);
        }

        if (search) {
            query = query.ilike("nama_nasabah", `%${search}%`);
        }

        const { data, error } = await query
            .order("tanggal", { ascending: true })
            .order("created_at", { ascending: true });

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
                        : "Gagal memuat data bank sampah.",
            },
            { status: 500 },
        );
    }
}

export async function POST(request: Request) {
    try {
        const result = await getSessionOrError();
        if ("error" in result) return result.error;

        const body = await request.json();

        // Check if batch insert or single insert
        const isBatch = Array.isArray(body);
        const items = isBatch ? body : [body];

        if (items.length === 0) {
            return NextResponse.json(
                { ok: false, error: "Tidak ada data yang dikirim." },
                { status: 400 },
            );
        }

        const firstItem = items[0] as BankSampahPayload;
        const desaId = result.session.isAdmin
            ? toText(firstItem.desa_id) || (result.session.desaId ?? "")
            : (result.session.desaId ?? "");

        if (!desaId) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "Desa harus ditentukan sebelum menyimpan data.",
                },
                { status: 400 },
            );
        }

        const rowsToInsert = [];
        for (const item of items) {
            const row = getSanitizedItem(item as BankSampahPayload, desaId);
            if (!row.nama_nasabah) {
                return NextResponse.json(
                    { ok: false, error: "Nama member / nasabah wajib diisi." },
                    { status: 400 },
                );
            }
            if (row.berat_kg <= 0 && !isBatch) {
                return NextResponse.json(
                    { ok: false, error: "Berat sampah harus lebih dari 0 kg." },
                    { status: 400 },
                );
            }
            // If batch insert, skip items with 0 weight if desired, or keep only positive
            if (isBatch && row.berat_kg <= 0) {
                continue;
            }
            rowsToInsert.push(row);
        }

        if (rowsToInsert.length === 0) {
            return NextResponse.json(
                { ok: false, error: "Tidak ada data berat sampah (> 0 kg) untuk disimpan." },
                { status: 400 },
            );
        }

        const supabase = getSupabaseServerClient();
        const { data, error } = await supabase
            .from("bank_sampah")
            .insert(rowsToInsert)
            .select();

        if (error) throw error;

        // Auto-sync inserted items to sampah_masuk
        if (Array.isArray(data)) {
            for (const item of data) {
                await syncSampahMasukOnCreate(supabase, {
                    id: item.id,
                    tanggal: item.tanggal,
                    nama_nasabah: item.nama_nasabah,
                    berat_kg: Number(item.berat_kg),
                    jenis_sampah: item.jenis_sampah,
                    member_id: item.member_id,
                    nasabah_id: item.nasabah_id,
                    petugas_id: item.petugas_id,
                    desa_id: item.desa_id,
                });
            }
        }

        return NextResponse.json(
            {
                ok: true,
                data: isBatch ? data : data?.[0],
                count: data?.length ?? 0,
            },
            { status: 201 },
        );
    } catch (error) {
        return NextResponse.json(
            {
                ok: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Gagal menyimpan data bank sampah.",
            },
            { status: 500 },
        );
    }
}

export async function PUT(request: Request) {
    try {
        const result = await getSessionOrError();
        if ("error" in result) return result.error;

        const body = (await request.json()) as BankSampahPayload;
        const id = toText(body.id);

        if (!id) {
            return NextResponse.json(
                { ok: false, error: "ID data wajib disertakan." },
                { status: 400 },
            );
        }

        const supabase = getSupabaseServerClient();
        const { data: existing, error: findError } = await supabase
            .from("bank_sampah")
            .select("id, desa_id")
            .eq("id", id)
            .maybeSingle();

        if (findError) throw findError;
        if (!existing) {
            return NextResponse.json(
                { ok: false, error: "Data bank sampah tidak ditemukan." },
                { status: 404 },
            );
        }

        if (
            !result.session.isAdmin &&
            existing.desa_id !== result.session.desaId
        ) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "Tidak diizinkan mengubah data desa lain.",
                },
                { status: 403 },
            );
        }

        const desaId = result.session.isAdmin
            ? toText(body.desa_id) || existing.desa_id
            : result.session.desaId;

        const sanitized = getSanitizedItem(body, desaId as string);

        if (!sanitized.nama_nasabah) {
            return NextResponse.json(
                { ok: false, error: "Nama member / nasabah wajib diisi." },
                { status: 400 },
            );
        }
        if (sanitized.berat_kg <= 0) {
            return NextResponse.json(
                { ok: false, error: "Berat sampah harus lebih dari 0 kg." },
                { status: 400 },
            );
        }

        const { data, error } = await supabase
            .from("bank_sampah")
            .update(sanitized)
            .eq("id", id)
            .select()
            .single();

        if (error) throw error;

        // Auto-sync update to sampah_masuk
        await syncSampahMasukOnUpdate(supabase, id, sanitized);

        return NextResponse.json({ ok: true, data });
    } catch (error) {
        return NextResponse.json(
            {
                ok: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Gagal memperbarui data bank sampah.",
            },
            { status: 500 },
        );
    }
}

export async function DELETE(request: Request) {
    try {
        const result = await getSessionOrError();
        if ("error" in result) return result.error;

        const url = new URL(request.url);
        const id = url.searchParams.get("id");

        if (!id) {
            return NextResponse.json(
                { ok: false, error: "ID data wajib disertakan." },
                { status: 400 },
            );
        }

        const supabase = getSupabaseServerClient();
        const { data: existing, error: findError } = await supabase
            .from("bank_sampah")
            .select("id, desa_id")
            .eq("id", id)
            .maybeSingle();

        if (findError) throw findError;
        if (!existing) {
            return NextResponse.json(
                { ok: false, error: "Data bank sampah tidak ditemukan." },
                { status: 404 },
            );
        }

        if (
            !result.session.isAdmin &&
            existing.desa_id !== result.session.desaId
        ) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "Tidak diizinkan menghapus data desa lain.",
                },
                { status: 403 },
            );
        }

        const { error } = await supabase
            .from("bank_sampah")
            .delete()
            .eq("id", id);

        if (error) throw error;

        // Auto-sync delete from sampah_masuk
        await syncSampahMasukOnDelete(supabase, id);

        return NextResponse.json({ ok: true });
    } catch (error) {
        return NextResponse.json(
            {
                ok: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Gagal menghapus data bank sampah.",
            },
            { status: 500 },
        );
    }
}
