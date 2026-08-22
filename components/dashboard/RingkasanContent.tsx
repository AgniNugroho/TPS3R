"use client";

import { useState } from "react";
import Link from "next/link";
import { Activity, ArrowDownRight, ArrowUpRight, FileText, Leaf, PackageCheck, Recycle, Truck, Users } from "lucide-react";

// Belum ada data jenis sampah (breakdown organik/anorganik/residu belum dibangun),
// jadi dua kartu ini & donut komposisi masih dummy sampai form breakdown dibuat.
const dummyStats = {
  berhasilDimanfaatkan: { value: "850", unit: "kg", note: "+8,4% vs bulan lalu", trend: "up" as const },
  residu: { value: "250", unit: "kg", note: "-4,2% vs bulan lalu", trend: "down" as const },
};

export type DashboardStatValue = { value: string; note: string; trend: "up" | "down" };
export type DashboardRegion = { name: string; value: string; percent: number; color: string };
export type DashboardActivity = { title: string; meta: string; value: string };

export type RingkasanContentProps = {
  greeting: string;
  petugasNama: string;
  sampahMasuk: DashboardStatValue;
  anggotaTerlayani: DashboardStatValue;
  monthly: {
    months: string[];
    heights: number[];
    values: number[];
    totalLabel: string;
    trendLabel: string;
    trendUp: boolean;
    highlightIndex: number;
  };
  regions: DashboardRegion[];
  activities: DashboardActivity[];
};

