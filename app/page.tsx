"use client";

import { useState } from "react";
import { Activity, AlertTriangle, ArrowDownRight, ArrowUpRight, Bell, Boxes, CalendarDays, ChevronDown, CircleHelp, FileText, Gauge, Leaf, MapPin, Menu, PackageCheck, Recycle, Settings2, Truck, Users, X } from "lucide-react";
import { googleFormUrls } from "@/lib/google/forms";

const navItems = [
  { label: "Ringkasan", icon: Gauge },
  { label: "Pengumpulan", icon: Truck },
  { label: "Bank Sampah", icon: Recycle },
  { label: "TPS3R", icon: Boxes },
  { label: "Residu", icon: PackageCheck },
  { label: "Pengaduan", icon: AlertTriangle, count: 5 },
];

const stats = [
  { label: "Sampah masuk", value: "1.250", unit: "kg", note: "+12,8% vs bulan lalu", trend: "up", tone: "teal", icon: Truck },
  { label: "Berhasil dimanfaatkan", value: "850", unit: "kg", note: "+8,4% vs bulan lalu", trend: "up", tone: "lime", icon: Recycle },
  { label: "Residu", value: "250", unit: "kg", note: "-4,2% vs bulan lalu", trend: "down", tone: "amber", icon: PackageCheck },
  { label: "Rumah terlayani", value: "1.200", unit: "KK", note: "86% cakupan wilayah", trend: "up", tone: "blue", icon: Users },
];

const monthlyData = [58, 66, 54, 72, 64, 78, 70, 88, 76, 82, 92, 86];
const months = ["Agu", "Sep", "Okt", "Nov", "Des", "Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul"];

