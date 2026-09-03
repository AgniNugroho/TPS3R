import { NextResponse } from "next/server";
import { createRow, listRows } from "./repository";
import type { DatabaseRow } from "./types";
import { DESA_SCOPE_COLUMN, type TableName } from "./types";
import { getSessionContext } from "@/lib/permissions/session";

export function createSupabaseGetHandler(table: TableName) {
    return async function GET(request: Request) {
        try {
            const session = await getSessionContext();
            if (!session) {
                return NextResponse.json(
                    {
                        ok: false,
                        error: "Anda harus login untuk mengakses data ini.",
                    },
                    { status: 401 },
                );
            }

            const url = new URL(request.url);
            const allowedFilters = [
                "asal_sampah",
                "wilayah_id",
                "petugas_id",
                "sampah_masuk_id",
                "tanggal",
                "desa_id",
            ];
            const filters = Object.fromEntries(
                allowedFilters
                    .map((key) => [key, url.searchParams.get(key)])
                    .filter(([, value]) => value),
            );

            const scopeColumn = DESA_SCOPE_COLUMN[table];
            if (!session.isAdmin) {
                if (!session.desaId) {
                    // Not yet assigned to a desa: must not see unfiltered data.
                    return NextResponse.json({ ok: true, table, rows: [] });
                }
                // Non-admins are locked to their own desa, regardless of any query param.
                filters[scopeColumn] = session.desaId;
            }

            const rows = await listRows(table, filters);
            return NextResponse.json({ ok: true, table, rows });
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : "Gagal membaca database Supabase.";
            return NextResponse.json(
                { ok: false, error: message },
                { status: 503 },
            );
        }
    };
}

export function createSupabaseHandlers(table: TableName) {
    return {
        GET: createSupabaseGetHandler(table),
        async POST(request: Request) {
            try {
                const session = await getSessionContext();
                if (!session) {
                    return NextResponse.json(
                        {
                            ok: false,
                            error: "Anda harus login untuk mengakses data ini.",
                        },
                        { status: 401 },
                    );
                }

                const row = (await request.json()) as DatabaseRow;
                if (!row || typeof row !== "object" || Array.isArray(row)) {
                    return NextResponse.json(
                        { ok: false, error: "Body harus berupa object JSON." },
                        { status: 400 },
                    );
                }

                const scopeColumn = DESA_SCOPE_COLUMN[table];
                if (!session.isAdmin) {
                    if (!session.desaId) {
                        return NextResponse.json(
                            {
                                ok: false,
                                error: "Akun Anda belum terhubung ke desa manapun.",
                            },
                            { status: 403 },
                        );
                    }
                    if (scopeColumn === "desa_id") {
                        const requestedDesaId = row.desa_id;
                        if (
                            requestedDesaId &&
                            requestedDesaId !== session.desaId
                        ) {
                            return NextResponse.json(
                                {
                                    ok: false,
                                    error: "Tidak diizinkan membuat data untuk desa lain.",
                                },
                                { status: 403 },
                            );
                        }
                        row.desa_id = session.desaId;
                    } else if (row.id && row.id !== session.desaId) {
                        return NextResponse.json(
                            { ok: false, error: "Tidak diizinkan." },
                            { status: 403 },
                        );
                    }
                }

                const data = await createRow(table, row);
                return NextResponse.json(
                    { ok: true, table, data },
                    { status: 201 },
                );
            } catch (error) {
                const message =
                    error instanceof Error
                        ? error.message
                        : "Gagal menyimpan data Supabase.";
                return NextResponse.json(
                    { ok: false, error: message },
                    { status: 503 },
                );
            }
        },
    };
}
