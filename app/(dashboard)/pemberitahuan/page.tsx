"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
    AlertCircle,
    AlertTriangle,
    Archive,
    Calendar,
    CheckCircle,
    Edit3,
    Eye,
    Info,
    Loader2,
    Megaphone,
    Plus,
    RefreshCw,
    Search,
    Trash2,
    X,
} from "lucide-react";
import FormShell from "@/components/dashboard/FormShell";
import EmptyState from "@/components/dashboard/EmptyState";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { showErrorToast, showSuccessToast } from "@/components/ui/Toast";

type Pemberitahuan = {
    id: string;
    desa_id: string;
    judul: string;
    isi: string;
    kategori: string;
    tingkat_urgensi: "Penting" | "Normal" | "Info";
    status: "Aktif" | "Diarsipkan";
    tanggal_mulai: string;
    tanggal_selesai: string | null;
    author_id: string | null;
    created_at: string;
    updated_at: string;
    desa?: { id: string; nama: string };
    petugas?: { id: string; nama: string };
};

type Desa = { id: string; nama: string };
type ModalMode = "create" | "edit" | "delete" | "preview" | null;

const initialForm = {
    id: "",
    judul: "",
    isi: "",
    kategori: "Operasional",
    tingkat_urgensi: "Normal" as "Penting" | "Normal" | "Info",
    status: "Aktif" as "Aktif" | "Diarsipkan",
    tanggal_mulai: new Date().toISOString().slice(0, 10),
    tanggal_selesai: "",
    desa_id: "",
};

