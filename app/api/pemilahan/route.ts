import { NextResponse } from "next/server";
import { createSupabaseHandlers } from "@/lib/supabase/route";
import { getSessionContext } from "@/lib/permissions/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { DatabaseRow } from "@/lib/supabase/types";

const baseHandlers = createSupabaseHandlers("pemilahan_sampah");

export const GET = baseHandlers.GET;

export async function POST(request: Request) {
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

        const row = (await request.json()) as DatabaseRow & {
            residu_kg?: number;
            tanggal?: string;
            keterangan?: string;
        };
        if (!row || typeof row !== "object" || Array.isArray(row)) {
            return NextResponse.json(
                { ok: false, error: "Body harus berupa object JSON." },
                { status: 400 },
            );
        }

        if (!session.isAdmin && !session.desaId) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "Akun Anda belum terhubung ke desa manapun.",
                },
                { status: 403 },
            );
        }

        const numericColumns = [
            "organik_kg",
            "anorganik_kg",
            "residu_kg",
            "kardus_kg",
            "kaca_kg",
            "besi_kg",
            "anorganik_lainnya_kg",
        ];
        for (const column of numericColumns) {
            const value = row[column];
            if (value === "" || value === null || value === undefined) {
                row[column] = 0;
                continue;
            }

            const numericValue = Number(value);
            if (!Number.isFinite(numericValue) || numericValue < 0) {
                return NextResponse.json(
                    {
                        ok: false,
                        error: `${column} harus berupa angka nol atau lebih.`,
                    },
                    { status: 400 },
                );
            }
            row[column] = numericValue;
        }

        // Set desa_id untuk non-admin
        if (!session.isAdmin) {
            row.desa_id = session.desaId;
        }

        const supabase = getSupabaseServerClient();

        // Simpan ke pemilahan_sampah
        const { data: pemilahanData, error: pemilahanError } = await supabase
            .from("pemilahan_sampah")
            .insert(row as never)
            .select()
            .single();

        if (pemilahanError) throw pemilahanError;

        // Jika ada residu_kg > 0, simpan juga ke tabel residu
        if (row.residu_kg && row.residu_kg > 0 && row.tanggal) {
            // Ambil informasi dari sampah_masuk untuk mendapatkan asal_sampah dan wilayah
            let sumber = null;
            let lokasi = null;

            if (row.sampah_masuk_id) {
                const { data: sampahMasukData } = await supabase
                    .from("sampah_masuk")
                    .select("asal_sampah, wilayah_id")
                    .eq("id", row.sampah_masuk_id)
                    .single();

                if (sampahMasukData) {
                    sumber = sampahMasukData.asal_sampah;

                    // Ambil nama wilayah jika ada
                    if (sampahMasukData.wilayah_id) {
                        const { data: wilayahData } = await supabase
                            .from("wilayah")
                            .select("dusun")
                            .eq("id", sampahMasukData.wilayah_id)
                            .single();

                        if (wilayahData) {
                            lokasi = wilayahData.dusun;
                        }
                    }
                }
            }

            const residuRecord = {
                tanggal: row.tanggal,
                berat_kg: row.residu_kg,
                lokasi: lokasi,
                sumber: sumber,
                keterangan: row.keterangan || "Residu dari pemilahan sampah",
                desa_id: row.desa_id,
            };

            const { error: residuError } = await supabase
                .from("residu")
                .insert(residuRecord as never);

            if (residuError) {
                console.error(
                    "Warning: Gagal menyimpan ke tabel residu",
                    residuError,
                );
                // Jangan throw error karena pemilahan sudah tersimpan
            }
        }

        return NextResponse.json(
            { ok: true, table: "pemilahan_sampah", data: pemilahanData },
            { status: 201 },
        );
    } catch (error) {
        const message =
            error instanceof Error
                ? error.message
                : typeof error === "object" &&
                    error !== null &&
                    "message" in error &&
                    typeof error.message === "string"
                  ? error.message
                  : "Gagal menyimpan data pemilahan.";
        const databaseErrorCode =
            typeof error === "object" &&
            error !== null &&
            "code" in error &&
            typeof error.code === "string"
                ? error.code
                : undefined;
        const status =
            databaseErrorCode === "23505"
                ? 409
                : databaseErrorCode === "P0001" ||
                    databaseErrorCode === "23503" ||
                    databaseErrorCode === "23514" ||
                    databaseErrorCode === "22P02"
                  ? 400
                  : 500;
        console.error("Gagal menyimpan data pemilahan", error);
        return NextResponse.json({ ok: false, error: message }, { status });
    }
}
