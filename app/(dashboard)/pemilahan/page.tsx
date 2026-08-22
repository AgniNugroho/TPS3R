import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PemilahanForm } from "@/components/forms/PemilahanForm";
import { logout } from "@/lib/supabase/actions";

function currentBulan() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default async function PemilahanPage(props: PageProps<"/pemilahan">) {
  const searchParams = await props.searchParams;
  const bulanParam = typeof searchParams.bulan === "string" ? searchParams.bulan : undefined;
  const bulan = bulanParam && /^\d{4}-\d{2}$/.test(bulanParam) ? bulanParam : currentBulan();

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: jenisSampah }, { data: pemilahanBulanIni }] = await Promise.all([
    supabase.from("jenis_sampah").select("id, nama").order("nama"),
    supabase.from("pemilahan").select("jenis_sampah_id, berat_kg").eq("bulan", `${bulan}-01`),
  ]);

  const beratMap = new Map((pemilahanBulanIni ?? []).map((row) => [row.jenis_sampah_id, row.berat_kg]));
  const kategoriList = (jenisSampah ?? []).map((row) => ({
    id: row.id,
    nama: row.nama,
    beratKg: beratMap.get(row.id) ?? 0,
  }));

  return (
    <main className="content-wrap">
      <div className="page-heading">
        <div>
          <h1>Pemilahan Jenis Sampah</h1>
          <p className="heading-copy">Rekap bulanan hasil pemilahan sampah TPS3R (seluruh desa).</p>
        </div>
        <form action={logout}>
          <button type="submit" className="secondary-button">
            Keluar
          </button>
        </form>
      </div>

      <form method="get" className="flex items-end gap-3 mb-6">
        <label className="flex flex-col gap-1 text-sm">
          Bulan
          <input type="month" name="bulan" defaultValue={bulan} className="border rounded-md px-3 py-2 text-sm" />
        </label>
        <button type="submit" className="secondary-button">
          Muat bulan ini
        </button>
      </form>

      <PemilahanForm bulan={bulan} kategoriList={kategoriList} />
    </main>
  );
}
