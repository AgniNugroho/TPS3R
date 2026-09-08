import { NextResponse } from "next/server";
import { getSessionContext } from "@/lib/permissions/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type NotifItem = {
    id: string;
    tipe: "pengaduan" | "reminder";
    judul: string;
    pesan: string;
    waktu: string | null;
    href: string;
};

function isMissingTable(error: unknown) {
    if (typeof error === "object" && error !== null) {
        const code = (error as { code?: string }).code;
        return code === "PGRST205" || code === "42P01";
    }
    return false;
}

function todayJakarta() {
    // WIB (UTC+7) — cukup akurat untuk "hari ini" tanpa lib tambahan.
    const now = new Date(Date.now() + 7 * 60 * 60 * 1000);
    return now.toISOString().slice(0, 10);
}

export async function GET(request: Request) {
    const session = await getSessionContext();
    if (!session) {
        return NextResponse.json(
            { ok: false, error: "Belum login." },
            { status: 401 },
        );
    }

    const url = new URL(request.url);
    const requestedDesa = url.searchParams.get("desa_id");

    // Petugas selalu terkunci ke desanya. Admin bisa memilih satu desa atau semua.
    const scopedDesaId = session.isAdmin
        ? requestedDesa && requestedDesa !== "all"
            ? requestedDesa
            : null
        : session.desaId;

    if (!session.isAdmin && !scopedDesaId) {
        return NextResponse.json({ ok: true, items: [], count: 0 });
    }

    const supabase = getSupabaseServerClient();
    const items: NotifItem[] = [];

    // ── 1. Keluhan warga yang belum ditangani ──
    try {
        let query = supabase
            .from("pengaduan")
            .select("id, nama_pelapor, kategori, created_at, desa_id")
            .eq("status", "Diterima")
            .order("created_at", { ascending: false })
            .limit(15);
        if (scopedDesaId) query = query.eq("desa_id", scopedDesaId);

        const { data, error } = await query;
        if (error && !isMissingTable(error)) throw error;

        for (const row of data ?? []) {
            items.push({
                id: `pengaduan-${row.id}`,
                tipe: "pengaduan",
                judul: "Keluhan warga baru",
                pesan: `${row.kategori} — ${row.nama_pelapor || "Warga anonim"}`,
                waktu: row.created_at ?? null,
                href: "/pengaduan",
            });
        }
    } catch {
        return NextResponse.json(
            { ok: false, error: "Gagal memuat notifikasi keluhan." },
            { status: 500 },
        );
    }

    // ── 2. Pengingat input harian (hanya bila satu desa jelas dalam lingkup) ──
    if (scopedDesaId) {
        const today = todayJakarta();

        const reminderChecks: Array<{
            table: string;
            label: string;
            href: string;
        }> = [
            {
                table: "pengumpulan",
                label: "Pengumpulan",
                href: "/pengumpulan",
            },
            {
                table: "pemilahan_sampah",
                label: "Pilah Sampah",
                href: "/pemilahan",
            },
        ];

        for (const check of reminderChecks) {
            try {
                const { count, error } = await supabase
                    .from(check.table)
                    .select("id", { count: "exact", head: true })
                    .eq("desa_id", scopedDesaId)
                    .eq("tanggal", today);
                if (error) {
                    if (isMissingTable(error)) continue;
                    throw error;
                }
                if (!count) {
                    items.push({
                        id: `reminder-${check.table}-${today}`,
                        tipe: "reminder",
                        judul: "Pengingat input harian",
                        pesan: `Belum ada input ${check.label} hari ini.`,
                        waktu: null,
                        href: check.href,
                    });
                }
            } catch {
                // Lewati pengingat yang gagal dicek, jangan gagalkan seluruh respons.
            }
        }
    }

    // Reminder di atas, lalu keluhan terbaru dulu.
    items.sort((a, b) => {
        if (a.tipe !== b.tipe) return a.tipe === "reminder" ? -1 : 1;
        return (b.waktu ?? "").localeCompare(a.waktu ?? "");
    });

    return NextResponse.json({ ok: true, items, count: items.length });
}
