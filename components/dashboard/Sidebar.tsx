"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
    ChevronDown,
    CircleHelp,
    FileText,
    Gauge,
    LogOut,
    Leaf,
    MapPin,
    PackageCheck,
    Recycle,
    Settings2,
    Shield,
    Truck,
    X,
} from "lucide-react";
import Link from "next/link";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { getSupabaseBrowserClient } from "@/lib/supabase/browserClient";

const navItems = [
    { label: "Ringkasan", href: "/dashboard", icon: Gauge },
    { label: "Pengumpulan", href: "/pengumpulan", icon: Truck },
    { label: "Pilah Sampah", href: "/pemilahan", icon: Recycle },
    { label: "Bank Sampah", href: "/bank-sampah", icon: Recycle },
    { label: "TPS3R", href: "/tps3r", icon: PackageCheck },
    { label: "Residu", href: "/residu", icon: PackageCheck },
];

function getInitials(nama: string) {
    const parts = nama.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "?";
    return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

export default function Sidebar({
    mobileOpen,
    onMobileChange,
    activeLabel,
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
                        <Leaf size={21} />
                    </div>
                    <div>
                        <p className="brand-name">DASH-SAMPAH</p>
                        <p className="brand-subtitle">DESA BANYUBIRU</p>
                    </div>
                    <button
                        className="icon-button close-menu"
                        onClick={() => onMobileChange(false)}
                        aria-label="Tutup menu"
                    >
                        <X size={18} />
                    </button>
                </div>
                <p className="nav-label">MENU UTAMA</p>
                <nav className="nav-list">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`nav-item ${activeLabel === item.label ? "active" : ""}`}
                                onClick={() => onMobileChange(false)}
                            >
                                <Icon size={18} />
                                <span>{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>
                <p className="nav-label secondary-label">LAINNYA</p>
                <nav className="nav-list">
                    <Link
                        className="nav-item"
                        href="/laporan"
                        onClick={() => onMobileChange(false)}
                    >
                        <FileText size={18} />
                        <span>Laporan</span>
                    </Link>
                    <button className="nav-item">
                        <MapPin size={18} />
                        <span>Peta wilayah</span>
                    </button>
                    <button className="nav-item">
                        <Settings2 size={18} />
                        <span>Pengaturan</span>
                    </button>
                </nav>
                <div className="sidebar-bottom">
                    <div className="help-card">
                        <CircleHelp size={19} />
                        <div>
                            <strong>Butuh bantuan?</strong>
                            <span>Lihat panduan penggunaan</span>
                        </div>
                    </div>
                    <div className="profile-menu">
                        <button
                            className="profile-row"
                            onClick={() => setProfileOpen((open) => !open)}
                            aria-expanded={profileOpen}
                        >
                            <div className="profile-avatar">
                                {getInitials(user?.nama ?? "?")}
                            </div>
                            <div className="profile-copy">
                                <strong>{user?.nama ?? "Memuat..."}</strong>
                                <span>{user?.roleLabel ?? ""}</span>
                            </div>
                            <ChevronDown size={16} />
                        </button>
                        {profileOpen && (
                            <div className="profile-dropdown">
                                {user?.role === "admin" && (
                                    <Link
                                        href="/superadmin"
                                        className="nav-item"
                                        onClick={() => setProfileOpen(false)}
                                    >
                                        <Shield size={18} />
                                        <span>Superadmin</span>
                                    </Link>
                                )}
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
