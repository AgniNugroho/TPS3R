import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUserWithRole } from "@/lib/permissions/rbac";

export async function GET() {
  const { user, isSuperAdmin } = await getCurrentUserWithRole();

  if (!user || !isSuperAdmin) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 403 });
  }

  const supabase = await createSupabaseServerClient();
  const startTime = Date.now();

  try {
    const { count, error } = await supabase
      .from("petugas")
      .select("id", { count: "exact", head: true });

    const latencyMs = Date.now() - startTime;

    if (error) {
      return NextResponse.json({
        ok: false,
        latencyMs,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      ok: true,
      latencyMs,
      status: latencyMs < 300 ? "optimal" : latencyMs < 800 ? "sedang" : "lambat",
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        latencyMs: Date.now() - startTime,
        error: err.message || "Gagal melakukan ping database",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
