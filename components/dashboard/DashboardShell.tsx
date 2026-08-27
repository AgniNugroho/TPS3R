"use client";

import { useState, type ReactNode, type ElementType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertTriangle,
  Bell,
  Boxes,
  CalendarDays,
  ChevronDown,
  CircleHelp,
  Cpu,
  FileText,
  Gauge,
  Layers,
  Leaf,
  LogOut,
  MapPin,
  Menu,
  PackageCheck,
  Recycle,
  Settings2,
  ShieldCheck,
  Truck,
  Users,
  X,
} from "lucide-react";

export type NavItem = {
  label: string;
  icon: ElementType;
  href: string;
  count?: number;
};

export type SecondaryNavItem = {
  label: string;
  icon: ElementType;
  href: string | null;
};

const petugasNavItems: NavItem[] = [
  { label: "Ringkasan", icon: Gauge, href: "/" },
  { label: "Pengumpulan", icon: Truck, href: "/pengumpulan" },
  { label: "Pemilahan", icon: Layers, href: "/pemilahan" },
  { label: "Bank Sampah", icon: Recycle, href: "/bank-sampah" },
  { label: "TPS3R", icon: Boxes, href: "/tps3r" },
  { label: "Residu", icon: PackageCheck, href: "/residu" },
];

const petugasSecondaryNavItems: SecondaryNavItem[] = [
  { label: "Laporan", icon: FileText, href: "/laporan" },
  { label: "Peta wilayah", icon: MapPin, href: "/wilayah" },
  { label: "Pengaturan", icon: Settings2, href: null },
];

const superadminNavItems: NavItem[] = [
  { label: "Dashboard Superadmin", icon: Gauge, href: "/" },
  { label: "Kelola Akun & Petugas", icon: ShieldCheck, href: "/petugas" },
  { label: "Master Wilayah / Dusun", icon: MapPin, href: "/wilayah" },
  { label: "Master Warga / Anggota", icon: Users, href: "/anggota" },
  { label: "Status & Performa", icon: Cpu, href: "/performa" },
];

export type DashboardShellProps = {
  petugasNama: string;
  role?: "superadmin" | "petugas";
  todayLabel: string;
  logoutAction: () => Promise<void>;
  children: ReactNode;
};

export function DashboardShell({
  petugasNama,
  role = "petugas",
  todayLabel,
  logoutAction,
  children,
}: DashboardShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isSuperAdmin = role === "superadmin";
  const navItems: NavItem[] = isSuperAdmin ? superadminNavItems : petugasNavItems;
  const secondaryNavItems: SecondaryNavItem[] = isSuperAdmin ? [] : petugasSecondaryNavItems;

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const activeLabel =
    [...navItems, ...secondaryNavItems].find((item) => item.href && isActive(item.href))?.label ??
    "Dashboard";

  const initials = isSuperAdmin
    ? "SA"
    : petugasNama
        .split(" ")
        .map((part) => part[0])
        .slice(0, 2)
        .join("")
        .toUpperCase() || "PT";

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
        <div className="brand-row">
          <div className="brand-mark">
            <Leaf size={21} />
          </div>
          <div>
            <p className="brand-name">DASH-SAMPAH</p>
            <p className="brand-subtitle">DESA KALIBENING</p>
          </div>
          <button
            className="icon-button close-menu"
            onClick={() => setMobileOpen(false)}
            aria-label="Tutup menu"
          >
            <X size={18} />
          </button>
        </div>

        <div className="workspace-switcher">
          <div
            className={`village-avatar ${
              isSuperAdmin ? "!bg-emerald-700 !text-lime-300" : ""
            }`}
          >
            {isSuperAdmin ? "SA" : "DL"}
          </div>
          <div className="workspace-copy">
            <span>{isSuperAdmin ? "Hak Akses" : "Wilayah aktif"}</span>
            <strong>{isSuperAdmin ? "Super Admin" : "Desa Lestari"}</strong>
          </div>
          {!isSuperAdmin && <ChevronDown size={16} />}
        </div>

        <p className="nav-label">{isSuperAdmin ? "MENU SUPERADMIN" : "MENU UTAMA"}</p>
        <nav className="nav-list">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`nav-item ${active ? "active" : ""}`}
                onClick={() => setMobileOpen(false)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
                {item.count ? <b>{item.count}</b> : null}
              </Link>
            );
          })}
        </nav>

        {secondaryNavItems.length > 0 && (
          <>
            <p className="nav-label secondary-label">LAINNYA</p>
            <nav className="nav-list">
              {secondaryNavItems.map((item) => {
                const Icon = item.icon;
                if (!item.href) {
                  return (
                    <button key={item.label} className="nav-item" disabled>
                      <Icon size={18} />
                      <span>{item.label}</span>
                    </button>
                  );
                }
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={`nav-item ${active ? "active" : ""}`}
                    onClick={() => setMobileOpen(false)}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </>
        )}

        <div className="sidebar-bottom">
          <div className="help-card">
            <CircleHelp size={19} />
            <div>
              <strong>Butuh bantuan?</strong>
              <span>Lihat panduan penggunaan</span>
            </div>
          </div>
          <div className="profile-row">
            <div className="profile-avatar">{initials}</div>
            <div className="profile-copy">
              <strong>{petugasNama}</strong>
              <span>{isSuperAdmin ? "Super Admin" : "Petugas"}</span>
            </div>
            <form action={logoutAction}>
              <button
                type="submit"
                className="icon-button hover:text-red-300"
                aria-label="Keluar"
                title="Keluar"
              >
                <LogOut size={16} />
              </button>
            </form>
          </div>
        </div>
      </aside>

      {mobileOpen && (
        <button
          className="scrim"
          onClick={() => setMobileOpen(false)}
          aria-label="Tutup menu"
        />
      )}

      <section className="main-area">
        <header className="topbar">
          <button
            className="icon-button menu-trigger"
            onClick={() => setMobileOpen(true)}
            aria-label="Buka menu"
          >
            <Menu size={21} />
          </button>
          <div className="breadcrumb">
            <span>Dashboard</span>
            <span className="crumb-slash">/</span>
            <strong>{activeLabel}</strong>
          </div>
          <div className="topbar-actions">
            <button className="icon-button notification" aria-label="Notifikasi">
              <Bell size={19} />
              <i />
            </button>
            <div className="topbar-date">
              <CalendarDays size={16} /> {todayLabel}
            </div>
          </div>
        </header>

        <main className="content-wrap">{children}</main>
      </section>
    </div>
  );
}
