"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Plus, Search, Edit2, Trash2, Banknote, Calendar, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { showErrorToast, showSuccessToast } from "@/components/ui/Toast";
import type { MemberItem } from "@/app/(dashboard)/bank-sampah/page";

type WilayahItem = {
    id: string;
    kode: string;
    dusun: string;
    rt: string | null;
    rw: string | null;
    jumlah_kk?: number | null;
    jumlah_jiwa?: number | null;
    status?: string | null;
};

type PaymentRow = {
    id: string;
    desa_id: string;
    member_id?: string | null;
    wilayah_id?: string | null;
    periode_bulan: string;
    tanggal_bayar: string;
    nominal: number;
    metode_pembayaran: "Cash" | "Transfer";
    status: "Lunas" | "Pending";
    catatan?: string | null;
    member?: {
        id: string;
        kode_member?: string | null;
        nama: string;
        wilayah?: {
            id: string;
            dusun: string;
            rt: string | null;
            rw: string | null;
        } | null;
    } | null;
    wilayah?: {
        id: string;
        kode: string;
        dusun: string;
        rt: string | null;
        rw: string | null;
        jumlah_kk?: number | null;
        jumlah_jiwa?: number | null;
    } | null;
};

type Props = {
    selectedDesaId: string;
    members: MemberItem[];
    wilayahList?: WilayahItem[];
    isDesaDukun?: boolean;
    desaName?: string;
};

