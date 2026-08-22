"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/lib/permissions/rbac";
import {
  adminCreateUser,
  adminDeleteUser,
  adminUpdatePassword,
  adminUpdateUser,
} from "@/lib/supabase/admin";

export type AccountActionState =
  | {
      error?: string;
      success?: boolean;
      message?: string;
    }
  | undefined;

export async function createPetugasAction(
  _state: AccountActionState,
  formData: FormData
): Promise<AccountActionState> {
  await requireSuperAdmin();

  const nama = String(formData.get("nama") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const role = (formData.get("role") as "petugas" | "superadmin") ?? "petugas";

  if (!nama || !email || !password) {
    return { error: "Semua field (Nama, Email, Password) wajib diisi." };
  }

  if (password.length < 6) {
    return { error: "Password minimal 6 karakter." };
  }

  try {
    const res = await adminCreateUser({ nama, email, password, role });
    if (res.error) {
      return { error: res.error };
    }

    revalidatePath("/petugas");
    revalidatePath("/");
    return { success: true, message: `Akun ${email} berhasil dibuat!` };
  } catch (err: any) {
    return { error: err.message || "Gagal membuat akun petugas." };
  }
}

export async function deletePetugasAction(
  _state: AccountActionState,
  formData: FormData
): Promise<AccountActionState> {
  const { user } = await requireSuperAdmin();

  const targetUserId = String(formData.get("userId") ?? "");
  if (!targetUserId) {
    return { error: "User ID tidak valid." };
  }

  if (targetUserId === user.id) {
    return { error: "Anda tidak dapat menghapus akun Anda sendiri." };
  }

  try {
    const res = await adminDeleteUser(targetUserId);
    if (res.error) {
      return { error: res.error };
    }

    revalidatePath("/petugas");
    revalidatePath("/");
    return { success: true, message: "Akun berhasil dihapus." };
  } catch (err: any) {
    return { error: err.message || "Gagal menghapus akun." };
  }
}

export async function resetPasswordAction(
  _state: AccountActionState,
  formData: FormData
): Promise<AccountActionState> {
  await requireSuperAdmin();

  const targetUserId = String(formData.get("userId") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");

  if (!targetUserId || !newPassword) {
    return { error: "User ID dan Password Baru wajib diisi." };
  }

  if (newPassword.length < 6) {
    return { error: "Password baru minimal 6 karakter." };
  }

  try {
    const res = await adminUpdatePassword(targetUserId, newPassword);
    if (res.error) {
      return { error: res.error };
    }

    revalidatePath("/petugas");
    return { success: true, message: "Password akun berhasil direset." };
  } catch (err: any) {
    return { error: err.message || "Gagal mereset password." };
  }
}

export async function updateRoleAction(
  _state: AccountActionState,
  formData: FormData
): Promise<AccountActionState> {
  const { user } = await requireSuperAdmin();

  const targetUserId = String(formData.get("userId") ?? "");
  const newRole = formData.get("role") as "petugas" | "superadmin";

  if (!targetUserId || !newRole) {
    return { error: "Data tidak lengkap." };
  }

  if (targetUserId === user.id && newRole !== "superadmin") {
    return { error: "Anda tidak dapat menurunkan role akun Anda sendiri." };
  }

  try {
    const res = await adminUpdateUser(targetUserId, { role: newRole });
    if (res.error) {
      return { error: res.error };
    }

    revalidatePath("/petugas");
    revalidatePath("/");
    return { success: true, message: "Role akun berhasil diperbarui." };
  } catch (err: any) {
    return { error: err.message || "Gagal memperbarui role." };
  }
}
