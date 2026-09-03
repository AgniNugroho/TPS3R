"use client";

import { useState } from "react";
import FormShell from "@/components/dashboard/FormShell";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { FileDown, Calendar, Download } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/components/providers/AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LaporanPage() {
  const { role } = useAuth();
  const router = useRouter();
  
  const [bulan, setBulan] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    if (role === "pengelola_sampah") {
      router.replace("/pengumpulan");
    }
  }, [role, router]);

  function downloadCSV(csvContent: string, filename: string) {
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  async function exportPengumpulan() {
    setDownloading("pengumpulan");
    const supabase = getSupabaseBrowserClient();
    const [year, month] = bulan.split("-");
    const startDate = `${year}-${month}-01`;
    const endDate = new Date(Number(year), Number(month), 0).toISOString().split('T')[0];

    const { data, error } = await supabase
      .from("pengumpulan")
      .select(`tanggal, berat_kotor_kg, members(nama, kategori)`)
      .gte("tanggal", startDate)
      .lte("tanggal", endDate)
      .order("tanggal", { ascending: true });

    if (error || !data) {
      toast.error("Gagal mengunduh data pengumpulan.");
      setDownloading(null);
      return;
    }

    if (data.length === 0) {
      toast.error(`Tidak ada data pengumpulan di bulan ${bulan}`);
      setDownloading(null);
      return;
    }

    let csv = "Tanggal,Nama Member,Kategori,Berat Kotor (Kg)\n";
    data.forEach((row: any) => {
      csv += `"${row.tanggal}","${row.members?.nama}","${row.members?.kategori}","${row.berat_kotor_kg}"\n`;
    });

    downloadCSV(csv, `Laporan_Pengumpulan_${bulan}.csv`);
    setDownloading(null);
    toast.success("Berhasil diunduh!");
  }

  async function exportPemilahan() {
    setDownloading("pemilahan");
    const supabase = getSupabaseBrowserClient();
    const [year, month] = bulan.split("-");
    const startDate = `${year}-${month}-01`;
    const endDate = new Date(Number(year), Number(month), 0).toISOString().split('T')[0];

    const { data, error } = await supabase
      .from("pemilahan")
      .select("*")
      .gte("tanggal", startDate)
      .lte("tanggal", endDate)
      .order("tanggal", { ascending: true });

    if (error || !data) {
      toast.error("Gagal mengunduh data pemilahan.");
      setDownloading(null);
      return;
    }

    if (data.length === 0) {
      toast.error(`Tidak ada data pemilahan di bulan ${bulan}`);
      setDownloading(null);
      return;
    }

    let csv = "Tanggal,Organik (Kg),Plastik (Kg),Kardus (Kg),Kaca (Kg),Besi (Kg),Residu Bakar (Kg),Abu Residu (Kg),Catatan Medis\n";
    data.forEach((row: any) => {
      csv += `"${row.tanggal}","${row.organik_maggot_kg}","${row.plastik_jual_kg}","${row.kardus_jual_kg}","${row.kaca_jual_kg}","${row.besi_jual_kg}","${row.residu_insinerator_kg}","${row.abu_residu_kg}","${row.catatan_medis_ditolak || '-'}"\n`;
    });

    downloadCSV(csv, `Laporan_Pemilahan_${bulan}.csv`);
    setDownloading(null);
    toast.success("Berhasil diunduh!");
  }

  async function exportIuran() {
    setDownloading("iuran");
    const supabase = getSupabaseBrowserClient();
    // Iuran uses bulan_tahun like "Agustus 2026"
    // Let's just fetch all and let the user filter in Excel, or we fetch all for now
    const { data, error } = await supabase
      .from("pembayaran")
      .select(`bulan_tahun, nominal, metode, status, members(nama, kategori)`)
      .order("created_at", { ascending: false });

    if (error || !data) {
      toast.error("Gagal mengunduh data iuran.");
      setDownloading(null);
      return;
    }

    if (data.length === 0) {
      toast.error(`Tidak ada data pembayaran.`);
      setDownloading(null);
      return;
    }

    let csv = "Bulan Tagihan,Nama Member,Kategori,Nominal (Rp),Metode,Status\n";
    data.forEach((row: any) => {
      csv += `"${row.bulan_tahun}","${row.members?.nama}","${row.members?.kategori}","${row.nominal}","${row.metode}","${row.status}"\n`;
    });

    downloadCSV(csv, `Laporan_Pembayaran_Iuran.csv`);
    setDownloading(null);
    toast.success("Berhasil diunduh!");
  }

  return (
    <FormShell title="Cetak Laporan" activeLabel="Laporan">
      <main className="content-wrap">
        <div className="page-heading">
          <div>
            <p className="eyebrow"><span className="live-dot" /> PELAPORAN</p>
            <h1>Cetak Laporan</h1>
            <p className="heading-copy">Unduh data operasional dan keuangan BUMDes dalam format Excel (CSV).</p>
          </div>
        </div>

        <div className="panel" style={{ maxWidth: "600px" }}>
          <div style={{ marginBottom: "24px", paddingBottom: "24px", borderBottom: "1px solid var(--line)" }}>
            <label style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "12px", fontWeight: 700, color: "#4a5a55" }}>
              Pilih Bulan Laporan (Untuk Pengumpulan & Pemilahan)
              <div style={{ position: "relative", width: "fit-content" }}>
                <Calendar size={16} color="#a0aaa6" style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)" }} />
                <input 
                  type="month" 
                  value={bulan}
                  onChange={(e) => setBulan(e.target.value)}
                  style={{ padding: "10px 14px 10px 40px", borderRadius: "8px", border: "1px solid var(--line)", fontSize: "13px", outline: "none" }}
                />
              </div>
            </label>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px", background: "#f8faf9", borderRadius: "12px", border: "1px solid #eef2ef" }}>
              <div>
                <h3 style={{ fontSize: "14px", fontWeight: 700, color: "var(--teal)", marginBottom: "4px" }}>Laporan Pengumpulan Sampah</h3>
                <p style={{ fontSize: "11px", color: "#71807b" }}>Total berat kotor dari warga.</p>
              </div>
              <button onClick={exportPengumpulan} disabled={downloading !== null} className="primary-button" style={{ fontSize: "12px", padding: "10px 16px" }}>
                {downloading === "pengumpulan" ? "Memproses..." : <><Download size={14} /> Unduh CSV</>}
              </button>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px", background: "#f8faf9", borderRadius: "12px", border: "1px solid #eef2ef" }}>
              <div>
                <h3 style={{ fontSize: "14px", fontWeight: 700, color: "var(--teal)", marginBottom: "4px" }}>Laporan Pemilahan (TPS3R)</h3>
                <p style={{ fontSize: "11px", color: "#71807b" }}>Data organik, plastik, residu, dll.</p>
              </div>
              <button onClick={exportPemilahan} disabled={downloading !== null} className="primary-button" style={{ fontSize: "12px", padding: "10px 16px" }}>
                {downloading === "pemilahan" ? "Memproses..." : <><Download size={14} /> Unduh CSV</>}
              </button>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px", background: "#f8faf9", borderRadius: "12px", border: "1px solid #eef2ef" }}>
              <div>
                <h3 style={{ fontSize: "14px", fontWeight: 700, color: "var(--teal)", marginBottom: "4px" }}>Laporan Pembayaran Iuran</h3>
                <p style={{ fontSize: "11px", color: "#71807b" }}>Semua catatan pembayaran member.</p>
              </div>
              <button onClick={exportIuran} disabled={downloading !== null} className="primary-button" style={{ fontSize: "12px", padding: "10px 16px" }}>
                {downloading === "iuran" ? "Memproses..." : <><Download size={14} /> Unduh CSV</>}
              </button>
            </div>

          </div>
        </div>
      </main>
    </FormShell>
  );
}