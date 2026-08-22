"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/lib/permissions/rbac";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type WilayahActionState =
  | {
      error?: string;
      success?: boolean;
      message?: string;
    }
  | undefined;

export async function createWilayahAction(
  _state: WilayahActionState,
  formData: FormData
): Promise<WilayahActionState> {
  await requireSuperAdmin();
  const supabase = await createSupabaseServerClient();

  const namaDusun = String(formData.get("nama_dusun") ?? "").trim();
  const kodeWilayah = String(formData.get("kode_wilayah") ?? "").trim().toUpperCase();

  if (!namaDusun) {
    return { error: "Nama dusun wajib diisi." };
  }

  const { error } = await supabase
    .from("wilayah")
    .insert({ nama_dusun: namaDusun, kode_wilayah: kodeWilayah || null });

  if (error) {
    return { error: `Gagal menambahkan dusun: ${error.message}` };
  }

  revalidatePath("/wilayah");
  revalidatePath("/");
  return { success: true, message: `Dusun "${namaDusun}" berhasil ditambahkan!` };
}

export async function updateWilayahAction(
  _state: WilayahActionState,
  formData: FormData
): Promise<WilayahActionState> {
  await requireSuperAdmin();
  const supabase = await createSupabaseServerClient();

  const id = Number(formData.get("id"));
  const namaDusun = String(formData.get("nama_dusun") ?? "").trim();
  const kodeWilayah = String(formData.get("kode_wilayah") ?? "").trim().toUpperCase();

  if (!id || !namaDusun) {
    return { error: "Data dusun tidak valid." };
  }

  const { error } = await supabase
    .from("wilayah")
    .update({ nama_dusun: namaDusun, kode_wilayah: kodeWilayah || null })
    .eq("id", id);

  if (error) {
    return { error: `Gagal memperbarui dusun: ${error.message}` };
  }

  revalidatePath("/wilayah");
  revalidatePath("/");
  return { success: true, message: "Data dusun berhasil diperbarui." };
}

export async function deleteWilayahAction(
  _state: WilayahActionState,
  formData: FormData
): Promise<WilayahActionState> {
  await requireSuperAdmin();
  const supabase = await createSupabaseServerClient();

  const id = Number(formData.get("id"));
  if (!id) {
    return { error: "ID dusun tidak valid." };
  }

  const { error } = await supabase.from("wilayah").delete().eq("id", id);

  if (error) {
    return { error: `Gagal menghapus dusun: ${error.message}` };
  }

  revalidatePath("/wilayah");
  revalidatePath("/");
  return { success: true, message: "Dusun berhasil dihapus." };
}
