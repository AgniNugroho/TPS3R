import { createClient, SupabaseClient } from "@supabase/supabase-js";

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseBrowserClient() {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  let url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  let key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  if (url.endsWith("/rest/v1/")) {
    url = url.replace("/rest/v1/", "");
  }

  supabaseInstance = createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });

  return supabaseInstance;
}
