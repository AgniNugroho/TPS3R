import { NextResponse } from "next/server";
import { getSessionContext } from "@/lib/permissions/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const KATEGORI_LIST = ["Plastik", "Kardus", "Kaca", "Besi", "Medis", "Lainnya"] as const;
type KategoriAnorganik = (typeof KATEGORI_LIST)[number];

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

        const supabase = getSupabaseServerClient();

        // 1. Query pemilahan_sampah for total sorted weights
        let pemilahanQuery = supabase
            .from("pemilahan_sampah")
            .select("plastik_kg, kardus_kg, kaca_kg, besi_kg, medis_kg, anorganik_lainnya_kg, desa_id");

        // 2. Query penjualan_anorganik for total sold weights & revenues
        let penjualanQuery = supabase
            .from("penjualan_anorganik")
            .select("kategori, berat_kg, total_pendapatan, status_setoran, desa_id");

        if (!session.isAdmin) {
            if (!session.desaId) {
                return NextResponse.json(
                    { ok: false, error: "Akun Anda belum terhubung ke desa manapun." },
                    { status: 403 },
                );
            }
            pemilahanQuery = pemilahanQuery.eq("desa_id", session.desaId);
            penjualanQuery = penjualanQuery.eq("desa_id", session.desaId);
        } else if (desaId && desaId !== "all") {
            pemilahanQuery = pemilahanQuery.eq("desa_id", desaId);
            penjualanQuery = penjualanQuery.eq("desa_id", desaId);
        }

        const [pemilahanRes, penjualanRes] = await Promise.all([
            pemilahanQuery,
            penjualanQuery,
        ]);

        const terpilahMap: Record<KategoriAnorganik, number> = {
            Plastik: 0,
            Kardus: 0,
            Kaca: 0,
            Besi: 0,
            Medis: 0,
            Lainnya: 0,
        };

        if (pemilahanRes.data && Array.isArray(pemilahanRes.data)) {
            for (const row of pemilahanRes.data) {
                terpilahMap.Plastik += Number(row.plastik_kg || 0);
                terpilahMap.Kardus += Number(row.kardus_kg || 0);
                terpilahMap.Kaca += Number(row.kaca_kg || 0);
                terpilahMap.Besi += Number(row.besi_kg || 0);
                terpilahMap.Medis += Number(row.medis_kg || 0);
                terpilahMap.Lainnya += Number(row.anorganik_lainnya_kg || 0);
            }
        }

        const terjualMap: Record<KategoriAnorganik, { berat_kg: number; pendapatan: number }> = {
            Plastik: { berat_kg: 0, pendapatan: 0 },
            Kardus: { berat_kg: 0, pendapatan: 0 },
            Kaca: { berat_kg: 0, pendapatan: 0 },
            Besi: { berat_kg: 0, pendapatan: 0 },
            Medis: { berat_kg: 0, pendapatan: 0 },
            Lainnya: { berat_kg: 0, pendapatan: 0 },
        };

        let totalDisetor = 0;
        let totalBelumDisetor = 0;

        if (penjualanRes.data && Array.isArray(penjualanRes.data)) {
            for (const row of penjualanRes.data) {
                const kat = row.kategori as KategoriAnorganik;
                const berat = Number(row.berat_kg || 0);
                const pendapatan = Number(row.total_pendapatan || 0);

                if (terjualMap[kat]) {
                    terjualMap[kat].berat_kg += berat;
                    terjualMap[kat].pendapatan += pendapatan;
                }

                if (row.status_setoran === "Sudah Disetor") {
                    totalDisetor += pendapatan;
                } else {
                    totalBelumDisetor += pendapatan;
                }
            }
        }

        const categories = KATEGORI_LIST.map((kategori) => {
            const terpilah = Math.round(terpilahMap[kategori] * 100) / 100;
            const terjual = Math.round(terjualMap[kategori].berat_kg * 100) / 100;
            const sisa = Math.max(0, Math.round((terpilah - terjual) * 100) / 100);
            return {
                kategori,
                terpilah_kg: terpilah,
                terjual_kg: terjual,
                sisa_stok_kg: sisa,
                pendapatan: terjualMap[kategori].pendapatan,
            };
        });

        const totalTerpilah = categories.reduce((acc, c) => acc + c.terpilah_kg, 0);
        const totalTerjual = categories.reduce((acc, c) => acc + c.terjual_kg, 0);
        const totalSisaStok = Math.max(0, Math.round((totalTerpilah - totalTerjual) * 100) / 100);
        const totalPendapatan = categories.reduce((acc, c) => acc + c.pendapatan, 0);

        return NextResponse.json({
            ok: true,
            summary: {
                total_terpilah_kg: Math.round(totalTerpilah * 100) / 100,
                total_terjual_kg: Math.round(totalTerjual * 100) / 100,
                total_sisa_stok_kg: totalSisaStok,
                total_pendapatan: totalPendapatan,
                total_disetor: totalDisetor,
                total_belum_disetor: totalBelumDisetor,
            },
            categories,
        });
    } catch (err) {
        console.error("Gagal menghitung stok anorganik:", err);
        return NextResponse.json(
            { ok: false, error: "Gagal menghitung stok sampah anorganik." },
            { status: 500 },
        );
    }
}
