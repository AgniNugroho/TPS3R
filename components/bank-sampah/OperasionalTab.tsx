"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Plus, Search, Edit2, Trash2, Fuel, Zap, Utensils, Wrench, Receipt, Calendar, AlertCircle } from "lucide-react";
import { showErrorToast, showSuccessToast } from "@/components/ui/Toast";

type OperasionalRow = {
    id: string;
    desa_id: string;
    periode_bulan: string;
    tanggal: string;
    kategori: "BBM" | "Listrik" | "Dapur / Konsumsi" | "Pemeliharaan Mesin" | "Lainnya";
    keterangan: string;
    nominal: number;
};

type Props = {
    selectedDesaId: string;
};

const KATEGORI_OPTIONS: OperasionalRow["kategori"][] = [
    "BBM",
    "Listrik",
    "Dapur / Konsumsi",
    "Pemeliharaan Mesin",
    "Lainnya",
];

function formatRupiah(num: number): string {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(num);
}

function formatTglIndo(isoStr: string): string {
    if (!isoStr) return "-";
    const parts = isoStr.slice(0, 10).split("-");
    if (parts.length < 3) return isoStr;
    const d = parseInt(parts[2], 10);
    const m = parseInt(parts[1], 10);
    const y = parts[0];
    const namaBulan = [
        "",
        "Januari",
        "Februari",
        "Maret",
        "April",
        "Mei",
        "Juni",
        "Juli",
        "Agustus",
        "September",
        "Oktober",
        "November",
        "Desember",
    ];
    return `${d} ${namaBulan[m] || parts[1]} ${y}`;
}

