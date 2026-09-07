"use client";

import { useState, useEffect, useCallback } from "react";
import FormShell from "@/components/dashboard/FormShell";
import { exportWorkbook } from "@/lib/utils/exportExcel";
import { Calendar, Download, FileSpreadsheet, Landmark } from "lucide-react";
import toast from "react-hot-toast";

type DesaItem = {
    id: string;
    kode: string;
    nama: string;
};

type PaymentRow = {
    id: string;
    periode_bulan: string;
    tanggal_bayar: string;
    nominal: number;
    metode_pembayaran: string;
    status: string;
    catatan?: string | null;
    member?: {
        id: string;
        kode_member?: string | null;
        nama: string;
        wilayah?: {
            dusun: string;
        } | null;
    } | null;
};

type ExpenseRow = {
    id: string;
    periode_bulan: string;
    tanggal: string;
    kategori: string;
    keterangan: string;
    nominal: number;
};

export default function LaporanPage() {
    const [bulan, setBulan] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    });

    const [desaList, setDesaList] = useState<DesaItem[]>([]);
    const [selectedDesaId, setSelectedDesaId] = useState<string>("all");
    const [isAdmin, setIsAdmin] = useState(false);
    const [downloading, setDownloading] = useState<string | null>(null);

    // Summary data for preview card
    const [summary, setSummary] = useState<{
        totalIuran: number;
        memberCount: number;
        totalOperasional: number;
        netBUMDes: number;
        loading: boolean;
    }>({
        totalIuran: 0,
        memberCount: 0,
        totalOperasional: 0,
        netBUMDes: 0,
        loading: false,
    });

    // Load desa list
    useEffect(() => {
        async function fetchDesa() {
            try {
                const res = await fetch("/api/desa");
                const json = await res.json();
                if (json.ok && Array.isArray(json.rows)) {
                    setDesaList(json.rows);
                    setIsAdmin(true);
                }
            } catch (err) {
                console.error("Gagal memuat desa", err);
            }
        }
        void Promise.resolve().then(() => fetchDesa());
    }, []);

    // Load monthly financial summary preview
    const loadSummaryPreview = useCallback(async () => {
        setSummary((prev) => ({ ...prev, loading: true }));
        try {
            const params = new URLSearchParams({ periode_bulan: bulan });
            if (selectedDesaId && selectedDesaId !== "all") {
                params.set("desa_id", selectedDesaId);
            }

            const [resBayar, resOpr] = await Promise.all([
                fetch(`/api/pembayaran-member?${params.toString()}`).then((r) => r.json()),
                fetch(`/api/operasional-tps3r?${params.toString()}`).then((r) => r.json()),
            ]);

            const bayarRows: PaymentRow[] = resBayar.ok && Array.isArray(resBayar.rows) ? resBayar.rows : [];
            const oprRows: ExpenseRow[] = resOpr.ok && Array.isArray(resOpr.rows) ? resOpr.rows : [];

            const totalIuran = bayarRows.reduce((acc, r) => acc + Number(r.nominal || 0), 0);
            const totalOperasional = oprRows.reduce((acc, r) => acc + Number(r.nominal || 0), 0);
            const netBUMDes = totalIuran - totalOperasional;

            setSummary({
                totalIuran,
                memberCount: bayarRows.length,
                totalOperasional,
                netBUMDes,
                loading: false,
            });
        } catch (err) {
            console.error("Gagal memuat ringkasan", err);
            setSummary((prev) => ({ ...prev, loading: false }));
        }
    }, [bulan, selectedDesaId]);

    useEffect(() => {
        void Promise.resolve().then(() => loadSummaryPreview());
    }, [loadSummaryPreview]);

    // Export Rekap BUMDes & Iuran Member to Multi-sheet Excel (.xlsx)
    async function exportExcelBUMDes() {
        setDownloading("bumdes_excel");
        try {
            const params = new URLSearchParams({ periode_bulan: bulan });
            if (selectedDesaId && selectedDesaId !== "all") {
                params.set("desa_id", selectedDesaId);
            }

            const [resBayar, resOpr] = await Promise.all([
                fetch(`/api/pembayaran-member?${params.toString()}`).then((r) => r.json()),
                fetch(`/api/operasional-tps3r?${params.toString()}`).then((r) => r.json()),
            ]);

            const bayarRows: PaymentRow[] = resBayar.ok && Array.isArray(resBayar.rows) ? resBayar.rows : [];
            const oprRows: ExpenseRow[] = resOpr.ok && Array.isArray(resOpr.rows) ? resOpr.rows : [];

            if (bayarRows.length === 0 && oprRows.length === 0) {
                toast.error(`Belum ada data pembayaran atau operasional pada periode ${bulan}.`);
                setDownloading(null);
                return;
            }

            const totalIuran = bayarRows.reduce((acc, r) => acc + Number(r.nominal || 0), 0);
            const totalOperasional = oprRows.reduce((acc, r) => acc + Number(r.nominal || 0), 0);
            const netBUMDes = totalIuran - totalOperasional;

            const desaName = selectedDesaId === "all"
                ? "Semua Desa"
                : desaList.find((d) => d.id === selectedDesaId)?.nama || "Desa";

            // Format nama bulan Indo
            const [year, month] = bulan.split("-");
            const namaBulanArr = [
                "", "Januari", "Februari", "Maret", "April", "Mei", "Juni",
                "Juli", "Agustus", "September", "Oktober", "November", "Desember",
            ];
            const bulanNama = `${namaBulanArr[parseInt(month, 10)] || month} ${year}`;

            // 1. Sheet 1: Rekapitulasi BUMDes
            type RekapRow = { uraian: string; keterangan: string; nominal: number | string };
            const rekapRows: RekapRow[] = [
                { uraian: "LAPORAN REKAPITULASI IURAN MEMBER & SETORAN BUMDES", keterangan: "", nominal: "" },
                { uraian: "Wilayah / Unit", keterangan: `TPS3R ${desaName}`, nominal: "" },
                { uraian: "Periode Bulan", keterangan: bulanNama, nominal: "" },
                { uraian: "Tanggal Dicetak", keterangan: new Date().toLocaleDateString("id-ID"), nominal: "" },
                { uraian: "----------------------------------------", keterangan: "--------------------", nominal: "------------" },
                { uraian: "1. Total Member Membayar", keterangan: `${bayarRows.length} Orang`, nominal: "" },
                { uraian: "2. Total Penerimaan Iuran Member", keterangan: "Pemasukan Iuran", nominal: totalIuran },
                { uraian: "3. Total Biaya Operasional TPS3R", keterangan: "Pengeluaran (BBM, Listrik, Dapur, dll)", nominal: totalOperasional },
                { uraian: "----------------------------------------", keterangan: "--------------------", nominal: "------------" },
                { uraian: "TOTAL SETORAN BERSIH KE BENDAHARA BUMDES", keterangan: "Iuran Terkumpul - Biaya Operasional", nominal: netBUMDes },
            ];

            // 2. Sheet 2: Rincian Pembayaran Member
            type MemberExportRow = {
                no: number;
                kode: string;
                nama: string;
                dusun: string;
                periode: string;
                tanggal: string;
                nominal: number;
                metode: string;
                status: string;
                catatan: string;
            };
            const memberExportRows: MemberExportRow[] = bayarRows.map((r, i) => ({
                no: i + 1,
                kode: r.member?.kode_member || "-",
                nama: r.member?.nama || "Tanpa Nama",
                dusun: r.member?.wilayah?.dusun || "-",
                periode: r.periode_bulan,
                tanggal: r.tanggal_bayar,
                nominal: Number(r.nominal || 0),
                metode: r.metode_pembayaran,
                status: r.status,
                catatan: r.catatan || "-",
            }));

            // 3. Sheet 3: Rincian Biaya Operasional
            type OprExportRow = {
                no: number;
                tanggal: string;
                kategori: string;
                keterangan: string;
                nominal: number;
            };
            const oprExportRows: OprExportRow[] = oprRows.map((r, i) => ({
                no: i + 1,
                tanggal: r.tanggal,
                kategori: r.kategori,
                keterangan: r.keterangan,
                nominal: Number(r.nominal || 0),
            }));

            await exportWorkbook(
                [
                    {
                        sheetName: "Rekap BUMDes",
                        rows: rekapRows,
                        columns: [
                            { header: "Uraian / Komponen", accessor: (r: RekapRow) => r.uraian },
                            { header: "Keterangan", accessor: (r: RekapRow) => r.keterangan },
                            { header: "Jumlah (Rp)", accessor: (r: RekapRow) => r.nominal },
                        ],
                    },
                    {
                        sheetName: "Iuran Member",
                        rows: memberExportRows,
                        columns: [
                            { header: "No", accessor: (r: MemberExportRow) => r.no },
                            { header: "Kode Member", accessor: (r: MemberExportRow) => r.kode },
                            { header: "Nama Member", accessor: (r: MemberExportRow) => r.nama },
                            { header: "Dusun / Wilayah", accessor: (r: MemberExportRow) => r.dusun },
                            { header: "Periode Tagihan", accessor: (r: MemberExportRow) => r.periode },
                            { header: "Tanggal Bayar", accessor: (r: MemberExportRow) => r.tanggal },
                            { header: "Nominal (Rp)", accessor: (r: MemberExportRow) => r.nominal },
                            { header: "Metode Pembayaran", accessor: (r: MemberExportRow) => r.metode },
                            { header: "Status", accessor: (r: MemberExportRow) => r.status },
                            { header: "Catatan", accessor: (r: MemberExportRow) => r.catatan },
                        ],
                    },
                    {
                        sheetName: "Biaya Operasional",
                        rows: oprExportRows,
                        columns: [
                            { header: "No", accessor: (r: OprExportRow) => r.no },
                            { header: "Tanggal", accessor: (r: OprExportRow) => r.tanggal },
                            { header: "Kategori Pengeluaran", accessor: (r: OprExportRow) => r.kategori },
                            { header: "Keterangan Pengeluaran", accessor: (r: OprExportRow) => r.keterangan },
                            { header: "Nominal (Rp)", accessor: (r: OprExportRow) => r.nominal },
                        ],
                    },
                ],
                `Laporan_Setoran_BUMDes_${desaName.replace(/\s+/g, "_")}_${bulan}.xlsx`,
            );

            toast.success("Laporan Excel (.xlsx) berhasil diunduh!");
        } catch (err) {
            console.error("Gagal mengekspor Excel", err);
            toast.error("Terjadi kesalahan saat membuat file Excel.");
        } finally {
            setDownloading(null);
        }
    }

    return (
        <FormShell title="Cetak Laporan" activeLabel="Laporan">
            <main className="content-wrap" style={{ maxWidth: "1000px", paddingBottom: "60px" }}>
                <div className="page-heading" style={{ marginBottom: "28px" }}>
                    <div>
                        <p className="eyebrow"><span className="live-dot" /> PELAPORAN & KEUANGAN</p>
                        <h1>Cetak Laporan & Rekapitulasi</h1>
                        <p className="heading-copy">
                            Unduh data operasional, rincian pembayaran member, pengeluaran operasional, serta rekapitulasi setoran bersih BUMDes dalam format Excel resmi (.xlsx).
                        </p>
                    </div>
                </div>

                {/* Toolbar Periode & Desa */}
                <div style={{
                    background: "white",
                    padding: "20px 24px",
                    borderRadius: "16px",
                    border: "1px solid var(--line)",
                    marginBottom: "24px",
                    display: "flex",
                    alignItems: "center",
                    gap: "20px",
                    flexWrap: "wrap",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.02)"
                }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <span style={{ fontSize: "12px", fontWeight: 700, color: "#4a5a55" }}>Pilih Periode Bulan</span>
                        <div style={{ position: "relative", width: "fit-content" }}>
                            <Calendar size={16} color="#a0aaa6" style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)" }} />
                            <input
                                type="month"
                                value={bulan}
                                onChange={(e) => setBulan(e.target.value)}
                                style={{
                                    padding: "10px 14px 10px 40px",
                                    borderRadius: "10px",
                                    border: "1px solid var(--line)",
                                    fontSize: "13px",
                                    outline: "none",
                                    background: "#fbfdfb"
                                }}
                            />
                        </div>
                    </div>

                    {isAdmin && desaList.length > 0 && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                            <span style={{ fontSize: "12px", fontWeight: 700, color: "#4a5a55" }}>Filter Desa</span>
                            <select
                                value={selectedDesaId}
                                onChange={(e) => setSelectedDesaId(e.target.value)}
                                style={{
                                    padding: "10px 14px",
                                    borderRadius: "10px",
                                    border: "1px solid var(--line)",
                                    fontSize: "13px",
                                    outline: "none",
                                    background: "#fbfdfb",
                                    minWidth: "180px",
                                    cursor: "pointer"
                                }}
                            >
                                <option value="all">Semua Desa</option>
                                {desaList.map((d) => (
                                    <option key={d.id} value={d.id}>
                                        {d.nama.startsWith("Desa") ? d.nama : `Desa ${d.nama}`}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                {/* ── CARD UTAMA: EXCEL REKAPITULASI BUMDES ── */}
                <div style={{
                    background: "linear-gradient(135deg, #ffffff 0%, #f0fdf9 100%)",
                    borderRadius: "20px",
                    border: "2px solid #a7f3d0",
                    padding: "28px",
                    marginBottom: "32px",
                    boxShadow: "0 10px 30px rgba(11, 143, 130, 0.08)",
                    position: "relative",
                    overflow: "hidden"
                }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "20px", flexWrap: "wrap", marginBottom: "20px" }}>
                        <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
                            <div style={{
                                width: "48px", height: "48px", borderRadius: "14px",
                                background: "var(--teal)", color: "white",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                flexShrink: 0
                            }}>
                                <FileSpreadsheet size={24} />
                            </div>
                            <div>
                                <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(11, 143, 130, 0.12)", color: "var(--teal)", padding: "4px 10px", borderRadius: "100px", fontSize: "11px", fontWeight: 800, textTransform: "uppercase", marginBottom: "6px" }}>
                                    <Landmark size={12} /> REKAP RESMI BUMDES
                                </div>
                                <h2 style={{ fontSize: "20px", fontWeight: 800, color: "#1a2522", margin: "0 0 6px 0" }}>
                                    Laporan Keuangan Iuran Member & Setoran BUMDes
                                </h2>
                                <p style={{ fontSize: "14px", color: "#556b63", margin: 0, maxWidth: "600px", lineHeight: 1.5 }}>
                                    Menghasilkan file Excel (.xlsx) multi-sheet siap serah terima ke Bendahara BUMDes, berisi lembar Rekap Setoran Bersih, Rincian Pembayaran Member (Cash/TF), dan Rincian Biaya Operasional (BBM, Listrik, Dapur).
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={exportExcelBUMDes}
                            disabled={downloading !== null}
                            className="hover-lift"
                            style={{
                                background: "var(--teal)",
                                color: "white",
                                border: "none",
                                padding: "14px 26px",
                                borderRadius: "100px",
                                fontSize: "14px",
                                fontWeight: 700,
                                cursor: downloading !== null ? "not-allowed" : "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "10px",
                                boxShadow: "0 6px 18px rgba(11, 143, 130, 0.3)",
                                transition: "transform 0.2s, background 0.2s"
                            }}
                        >
                            <Download size={16} />
                            <span>{downloading === "bumdes_excel" ? "Menyiapkan File..." : "Unduh Excel BUMDes (.xlsx)"}</span>
                        </button>
                    </div>

                    {/* Preview Ringkasan Angka Bulan Terpilih */}
                    <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                        gap: "14px",
                        background: "white",
                        padding: "18px 20px",
                        borderRadius: "14px",
                        border: "1px solid #d1fae5"
                    }}>
                        <div>
                            <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Iuran Terkumpul</span>
                            <div style={{ fontSize: "18px", fontWeight: 800, color: "var(--teal)", marginTop: "2px" }}>
                                Rp {summary.totalIuran.toLocaleString("id-ID")}
                            </div>
                            <span style={{ fontSize: "11px", color: "#94a3b8" }}>{summary.memberCount} member bayar</span>
                        </div>
                        <div>
                            <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Biaya Operasional</span>
                            <div style={{ fontSize: "18px", fontWeight: 800, color: "#dc2626", marginTop: "2px" }}>
                                - Rp {summary.totalOperasional.toLocaleString("id-ID")}
                            </div>
                            <span style={{ fontSize: "11px", color: "#94a3b8" }}>BBM, listrik, dapur, dll</span>
                        </div>
                        <div style={{ borderLeft: "2px dashed #e2e8f0", paddingLeft: "14px" }}>
                            <span style={{ fontSize: "11px", fontWeight: 700, color: "#0d9488", textTransform: "uppercase" }}>Setoran Bersih ke BUMDes</span>
                            <div style={{ fontSize: "20px", fontWeight: 900, color: "#0f766e", marginTop: "2px" }}>
                                = Rp {summary.netBUMDes.toLocaleString("id-ID")}
                            </div>
                            <span style={{ fontSize: "11px", color: summary.netBUMDes >= 0 ? "#16a34a" : "#dc2626", fontWeight: 600 }}>
                                {summary.netBUMDes >= 0 ? "Surplus siap setor" : "Defisit operasional"}
                            </span>
                        </div>
                    </div>
                </div>
            </main>
        </FormShell>
    );
}