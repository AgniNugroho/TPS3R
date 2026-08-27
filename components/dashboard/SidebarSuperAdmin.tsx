"use client";

import {
    ChevronDown,
    CircleHelp,
    Leaf,
    Users,
    X,
    LogOut,
} from "lucide-react";
import Link from "next/link";

export default function SidebarSuperAdmin({
    mobileOpen,
    onMobileChange,
    activeLabel = "Kelola Pengguna",
}: {
    mobileOpen: boolean;
    onMobileChange: (open: boolean) => void;
    activeLabel?: string;
}) {
    return (
        <>
            <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
                <div className="brand-row">
                    <div className="brand-mark" style={{ background: "#efaa6d", color: "#603b20" }}>
                        <Leaf size={21} />
                    </div>
                    <div>
                        <p className="brand-name">SUPER-ADMIN</p>
                        <p className="brand-subtitle" style={{ color: "#efc29a" }}>TPS3R BANYUBIRU</p>
                    </div>
                    <button
                        className="icon-button close-menu"
                        onClick={() => onMobileChange(false)}
                        aria-label="Tutup menu"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="workspace-switcher" style={{ borderColor: "rgba(239, 170, 109, 0.3)", background: "rgba(0, 0, 0, 0.15)" }}>
                    <div className="village-avatar" style={{ background: "#cce77e", color: "#155b4d" }}>SA</div>
                    <div className="workspace-copy">
                        <span style={{ color: "#efc29a" }}>AKSES LEVEL</span>
                        <strong>Super Administrator</strong>
                    </div>
                </div>

                <p className="nav-label" style={{ color: "#efc29a" }}>KONTROL SISTEM</p>
                <nav className="nav-list">
                    <Link
                        href="/superadmin"
                        className={`nav-item ${activeLabel === "Kelola Pengguna" ? "active" : ""}`}
                        onClick={() => onMobileChange(false)}
                        style={activeLabel === "Kelola Pengguna" ? { background: "#efaa6d", color: "#603b20" } : {}}
                    >
                        <Users size={18} />
                        <span>Kelola Pengguna</span>
                    </Link>
                </nav>

                <p className="nav-label secondary-label" style={{ color: "#efc29a" }}>NAVIGASI</p>
                <nav className="nav-list">
                    <Link
                        className="nav-item"
                        href="/dashboard"
                        onClick={() => onMobileChange(false)}
                    >
                        <LogOut size={18} style={{ transform: "rotate(180deg)" }} />
                        <span>Kembali ke Operator</span>
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
                    <div className="profile-row">
                        <div className="profile-avatar" style={{ background: "#efaa6d", color: "#603b20" }}>SA</div>
                        <div className="profile-copy">
                            <strong>Administrator</strong>
                            <span style={{ color: "#efc29a" }}>Superuser</span>
                        </div>
                        <ChevronDown size={16} />
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
