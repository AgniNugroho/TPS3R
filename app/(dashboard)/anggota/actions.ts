"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/lib/permissions/rbac";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AnggotaActionState =
  | {
      error?: string;
      success?: boolean;
      message?: string;
    }
  | undefined;

export async function createAnggotaAction(
  _state: AnggotaActionState,
  formData: FormData
): Promise<AnggotaActionState> {
  await requireSuperAdmin();
  const supabase = await createSupabaseServerClient();

  const nama = String(formData.get("nama") ?? "").trim();
  const wilayahIdRaw = formData.get("wilayah_id");
  const wilayahId = wilayahIdRaw ? Number(wilayahIdRaw) : null;
  const alamat = String(formData.get("alamat") ?? "").trim();

  if (!nama) {
    return { error: "Nama warga/anggota wajib diisi." };
  }

  const { error } = await supabase.from("anggota").insert({
    nama,
    wilayah_id: Number.isFinite(wilayahId) ? wilayahId : null,
    alamat: alamat || null,
  });

  if (error) {
    return { error: `Gagal menambahkan anggota: ${error.message}` };
  }

  revalidatePath("/anggota");
  revalidatePath("/wilayah");
  revalidatePath("/pengumpulan");
  revalidatePath("/");
  return { success: true, message: `Warga "${nama}" berhasil didaftarkan!` };
}

export async function updateAnggotaAction(
  _state: AnggotaActionState,
  formData: FormData
): Promise<AnggotaActionState> {
  await requireSuperAdmin();
  const supabase = await createSupabaseServerClient();

  const id = Number(formData.get("id"));
  const nama = String(formData.get("nama") ?? "").trim();
  const wilayahIdRaw = formData.get("wilayah_id");
  const wilayahId = wilayahIdRaw ? Number(wilayahIdRaw) : null;
  const alamat = String(formData.get("alamat") ?? "").trim();

  if (!id || !nama) {
    return { error: "Data anggota tidak valid." };
  }

  const { error } = await supabase
    .from("anggota")
    .update({
      nama,
      wilayah_id: Number.isFinite(wilayahId) ? wilayahId : null,
      alamat: alamat || null,
    })
    .eq("id", id);

  if (error) {
    return { error: `Gagal memperbarui anggota: ${error.message}` };
  }

  revalidatePath("/anggota");
  revalidatePath("/pengumpulan");
  revalidatePath("/");
  return { success: true, message: "Data anggota berhasil diperbarui." };
}

export async function deleteAnggotaAction(
  _state: AnggotaActionState,
  formData: FormData
): Promise<AnggotaActionState> {
  await requireSuperAdmin();
  const supabase = await createSupabaseServerClient();

  const id = Number(formData.get("id"));
  if (!id) {
    return { error: "ID anggota tidak valid." };
  }

  const { error } = await supabase.from("anggota").delete().eq("id", id);

  if (error) {
    return { error: `Gagal menghapus anggota: ${error.message}` };
  }

  revalidatePath("/anggota");
  revalidatePath("/pengumpulan");
  revalidatePath("/");
  return { success: true, message: "Anggota berhasil dihapus." };
}