export default function IuranMemberTab({
    selectedDesaId,
    members,
    wilayahList = [],
    isDesaDukun = true,
}: Props) {
    const [periodeBulan, setPeriodeBulan] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    });

    const [payments, setPayments] = useState<PaymentRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterMetode, setFilterMetode] = useState<string>("all");
    const [filterStatus, setFilterStatus] = useState<string>("all");

    // Modal state
    const [modalMode, setModalMode] = useState<"create" | "edit" | "delete" | null>(null);
    const [editItem, setEditItem] = useState<PaymentRow | null>(null);
    const [deleteItem, setDeleteItem] = useState<PaymentRow | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [form, setForm] = useState({
        member_id: "",
        wilayah_id: "",
        periode_bulan: periodeBulan,
        tanggal_bayar: new Date().toISOString().slice(0, 10),
        nominal: "20000",
        metode_pembayaran: "Cash" as "Cash" | "Transfer",
        status: "Lunas" as "Lunas" | "Pending",
        catatan: "",
    });

    // Fetch payments
    const loadPayments = useCallback(async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams({ periode_bulan: periodeBulan });
            if (selectedDesaId && selectedDesaId !== "all") {
                params.set("desa_id", selectedDesaId);
            }
            const res = await fetch(`/api/pembayaran-member?${params.toString()}`);
            const data = await res.json();
            const list: PaymentRow[] = Array.isArray(data.rows)
                ? data.rows
                : Array.isArray(data.data)
                ? data.data
                : [];
            setPayments(list);
        } catch (err) {
            showErrorToast(err instanceof Error ? err.message : "Gagal memuat data pembayaran.");
        } finally {
            setIsLoading(false);
        }
    }, [selectedDesaId, periodeBulan]);

    useEffect(() => {
        void Promise.resolve().then(() => loadPayments());
    }, [loadPayments]);

    // KPI Metrics
    const kpi = useMemo(() => {
        const totalUang = payments.reduce((acc, p) => acc + Number(p.nominal || 0), 0);
        const cashTotal = payments
            .filter((p) => p.metode_pembayaran === "Cash")
            .reduce((acc, p) => acc + Number(p.nominal || 0), 0);
        const transferTotal = payments
            .filter((p) => p.metode_pembayaran === "Transfer")
            .reduce((acc, p) => acc + Number(p.nominal || 0), 0);
        const lunasCount = payments.filter((p) => p.status === "Lunas").length;

        if (isDesaDukun) {
            const paidMemberIds = new Set(
                payments.filter((p) => p.status === "Lunas").map((p) => p.member_id)
            );
            const unpaidCount = members.filter(
                (m) => m.status === "Aktif" && !paidMemberIds.has(m.id)
            ).length;

            return {
                totalUang,
                cashTotal,
                transferTotal,
                lunasCount,
                unpaidCount,
                totalEntities: members.filter((m) => m.status === "Aktif").length,
                entityLabel: "Member",
            };
        } else {
            const paidWilayahIds = new Set(
                payments.filter((p) => p.status === "Lunas").map((p) => p.wilayah_id)
            );
            const activeWilayah = wilayahList.filter(
                (w) => !w.status || w.status.toLowerCase() === "aktif"
            );
            const unpaidCount = activeWilayah.filter(
                (w) => !paidWilayahIds.has(w.id)
            ).length;

            return {
                totalUang,
                cashTotal,
                transferTotal,
                lunasCount,
                unpaidCount,
                totalEntities: activeWilayah.length,
                entityLabel: "Dusun",
            };
        }
    }, [payments, members, wilayahList, isDesaDukun]);

    // Filtered rows
    const filteredPayments = useMemo(() => {
        return payments.filter((p) => {
            const q = searchQuery.toLowerCase().trim();
            const matchQuery =
                !q ||
                p.member?.nama?.toLowerCase().includes(q) ||
                p.member?.kode_member?.toLowerCase().includes(q) ||
                p.member?.wilayah?.dusun?.toLowerCase().includes(q) ||
                p.wilayah?.dusun?.toLowerCase().includes(q) ||
                p.wilayah?.kode?.toLowerCase().includes(q) ||
                (p.catatan && p.catatan.toLowerCase().includes(q));

            const matchMetode = filterMetode === "all" || p.metode_pembayaran === filterMetode;
            const matchStatus = filterStatus === "all" || p.status === filterStatus;

            return matchQuery && matchMetode && matchStatus;
        });
    }, [payments, searchQuery, filterMetode, filterStatus]);

    // Handlers
    function openCreateModal() {
        setEditItem(null);
        setForm({
            member_id: isDesaDukun ? members[0]?.id || "" : "",
            wilayah_id: !isDesaDukun ? wilayahList[0]?.id || "" : "",
            periode_bulan: periodeBulan,
            tanggal_bayar: new Date().toISOString().slice(0, 10),
            nominal: "20000",
            metode_pembayaran: "Cash",
            status: "Lunas",
            catatan: "",
        });
        setModalMode("create");
    }

    function openEditModal(item: PaymentRow) {
        setEditItem(item);
        setForm({
            member_id: item.member_id || "",
            wilayah_id: item.wilayah_id || "",
            periode_bulan: item.periode_bulan,
            tanggal_bayar: item.tanggal_bayar,
            nominal: String(item.nominal),
            metode_pembayaran: item.metode_pembayaran,
            status: item.status,
            catatan: item.catatan || "",
        });
        setModalMode("edit");
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const nom = parseInt(form.nominal, 10);
        if (isNaN(nom) || nom <= 0) {
            showErrorToast("Nominal pembayaran harus berupa angka lebih dari 0.");
            return;
        }

        if (isDesaDukun && !form.member_id) {
            showErrorToast("Silakan pilih member terlebih dahulu.");
            return;
        }

        if (!isDesaDukun && !form.wilayah_id) {
            showErrorToast("Silakan pilih dusun terlebih dahulu.");
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = {
                desa_id: selectedDesaId,
                member_id: isDesaDukun ? form.member_id || null : null,
                wilayah_id: !isDesaDukun ? form.wilayah_id || null : null,
                periode_bulan: form.periode_bulan,
                tanggal_bayar: form.tanggal_bayar,
                nominal: nom,
                metode_pembayaran: form.metode_pembayaran,
                status: form.status,
                catatan: form.catatan.trim(),
            };

            if (modalMode === "create") {
                const res = await fetch("/api/pembayaran-member", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });
                const data = await res.json();
                if (!data.ok) throw new Error(data.error);
                showSuccessToast(
                    isDesaDukun
                        ? "Pembayaran iuran member berhasil dicatat."
                        : "Pembayaran iuran dusun berhasil dicatat."
                );
                if (form.periode_bulan !== periodeBulan) {
                    setPeriodeBulan(form.periode_bulan);
                }
            } else if (modalMode === "edit" && editItem) {
                const res = await fetch("/api/pembayaran-member", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        id: editItem.id,
                        nominal: nom,
                        metode_pembayaran: form.metode_pembayaran,
                        tanggal_bayar: form.tanggal_bayar,
                        status: form.status,
                        catatan: form.catatan.trim(),
                        member_id: isDesaDukun ? form.member_id || null : null,
                        wilayah_id: !isDesaDukun ? form.wilayah_id || null : null,
                    }),
                });
                const data = await res.json();
                if (!data.ok) throw new Error(data.error);
                showSuccessToast("Data pembayaran berhasil diperbarui.");
            }

            setModalMode(null);
            await loadPayments();
        } catch (err) {
            showErrorToast(err instanceof Error ? err.message : "Gagal menyimpan pembayaran.");
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleDelete() {
        if (!deleteItem) return;
        setIsSubmitting(true);
        try {
            const res = await fetch(`/api/pembayaran-member?id=${deleteItem.id}`, { method: "DELETE" });
            const data = await res.json();
            if (!data.ok) throw new Error(data.error);
            showSuccessToast("Catatan pembayaran berhasil dihapus.");
            setModalMode(null);
            setDeleteItem(null);
            await loadPayments();
        } catch (err) {
            showErrorToast(err instanceof Error ? err.message : "Gagal menghapus pembayaran.");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Periode Banner */}
            <div style={{
                background: "white",
                padding: "16px 20px",
                borderRadius: "14px",
                border: "1px solid var(--line)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "16px"
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <Calendar size={18} color="var(--teal)" />
                        <span style={{ fontSize: "13px", fontWeight: 700, color: "#1a2522" }}>Periode Bulan:</span>
                    </div>
                    <input
                        type="month"
                        value={periodeBulan}
                        onChange={(e) => setPeriodeBulan(e.target.value)}
                        style={{
                            padding: "8px 12px",
                            borderRadius: "8px",
                            border: "1px solid var(--line)",
                            fontSize: "13px",
                            fontWeight: 700,
                            color: "var(--teal)",
                            background: "#f8faf9",
                            outline: "none"
                        }}
                    />
                    <span style={{ fontSize: "12px", color: "#62736d", background: "#f0fdf4", padding: "4px 10px", borderRadius: "100px", border: "1px solid #bbf7d0" }}>
                        💡 Pembayaran iuran rutin {isDesaDukun ? "member" : "dusun"} dilakukan tgl <strong>1–7 awal bulan</strong>.
                    </span>
                </div>

                <button
                    type="button"
                    onClick={openCreateModal}
                    className="btn-primary-clean"
                    style={{ padding: "10px 18px", borderRadius: "8px", fontSize: "13px" }}
                >
                    <Plus size={15} />
                    <span>Catat Iuran {isDesaDukun ? "Member" : "Dusun"}</span>
                </button>
            </div>

            {/* KPI Cards */}
            <div className="kpi-grid-clean">
                <div className="kpi-card-clean">
                    <div className="kpi-icon-wrap-clean kpi-icon-green">
                        <Banknote size={20} />
                    </div>
                    <div className="kpi-text-clean">
                        <span className="kpi-label-clean">Total Iuran Terkumpul</span>
                        <span className="kpi-value-clean">
                            Rp {kpi.totalUang.toLocaleString("id-ID")}
                        </span>
                    </div>
                </div>

                <div className="kpi-card-clean">
                    <div className="kpi-icon-wrap-clean kpi-icon-blue">
                        <CheckCircle2 size={20} />
                    </div>
                    <div className="kpi-text-clean">
                        <span className="kpi-label-clean">{kpi.entityLabel} Sudah Bayar</span>
                        <span className="kpi-value-clean">
                            {kpi.lunasCount} <span className="kpi-unit-clean">/ {kpi.totalEntities} {kpi.entityLabel.toLowerCase()}</span>
                        </span>
                    </div>
                </div>

                <div className="kpi-card-clean">
                    <div className="kpi-icon-wrap-clean" style={{ background: "#fef3c7", color: "#b45309" }}>
                        <Clock size={20} />
                    </div>
                    <div className="kpi-text-clean">
                        <span className="kpi-label-clean">{kpi.entityLabel} Belum Bayar</span>
                        <span className="kpi-value-clean">
                            {kpi.unpaidCount} <span className="kpi-unit-clean">{isDesaDukun ? "orang" : "dusun"}</span>
                        </span>
                    </div>
                </div>

                <div className="kpi-card-clean">
                    <div className="kpi-icon-wrap-clean" style={{ background: "#f0fdf4", color: "var(--teal)" }}>
                        <Banknote size={20} />
                    </div>
                    <div className="kpi-text-clean">
                        <span className="kpi-label-clean">Metode Pembayaran</span>
                        <div style={{ fontSize: "13px", fontWeight: 700, color: "#1a2522", marginTop: "2px" }}>
                            Cash: Rp {kpi.cashTotal.toLocaleString("id-ID")}
                        </div>
                        <div style={{ fontSize: "11px", color: "#64748b" }}>
                            Transfer: Rp {kpi.transferTotal.toLocaleString("id-ID")}
                        </div>
                    </div>
                </div>
            </div>

            {/* Toolbar Filter */}
            <div style={{
                background: "white",
                padding: "16px 20px",
                borderRadius: "14px",
                border: "1px solid var(--line)",
                display: "flex",
                gap: "12px",
                alignItems: "center",
                flexWrap: "wrap"
            }}>
                <div style={{ position: "relative", flex: 1, minWidth: "220px" }}>
                    <Search size={15} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                    <input
                        type="text"
                        placeholder={
                            isDesaDukun
                                ? "Cari nama member, kode, dusun, atau catatan..."
                                : "Cari nama dusun, kode, atau catatan..."
                        }
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                            width: "100%",
                            padding: "9px 12px 9px 36px",
                            borderRadius: "8px",
                            border: "1px solid var(--line)",
                            fontSize: "13px",
                            outline: "none"
                        }}
                    />
                </div>

                <select
                    value={filterMetode}
                    onChange={(e) => setFilterMetode(e.target.value)}
                    style={{
                        padding: "9px 14px",
                        borderRadius: "8px",
                        border: "1px solid var(--line)",
                        fontSize: "13px",
                        outline: "none",
                        background: "white",
                        cursor: "pointer"
                    }}
                >
                    <option value="all">Semua Metode (Cash / TF)</option>
                    <option value="Cash">Tunai / Cash</option>
                    <option value="Transfer">Transfer Bank / E-Wallet</option>
                </select>

                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    style={{
                        padding: "9px 14px",
                        borderRadius: "8px",
                        border: "1px solid var(--line)",
                        fontSize: "13px",
                        outline: "none",
                        background: "white",
                        cursor: "pointer"
                    }}
                >
                    <option value="all">Semua Status</option>
                    <option value="Lunas">Lunas</option>
                    <option value="Pending">Pending</option>
                </select>
            </div>

            {/* Table */}
            <div style={{ background: "white", borderRadius: "16px", border: "1px solid var(--line)", overflow: "hidden" }}>
                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                        <thead>
                            <tr style={{ background: "#f8faf9", borderBottom: "1px solid var(--line)", textAlign: "left" }}>
                                <th style={{ padding: "14px 16px", fontWeight: 700, color: "#475569" }}>No</th>
                                <th style={{ padding: "14px 16px", fontWeight: 700, color: "#475569" }}>
                                    {isDesaDukun ? "Member" : "Nama Dusun"}
                                </th>
                                <th style={{ padding: "14px 16px", fontWeight: 700, color: "#475569" }}>
                                    {isDesaDukun ? "Dusun Domisili" : "Detail Wilayah"}
                                </th>
                                <th style={{ padding: "14px 16px", fontWeight: 700, color: "#475569" }}>Tgl Bayar</th>
                                <th style={{ padding: "14px 16px", fontWeight: 700, color: "#475569" }}>Nominal</th>
                                <th style={{ padding: "14px 16px", fontWeight: 700, color: "#475569" }}>Metode</th>
                                <th style={{ padding: "14px 16px", fontWeight: 700, color: "#475569" }}>Status</th>
                                <th style={{ padding: "14px 16px", fontWeight: 700, color: "#475569" }}>Catatan</th>
                                <th style={{ padding: "14px 16px", fontWeight: 700, color: "#475569", textAlign: "right" }}>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan={9} style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
                                        Memuat data pembayaran iuran...
                                    </td>
                                </tr>
                            ) : filteredPayments.length === 0 ? (
                                <tr>
                                    <td colSpan={9} style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
                                        Belum ada data pembayaran iuran untuk periode {periodeBulan}.
                                    </td>
                                </tr>
                            ) : (
                                filteredPayments.map((row, idx) => (
                                    <tr key={row.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                        <td style={{ padding: "14px 16px", color: "#64748b" }}>{idx + 1}</td>
                                        <td style={{ padding: "14px 16px" }}>
                                            {isDesaDukun ? (
                                                <>
                                                    <div style={{ fontWeight: 700, color: "#1a2522" }}>{row.member?.nama || "Tanpa Nama"}</div>
                                                    <div style={{ fontSize: "11px", color: "#64748b" }}>{row.member?.kode_member || "-"}</div>
                                                </>
                                            ) : (
                                                <>
                                                    <div style={{ fontWeight: 700, color: "#1a2522" }}>{row.wilayah?.dusun || "Dusun"}</div>
                                                    <div style={{ fontSize: "11px", color: "#64748b" }}>{row.wilayah?.kode || "-"}</div>
                                                </>
                                            )}
                                        </td>
                                        <td style={{ padding: "14px 16px", color: "#475569" }}>
                                            {isDesaDukun ? (
                                                row.member?.wilayah?.dusun || "-"
                                            ) : (
                                                <>
                                                    <div>{row.wilayah?.rt || row.wilayah?.rw ? `RT ${row.wilayah?.rt || "-"}/RW ${row.wilayah?.rw || "-"}` : "-"}</div>
                                                    {row.wilayah?.jumlah_kk ? (
                                                        <div style={{ fontSize: "11px", color: "#64748b" }}>{row.wilayah.jumlah_kk} KK</div>
                                                    ) : null}
                                                </>
                                            )}
                                        </td>
                                        <td style={{ padding: "14px 16px", color: "#475569" }}>
                                            {new Date(row.tanggal_bayar).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                                        </td>
                                        <td style={{ padding: "14px 16px", fontWeight: 700, color: "var(--teal)" }}>
                                            Rp {Number(row.nominal || 0).toLocaleString("id-ID")}
                                        </td>
                                        <td style={{ padding: "14px 16px" }}>
                                            <span style={{
                                                padding: "3px 10px",
                                                borderRadius: "100px",
                                                fontSize: "11px",
                                                fontWeight: 700,
                                                background: row.metode_pembayaran === "Transfer" ? "#e0e7ff" : "#dcfce7",
                                                color: row.metode_pembayaran === "Transfer" ? "#4338ca" : "#15803d"
                                            }}>
                                                {row.metode_pembayaran === "Transfer" ? "Transfer (TF)" : "Tunai (Cash)"}
                                            </span>
                                        </td>
                                        <td style={{ padding: "14px 16px" }}>
                                            <span style={{
                                                padding: "3px 8px",
                                                borderRadius: "100px",
                                                fontSize: "11px",
                                                fontWeight: 700,
                                                background: row.status === "Lunas" ? "#dcfce7" : "#fef3c7",
                                                color: row.status === "Lunas" ? "#15803d" : "#b45309"
                                            }}>
                                                {row.status}
                                            </span>
                                        </td>
                                        <td style={{ padding: "14px 16px", color: "#64748b", maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                            {row.catatan || "-"}
                                        </td>
                                        <td style={{ padding: "14px 16px", textAlign: "right" }}>
                                            <div style={{ display: "inline-flex", gap: "6px" }}>
                                                <button
                                                    type="button"
                                                    onClick={() => openEditModal(row)}
                                                    style={{ padding: "6px 8px", borderRadius: "6px", border: "1px solid var(--line)", background: "white", color: "#475569", cursor: "pointer" }}
                                                    title="Edit"
                                                >
                                                    <Edit2 size={13} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setDeleteItem(row);
                                                        setModalMode("delete");
                                                    }}
                                                    style={{ padding: "6px 8px", borderRadius: "6px", border: "1px solid #fca5a5", background: "#fef2f2", color: "#dc2626", cursor: "pointer" }}
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

            {/* Modal Catat / Edit Pembayaran */}
            {(modalMode === "create" || modalMode === "edit") && (
                <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
                    <div style={{ background: "white", borderRadius: "20px", maxWidth: "500px", width: "100%", padding: "28px", boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }}>
                        <h3 style={{ margin: "0 0 20px 0", fontSize: "18px", fontWeight: 800, color: "#1a2522" }}>
                            {modalMode === "create"
                                ? `Catat Pembayaran Iuran ${isDesaDukun ? "Member" : "Dusun"}`
                                : `Edit Pembayaran ${isDesaDukun ? "Member" : "Dusun"}`}
                        </h3>

                        <form onSubmit={handleSubmit} style={{ display: "grid", gap: "16px" }}>
                            {modalMode === "create" ? (
                                <div>
                                    <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#475569", marginBottom: "6px" }}>
                                        {isDesaDukun ? "Pilih Member *" : "Pilih Dusun *"}
                                    </label>
                                    {isDesaDukun ? (
                                        <select
                                            required
                                            value={form.member_id}
                                            onChange={(e) => setForm({ ...form, member_id: e.target.value })}
                                            style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid var(--line)", fontSize: "13px", outline: "none", background: "#fbfdfb" }}
                                        >
                                            {members.length === 0 ? (
                                                <option value="">-- Belum ada member terdaftar --</option>
                                            ) : (
                                                members.map((m) => (
                                                    <option key={m.id} value={m.id}>
                                                        {m.nama} ({m.kode_member || "No-Code"}) {m.wilayah ? ` - ${m.wilayah.dusun}` : ""}
                                                    </option>
                                                ))
                                            )}
                                        </select>
                                    ) : (
                                        <select
                                            required
                                            value={form.wilayah_id}
                                            onChange={(e) => setForm({ ...form, wilayah_id: e.target.value })}
                                            style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid var(--line)", fontSize: "13px", outline: "none", background: "#fbfdfb" }}
                                        >
                                            {wilayahList.length === 0 ? (
                                                <option value="">-- Belum ada dusun terdaftar --</option>
                                            ) : (
                                                wilayahList.map((w) => (
                                                    <option key={w.id} value={w.id}>
                                                        {w.dusun} ({w.kode}) {w.rt || w.rw ? ` - RT ${w.rt || "-"}/RW ${w.rw || "-"}` : ""} {w.jumlah_kk ? ` (${w.jumlah_kk} KK)` : ""}
                                                    </option>
                                                ))
                                            )}
                                        </select>
                                    )}
                                </div>
                            ) : (
                                <div style={{ background: "#f8faf9", padding: "12px", borderRadius: "8px", border: "1px solid var(--line)" }}>
                                    <div style={{ fontSize: "11px", color: "#64748b" }}>{isDesaDukun ? "Member:" : "Dusun:"}</div>
                                    <div style={{ fontWeight: 700, fontSize: "14px", color: "#1a2522" }}>
                                        {isDesaDukun ? editItem?.member?.nama : editItem?.wilayah?.dusun}
                                    </div>
                                </div>
                            )}

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                                <div>
                                    <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#475569", marginBottom: "6px" }}>
                                        Periode Bulan *
                                    </label>
                                    <input
                                        type="month"
                                        required
                                        disabled={modalMode === "edit"}
                                        value={form.periode_bulan}
                                        onChange={(e) => setForm({ ...form, periode_bulan: e.target.value })}
                                        style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid var(--line)", fontSize: "13px", outline: "none", background: modalMode === "edit" ? "#f1f5f9" : "#fbfdfb" }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#475569", marginBottom: "6px" }}>
                                        Tanggal Bayar *
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={form.tanggal_bayar}
                                        onChange={(e) => setForm({ ...form, tanggal_bayar: e.target.value })}
                                        style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid var(--line)", fontSize: "13px", outline: "none", background: "#fbfdfb" }}
                                    />
                                </div>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                                <div>
                                    <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#475569", marginBottom: "6px" }}>
                                        Nominal (Rp) *
                                    </label>
                                    <input
                                        type="number"
                                        min={1000}
                                        step={1000}
                                        required
                                        placeholder="20000"
                                        value={form.nominal}
                                        onChange={(e) => setForm({ ...form, nominal: e.target.value })}
                                        style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid var(--line)", fontSize: "13px", outline: "none", background: "#fbfdfb" }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#475569", marginBottom: "6px" }}>
                                        Status Pembayaran *
                                    </label>
                                    <select
                                        value={form.status}
                                        onChange={(e) => setForm({ ...form, status: e.target.value as "Lunas" | "Pending" })}
                                        style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid var(--line)", fontSize: "13px", outline: "none", background: "#fbfdfb" }}
                                    >
                                        <option value="Lunas">Lunas</option>
                                        <option value="Pending">Pending</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#475569", marginBottom: "6px" }}>
                                    Metode Pembayaran *
                                </label>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                                    <button
                                        type="button"
                                        onClick={() => setForm({ ...form, metode_pembayaran: "Cash" })}
                                        style={{
                                            padding: "10px",
                                            borderRadius: "8px",
                                            border: form.metode_pembayaran === "Cash" ? "2px solid var(--teal)" : "1px solid var(--line)",
                                            background: form.metode_pembayaran === "Cash" ? "#f0fdf9" : "white",
                                            color: form.metode_pembayaran === "Cash" ? "var(--teal)" : "#475569",
                                            fontWeight: 700,
                                            fontSize: "13px",
                                            cursor: "pointer"
                                        }}
                                    >
                                        💵 Tunai (Cash)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setForm({ ...form, metode_pembayaran: "Transfer" })}
                                        style={{
                                            padding: "10px",
                                            borderRadius: "8px",
                                            border: form.metode_pembayaran === "Transfer" ? "2px solid #4338ca" : "1px solid var(--line)",
                                            background: form.metode_pembayaran === "Transfer" ? "#e0e7ff" : "white",
                                            color: form.metode_pembayaran === "Transfer" ? "#4338ca" : "#475569",
                                            fontWeight: 700,
                                            fontSize: "13px",
                                            cursor: "pointer"
                                        }}
                                    >
                                        🏦 Transfer (TF)
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#475569", marginBottom: "6px" }}>
                                    Catatan Tambahan (Opsional)
                                </label>
                                <input
                                    type="text"
                                    placeholder="Contoh: dititipkan ke Pak RT, via BCA, dll."
                                    value={form.catatan}
                                    onChange={(e) => setForm({ ...form, catatan: e.target.value })}
                                    style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid var(--line)", fontSize: "13px", outline: "none", background: "#fbfdfb" }}
                                />
                            </div>

                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
                                <button
                                    type="button"
                                    onClick={() => setModalMode(null)}
                                    className="secondary-button"
                                    style={{ fontSize: "13px" }}
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="primary-button"
                                    style={{ fontSize: "13px" }}
                                >
                                    {isSubmitting ? "Menyimpan..." : "Simpan Pembayaran"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Hapus */}
            {modalMode === "delete" && deleteItem && (
                <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
                    <div style={{ background: "white", borderRadius: "18px", maxWidth: "420px", width: "100%", padding: "24px" }}>
                        <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "#fee2e2", color: "#dc2626", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "14px" }}>
                            <AlertCircle size={22} />
                        </div>
                        <h4 style={{ margin: "0 0 8px 0", fontSize: "16px", fontWeight: 800, color: "#1a2522" }}>
                            Hapus Pembayaran {isDesaDukun ? "Member" : "Dusun"}?
                        </h4>
                        <p style={{ margin: "0 0 20px 0", fontSize: "13px", color: "#64748b", lineHeight: 1.5 }}>
                            Anda yakin ingin menghapus data pembayaran{" "}
                            <strong>
                                {isDesaDukun ? deleteItem.member?.nama : deleteItem.wilayah?.dusun}
                            </strong>{" "}
                            sebesar <strong>Rp {Number(deleteItem.nominal || 0).toLocaleString("id-ID")}</strong> pada periode {deleteItem.periode_bulan}?
                        </p>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                            <button type="button" onClick={() => setModalMode(null)} className="secondary-button" style={{ fontSize: "13px" }}>
                                Batal
                            </button>
                            <button type="button" onClick={handleDelete} disabled={isSubmitting} className="btn-danger-clean" style={{ fontSize: "13px" }}>
                                {isSubmitting ? "Menghapus..." : "Hapus"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
