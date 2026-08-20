"use client";

import { ChevronDown, CircleHelp, FileText, Gauge, Leaf, MapPin, PackageCheck, Recycle, Settings2, Truck, X } from "lucide-react";
import Link from "next/link";

const navItems = [
  { label: "Ringkasan", href: "/dashboard", icon: Gauge },
  { label: "Pengumpulan", href: "/pengumpulan", icon: Truck },
  { label: "Pilah Sampah", href: "/pemilahan", icon: Recycle },
  { label: "Bank Sampah", href: "/bank-sampah", icon: Recycle },
  { label: "TPS3R", href: "/tps3r", icon: PackageCheck },
  { label: "Residu", href: "/residu", icon: PackageCheck },
];

export default function Sidebar({ mobileOpen, onMobileChange, activeLabel }: { mobileOpen: boolean; onMobileChange: (open: boolean) => void; activeLabel?: string }) {
  return <><aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}><div className="brand-row"><div className="brand-mark"><Leaf size={21} /></div><div><p className="brand-name">DASH-SAMPAH</p><p className="brand-subtitle">DESA BANYUBIRU</p></div><button className="icon-button close-menu" onClick={() => onMobileChange(false)} aria-label="Tutup menu"><X size={18} /></button></div><p className="nav-label">MENU UTAMA</p><nav className="nav-list">{navItems.map((item) => { const Icon = item.icon; return <Link key={item.href} href={item.href} className={`nav-item ${activeLabel === item.label ? "active" : ""}`} onClick={() => onMobileChange(false)}><Icon size={18} /><span>{item.label}</span></Link>; })}</nav><p className="nav-label secondary-label">LAINNYA</p><nav className="nav-list"><Link className="nav-item" href="/laporan" onClick={() => onMobileChange(false)}><FileText size={18} /><span>Laporan</span></Link><button className="nav-item"><MapPin size={18} /><span>Peta wilayah</span></button><button className="nav-item"><Settings2 size={18} /><span>Pengaturan</span></button></nav><div className="sidebar-bottom"><div className="help-card"><CircleHelp size={19} /><div><strong>Butuh bantuan?</strong><span>Lihat panduan penggunaan</span></div></div><div className="profile-row"><div className="profile-avatar">AR</div><div className="profile-copy"><strong>Agni Nugroho</strong><span>Admin Desa</span></div><ChevronDown size={16} /></div></div></aside>{mobileOpen && <button className="scrim" onClick={() => onMobileChange(false)} aria-label="Tutup menu" />}</>;
}
