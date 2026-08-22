import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { RingkasanContent } from "@/components/dashboard/RingkasanContent";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const REGION_COLORS = ["teal", "lime", "orange", "blue"];

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatKg(value: number) {
  return value.toLocaleString("id-ID", { maximumFractionDigits: 1 });
}

type PengumpulanRow = {
  id: number;
  tanggal: string;
  berat_kg: number;
  created_at: string;
  anggota_id: number;
  wilayah: { nama_dusun: string }[] | null;
};

export default async function Home() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: petugasProfile }, { data: pengumpulanData }, { count: totalAnggota }] = await Promise.all([
    supabase.from("petugas").select("nama").eq("id", user.id).single(),
    supabase
      .from("pengumpulan")
      .select("id, tanggal, berat_kg, created_at, anggota_id, wilayah(nama_dusun)")
      .order("created_at", { ascending: false }),
    supabase.from("anggota").select("id", { count: "exact", head: true }),
  ]);

  const rows = (pengumpulanData ?? []) as PengumpulanRow[];

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 11 ? "Selamat pagi" : hour < 15 ? "Selamat siang" : hour < 19 ? "Selamat sore" : "Selamat malam";

  const last12Months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
    return { key: monthKey(d), label: MONTH_LABELS[d.getMonth()] };
  });

  const monthlyTotals = new Map(last12Months.map((m) => [m.key, 0]));
  for (const row of rows) {
    const key = monthKey(new Date(row.tanggal));
    if (monthlyTotals.has(key)) {
      monthlyTotals.set(key, (monthlyTotals.get(key) ?? 0) + Number(row.berat_kg));
    }
  }

  const monthlyValues = last12Months.map((m) => monthlyTotals.get(m.key) ?? 0);
  const maxMonthly = Math.max(1, ...monthlyValues);
  const monthlyHeights = monthlyValues.map((v) => Math.round((v / maxMonthly) * 100));
  const currentMonthTotal = monthlyValues[monthlyValues.length - 1];
  const prevMonthTotal = monthlyValues[monthlyValues.length - 2];
  const trendPercent = prevMonthTotal > 0
    ? Math.round(((currentMonthTotal - prevMonthTotal) / prevMonthTotal) * 100)
    : currentMonthTotal > 0
      ? 100
      : 0;

  const sampahMasuk = {
    value: formatKg(currentMonthTotal),
    note: currentMonthTotal > 0 || prevMonthTotal > 0
      ? `${trendPercent >= 0 ? "+" : ""}${trendPercent}% vs bulan lalu`
      : "Belum ada data bulan ini",
    trend: (trendPercent >= 0 ? "up" : "down") as "up" | "down",
  };

  const distinctAnggota = new Set(rows.map((row) => row.anggota_id)).size;
  const anggotaPercent = totalAnggota ? Math.round((distinctAnggota / totalAnggota) * 100) : 0;
  const anggotaTerlayani = {
    value: String(distinctAnggota),
    note: `${anggotaPercent}% dari anggota terdaftar`,
    trend: "up" as const,
  };

  const regionTotals = new Map<string, number>();
  for (const row of rows) {
    const name = row.wilayah?.[0]?.nama_dusun ?? "Tanpa dusun";
    regionTotals.set(name, (regionTotals.get(name) ?? 0) + Number(row.berat_kg));
  }
  const regionEntries = [...regionTotals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
  const maxRegion = Math.max(1, ...regionEntries.map(([, value]) => value));
  const regions = regionEntries.map(([name, value], index) => ({
    name,
    value: `${formatKg(value)} kg`,
    percent: Math.round((value / maxRegion) * 100),
    color: REGION_COLORS[index % REGION_COLORS.length],
  }));

  const activities = rows.slice(0, 3).map((row) => ({
    title: "Pengumpulan tercatat",
    meta: `${row.wilayah?.[0]?.nama_dusun ?? "Tanpa dusun"} · ${new Date(row.created_at).toLocaleString("id-ID", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    })}`,
    value: `+${formatKg(Number(row.berat_kg))} kg`,
  }));

  return (
    <RingkasanContent
      greeting={greeting}
      petugasNama={petugasProfile?.nama ?? user.email ?? "Petugas"}
      sampahMasuk={sampahMasuk}
      anggotaTerlayani={anggotaTerlayani}
      monthly={{
        months: last12Months.map((m) => m.label),
        heights: monthlyHeights,
        values: monthlyValues,
        totalLabel: formatKg(monthlyValues.reduce((a, b) => a + b, 0)),
        trendLabel: `${Math.abs(trendPercent)}%`,
        trendUp: trendPercent >= 0,
        highlightIndex: monthlyValues.length - 1,
      }}
      regions={regions}
      activities={activities}
    />
  );
}
