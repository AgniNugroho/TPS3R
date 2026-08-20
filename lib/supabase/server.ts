import { createClient } from "@supabase/supabase-js";

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Supabase belum dikonfigurasi. Isi NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY.");
  }

  return { url, key };
}

export function getSupabaseServerClient() {
  const { url, key } = getSupabaseConfig();
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}
