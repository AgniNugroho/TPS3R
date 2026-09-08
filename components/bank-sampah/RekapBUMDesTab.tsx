"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
    Calendar,
    ArrowUpRight,
    ArrowDownRight,
    Wallet,
    Building2,
    FileSpreadsheet,
    Banknote,
    ExternalLink,
    Scale,
} from "lucide-react";
import { showErrorToast } from "@/components/ui/Toast";

type PaymentRow = {
    id: string;
    nominal: number;
    metode_pembayaran: "Cash" | "Transfer";
    status: "Lunas" | "Pending";
};

type OperasionalRow = {
    id: string;
    kategori: string;
    nominal: number;
};

type PenjualanRow = {
    id: string;
    kategori: string;
    berat_kg: number;
    total_pendapatan: number;
    status_setoran: string;
};

type Props = {
    selectedDesaId: string;
    desaName?: string;
    isDesaDukun?: boolean;
};

function formatRupiah(num: number): string {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(num);
}

export default function RekapBUMDesTab({
    selectedDesaId,
    desaName = "TPS3R",
    isDesaDukun = true,
}: Props) {
    const [periodeBulan, setPeriodeBulan] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    });

    const [payments, setPayments] = useState<PaymentRow[]>([]);
    const [operasional, setOperasional] = useState<OperasionalRow[]>([]);
    const [penjualan, setPenjualan] = useState<PenjualanRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams({ periode_bulan: periodeBulan });
            if (selectedDesaId && selectedDesaId !== "all") {
                params.set("desa_id", selectedDesaId);
            }

            const pjParams = new URLSearchParams({ bulan: periodeBulan });
            if (selectedDesaId && selectedDesaId !== "all") {
                pjParams.set("desa_id", selectedDesaId);
            }

            const [pembayaranRes, operasionalRes, penjualanRes] = await Promise.all([
                fetch(`/api/pembayaran-member?${params.toString()}`),
                fetch(`/api/operasional-tps3r?${params.toString()}`),
                fetch(`/api/penjualan-anorganik?${pjParams.toString()}`),
            ]);

            const pData = await pembayaranRes.json();
            const oData = await operasionalRes.json();
            const pjData = await penjualanRes.json();

            const pRows: PaymentRow[] = Array.isArray(pData.rows)
                ? pData.rows
                : Array.isArray(pData.data)
                ? pData.data
                : [];
            const oRows: OperasionalRow[] = Array.isArray(oData.rows)
                ? oData.rows
                : Array.isArray(oData.data)
                ? oData.data
                : [];
            const pjRows: PenjualanRow[] = Array.isArray(pjData.rows)
                ? pjData.rows
                : [];

            setPayments(pRows);
            setOperasional(oRows);
            setPenjualan(pjRows);
        } catch (err) {
            showErrorToast(err instanceof Error ? err.message : "Gagal mengambil ringkasan rekap BUMDes.");
        } finally {
            setIsLoading(false);
        }
    }, [selectedDesaId, periodeBulan]);

    useEffect(() => {
        void Promise.resolve().then(() => loadData());
    }, [loadData]);

    const summary = useMemo(() => {
        let totalIuran = 0;
        let totalCash = 0;
        let totalTransfer = 0;
        let lunasCount = 0;
        let pendingCount = 0;

        payments.forEach((p) => {
            const n = Number(p.nominal) || 0;
            if (p.status === "Lunas") {
                totalIuran += n;
                lunasCount += 1;
                if (p.metode_pembayaran === "Cash") totalCash += n;
                else totalTransfer += n;
            } else {
                pendingCount += 1;
            }
        });

        let totalBiaya = 0;
        let bbm = 0;
        let listrik = 0;
        let dapur = 0;
        let mesin = 0;
        let lainnya = 0;

        operasional.forEach((o) => {
            const n = Number(o.nominal) || 0;
            totalBiaya += n;
            if (o.kategori === "BBM") bbm += n;
            else if (o.kategori === "Listrik") listrik += n;
            else if (o.kategori === "Dapur / Konsumsi") dapur += n;
            else if (o.kategori === "Pemeliharaan Mesin") mesin += n;
            else lainnya += n;
        });

        let totalPenjualan = 0;
        let totalPenjualanDisetor = 0;
        let totalPenjualanBelumDisetor = 0;
        let totalBeratTerjual = 0;

        penjualan.forEach((pj) => {
            const n = Number(pj.total_pendapatan) || 0;
            totalPenjualan += n;
            totalBeratTerjual += Number(pj.berat_kg) || 0;
            if (pj.status_setoran === "Sudah Disetor") {
                totalPenjualanDisetor += n;
            } else {
                totalPenjualanBelumDisetor += n;
            }
        });

        const totalPemasukan = totalIuran + totalPenjualan;
        const setoranBUMDes = totalPemasukan - totalBiaya;

        return {
            totalIuran,
            totalCash,
            totalTransfer,
            lunasCount,
            pendingCount,
            totalBiaya,
            bbm,
            listrik,
            dapur,
            mesin,
            lainnya,
            totalPenjualan,
            totalPenjualanDisetor,
            totalPenjualanBelumDisetor,
            totalBeratTerjual: Math.round(totalBeratTerjual * 100) / 100,
            totalPemasukan,
            setoranBUMDes,
        };
    }, [payments, operasional, penjualan]);

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {/* Header / Period Selection Banner */}
            <div style={{ background: "#ffffff", padding: "18px 22px", borderRadius: "14px", border: "1px solid #e2e8f0", display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "16px" }}>
                <div>
                    <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#0f172a" }}>
                        Ringkasan Arus Kas & Rekap Setoran BUMDes {desaName ? `(${desaName})` : ""}
                        {isLoading && <span style={{ fontSize: "12px", fontWeight: 500, color: "#64748b", marginLeft: "8px" }}>Memuat data...</span>}
                    </h3>
                    <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#64748b" }}>
                        Perhitungan otomatis {isDesaDukun ? "iuran member" : "iuran dusun"} (tgl 1-7) dikurangi biaya operasional bulanan untuk disetor ke Bendahara BUMDes.
                    </p>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "#f8fafc", padding: "8px 14px", borderRadius: "10px", border: "1px solid #cbd5e1" }}>
                        <Calendar size={16} color="#059669" />
                        <span style={{ fontSize: "13px", fontWeight: 700, color: "#334155" }}>Pilih Periode:</span>
                        <input
                            type="month"
                            value={periodeBulan}
                            onChange={(e) => setPeriodeBulan(e.target.value)}
                            style={{ border: "none", background: "transparent", fontSize: "14px", fontWeight: 800, color: "#0f172a", outline: "none", cursor: "pointer" }}
                        />
                    </div>

                    <Link
                        href="/laporan"
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "8px",
                            background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
                            color: "#ffffff",
                            padding: "9px 16px",
                            borderRadius: "10px",
                            fontSize: "13px",
                            fontWeight: 700,
                            textDecoration: "none",
                            boxShadow: "0 2px 6px rgba(5,150,105,0.3)",
                        }}
                    >
                        <FileSpreadsheet size={16} />
                        Buka Halaman Laporan (Export Excel)
                        <ExternalLink size={13} />
                    </Link>
                </div>
            </div>

            {/* Main Financial Statement Card */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
                {/* 1. Total Iuran */}
                <div style={{ background: "#ffffff", borderRadius: "16px", border: "1px solid #e2e8f0", padding: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <div style={{ background: "#ecfdf5", padding: "10px", borderRadius: "12px" }}>
                                <ArrowUpRight size={22} color="#059669" />
                            </div>
                            <div>
                                <span style={{ fontSize: "11px", textTransform: "uppercase", fontWeight: 700, color: "#059669" }}>Pemasukan Rutin</span>
                                <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>{isDesaDukun ? "Iuran Member" : "Iuran Dusun"}</h4>
                            </div>
                        </div>
                        <span style={{ fontSize: "11px", background: "#f1f5f9", padding: "3px 8px", borderRadius: "6px", color: "#475569", fontWeight: 600 }}>
                            {summary.lunasCount} {isDesaDukun ? "Member" : "Dusun"} Lunas
                        </span>
                    </div>

                    <div style={{ fontSize: "24px", fontWeight: 800, color: "#059669", letterSpacing: "-0.02em", marginBottom: "14px" }}>
                        {formatRupiah(summary.totalIuran)}
                    </div>

                    <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "12px", display: "flex", flexDirection: "column", gap: "6px", fontSize: "12px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", color: "#475569" }}>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                <Banknote size={13} color="#16a34a" /> Tunai:
                            </span>
                            <span style={{ fontWeight: 700, color: "#0f172a" }}>{formatRupiah(summary.totalCash)}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", color: "#475569" }}>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                <Wallet size={13} color="#0284c7" /> Transfer:
                            </span>
                            <span style={{ fontWeight: 700, color: "#0f172a" }}>{formatRupiah(summary.totalTransfer)}</span>
                        </div>
                    </div>
                </div>

                {/* 2. Total Penjualan Sampah Anorganik */}
                <div style={{ background: "#ffffff", borderRadius: "16px", border: "1px solid #e2e8f0", padding: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <div style={{ background: "#eff6ff", padding: "10px", borderRadius: "12px" }}>
                                <Scale size={22} color="#2563eb" />
                            </div>
                            <div>
                                <span style={{ fontSize: "11px", textTransform: "uppercase", fontWeight: 700, color: "#2563eb" }}>Pemasukan Penjualan</span>
                                <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>Penjualan Anorganik</h4>
                            </div>
                        </div>
                        <span style={{ fontSize: "11px", background: "#eff6ff", padding: "3px 8px", borderRadius: "6px", color: "#2563eb", fontWeight: 600 }}>
                            {summary.totalBeratTerjual} kg Terjual
                        </span>
                    </div>

                    <div style={{ fontSize: "24px", fontWeight: 800, color: "#2563eb", letterSpacing: "-0.02em", marginBottom: "14px" }}>
                        {formatRupiah(summary.totalPenjualan)}
                    </div>

                    <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "12px", display: "flex", flexDirection: "column", gap: "6px", fontSize: "12px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", color: "#475569" }}>
                            <span style={{ color: "#166534", fontWeight: 600 }}>Sudah Disetor:</span>
                            <span style={{ fontWeight: 700, color: "#166534" }}>{formatRupiah(summary.totalPenjualanDisetor)}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", color: "#475569" }}>
                            <span style={{ color: "#b45309", fontWeight: 600 }}>Belum Disetor:</span>
                            <span style={{ fontWeight: 700, color: "#b45309" }}>{formatRupiah(summary.totalPenjualanBelumDisetor)}</span>
                        </div>
                    </div>
                </div>

                {/* 3. Total Operasional */}
                <div style={{ background: "#ffffff", borderRadius: "16px", border: "1px solid #e2e8f0", padding: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <div style={{ background: "#fef2f2", padding: "10px", borderRadius: "12px" }}>
                                <ArrowDownRight size={22} color="#dc2626" />
                            </div>
                            <div>
                                <span style={{ fontSize: "11px", textTransform: "uppercase", fontWeight: 700, color: "#dc2626" }}>Pengeluaran</span>
                                <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>Biaya Operasional</h4>
                            </div>
                        </div>
                        <span style={{ fontSize: "11px", background: "#fef2f2", padding: "3px 8px", borderRadius: "6px", color: "#dc2626", fontWeight: 600 }}>
                            {operasional.length} Transaksi
                        </span>
                    </div>

                    <div style={{ fontSize: "24px", fontWeight: 800, color: "#dc2626", letterSpacing: "-0.02em", marginBottom: "14px" }}>
                        {formatRupiah(summary.totalBiaya)}
                    </div>

                    <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "12px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", fontSize: "11px" }}>
                        <div style={{ color: "#475569" }}>
                            <span style={{ color: "#b45309", fontWeight: 600 }}>BBM:</span> {formatRupiah(summary.bbm)}
                        </div>
                        <div style={{ color: "#475569" }}>
                            <span style={{ color: "#0369a1", fontWeight: 600 }}>Listrik:</span> {formatRupiah(summary.listrik)}
                        </div>
                        <div style={{ color: "#475569" }}>
                            <span style={{ color: "#15803d", fontWeight: 600 }}>Dapur:</span> {formatRupiah(summary.dapur)}
                        </div>
                        <div style={{ color: "#475569" }}>
                            <span style={{ color: "#6d28d9", fontWeight: 600 }}>Lain:</span> {formatRupiah(summary.mesin + summary.lainnya)}
                        </div>
                    </div>
                </div>

                {/* 4. Sisa Bersih BUMDes */}
                <div style={{ background: "linear-gradient(135deg, #064e3b 0%, #022c22 100%)", borderRadius: "16px", padding: "20px", color: "#ffffff", boxShadow: "0 8px 20px rgba(6,78,59,0.2)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <div style={{ background: "rgba(255,255,255,0.15)", padding: "10px", borderRadius: "12px" }}>
                                <Building2 size={22} color="#34d399" />
                            </div>
                            <div>
                                <span style={{ fontSize: "11px", textTransform: "uppercase", fontWeight: 700, color: "#a7f3d0" }}>Setoran Bersih</span>
                                <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#ffffff" }}>Bendahara BUMDes</h4>
                            </div>
                        </div>
                        <span style={{ fontSize: "11px", background: "rgba(255,255,255,0.15)", padding: "3px 8px", borderRadius: "6px", color: "#ffffff", fontWeight: 600 }}>
                            Periode {periodeBulan}
                        </span>
                    </div>

                    <div style={{ fontSize: "26px", fontWeight: 900, color: summary.setoranBUMDes >= 0 ? "#34d399" : "#f87171", letterSpacing: "-0.02em", marginBottom: "14px" }}>
                        {formatRupiah(summary.setoranBUMDes)}
                    </div>

                    <div style={{ borderTop: "1px solid rgba(255,255,255,0.15)", paddingTop: "12px", fontSize: "11px", color: "#d1fae5" }}>
                        Total Pemasukan ({formatRupiah(summary.totalPemasukan)}) dikurangi Operasional ({formatRupiah(summary.totalBiaya)}).
                    </div>
                </div>
            </div>

            {/* Rekapitulasi Table / Detail Perhitungan */}
            <div style={{ background: "#ffffff", borderRadius: "16px", border: "1px solid #e2e8f0", padding: "22px" }}>
                <h4 style={{ margin: "0 0 16px 0", fontSize: "15px", fontWeight: 700, color: "#0f172a" }}>
                    Rincian Rekonsiliasi Kas Bulanan
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", background: "#f8fafc", borderRadius: "8px" }}>
                        <span style={{ fontWeight: 600, color: "#334155" }}>1. Penerimaan {isDesaDukun ? "Iuran Member" : "Iuran Dusun"}</span>
                        <span style={{ fontWeight: 700, color: "#059669" }}>+ {formatRupiah(summary.totalIuran)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", background: "#f8fafc", borderRadius: "8px" }}>
                        <span style={{ fontWeight: 600, color: "#334155" }}>2. Penerimaan Hasil Penjualan Sampah Anorganik ke Pengepul</span>
                        <span style={{ fontWeight: 700, color: "#2563eb" }}>+ {formatRupiah(summary.totalPenjualan)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", background: "#f8fafc", borderRadius: "8px" }}>
                        <span style={{ fontWeight: 600, color: "#334155" }}>3. Pengeluaran Biaya Operasional (BBM, Listrik, Konsumsi, Mesin)</span>
                        <span style={{ fontWeight: 700, color: "#dc2626" }}>- {formatRupiah(summary.totalBiaya)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 14px", background: "#ecfdf5", borderRadius: "8px", border: "1px solid #a7f3d0" }}>
                        <span style={{ fontWeight: 800, color: "#065f46" }}>4. Sisa Saldo Bersih untuk Disetor ke Bendahara BUMDes</span>
                        <span style={{ fontWeight: 800, color: "#065f46", fontSize: "16px" }}>= {formatRupiah(summary.setoranBUMDes)}</span>
                    </div>
                </div>

                <div style={{ marginTop: "20px", padding: "16px", background: "#f0fdf4", borderRadius: "10px", border: "1px dashed #86efac", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <FileSpreadsheet size={24} color="#16a34a" />
                        <div>
                            <p style={{ margin: 0, fontWeight: 700, color: "#166534", fontSize: "13px" }}>
                                Butuh Rekap Lengkap dalam Format Excel (.xlsx)?
                            </p>
                            <p style={{ margin: 0, color: "#15803d", fontSize: "12px" }}>
                                Unduh file resmi BUMDes dengan sheet {isDesaDukun ? "Iuran Member" : "Iuran Dusun"} dan sheet Biaya Operasional di Halaman Laporan.
                            </p>
                        </div>
                    </div>
                    <Link
                        href="/laporan"
                        style={{
                            padding: "8px 14px",
                            background: "#16a34a",
                            color: "#ffffff",
                            borderRadius: "8px",
                            fontSize: "12px",
                            fontWeight: 700,
                            textDecoration: "none",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                        }}
                    >
                        Ke Halaman Laporan →
                    </Link>
                </div>
            </div>
        </div>
    );
}
