import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
    try {
        const supabase = getSupabaseServerClient();
        const [authRes, dbRes, desaRes] = await Promise.all([
            supabase.auth.admin.listUsers(),
            supabase.from("petugas").select("*"),
            supabase.from("desa").select("id, nama")
        ]);

        if (authRes.error) throw authRes.error;
        if (dbRes.error) throw dbRes.error;
        if (desaRes.error) throw desaRes.error;

        const dbPetugasMap = new Map(
            (dbRes.data ?? []).map(p => [p.user_id, p])
        );

        const desaMap = new Map(
            (desaRes.data ?? []).map(d => [d.id, d.nama])
        );

        // Map auth users, extract custom metadata
        const users = (authRes.data.users ?? []).map((user) => {
            const dbPetugas = dbPetugasMap.get(user.id);
            const desaId = dbPetugas?.desa_id || user.user_metadata?.desa_id || null;
            const desaNama = desaId ? (desaMap.get(desaId) || "-") : "-";
            return {
                id: user.id,
                email: user.email,
                nama: dbPetugas?.nama || user.user_metadata?.nama || "-",
                peran: dbPetugas 
                    ? (dbPetugas.role === "admin" ? "Superadmin" : "Pengelola TPS3R") 
                    : (user.user_metadata?.peran || "Pengelola TPS3R"),
                status: dbPetugas?.status || user.user_metadata?.status || "Aktif",
                desa_id: desaId,
                desa_nama: desaNama,
                nomor_hp: dbPetugas?.nomor_hp || "",
                created_at: user.created_at,
            };
        });

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
        const { email, password, nama, peran, status, desa_id, nomor_hp } = body;

        if (!email || !password) {
            return NextResponse.json(
                { ok: false, error: "Email dan password wajib diisi." },
                { status: 400 },
            );
        }

        const supabase = getSupabaseServerClient();
        
        const dbRole = peran === "Superadmin" ? "admin" : "petugas";
        const targetDesaId = dbRole === "admin" ? null : (desa_id || null);

        // 1. Create auth user
        const { data, error } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
                nama: nama || "Pengelola Baru",
                peran: peran || "Pengelola TPS3R",
                status: status || "Aktif",
                desa_id: targetDesaId,
            },
        });

        if (error) throw error;
        const authUser = data.user;

        // 2. Generate unique code "PTG-xx"
        const { data: listPetugas } = await supabase
            .from("petugas")
            .select("kode");
        const nextNum = (listPetugas ?? [])
            .map(p => {
                const match = p.kode?.match(/^PTG-(\d+)$/);
                return match ? parseInt(match[1], 10) : 0;
            })
            .reduce((max, val) => Math.max(max, val), 0) + 1;
        const kode = `PTG-${nextNum}`;

        // 4. Insert into petugas table
        const { error: dbError } = await supabase
            .from("petugas")
            .insert({
                kode,
                nama: nama || "Pengelola Baru",
                nomor_hp: nomor_hp || null,
                status: status || "Aktif",
                desa_id: targetDesaId,
                user_id: authUser.id,
                role: dbRole
            });

        if (dbError) {
            // Clean up auth user if DB insert fails
            await supabase.auth.admin.deleteUser(authUser.id);
            throw dbError;
        }

        return NextResponse.json({ ok: true, user: authUser }, { status: 201 });
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
        const { id, email, password, nama, peran, status, desa_id, nomor_hp } = body;

        if (!id) {
            return NextResponse.json(
                { ok: false, error: "User ID wajib disertakan untuk melakukan update." },
                { status: 400 },
            );
        }

        const dbRole = peran === "Superadmin" ? "admin" : "petugas";
        const targetDesaId = dbRole === "admin" ? null : (desa_id || null);

        const supabase = getSupabaseServerClient();
        const updateData: any = {
            email,
            user_metadata: {
                nama: nama || "Pengelola",
                peran: peran || "Pengelola TPS3R",
                status: status || "Aktif",
                desa_id: targetDesaId,
            },
        };

        // Only update password if a new one is provided and not empty
        if (password && password.trim() !== "") {
            updateData.password = password;
        }

        const { data, error } = await supabase.auth.admin.updateUserById(id, updateData);
        if (error) throw error;

        // Check if petugas row exists
        const { data: existingPetugas } = await supabase
            .from("petugas")
            .select("id, kode")
            .eq("user_id", id)
            .maybeSingle();

        if (existingPetugas) {
            const { error: dbError } = await supabase
                .from("petugas")
                .update({
                    nama: nama || "Pengelola",
                    nomor_hp: nomor_hp || null,
                    status: status || "Aktif",
                    desa_id: targetDesaId,
                    role: dbRole
                })
                .eq("user_id", id);
            if (dbError) throw dbError;
        } else {
            const { data: listPetugas } = await supabase
                .from("petugas")
                .select("kode");
            const nextNum = (listPetugas ?? [])
                .map(p => {
                    const match = p.kode?.match(/^PTG-(\d+)$/);
                    return match ? parseInt(match[1], 10) : 0;
                })
                .reduce((max, val) => Math.max(max, val), 0) + 1;
            const kode = `PTG-${nextNum}`;

            const { error: dbError } = await supabase
                .from("petugas")
                .insert({
                    kode,
                    nama: nama || "Pengelola",
                    nomor_hp: nomor_hp || null,
                    status: status || "Aktif",
                    desa_id: targetDesaId,
                    user_id: id,
                    role: dbRole
                });
            if (dbError) throw dbError;
        }

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
        
        // Delete from petugas table first
        const { error: dbError } = await supabase
            .from("petugas")
            .delete()
            .eq("user_id", id);
        if (dbError) throw dbError;

        // Delete from auth.users
        const { error: authError } = await supabase.auth.admin.deleteUser(id);
        if (authError) throw authError;

        return NextResponse.json({ ok: true });
    } catch (error: any) {
        return NextResponse.json(
            { ok: false, error: error.message || "Gagal menghapus pengguna." },
            { status: 500 },
        );
    }
}
