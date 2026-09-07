"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Leaf, LogIn, Recycle, ShieldCheck, AlertCircle, Phone, Send, Info, CheckCircle2, Sparkles, Eye, X, PackageOpen, Loader2, Megaphone, Bell, Calendar, AlertTriangle } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browserClient";
import { showSuccessToast, showErrorToast } from "@/components/ui/Toast";

type DesaItem = {
    id: string;
    nama: string;
};

type PostinganItem = {
    id: string;
    desa_id: string;
    judul: string;
    deskripsi: string;
    gambar_url: string;
    status: string;
    created_at: string;
    desa?: { id: string; nama: string };
};

type PemberitahuanItem = {
    id: string;
    desa_id: string;
    judul: string;
    isi: string;
    kategori: "Operasional" | "Keuangan" | "Jadwal" | "Lainnya";
    tingkat_urgensi: "Biasa" | "Penting";
    status: "Aktif" | "Arsip";
    tanggal_mulai?: string | null;
    tanggal_selesai?: string | null;
    created_at: string;
    desa?: { id: string; nama: string };
};

export default function LandingPage() {
    const [nama, setNama] = useState("");
    const [kontak, setKontak] = useState("");
    const [kategori, setKategori] = useState("Sampah Menumpuk");
    const [deskripsi, setDeskripsi] = useState("");
    const [desaId, setDesaId] = useState("");
    const [desasList, setDesasList] = useState<DesaItem[]>([]);
    const [loading, setLoading] = useState(false);

    // Postingan produk state
    const [postinganList, setPostinganList] = useState<PostinganItem[]>([]);
    const [loadingPosts, setLoadingPosts] = useState(true);
    const [selectedDesaFilter, setSelectedDesaFilter] = useState("all");
    const [selectedPostDetail, setSelectedPostDetail] = useState<PostinganItem | null>(null);

    // Pemberitahuan state
    const [pemberitahuanList, setPemberitahuanList] = useState<PemberitahuanItem[]>([]);
    const [loadingPemberitahuan, setLoadingPemberitahuan] = useState(true);
    const [selectedDesaNoticeFilter, setSelectedDesaNoticeFilter] = useState("all");
    const [selectedNoticeDetail, setSelectedNoticeDetail] = useState<PemberitahuanItem | null>(null);

    useEffect(() => {
        const fetchDesa = async () => {
            try {
                const res = await fetch("/api/public-desa");
                const json = await res.json();
                if (json.ok && json.data) {
                    setDesasList(json.data);
                    if (json.data.length > 0) setDesaId(json.data[0].id);
                }
            } catch (err) {
                console.error("Gagal memuat daftar desa", err);
            }
        };

        const fetchPostingan = async () => {
            setLoadingPosts(true);
            try {
                const res = await fetch("/api/postingan?public=true");
                const json = await res.json();
                if (json.ok && json.data) {
                    setPostinganList(json.data);
                }
            } catch (err) {
                console.error("Gagal memuat postingan", err);
            } finally {
                setLoadingPosts(false);
            }
        };

        const fetchPemberitahuan = async () => {
            setLoadingPemberitahuan(true);
            try {
                const res = await fetch("/api/pemberitahuan?public=true");
                const json = await res.json();
                if (json.ok && json.data) {
                    setPemberitahuanList(json.data);
                }
            } catch (err) {
                console.error("Gagal memuat pemberitahuan", err);
            } finally {
                setLoadingPemberitahuan(false);
            }
        };

        fetchDesa();
        fetchPostingan();
        fetchPemberitahuan();
    }, []);

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
                status: "Diterima",
                desa_id: desaId || null
            }
        ]);

        setLoading(false);

        if (error) {
            showErrorToast("Gagal mengirim laporan. Pastikan tabel telah diupdate.");
            console.error(error);
        } else {
            showSuccessToast("Laporan berhasil dikirim! Terima kasih atas partisipasi Anda.");
            setNama("");
            setKontak("");
            setDeskripsi("");
            setKategori("Sampah Menumpuk");
        }
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
                    <Image src="/icon.png" alt="Logo TPS3R" width={38} height={38} style={{ objectFit: "contain" }} />
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
                    </div>
                    <h2 style={{ fontSize: "56px", fontWeight: 800, color: "#1a2522", fontFamily: "var(--font-display)", lineHeight: 1.1, marginBottom: "24px", letterSpacing: "-1.5px" }}>
                        Layanan Pengelolaan Sampah <br />
                        <span style={{ color: "var(--teal)" }}>Modern & Berkelanjutan</span>
                    </h2>
                    <p style={{ fontSize: "18px", color: "#4a5a55", lineHeight: 1.6, marginBottom: "40px", maxWidth: "600px", margin: "0 auto 40px" }}>
                        TPS3R Dukun hadir untuk mengatasi permasalahan sampah di wilayah kita melalui pendekatan Reduce, Reuse, dan Recycle.
                    </p>
                    <div style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
                        <a href="#pemberitahuan" className="hover-lift" style={{ 
                            backgroundColor: "#0284c7", color: "white", padding: "16px 32px", 
                            borderRadius: "100px", fontSize: "15px", fontWeight: 700, textDecoration: "none",
                            display: "flex", alignItems: "center", gap: "8px", boxShadow: "0 8px 24px rgba(2, 132, 199, 0.35)", border: "none"
                        }}>
                            <Megaphone size={18} /> Pengumuman TPS3R
                        </a>
                        <a href="#pengaduan" className="hover-lift" style={{ 
                            backgroundColor: "var(--amber)", color: "white", padding: "16px 32px", 
                            borderRadius: "100px", fontSize: "15px", fontWeight: 700, textDecoration: "none",
                            display: "flex", alignItems: "center", gap: "8px", boxShadow: "0 8px 24px rgba(242, 164, 93, 0.4)", border: "none"
                        }}>
                            <AlertCircle size={18} /> Lapor Keluhan Warga
                        </a>
                        <a href="#produk" className="hover-lift" style={{ 
                            backgroundColor: "var(--teal)", color: "white", padding: "16px 32px", 
                            borderRadius: "100px", fontSize: "15px", fontWeight: 700, textDecoration: "none",
                            display: "flex", alignItems: "center", gap: "8px", boxShadow: "0 8px 24px rgba(11, 143, 130, 0.3)", border: "none"
                        }}>
                            <Sparkles size={18} /> Produk Olahan TPS
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

            {/* ── PEMBERITAHUAN & PENGUMUMAN TPS3R ── */}
            <section id="pemberitahuan" style={{ padding: "80px 24px", background: "#ffffff", borderTop: "1px solid #eef2ef", borderBottom: "1px solid #eef2ef" }}>
                <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
                    <div style={{ textAlign: "center", marginBottom: "36px" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", backgroundColor: "rgba(2, 132, 199, 0.1)", color: "#0284c7", padding: "6px 16px", borderRadius: "100px", fontSize: "13px", fontWeight: 700, marginBottom: "16px" }}>
                            <Megaphone size={16} /> INFORMASI & PENGUMUMAN RESMI
                        </div>
                        <h3 style={{ fontSize: "36px", fontWeight: 800, color: "#1a2522", fontFamily: "var(--font-display)", marginBottom: "12px", letterSpacing: "-0.5px" }}>
                            Pemberitahuan Operasional TPS3R
                        </h3>
                        <p style={{ fontSize: "16px", color: "#62736d", maxWidth: "650px", margin: "0 auto" }}>
                            Informasi operasional terupdate, jadwal libur pengangkutan, pengumuman pemeliharaan, serta pengingat iuran bulanan untuk warga tiap desa.
                        </p>
                    </div>

                    {/* Filter Desa Tabs */}
                    <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap", marginBottom: "36px" }}>
                        <button
                            type="button"
                            onClick={() => setSelectedDesaNoticeFilter("all")}
                            style={{
                                padding: "10px 22px",
                                borderRadius: "100px",
                                fontSize: "14px",
                                fontWeight: 700,
                                cursor: "pointer",
                                border: selectedDesaNoticeFilter === "all" ? "none" : "1.5px solid #dce5e1",
                                background: selectedDesaNoticeFilter === "all" ? "#0284c7" : "white",
                                color: selectedDesaNoticeFilter === "all" ? "white" : "#4a5a55",
                                boxShadow: selectedDesaNoticeFilter === "all" ? "0 6px 18px rgba(2, 132, 199, 0.25)" : "none",
                                transition: "all 0.2s ease",
                            }}
                        >
                            Semua Desa ({pemberitahuanList.length})
                        </button>
                        {desasList.map((desa) => {
                            const count = pemberitahuanList.filter((p) => p.desa_id === desa.id).length;
                            const isActive = selectedDesaNoticeFilter === desa.id;
                            return (
                                <button
                                    key={desa.id}
                                    type="button"
                                    onClick={() => setSelectedDesaNoticeFilter(desa.id)}
                                    style={{
                                        padding: "10px 22px",
                                        borderRadius: "100px",
                                        fontSize: "14px",
                                        fontWeight: 700,
                                        cursor: "pointer",
                                        border: isActive ? "none" : "1.5px solid #dce5e1",
                                        background: isActive ? "#0284c7" : "white",
                                        color: isActive ? "white" : "#4a5a55",
                                        boxShadow: isActive ? "0 6px 18px rgba(2, 132, 199, 0.25)" : "none",
                                        transition: "all 0.2s ease",
                                    }}
                                >
                                    {desa.nama} ({count})
                                </button>
                            );
                        })}
                    </div>

                    {/* Content List */}
                    {loadingPemberitahuan ? (
                        <div style={{ textAlign: "center", padding: "60px 0", color: "#62736d" }}>
                            <Loader2 size={32} className="animate-spin" style={{ margin: "0 auto 12px", color: "#0284c7" }} />
                            <p style={{ margin: 0, fontSize: "14px" }}>Memuat pemberitahuan terkini...</p>
                        </div>
                    ) : (
                        (() => {
                            const filtered = selectedDesaNoticeFilter === "all"
                                ? pemberitahuanList
                                : pemberitahuanList.filter((p) => p.desa_id === selectedDesaNoticeFilter);

                            const urgentItems = filtered.filter((p) => p.tingkat_urgensi === "Penting");

                            if (filtered.length === 0) {
                                return (
                                    <div style={{ 
                                        background: "#f8faf9", padding: "50px 24px", borderRadius: "24px", 
                                        textAlign: "center", maxWidth: "560px", margin: "0 auto", 
                                        border: "1px dashed #dce5e1" 
                                    }}>
                                        <div style={{ width: "56px", height: "56px", borderRadius: "16px", background: "#e0f2fe", color: "#0284c7", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                                            <Bell size={28} />
                                        </div>
                                        <h4 style={{ fontSize: "18px", fontWeight: 700, color: "#1a2522", marginBottom: "8px" }}>
                                            Belum Ada Pemberitahuan
                                        </h4>
                                        <p style={{ fontSize: "14px", color: "#62736d", margin: 0, lineHeight: 1.6 }}>
                                            {selectedDesaNoticeFilter === "all"
                                                ? "Saat ini seluruh layanan operasional dan jadwal penjemputan sampah berjalan normal."
                                                : `Belum ada pengumuman khusus dari ${desasList.find((d) => d.id === selectedDesaNoticeFilter)?.nama || "desa ini"}. Seluruh layanan normal.`}
                                        </p>
                                    </div>
                                );
                            }

                            return (
                                <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
                                    {/* Urgent Banner if any */}
                                    {urgentItems.length > 0 && (
                                        <div style={{
                                            padding: "20px 24px",
                                            borderRadius: "20px",
                                            background: "linear-gradient(135deg, #fff1f2 0%, #fee2e2 100%)",
                                            border: "2px solid #fca5a5",
                                            display: "flex",
                                            alignItems: "flex-start",
                                            gap: "18px",
                                            boxShadow: "0 10px 25px rgba(239, 68, 68, 0.12)"
                                        }}>
                                            <div style={{
                                                width: "44px", height: "44px", borderRadius: "12px",
                                                background: "#dc2626", color: "white",
                                                display: "flex", alignItems: "center", justifyContent: "center",
                                                flexShrink: 0, marginTop: "2px"
                                            }}>
                                                <AlertTriangle size={22} />
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: "6px" }}>
                                                    <span style={{ fontSize: "11px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "1px", color: "#b91c1c", background: "#fecaca", padding: "3px 10px", borderRadius: "100px" }}>
                                                        Perhatian Mendesak
                                                    </span>
                                                    <span style={{ fontSize: "12px", fontWeight: 700, color: "#7f1d1d" }}>
                                                        {urgentItems[0].desa?.nama || "Wilayah TPS3R"}
                                                    </span>
                                                </div>
                                                <h4 style={{ margin: "0 0 6px 0", fontSize: "18px", fontWeight: 800, color: "#991b1b" }}>
                                                    {urgentItems[0].judul}
                                                </h4>
                                                <p style={{ margin: "0 0 12px 0", fontSize: "14px", color: "#7f1d1d", lineHeight: 1.6, whiteSpace: "pre-line", maxHeight: "80px", overflow: "hidden" }}>
                                                    {urgentItems[0].isi}
                                                </p>
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedNoticeDetail(urgentItems[0])}
                                                    style={{
                                                        background: "#dc2626", color: "white", border: "none",
                                                        padding: "8px 20px", borderRadius: "100px", fontSize: "13px",
                                                        fontWeight: 700, cursor: "pointer", display: "inline-flex",
                                                        alignItems: "center", gap: "6px"
                                                    }}
                                                >
                                                    <Eye size={14} /> Baca Pengumuman Lengkap
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Notice Cards Grid */}
                                    <div style={{
                                        display: "grid",
                                        gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                                        gap: "24px"
                                    }}>
                                        {filtered.map((notice) => {
                                            const isUrgent = notice.tingkat_urgensi === "Penting";
                                            const kategoriBg = 
                                                notice.kategori === "Operasional" ? "#e0f2fe" :
                                                notice.kategori === "Keuangan" ? "#fef3c7" :
                                                notice.kategori === "Jadwal" ? "#dcfce7" : "#f1f5f9";
                                            const kategoriColor = 
                                                notice.kategori === "Operasional" ? "#0369a1" :
                                                notice.kategori === "Keuangan" ? "#b45309" :
                                                notice.kategori === "Jadwal" ? "#15803d" : "#475569";

                                            return (
                                                <div
                                                    key={notice.id}
                                                    className="hover-lift"
                                                    style={{
                                                        background: "white",
                                                        borderRadius: "20px",
                                                        padding: "24px",
                                                        display: "flex",
                                                        flexDirection: "column",
                                                        boxShadow: "0 10px 30px rgba(0,0,0,0.04)",
                                                        border: isUrgent ? "1.5px solid #fca5a5" : "1px solid #eef2ef",
                                                        position: "relative",
                                                        overflow: "hidden",
                                                        transition: "transform 0.25s, box-shadow 0.25s"
                                                    }}
                                                >
                                                    {isUrgent && (
                                                        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "4px", background: "#ef4444" }} />
                                                    )}

                                                    {/* Header Badges */}
                                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", marginBottom: "14px", flexWrap: "wrap" }}>
                                                        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                                                            <span style={{ 
                                                                background: "#e6f0ed", color: "var(--teal)", 
                                                                padding: "4px 10px", borderRadius: "100px", 
                                                                fontSize: "11px", fontWeight: 700 
                                                            }}>
                                                                {notice.desa?.nama || "Semua Desa"}
                                                            </span>
                                                            <span style={{ 
                                                                background: kategoriBg, color: kategoriColor, 
                                                                padding: "4px 10px", borderRadius: "100px", 
                                                                fontSize: "11px", fontWeight: 700 
                                                            }}>
                                                                {notice.kategori}
                                                            </span>
                                                        </div>
                                                        {isUrgent && (
                                                            <span style={{ 
                                                                background: "#fee2e2", color: "#dc2626", 
                                                                padding: "4px 10px", borderRadius: "100px", 
                                                                fontSize: "11px", fontWeight: 800,
                                                                display: "inline-flex", alignItems: "center", gap: "4px"
                                                            }}>
                                                                <AlertTriangle size={12} /> Penting
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Title */}
                                                    <h4 style={{ 
                                                        margin: "0 0 10px 0", fontSize: "17px", fontWeight: 800, 
                                                        color: "#1a2522", lineHeight: 1.35 
                                                    }}>
                                                        {notice.judul}
                                                    </h4>

                                                    {/* Dates Range */}
                                                    {(notice.tanggal_mulai || notice.tanggal_selesai) && (
                                                        <div style={{ 
                                                            display: "flex", alignItems: "center", gap: "6px", 
                                                            fontSize: "12px", color: "#62736d", marginBottom: "12px",
                                                            background: "#f8faf9", padding: "6px 10px", borderRadius: "8px" 
                                                        }}>
                                                            <Calendar size={13} style={{ color: "#0284c7", flexShrink: 0 }} />
                                                            <span>
                                                                {notice.tanggal_mulai && notice.tanggal_selesai
                                                                    ? `${new Date(notice.tanggal_mulai).toLocaleDateString("id-ID")} s.d. ${new Date(notice.tanggal_selesai).toLocaleDateString("id-ID")}`
                                                                    : notice.tanggal_mulai
                                                                        ? `Mulai ${new Date(notice.tanggal_mulai).toLocaleDateString("id-ID")}`
                                                                        : `Hingga ${new Date(notice.tanggal_selesai!).toLocaleDateString("id-ID")}`}
                                                            </span>
                                                        </div>
                                                    )}

                                                    {/* Content snippet */}
                                                    <p style={{ 
                                                        margin: "0 0 20px 0", fontSize: "14px", color: "#4a5a55", 
                                                        lineHeight: 1.6, flex: 1,
                                                        display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden"
                                                    }}>
                                                        {notice.isi}
                                                    </p>

                                                    {/* Button */}
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedNoticeDetail(notice)}
                                                        style={{
                                                            width: "100%",
                                                            padding: "11px 16px",
                                                            borderRadius: "10px",
                                                            background: isUrgent ? "#fff1f2" : "#f0f7f5",
                                                            border: isUrgent ? "1px solid #fecaca" : "1px solid #dce5e1",
                                                            color: isUrgent ? "#dc2626" : "var(--teal)",
                                                            fontSize: "13px",
                                                            fontWeight: 700,
                                                            cursor: "pointer",
                                                            display: "flex",
                                                            alignItems: "center",
                                                            justifyContent: "center",
                                                            gap: "8px",
                                                            transition: "background 0.2s"
                                                        }}
                                                    >
                                                        <Eye size={15} /> Baca Selengkapnya
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })()
                    )}
                </div>
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

            {/* ── PRODUK & INOVASI OLAHAN TPS3R ── */}
            <section id="produk" style={{ padding: "90px 24px", background: "linear-gradient(180deg, #f8faf9 0%, #edf5f2 50%, #f8faf9 100%)", borderTop: "1px solid #eef2ef" }}>
                <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
                    <div style={{ textAlign: "center", marginBottom: "40px" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", backgroundColor: "rgba(11, 143, 130, 0.1)", color: "var(--teal)", padding: "6px 16px", borderRadius: "100px", fontSize: "13px", fontWeight: 700, marginBottom: "16px" }}>
                            <Sparkles size={16} /> PRODUK & INOVASI DESA
                        </div>
                        <h3 style={{ fontSize: "36px", fontWeight: 800, color: "#1a2522", fontFamily: "var(--font-display)", marginBottom: "12px", letterSpacing: "-0.5px" }}>
                            Hasil Olahan TPS3R
                        </h3>
                        <p style={{ fontSize: "16px", color: "#62736d", maxWidth: "620px", margin: "0 auto" }}>
                            Mengenal aneka hasil pengolahan sampah organik dan inovasi daur ulang bernilai guna dari setiap unit TPS3R desa.
                        </p>
                    </div>

                    {/* Filter Desa Tabs */}
                    <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap", marginBottom: "40px" }}>
                        <button
                            type="button"
                            onClick={() => setSelectedDesaFilter("all")}
                            style={{
                                padding: "10px 22px",
                                borderRadius: "100px",
                                fontSize: "14px",
                                fontWeight: 700,
                                cursor: "pointer",
                                border: selectedDesaFilter === "all" ? "none" : "1.5px solid #dce5e1",
                                background: selectedDesaFilter === "all" ? "var(--teal)" : "white",
                                color: selectedDesaFilter === "all" ? "white" : "#4a5a55",
                                boxShadow: selectedDesaFilter === "all" ? "0 6px 18px rgba(11, 143, 130, 0.25)" : "none",
                                transition: "all 0.2s ease",
                            }}
                        >
                            Semua Desa ({postinganList.length})
                        </button>
                        {desasList.map((desa) => {
                            const count = postinganList.filter((p) => p.desa_id === desa.id).length;
                            const isActive = selectedDesaFilter === desa.id;
                            return (
                                <button
                                    key={desa.id}
                                    type="button"
                                    onClick={() => setSelectedDesaFilter(desa.id)}
                                    style={{
                                        padding: "10px 22px",
                                        borderRadius: "100px",
                                        fontSize: "14px",
                                        fontWeight: 700,
                                        cursor: "pointer",
                                        border: isActive ? "none" : "1.5px solid #dce5e1",
                                        background: isActive ? "var(--teal)" : "white",
                                        color: isActive ? "white" : "#4a5a55",
                                        boxShadow: isActive ? "0 6px 18px rgba(11, 143, 130, 0.25)" : "none",
                                        transition: "all 0.2s ease",
                                    }}
                                >
                                    {desa.nama} ({count})
                                </button>
                            );
                        })}
                    </div>

                    {/* Postings Grid */}
                    {loadingPosts ? (
                        <div style={{ textAlign: "center", padding: "60px 0", color: "#62736d" }}>
                            <Loader2 size={32} className="animate-spin" style={{ margin: "0 auto 12px", color: "var(--teal)" }} />
                            <p style={{ margin: 0, fontSize: "14px" }}>Memuat informasi produk olahan TPS3R...</p>
                        </div>
                    ) : (
                        (() => {
                            const filtered = selectedDesaFilter === "all"
                                ? postinganList
                                : postinganList.filter((p) => p.desa_id === selectedDesaFilter);

                            if (filtered.length === 0) {
                                return (
                                    <div style={{ 
                                        background: "white", padding: "50px 24px", borderRadius: "24px", 
                                        textAlign: "center", maxWidth: "540px", margin: "0 auto", 
                                        border: "1px dashed #dce5e1" 
                                    }}>
                                        <div style={{ width: "56px", height: "56px", borderRadius: "16px", background: "#f0fdf4", color: "var(--teal)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                                            <PackageOpen size={28} />
                                        </div>
                                        <h4 style={{ fontSize: "18px", fontWeight: 700, color: "#1a2522", marginBottom: "8px" }}>
                                            Belum Ada Postingan Produk
                                        </h4>
                                        <p style={{ fontSize: "14px", color: "#62736d", margin: 0, lineHeight: 1.6 }}>
                                            {selectedDesaFilter === "all"
                                                ? "Saat ini belum ada informasi produk olahan sampah yang dipublikasikan."
                                                : `Belum ada informasi produk olahan sampah dari ${desasList.find((d) => d.id === selectedDesaFilter)?.nama || "desa ini"}.`}
                                        </p>
                                    </div>
                                );
                            }

                            return (
                                <div style={{ 
                                    display: "grid", 
                                    gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", 
                                    gap: "28px" 
                                }}>
                                    {filtered.map((post) => (
                                        <div 
                                            key={post.id} 
                                            className="hover-lift"
                                            style={{ 
                                                background: "white", 
                                                borderRadius: "20px", 
                                                overflow: "hidden", 
                                                boxShadow: "0 10px 30px rgba(0,0,0,0.03)", 
                                                border: "1px solid #eef2ef",
                                                display: "flex", 
                                                flexDirection: "column",
                                                transition: "transform 0.25s, box-shadow 0.25s"
                                            }}
                                        >
                                            {/* Image */}
                                            <div style={{ position: "relative", width: "100%", height: "220px", background: "#eef2ef" }}>
                                                <Image 
                                                    src={post.gambar_url} 
                                                    alt={post.judul} 
                                                    fill 
                                                    style={{ objectFit: "cover" }} 
                                                    sizes="(max-width: 768px) 100vw, 360px"
                                                    unoptimized
                                                />
                                                {/* Origin Desa Badge */}
                                                <div style={{ 
                                                    position: "absolute", top: "14px", left: "14px", 
                                                    background: "rgba(11, 143, 130, 0.92)", backdropFilter: "blur(6px)",
                                                    color: "white", padding: "5px 12px", borderRadius: "100px", 
                                                    fontSize: "11px", fontWeight: 700, letterSpacing: "0.5px"
                                                }}>
                                                    {post.desa?.nama || "Desa"}
                                                </div>
                                            </div>

                                            {/* Card Body */}
                                            <div style={{ padding: "22px", display: "flex", flexDirection: "column", flex: 1 }}>
                                                <h4 style={{ 
                                                    margin: "0 0 10px 0", fontSize: "18px", fontWeight: 800, 
                                                    color: "#1a2522", lineHeight: 1.3 
                                                }}>
                                                    {post.judul}
                                                </h4>
                                                <p style={{ 
                                                    margin: "0 0 20px 0", fontSize: "14px", color: "#62736d", 
                                                    lineHeight: 1.6, flex: 1,
                                                    display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden"
                                                }}>
                                                    {post.deskripsi}
                                                </p>

                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedPostDetail(post)}
                                                    style={{
                                                        width: "100%",
                                                        padding: "11px 16px",
                                                        borderRadius: "10px",
                                                        background: "#f4f7f4",
                                                        border: "1px solid #dce5e1",
                                                        color: "var(--teal)",
                                                        fontSize: "13px",
                                                        fontWeight: 700,
                                                        cursor: "pointer",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        gap: "8px",
                                                        transition: "background 0.2s"
                                                    }}
                                                >
                                                    <Eye size={15} /> Lihat Informasi Lengkap
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            );
                        })()
                    )}
                </div>
            </section>

            {/* ── PERATURAN & TATA TERTIB ── */}
            <section id="peraturan" style={{ padding: "80px 24px", background: "white", borderTop: "1px solid #eef2ef", borderBottom: "1px solid #eef2ef" }}>
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
                            <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#4a5a55", marginBottom: "8px" }}>Tujuan Desa *</label>
                            <select 
                                required value={desaId} onChange={(e) => setDesaId(e.target.value)}
                                style={{ width: "100%", padding: "14px 16px", borderRadius: "12px", border: "2px solid #eef2ef", fontSize: "14px", outline: "none", background: "#f8faf9", cursor: "pointer", marginBottom: "20px" }}
                            >
                                {desasList.map(d => (
                                    <option key={d.id} value={d.id}>{d.nama}</option>
                                ))}
                            </select>
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

            {/* ── MODAL DETAIL POSTINGAN PRODUK ── */}
            {selectedPostDetail && (
                <div
                    style={{
                        position: "fixed",
                        inset: 0,
                        zIndex: 100,
                        background: "rgba(0,0,0,0.55)",
                        backdropFilter: "blur(6px)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "20px",
                    }}
                    onClick={() => setSelectedPostDetail(null)}
                >
                    <div
                        style={{
                            background: "white",
                            borderRadius: "24px",
                            maxWidth: "620px",
                            width: "100%",
                            overflow: "hidden",
                            boxShadow: "0 25px 50px rgba(0,0,0,0.25)",
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ position: "relative", width: "100%", height: "280px", background: "#1a2522" }}>
                            <Image
                                src={selectedPostDetail.gambar_url}
                                alt={selectedPostDetail.judul}
                                fill
                                style={{ objectFit: "cover" }}
                                unoptimized
                            />
                            <button
                                type="button"
                                onClick={() => setSelectedPostDetail(null)}
                                style={{
                                    position: "absolute",
                                    top: "16px",
                                    right: "16px",
                                    background: "rgba(0,0,0,0.6)",
                                    color: "white",
                                    border: "none",
                                    borderRadius: "50%",
                                    width: "36px",
                                    height: "36px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    cursor: "pointer",
                                }}
                                aria-label="Tutup detail"
                            >
                                <X size={20} />
                            </button>
                            <div
                                style={{
                                    position: "absolute",
                                    bottom: "16px",
                                    left: "16px",
                                    background: "rgba(11, 143, 130, 0.95)",
                                    color: "white",
                                    padding: "6px 16px",
                                    borderRadius: "100px",
                                    fontSize: "12px",
                                    fontWeight: 700,
                                }}
                            >
                                {selectedPostDetail.desa?.nama || "Desa"}
                            </div>
                        </div>

                        <div style={{ padding: "28px" }}>
                            <div style={{ fontSize: "12px", color: "#8b9994", marginBottom: "8px", fontWeight: 600 }}>
                                Dipublikasikan pada{" "}
                                {new Date(selectedPostDetail.created_at).toLocaleDateString("id-ID", {
                                    dateStyle: "long",
                                })}
                            </div>
                            <h3
                                style={{
                                    margin: "0 0 16px 0",
                                    fontSize: "22px",
                                    fontWeight: 800,
                                    color: "#1a2522",
                                    lineHeight: 1.3,
                                }}
                            >
                                {selectedPostDetail.judul}
                            </h3>
                            <div
                                style={{
                                    fontSize: "15px",
                                    color: "#4a5a55",
                                    lineHeight: 1.7,
                                    whiteSpace: "pre-line",
                                    maxHeight: "260px",
                                    overflowY: "auto",
                                    paddingRight: "8px",
                                }}
                            >
                                {selectedPostDetail.deskripsi}
                            </div>
                            <div style={{ marginTop: "24px", display: "flex", justifyContent: "flex-end" }}>
                                <button
                                    type="button"
                                    onClick={() => setSelectedPostDetail(null)}
                                    style={{
                                        padding: "12px 26px",
                                        borderRadius: "100px",
                                        background: "var(--teal)",
                                        color: "white",
                                        border: "none",
                                        fontWeight: 700,
                                        fontSize: "14px",
                                        cursor: "pointer",
                                    }}
                                >
                                    Tutup Informasi
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── MODAL DETAIL PEMBERITAHUAN ── */}
            {selectedNoticeDetail && (
                <div
                    style={{
                        position: "fixed",
                        inset: 0,
                        zIndex: 100,
                        background: "rgba(0,0,0,0.55)",
                        backdropFilter: "blur(6px)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "20px",
                    }}
                    onClick={() => setSelectedNoticeDetail(null)}
                >
                    <div
                        style={{
                            background: "white",
                            borderRadius: "24px",
                            maxWidth: "600px",
                            width: "100%",
                            padding: "32px",
                            boxShadow: "0 25px 50px rgba(0,0,0,0.25)",
                            position: "relative",
                            border: selectedNoticeDetail.tingkat_urgensi === "Penting" ? "2px solid #fca5a5" : "none"
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            type="button"
                            onClick={() => setSelectedNoticeDetail(null)}
                            style={{
                                position: "absolute",
                                top: "20px",
                                right: "20px",
                                background: "#f1f5f9",
                                color: "#64748b",
                                border: "none",
                                borderRadius: "50%",
                                width: "36px",
                                height: "36px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer",
                            }}
                            aria-label="Tutup detail"
                        >
                            <X size={20} />
                        </button>

                        {/* Top Badges */}
                        <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", paddingRight: "40px" }}>
                            <span style={{ 
                                background: "#e6f0ed", color: "var(--teal)", 
                                padding: "4px 12px", borderRadius: "100px", 
                                fontSize: "12px", fontWeight: 700 
                            }}>
                                {selectedNoticeDetail.desa?.nama || "Semua Desa"}
                            </span>
                            <span style={{ 
                                background: selectedNoticeDetail.kategori === "Operasional" ? "#e0f2fe" :
                                    selectedNoticeDetail.kategori === "Keuangan" ? "#fef3c7" :
                                    selectedNoticeDetail.kategori === "Jadwal" ? "#dcfce7" : "#f1f5f9",
                                color: selectedNoticeDetail.kategori === "Operasional" ? "#0369a1" :
                                    selectedNoticeDetail.kategori === "Keuangan" ? "#b45309" :
                                    selectedNoticeDetail.kategori === "Jadwal" ? "#15803d" : "#475569",
                                padding: "4px 12px", borderRadius: "100px", 
                                fontSize: "12px", fontWeight: 700 
                            }}>
                                {selectedNoticeDetail.kategori}
                            </span>
                            {selectedNoticeDetail.tingkat_urgensi === "Penting" && (
                                <span style={{ 
                                    background: "#fee2e2", color: "#dc2626", 
                                    padding: "4px 12px", borderRadius: "100px", 
                                    fontSize: "12px", fontWeight: 800,
                                    display: "inline-flex", alignItems: "center", gap: "4px"
                                }}>
                                    <AlertTriangle size={13} /> Perhatian Penting
                                </span>
                            )}
                        </div>

                        {/* Judul */}
                        <h3 style={{ margin: "0 0 12px 0", fontSize: "22px", fontWeight: 800, color: "#1a2522", lineHeight: 1.35 }}>
                            {selectedNoticeDetail.judul}
                        </h3>

                        {/* Date info */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginBottom: "20px", fontSize: "13px", color: "#62736d" }}>
                            <div>
                                Dipublikasikan: {new Date(selectedNoticeDetail.created_at).toLocaleDateString("id-ID", { dateStyle: "long" })}
                            </div>
                            {(selectedNoticeDetail.tanggal_mulai || selectedNoticeDetail.tanggal_selesai) && (
                                <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#0284c7", fontWeight: 600 }}>
                                    <Calendar size={14} />
                                    <span>
                                        Masa Berlaku:{" "}
                                        {selectedNoticeDetail.tanggal_mulai && selectedNoticeDetail.tanggal_selesai
                                            ? `${new Date(selectedNoticeDetail.tanggal_mulai).toLocaleDateString("id-ID")} s.d. ${new Date(selectedNoticeDetail.tanggal_selesai).toLocaleDateString("id-ID")}`
                                            : selectedNoticeDetail.tanggal_mulai
                                                ? `Mulai ${new Date(selectedNoticeDetail.tanggal_mulai).toLocaleDateString("id-ID")}`
                                                : `Hingga ${new Date(selectedNoticeDetail.tanggal_selesai!).toLocaleDateString("id-ID")}`}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Content text */}
                        <div style={{
                            background: "#f8faf9",
                            border: "1px solid #eef2ef",
                            borderRadius: "16px",
                            padding: "20px",
                            fontSize: "15px",
                            color: "#334155",
                            lineHeight: 1.75,
                            whiteSpace: "pre-line",
                            maxHeight: "340px",
                            overflowY: "auto"
                        }}>
                            {selectedNoticeDetail.isi}
                        </div>

                        <div style={{ marginTop: "24px", display: "flex", justifyContent: "flex-end" }}>
                            <button
                                type="button"
                                onClick={() => setSelectedNoticeDetail(null)}
                                style={{
                                    padding: "12px 28px",
                                    borderRadius: "100px",
                                    background: selectedNoticeDetail.tingkat_urgensi === "Penting" ? "#dc2626" : "var(--teal)",
                                    color: "white",
                                    border: "none",
                                    fontWeight: 700,
                                    fontSize: "14px",
                                    cursor: "pointer",
                                }}
                            >
                                Tutup Pengumuman
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── FOOTER ── */}
            <footer style={{ background: "#1a2522", padding: "40px 24px", color: "white", textAlign: "center" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", marginBottom: "16px" }}>
                    <Image src="/icon.png" alt="Logo TPS3R" width={32} height={32} style={{ objectFit: "contain" }} />
                    <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 800, fontFamily: "var(--font-display)", letterSpacing: "1px" }}>TPS3R DUKUN</h2>
                </div>
                <p style={{ color: "#8b9994", fontSize: "14px", maxWidth: "450px", margin: "0 auto", lineHeight: 1.6 }}>
                    Dikelola penuh oleh BUMDes Dukun. Berkomitmen mewujudkan lingkungan yang bersih, hijau, dan sehat.
                </p>
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