export function RingkasanContent({
  greeting,
  petugasNama,
  sampahMasuk,
  anggotaTerlayani,
  monthly,
  regions,
  activities,
}: RingkasanContentProps) {
  const [period, setPeriod] = useState("30 hari terakhir");

  const stats = [
    { label: "Sampah masuk", value: sampahMasuk.value, unit: "kg", note: sampahMasuk.note, trend: sampahMasuk.trend, tone: "teal", icon: Truck },
    { label: "Berhasil dimanfaatkan", value: dummyStats.berhasilDimanfaatkan.value, unit: dummyStats.berhasilDimanfaatkan.unit, note: dummyStats.berhasilDimanfaatkan.note, trend: dummyStats.berhasilDimanfaatkan.trend, tone: "lime", icon: Recycle },
    { label: "Residu", value: dummyStats.residu.value, unit: dummyStats.residu.unit, note: dummyStats.residu.note, trend: dummyStats.residu.trend, tone: "amber", icon: PackageCheck },
    { label: "Anggota terlayani", value: anggotaTerlayani.value, unit: "anggota", note: anggotaTerlayani.note, trend: anggotaTerlayani.trend, tone: "blue", icon: Users },
  ];

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            <span className="live-dot" /> DATA DIPERBARUI 10 MENIT LALU
          </p>
          <h1>
            {greeting}, {petugasNama}.
          </h1>
          <p className="heading-copy">Pantau denyut pengelolaan sampah desa hari ini.</p>
        </div>
        <div className="heading-actions">
          <button className="secondary-button">
            <FileText size={16} /> Lihat laporan
          </button>
          <Link className="primary-button" href="/pengumpulan">
            <Activity size={17} /> Input pengumpulan sampah
          </Link>
        </div>
      </div>
      <section className="stat-grid">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <article className={`stat-card ${stat.tone}`} key={stat.label}>
              <div className="stat-top">
                <div>
                  <p>{stat.label}</p>
                  <h2>
                    {stat.value}
                    <small>{stat.unit}</small>
                  </h2>
                </div>
                <div className="stat-icon">
                  <Icon size={20} />
                </div>
              </div>
              <div className={`stat-note ${stat.trend}`}>
                <span>{stat.trend === "up" ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}</span>
                {stat.note}
              </div>
            </article>
          );
        })}
      </section>
      <div className="section-toolbar">
        <div>
          <h2>Ikhtisar operasional</h2>
          <p>Performa pengelolaan dalam periode berjalan</p>
        </div>
        <select value={period} onChange={(event) => setPeriod(event.target.value)} aria-label="Pilih periode">
          <option>30 hari terakhir</option>
          <option>90 hari terakhir</option>
          <option>Tahun berjalan</option>
        </select>
      </div>
      <section className="dashboard-grid">
        <article className="panel trend-panel">
          <PanelTitle title="Volume sampah terkelola" subtitle="Total berat berdasarkan bulan" />
          <div className="chart-summary">
            <strong>
              {monthly.totalLabel} <small>kg</small>
            </strong>
            <span className="positive">
              {monthly.trendUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />} {monthly.trendLabel}
            </span>
          </div>
          <div className="bar-chart" aria-label="Grafik volume sampah terkelola">
            <div className="y-axis">
              <span>1.000</span>
              <span>750</span>
              <span>500</span>
              <span>250</span>
              <span>0</span>
            </div>
            <div className="bars">
              {monthly.heights.map((height, index) => (
                <div className="bar-column" key={monthly.months[index] + index}>
                  <div className={`bar ${index === monthly.highlightIndex ? "highlight" : ""}`} style={{ height: `${height}%` }}>
                    <span>{index === monthly.highlightIndex ? monthly.values[index].toLocaleString("id-ID") : ""}</span>
                  </div>
                  <small>{monthly.months[index]}</small>
                </div>
              ))}
            </div>
          </div>
          <div className="chart-legend">
            <span>
              <i className="legend-dot teal-dot" />
              Total sampah masuk
            </span>
          </div>
        </article>
        <article className="panel composition-panel">
          <PanelTitle title="Komposisi sampah" subtitle="Distribusi bulan ini" />
          <div className="donut-wrap">
            <div className="donut">
              <div className="donut-center">
                <strong>1.250</strong>
                <span>Total kg</span>
              </div>
            </div>
            <div className="composition-list">
              <div>
                <i className="legend-dot orange-dot" />
                <span>Organik</span>
                <strong>42%</strong>
              </div>
              <div>
                <i className="legend-dot teal-dot" />
                <span>Anorganik</span>
                <strong>31%</strong>
              </div>
              <div>
                <i className="legend-dot blue-dot" />
                <span>Residu</span>
                <strong>20%</strong>
              </div>
              <div>
                <i className="legend-dot gray-dot" />
                <span>Lainnya</span>
                <strong>7%</strong>
              </div>
            </div>
          </div>
          <div className="insight">
            <Leaf size={16} />
            <span>
              <strong>Catatan:</strong> Pemilahan naik 6% dari bulan sebelumnya.
            </span>
          </div>
        </article>
      </section>
      <section className="lower-grid">
        <article className="panel region-panel">
          <div className="panel-heading">
            <div>
              <h3>Performa per wilayah</h3>
              <p>Perbandingan sampah terkelola</p>
            </div>
            <button className="text-button">
              Lihat semua <ArrowUpRight size={15} />
            </button>
          </div>
          <div className="region-list">
            {regions.length === 0 && <p className="heading-copy">Belum ada data pengumpulan per wilayah.</p>}
            {regions.map((region) => (
              <Region key={region.name} {...region} />
            ))}
          </div>
        </article>
        <article className="panel activity-panel">
          <PanelTitle title="Aktivitas terbaru" subtitle="Pembaruan data lapangan" />
          <div className="activity-list">
            {activities.length === 0 && <p className="heading-copy">Belum ada aktivitas pengumpulan.</p>}
            {activities.map((item, index) => (
              <ActivityItem key={index} icon={Truck} title={item.title} meta={item.meta} value={item.value} tone="teal" />
            ))}
          </div>
          <button className="activity-link">
            Buka log aktivitas <ArrowUpRight size={15} />
          </button>
        </article>
      </section>
      <footer className="footer-note">
        <span>
          <span className="status-pulse" /> Sistem berjalan normal
        </span>
        <span>
          Dashboard Pengelolaan Sampah Desa <b>•</b> v1.0.0
        </span>
      </footer>
    </>
  );
}

function PanelTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="panel-heading">
      <div>
        <h3>{title}</h3>
        <p>{subtitle}</p>
      </div>
      <button className="more-button" aria-label={`Opsi ${title}`}>
        •••
      </button>
    </div>
  );
}

function Region({ name, value, percent, color }: { name: string; value: string; percent: number; color: string }) {
  return (
    <div className="region-row">
      <div className="region-label">
        <span>{name}</span>
        <strong>{value}</strong>
      </div>
      <div className="progress-track">
        <div className={`progress-fill ${color}`} style={{ width: `${percent}%` }} />
      </div>
      <small>{percent}%</small>
    </div>
  );
}

function ActivityItem({
  icon: Icon,
  title,
  meta,
  value,
  tone,
}: {
  icon: typeof Truck;
  title: string;
  meta: string;
  value: string;
  tone: string;
}) {
  return (
    <div className="activity-item">
      <div className={`activity-icon ${tone}`}>
        <Icon size={16} />
      </div>
      <div className="activity-copy">
        <strong>{title}</strong>
        <span>{meta}</span>
      </div>
      <b className={tone}>{value}</b>
    </div>
  );
}
