import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
    try {
        const supabase = getSupabaseServerClient();
        const { data, error } = await supabase.from("desa").select("id, nama").order("nama");
        
        if (error) throw error;
        
        return NextResponse.json({ ok: true, data });
    } catch (error: any) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
}
