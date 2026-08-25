import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get("file");

        if (!(file instanceof File)) {
            return NextResponse.json(
                { ok: false, error: "Field file wajib diisi." },
                { status: 400 },
            );
        }

        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
        const path = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}-${safeName}`;
        const supabase = getSupabaseServerClient();
        const { error } = await supabase.storage
            .from("dokumentasi")
            .upload(path, file, {
                contentType: file.type || "application/octet-stream",
                upsert: false,
            });

        if (error) throw new Error(error.message);
        const { data } = supabase.storage
            .from("dokumentasi")
            .getPublicUrl(path);
        return NextResponse.json(
            { ok: true, path, publicUrl: data.publicUrl },
            { status: 201 },
        );
    } catch (error) {
        const message =
            error instanceof Error
                ? error.message
                : "Gagal mengunggah file ke Supabase Storage.";
        return NextResponse.json(
            { ok: false, error: message },
            { status: 503 },
        );
    }
}