function PemberitahuanContent() {
    const searchParams = useSearchParams();
    const user = useCurrentUser();
    const queryDesaId = searchParams.get("desa_id");

    const [pemberitahuanList, setPemberitahuanList] = useState<Pemberitahuan[]>([]);
    const [desaList, setDesaList] = useState<Desa[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Filters
    const [selectedDesaFilter, setSelectedDesaFilter] = useState(queryDesaId || "all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [kategoriFilter, setKategoriFilter] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");

    // Modal state
    const [modalMode, setModalMode] = useState<ModalMode>(null);
    const [activeItem, setActiveItem] = useState<Pemberitahuan | null>(null);
    const [form, setForm] = useState(initialForm);
    const [errorMessage, setErrorMessage] = useState("");

    // Load available villages
    useEffect(() => {
        fetch("/api/public-desa")
            .then((res) => res.json())
            .then((data) => {
                if (data.ok && data.data) {
                    setDesaList(data.data);
                }
            })
            .catch(() => undefined);
    }, []);

    // Sync selectedDesaFilter with URL
    useEffect(() => {
        if (queryDesaId) {
            void Promise.resolve().then(() => setSelectedDesaFilter(queryDesaId));
        }
    }, [queryDesaId]);

    // Fetch announcements
    const loadPemberitahuan = useCallback(async () => {
        setLoading(true);
        setErrorMessage("");
        try {
            const params = new URLSearchParams();
            if (user?.role === "admin") {
                if (selectedDesaFilter && selectedDesaFilter !== "all") {
                    params.set("desa_id", selectedDesaFilter);
                }
            } else if (user?.desaId) {
                params.set("desa_id", user.desaId);
            }

            if (statusFilter !== "all") {
                params.set("status", statusFilter);
            }

            if (kategoriFilter !== "all") {
                params.set("kategori", kategoriFilter);
            }

            if (searchQuery.trim()) {
                params.set("search", searchQuery.trim());
            }

            const res = await fetch(`/api/pemberitahuan?${params.toString()}`);
            const result = await res.json();

            if (result.ok) {
                setPemberitahuanList(result.data || []);
            } else {
                setErrorMessage(result.error || "Gagal mengambil data pemberitahuan.");
            }
        } catch {
            setErrorMessage("Koneksi ke server terganggu.");
        } finally {
            setLoading(false);
        }
    }, [user, selectedDesaFilter, statusFilter, kategoriFilter, searchQuery]);

    useEffect(() => {
        if (user !== null) {
            void Promise.resolve().then(() => loadPemberitahuan());
        }
    }, [user, loadPemberitahuan]);

    // Modal triggers
    function openCreateModal() {
        setErrorMessage("");
        setForm({
            ...initialForm,
            desa_id: user?.role === "admin" ? desaList[0]?.id || "" : user?.desaId || "",
        });
        setModalMode("create");
    }

    function openEditModal(item: Pemberitahuan) {
        setErrorMessage("");
        setActiveItem(item);
        setForm({
            id: item.id,
            judul: item.judul,
            isi: item.isi,
            kategori: item.kategori,
            tingkat_urgensi: item.tingkat_urgensi,
            status: item.status,
            tanggal_mulai: item.tanggal_mulai || "",
            tanggal_selesai: item.tanggal_selesai || "",
            desa_id: item.desa_id,
        });
        setModalMode("edit");
    }

    function openDeleteModal(item: Pemberitahuan) {
        setActiveItem(item);
        setModalMode("delete");
    }

    function openPreviewModal(item: Pemberitahuan) {
        setActiveItem(item);
        setModalMode("preview");
    }

    function closeModal() {
        setModalMode(null);
        setActiveItem(null);
        setErrorMessage("");
    }

    // Submit form (Create / Edit)
    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setErrorMessage("");

        if (!form.judul.trim()) {
            setErrorMessage("Judul pemberitahuan wajib diisi.");
            return;
        }

        if (!form.isi.trim()) {
            setErrorMessage("Isi pemberitahuan wajib diisi.");
            return;
        }

        const desaTarget = user?.role === "admin" ? form.desa_id : user?.desaId;
        if (!desaTarget) {
            setErrorMessage("Desa tujuan pemberitahuan wajib dipilih.");
            return;
        }

        setSubmitting(true);
        try {
            const method = modalMode === "create" ? "POST" : "PUT";
            const payload = {
                ...form,
                desa_id: desaTarget,
            };

            const res = await fetch("/api/pemberitahuan", {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const result = await res.json();

            if (result.ok) {
                showSuccessToast(
                    modalMode === "create"
                        ? "Pemberitahuan berhasil dipublikasikan!"
                        : "Pemberitahuan berhasil diperbarui!",
                );
                closeModal();
                loadPemberitahuan();
            } else {
                setErrorMessage(result.error || "Gagal menyimpan pemberitahuan.");
            }
        } catch {
            setErrorMessage("Terjadi kesalahan jaringan.");
        } finally {
            setSubmitting(false);
        }
    }

    // Toggle Status (Aktif / Diarsipkan)
    async function handleToggleStatus(item: Pemberitahuan) {
        const nextStatus = item.status === "Aktif" ? "Diarsipkan" : "Aktif";
        try {
            const res = await fetch("/api/pemberitahuan", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: item.id, status: nextStatus }),
            });
            const result = await res.json();

            if (result.ok) {
                showSuccessToast(`Status diubah menjadi "${nextStatus}".`);
                loadPemberitahuan();
            } else {
                showErrorToast(result.error || "Gagal mengubah status.");
            }
        } catch {
            showErrorToast("Terjadi kesalahan jaringan.");
        }
    }

    // Delete announcement
    async function handleDelete() {
        if (!activeItem) return;
        setSubmitting(true);
        try {
            const res = await fetch(`/api/pemberitahuan?id=${activeItem.id}`, {
                method: "DELETE",
            });
            const result = await res.json();

            if (result.ok) {
                showSuccessToast("Pemberitahuan berhasil dihapus.");
                closeModal();
                loadPemberitahuan();
            } else {
                showErrorToast(result.error || "Gagal menghapus data.");
            }
        } catch {
            showErrorToast("Terjadi kesalahan jaringan.");
        } finally {
            setSubmitting(false);
        }
    }

    const isAdmin = user?.role === "admin";
    const totalAktif = pemberitahuanList.filter((p) => p.status === "Aktif").length;
    const totalPenting = pemberitahuanList.filter(
        (p) => p.status === "Aktif" && p.tingkat_urgensi === "Penting",
    ).length;

    return (
        <main className="content-wrap">
            {/* Page Heading */}
            <div className="page-heading">
                <div>
                    <p className="eyebrow">
                        <span className="live-dot" /> INFORMASI WARGA & MEMBER
                    </p>
                    <h1>Pemberitahuan & Pengumuman</h1>
                    <p className="heading-copy">
                        Kelola pengumuman operasional, libur TPS3R, dan pengingat iuran bulanan yang tampil di landing page publik.
                    </p>
                </div>
                <div className="heading-actions" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <button
                        type="button"
                        className="primary-button"
                        onClick={openCreateModal}
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "0 18px",
                            height: "38px",
                            borderRadius: "8px",
                            border: "none",
                            background: "var(--teal)",
                            color: "#fff",
                            fontSize: "12px",
                            fontWeight: 700,
                            cursor: "pointer",
                            boxShadow: "0 4px 12px rgba(11, 143, 130, 0.2)",
                        }}
                    >
                        <Plus size={16} />
                        <span>Buat Pemberitahuan</span>
                    </button>
                    <button
                        type="button"
                        className="secondary-button"
                        onClick={() => void loadPemberitahuan()}
                        disabled={loading}
                        title="Segarkan data"
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "0 16px",
                            height: "38px",
                            borderRadius: "8px",
                            border: "1px solid var(--line)",
                            background: "#fff",
                            color: "#527069",
                            fontSize: "12px",
                            fontWeight: 700,
                            cursor: loading ? "not-allowed" : "pointer",
                        }}
                    >
                        <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                        <span>Segarkan</span>
                    </button>
                </div>
            </div>

            {/* Stat Cards */}
            <section className="stat-grid" style={{ marginBottom: "24px" }}>
                <article className="stat-card">
                    <div className="stat-top">
                        <div>
                            <p>Total Pengumuman</p>
                            <h2>
                                {pemberitahuanList.length} <small>data</small>
                            </h2>
                        </div>
                        <div className="stat-icon">
                            <Megaphone size={20} />
                        </div>
                    </div>
                    <div className="stat-note">Semua riwayat pengumuman</div>
                </article>

                <article className="stat-card lime">
                    <div className="stat-top">
                        <div>
                            <p>Sedang Aktif</p>
                            <h2>
                                {totalAktif} <small>aktif</small>
                            </h2>
                        </div>
                        <div className="stat-icon">
                            <CheckCircle size={20} />
                        </div>
                    </div>
                    <div className="stat-note">Muncul di landing page warga</div>
                </article>

                <article className="stat-card amber">
                    <div className="stat-top">
                        <div>
                            <p>Penting / Mendesak</p>
                            <h2>
                                {totalPenting} <small>peringatan</small>
                            </h2>
                        </div>
                        <div className="stat-icon">
                            <AlertTriangle size={20} />
                        </div>
                    </div>
                    <div className="stat-note">Mendapat sorotan khusus warga</div>
                </article>
            </section>

            {/* Filter and Search Bar */}
            <div className="panel" style={{ padding: "16px", marginBottom: "24px" }}>
                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
                    {/* Search Input */}
                    <div style={{ position: "relative", flex: "1 1 240px" }}>
                        <Search
                            size={16}
                            style={{
                                position: "absolute",
                                left: "12px",
                                top: "50%",
                                transform: "translateY(-50%)",
                                color: "var(--muted)",
                            }}
                        />
                        <input
                            type="text"
                            placeholder="Cari judul atau isi pengumuman..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                width: "100%",
                                padding: "9px 12px 9px 36px",
                                borderRadius: "8px",
                                border: "1px solid var(--line)",
                                fontSize: "13px",
                                outline: "none",
                                background: "#fff",
                            }}
                        />
                    </div>

                    {/* Filter Desa (Superadmin only) */}
                    {isAdmin ? (
                        <select
                            value={selectedDesaFilter}
                            onChange={(e) => setSelectedDesaFilter(e.target.value)}
                            style={{
                                padding: "9px 14px",
                                borderRadius: "8px",
                                border: "1px solid var(--line)",
                                fontSize: "13px",
                                background: "#fff",
                                outline: "none",
                                cursor: "pointer",
                            }}
                        >
                            <option value="all">Semua Desa</option>
                            {desaList.map((d) => (
                                <option key={d.id} value={d.id}>
                                    {d.nama}
                                </option>
                            ))}
                        </select>
                    ) : (
                        <div
                            style={{
                                padding: "8px 14px",
                                background: "rgba(11, 143, 130, 0.08)",
                                border: "1px solid rgba(11, 143, 130, 0.2)",
                                borderRadius: "8px",
                                fontSize: "12px",
                                fontWeight: 600,
                                color: "var(--teal)",
                            }}
                        >
                            Desa: {user?.desaNama || "Memuat..."}
                        </div>
                    )}

                    {/* Filter Kategori */}
                    <select
                        value={kategoriFilter}
                        onChange={(e) => setKategoriFilter(e.target.value)}
                        style={{
                            padding: "9px 14px",
                            borderRadius: "8px",
                            border: "1px solid var(--line)",
                            fontSize: "13px",
                            background: "#fff",
                            outline: "none",
                            cursor: "pointer",
                        }}
                    >
                        <option value="all">Semua Kategori</option>
                        <option value="Operasional">Operasional</option>
                        <option value="Iuran & Keuangan">Iuran & Keuangan</option>
                        <option value="Jadwal Layanan">Jadwal Layanan</option>
                        <option value="Sosialisasi & Edukasi">Sosialisasi</option>
                        <option value="Lainnya">Lainnya</option>
                    </select>

                    {/* Filter Status */}
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        style={{
                            padding: "9px 14px",
                            borderRadius: "8px",
                            border: "1px solid var(--line)",
                            fontSize: "13px",
                            background: "#fff",
                            outline: "none",
                            cursor: "pointer",
                        }}
                    >
                        <option value="all">Semua Status</option>
                        <option value="Aktif">Aktif (Tayang)</option>
                        <option value="Diarsipkan">Diarsipkan</option>
                    </select>
                </div>
            </div>

            {/* Error Message */}
            {errorMessage && (
                <div
                    style={{
                        padding: "14px 16px",
                        marginBottom: "20px",
                        borderRadius: "8px",
                        background: "#fee2e2",
                        border: "1px solid #fca5a5",
                        color: "#991b1b",
                        fontSize: "13px",
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                    }}
                >
                    <AlertCircle size={18} />
                    <span>{errorMessage}</span>
                </div>
            )}

            {/* List Announcements */}
            {loading ? (
                <div
                    style={{
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        padding: "60px 0",
                        gap: "12px",
                        color: "var(--muted)",
                    }}
                >
                    <Loader2 size={24} className="animate-spin" />
                    <span style={{ fontSize: "14px" }}>Memuat daftar pemberitahuan...</span>
                </div>
            ) : pemberitahuanList.length === 0 ? (
                <EmptyState
                    title="Belum Ada Pemberitahuan"
                    description="Belum ada pengumuman yang dibuat. Klik tombol '+ Buat Pemberitahuan' untuk mengumumkan info operasional atau iuran."
                />
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    {pemberitahuanList.map((item) => {
                        const isPenting = item.tingkat_urgensi === "Penting";
                        const isAktif = item.status === "Aktif";
                        const desaNama = item.desa?.nama || "Desa";

                        return (
                            <div
                                key={item.id}
                                style={{
                                    background: "#fff",
                                    border: isPenting && isAktif ? "1.5px solid #fca5a5" : "1px solid var(--line)",
                                    borderRadius: "14px",
                                    padding: "20px 24px",
                                    boxShadow: isPenting && isAktif ? "0 4px 16px rgba(220, 38, 38, 0.08)" : "0 2px 8px rgba(0,0,0,0.02)",
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "12px",
                                    position: "relative",
                                }}
                            >
                                {/* Top Row: Badges & Dates */}
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        flexWrap: "wrap",
                                        gap: "10px",
                                    }}
                                >
                                    <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                                        {/* Urgency Badge */}
                                        <span
                                            style={{
                                                padding: "4px 10px",
                                                borderRadius: "100px",
                                                fontSize: "11px",
                                                fontWeight: 800,
                                                display: "inline-flex",
                                                alignItems: "center",
                                                gap: "5px",
                                                background: isPenting ? "#fee2e2" : "#e0f2fe",
                                                color: isPenting ? "#dc2626" : "#0284c7",
                                                border: `1px solid ${isPenting ? "#fecaca" : "#bae6fd"}`,
                                            }}
                                        >
                                            {isPenting ? <AlertTriangle size={12} /> : <Info size={12} />}
                                            {isPenting ? "PENTING / MENDESAK" : "INFO UMUM"}
                                        </span>

                                        {/* Category Badge */}
                                        <span
                                            style={{
                                                padding: "4px 10px",
                                                borderRadius: "100px",
                                                fontSize: "11px",
                                                fontWeight: 700,
                                                background: "#f4f7f4",
                                                color: "#4a5a55",
                                                border: "1px solid var(--line)",
                                            }}
                                        >
                                            {item.kategori}
                                        </span>

                                        {/* Village Badge */}
                                        <span
                                            style={{
                                                padding: "4px 10px",
                                                borderRadius: "100px",
                                                fontSize: "11px",
                                                fontWeight: 700,
                                                background: "rgba(11, 143, 130, 0.08)",
                                                color: "var(--teal)",
                                                border: "1px solid rgba(11, 143, 130, 0.2)",
                                            }}
                                        >
                                            {desaNama}
                                        </span>

                                        {/* Status Badge */}
                                        <span
                                            style={{
                                                padding: "4px 10px",
                                                borderRadius: "100px",
                                                fontSize: "11px",
                                                fontWeight: 700,
                                                background: isAktif ? "#dcfce7" : "#f1f5f9",
                                                color: isAktif ? "#166534" : "#64748b",
                                            }}
                                        >
                                            {item.status}
                                        </span>
                                    </div>

                                    {/* Date Info */}
                                    <div
                                        style={{
                                            fontSize: "12px",
                                            color: "var(--muted)",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "6px",
                                        }}
                                    >
                                        <Calendar size={14} />
                                        <span>
                                            Mulai: {new Date(item.tanggal_mulai).toLocaleDateString("id-ID", { dateStyle: "medium" })}
                                            {item.tanggal_selesai && ` s/d ${new Date(item.tanggal_selesai).toLocaleDateString("id-ID", { dateStyle: "medium" })}`}
                                        </span>
                                    </div>
                                </div>

                                {/* Title & Content */}
                                <div>
                                    <h3
                                        style={{
                                            margin: "0 0 8px 0",
                                            fontSize: "18px",
                                            fontWeight: 800,
                                            color: "var(--ink)",
                                            lineHeight: 1.3,
                                        }}
                                    >
                                        {item.judul}
                                    </h3>
                                    <p
                                        style={{
                                            margin: 0,
                                            fontSize: "14px",
                                            color: "#4a5a55",
                                            lineHeight: 1.6,
                                            whiteSpace: "pre-line",
                                        }}
                                    >
                                        {item.isi}
                                    </p>
                                </div>

                                {/* Footer Row: Actions */}
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        paddingTop: "12px",
                                        borderTop: "1px solid #f0f4f2",
                                        marginTop: "4px",
                                    }}
                                >
                                    <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                                        Dibuat pada {new Date(item.created_at).toLocaleDateString("id-ID", { dateStyle: "medium" })}
                                    </span>

                                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                                        <button
                                            type="button"
                                            onClick={() => openPreviewModal(item)}
                                            style={{
                                                display: "inline-flex",
                                                alignItems: "center",
                                                gap: "5px",
                                                padding: "6px 12px",
                                                borderRadius: "6px",
                                                background: "#f8faf9",
                                                border: "1px solid var(--line)",
                                                fontSize: "12px",
                                                fontWeight: 600,
                                                color: "var(--ink)",
                                                cursor: "pointer",
                                            }}
                                        >
                                            <Eye size={13} /> Pratinjau
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => handleToggleStatus(item)}
                                            style={{
                                                display: "inline-flex",
                                                alignItems: "center",
                                                gap: "5px",
                                                padding: "6px 12px",
                                                borderRadius: "6px",
                                                background: isAktif ? "#fef3c7" : "#dcfce7",
                                                border: `1px solid ${isAktif ? "#fde68a" : "#bbf7d0"}`,
                                                fontSize: "12px",
                                                fontWeight: 600,
                                                color: isAktif ? "#92400e" : "#166534",
                                                cursor: "pointer",
                                            }}
                                            title={isAktif ? "Arsipkan pemberitahuan" : "Aktifkan kembali"}
                                        >
                                            <Archive size={13} /> {isAktif ? "Arsipkan" : "Aktifkan"}
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => openEditModal(item)}
                                            style={{
                                                display: "inline-flex",
                                                alignItems: "center",
                                                gap: "5px",
                                                padding: "6px 12px",
                                                borderRadius: "6px",
                                                background: "rgba(11, 143, 130, 0.08)",
                                                border: "1px solid rgba(11, 143, 130, 0.2)",
                                                fontSize: "12px",
                                                fontWeight: 600,
                                                color: "var(--teal)",
                                                cursor: "pointer",
                                            }}
                                        >
                                            <Edit3 size={13} /> Edit
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => openDeleteModal(item)}
                                            style={{
                                                padding: "6px 10px",
                                                borderRadius: "6px",
                                                background: "#fee2e2",
                                                border: "1px solid #fca5a5",
                                                color: "#dc2626",
                                                cursor: "pointer",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                            }}
                                            aria-label="Hapus pemberitahuan"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── MODAL CREATE / EDIT ── */}
            {(modalMode === "create" || modalMode === "edit") && (
                <div
                    className="modal-backdrop z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs"
                    role="presentation"
                    onClick={closeModal}
                    style={{ position: "fixed", inset: 0, padding: "16px", zIndex: 999 }}
                >
                    <section
                        className="activity-modal max-w-lg w-full bg-white rounded-lg shadow-2xl overflow-hidden border border-gray-100"
                        role="dialog"
                        aria-modal="true"
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: "#fff",
                            borderRadius: "16px",
                            maxWidth: "580px",
                            width: "100%",
                            boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
                            overflow: "hidden",
                        }}
                    >
                        <div
                            style={{
                                padding: "20px 24px",
                                borderBottom: "1px solid #eef2ef",
                                background: "#f8faf9",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                            }}
                        >
                            <div>
                                <h2
                                    style={{
                                        margin: 0,
                                        fontSize: "17px",
                                        fontWeight: 800,
                                        color: "var(--ink)",
                                    }}
                                >
                                    {modalMode === "create"
                                        ? "Buat Pemberitahuan Baru"
                                        : "Edit Pemberitahuan"}
                                </h2>
                                <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "var(--muted)" }}>
                                    Pengumuman ini akan langsung terlihat oleh warga di landing page.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={closeModal}
                                style={{
                                    border: "none",
                                    background: "transparent",
                                    cursor: "pointer",
                                    color: "var(--muted)",
                                    padding: "4px",
                                }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div
                                style={{
                                    padding: "24px",
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "16px",
                                    maxHeight: "calc(80vh - 140px)",
                                    overflowY: "auto",
                                }}
                            >
                                {errorMessage && (
                                    <div
                                        style={{
                                            padding: "12px 14px",
                                            borderRadius: "8px",
                                            background: "#fee2e2",
                                            border: "1px solid #fca5a5",
                                            color: "#991b1b",
                                            fontSize: "12px",
                                            display: "flex",
                                            gap: "8px",
                                            alignItems: "center",
                                        }}
                                    >
                                        <AlertCircle size={16} />
                                        <span>{errorMessage}</span>
                                    </div>
                                )}

                                {/* Desa Selector */}
                                <div>
                                    <label
                                        style={{
                                            display: "block",
                                            fontSize: "12px",
                                            fontWeight: 700,
                                            color: "#4a5a55",
                                            marginBottom: "6px",
                                            textTransform: "uppercase",
                                            letterSpacing: "0.5px",
                                        }}
                                    >
                                        Desa TPS3R *
                                    </label>
                                    {isAdmin ? (
                                        <select
                                            required
                                            value={form.desa_id}
                                            onChange={(e) =>
                                                setForm({ ...form, desa_id: e.target.value })
                                            }
                                            style={{
                                                width: "100%",
                                                padding: "10px 14px",
                                                borderRadius: "8px",
                                                border: "1px solid var(--line)",
                                                fontSize: "13px",
                                                outline: "none",
                                                background: "#fcfdfc",
                                            }}
                                        >
                                            <option value="" disabled>
                                                Pilih Desa
                                            </option>
                                            {desaList.map((d) => (
                                                <option key={d.id} value={d.id}>
                                                    {d.nama}
                                                </option>
                                            ))}
                                        </select>
                                    ) : (
                                        <input
                                            type="text"
                                            disabled
                                            value={user?.desaNama || "Desa Anda"}
                                            style={{
                                                width: "100%",
                                                padding: "10px 14px",
                                                borderRadius: "8px",
                                                border: "1px solid var(--line)",
                                                fontSize: "13px",
                                                background: "#f4f7f4",
                                                color: "var(--ink)",
                                            }}
                                        />
                                    )}
                                </div>

                                {/* Judul Pengumuman */}
                                <div>
                                    <label
                                        style={{
                                            display: "block",
                                            fontSize: "12px",
                                            fontWeight: 700,
                                            color: "#4a5a55",
                                            marginBottom: "6px",
                                            textTransform: "uppercase",
                                            letterSpacing: "0.5px",
                                        }}
                                    >
                                        Judul Pemberitahuan *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Contoh: Pemberitahuan: Besok TPS3R Tutup Sementara"
                                        value={form.judul}
                                        onChange={(e) =>
                                            setForm({ ...form, judul: e.target.value })
                                        }
                                        style={{
                                            width: "100%",
                                            padding: "10px 14px",
                                            borderRadius: "8px",
                                            border: "1px solid var(--line)",
                                            fontSize: "13px",
                                            outline: "none",
                                            background: "#fcfdfc",
                                        }}
                                    />
                                </div>

                                {/* Row: Kategori & Tingkat Urgensi */}
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                                    <div>
                                        <label
                                            style={{
                                                display: "block",
                                                fontSize: "12px",
                                                fontWeight: 700,
                                                color: "#4a5a55",
                                                marginBottom: "6px",
                                                textTransform: "uppercase",
                                                letterSpacing: "0.5px",
                                            }}
                                        >
                                            Kategori *
                                        </label>
                                        <select
                                            value={form.kategori}
                                            onChange={(e) =>
                                                setForm({ ...form, kategori: e.target.value })
                                            }
                                            style={{
                                                width: "100%",
                                                padding: "10px 14px",
                                                borderRadius: "8px",
                                                border: "1px solid var(--line)",
                                                fontSize: "13px",
                                                background: "#fcfdfc",
                                                outline: "none",
                                            }}
                                        >
                                            <option value="Operasional">Operasional (Libur/Tutup)</option>
                                            <option value="Iuran & Keuangan">Iuran & Keuangan Member</option>
                                            <option value="Jadwal Layanan">Jadwal Pengangkutan</option>
                                            <option value="Sosialisasi & Edukasi">Sosialisasi & Edukasi</option>
                                            <option value="Lainnya">Lainnya</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label
                                            style={{
                                                display: "block",
                                                fontSize: "12px",
                                                fontWeight: 700,
                                                color: "#4a5a55",
                                                marginBottom: "6px",
                                                textTransform: "uppercase",
                                                letterSpacing: "0.5px",
                                            }}
                                        >
                                            Tingkat Urgensi *
                                        </label>
                                        <select
                                            value={form.tingkat_urgensi}
                                            onChange={(e) =>
                                                setForm({
                                                    ...form,
                                                    tingkat_urgensi: e.target.value as "Penting" | "Normal" | "Info",
                                                })
                                            }
                                            style={{
                                                width: "100%",
                                                padding: "10px 14px",
                                                borderRadius: "8px",
                                                border: form.tingkat_urgensi === "Penting" ? "1.5px solid #fca5a5" : "1px solid var(--line)",
                                                fontSize: "13px",
                                                background: form.tingkat_urgensi === "Penting" ? "#fff5f5" : "#fcfdfc",
                                                color: form.tingkat_urgensi === "Penting" ? "#dc2626" : "var(--ink)",
                                                fontWeight: form.tingkat_urgensi === "Penting" ? 700 : 400,
                                                outline: "none",
                                            }}
                                        >
                                            <option value="Normal">Normal (Pengumuman Biasa)</option>
                                            <option value="Penting">Penting / Mendesak (Disorot Merah)</option>
                                            <option value="Info">Informasi Tambahan</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Row: Tanggal Mulai & Selesai */}
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                                    <div>
                                        <label
                                            style={{
                                                display: "block",
                                                fontSize: "12px",
                                                fontWeight: 700,
                                                color: "#4a5a55",
                                                marginBottom: "6px",
                                                textTransform: "uppercase",
                                                letterSpacing: "0.5px",
                                            }}
                                        >
                                            Tanggal Mulai *
                                        </label>
                                        <input
                                            type="date"
                                            required
                                            value={form.tanggal_mulai}
                                            onChange={(e) =>
                                                setForm({ ...form, tanggal_mulai: e.target.value })
                                            }
                                            style={{
                                                width: "100%",
                                                padding: "10px 14px",
                                                borderRadius: "8px",
                                                border: "1px solid var(--line)",
                                                fontSize: "13px",
                                                outline: "none",
                                                background: "#fcfdfc",
                                            }}
                                        />
                                    </div>

                                    <div>
                                        <label
                                            style={{
                                                display: "block",
                                                fontSize: "12px",
                                                fontWeight: 700,
                                                color: "#4a5a55",
                                                marginBottom: "6px",
                                                textTransform: "uppercase",
                                                letterSpacing: "0.5px",
                                            }}
                                        >
                                            Tanggal Selesai (Opsional)
                                        </label>
                                        <input
                                            type="date"
                                            value={form.tanggal_selesai}
                                            onChange={(e) =>
                                                setForm({ ...form, tanggal_selesai: e.target.value })
                                            }
                                            style={{
                                                width: "100%",
                                                padding: "10px 14px",
                                                borderRadius: "8px",
                                                border: "1px solid var(--line)",
                                                fontSize: "13px",
                                                outline: "none",
                                                background: "#fcfdfc",
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* Isi Pemberitahuan */}
                                <div>
                                    <label
                                        style={{
                                            display: "block",
                                            fontSize: "12px",
                                            fontWeight: 700,
                                            color: "#4a5a55",
                                            marginBottom: "6px",
                                            textTransform: "uppercase",
                                            letterSpacing: "0.5px",
                                        }}
                                    >
                                        Isi Pemberitahuan Lengkap *
                                    </label>
                                    <textarea
                                        required
                                        rows={6}
                                        placeholder="Tuliskan isi pengumuman secara rinci: alasan libur, tanggal kembali buka, atau nomor pengelola yang dapat dihubungi..."
                                        value={form.isi}
                                        onChange={(e) =>
                                            setForm({ ...form, isi: e.target.value })
                                        }
                                        style={{
                                            width: "100%",
                                            padding: "12px 14px",
                                            borderRadius: "8px",
                                            border: "1px solid var(--line)",
                                            fontSize: "13px",
                                            outline: "none",
                                            background: "#fcfdfc",
                                            resize: "vertical",
                                            lineHeight: 1.5,
                                        }}
                                    />
                                </div>

                                {/* Status Publikasi */}
                                <div>
                                    <label
                                        style={{
                                            display: "block",
                                            fontSize: "12px",
                                            fontWeight: 700,
                                            color: "#4a5a55",
                                            marginBottom: "8px",
                                            textTransform: "uppercase",
                                            letterSpacing: "0.5px",
                                        }}
                                    >
                                        Status Tayang
                                    </label>
                                    <div style={{ display: "flex", gap: "12px" }}>
                                        <label
                                            style={{
                                                flex: 1,
                                                padding: "10px 14px",
                                                borderRadius: "8px",
                                                border: `1.5px solid ${form.status === "Aktif" ? "var(--teal)" : "var(--line)"}`,
                                                background: form.status === "Aktif" ? "rgba(11, 143, 130, 0.05)" : "#fff",
                                                cursor: "pointer",
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "8px",
                                                fontSize: "13px",
                                                fontWeight: 600,
                                                color: form.status === "Aktif" ? "var(--teal)" : "var(--ink)",
                                            }}
                                        >
                                            <input
                                                type="radio"
                                                name="status_pemberitahuan"
                                                value="Aktif"
                                                checked={form.status === "Aktif"}
                                                onChange={() => setForm({ ...form, status: "Aktif" })}
                                                style={{ accentColor: "var(--teal)" }}
                                            />
                                            <span>Aktif (Tampil di Web)</span>
                                        </label>

                                        <label
                                            style={{
                                                flex: 1,
                                                padding: "10px 14px",
                                                borderRadius: "8px",
                                                border: `1.5px solid ${form.status === "Diarsipkan" ? "#64748b" : "var(--line)"}`,
                                                background: form.status === "Diarsipkan" ? "#f1f5f9" : "#fff",
                                                cursor: "pointer",
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "8px",
                                                fontSize: "13px",
                                                fontWeight: 600,
                                                color: form.status === "Diarsipkan" ? "#334155" : "var(--ink)",
                                            }}
                                        >
                                            <input
                                                type="radio"
                                                name="status_pemberitahuan"
                                                value="Diarsipkan"
                                                checked={form.status === "Diarsipkan"}
                                                onChange={() => setForm({ ...form, status: "Diarsipkan" })}
                                                style={{ accentColor: "#64748b" }}
                                            />
                                            <span>Arsipkan (Disembunyikan)</span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* Modal Actions */}
                            <div
                                style={{
                                    padding: "16px 24px",
                                    borderTop: "1px solid #eef2ef",
                                    background: "#f8faf9",
                                    display: "flex",
                                    justifyContent: "flex-end",
                                    alignItems: "center",
                                    gap: "12px",
                                }}
                            >
                                <button
                                    type="button"
                                    className="secondary-button"
                                    onClick={closeModal}
                                    disabled={submitting}
                                    style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        padding: "0 18px",
                                        height: "40px",
                                        borderRadius: "8px",
                                        border: "1px solid var(--line)",
                                        background: "#fff",
                                        color: "#527069",
                                        fontSize: "13px",
                                        fontWeight: 700,
                                        cursor: submitting ? "not-allowed" : "pointer",
                                    }}
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    className="primary-button"
                                    disabled={submitting}
                                    style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        gap: "8px",
                                        padding: "0 22px",
                                        height: "40px",
                                        borderRadius: "8px",
                                        border: "none",
                                        background: "var(--teal)",
                                        color: "#fff",
                                        fontSize: "13px",
                                        fontWeight: 700,
                                        boxShadow: "0 4px 12px rgba(11, 143, 130, 0.25)",
                                        cursor: submitting ? "not-allowed" : "pointer",
                                        opacity: submitting ? 0.7 : 1,
                                    }}
                                >
                                    {submitting ? (
                                        <>
                                            <Loader2 size={16} className="animate-spin" /> Menyimpan...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle size={16} /> Simpan Pemberitahuan
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </section>
                </div>
            )}

            {/* ── MODAL DETAIL PREVIEW ── */}
            {modalMode === "preview" && activeItem && (
                <div
                    className="modal-backdrop z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs"
                    role="presentation"
                    onClick={closeModal}
                    style={{ position: "fixed", inset: 0, padding: "16px", zIndex: 999 }}
                >
                    <div
                        style={{
                            background: "#fff",
                            borderRadius: "16px",
                            maxWidth: "580px",
                            width: "100%",
                            padding: "24px",
                            boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginBottom: "16px",
                            }}
                        >
                            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                                <span
                                    style={{
                                        padding: "4px 10px",
                                        borderRadius: "100px",
                                        fontSize: "11px",
                                        fontWeight: 800,
                                        background: activeItem.tingkat_urgensi === "Penting" ? "#fee2e2" : "#e0f2fe",
                                        color: activeItem.tingkat_urgensi === "Penting" ? "#dc2626" : "#0284c7",
                                    }}
                                >
                                    {activeItem.tingkat_urgensi === "Penting" ? "PENTING" : "INFO UMUM"}
                                </span>
                                <span
                                    style={{
                                        padding: "4px 10px",
                                        borderRadius: "100px",
                                        fontSize: "11px",
                                        fontWeight: 700,
                                        background: "rgba(11, 143, 130, 0.08)",
                                        color: "var(--teal)",
                                    }}
                                >
                                    {activeItem.desa?.nama || "Desa"}
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={closeModal}
                                style={{
                                    border: "none",
                                    background: "transparent",
                                    cursor: "pointer",
                                    color: "var(--muted)",
                                    padding: "4px",
                                }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <h2
                            style={{
                                margin: "0 0 12px 0",
                                fontSize: "20px",
                                fontWeight: 800,
                                color: "var(--ink)",
                                lineHeight: 1.3,
                            }}
                        >
                            {activeItem.judul}
                        </h2>

                        <div
                            style={{
                                fontSize: "12px",
                                color: "var(--muted)",
                                marginBottom: "16px",
                            }}
                        >
                            Kategori: <strong>{activeItem.kategori}</strong> • Periode:{" "}
                            {new Date(activeItem.tanggal_mulai).toLocaleDateString("id-ID", { dateStyle: "long" })}
                            {activeItem.tanggal_selesai && ` s/d ${new Date(activeItem.tanggal_selesai).toLocaleDateString("id-ID", { dateStyle: "long" })}`}
                        </div>

                        <div
                            style={{
                                fontSize: "14px",
                                color: "#4a5a55",
                                lineHeight: 1.7,
                                whiteSpace: "pre-line",
                                maxHeight: "280px",
                                overflowY: "auto",
                                padding: "16px",
                                background: "#f8faf9",
                                borderRadius: "10px",
                                border: "1px solid var(--line)",
                            }}
                        >
                            {activeItem.isi}
                        </div>

                        <div style={{ marginTop: "20px", display: "flex", justifyContent: "flex-end" }}>
                            <button
                                type="button"
                                className="secondary-button"
                                onClick={closeModal}
                                style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    padding: "0 22px",
                                    height: "38px",
                                    borderRadius: "8px",
                                    border: "1px solid var(--line)",
                                    background: "#fff",
                                    color: "#527069",
                                    fontSize: "13px",
                                    fontWeight: 700,
                                    cursor: "pointer",
                                }}
                            >
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── MODAL DELETE CONFIRMATION ── */}
            {modalMode === "delete" && activeItem && (
                <div
                    className="modal-backdrop z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs"
                    role="presentation"
                    onClick={closeModal}
                    style={{ position: "fixed", inset: 0, padding: "16px", zIndex: 999 }}
                >
                    <div
                        style={{
                            background: "#fff",
                            borderRadius: "16px",
                            maxWidth: "420px",
                            width: "100%",
                            padding: "24px",
                            boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div
                            style={{
                                width: "48px",
                                height: "48px",
                                borderRadius: "12px",
                                background: "#fee2e2",
                                color: "#dc2626",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                marginBottom: "16px",
                            }}
                        >
                            <Trash2 size={24} />
                        </div>
                        <h3
                            style={{
                                margin: "0 0 8px 0",
                                fontSize: "17px",
                                fontWeight: 800,
                                color: "var(--ink)",
                            }}
                        >
                            Hapus Pemberitahuan?
                        </h3>
                        <p
                            style={{
                                margin: "0 0 20px 0",
                                fontSize: "13px",
                                color: "var(--muted)",
                                lineHeight: 1.5,
                            }}
                        >
                            Apakah Anda yakin ingin menghapus pemberitahuan{" "}
                            <strong>&ldquo;{activeItem.judul}&rdquo;</strong>? Tindakan ini tidak dapat
                            dibatalkan.
                        </p>
                        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "10px" }}>
                            <button
                                type="button"
                                className="secondary-button"
                                onClick={closeModal}
                                disabled={submitting}
                                style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    padding: "0 18px",
                                    height: "38px",
                                    borderRadius: "8px",
                                    border: "1px solid var(--line)",
                                    background: "#fff",
                                    color: "#527069",
                                    fontSize: "13px",
                                    fontWeight: 700,
                                    cursor: submitting ? "not-allowed" : "pointer",
                                }}
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={handleDelete}
                                disabled={submitting}
                                style={{
                                    padding: "10px 18px",
                                    borderRadius: "8px",
                                    background: "#dc2626",
                                    color: "#fff",
                                    fontSize: "13px",
                                    fontWeight: 700,
                                    border: "none",
                                    cursor: submitting ? "not-allowed" : "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "6px",
                                }}
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 size={15} className="animate-spin" /> Menghapus...
                                    </>
                                ) : (
                                    "Ya, Hapus Pemberitahuan"
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}

export default function PemberitahuanPage() {
    return (
        <FormShell title="Pemberitahuan & Pengumuman" activeLabel="Pemberitahuan">
            <Suspense
                fallback={
                    <div
                        style={{
                            padding: "40px",
                            textAlign: "center",
                            color: "var(--muted)",
                        }}
                    >
                        <Loader2 size={24} className="animate-spin" />
                    </div>
                }
            >
                <PemberitahuanContent />
            </Suspense>
        </FormShell>
    );
}
