"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Leaf, LogIn, Recycle, ShieldCheck, AlertCircle, Phone, Send, Info, CheckCircle2 } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browserClient";
import { showSuccessToast, showErrorToast } from "@/components/ui/Toast";

export default function LandingPage() {
    const [nama, setNama] = useState("");
    const [kontak, setKontak] = useState("");
    const [kategori, setKategori] = useState("Sampah Menumpuk");
    const [deskripsi, setDeskripsi] = useState("");
    const [desaId, setDesaId] = useState("");
    const [desasList, setDesasList] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

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
        fetchDesa();
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
