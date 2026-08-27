import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function getSupabaseConfig() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
        throw new Error(
            "Supabase belum dikonfigurasi. Isi NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY.",
        );
    }

    return { url, key };
}

/** Privileged client using the service-role key. Bypasses RLS — callers must apply their own access scoping. */
export function getSupabaseServerClient() {
    const { url, key } = getSupabaseConfig();
    return createClient(url, key, {
        auth: { autoRefreshToken: false, persistSession: false },
    });
}

/** Cookie-bound client scoped to the signed-in user. Used only to resolve the current session/user. */
export async function getSupabaseSessionClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) {
        throw new Error(
            "Supabase belum dikonfigurasi. Isi NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY.",
        );
    }

    const cookieStore = await cookies();
    return createServerClient(url, anonKey, {
        cookies: {
            getAll() {
                return cookieStore.getAll();
            },
            setAll(cookiesToSet) {
                try {
                    for (const { name, value, options } of cookiesToSet) {
                        cookieStore.set(name, value, options);
                    }
                } catch {
                    // Called from a Server Component without a mutable cookie jar; the
                    // proxy (proxy.ts) is responsible for refreshing the session cookie.
                }
            },
        },
    });
}
