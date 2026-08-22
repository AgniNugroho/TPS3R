import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export function createSupabaseRouteClient(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    token ? { global: { headers: { Authorization: `Bearer ${token}` } } } : undefined
  );

  return { supabase, token };
}

export async function requireUser(request: Request) {
  const { supabase, token } = createSupabaseRouteClient(request);

  if (!token) {
    return {
      user: null,
      supabase,
      unauthorized: NextResponse.json(
        { ok: false, error: "Butuh header Authorization: Bearer <access_token>." },
        { status: 401 }
      ),
    };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser(token);

  if (!user) {
    return {
      user: null,
      supabase,
      unauthorized: NextResponse.json(
        { ok: false, error: "Token tidak valid atau sudah kedaluwarsa." },
        { status: 401 }
      ),
    };
  }

  return { user, supabase, unauthorized: null };
}
