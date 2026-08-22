"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type PemilahanState = { error?: string; success?: boolean } | undefined;

export async function submitPemilahan(
  _state: PemilahanState,
  formData: FormData
): Promise<PemilahanState> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Sesi login berakhir, silakan login ulang." };
  }

  const bulanInput = String(formData.get("bulan") ?? "");
  if (!/^\d{4}-\d{2}$/.test(bulanInput)) {
    return { error: "Pilih bulan yang valid." };
  }
  const bulan = `${bulanInput}-01`;

  const jenisIds = formData
    .getAll("jenis_sampah_id")
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));

  const rows = jenisIds.map((jenisSampahId) => {
    const beratRaw = formData.get(`berat_${jenisSampahId}`);
    const beratKg = Number(beratRaw);
    return {
      bulan,
      jenis_sampah_id: jenisSampahId,
      berat_kg: Number.isFinite(beratKg) && beratKg >= 0 ? beratKg : 0,
      petugas_id: user.id,
      updated_at: new Date().toISOString(),
    };
  });

  if (rows.length === 0) {
    return { error: "Tidak ada kategori untuk disimpan." };
  }

  const { error } = await supabase
    .from("pemilahan")
    .upsert(rows, { onConflict: "bulan,jenis_sampah_id" });

  if (error) {
    return { error: "Gagal menyimpan data. Coba lagi." };
  }

  revalidatePath("/pemilahan");
  return { success: true };
}