export default function Home() {
  const [activeNav, setActiveNav] = useState("Ringkasan");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [period, setPeriod] = useState("30 hari terakhir");

  return <main className="app-shell">
    <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
      <div className="brand-row"><div className="brand-mark"><Leaf size={21} /></div><div><p className="brand-name">DASH-SAMPAH</p><p className="brand-subtitle">DESA BANYUBIRU</p></div><button className="icon-button close-menu" onClick={() => setMobileOpen(false)} aria-label="Tutup menu"><X size={18} /></button></div>
      <div className="workspace-switcher"><div className="village-avatar">DL</div><div className="workspace-copy"><span>Wilayah aktif</span><strong>Desa Lestari</strong></div><ChevronDown size={16} /></div>
      <p className="nav-label">MENU UTAMA</p>
      <nav className="nav-list">{navItems.map((item) => { const Icon = item.icon; const active = activeNav === item.label; return <button key={item.label} className={`nav-item ${active ? "active" : ""}`} onClick={() => { setActiveNav(item.label); setMobileOpen(false); }}><Icon size={18} /><span>{item.label}</span>{item.count && <b>{item.count}</b>}</button>; })}</nav>
      <p className="nav-label secondary-label">LAINNYA</p>
      <nav className="nav-list"><button className="nav-item"><FileText size={18} /><span>Laporan</span></button><button className="nav-item"><MapPin size={18} /><span>Peta wilayah</span></button><button className="nav-item"><Settings2 size={18} /><span>Pengaturan</span></button></nav>
      <div className="sidebar-bottom"><div className="help-card"><CircleHelp size={19} /><div><strong>Butuh bantuan?</strong><span>Lihat panduan penggunaan</span></div></div><div className="profile-row"><div className="profile-avatar">AR</div><div className="profile-copy"><strong>Agni Nugroho</strong><span>Admin Desa</span></div><ChevronDown size={16} /></div></div>
    </aside>
    {mobileOpen && <button className="scrim" onClick={() => setMobileOpen(false)} aria-label="Tutup menu" />}
    <section className="main-area">
      <header className="topbar"><button className="icon-button menu-trigger" onClick={() => setMobileOpen(true)} aria-label="Buka menu"><Menu size={21} /></button><div className="breadcrumb"><span>Dashboard</span><span className="crumb-slash">/</span><strong>{activeNav}</strong></div><div className="topbar-actions"><button className="icon-button notification" aria-label="Notifikasi"><Bell size={19} /><i /></button><div className="topbar-date"><CalendarDays size={16} /> 19 Agustus 2026</div></div></header>
      <div className="content-wrap">
        <div className="page-heading"><div><p className="eyebrow"><span className="live-dot" /> DATA DIPERBARUI 10 MENIT LALU</p><h1>Selamat pagi, Echak.</h1><p className="heading-copy">Pantau denyut pengelolaan sampah desa hari ini.</p></div><div className="heading-actions"><button className="secondary-button"><FileText size={16} /> Lihat laporan</button><a className="primary-button" href={googleFormUrls.pengumpulan || "#"} target="_blank" rel="noreferrer"><Activity size={17} /> Input lewat Google Form</a></div></div>
        <section className="stat-grid">{stats.map((stat) => { const Icon = stat.icon; return <article className={`stat-card ${stat.tone}`} key={stat.label}><div className="stat-top"><div><p>{stat.label}</p><h2>{stat.value}<small>{stat.unit}</small></h2></div><div className="stat-icon"><Icon size={20} /></div></div><div className={`stat-note ${stat.trend}`}><span>{stat.trend === "up" ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}</span>{stat.note}</div></article>; })}</section>
        <div className="section-toolbar"><div><h2>Ikhtisar operasional</h2><p>Performa pengelolaan dalam periode berjalan</p></div><select value={period} onChange={(event) => setPeriod(event.target.value)} aria-label="Pilih periode"><option>30 hari terakhir</option><option>90 hari terakhir</option><option>Tahun berjalan</option></select></div>
        <section className="dashboard-grid"><article className="panel trend-panel"><PanelTitle title="Volume sampah terkelola" subtitle="Total berat berdasarkan bulan" /><div className="chart-summary"><strong>8.460 <small>kg</small></strong><span className="positive"><ArrowUpRight size={14} /> 14,6%</span></div><div className="bar-chart" aria-label="Grafik volume sampah terkelola"><div className="y-axis"><span>1.000</span><span>750</span><span>500</span><span>250</span><span>0</span></div><div className="bars">{monthlyData.map((height, index) => <div className="bar-column" key={months[index]}><div className={`bar ${index === 10 ? "highlight" : ""}`} style={{ height: `${height}%` }}><span>{index === 10 ? "920" : ""}</span></div><small>{months[index]}</small></div>)}</div></div><div className="chart-legend"><span><i className="legend-dot teal-dot" />Total sampah masuk</span><span><i className="legend-dot pale-dot" />Target bulanan</span></div></article><article className="panel composition-panel"><PanelTitle title="Komposisi sampah" subtitle="Distribusi bulan ini" /><div className="donut-wrap"><div className="donut"><div className="donut-center"><strong>1.250</strong><span>Total kg</span></div></div><div className="composition-list"><div><i className="legend-dot orange-dot" /><span>Organik</span><strong>42%</strong></div><div><i className="legend-dot teal-dot" /><span>Anorganik</span><strong>31%</strong></div><div><i className="legend-dot blue-dot" /><span>Residu</span><strong>20%</strong></div><div><i className="legend-dot gray-dot" /><span>Lainnya</span><strong>7%</strong></div></div></div><div className="insight"><Leaf size={16} /><span><strong>Catatan:</strong> Pemilahan naik 6% dari bulan sebelumnya.</span></div></article></section>
        <section className="lower-grid"><article className="panel region-panel"><div className="panel-heading"><div><h3>Performa per wilayah</h3><p>Perbandingan sampah terkelola</p></div><button className="text-button">Lihat semua <ArrowUpRight size={15} /></button></div><div className="region-list"><Region name="Dusun Suka Maju" value="2.840 kg" percent={86} color="teal" /><Region name="Dusun Mekar Jaya" value="2.210 kg" percent={68} color="lime" /><Region name="Dusun Harapan" value="1.940 kg" percent={54} color="orange" /><Region name="Dusun Cipta Karya" value="1.470 kg" percent={42} color="blue" /></div></article><article className="panel activity-panel"><PanelTitle title="Aktivitas terbaru" subtitle="Pembaruan data lapangan" /><div className="activity-list"><ActivityItem icon={Truck} title="Pengumpulan selesai" meta="Dusun Suka Maju · 08:42" value="+240 kg" tone="teal" /><ActivityItem icon={Recycle} title="Setoran Bank Sampah" meta="BS Lestari · 08:15" value="+86 kg" tone="lime" /><ActivityItem icon={AlertTriangle} title="Pengaduan baru masuk" meta="Dusun Harapan · 07:50" value="Tinjau" tone="orange" /></div><button className="activity-link">Buka log aktivitas <ArrowUpRight size={15} /></button></article></section>
        <footer className="footer-note"><span><span className="status-pulse" /> Sistem berjalan normal</span><span>Dashboard Pengelolaan Sampah Desa <b>•</b> v1.0.0</span></footer>
      </div>
    </section>
  </main>;
}

function PanelTitle({ title, subtitle }: { title: string; subtitle: string }) { return <div className="panel-heading"><div><h3>{title}</h3><p>{subtitle}</p></div><button className="more-button" aria-label={`Opsi ${title}`}>•••</button></div>; }
function Region({ name, value, percent, color }: { name: string; value: string; percent: number; color: string }) { return <div className="region-row"><div className="region-label"><span>{name}</span><strong>{value}</strong></div><div className="progress-track"><div className={`progress-fill ${color}`} style={{ width: `${percent}%` }} /></div><small>{percent}%</small></div>; }
function ActivityItem({ icon: Icon, title, meta, value, tone }: { icon: typeof Truck; title: string; meta: string; value: string; tone: string }) { return <div className="activity-item"><div className={`activity-icon ${tone}`}><Icon size={16} /></div><div className="activity-copy"><strong>{title}</strong><span>{meta}</span></div><b className={tone}>{value}</b></div>; }
