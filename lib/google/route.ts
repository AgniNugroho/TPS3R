import { NextResponse } from "next/server";
import { readSheet } from "./sheets";
import type { SheetModule } from "./types";

export function createSheetHandlers(module: SheetModule) {
  return {
    async GET() {
      try {
        const rows = await readSheet(module);
        return NextResponse.json({ ok: true, module, rows });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Gagal membaca Google Sheets.";
        return NextResponse.json({ ok: false, error: message }, { status: 503 });
      }
    },
  };
}
