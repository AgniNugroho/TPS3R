import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const { email, password, nama_lengkap, role } = await request.json();

    const { url, key } = getSupabaseConfigForAdmin();
    // Use the admin client to bypass RLS and create users
    const { createClient } = await import("@supabase/supabase-js");
    const adminAuthClient = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

    // 1. Create user in auth.users
    const { data: authData, error: authError } = await adminAuthClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) throw new Error(authError.message);
    if (!authData.user) throw new Error("Gagal membuat user");

    // 2. Insert into public.profiles
    const supabase = getSupabaseServerClient();
    const { error: profileError } = await supabase.from("profiles").insert({
      id: authData.user.id,
      nama_lengkap,
      role
    });

    if (profileError) {
      // Rollback if profile creation fails
      await adminAuthClient.auth.admin.deleteUser(authData.user.id);
      throw new Error(profileError.message);
    }

    return NextResponse.json({ ok: true, user: authData.user });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) throw new Error("ID tidak valid");

    const { url, key } = getSupabaseConfigForAdmin();
    const { createClient } = await import("@supabase/supabase-js");
    const adminAuthClient = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

    // 1. Delete from public.profiles
    const supabase = getSupabaseServerClient();
    await supabase.from("profiles").delete().eq("id", id);

    // 2. Delete from auth.users
    const { error } = await adminAuthClient.auth.admin.deleteUser(id);
    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }
}

function getSupabaseConfigForAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !key) throw new Error("Server configuration missing");
  return { url, key };
}
