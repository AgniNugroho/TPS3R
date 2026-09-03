"use client";

import { useState } from "react";
import Link from "next/link";
import {
    AlertCircle,
    CheckCircle2,
    Leaf,
    LogIn,
    Recycle,
    Send,
} from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browserClient";
import toast from "react-hot-toast";

export default function LandingPage() {
    const [nama, setNama] = useState("");
    const [kontak, setKontak] = useState("");
    const [kategori, setKategori] = useState("Sampah Menumpuk");
    const [deskripsi, setDeskripsi] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmitPengaduan(event: React.FormEvent) {
        event.preventDefault();
        setLoading(true);
        const { error } = await getSupabaseBrowserClient()
            .from("pengaduan")
            .insert([
                {
                    nama_pelapor: nama,
                    kontak_pelapor: kontak || "-",
                    kategori,
                    deskripsi,
                    status: "Diterima",
                },
            ]);
        setLoading(false);

        if (error) {
            console.error(error);
            toast.error("Gagal mengirim laporan. Coba lagi.");
            return;
        }

        toast.success("Laporan berhasil dikirim. Terima kasih.");
        setNama("");
        setKontak("");
        setDeskripsi("");
        setKategori("Sampah Menumpuk");
    }

    return (
        <main className="public-page">
            <nav className="public-nav">
                <Link href="/" className="brand">
                    <Leaf size={22} /> TPS3R Dukun
                </Link>
                <Link href="/login" className="login-link">
                    <LogIn size={16} /> Login Petugas
                </Link>
            </nav>
            <section className="public-hero">
                <p className="public-kicker">
                    <Recycle size={16} /> Desa Bersih, Warga Sehat
                </p>
                <h1>Kelola sampah dengan lebih baik.</h1>
                <p>
                    TPS3R Dukun membantu warga mengurangi, menggunakan kembali,
                    dan mengolah sampah secara bertanggung jawab.
                </p>
                <a href="#pengaduan" className="report-link">
                    <AlertCircle size={18} /> Lapor Keluhan Warga
                </a>
            </section>
            <section className="public-content" aria-labelledby="tentang">
                <div>
                    <p className="section-label">Tentang TPS3R</p>
                    <h2 id="tentang">
                        Dari rumah, untuk lingkungan yang lebih sehat.
                    </h2>
                    <p>
                        Sampah organik diolah menjadi pakan ternak dan kompos,
                        material anorganik disalurkan ke pengepul, dan residu
                        ditangani secara terukur.
                    </p>
                </div>
                <div className="principles">
                    {[
                        ["Reduce", "Kurangi penggunaan barang sekali pakai."],
                        [
                            "Reuse",
                            "Gunakan kembali barang yang masih bermanfaat.",
                        ],
                        [
                            "Recycle",
                            "Pilah material agar dapat diolah kembali.",
                        ],
                    ].map(([title, description]) => (
                        <article key={title}>
                            <CheckCircle2 size={20} />
                            <div>
                                <strong>{title}</strong>
                                <p>{description}</p>
                            </div>
                        </article>
                    ))}
                </div>
            </section>
            <section id="pengaduan" className="complaint-section">
                <div>
                    <p className="section-label">Pengaduan Warga</p>
                    <h2>Sampaikan keluhan pelayanan.</h2>
                    <p>Laporan Anda akan diteruskan kepada pengelola TPS3R.</p>
                </div>
                <form onSubmit={handleSubmitPengaduan}>
                    <label>
                        Nama lengkap
                        <input
                            required
                            value={nama}
                            onChange={(event) => setNama(event.target.value)}
                        />
                    </label>
                    <label>
                        Nomor HP / WhatsApp
                        <input
                            value={kontak}
                            onChange={(event) => setKontak(event.target.value)}
                        />
                    </label>
                    <label>
                        Kategori
                        <select
                            value={kategori}
                            onChange={(event) =>
                                setKategori(event.target.value)
                            }
                        >
                            <option>Sampah Menumpuk</option>
                            <option>Pelayanan Petugas</option>
                            <option>Iuran/Tagihan</option>
                            <option>Lainnya</option>
                        </select>
                    </label>
                    <label>
                        Deskripsi keluhan
                        <textarea
                            required
                            value={deskripsi}
                            onChange={(event) =>
                                setDeskripsi(event.target.value)
                            }
                        />
                    </label>
                    <button type="submit" disabled={loading}>
                        {loading ? (
                            "Mengirim..."
                        ) : (
                            <>
                                <Send size={18} /> Kirim Keluhan
                            </>
                        )}
                    </button>
                </form>
            </section>
            <footer>TPS3R Dukun, BUMDes Bersama</footer>
        </main>
    );
}
