"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type PengumpulanState = { error?: string; success?: boolean } | undefined;

export async function submitPengumpulan(
  _state: PengumpulanState,
  formData: FormData
): Promise<PengumpulanState> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Sesi login berakhir, silakan login ulang." };
  }

  const anggotaId = String(formData.get("anggota_id") ?? "");
  const wilayahId = String(formData.get("wilayah_id") ?? "");
  const tanggal = String(formData.get("tanggal") ?? "");
  const beratKg = Number(formData.get("berat_kg"));
  const catatan = String(formData.get("catatan") ?? "").trim();

  if (!anggotaId || !tanggal || !Number.isFinite(beratKg) || beratKg <= 0) {
    return { error: "Lengkapi anggota, tanggal, dan berat (kg) dengan benar." };
  }

  const { error } = await supabase.from("pengumpulan").insert({
    anggota_id: Number(anggotaId),
    wilayah_id: wilayahId ? Number(wilayahId) : null,
    tanggal,
    berat_kg: beratKg,
    catatan: catatan || null,
    petugas_id: user.id,
  });

  if (error) {
    return { error: "Gagal menyimpan data. Coba lagi." };
  }

  revalidatePath("/pengumpulan");
  return { success: true };
}

