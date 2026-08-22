import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/route-client";

export async function GET(request: Request) {
  const { supabase, unauthorized } = await requireUser(request);
  if (unauthorized) return unauthorized;

  const { data, error } = await supabase
    .from("anggota")
    .select("id, nama, alamat, wilayah_id, wilayah(id, nama_dusun)")
    .order("nama");

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data });
}
