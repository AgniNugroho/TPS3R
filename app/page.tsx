"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
    ArrowUpRight,
    Bell,
    CalendarDays,
    ChevronDown,
    Download,
    Leaf,
    Menu,
    PackageCheck,
    Recycle,
    Truck,
    Users,
    X,
} from "lucide-react";
import Sidebar from "@/components/dashboard/Sidebar";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { exportWorkbook } from "@/lib/utils/exportExcel";

type DashboardData = {
    totalIncoming: number;
    utilized: number;
    residu: number;
    sortedTotal: number;
    organik: number;
    anorganik: number;
    recoveryRate: number;
    chart: Array<{ label: string; total_kg: number }>;
    regions: Array<{ name: string; total_kg: number }>;
    activities: Array<{
        title: string;
        meta: string;
        value: string;
        tone: string;
    }>;
    lastUpdated: string | null;
};
const emptyDashboard: DashboardData = {
    totalIncoming: 0,
    utilized: 0,
    residu: 0,
    sortedTotal: 0,
    organik: 0,
    anorganik: 0,
    recoveryRate: 0,
    chart: [],
    regions: [],
    activities: [],
    lastUpdated: null,
};
const formatNumber = (value: number) =>
    new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(value);
const formatUpdatedAt = (value: string | null) => {
    if (!value) return "Belum ada data";
    const elapsedMinutes = Math.max(
        0,
        Math.floor((Date.now() - new Date(value).getTime()) / 60000),
    );
    if (elapsedMinutes < 1) return "BARU SAJA";
    if (elapsedMinutes < 60) return `${elapsedMinutes} MENIT LALU`;
    const elapsedHours = Math.floor(elapsedMinutes / 60);
    if (elapsedHours < 24) return `${elapsedHours} JAM LALU`;
    return `${Math.floor(elapsedHours / 24)} HARI LALU`;
};
const compositionGradient = (
    organik: number,
    anorganik: number,
    residu: number,
) => {
    const total = organik + anorganik + residu;
    if (!total) return "#dce5e1";
    const organikEnd = (organik / total) * 100;
    const anorganikEnd = organikEnd + (anorganik / total) * 100;
    return `conic-gradient(#f2a45d 0 ${organikEnd}%, #0b8f82 ${organikEnd}% ${anorganikEnd}%, #72b8d1 ${anorganikEnd}% 100%)`;
};

