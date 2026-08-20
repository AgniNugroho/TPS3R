import { NextResponse } from "next/server";
import { createRow, listRows } from "./repository";
import type { DatabaseRow } from "./types";
import type { TableName } from "./types";

export function createSupabaseGetHandler(table: TableName) {
  return async function GET(request: Request) {
    try {
      const url = new URL(request.url);
      const allowedFilters = ["asal_sampah", "wilayah_id", "petugas_id", "sampah_masuk_id", "tanggal"];
      const filters = Object.fromEntries(allowedFilters
        .map((key) => [key, url.searchParams.get(key)])
        .filter(([, value]) => value));
      const rows = await listRows(table, filters);
      return NextResponse.json({ ok: true, table, rows });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal membaca database Supabase.";
      return NextResponse.json({ ok: false, error: message }, { status: 503 });
    }
  };
}

export function createSupabaseHandlers(table: TableName) {
  return {
    GET: createSupabaseGetHandler(table),
    async POST(request: Request) {
      try {
        const row = await request.json() as DatabaseRow;
        if (!row || typeof row !== "object" || Array.isArray(row)) {
          return NextResponse.json({ ok: false, error: "Body harus berupa object JSON." }, { status: 400 });
        }
        const data = await createRow(table, row);
        return NextResponse.json({ ok: true, table, data }, { status: 201 });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Gagal menyimpan data Supabase.";
        return NextResponse.json({ ok: false, error: message }, { status: 503 });
      }
    },
  };
}
