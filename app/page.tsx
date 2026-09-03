"use client";

import { useState } from "react";
import Link from "next/link";
import { Leaf, LogIn, Recycle, ShieldCheck, AlertCircle, Phone, Send, Info, CheckCircle2 } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browserClient";
import toast from "react-hot-toast";

export default function LandingPage() {
    const [nama, setNama] = useState("");
    const [kontak, setKontak] = useState("");
    const [kategori, setKategori] = useState("Sampah Menumpuk");
    const [deskripsi, setDeskripsi] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmitPengaduan(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);

        const supabase = getSupabaseBrowserClient();
        const { error } = await supabase.from("pengaduan").insert([
            {
                nama_pelapor: nama,
                kontak_pelapor: kontak || "-",
                kategori,
                deskripsi,
                status: "Diterima"
            }
        ]);

        setLoading(false);

        if (error) {
            toast.error("Gagal mengirim laporan. Coba lagi.");
            console.error(error);
        } else {
            toast.success("Laporan berhasil dikirim! Terima kasih atas partisipasi Anda.");
            setNama("");
            setKontak("");
            setDeskripsi("");
            setKategori("Sampah Menumpuk");
        }
    }
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
        <div style={{ minHeight: "100vh", backgroundColor: "#f8faf9", fontFamily: "var(--font-body)" }}>
            {/* ── NAVBAR ── */}
            <nav style={{ 
                position: "fixed", top: 0, left: 0, right: 0, zIndex: 50, 
                backgroundColor: "rgba(255,255,255,0.85)", backdropFilter: "blur(12px)", 
                borderBottom: "1px solid #eef2ef", padding: "16px 24px",
                display: "flex", justifyContent: "space-between", alignItems: "center"
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ width: "40px", height: "40px", backgroundColor: "var(--teal)", color: "white", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Leaf size={24} />
                    </div>
                    <div>
                        <h1 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "var(--teal)", fontFamily: "var(--font-display)", letterSpacing: "-0.5px" }}>TPS3R DUKUN</h1>
                        <p style={{ margin: 0, fontSize: "11px", color: "#62736d", fontWeight: 600, letterSpacing: "1px" }}>BUMDES BERSAMA</p>
                    </div>
                </div>
                <Link href="/login" style={{ 
                    display: "flex", alignItems: "center", gap: "8px", 
                    backgroundColor: "var(--teal)", color: "white", padding: "10px 18px", 
                    borderRadius: "100px", fontSize: "13px", fontWeight: 700, textDecoration: "none",
                    transition: "transform 0.2s, backgroundColor 0.2s"
                }}>
                    <LogIn size={16} /> Login Petugas
                </Link>
            </nav>

            {/* ── HERO SECTION ── */}
            <section style={{ 
                minHeight: "100vh", 
                padding: "100px 24px 60px", 
                display: "flex", alignItems: "center", justifyContent: "center",
                textAlign: "center", 
                background: "linear-gradient(180deg, #e6f0ed 0%, #f8faf9 100%)",
                position: "relative", overflow: "hidden"
            }}>
                <div style={{ maxWidth: "800px", margin: "0 auto", position: "relative", zIndex: 2 }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", backgroundColor: "rgba(11, 143, 130, 0.1)", color: "var(--teal)", padding: "6px 16px", borderRadius: "100px", fontSize: "13px", fontWeight: 700, marginBottom: "24px" }}>
                        <Recycle size={16} /> Desa Bersih, Warga Sehat
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
                    <h2 style={{ fontSize: "56px", fontWeight: 800, color: "#1a2522", fontFamily: "var(--font-display)", lineHeight: 1.1, marginBottom: "24px", letterSpacing: "-1.5px" }}>
                        Layanan Pengelolaan Sampah <br />
                        <span style={{ color: "var(--teal)" }}>Modern & Berkelanjutan</span>
                    </h2>
                    <p style={{ fontSize: "18px", color: "#4a5a55", lineHeight: 1.6, marginBottom: "40px", maxWidth: "600px", margin: "0 auto 40px" }}>
                        TPS3R Dukun hadir untuk mengatasi permasalahan sampah di wilayah kita melalui pendekatan Reduce, Reuse, dan Recycle.
                    </p>
                    <div style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
                        <a href="#pengaduan" className="hover-lift" style={{ 
                            backgroundColor: "var(--amber)", color: "white", padding: "16px 32px", 
                            borderRadius: "100px", fontSize: "15px", fontWeight: 700, textDecoration: "none",
                            display: "flex", alignItems: "center", gap: "8px", boxShadow: "0 8px 24px rgba(242, 164, 93, 0.4)", border: "none"
                        }}>
                            <AlertCircle size={18} /> Lapor Keluhan Warga
                        </a>
                        <a href="#tentang" className="hover-lift" style={{ 
                            backgroundColor: "white", color: "var(--teal)", padding: "16px 32px", border: "2px solid #dce5e1",
                            borderRadius: "100px", fontSize: "15px", fontWeight: 700, textDecoration: "none",
                            display: "flex", alignItems: "center", gap: "8px"
                        }}>
                            <Info size={18} /> Pelajari Sistem Kami
                        </a>
                    </div>
                </div>
                
                {/* Decorative Elements */}
                <div style={{ position: "absolute", top: "10%", left: "-5%", color: "var(--lime)", opacity: 0.1, transform: "rotate(-15deg)" }}><Leaf size={250} /></div>
                <div style={{ position: "absolute", bottom: "10%", right: "-5%", color: "var(--teal)", opacity: 0.05, transform: "rotate(15deg)" }}><Recycle size={350} /></div>
            </section>

            {/* ── TENTANG TPS3R ── */}
            <section id="tentang" style={{ padding: "80px 24px", maxWidth: "1000px", margin: "0 auto" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "40px", alignItems: "center" }}>
                    <div>
                        <h3 style={{ fontSize: "32px", fontWeight: 800, color: "#1a2522", fontFamily: "var(--font-display)", marginBottom: "20px" }}>Apa itu TPS3R?</h3>
                        <p style={{ fontSize: "16px", color: "#4a5a55", lineHeight: 1.7, marginBottom: "16px" }}>
                            <strong>Tempat Pengolahan Sampah - Reduce, Reuse, Recycle (TPS3R)</strong> adalah sistem pengelolaan sampah yang berfokus pada pengurangan kuantitas sampah dari sumbernya, pemanfaatan kembali, dan pendauran ulang.
                        </p>
                        <p style={{ fontSize: "16px", color: "#4a5a55", lineHeight: 1.7 }}>
                            Di TPS3R Dukun, kami mengolah sampah organik menjadi pakan ternak (Maggot BSF), menjual sampah anorganik (plastik, botol) ke pengepul, dan memusnahkan sisa residu yang tidak bisa didaur ulang menggunakan insinerator ramah lingkungan.
                        </p>
                    </div>
                    <div style={{ display: "grid", gap: "20px" }}>
                        {[
                            { title: "Reduce (Kurangi)", desc: "Membatasi penggunaan barang yang menghasilkan sampah plastik sekali pakai.", color: "var(--teal)" },
                            { title: "Reuse (Gunakan Kembali)", desc: "Memanfaatkan botol atau wadah bekas untuk fungsi lain yang berguna.", color: "var(--blue)" },
                            { title: "Recycle (Daur Ulang)", desc: "Mengolah sampah organik menjadi kompos atau pakan maggot.", color: "var(--lime)" },
                        ].map((item, i) => (
                            <div key={i} style={{ background: "white", padding: "24px", borderRadius: "20px", boxShadow: "0 10px 30px rgba(0,0,0,0.03)", display: "flex", gap: "16px" }}>
                                <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: item.color, color: "white", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                    <Recycle size={24} />
                                </div>
                                <div>
                                    <h4 style={{ margin: "0 0 4px 0", fontSize: "18px", color: "#1a2522", fontWeight: 700 }}>{item.title}</h4>
                                    <p style={{ margin: 0, fontSize: "14px", color: "#62736d", lineHeight: 1.5 }}>{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── PERATURAN & TATA TERTIB ── */}
            <section style={{ padding: "80px 24px", background: "white", borderTop: "1px solid #eef2ef", borderBottom: "1px solid #eef2ef" }}>
                <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
                    <div style={{ textAlign: "center", marginBottom: "50px" }}>
                        <h3 style={{ fontSize: "32px", fontWeight: 800, color: "#1a2522", fontFamily: "var(--font-display)", marginBottom: "12px" }}>Tata Tertib Pelayanan</h3>
                        <p style={{ fontSize: "16px", color: "#62736d" }}>Mohon patuhi aturan berikut demi kelancaran operasional kebersihan desa.</p>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "24px" }}>
                        {[
                            { icon: CheckCircle2, title: "Wajib Memilah Sampah", desc: "Pisahkan sampah organik (sisa makanan) dengan anorganik (plastik/kertas) di dua kantong berbeda.", tone: "var(--teal)", bg: "#e6f0ed" },
                            { icon: ShieldCheck, title: "Iuran Tepat Waktu", desc: "Tarif bulanan wajib dibayarkan sebelum tanggal 10 setiap bulannya kepada petugas penagih.", tone: "var(--blue)", bg: "#e6f2f7" },
                            { icon: AlertCircle, title: "Larangan Limbah Medis", desc: "Popok bayi (pampers), jarum suntik, dan obat-obatan DILARANG KERAS dibuang ke TPS3R.", tone: "var(--amber)", bg: "#fdf3e8" },
                            { icon: Phone, title: "Jadwal Pengangkutan", desc: "Truk sampah beroperasi setiap hari Selasa dan Kamis pagi (Pukul 07.00 - 11.00 WIB).", tone: "var(--lime)", bg: "#f3f6e8" },
                        ].map((rule, i) => {
                            const Icon = rule.icon;
                            return (
                                <div key={i} style={{ padding: "30px", borderRadius: "24px", border: `2px solid ${rule.bg}`, background: rule.bg, transition: "transform 0.3s" }} className="hover-lift">
                                    <div style={{ width: "50px", height: "50px", borderRadius: "14px", background: "white", color: rule.tone, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "20px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
                                        <Icon size={24} />
                                    </div>
                                    <h4 style={{ fontSize: "18px", color: "#1a2522", fontWeight: 800, marginBottom: "8px" }}>{rule.title}</h4>
                                    <p style={{ fontSize: "14px", color: "#4a5a55", lineHeight: 1.6 }}>{rule.desc}</p>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </section>

            {/* ── FORM PENGADUAN WARGA ── */}
            <section id="pengaduan" style={{ padding: "80px 24px", maxWidth: "700px", margin: "0 auto" }}>
                <div style={{ background: "white", padding: "40px", borderRadius: "30px", boxShadow: "0 20px 60px rgba(11, 143, 130, 0.08)" }}>
                    <div style={{ textAlign: "center", marginBottom: "30px" }}>
                        <div style={{ width: "60px", height: "60px", background: "#fdf3e8", color: "var(--amber)", borderRadius: "16px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                            <Send size={28} />
                        </div>
                        <h3 style={{ fontSize: "28px", fontWeight: 800, color: "#1a2522", fontFamily: "var(--font-display)", marginBottom: "8px" }}>Lapor Keluhan Warga</h3>
                        <p style={{ fontSize: "15px", color: "#62736d" }}>Sampaikan keluhan Anda seputar pelayanan kebersihan. Laporan akan langsung masuk ke meja pengelola.</p>
                    </div>

                    <form onSubmit={handleSubmitPengaduan} style={{ display: "grid", gap: "20px" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                            <div>
                                <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#4a5a55", marginBottom: "8px" }}>Nama Lengkap *</label>
                                <input 
                                    type="text" required value={nama} onChange={(e) => setNama(e.target.value)}
                                    placeholder="Contoh: Budi Santoso"
                                    style={{ width: "100%", padding: "14px 16px", borderRadius: "12px", border: "2px solid #eef2ef", fontSize: "14px", outline: "none", background: "#f8faf9" }}
                                />
                            </div>
                            <div>
                                <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#4a5a55", marginBottom: "8px" }}>No. HP / WhatsApp</label>
                                <input 
                                    type="text" value={kontak} onChange={(e) => setKontak(e.target.value)}
                                    placeholder="Opsional"
                                    style={{ width: "100%", padding: "14px 16px", borderRadius: "12px", border: "2px solid #eef2ef", fontSize: "14px", outline: "none", background: "#f8faf9" }}
                                />
                            </div>
                        </div>

                        <div>
                            <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#4a5a55", marginBottom: "8px" }}>Kategori Keluhan *</label>
                            <select 
                                value={kategori} onChange={(e) => setKategori(e.target.value)}
                                style={{ width: "100%", padding: "14px 16px", borderRadius: "12px", border: "2px solid #eef2ef", fontSize: "14px", outline: "none", background: "#f8faf9", cursor: "pointer" }}
                            >
                                <option value="Sampah Menumpuk">Sampah Menumpuk Belum Diambil</option>
                                <option value="Pelayanan Petugas">Kinerja / Sikap Petugas Lapangan</option>
                                <option value="Iuran/Tagihan">Masalah Iuran / Tagihan Bulanan</option>
                                <option value="Lainnya">Lainnya</option>
                            </select>
                        </div>

                        <div>
                            <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#4a5a55", marginBottom: "8px" }}>Deskripsi Keluhan *</label>
                            <textarea 
                                required value={deskripsi} onChange={(e) => setDeskripsi(e.target.value)}
                                placeholder="Jelaskan detail keluhan Anda (lokasi, waktu kejadian, dll)..."
                                style={{ width: "100%", padding: "14px 16px", borderRadius: "12px", border: "2px solid #eef2ef", fontSize: "14px", outline: "none", background: "#f8faf9", minHeight: "120px", resize: "vertical" }}
                            />
                        </div>

                        <button 
                            type="submit" 
                            disabled={loading}
                            style={{ 
                                width: "100%", padding: "16px", borderRadius: "12px", 
                                background: "var(--teal)", color: "white", fontSize: "15px", fontWeight: 700,
                                border: "none", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1,
                                display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                                marginTop: "10px", boxShadow: "0 10px 20px rgba(11, 143, 130, 0.2)"
                            }}
                        >
                            {loading ? "Mengirim..." : <><Send size={18} /> Kirim Keluhan Sekarang</>}
                        </button>
                    </form>
                </div>
            </section>

            {/* ── FOOTER ── */}
            <footer style={{ background: "#1a2522", padding: "60px 24px", color: "white", textAlign: "center" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", marginBottom: "20px" }}>
                    <Leaf size={24} color="var(--lime)" />
                    <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 800, fontFamily: "var(--font-display)", letterSpacing: "1px" }}>TPS3R DUKUN</h2>
                </div>
                <p style={{ color: "#8b9994", fontSize: "14px", maxWidth: "400px", margin: "0 auto 30px", lineHeight: 1.6 }}>
                    Dikelola penuh oleh BUMDes Dukun. Berkomitmen mewujudkan lingkungan yang bersih, hijau, dan sehat.
                </p>
                <div style={{ height: "1px", background: "rgba(255,255,255,0.1)", maxWidth: "800px", margin: "0 auto 30px" }}></div>
                <p style={{ color: "#62736d", fontSize: "13px" }}>© 2026 Pemerintahan Desa Dukun. All rights reserved.</p>
            </footer>

            {/* Global Styles Addition for hover effects */}
            <style jsx global>{`
                .hover-lift:hover {
                    transform: translateY(-5px);
                }
                html { scroll-behavior: smooth; }
            `}</style>
        </div>
    );
}