function DashboardContent() {
    const searchParams = useSearchParams();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [localDate, setLocalDate] = useState("");
    const [period, setPeriod] = useState("1 bulan");
    const [periodOpen, setPeriodOpen] = useState(false);
    const [showActivities, setShowActivities] = useState(false);
    const [dashboard, setDashboard] = useState<DashboardData>(emptyDashboard);
    const [chartRevision, setChartRevision] = useState(0);
    const user = useCurrentUser();
    const chartPeriod = period === "1 tahun" ? "year" : "month";
    useEffect(() => {
        const desaId = searchParams.get("desa_id");
        const query = new URLSearchParams({ period: chartPeriod });
        if (desaId) query.set("desa_id", desaId);
        fetch(`/api/dashboard?${query.toString()}`)
            .then((response) => response.json())
            .then((result) => {
                if (result.ok) {
                    setDashboard(result.data);
                    setChartRevision((revision) => revision + 1);
                }
            })
            .catch(() => undefined);
    }, [chartPeriod, searchParams]);
    useEffect(() => {
        const timer = window.setTimeout(
            () =>
                setLocalDate(
                    new Intl.DateTimeFormat("id-ID", {
                        dateStyle: "long",
                    }).format(new Date()),
                ),
            0,
        );
        return () => window.clearTimeout(timer);
    }, []);
    const stats = [
        {
            label: "Sampah Masuk",
            value: formatNumber(dashboard.totalIncoming),
            unit: "kg",
            note: "Total sampah masuk ke TPS",
            trend: "up",
            tone: "teal",
            icon: Truck,
        },
        {
            label: "Sampah Belum Terpilah",
            value: formatNumber(
                Math.max(0, dashboard.totalIncoming - dashboard.sortedTotal),
            ),
            unit: "kg",
            note: "Total sampah yang belum dipilah",
            trend: "up",
            tone: "lime",
            icon: Recycle,
        },
        {
            label: "Material Terpilah",
            value: formatNumber(dashboard.sortedTotal),
            unit: "kg",
            note: "Organik + Anorganik + Residu",
            trend: "up",
            tone: "blue",
            icon: Users,
        },
        {
            label: "Residu",
            value: formatNumber(dashboard.residu),
            unit: "kg",
            note: "Jumlah sampah yang tidak bisa diolah",
            trend: "down",
            tone: "amber",
            icon: PackageCheck,
        },
    ];
    const chartData = dashboard.chart;
    const maxChart = Math.max(...chartData.map((item) => item.total_kg), 1);

    async function handleExport() {
        await exportWorkbook(
            [
                {
                    sheetName: "Ringkasan",
                    rows: [
                        {
                            indikator: "Sampah Masuk (kg)",
                            nilai: dashboard.totalIncoming,
                        },
                        {
                            indikator: "Sampah Belum Terpilah (kg)",
                            nilai: Math.max(
                                0,
                                dashboard.totalIncoming - dashboard.sortedTotal,
                            ),
                        },
                        {
                            indikator: "Material Terpilah (kg)",
                            nilai: dashboard.sortedTotal,
                        },
                        { indikator: "Organik (kg)", nilai: dashboard.organik },
                        {
                            indikator: "Anorganik (kg)",
                            nilai: dashboard.anorganik,
                        },
                        { indikator: "Residu (kg)", nilai: dashboard.residu },
                        {
                            indikator: "Sampah Dimanfaatkan (kg)",
                            nilai: dashboard.utilized,
                        },
                        {
                            indikator: "Recovery Rate (%)",
                            nilai: Number(dashboard.recoveryRate.toFixed(2)),
                        },
                    ],
                    columns: [
                        {
                            header: "Indikator",
                            accessor: (row: { indikator: string }) =>
                                row.indikator,
                        },
                        {
                            header: "Nilai",
                            accessor: (row: { nilai: number }) => row.nilai,
                        },
                    ],
                },
                {
                    sheetName: `Volume per ${period === "1 tahun" ? "Bulan" : "Hari"}`,
                    rows: dashboard.chart,
                    columns: [
                        {
                            header: period === "1 tahun" ? "Bulan" : "Tanggal",
                            accessor: (row) => row.label,
                        },
                        {
                            header: "Total (kg)",
                            accessor: (row) => row.total_kg,
                        },
                    ],
                },
                {
                    sheetName: "Komposisi",
                    rows: [
                        { kategori: "Organik", berat: dashboard.organik },
                        { kategori: "Anorganik", berat: dashboard.anorganik },
                        { kategori: "Residu", berat: dashboard.residu },
                    ],
                    columns: [
                        {
                            header: "Kategori",
                            accessor: (row: { kategori: string }) =>
                                row.kategori,
                        },
                        {
                            header: "Berat (kg)",
                            accessor: (row: { berat: number }) => row.berat,
                        },
                    ],
                },
                {
                    sheetName: "Performa Wilayah",
                    rows: dashboard.regions,
                    columns: [
                        { header: "Wilayah", accessor: (row) => row.name },
                        {
                            header: "Total (kg)",
                            accessor: (row) => row.total_kg,
                        },
                    ],
                },
                {
                    sheetName: "Aktivitas Terbaru",
                    rows: dashboard.activities,
                    columns: [
                        { header: "Aktivitas", accessor: (row) => row.title },
                        { header: "Keterangan", accessor: (row) => row.meta },
                        { header: "Nilai", accessor: (row) => row.value },
                    ],
                },
            ],
            `ringkasan-sampah-desa-${new Date().toISOString().slice(0, 10)}.xlsx`,
        );
    }

    return (
        <main className="app-shell">
            <Sidebar
                mobileOpen={mobileOpen}
                onMobileChange={setMobileOpen}
                activeLabel="Ringkasan"
            />
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
                        <strong>Ringkasan</strong>
                    </div>
                    <div className="topbar-actions">
                        <button
                            className="icon-button notification"
                            aria-label="Notifikasi"
                        >
                            <Bell size={19} />
                            <i />
                        </button>
                        <div className="topbar-date">
                            <CalendarDays size={16} /> {localDate}
                        </div>
                    </div>
                </header>
                <div className="content-wrap">
                    <div className="page-heading">
                        <div>
                            <p className="eyebrow">
                                <span className="live-dot" /> DATA DIPERBARUI{" "}
                                {formatUpdatedAt(dashboard.lastUpdated)}
                            </p>
                            <h1>
                                Selamat pagi, {user?.nama?.split(" ")[0] ?? ""}.
                            </h1>
                            <p className="heading-copy">
                                Pantau denyut pengelolaan sampah desa hari ini.
                            </p>
                        </div>
                        <div className="heading-actions">
                            <button
                                className="secondary-button"
                                onClick={handleExport}
                                title="Unduh ringkasan sebagai Excel"
                            >
                                <Download size={14} /> Export Excel
                            </button>
                        </div>
                    </div>
                    <section className="stat-grid">
                        {stats.map((stat) => {
                            const Icon = stat.icon;
                            return (
                                <article
                                    className={`stat-card ${stat.tone}`}
                                    key={stat.label}
                                >
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
                                    <div className="stat-note">{stat.note}</div>
                                </article>
                            );
                        })}
                    </section>
                    <div className="section-toolbar">
                        <div>
                            <h2>Performa Operasional</h2>
                            <p>Performa pengelolaan dalam periode berjalan</p>
                        </div>
                        <div className="period-menu">
                            <button
                                className="period-trigger"
                                onClick={() => setPeriodOpen((open) => !open)}
                                aria-expanded={periodOpen}
                                aria-haspopup="menu"
                                aria-label="Pilih periode"
                            >
                                {period}
                                <ChevronDown
                                    size={14}
                                    className={periodOpen ? "chevron-open" : ""}
                                />
                            </button>
                            {periodOpen && (
                                <div className="period-dropdown" role="menu">
                                    {["1 bulan", "1 tahun"].map((option) => (
                                        <button
                                            key={option}
                                            className={`period-option ${period === option ? "selected" : ""}`}
                                            onClick={() => {
                                                setPeriod(option);
                                                setPeriodOpen(false);
                                            }}
                                            role="menuitem"
                                        >
                                            {option}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                    <section className="dashboard-grid">
                        <article className="panel trend-panel">
                            <PanelTitle
                                title="Volume Sampah Terkelola"
                                subtitle={
                                    period === "1 tahun"
                                        ? "Total berat per bulan"
                                        : "Total berat per hari"
                                }
                            />
                            <div className="chart-summary">
                                <strong>
                                    {formatNumber(dashboard.totalIncoming)}{" "}
                                    <small>kg</small>
                                </strong>
                            </div>
                            <div
                                className="bar-chart"
                                key={`bar-chart-${chartRevision}`}
                                aria-label="Grafik volume sampah terkelola"
                            >
                                <div className="y-axis">
                                    <span>{formatNumber(maxChart)}</span>
                                    <span>{formatNumber(maxChart * 0.75)}</span>
                                    <span>{formatNumber(maxChart * 0.5)}</span>
                                    <span>{formatNumber(maxChart * 0.25)}</span>
                                    <span>0</span>
                                </div>
                                <div className="bars">
                                    {chartData.length ? (
                                        chartData.map((item) => (
                                            <div
                                                className="bar-column"
                                                key={item.label}
                                            >
                                                <div
                                                    className={`bar ${item.total_kg === maxChart ? "highlight" : ""}`}
                                                    style={{
                                                        height: `${(item.total_kg / maxChart) * 100}%`,
                                                    }}
                                                >
                                                    <span>
                                                        {item.total_kg ===
                                                        maxChart
                                                            ? formatNumber(
                                                                  item.total_kg,
                                                              )
                                                            : ""}
                                                    </span>
                                                </div>
                                                <small>{item.label}</small>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="chart-empty-state">
                                            Belum ada data pada desa ini
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className="chart-legend">
                                <span>
                                    <i className="legend-dot teal-dot" />
                                    Total sampah masuk
                                </span>
                                <span>
                                    <i className="legend-dot pale-dot" />
                                    {period === "1 tahun"
                                        ? "Per bulan"
                                        : "Per tanggal"}
                                </span>
                            </div>
                        </article>
                        <article className="panel composition-panel">
                            <PanelTitle
                                title="Komposisi Sampah"
                                subtitle="Distribusi hasil pemilahan"
                            />
                            <div className="donut-wrap">
                                <div
                                    className="donut"
                                    key={`donut-${chartRevision}`}
                                    style={{
                                        background: compositionGradient(
                                            dashboard.organik,
                                            dashboard.anorganik,
                                            dashboard.residu,
                                        ),
                                    }}
                                >
                                    <div className="donut-center">
                                        <strong>
                                            {formatNumber(
                                                dashboard.sortedTotal,
                                            )}
                                        </strong>
                                        <span>Total kg</span>
                                    </div>
                                </div>
                                <div className="composition-list">
                                    <div>
                                        <i
                                            className={`legend-dot ${dashboard.organik ? "orange-dot" : "empty-dot"}`}
                                        />
                                        <span>Organik</span>
                                        <strong>
                                            {formatNumber(dashboard.organik)} kg
                                        </strong>
                                    </div>
                                    <div>
                                        <i
                                            className={`legend-dot ${dashboard.anorganik ? "teal-dot" : "empty-dot"}`}
                                        />
                                        <span>Anorganik</span>
                                        <strong>
                                            {formatNumber(dashboard.anorganik)}{" "}
                                            kg
                                        </strong>
                                    </div>
                                    <div>
                                        <i
                                            className={`legend-dot ${dashboard.residu ? "blue-dot" : "empty-dot"}`}
                                        />
                                        <span>Residu</span>
                                        <strong>
                                            {formatNumber(dashboard.residu)} kg
                                        </strong>
                                    </div>
                                </div>
                            </div>
                            <div className="insight">
                                <Leaf size={16} />
                                <span>
                                    <strong>Catatan:</strong> Komposisi dihitung
                                    dari hasil pemilahan sampah.
                                </span>
                            </div>
                        </article>
                    </section>
                    <section className="lower-grid">
                        <article className="panel region-panel">
                            <div className="panel-heading">
                                <div>
                                    <h3>Performa per Wilayah</h3>
                                    <p>Total sampah masuk berdasarkan asal</p>
                                </div>
                                <button className="text-button">
                                    Data SQL <ArrowUpRight size={15} />
                                </button>
                            </div>
                            <div
                                className="region-list"
                                key={`regions-${chartRevision}`}
                            >
                                {dashboard.regions.length ? (
                                    dashboard.regions.map((region, index) => (
                                        <Region
                                            key={region.name}
                                            name={region.name}
                                            value={`${formatNumber(region.total_kg)} kg`}
                                            percent={
                                                dashboard.totalIncoming
                                                    ? (region.total_kg /
                                                          dashboard.totalIncoming) *
                                                      100
                                                    : 0
                                            }
                                            color={
                                                [
                                                    "teal",
                                                    "lime",
                                                    "orange",
                                                    "blue",
                                                ][index % 4]
                                            }
                                        />
                                    ))
                                ) : (
                                    <p className="chart-empty-state">
                                        Belum ada data wilayah
                                    </p>
                                )}
                            </div>
                        </article>
                        <article className="panel activity-panel">
                            <PanelTitle
                                title="Aktivitas Terbaru"
                                subtitle="Data sampah masuk dan pemilahan"
                            />
                            <div className="activity-list">
                                {dashboard.activities
                                    .slice(0, 3)
                                    .map((activity, index) => (
                                        <ActivityItem
                                            key={`${activity.meta}-${index}`}
                                            icon={Truck}
                                            title={activity.title}
                                            meta={activity.meta}
                                            value={activity.value}
                                            tone={activity.tone}
                                        />
                                    ))}
                            </div>
                            <button
                                className="activity-link"
                                onClick={() => setShowActivities(true)}
                            >
                                Lihat semua aktivitas <ArrowUpRight size={15} />
                            </button>
                        </article>
                    </section>
                    {showActivities && (
                        <div
                            className="modal-backdrop"
                            role="presentation"
                            onClick={() => setShowActivities(false)}
                        >
                            <section
                                className="activity-modal"
                                role="dialog"
                                aria-modal="true"
                                aria-labelledby="activity-modal-title"
                                onClick={(event) => event.stopPropagation()}
                            >
                                <div className="modal-header">
                                    <div>
                                        <h2 id="activity-modal-title">
                                            Semua Aktivitas
                                        </h2>
                                        <p>
                                            Riwayat sampah masuk dan pemilahan
                                        </p>
                                    </div>
                                    <button
                                        className="icon-button"
                                        onClick={() => setShowActivities(false)}
                                        aria-label="Tutup aktivitas"
                                    >
                                        <X size={19} />
                                    </button>
                                </div>
                                <div className="modal-activity-list">
                                    {dashboard.activities.length ? (
                                        dashboard.activities.map(
                                            (activity, index) => (
                                                <ActivityItem
                                                    key={`${activity.meta}-${index}`}
                                                    icon={Truck}
                                                    title={activity.title}
                                                    meta={activity.meta}
                                                    value={activity.value}
                                                    tone={activity.tone}
                                                />
                                            ),
                                        )
                                    ) : (
                                        <p className="empty-activity">
                                            Belum ada aktivitas.
                                        </p>
                                    )}
                                </div>
                            </section>
                        </div>
                    )}
                    <footer className="footer-note">
                        <span>
                            <span className="status-pulse" /> Sistem berjalan
                            normal
                        </span>
                        <span>
                            Dashboard Pengelolaan Sampah Desa <b>•</b> v1.0.0
                        </span>
                    </footer>
                </div>
            </section>
        </main>
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
function Region({
    name,
    value,
    percent,
    color,
}: {
    name: string;
    value: string;
    percent: number;
    color: string;
}) {
    return (
        <div className="region-row">
            <div className="region-label">
                <span>{name}</span>
                <strong>{value}</strong>
            </div>
            <div className="progress-track">
                <div
                    className={`progress-fill ${color}`}
                    style={{ width: `${percent}%` }}
                />
            </div>
            <small>{formatNumber(percent)}%</small>
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

export default function Home() {
    return (
        <Suspense fallback={<main className="app-shell" />}>
            <DashboardContent />
        </Suspense>
    );
}
