import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type WasteInput = {
    tanggal: string;
    asal_sampah: string;
    total_berat_kg: number;
    created_at: string;
};
type Sorting = {
    tanggal: string;
    organik_kg: number;
    anorganik_kg: number;
    residu_kg: number;
    kardus_kg: number;
    kaca_kg: number;
    besi_kg: number;
    anorganik_lainnya_kg: number;
    created_at: string;
};

const zeroMonths = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "Mei",
    "Jun",
    "Jul",
    "Agu",
    "Sep",
    "Okt",
    "Nov",
    "Des",
].map((month) => ({ month, total_kg: 0 }));
const toDateKey = (year: number, month: number, day: number) =>
    `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
const formatDisplayDate = (date: string) => date.slice(8, 10);
const formatActivityDate = (date: string, createdAt: string) => {
    const [, month, day] = date.slice(0, 10).split("-");
    const time = new Intl.DateTimeFormat("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
    }).format(new Date(createdAt));
    return `${day} ${["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"][Number(month) - 1]}, ${time}`;
};

export async function GET(request: Request) {
    try {
        const period =
            new URL(request.url).searchParams.get("period") === "year"
                ? "year"
                : "month";
        const supabase = getSupabaseServerClient();
        const [incomingResult, sortingResult] = await Promise.all([
            supabase
                .from("sampah_masuk")
                .select("tanggal, asal_sampah, total_berat_kg, created_at")
                .order("created_at", { ascending: false }),
            supabase
                .from("pemilahan_sampah")
                .select(
                    "tanggal, organik_kg, anorganik_kg, residu_kg, kardus_kg, kaca_kg, besi_kg, anorganik_lainnya_kg, created_at",
                )
                .order("created_at", { ascending: false }),
        ]);
        if (incomingResult.error) throw new Error(incomingResult.error.message);
        if (sortingResult.error) throw new Error(sortingResult.error.message);

        const incoming = (incomingResult.data ?? []) as WasteInput[];
        const sorting = (sortingResult.data ?? []) as Sorting[];
        const totalIncoming = incoming.reduce(
            (sum, row) => sum + Number(row.total_berat_kg || 0),
            0,
        );
        const organik = sorting.reduce(
            (sum, row) => sum + Number(row.organik_kg || 0),
            0,
        );
        const anorganik = sorting.reduce(
            (sum, row) => sum + Number(row.anorganik_kg || 0),
            0,
        );
        const residu = sorting.reduce(
            (sum, row) => sum + Number(row.residu_kg || 0),
            0,
        );
        const sortedTotal = organik + anorganik + residu;
        const lastUpdated =
            [
                ...incoming.map((row) => row.created_at),
                ...sorting.map((row) => row.created_at),
            ]
                .filter(Boolean)
                .sort()
                .at(-1) ?? null;
        const latestIncomingDate = incoming.length
            ? incoming.reduce(
                  (latest, row) =>
                      row.tanggal > latest ? row.tanggal : latest,
                  incoming[0].tanggal,
              )
            : toDateKey(
                  new Date().getFullYear(),
                  new Date().getMonth(),
                  new Date().getDate(),
              );
        const chart =
            period === "year"
                ? zeroMonths.map((item, monthIndex) => ({
                      label: item.month,
                      total_kg: incoming
                          .filter(
                              (row) =>
                                  new Date(
                                      `${row.tanggal}T00:00:00`,
                                  ).getMonth() === monthIndex,
                          )
                          .reduce(
                              (sum, row) =>
                                  sum + Number(row.total_berat_kg || 0),
                              0,
                          ),
                  }))
                : Array.from(
                      {
                          length: (() => {
                              const latestDate = latestIncomingDate;
                              const [year, month] = latestDate
                                  .split("-")
                                  .map(Number);
                              return new Date(year, month, 0).getDate();
                          })(),
                      },
                      (_, index) => {
                          const latestDate = latestIncomingDate;
                          const [year, month] = latestDate
                              .split("-")
                              .map(Number);
                          const key = toDateKey(year, month - 1, index + 1);
                          return {
                              label: formatDisplayDate(key),
                              total_kg: incoming
                                  .filter(
                                      (row) => row.tanggal.slice(0, 10) === key,
                                  )
                                  .reduce(
                                      (sum, row) =>
                                          sum + Number(row.total_berat_kg || 0),
                                      0,
                                  ),
                          };
                      },
                  );
        const regions = Object.entries(
            incoming.reduce<Record<string, number>>((result, row) => {
                result[row.asal_sampah] =
                    (result[row.asal_sampah] ?? 0) +
                    Number(row.total_berat_kg || 0);
                return result;
            }, {}),
        )
            .map(([name, total_kg]) => ({ name, total_kg }))
            .sort((a, b) => b.total_kg - a.total_kg)
            .slice(0, 4);
        const activities = [
            ...incoming.map((row) => ({
                created_at: row.created_at,
                title: "Sampah Masuk",
                meta: `${row.asal_sampah} · ${formatActivityDate(row.tanggal, row.created_at)}`,
                value: `+${row.total_berat_kg} kg`,
                tone: "teal",
            })),
            ...sorting.map((row) => ({
                created_at: row.created_at,
                title: "Sampah Dipilah",
                meta: `Pemilahan · ${formatActivityDate(row.tanggal, row.created_at)}`,
                value: `+${row.organik_kg + row.anorganik_kg + row.residu_kg} kg`,
                tone: "lime",
            })),
        ]
            .sort((first, second) =>
                second.created_at.localeCompare(first.created_at),
            )
            .map((activity) => ({
                title: activity.title,
                meta: activity.meta,
                value: activity.value,
                tone: activity.tone,
            }));

        return NextResponse.json({
            ok: true,
            data: {
                totalIncoming,
                utilized: Math.max(0, totalIncoming - residu),
                residu,
                sortedTotal,
                organik,
                anorganik,
                recoveryRate: totalIncoming
                    ? ((totalIncoming - residu) / totalIncoming) * 100
                    : 0,
                chart,
                regions,
                activities,
                lastUpdated,
            },
        });
    } catch (error) {
        const message =
            error instanceof Error
                ? error.message
                : "Gagal memuat ringkasan dashboard.";
        return NextResponse.json(
            { ok: false, error: message },
            { status: 503 },
        );
    }
}
