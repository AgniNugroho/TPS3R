import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
    try {
        const supabase = getSupabaseServerClient();
        const { data, error } = await supabase.auth.admin.listUsers();
        if (error) throw error;

        // Map auth users, extract custom metadata
        const users = (data.users ?? []).map((user) => ({
            id: user.id,
            email: user.email,
            nama: user.user_metadata?.nama || "-",
            peran: user.user_metadata?.peran || "Pengelola TPS3R",
            status: user.user_metadata?.status || "Aktif",
            wilayah_id: user.user_metadata?.wilayah_id || null,
            dusun: user.user_metadata?.dusun || "-",
            created_at: user.created_at,
        }));

        return NextResponse.json({ ok: true, users });
    } catch (error: any) {
        return NextResponse.json(
            { ok: false, error: error.message || "Gagal memuat daftar pengguna." },
            { status: 500 },
        );
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, password, nama, peran, status, wilayah_id, dusun } = body;

        if (!email || !password) {
            return NextResponse.json(
                { ok: false, error: "Email dan password wajib diisi." },
                { status: 400 },
            );
        }

        const supabase = getSupabaseServerClient();
        const { data, error } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
                nama: nama || "Pengelola Baru",
                peran: peran || "Pengelola TPS3R",
                status: status || "Aktif",
                wilayah_id: wilayah_id || null,
                dusun: dusun || "-",
            },
        });

        if (error) throw error;

        return NextResponse.json({ ok: true, user: data.user }, { status: 201 });
    } catch (error: any) {
        return NextResponse.json(
            { ok: false, error: error.message || "Gagal membuat pengguna baru." },
            { status: 500 },
        );
    }
}

export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const { id, email, password, nama, peran, status, wilayah_id, dusun } = body;

        if (!id) {
            return NextResponse.json(
                { ok: false, error: "User ID wajib disertakan untuk melakukan update." },
                { status: 400 },
            );
        }

        const supabase = getSupabaseServerClient();
        const updateData: any = {
            email,
            user_metadata: {
                nama: nama || "Pengelola",
                peran: peran || "Pengelola TPS3R",
                status: status || "Aktif",
                wilayah_id: wilayah_id || null,
                dusun: dusun || "-",
            },
        };

        // Only update password if a new one is provided and not empty
        if (password && password.trim() !== "") {
            updateData.password = password;
        }

        const { data, error } = await supabase.auth.admin.updateUserById(id, updateData);
        if (error) throw error;

        return NextResponse.json({ ok: true, user: data.user });
    } catch (error: any) {
        return NextResponse.json(
            { ok: false, error: error.message || "Gagal memperbarui pengguna." },
            { status: 500 },
        );
    }
}

export async function DELETE(request: Request) {
    try {
        const url = new URL(request.url);
        const id = url.searchParams.get("id");

        if (!id) {
            return NextResponse.json(
                { ok: false, error: "User ID wajib disertakan untuk menghapus." },
                { status: 400 },
            );
        }

        const supabase = getSupabaseServerClient();
        const { error } = await supabase.auth.admin.deleteUser(id);
        if (error) throw error;

        return NextResponse.json({ ok: true });
    } catch (error: any) {
        return NextResponse.json(
            { ok: false, error: error.message || "Gagal menghapus pengguna." },
            { status: 500 },
        );
    }
}