export default function OperasionalTab({ selectedDesaId }: Props) {
    const [periodeBulan, setPeriodeBulan] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    });

    const [items, setItems] = useState<OperasionalRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterKategori, setFilterKategori] = useState<string>("all");

    // Modal state
    const [modalMode, setModalMode] = useState<"create" | "edit" | "delete" | null>(null);
    const [editItem, setEditItem] = useState<OperasionalRow | null>(null);
    const [deleteItem, setDeleteItem] = useState<OperasionalRow | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [form, setForm] = useState({
        tanggal: new Date().toISOString().slice(0, 10),
        kategori: "BBM" as OperasionalRow["kategori"],
        keterangan: "",
        nominal: "",
    });

    const fetchOperasional = useCallback(async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams({
                periode_bulan: periodeBulan,
            });
            if (selectedDesaId && selectedDesaId !== "all") {
                params.set("desa_id", selectedDesaId);
            }
            if (filterKategori !== "all") {
                params.set("kategori", filterKategori);
            }
            if (searchQuery.trim()) {
                params.set("search", searchQuery.trim());
            }

            const res = await fetch(`/api/operasional-tps3r?${params.toString()}`);
            const data = await res.json();
            if (!data.ok) {
                if (data.error && data.error.includes("PGRST205")) {
                    setItems([]);
                    return;
                }
                throw new Error(data.error || "Gagal mengambil data operasional.");
            }
            const list: OperasionalRow[] = Array.isArray(data.rows)
                ? data.rows
                : Array.isArray(data.data)
                ? data.data
                : [];
            setItems(list);
        } catch (err) {
            showErrorToast(err instanceof Error ? err.message : "Terjadi kesalahan saat memuat data operasional.");
        } finally {
            setIsLoading(false);
        }
    }, [selectedDesaId, periodeBulan, filterKategori, searchQuery]);

    useEffect(() => {
        void Promise.resolve().then(() => fetchOperasional());
    }, [fetchOperasional]);

    // KPI Metrics
    const metrics = useMemo(() => {
        let total = 0;
        let bbm = 0;
        let listrik = 0;
        let dapur = 0;
        let mesin = 0;
        let lainnya = 0;

        items.forEach((item) => {
            const n = Number(item.nominal) || 0;
            total += n;
            if (item.kategori === "BBM") bbm += n;
            else if (item.kategori === "Listrik") listrik += n;
            else if (item.kategori === "Dapur / Konsumsi") dapur += n;
            else if (item.kategori === "Pemeliharaan Mesin") mesin += n;
            else lainnya += n;
        });

        return { total, bbm, listrik, dapur, mesin, lainnya };
    }, [items]);

    function openCreateModal() {
        setEditItem(null);
        setForm({
            tanggal: new Date().toISOString().slice(0, 10),
            kategori: "BBM",
            keterangan: "",
            nominal: "",
        });
        setModalMode("create");
    }

    function openEditModal(row: OperasionalRow) {
        setEditItem(row);
        setForm({
            tanggal: row.tanggal.slice(0, 10),
            kategori: row.kategori,
            keterangan: row.keterangan,
            nominal: String(row.nominal),
        });
        setModalMode("edit");
    }

    function openDeleteModal(row: OperasionalRow) {
        setDeleteItem(row);
        setModalMode("delete");
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const nom = parseInt(form.nominal, 10);
        if (isNaN(nom) || nom <= 0) {
            showErrorToast("Nominal biaya harus berupa angka lebih dari 0.");
            return;
        }
        if (!form.keterangan.trim()) {
            showErrorToast("Keterangan pengeluaran wajib diisi.");
            return;
        }

        setIsSubmitting(true);
        try {
            // Periode bulan derived from tanggal
            const derivedPeriode = form.tanggal.slice(0, 7);

            if (modalMode === "create") {
                const res = await fetch("/api/operasional-tps3r", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        desa_id: selectedDesaId,
                        periode_bulan: derivedPeriode,
                        tanggal: form.tanggal,
                        kategori: form.kategori,
                        keterangan: form.keterangan.trim(),
                        nominal: nom,
                    }),
                });
                const data = await res.json();
                if (!data.ok) throw new Error(data.error);
                showSuccessToast("Biaya operasional berhasil dicatat.");
                if (derivedPeriode !== periodeBulan) {
                    setPeriodeBulan(derivedPeriode);
                }
            } else if (modalMode === "edit" && editItem) {
                const res = await fetch("/api/operasional-tps3r", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        id: editItem.id,
                        tanggal: form.tanggal,
                        kategori: form.kategori,
                        keterangan: form.keterangan.trim(),
                        nominal: nom,
                    }),
                });
                const data = await res.json();
                if (!data.ok) throw new Error(data.error);
                showSuccessToast("Data operasional berhasil diperbarui.");
            }

            setModalMode(null);
            await fetchOperasional();
        } catch (err) {
            showErrorToast(err instanceof Error ? err.message : "Gagal menyimpan pengeluaran operasional.");
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleDeleteConfirm() {
        if (!deleteItem) return;
        setIsSubmitting(true);
        try {
            const res = await fetch(`/api/operasional-tps3r?id=${deleteItem.id}`, {
                method: "DELETE",
            });
            const data = await res.json();
            if (!data.ok) throw new Error(data.error);
            showSuccessToast("Data pengeluaran berhasil dihapus.");
            setModalMode(null);
            setDeleteItem(null);
            await fetchOperasional();
        } catch (err) {
            showErrorToast(err instanceof Error ? err.message : "Gagal menghapus pengeluaran.");
        } finally {
            setIsSubmitting(false);
        }
    }

    const getKategoriBadge = (kategori: string) => {
        switch (kategori) {
            case "BBM":
                return (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "4px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: 700, background: "#fef3c7", color: "#b45309" }}>
                        <Fuel size={12} /> BBM
                    </span>
                );
            case "Listrik":
                return (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "4px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: 700, background: "#e0f2fe", color: "#0369a1" }}>
                        <Zap size={12} /> Listrik
                    </span>
                );
            case "Dapur / Konsumsi":
                return (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "4px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: 700, background: "#dcfce7", color: "#15803d" }}>
                        <Utensils size={12} /> Dapur / Konsumsi
                    </span>
                );
            case "Pemeliharaan Mesin":
                return (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "4px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: 700, background: "#ede9fe", color: "#6d28d9" }}>
                        <Wrench size={12} /> Perawatan Mesin
                    </span>
                );
            default:
                return (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "4px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: 700, background: "#f1f5f9", color: "#475569" }}>
                        <Receipt size={12} /> {kategori}
                    </span>
                );
        }
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* KPI Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
                <div style={{ background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)", color: "#fff", padding: "18px 20px", borderRadius: "14px", border: "1px solid #334155", boxShadow: "0 4px 12px rgba(0,0,0,0.06)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                        <span style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#94a3b8", fontWeight: 600 }}>Total Biaya Operasional</span>
                        <div style={{ background: "rgba(255,255,255,0.1)", padding: "6px", borderRadius: "8px" }}>
                            <Receipt size={18} color="#38bdf8" />
                        </div>
                    </div>
                    <div style={{ fontSize: "24px", fontWeight: 800, letterSpacing: "-0.02em", color: "#f8fafc" }}>
                        {formatRupiah(metrics.total)}
                    </div>
                    <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "6px" }}>
                        Periode {periodeBulan} ({items.length} transaksi)
                    </div>
                </div>

                <div style={{ background: "#ffffff", padding: "18px 20px", borderRadius: "14px", border: "1px solid #e2e8f0", boxShadow: "0 2px 6px rgba(0,0,0,0.02)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                        <span style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#64748b", fontWeight: 600 }}>BBM Operasional</span>
                        <div style={{ background: "#fef3c7", padding: "6px", borderRadius: "8px" }}>
                            <Fuel size={18} color="#d97706" />
                        </div>
                    </div>
                    <div style={{ fontSize: "22px", fontWeight: 800, color: "#d97706" }}>
                        {formatRupiah(metrics.bbm)}
                    </div>
                    <div style={{ fontSize: "11px", color: "#64748b", marginTop: "6px" }}>
                        Armada angkutan & kendaraan TPS
                    </div>
                </div>

                <div style={{ background: "#ffffff", padding: "18px 20px", borderRadius: "14px", border: "1px solid #e2e8f0", boxShadow: "0 2px 6px rgba(0,0,0,0.02)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                        <span style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#64748b", fontWeight: 600 }}>Listrik & Mesin</span>
                        <div style={{ background: "#e0f2fe", padding: "6px", borderRadius: "8px" }}>
                            <Zap size={18} color="#0284c7" />
                        </div>
                    </div>
                    <div style={{ fontSize: "22px", fontWeight: 800, color: "#0284c7" }}>
                        {formatRupiah(metrics.listrik + metrics.mesin)}
                    </div>
                    <div style={{ fontSize: "11px", color: "#64748b", marginTop: "6px" }}>
                        Listrik kantor & servis mesin cacah
                    </div>
                </div>

                <div style={{ background: "#ffffff", padding: "18px 20px", borderRadius: "14px", border: "1px solid #e2e8f0", boxShadow: "0 2px 6px rgba(0,0,0,0.02)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                        <span style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#64748b", fontWeight: 600 }}>Dapur / Konsumsi</span>
                        <div style={{ background: "#dcfce7", padding: "6px", borderRadius: "8px" }}>
                            <Utensils size={18} color="#16a34a" />
                        </div>
                    </div>
                    <div style={{ fontSize: "22px", fontWeight: 800, color: "#16a34a" }}>
                        {formatRupiah(metrics.dapur)}
                    </div>
                    <div style={{ fontSize: "11px", color: "#64748b", marginTop: "6px" }}>
                        Konsumsi harian pekerja pilah
                    </div>
                </div>
            </div>

            {/* Filter & Action Bar */}
            <div style={{ background: "#ffffff", padding: "16px 20px", borderRadius: "14px", border: "1px solid #e2e8f0", display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center", flex: 1 }}>
                    {/* Period Picker */}
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "#f8fafc", padding: "6px 12px", borderRadius: "8px", border: "1px solid #cbd5e1" }}>
                        <Calendar size={15} color="#64748b" />
                        <span style={{ fontSize: "12px", fontWeight: 600, color: "#475569" }}>Periode:</span>
                        <input
                            type="month"
                            value={periodeBulan}
                            onChange={(e) => setPeriodeBulan(e.target.value)}
                            style={{ border: "none", background: "transparent", fontSize: "13px", fontWeight: 700, color: "#0f172a", outline: "none", cursor: "pointer" }}
                        />
                    </div>

                    {/* Search */}
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "#f8fafc", padding: "6px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", minWidth: "220px", flex: 1, maxWidth: "340px" }}>
                        <Search size={15} color="#94a3b8" />
                        <input
                            type="text"
                            placeholder="Cari keterangan..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{ border: "none", background: "transparent", fontSize: "13px", color: "#0f172a", outline: "none", width: "100%" }}
                        />
                    </div>

                    {/* Filter Kategori */}
                    <select
                        value={filterKategori}
                        onChange={(e) => setFilterKategori(e.target.value)}
                        style={{ background: "#f8fafc", padding: "7px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", color: "#334155", fontWeight: 600, outline: "none" }}
                    >
                        <option value="all">Semua Kategori</option>
                        {KATEGORI_OPTIONS.map((k) => (
                            <option key={k} value={k}>{k}</option>
                        ))}
                    </select>
                </div>

                <button
                    onClick={openCreateModal}
                    style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "#059669", color: "#ffffff", padding: "9px 16px", borderRadius: "8px", border: "none", fontSize: "13px", fontWeight: 700, cursor: "pointer", boxShadow: "0 2px 6px rgba(5,150,105,0.25)" }}
                >
                    <Plus size={16} />
                    Catat Pengeluaran
                </button>
            </div>

            {/* Table */}
            <div style={{ background: "#ffffff", borderRadius: "14px", border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
                        <thead>
                            <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                                <th style={{ padding: "12px 16px", fontWeight: 700, color: "#475569", width: "50px" }}>No</th>
                                <th style={{ padding: "12px 16px", fontWeight: 700, color: "#475569" }}>Tanggal</th>
                                <th style={{ padding: "12px 16px", fontWeight: 700, color: "#475569" }}>Kategori</th>
                                <th style={{ padding: "12px 16px", fontWeight: 700, color: "#475569" }}>Keterangan</th>
                                <th style={{ padding: "12px 16px", fontWeight: 700, color: "#475569", textAlign: "right" }}>Nominal</th>
                                <th style={{ padding: "12px 16px", fontWeight: 700, color: "#475569", textAlign: "center", width: "90px" }}>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} style={{ padding: "36px", textAlign: "center", color: "#64748b" }}>
                                        Memuat data operasional...
                                    </td>
                                </tr>
                            ) : items.length === 0 ? (
                                <tr>
                                    <td colSpan={6} style={{ padding: "48px 16px", textAlign: "center" }}>
                                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", color: "#94a3b8" }}>
                                            <AlertCircle size={32} />
                                            <p style={{ fontWeight: 600, margin: 0, color: "#475569" }}>Belum ada pengeluaran operasional di periode {periodeBulan}</p>
                                            <p style={{ fontSize: "12px", margin: 0 }}>Klik &quot;Catat Pengeluaran&quot; untuk menambahkan biaya operasional.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                items.map((row, idx) => (
                                    <tr key={row.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                        <td style={{ padding: "12px 16px", color: "#64748b" }}>{idx + 1}</td>
                                        <td style={{ padding: "12px 16px", color: "#334155", fontWeight: 600 }}>
                                            {formatTglIndo(row.tanggal)}
                                        </td>
                                        <td style={{ padding: "12px 16px" }}>
                                            {getKategoriBadge(row.kategori)}
                                        </td>
                                        <td style={{ padding: "12px 16px", color: "#1e293b", fontWeight: 500 }}>
                                            {row.keterangan}
                                        </td>
                                        <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: 700, color: "#dc2626" }}>
                                            {formatRupiah(row.nominal)}
                                        </td>
                                        <td style={{ padding: "12px 16px", textAlign: "center" }}>
                                            <div style={{ display: "inline-flex", gap: "6px" }}>
                                                <button
                                                    onClick={() => openEditModal(row)}
                                                    style={{ padding: "5px", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "6px", cursor: "pointer", color: "#475569" }}
                                                    title="Edit"
                                                >
                                                    <Edit2 size={13} />
                                                </button>
                                                <button
                                                    onClick={() => openDeleteModal(row)}
                                                    style={{ padding: "5px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px", cursor: "pointer", color: "#dc2626" }}
                                                    title="Hapus"
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Create/Edit */}
            {(modalMode === "create" || modalMode === "edit") && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "16px" }}>
                    <div style={{ background: "#ffffff", borderRadius: "16px", width: "100%", maxWidth: "480px", overflow: "hidden", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" }}>
                        <div style={{ padding: "18px 20px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>
                                {modalMode === "create" ? "Catat Pengeluaran Operasional" : "Edit Pengeluaran Operasional"}
                            </h3>
                            <button onClick={() => setModalMode(null)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#64748b", fontSize: "18px" }}>×</button>
                        </div>
                        <form onSubmit={handleSubmit} style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
                            <div>
                                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                                    Tanggal Pengeluaran <span style={{ color: "#ef4444" }}>*</span>
                                </label>
                                <input
                                    type="date"
                                    value={form.tanggal}
                                    onChange={(e) => setForm((prev) => ({ ...prev, tanggal: e.target.value }))}
                                    required
                                    style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", boxSizing: "border-box" }}
                                />
                            </div>

                            <div>
                                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                                    Kategori Biaya <span style={{ color: "#ef4444" }}>*</span>
                                </label>
                                <select
                                    value={form.kategori}
                                    onChange={(e) => setForm((prev) => ({ ...prev, kategori: e.target.value as OperasionalRow["kategori"] }))}
                                    style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", boxSizing: "border-box" }}
                                >
                                    {KATEGORI_OPTIONS.map((k) => (
                                        <option key={k} value={k}>{k}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                                    Keterangan / Deskripsi Biaya <span style={{ color: "#ef4444" }}>*</span>
                                </label>
                                <textarea
                                    rows={2}
                                    placeholder="Contoh: BBM motor tossa 5 liter, token listrik kantor..."
                                    value={form.keterangan}
                                    onChange={(e) => setForm((prev) => ({ ...prev, keterangan: e.target.value }))}
                                    required
                                    style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", boxSizing: "border-box", resize: "vertical" }}
                                />
                            </div>

                            <div>
                                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                                    Nominal Pengeluaran (Rp) <span style={{ color: "#ef4444" }}>*</span>
                                </label>
                                <input
                                    type="number"
                                    min={1000}
                                    step={1000}
                                    placeholder="Contoh: 50000"
                                    value={form.nominal}
                                    onChange={(e) => setForm((prev) => ({ ...prev, nominal: e.target.value }))}
                                    required
                                    style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", boxSizing: "border-box", fontWeight: 700 }}
                                />
                            </div>

                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
                                <button
                                    type="button"
                                    onClick={() => setModalMode(null)}
                                    disabled={isSubmitting}
                                    style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid #cbd5e1", background: "#ffffff", fontSize: "13px", fontWeight: 600, color: "#475569", cursor: "pointer" }}
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    style={{ padding: "8px 16px", borderRadius: "8px", border: "none", background: "#059669", fontSize: "13px", fontWeight: 700, color: "#ffffff", cursor: "pointer" }}
                                >
                                    {isSubmitting ? "Menyimpan..." : "Simpan Pengeluaran"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Delete */}
            {modalMode === "delete" && deleteItem && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "16px" }}>
                    <div style={{ background: "#ffffff", borderRadius: "16px", width: "100%", maxWidth: "420px", padding: "24px", textAlign: "center" }}>
                        <div style={{ width: "48px", height: "48px", borderRadius: "24px", background: "#fef2f2", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: "16px" }}>
                            <Trash2 size={24} color="#dc2626" />
                        </div>
                        <h3 style={{ margin: "0 0 8px 0", fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>Hapus Pengeluaran Ini?</h3>
                        <p style={{ margin: "0 0 20px 0", fontSize: "13px", color: "#64748b" }}>
                            Pengeluaran <strong>&quot;{deleteItem.keterangan}&quot;</strong> sebesar <strong>{formatRupiah(deleteItem.nominal)}</strong> akan dihapus permanen.
                        </p>
                        <div style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
                            <button
                                onClick={() => setModalMode(null)}
                                disabled={isSubmitting}
                                style={{ padding: "8px 18px", borderRadius: "8px", border: "1px solid #cbd5e1", background: "#ffffff", fontSize: "13px", fontWeight: 600, color: "#475569", cursor: "pointer" }}
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleDeleteConfirm}
                                disabled={isSubmitting}
                                style={{ padding: "8px 18px", borderRadius: "8px", border: "none", background: "#dc2626", fontSize: "13px", fontWeight: 700, color: "#ffffff", cursor: "pointer" }}
                            >
                                {isSubmitting ? "Menghapus..." : "Ya, Hapus"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
