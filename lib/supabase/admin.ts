import { createClient } from "@supabase/supabase-js";

export function getSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY belum dikonfigurasi di .env.local. " +
      "Silakan ambil service_role key dari Supabase Dashboard (Settings -> API) dan masukkan ke file .env.local."
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export type CreateUserParams = {
  nama: string;
  email: string;
  password: string;
  role: "petugas" | "superadmin";
};

export async function adminCreateUser({ nama, email, password, role }: CreateUserParams) {
  const admin = getSupabaseAdminClient();

  // 1. Buat akun di auth.users dengan email terverifikasi langsung (tanpa registrasi publik)
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nama, role },
  });

  if (authError || !authData.user) {
    return { error: authError?.message || "Gagal membuat akun authentication." };
  }

  const userId = authData.user.id;

  // 2. Tambahkan / sinkronkan baris ke tabel public.petugas
  const { error: profileError } = await admin
    .from("petugas")
    .upsert({
      id: userId,
      nama,
      email,
      role,
    });

  if (profileError) {
    // Jika gagal di database profile, bersihkan akun auth agar konsisten
    await admin.auth.admin.deleteUser(userId);
    return { error: `Gagal menyimpan profil petugas: ${profileError.message}` };
  }

  return { success: true, user: authData.user };
}

export async function adminDeleteUser(userId: string) {
  const admin = getSupabaseAdminClient();

  // Hapus dari tabel petugas dan auth.users
  const { error: profileError } = await admin.from("petugas").delete().eq("id", userId);
  if (profileError) {
    return { error: `Gagal menghapus data petugas: ${profileError.message}` };
  }

  const { error: authError } = await admin.auth.admin.deleteUser(userId);
  if (authError) {
    return { error: `Gagal menghapus user auth: ${authError.message}` };
  }

  return { success: true };
}

export async function adminUpdatePassword(userId: string, newPassword: string) {
  const admin = getSupabaseAdminClient();

  const { error } = await admin.auth.admin.updateUserById(userId, {
    password: newPassword,
  });

  if (error) {
    return { error: `Gagal memperbarui password: ${error.message}` };
  }

  return { success: true };
}

export async function adminUpdateUser(
  userId: string,
  data: { nama?: string; role?: "petugas" | "superadmin" }
) {
  const admin = getSupabaseAdminClient();

  if (data.nama || data.role) {
    const { error: profileError } = await admin
      .from("petugas")
      .update({
        ...(data.nama ? { nama: data.nama } : {}),
        ...(data.role ? { role: data.role } : {}),
      })
      .eq("id", userId);

    if (profileError) {
      return { error: `Gagal memperbarui profil: ${profileError.message}` };
    }

    await admin.auth.admin.updateUserById(userId, {
      user_metadata: {
        ...(data.nama ? { nama: data.nama } : {}),
        ...(data.role ? { role: data.role } : {}),
      },
    });
  }

  return { success: true };
}
