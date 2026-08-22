"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertTriangle,
  Bell,
  Boxes,
  CalendarDays,
  ChevronDown,
  CircleHelp,
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
  Truck,
  X,
} from "lucide-react";

const navItems = [
  { label: "Ringkasan", icon: Gauge, href: "/" },
  { label: "Pengumpulan", icon: Truck, href: "/pengumpulan" },
  { label: "Pemilahan", icon: Layers, href: "/pemilahan" },
  { label: "Bank Sampah", icon: Recycle, href: "/bank-sampah" },
  { label: "TPS3R", icon: Boxes, href: "/tps3r" },
  { label: "Residu", icon: PackageCheck, href: "/residu" },
  { label: "Pengaduan", icon: AlertTriangle, href: "/pengaduan", count: 5 },
];

const secondaryNavItems = [
  { label: "Laporan", icon: FileText, href: "/laporan" },
  { label: "Peta wilayah", icon: MapPin, href: "/wilayah" },
  { label: "Pengaturan", icon: Settings2, href: null },
];

export type DashboardShellProps = {
  petugasNama: string;
  todayLabel: string;
  logoutAction: () => Promise<void>;
  children: ReactNode;
};

export function DashboardShell({ petugasNama, todayLabel, logoutAction, children }: DashboardShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const activeLabel =
    [...navItems, ...secondaryNavItems].find((item) => item.href && isActive(item.href))?.label ?? "Dashboard";

  const initials = petugasNama
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

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
          <button className="icon-button close-menu" onClick={() => setMobileOpen(false)} aria-label="Tutup menu">
            <X size={18} />
          </button>
        </div>
        <div className="workspace-switcher">
          <div className="village-avatar">DL</div>
          <div className="workspace-copy">
            <span>Wilayah aktif</span>
            <strong>Desa Lestari</strong>
          </div>
          <ChevronDown size={16} />
        </div>
        <p className="nav-label">MENU UTAMA</p>
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
                {item.count && <b>{item.count}</b>}
              </Link>
            );
          })}
        </nav>
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
        <div className="sidebar-bottom">
          <div className="help-card">
            <CircleHelp size={19} />
            <div>
              <strong>Butuh bantuan?</strong>
              <span>Lihat panduan penggunaan</span>
            </div>
          </div>
          <div className="profile-row">
            <div className="profile-avatar">{initials || "PT"}</div>
            <div className="profile-copy">
              <strong>{petugasNama}</strong>
              <span>Petugas</span>
            </div>
            <form action={logoutAction}>
              <button type="submit" className="icon-button" aria-label="Keluar" title="Keluar">
                <LogOut size={16} />
              </button>
            </form>
          </div>
        </div>
      </aside>
      {mobileOpen && <button className="scrim" onClick={() => setMobileOpen(false)} aria-label="Tutup menu" />}
      <section className="main-area">
        <header className="topbar">
          <button className="icon-button menu-trigger" onClick={() => setMobileOpen(true)} aria-label="Buka menu">
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
