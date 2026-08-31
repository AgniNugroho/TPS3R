"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, CircleHelp, Users, X, LogOut } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { getSupabaseBrowserClient } from "@/lib/supabase/browserClient";

function getInitials(nama: string) {
    const parts = nama.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "?";
    return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

export default function SidebarSuperAdmin({
    mobileOpen,
    onMobileChange,
    activeLabel = "Kelola Pengguna",
}: {
    mobileOpen: boolean;
    onMobileChange: (open: boolean) => void;
    activeLabel?: string;
}) {
    const router = useRouter();
    const user = useCurrentUser();
    const [profileOpen, setProfileOpen] = useState(false);

    async function handleLogout() {
        const supabase = getSupabaseBrowserClient();
        await supabase.auth.signOut();
        router.replace("/login");
        router.refresh();
    }

    return (
        <>
            <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
                <div className="brand-row">
                    <div className="brand-mark">
                        <Image
                            src="/logo_kab_mgl.png"
                            alt="Logo Kabupaten Magelang"
                            width={34}
                            height={42}
                            className="brand-logo"
                            priority
                        />
                    </div>
                    <div>
                        <p className="brand-name">DASHBOARD ADMIN</p>
                        <p
                            className="brand-subtitle"
                            style={{ color: "#efc29a" }}
                        >
                            TPS3R KEC.DUKUN
                        </p>
                    </div>
                    <button
                        className="icon-button close-menu"
                        onClick={() => onMobileChange(false)}
                        aria-label="Tutup menu"
                    >
                        <X size={18} />
                    </button>
                </div>

                <p className="nav-label" style={{ color: "#efc29a" }}>
                    KONTROL SISTEM
                </p>
                <nav className="nav-list">
                    <Link
                        href="/admin-dashboard"
                        className={`nav-item ${activeLabel === "Kelola Pengguna" ? "active" : ""}`}
                        onClick={() => onMobileChange(false)}
                        style={
                            activeLabel === "Kelola Pengguna"
                                ? { background: "#efaa6d", color: "#603b20" }
                                : {}
                        }
                    >
                        <Users size={18} />
                        <span>Kelola Pengguna</span>
                    </Link>
                </nav>

                <div className="sidebar-bottom">
                    <div className="help-card">
                        <CircleHelp size={19} />
                        <div>
                            <strong>Panel Kontrol</strong>
                            <span>Akses database & otentikasi penuh</span>
                        </div>
                    </div>
                    <div className="profile-menu">
                        <button
                            className="profile-row"
                            onClick={() => setProfileOpen((open) => !open)}
                            aria-expanded={profileOpen}
                        >
                            <div
                                className="profile-avatar"
                                style={{
                                    background: "#efaa6d",
                                    color: "#603b20",
                                }}
                            >
                                {getInitials(user?.nama ?? "?")}
                            </div>
                            <div className="profile-copy">
                                <strong>{user?.nama ?? "Memuat..."}</strong>
                                <span style={{ color: "#efc29a" }}>
                                    {user?.roleLabel ?? ""}
                                </span>
                            </div>
                            <ChevronDown
                                size={16}
                                className={profileOpen ? "chevron-open" : ""}
                            />
                        </button>
                        {profileOpen && (
                            <div className="profile-dropdown">
                                <Link
                                    className="nav-item"
                                    href="/dashboard"
                                    onClick={() => {
                                        setProfileOpen(false);
                                        onMobileChange(false);
                                    }}
                                >
                                    <LogOut
                                        size={18}
                                        style={{ transform: "rotate(180deg)" }}
                                    />
                                    <span>Kembali ke Dashboard Utama</span>
                                </Link>
                                <button
                                    className="nav-item"
                                    onClick={handleLogout}
                                >
                                    <LogOut size={18} />
                                    <span>Keluar</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </aside>
            {mobileOpen && (
                <button
                    className="scrim"
                    onClick={() => onMobileChange(false)}
                    aria-label="Tutup menu"
                />
            )}
        </>
    );
}
