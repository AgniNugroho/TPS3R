"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
    Plus,
    Search,
    Edit2,
    Trash2,
    Calendar,
    CheckCircle2,
    Clock,
    AlertCircle,
    Scale,
    TrendingUp,
    PackageCheck,
    Phone,
    Filter,
} from "lucide-react";
import { showErrorToast, showSuccessToast } from "@/components/ui/Toast";

type CategoryStock = {
    kategori: "Plastik" | "Kardus" | "Kaca" | "Besi" | "Medis" | "Lainnya";
    terpilah_kg: number;
    terjual_kg: number;
    sisa_stok_kg: number;
    pendapatan: number;
};

type StockSummary = {
    total_terpilah_kg: number;
    total_terjual_kg: number;
    total_sisa_stok_kg: number;
    total_pendapatan: number;
    total_disetor: number;
    total_belum_disetor: number;
};

type PenjualanRow = {
    id: string;
    desa_id: string;
    tanggal: string;
    pembeli: string;
    kontak_pembeli?: string | null;
    kategori: "Plastik" | "Kardus" | "Kaca" | "Besi" | "Medis" | "Lainnya";
    berat_kg: number;
    harga_per_kg: number;
    total_pendapatan: number;
    status_setoran: "Belum Disetor" | "Sudah Disetor";
    tanggal_setor?: string | null;
    catatan?: string | null;
    desa?: { id: string; nama: string } | null;
};

type Props = {
    selectedDesaId: string;
    desaName?: string;
};

function formatRupiah(num: number): string {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(num);
}

const CATEGORIES = [
    "Plastik",
    "Kardus",
    "Kaca",
    "Besi",
    "Medis",
    "Lainnya",
] as const;

