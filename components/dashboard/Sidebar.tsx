"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
    ChevronDown,
    CircleHelp,
    FileText,
    Gauge,
    Landmark,
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
    { label: "Bank Sampah", href: "/bank-sampah", icon: Landmark },
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
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const user = useCurrentUser();
    const [profileOpen, setProfileOpen] = useState(false);
    const [desaOpen, setDesaOpen] = useState(false);
    const [desaList, setDesaList] = useState<
        Array<{ id: string; nama: string }>
    >([]);
    const selectedDesaId = searchParams.get("desa_id") ?? "";

    useEffect(() => {
        if (user?.role !== "admin") return;
        fetch("/api/desa")
            .then((response) => response.json())
            .then((result) => {
                if (result.ok) {
                    setDesaList(
                        (result.rows ?? []).map(
                            (desa: { id: string; nama: string }) => ({
                                id: desa.id,
                                nama: desa.nama,
                            }),
                        ),
                    );
                }
            })
            .catch(() => undefined);
    }, [user?.role]);

    const selectedDesa = desaList.find((desa) => desa.id === selectedDesaId);
    const subtitle =
        user?.role === "admin"
            ? (selectedDesa?.nama ?? "Semua Desa")
            : (user?.desaNama ?? "Desa belum terhubung");

    function handleDesaChange(desaId: string) {
        const params = new URLSearchParams();
        if (desaId) params.set("desa_id", desaId);
        const query = params.toString();
        router.replace(query ? `${pathname}?${query}` : pathname);
    }

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
                        <p className="brand-subtitle">
                            {subtitle.toUpperCase()}
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
                {user?.role === "admin" && (
                    <div className="workspace-menu">
                        <button
                            className="workspace-switcher"
                            onClick={() => setDesaOpen((open) => !open)}
                            aria-expanded={desaOpen}
                            aria-haspopup="menu"
                        >
                            <div className="village-avatar">
                                {selectedDesa?.nama
                                    ?.slice(0, 2)
                                    .toUpperCase() ?? "SD"}
                            </div>
                            <div className="workspace-copy">
                                <span>PILIH DESA</span>
                                <strong>
                                    {selectedDesa?.nama ?? "Semua Desa"}
                                </strong>
                            </div>
                            <ChevronDown
                                size={16}
                                className={desaOpen ? "chevron-open" : ""}
                            />
                        </button>
                        {desaOpen && (
                            <div className="workspace-dropdown" role="menu">
                                <button
                                    className={`workspace-option ${!selectedDesaId ? "selected" : ""}`}
                                    onClick={() => {
                                        handleDesaChange("");
                                        setDesaOpen(false);
                                    }}
                                    role="menuitem"
                                >
                                    Semua Desa
                                </button>
                                {desaList.map((desa) => (
                                    <button
                                        key={desa.id}
                                        className={`workspace-option ${desa.id === selectedDesaId ? "selected" : ""}`}
                                        onClick={() => {
                                            handleDesaChange(desa.id);
                                            setDesaOpen(false);
                                        }}
                                        role="menuitem"
                                    >
                                        {desa.nama}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}
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
                    <Link
                        className={`nav-item ${activeLabel === "Manajemen Wilayah" ? "active" : ""}`}
                        href="/wilayah"
                        onClick={() => onMobileChange(false)}
                    >
                        <MapPin size={18} />
                        <span>Manajemen Wilayah</span>
                    </Link>
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
                            <ChevronDown
                                size={16}
                                className={profileOpen ? "chevron-open" : ""}
                            />
                        </button>
                        {profileOpen && (
                            <div className="profile-dropdown">
                                {user?.role === "admin" && (
                                    <Link
                                        href="/admin-dashboard"
                                        className="nav-item"
                                        onClick={() => setProfileOpen(false)}
                                    >
                                        <Shield size={18} />
                                        <span>Dashboard Admin</span>
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
