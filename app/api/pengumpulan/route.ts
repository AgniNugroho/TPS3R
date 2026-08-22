import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/route-client";

export async function GET(request: Request) {
  const { supabase, unauthorized } = await requireUser(request);
  if (unauthorized) return unauthorized;

  const { data, error } = await supabase
    .from("pengumpulan")
    .select("id, tanggal, berat_kg, catatan, created_at, anggota_id, wilayah_id, anggota(nama), wilayah(nama_dusun)")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data });
}

export async function POST(request: Request) {
  const { supabase, user, unauthorized } = await requireUser(request);
  if (unauthorized) return unauthorized;

  const body = await request.json().catch(() => null);
  const anggotaId = Number(body?.anggota_id);
  const wilayahId = body?.wilayah_id ? Number(body.wilayah_id) : null;
  const tanggal = String(body?.tanggal ?? "");
  const beratKg = Number(body?.berat_kg);
  const catatan = typeof body?.catatan === "string" ? body.catatan.trim() : null;

  if (!Number.isFinite(anggotaId) || !tanggal || !Number.isFinite(beratKg) || beratKg <= 0) {
    return NextResponse.json(
      { ok: false, error: "Field anggota_id, tanggal, dan berat_kg (>0) wajib diisi dengan benar." },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("pengumpulan")
    .insert({
      anggota_id: anggotaId,
      wilayah_id: wilayahId,
      tanggal,
      berat_kg: beratKg,
      catatan: catatan || null,
      petugas_id: user!.id,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data }, { status: 201 });
}