export default function PenjualanAnorganikTab({
    selectedDesaId,
    desaName = "TPS3R",
}: Props) {
    const [bulan, setBulan] = useState<string>(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    });

    const [sales, setSales] = useState<PenjualanRow[]>([]);
    const [stocks, setStocks] = useState<CategoryStock[]>([]);
    const [stockSummary, setStockSummary] = useState<StockSummary | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    // Filter states
    const [searchQuery, setSearchQuery] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");

    // Modal states
    const [modalMode, setModalMode] = useState<
        "create" | "edit" | "delete" | null
    >(null);
    const [selectedItem, setSelectedItem] = useState<PenjualanRow | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form state
    const [form, setForm] = useState({
        tanggal: new Date().toISOString().slice(0, 10),
        pembeli: "",
        kontak_pembeli: "",
        kategori: "Plastik" as (typeof CATEGORIES)[number],
        berat_kg: "",
        harga_per_kg: "",
        status_setoran: "Belum Disetor" as "Belum Disetor" | "Sudah Disetor",
        catatan: "",
    });

    // Fetch data
    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams();
            if (selectedDesaId && selectedDesaId !== "all") {
                params.set("desa_id", selectedDesaId);
            }
            if (bulan) {
                params.set("bulan", bulan);
            }
            if (categoryFilter !== "all") {
                params.set("kategori", categoryFilter);
            }
            if (statusFilter !== "all") {
                params.set("status_setoran", statusFilter);
            }
            if (searchQuery.trim()) {
                params.set("search", searchQuery.trim());
            }

            // Also prepare params for stock calculation (per village)
            const stockParams = new URLSearchParams();
            if (selectedDesaId && selectedDesaId !== "all") {
                stockParams.set("desa_id", selectedDesaId);
            }

            const [salesRes, stockRes] = await Promise.all([
                fetch(`/api/penjualan-anorganik?${params.toString()}`).then(
                    (r) => r.json(),
                ),
                fetch(
                    `/api/penjualan-anorganik/stok?${stockParams.toString()}`,
                ).then((r) => r.json()),
            ]);

            if (salesRes.ok && Array.isArray(salesRes.rows)) {
                setSales(salesRes.rows);
            } else {
                setSales([]);
            }

            if (stockRes.ok && stockRes.categories) {
                setStocks(stockRes.categories);
                setStockSummary(stockRes.summary);
            }
        } catch (err) {
            console.error("Gagal memuat data penjualan anorganik:", err);
            showErrorToast("Gagal memuat data penjualan anorganik.");
        } finally {
            setIsLoading(false);
        }
    }, [selectedDesaId, bulan, categoryFilter, statusFilter, searchQuery]);

    useEffect(() => {
        void Promise.resolve().then(() => loadData());
    }, [loadData]);

    // Live subtotal in form
    const formTotalPendapatan = useMemo(() => {
        const berat = Number(form.berat_kg) || 0;
        const harga = Number(form.harga_per_kg) || 0;
        return Math.round(berat * harga);
    }, [form.berat_kg, form.harga_per_kg]);

    // Stock for selected category in form
    const currentCategoryStock = useMemo(() => {
        const found = stocks.find((s) => s.kategori === form.kategori);
        return found ? found.sisa_stok_kg : 0;
    }, [stocks, form.kategori]);

    // Maximum allowed stock considering edit mode (if editing, add back the previously sold weight)
    const maxAllowedStock = useMemo(() => {
        const found = stocks.find((s) => s.kategori === form.kategori);
        const base = found ? found.sisa_stok_kg : 0;
        if (
            modalMode === "edit" &&
            selectedItem &&
            selectedItem.kategori === form.kategori
        ) {
            return (
                Math.round((base + Number(selectedItem.berat_kg || 0)) * 100) /
                100
            );
        }
        return Math.round(base * 100) / 100;
    }, [stocks, form.kategori, modalMode, selectedItem]);

    const isExceedingStock = useMemo(() => {
        const berat = Number(form.berat_kg);
        if (!berat || !Number.isFinite(berat)) return false;
        return berat > maxAllowedStock;
    }, [form.berat_kg, maxAllowedStock]);

    // Filtered list client-side if needed (search already handled in server or client)
    const filteredSales = useMemo(() => {
        return sales.filter((item) => {
            if (categoryFilter !== "all" && item.kategori !== categoryFilter)
                return false;
            if (statusFilter !== "all" && item.status_setoran !== statusFilter)
                return false;
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchPembeli = item.pembeli.toLowerCase().includes(q);
                const matchCatatan = (item.catatan || "")
                    .toLowerCase()
                    .includes(q);
                const matchKontak = (item.kontak_pembeli || "")
                    .toLowerCase()
                    .includes(q);
                if (!matchPembeli && !matchCatatan && !matchKontak)
                    return false;
            }
            return true;
        });
    }, [sales, categoryFilter, statusFilter, searchQuery]);

    // Financial KPIs for displayed list
    const kpiSummary = useMemo(() => {
        let totalPendapatan = 0;
        let totalBeratKg = 0;
        let totalSudahSetor = 0;
        let totalBelumSetor = 0;

        for (const r of filteredSales) {
            const pend = Number(r.total_pendapatan || 0);
            totalPendapatan += pend;
            totalBeratKg += Number(r.berat_kg || 0);
            if (r.status_setoran === "Sudah Disetor") {
                totalSudahSetor += pend;
            } else {
                totalBelumSetor += pend;
            }
        }

        return {
            totalPendapatan,
            totalBeratKg: Math.round(totalBeratKg * 100) / 100,
            totalSudahSetor,
            totalBelumSetor,
            transaksiCount: filteredSales.length,
        };
    }, [filteredSales]);

    // Handlers
    function openCreateModal() {
        setForm({
            tanggal: new Date().toISOString().slice(0, 10),
            pembeli: "",
            kontak_pembeli: "",
            kategori: "Plastik",
            berat_kg: "",
            harga_per_kg: "",
            status_setoran: "Belum Disetor",
            catatan: "",
        });
        setModalMode("create");
        setSelectedItem(null);
    }

    function openEditModal(item: PenjualanRow) {
        setSelectedItem(item);
        setForm({
            tanggal: item.tanggal,
            pembeli: item.pembeli,
            kontak_pembeli: item.kontak_pembeli || "",
            kategori: item.kategori,
            berat_kg: String(item.berat_kg),
            harga_per_kg: String(item.harga_per_kg),
            status_setoran: item.status_setoran,
            catatan: item.catatan || "",
        });
        setModalMode("edit");
    }

    function openDeleteModal(item: PenjualanRow) {
        setSelectedItem(item);
        setModalMode("delete");
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!form.pembeli.trim()) {
            showErrorToast("Nama pembeli / pengepul wajib diisi.");
            return;
        }

        const berat = Number(form.berat_kg);
        if (!Number.isFinite(berat) || berat <= 0) {
            showErrorToast("Berat (kg) harus lebih besar dari 0.");
            return;
        }

        if (maxAllowedStock <= 0) {
            showErrorToast(
                `Stok ${form.kategori} siap jual saat ini 0 kg (habis). Input penjualan tidak dapat dilakukan.`,
            );
            return;
        }

        if (berat > maxAllowedStock) {
            showErrorToast(
                `Berat timbangan (${berat} kg) melebihi stok ${form.kategori} siap jual (${maxAllowedStock} kg). Input tidak dapat dilakukan.`,
            );
            return;
        }

        const harga = Number(form.harga_per_kg);
        if (!Number.isFinite(harga) || harga < 0) {
            showErrorToast("Harga per kg harus angka nol atau lebih.");
            return;
        }

        setIsSubmitting(true);
        try {
            if (modalMode === "create") {
                const res = await fetch("/api/penjualan-anorganik", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        desa_id: selectedDesaId,
                        tanggal: form.tanggal,
                        pembeli: form.pembeli.trim(),
                        kontak_pembeli: form.kontak_pembeli.trim() || null,
                        kategori: form.kategori,
                        berat_kg: berat,
                        harga_per_kg: harga,
                        status_setoran: form.status_setoran,
                        catatan: form.catatan.trim() || null,
                    }),
                });
                const data = await res.json();
                if (!res.ok || !data.ok) {
                    showErrorToast(data.error || "Gagal menyimpan penjualan.");
                    return;
                }
                showSuccessToast(
                    "Transaksi penjualan anorganik berhasil dicatat!",
                );
            } else if (modalMode === "edit" && selectedItem) {
                const res = await fetch("/api/penjualan-anorganik", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        id: selectedItem.id,
                        tanggal: form.tanggal,
                        pembeli: form.pembeli.trim(),
                        kontak_pembeli: form.kontak_pembeli.trim() || null,
                        kategori: form.kategori,
                        berat_kg: berat,
                        harga_per_kg: harga,
                        status_setoran: form.status_setoran,
                        catatan: form.catatan.trim() || null,
                    }),
                });
                const data = await res.json();
                if (!res.ok || !data.ok) {
                    showErrorToast(
                        data.error || "Gagal memperbarui penjualan.",
                    );
                    return;
                }
                showSuccessToast(
                    "Data penjualan anorganik berhasil diperbarui!",
                );
            }

            setModalMode(null);
            await loadData();
        } catch (err) {
            console.error("Gagal submit penjualan:", err);
            showErrorToast("Terjadi kesalahan jaringan saat menyimpan data.");
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleDelete() {
        if (!selectedItem) return;
        setIsSubmitting(true);
        try {
            const res = await fetch(
                `/api/penjualan-anorganik?id=${selectedItem.id}`,
                {
                    method: "DELETE",
                },
            );
            const data = await res.json();
            if (!res.ok || !data.ok) {
                showErrorToast(data.error || "Gagal menghapus data.");
                return;
            }
            showSuccessToast("Data penjualan berhasil dihapus!");
            setModalMode(null);
            await loadData();
        } catch (err) {
            console.error("Gagal hapus penjualan:", err);
            showErrorToast("Gagal menghapus data penjualan.");
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleToggleSetoran(item: PenjualanRow) {
        const nextStatus =
            item.status_setoran === "Sudah Disetor"
                ? "Belum Disetor"
                : "Sudah Disetor";
        try {
            const res = await fetch("/api/penjualan-anorganik", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: item.id,
                    pembeli: item.pembeli,
                    kategori: item.kategori,
                    berat_kg: item.berat_kg,
                    harga_per_kg: item.harga_per_kg,
                    status_setoran: nextStatus,
                    tanggal: item.tanggal,
                    tanggal_setor:
                        nextStatus === "Sudah Disetor"
                            ? new Date().toISOString().slice(0, 10)
                            : null,
                }),
            });
            const data = await res.json();
            if (!res.ok || !data.ok) {
                showErrorToast(
                    data.error || "Gagal memperbarui status setoran.",
                );
                return;
            }
            showSuccessToast(`Status diubah menjadi: ${nextStatus}`);
            await loadData();
        } catch (err) {
            console.error("Gagal toggle setoran:", err);
            showErrorToast("Gagal memperbarui status setoran BUMDes.");
        }
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {/* Header & Filter Bar */}
            <div
                style={{
                    background: "#ffffff",
                    padding: "18px 22px",
                    borderRadius: "14px",
                    border: "1px solid #e2e8f0",
                    display: "flex",
                    flexWrap: "wrap",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "16px",
                }}
            >
                <div>
                    <h3
                        style={{
                            margin: 0,
                            fontSize: "16px",
                            fontWeight: 800,
                            color: "#0f172a",
                        }}
                    >
                        Penjualan Sampah Anorganik ke Pengepul{" "}
                        {desaName ? `(${desaName})` : ""}
                        {isLoading && (
                            <span
                                style={{
                                    fontSize: "12px",
                                    fontWeight: 500,
                                    color: "#64748b",
                                    marginLeft: "8px",
                                }}
                            >
                                Memuat...
                            </span>
                        )}
                    </h3>
                    <p
                        style={{
                            margin: "4px 0 0 0",
                            fontSize: "13px",
                            color: "#64748b",
                        }}
                    >
                        Pencatatan pengambilan sampah oleh pengepul, integrasi
                        stok sampah terpilah siap jual, dan rekapitulasi setoran
                        ke Bendahara BUMDes.
                    </p>
                </div>

                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        flexWrap: "wrap",
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            background: "#f8fafc",
                            padding: "8px 14px",
                            borderRadius: "10px",
                            border: "1px solid #cbd5e1",
                        }}
                    >
                        <Calendar size={16} color="#059669" />
                        <span
                            style={{
                                fontSize: "13px",
                                fontWeight: 600,
                                color: "#334155",
                            }}
                        >
                            Bulan:
                        </span>
                        <input
                            type="month"
                            value={bulan}
                            onChange={(e) => setBulan(e.target.value)}
                            style={{
                                border: "none",
                                background: "transparent",
                                fontSize: "13px",
                                fontWeight: 700,
                                color: "#0f172a",
                                outline: "none",
                                cursor: "pointer",
                            }}
                        />
                    </div>

                    <button
                        type="button"
                        onClick={openCreateModal}
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "8px",
                            background:
                                "linear-gradient(135deg, #059669 0%, #047857 100%)",
                            color: "#ffffff",
                            border: "none",
                            padding: "9px 18px",
                            borderRadius: "10px",
                            fontSize: "13px",
                            fontWeight: 700,
                            cursor: "pointer",
                            boxShadow: "0 2px 6px rgba(5,150,105,0.3)",
                        }}
                    >
                        <Plus size={16} />
                        Catat Penjualan ke Pengepul
                    </button>
                </div>
            </div>

            {/* WIDGET: STOK SAMPAH TERPILAH SIAP JUAL */}
            <div
                style={{
                    background: "#ffffff",
                    borderRadius: "16px",
                    border: "1px solid #e2e8f0",
                    padding: "20px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
                }}
            >
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "16px",
                        flexWrap: "wrap",
                        gap: "8px",
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                        }}
                    >
                        <div
                            style={{
                                background: "#ecfdf5",
                                padding: "8px",
                                borderRadius: "10px",
                            }}
                        >
                            <PackageCheck size={20} color="#059669" />
                        </div>
                        <div>
                            <h4
                                style={{
                                    margin: 0,
                                    fontSize: "15px",
                                    fontWeight: 800,
                                    color: "#0f172a",
                                }}
                            >
                                Stok Sampah Anorganik Terpilah (Siap Jual di
                                TPS3R)
                            </h4>
                            <p
                                style={{
                                    margin: "2px 0 0 0",
                                    fontSize: "12px",
                                    color: "#64748b",
                                }}
                            >
                                Dihitung otomatis dari akumulasi pemilahan
                                sampah dikurangi total yang sudah terjual ke
                                pengepul.
                            </p>
                        </div>
                    </div>
                    {stockSummary && (
                        <div
                            style={{
                                background: "#f0fdf4",
                                border: "1px solid #bbf7d0",
                                padding: "6px 14px",
                                borderRadius: "8px",
                                fontSize: "12px",
                                fontWeight: 700,
                                color: "#166534",
                            }}
                        >
                            Total Sisa Siap Jual:{" "}
                            <span
                                style={{ fontSize: "14px", color: "#059669" }}
                            >
                                {stockSummary.total_sisa_stok_kg.toLocaleString(
                                    "id-ID",
                                )}{" "}
                                kg
                            </span>
                        </div>
                    )}
                </div>

                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns:
                            "repeat(auto-fit, minmax(170px, 1fr))",
                        gap: "12px",
                    }}
                >
                    {stocks.map((item) => {
                        const isLow = item.sisa_stok_kg <= 0;
                        return (
                            <div
                                key={item.kategori}
                                style={{
                                    background: isLow ? "#f8fafc" : "#ffffff",
                                    border: isLow
                                        ? "1px solid #e2e8f0"
                                        : "1px solid #a7f3d0",
                                    borderRadius: "12px",
                                    padding: "14px",
                                    boxShadow: isLow
                                        ? "none"
                                        : "0 2px 6px rgba(5,150,105,0.05)",
                                }}
                            >
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        marginBottom: "6px",
                                    }}
                                >
                                    <span
                                        style={{
                                            fontSize: "13px",
                                            fontWeight: 800,
                                            color: "#0f172a",
                                        }}
                                    >
                                        {item.kategori}
                                    </span>
                                    <span
                                        style={{
                                            fontSize: "11px",
                                            fontWeight: 600,
                                            color: isLow
                                                ? "#94a3b8"
                                                : "#059669",
                                        }}
                                    >
                                        {isLow ? "Habis" : "Tersedia"}
                                    </span>
                                </div>
                                <div
                                    style={{
                                        fontSize: "20px",
                                        fontWeight: 900,
                                        color: isLow ? "#64748b" : "#059669",
                                        marginBottom: "6px",
                                    }}
                                >
                                    {item.sisa_stok_kg.toLocaleString("id-ID")}{" "}
                                    <span
                                        style={{
                                            fontSize: "12px",
                                            fontWeight: 600,
                                        }}
                                    >
                                        kg
                                    </span>
                                </div>
                                <div
                                    style={{
                                        fontSize: "11px",
                                        color: "#64748b",
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: "2px",
                                        borderTop: "1px solid #f1f5f9",
                                        paddingTop: "6px",
                                    }}
                                >
                                    <span>
                                        Terpilah:{" "}
                                        <b>
                                            {item.terpilah_kg.toLocaleString(
                                                "id-ID",
                                            )}{" "}
                                            kg
                                        </b>
                                    </span>
                                    <span>
                                        Terjual:{" "}
                                        <b>
                                            {item.terjual_kg.toLocaleString(
                                                "id-ID",
                                            )}{" "}
                                            kg
                                        </b>
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* KPI FINANCIAL CARDS */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                    gap: "16px",
                }}
            >
                {/* 1. Total Pendapatan Penjualan */}
                <div
                    style={{
                        background: "#ffffff",
                        borderRadius: "14px",
                        border: "1px solid #e2e8f0",
                        padding: "18px",
                        boxShadow: "0 2px 6px rgba(0,0,0,0.02)",
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "8px",
                        }}
                    >
                        <span
                            style={{
                                fontSize: "12px",
                                fontWeight: 700,
                                color: "#059669",
                                textTransform: "uppercase",
                            }}
                        >
                            Hasil Penjualan
                        </span>
                        <TrendingUp size={18} color="#059669" />
                    </div>
                    <div
                        style={{
                            fontSize: "24px",
                            fontWeight: 900,
                            color: "#0f172a",
                        }}
                    >
                        {formatRupiah(kpiSummary.totalPendapatan)}
                    </div>
                    <div
                        style={{
                            fontSize: "12px",
                            color: "#64748b",
                            marginTop: "4px",
                        }}
                    >
                        Dari {kpiSummary.transaksiCount} transaksi pengambilan
                    </div>
                </div>

                {/* 2. Total Berat Terjual */}
                <div
                    style={{
                        background: "#ffffff",
                        borderRadius: "14px",
                        border: "1px solid #e2e8f0",
                        padding: "18px",
                        boxShadow: "0 2px 6px rgba(0,0,0,0.02)",
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "8px",
                        }}
                    >
                        <span
                            style={{
                                fontSize: "12px",
                                fontWeight: 700,
                                color: "#0284c7",
                                textTransform: "uppercase",
                            }}
                        >
                            Volume Terjual
                        </span>
                        <Scale size={18} color="#0284c7" />
                    </div>
                    <div
                        style={{
                            fontSize: "24px",
                            fontWeight: 900,
                            color: "#0f172a",
                        }}
                    >
                        {kpiSummary.totalBeratKg.toLocaleString("id-ID")}{" "}
                        <span style={{ fontSize: "14px", fontWeight: 600 }}>
                            kg
                        </span>
                    </div>
                    <div
                        style={{
                            fontSize: "12px",
                            color: "#64748b",
                            marginTop: "4px",
                        }}
                    >
                        Diambil oleh pengepul
                    </div>
                </div>

                {/* 3. Status Setoran BUMDes: Sudah Disetor */}
                <div
                    style={{
                        background: "#ffffff",
                        borderRadius: "14px",
                        border: "1px solid #e2e8f0",
                        padding: "18px",
                        boxShadow: "0 2px 6px rgba(0,0,0,0.02)",
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "8px",
                        }}
                    >
                        <span
                            style={{
                                fontSize: "12px",
                                fontWeight: 700,
                                color: "#15803d",
                                textTransform: "uppercase",
                            }}
                        >
                            Sudah Disetor BUMDes
                        </span>
                        <CheckCircle2 size={18} color="#15803d" />
                    </div>
                    <div
                        style={{
                            fontSize: "24px",
                            fontWeight: 900,
                            color: "#15803d",
                        }}
                    >
                        {formatRupiah(kpiSummary.totalSudahSetor)}
                    </div>
                    <div
                        style={{
                            fontSize: "12px",
                            color: "#64748b",
                            marginTop: "4px",
                        }}
                    >
                        Uang resmi diserahkan ke BUMDes
                    </div>
                </div>

                {/* 4. Status Setoran BUMDes: Belum Disetor */}
                <div
                    style={{
                        background: "#ffffff",
                        borderRadius: "14px",
                        border: "1px solid #fde68a",
                        padding: "18px",
                        boxShadow: "0 2px 6px rgba(0,0,0,0.02)",
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "8px",
                        }}
                    >
                        <span
                            style={{
                                fontSize: "12px",
                                fontWeight: 700,
                                color: "#b45309",
                                textTransform: "uppercase",
                            }}
                        >
                            Belum Disetor BUMDes
                        </span>
                        <Clock size={18} color="#b45309" />
                    </div>
                    <div
                        style={{
                            fontSize: "24px",
                            fontWeight: 900,
                            color: "#b45309",
                        }}
                    >
                        {formatRupiah(kpiSummary.totalBelumSetor)}
                    </div>
                    <div
                        style={{
                            fontSize: "12px",
                            color: "#64748b",
                            marginTop: "4px",
                        }}
                    >
                        Kas penjualan siap setor ke Bendahara
                    </div>
                </div>
            </div>

            {/* Filter & Search Bar */}
            <div
                style={{
                    background: "#ffffff",
                    padding: "16px 20px",
                    borderRadius: "14px",
                    border: "1px solid #e2e8f0",
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "12px",
                    alignItems: "center",
                    justifyContent: "space-between",
                }}
            >
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        flexWrap: "wrap",
                        flex: 1,
                    }}
                >
                    <div
                        style={{
                            position: "relative",
                            minWidth: "240px",
                            flex: 1,
                            maxWidth: "360px",
                        }}
                    >
                        <Search
                            size={16}
                            color="#94a3b8"
                            style={{
                                position: "absolute",
                                left: "12px",
                                top: "50%",
                                transform: "translateY(-50%)",
                            }}
                        />
                        <input
                            type="text"
                            placeholder="Cari nama pengepul / catatan..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                width: "100%",
                                padding: "9px 12px 9px 36px",
                                borderRadius: "8px",
                                border: "1px solid #cbd5e1",
                                fontSize: "13px",
                                outline: "none",
                            }}
                        />
                    </div>

                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                        }}
                    >
                        <Filter size={15} color="#64748b" />
                        <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            style={{
                                padding: "8px 12px",
                                borderRadius: "8px",
                                border: "1px solid #cbd5e1",
                                fontSize: "13px",
                                outline: "none",
                                background: "#ffffff",
                                cursor: "pointer",
                            }}
                        >
                            <option value="all">Semua Kategori</option>
                            {CATEGORIES.map((k) => (
                                <option key={k} value={k}>
                                    {k}
                                </option>
                            ))}
                        </select>
                    </div>

                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        style={{
                            padding: "8px 12px",
                            borderRadius: "8px",
                            border: "1px solid #cbd5e1",
                            fontSize: "13px",
                            outline: "none",
                            background: "#ffffff",
                            cursor: "pointer",
                        }}
                    >
                        <option value="all">Semua Status Setoran</option>
                        <option value="Belum Disetor">Belum Disetor</option>
                        <option value="Sudah Disetor">Sudah Disetor</option>
                    </select>
                </div>
            </div>

            {/* TABEL DATA PENJUALAN */}
            <div
                style={{
                    background: "#ffffff",
                    borderRadius: "16px",
                    border: "1px solid #e2e8f0",
                    overflow: "hidden",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
                }}
            >
                <div style={{ overflowX: "auto" }}>
                    <table
                        style={{
                            width: "100%",
                            borderCollapse: "collapse",
                            textAlign: "left",
                            fontSize: "13px",
                        }}
                    >
                        <thead>
                            <tr
                                style={{
                                    background: "#f8fafc",
                                    borderBottom: "1px solid #e2e8f0",
                                    color: "#475569",
                                }}
                            >
                                <th
                                    style={{
                                        padding: "14px 16px",
                                        fontWeight: 700,
                                    }}
                                >
                                    Tanggal
                                </th>
                                <th
                                    style={{
                                        padding: "14px 16px",
                                        fontWeight: 700,
                                    }}
                                >
                                    Pengepul (Pembeli)
                                </th>
                                <th
                                    style={{
                                        padding: "14px 16px",
                                        fontWeight: 700,
                                    }}
                                >
                                    Kategori Sampah
                                </th>
                                <th
                                    style={{
                                        padding: "14px 16px",
                                        fontWeight: 700,
                                        textAlign: "right",
                                    }}
                                >
                                    Berat (kg)
                                </th>
                                <th
                                    style={{
                                        padding: "14px 16px",
                                        fontWeight: 700,
                                        textAlign: "right",
                                    }}
                                >
                                    Harga / kg
                                </th>
                                <th
                                    style={{
                                        padding: "14px 16px",
                                        fontWeight: 700,
                                        textAlign: "right",
                                    }}
                                >
                                    Total Pendapatan
                                </th>
                                <th
                                    style={{
                                        padding: "14px 16px",
                                        fontWeight: 700,
                                        textAlign: "center",
                                    }}
                                >
                                    Setoran BUMDes
                                </th>
                                <th
                                    style={{
                                        padding: "14px 16px",
                                        fontWeight: 700,
                                        textAlign: "center",
                                    }}
                                >
                                    Aksi
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredSales.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={8}
                                        style={{
                                            padding: "40px 16px",
                                            textAlign: "center",
                                            color: "#94a3b8",
                                        }}
                                    >
                                        <AlertCircle
                                            size={28}
                                            style={{
                                                display: "inline-block",
                                                marginBottom: "8px",
                                                opacity: 0.7,
                                            }}
                                        />
                                        <p
                                            style={{
                                                margin: 0,
                                                fontSize: "14px",
                                                fontWeight: 600,
                                            }}
                                        >
                                            Belum ada data penjualan sampah
                                            anorganik.
                                        </p>
                                        <p
                                            style={{
                                                margin: "4px 0 0 0",
                                                fontSize: "12px",
                                            }}
                                        >
                                            Klik tombol &quot;Catat Penjualan ke
                                            Pengepul&quot; untuk menambahkan
                                            data baru.
                                        </p>
                                    </td>
                                </tr>
                            ) : (
                                filteredSales.map((r) => {
                                    const isSudah =
                                        r.status_setoran === "Sudah Disetor";
                                    return (
                                        <tr
                                            key={r.id}
                                            style={{
                                                borderBottom:
                                                    "1px solid #f1f5f9",
                                            }}
                                        >
                                            <td
                                                style={{
                                                    padding: "14px 16px",
                                                    fontWeight: 600,
                                                    color: "#1e293b",
                                                    whiteSpace: "nowrap",
                                                }}
                                            >
                                                {r.tanggal}
                                            </td>
                                            <td
                                                style={{ padding: "14px 16px" }}
                                            >
                                                <div
                                                    style={{
                                                        fontWeight: 700,
                                                        color: "#0f172a",
                                                    }}
                                                >
                                                    {r.pembeli}
                                                </div>
                                                {r.kontak_pembeli && (
                                                    <div
                                                        style={{
                                                            fontSize: "11px",
                                                            color: "#64748b",
                                                            display:
                                                                "inline-flex",
                                                            alignItems:
                                                                "center",
                                                            gap: "4px",
                                                        }}
                                                    >
                                                        <Phone size={11} />{" "}
                                                        {r.kontak_pembeli}
                                                    </div>
                                                )}
                                                {r.catatan && (
                                                    <div
                                                        style={{
                                                            fontSize: "11px",
                                                            color: "#94a3b8",
                                                            fontStyle: "italic",
                                                        }}
                                                    >
                                                        {r.catatan}
                                                    </div>
                                                )}
                                            </td>
                                            <td
                                                style={{ padding: "14px 16px" }}
                                            >
                                                <span
                                                    style={{
                                                        display: "inline-block",
                                                        padding: "4px 10px",
                                                        borderRadius: "100px",
                                                        fontSize: "11px",
                                                        fontWeight: 700,
                                                        background:
                                                            r.kategori ===
                                                            "Plastik"
                                                                ? "#dbeafe"
                                                                : r.kategori ===
                                                                    "Kardus"
                                                                  ? "#fef3c7"
                                                                  : r.kategori ===
                                                                      "Besi"
                                                                    ? "#e2e8f0"
                                                                    : r.kategori ===
                                                                        "Kaca"
                                                                      ? "#cffafe"
                                                                      : r.kategori ===
                                                                          "Medis"
                                                                        ? "#fee2e2"
                                                                        : "#f3e8ff",
                                                        color:
                                                            r.kategori ===
                                                            "Plastik"
                                                                ? "#1e40af"
                                                                : r.kategori ===
                                                                    "Kardus"
                                                                  ? "#92400e"
                                                                  : r.kategori ===
                                                                      "Besi"
                                                                    ? "#334155"
                                                                    : r.kategori ===
                                                                        "Kaca"
                                                                      ? "#155e75"
                                                                      : r.kategori ===
                                                                          "Medis"
                                                                        ? "#991b1b"
                                                                        : "#6b21a8",
                                                    }}
                                                >
                                                    {r.kategori}
                                                </span>
                                            </td>
                                            <td
                                                style={{
                                                    padding: "14px 16px",
                                                    textAlign: "right",
                                                    fontWeight: 700,
                                                    color: "#0f172a",
                                                }}
                                            >
                                                {Number(
                                                    r.berat_kg,
                                                ).toLocaleString("id-ID")}{" "}
                                                kg
                                            </td>
                                            <td
                                                style={{
                                                    padding: "14px 16px",
                                                    textAlign: "right",
                                                    color: "#475569",
                                                }}
                                            >
                                                {formatRupiah(r.harga_per_kg)}
                                            </td>
                                            <td
                                                style={{
                                                    padding: "14px 16px",
                                                    textAlign: "right",
                                                    fontWeight: 800,
                                                    color: "#059669",
                                                }}
                                            >
                                                {formatRupiah(
                                                    r.total_pendapatan,
                                                )}
                                            </td>
                                            <td
                                                style={{
                                                    padding: "14px 16px",
                                                    textAlign: "center",
                                                }}
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        handleToggleSetoran(r)
                                                    }
                                                    title="Klik untuk mengubah status setoran ke BUMDes"
                                                    style={{
                                                        border: "none",
                                                        cursor: "pointer",
                                                        padding: "4px 10px",
                                                        borderRadius: "100px",
                                                        fontSize: "11px",
                                                        fontWeight: 700,
                                                        background: isSudah
                                                            ? "#dcfce7"
                                                            : "#fef3c7",
                                                        color: isSudah
                                                            ? "#166534"
                                                            : "#92400e",
                                                        display: "inline-flex",
                                                        alignItems: "center",
                                                        gap: "4px",
                                                        transition: "all 0.15s",
                                                    }}
                                                >
                                                    {isSudah ? (
                                                        <CheckCircle2
                                                            size={12}
                                                        />
                                                    ) : (
                                                        <Clock size={12} />
                                                    )}
                                                    {r.status_setoran}
                                                </button>
                                            </td>
                                            <td
                                                style={{
                                                    padding: "14px 16px",
                                                    textAlign: "center",
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        display: "inline-flex",
                                                        alignItems: "center",
                                                        gap: "6px",
                                                    }}
                                                >
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            openEditModal(r)
                                                        }
                                                        title="Edit Transaksi"
                                                        style={{
                                                            border: "1px solid #cbd5e1",
                                                            background:
                                                                "#ffffff",
                                                            color: "#334155",
                                                            padding: "5px 8px",
                                                            borderRadius: "6px",
                                                            cursor: "pointer",
                                                        }}
                                                    >
                                                        <Edit2 size={13} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            openDeleteModal(r)
                                                        }
                                                        title="Hapus Transaksi"
                                                        style={{
                                                            border: "1px solid #fecaca",
                                                            background:
                                                                "#fff1f2",
                                                            color: "#e11d48",
                                                            padding: "5px 8px",
                                                            borderRadius: "6px",
                                                            cursor: "pointer",
                                                        }}
                                                    >
                                                        <Trash2 size={13} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL CREATE / EDIT */}
            {(modalMode === "create" || modalMode === "edit") && (
                <div
                    style={{
                        position: "fixed",
                        inset: 0,
                        background: "rgba(15, 23, 42, 0.6)",
                        backdropFilter: "blur(4px)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 9999,
                        padding: "20px",
                    }}
                >
                    <div
                        style={{
                            background: "#ffffff",
                            borderRadius: "16px",
                            maxWidth: "520px",
                            width: "100%",
                            padding: "24px",
                            boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginBottom: "18px",
                                borderBottom: "1px solid #f1f5f9",
                                paddingBottom: "12px",
                            }}
                        >
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                }}
                            >
                                <Scale size={20} color="#059669" />
                                <h3
                                    style={{
                                        margin: 0,
                                        fontSize: "16px",
                                        fontWeight: 800,
                                        color: "#0f172a",
                                    }}
                                >
                                    {modalMode === "create"
                                        ? "Catat Penjualan ke Pengepul"
                                        : "Edit Data Penjualan"}
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setModalMode(null)}
                                style={{
                                    background: "none",
                                    border: "none",
                                    color: "#94a3b8",
                                    cursor: "pointer",
                                    fontSize: "18px",
                                    fontWeight: 700,
                                }}
                            >
                                ✕
                            </button>
                        </div>

                        <form
                            onSubmit={handleSubmit}
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "14px",
                            }}
                        >
                            <div
                                style={{
                                    display: "grid",
                                    gridTemplateColumns: "1fr 1fr",
                                    gap: "12px",
                                }}
                            >
                                <div>
                                    <label
                                        style={{
                                            display: "block",
                                            fontSize: "12px",
                                            fontWeight: 700,
                                            color: "#334155",
                                            marginBottom: "4px",
                                        }}
                                    >
                                        Tanggal Penjualan
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={form.tanggal}
                                        onChange={(e) =>
                                            setForm((prev) => ({
                                                ...prev,
                                                tanggal: e.target.value,
                                            }))
                                        }
                                        style={{
                                            width: "100%",
                                            padding: "9px 12px",
                                            borderRadius: "8px",
                                            border: "1px solid #cbd5e1",
                                            fontSize: "13px",
                                            outline: "none",
                                        }}
                                    />
                                </div>
                                <div>
                                    <label
                                        style={{
                                            display: "block",
                                            fontSize: "12px",
                                            fontWeight: 700,
                                            color: "#334155",
                                            marginBottom: "4px",
                                        }}
                                    >
                                        Kategori Sampah
                                    </label>
                                    <select
                                        value={form.kategori}
                                        onChange={(e) =>
                                            setForm((prev) => ({
                                                ...prev,
                                                kategori: e.target
                                                    .value as (typeof CATEGORIES)[number],
                                            }))
                                        }
                                        style={{
                                            width: "100%",
                                            padding: "9px 12px",
                                            borderRadius: "8px",
                                            border: "1px solid #cbd5e1",
                                            fontSize: "13px",
                                            outline: "none",
                                            background: "#ffffff",
                                        }}
                                    >
                                        {CATEGORIES.map((k) => (
                                            <option key={k} value={k}>
                                                {k}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Stock availability indicator banner */}
                            <div
                                style={{
                                    background:
                                        currentCategoryStock > 0
                                            ? "#ecfdf5"
                                            : "#fef2f2",
                                    border: `1px solid ${currentCategoryStock > 0 ? "#a7f3d0" : "#fecaca"}`,
                                    borderRadius: "8px",
                                    padding: "8px 12px",
                                    fontSize: "12px",
                                    color:
                                        currentCategoryStock > 0
                                            ? "#065f46"
                                            : "#991b1b",
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                }}
                            >
                                <span>
                                    Stok {form.kategori} Terpilah Siap Jual:
                                </span>
                                <b>
                                    {currentCategoryStock.toLocaleString(
                                        "id-ID",
                                    )}{" "}
                                    kg
                                </b>
                            </div>

                            <div>
                                <label
                                    style={{
                                        display: "block",
                                        fontSize: "12px",
                                        fontWeight: 700,
                                        color: "#334155",
                                        marginBottom: "4px",
                                    }}
                                >
                                    Nama Pembeli / Pengepul *
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Contoh: Pak Subur / UD Daur Ulang Mandiri"
                                    value={form.pembeli}
                                    onChange={(e) =>
                                        setForm((prev) => ({
                                            ...prev,
                                            pembeli: e.target.value,
                                        }))
                                    }
                                    style={{
                                        width: "100%",
                                        padding: "9px 12px",
                                        borderRadius: "8px",
                                        border: "1px solid #cbd5e1",
                                        fontSize: "13px",
                                        outline: "none",
                                    }}
                                />
                            </div>

                            <div>
                                <label
                                    style={{
                                        display: "block",
                                        fontSize: "12px",
                                        fontWeight: 700,
                                        color: "#334155",
                                        marginBottom: "4px",
                                    }}
                                >
                                    No. Kontak / HP Pengepul (Opsional)
                                </label>
                                <input
                                    type="text"
                                    placeholder="Contoh: 081234567890"
                                    value={form.kontak_pembeli}
                                    onChange={(e) =>
                                        setForm((prev) => ({
                                            ...prev,
                                            kontak_pembeli: e.target.value,
                                        }))
                                    }
                                    style={{
                                        width: "100%",
                                        padding: "9px 12px",
                                        borderRadius: "8px",
                                        border: "1px solid #cbd5e1",
                                        fontSize: "13px",
                                        outline: "none",
                                    }}
                                />
                            </div>

                            <div
                                style={{
                                    display: "grid",
                                    gridTemplateColumns: "1fr 1fr",
                                    gap: "12px",
                                }}
                            >
                                <div>
                                    <div
                                        style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            marginBottom: "4px",
                                        }}
                                    >
                                        <label
                                            style={{
                                                fontSize: "12px",
                                                fontWeight: 700,
                                                color: "#334155",
                                            }}
                                        >
                                            Berat Timbangan (kg) *
                                        </label>
                                        <span
                                            style={{
                                                fontSize: "11px",
                                                color:
                                                    maxAllowedStock > 0
                                                        ? "#059669"
                                                        : "#dc2626",
                                                fontWeight: 600,
                                            }}
                                        >
                                            Maks: {maxAllowedStock} kg
                                        </span>
                                    </div>
                                    <input
                                        type="number"
                                        step="0.1"
                                        min="0.1"
                                        max={
                                            maxAllowedStock > 0
                                                ? maxAllowedStock
                                                : 0
                                        }
                                        required
                                        placeholder={`Maksimal ${maxAllowedStock} kg`}
                                        value={form.berat_kg}
                                        onChange={(e) =>
                                            setForm((prev) => ({
                                                ...prev,
                                                berat_kg: e.target.value,
                                            }))
                                        }
                                        style={{
                                            width: "100%",
                                            padding: "9px 12px",
                                            borderRadius: "8px",
                                            border: isExceedingStock
                                                ? "1.5px solid #ef4444"
                                                : "1px solid #cbd5e1",
                                            background: isExceedingStock
                                                ? "#fef2f2"
                                                : "#ffffff",
                                            fontSize: "13px",
                                            outline: "none",
                                        }}
                                    />
                                    {isExceedingStock && (
                                        <span
                                            style={{
                                                fontSize: "11px",
                                                color: "#dc2626",
                                                fontWeight: 700,
                                                marginTop: "4px",
                                                display: "block",
                                            }}
                                        >
                                            ⚠️ Berat melebihi stok siap jual!
                                            (Maksimal: {maxAllowedStock} kg)
                                        </span>
                                    )}
                                </div>
                                <div>
                                    <label
                                        style={{
                                            display: "block",
                                            fontSize: "12px",
                                            fontWeight: 700,
                                            color: "#334155",
                                            marginBottom: "4px",
                                        }}
                                    >
                                        Harga Pengepul per kg (Rp) *
                                    </label>
                                    <input
                                        type="number"
                                        step="50"
                                        min="0"
                                        required
                                        placeholder="Contoh: 3000"
                                        value={form.harga_per_kg}
                                        onChange={(e) =>
                                            setForm((prev) => ({
                                                ...prev,
                                                harga_per_kg: e.target.value,
                                            }))
                                        }
                                        style={{
                                            width: "100%",
                                            padding: "9px 12px",
                                            borderRadius: "8px",
                                            border: "1px solid #cbd5e1",
                                            fontSize: "13px",
                                            outline: "none",
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Total Pendapatan Realtime Preview */}
                            <div
                                style={{
                                    background: "#f8fafc",
                                    border: "1px dashed #cbd5e1",
                                    borderRadius: "10px",
                                    padding: "12px 16px",
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                }}
                            >
                                <span
                                    style={{
                                        fontSize: "13px",
                                        fontWeight: 700,
                                        color: "#475569",
                                    }}
                                >
                                    Total Pendapatan Diterima:
                                </span>
                                <span
                                    style={{
                                        fontSize: "18px",
                                        fontWeight: 900,
                                        color: "#059669",
                                    }}
                                >
                                    {formatRupiah(formTotalPendapatan)}
                                </span>
                            </div>

                            <div
                                style={{
                                    display: "grid",
                                    gridTemplateColumns: "1fr",
                                    gap: "12px",
                                }}
                            >
                                <div>
                                    <label
                                        style={{
                                            display: "block",
                                            fontSize: "12px",
                                            fontWeight: 700,
                                            color: "#334155",
                                            marginBottom: "4px",
                                        }}
                                    >
                                        Status Setoran ke BUMDes
                                    </label>
                                    <select
                                        value={form.status_setoran}
                                        onChange={(e) =>
                                            setForm((prev) => ({
                                                ...prev,
                                                status_setoran: e.target
                                                    .value as
                                                    | "Belum Disetor"
                                                    | "Sudah Disetor",
                                            }))
                                        }
                                        style={{
                                            width: "100%",
                                            padding: "9px 12px",
                                            borderRadius: "8px",
                                            border: "1px solid #cbd5e1",
                                            fontSize: "13px",
                                            outline: "none",
                                            background: "#ffffff",
                                        }}
                                    >
                                        <option value="Belum Disetor">
                                            Belum Disetor ke Bendahara BUMDes
                                        </option>
                                        <option value="Sudah Disetor">
                                            Sudah Disetor ke Bendahara BUMDes
                                        </option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label
                                    style={{
                                        display: "block",
                                        fontSize: "12px",
                                        fontWeight: 700,
                                        color: "#334155",
                                        marginBottom: "4px",
                                    }}
                                >
                                    Catatan Tambahan (Opsional)
                                </label>
                                <input
                                    type="text"
                                    placeholder="Contoh: Pembayaran tunai saat timbangan selesai"
                                    value={form.catatan}
                                    onChange={(e) =>
                                        setForm((prev) => ({
                                            ...prev,
                                            catatan: e.target.value,
                                        }))
                                    }
                                    style={{
                                        width: "100%",
                                        padding: "9px 12px",
                                        borderRadius: "8px",
                                        border: "1px solid #cbd5e1",
                                        fontSize: "13px",
                                        outline: "none",
                                    }}
                                />
                            </div>

                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "flex-end",
                                    gap: "10px",
                                    marginTop: "12px",
                                    borderTop: "1px solid #f1f5f9",
                                    paddingTop: "14px",
                                }}
                            >
                                <button
                                    type="button"
                                    onClick={() => setModalMode(null)}
                                    style={{
                                        padding: "9px 16px",
                                        borderRadius: "8px",
                                        border: "1px solid #cbd5e1",
                                        background: "#ffffff",
                                        color: "#475569",
                                        fontSize: "13px",
                                        fontWeight: 600,
                                        cursor: "pointer",
                                    }}
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={
                                        isSubmitting ||
                                        isExceedingStock ||
                                        maxAllowedStock <= 0
                                    }
                                    style={{
                                        padding: "9px 20px",
                                        borderRadius: "8px",
                                        border: "none",
                                        background:
                                            isExceedingStock ||
                                            maxAllowedStock <= 0
                                                ? "#94a3b8"
                                                : "linear-gradient(135deg, #059669 0%, #047857 100%)",
                                        color: "#ffffff",
                                        fontSize: "13px",
                                        fontWeight: 700,
                                        cursor:
                                            isSubmitting ||
                                            isExceedingStock ||
                                            maxAllowedStock <= 0
                                                ? "not-allowed"
                                                : "pointer",
                                    }}
                                >
                                    {isSubmitting
                                        ? "Menyimpan..."
                                        : isExceedingStock
                                          ? "Berat Melebihi Stok"
                                          : maxAllowedStock <= 0
                                            ? "Stok Habis"
                                            : modalMode === "create"
                                              ? "Simpan Penjualan"
                                              : "Simpan Perubahan"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL CONFIRM DELETE */}
            {modalMode === "delete" && selectedItem && (
                <div
                    style={{
                        position: "fixed",
                        inset: 0,
                        background: "rgba(15, 23, 42, 0.6)",
                        backdropFilter: "blur(4px)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 9999,
                        padding: "20px",
                    }}
                >
                    <div
                        style={{
                            background: "#ffffff",
                            borderRadius: "16px",
                            maxWidth: "420px",
                            width: "100%",
                            padding: "24px",
                            textAlign: "center",
                        }}
                    >
                        <div
                            style={{
                                background: "#fff1f2",
                                width: "48px",
                                height: "48px",
                                borderRadius: "50%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                margin: "0 auto 14px auto",
                            }}
                        >
                            <Trash2 size={24} color="#e11d48" />
                        </div>
                        <h4
                            style={{
                                margin: "0 0 8px 0",
                                fontSize: "16px",
                                fontWeight: 800,
                                color: "#0f172a",
                            }}
                        >
                            Hapus Data Penjualan?
                        </h4>
                        <p
                            style={{
                                margin: "0 0 20px 0",
                                fontSize: "13px",
                                color: "#64748b",
                            }}
                        >
                            Penjualan{" "}
                            <b>
                                {selectedItem.kategori} ({selectedItem.berat_kg}{" "}
                                kg)
                            </b>{" "}
                            ke <b>{selectedItem.pembeli}</b> senilai{" "}
                            <b>{formatRupiah(selectedItem.total_pendapatan)}</b>{" "}
                            akan dihapus secara permanen.
                        </p>
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "center",
                                gap: "10px",
                            }}
                        >
                            <button
                                type="button"
                                onClick={() => setModalMode(null)}
                                style={{
                                    padding: "9px 18px",
                                    borderRadius: "8px",
                                    border: "1px solid #cbd5e1",
                                    background: "#ffffff",
                                    color: "#475569",
                                    fontSize: "13px",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                }}
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={handleDelete}
                                disabled={isSubmitting}
                                style={{
                                    padding: "9px 20px",
                                    borderRadius: "8px",
                                    border: "none",
                                    background: "#dc2626",
                                    color: "#ffffff",
                                    fontSize: "13px",
                                    fontWeight: 700,
                                    cursor: isSubmitting
                                        ? "not-allowed"
                                        : "pointer",
                                }}
                            >
                                {isSubmitting
                                    ? "Menghapus..."
                                    : "Ya, Hapus Data"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
