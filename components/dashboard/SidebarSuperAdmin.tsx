"use client";

import { CircleHelp, Users, X } from "lucide-react";
import Image from "next/image";
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
