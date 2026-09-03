"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, LayoutDashboard, LogOut, Shield } from "lucide-react";
import Link from "next/link";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { getSupabaseBrowserClient } from "@/lib/supabase/browserClient";

function getInitials(nama: string) {
    const parts = nama.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "?";
    return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

export default function ProfileMenu({
    adminArea = false,
}: {
    adminArea?: boolean;
}) {
    const router = useRouter();
    const user = useCurrentUser();
    const [open, setOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        function handlePointerDown(event: MouseEvent) {
            if (
                menuRef.current &&
                !menuRef.current.contains(event.target as Node)
            ) {
                setOpen(false);
            }
        }
        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") setOpen(false);
        }
        document.addEventListener("mousedown", handlePointerDown);
        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("mousedown", handlePointerDown);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [open]);

    async function handleLogout() {
        const supabase = getSupabaseBrowserClient();
        await supabase.auth.signOut();
        router.replace("/login");
        router.refresh();
    }

    return (
        <div className="profile-menu topbar-profile" ref={menuRef}>
            <button
                className="profile-row"
                onClick={() => setOpen((value) => !value)}
                aria-expanded={open}
                aria-haspopup="menu"
            >
                <div className="profile-avatar">
                    {getInitials(user?.nama ?? "?")}
                </div>
                <div className="profile-copy">
                    <strong>{user?.nama ?? "Memuat..."}</strong>
                    <span>{user?.roleLabel ?? ""}</span>
                </div>
                <ChevronDown
                    size={16}
                    className={open ? "chevron-open" : ""}
                />
            </button>
            {open && (
                <div className="profile-dropdown" role="menu">
                    {adminArea ? (
                        <Link
                            className="nav-item"
                            href="/dashboard"
                            role="menuitem"
                            onClick={() => setOpen(false)}
                        >
                            <LayoutDashboard size={18} />
                            <span>Kembali ke Dashboard Utama</span>
                        </Link>
                    ) : (
                        user?.role === "admin" && (
                            <Link
                                className="nav-item"
                                href="/admin-dashboard"
                                role="menuitem"
                                onClick={() => setOpen(false)}
                            >
                                <Shield size={18} />
                                <span>Dashboard Admin</span>
                            </Link>
                        )
                    )}
                    <button
                        className="nav-item"
                        onClick={handleLogout}
                        role="menuitem"
                    >
                        <LogOut size={18} />
                        <span>Keluar</span>
                    </button>
                </div>
            )}
        </div>
    );
}
