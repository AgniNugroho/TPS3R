"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import {
    AlertCircle,
    CheckCircle,
    Edit3,
    Eye,
    Loader2,
    Plus,
    RefreshCw,
    Search,
    Trash2,
    UploadCloud,
    X,
} from "lucide-react";
import FormShell from "@/components/dashboard/FormShell";
import EmptyState from "@/components/dashboard/EmptyState";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { showErrorToast, showSuccessToast } from "@/components/ui/Toast";

type Postingan = {
    id: string;
    desa_id: string;
    judul: string;
    deskripsi: string;
    gambar_url: string;
    status: "Publik" | "Draft";
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
    deskripsi: "",
    gambar_url: "",
    status: "Publik" as "Publik" | "Draft",
    desa_id: "",
};

function PostinganContent() {
    const searchParams = useSearchParams();
    const user = useCurrentUser();
    const queryDesaId = searchParams.get("desa_id");

    const [postinganList, setPostinganList] = useState<Postingan[]>([]);
    const [desaList, setDesaList] = useState<Desa[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);

    // Filters
    const [selectedDesaFilter, setSelectedDesaFilter] = useState(queryDesaId || "all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");

    // Modal state
    const [modalMode, setModalMode] = useState<ModalMode>(null);
    const [activePost, setActivePost] = useState<Postingan | null>(null);
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

    // Sync selectedDesaFilter with URL if provided
    useEffect(() => {
        if (queryDesaId) {
            void Promise.resolve().then(() => setSelectedDesaFilter(queryDesaId));
        }
    }, [queryDesaId]);

    // Fetch posts
    const loadPostingan = useCallback(async () => {
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

            if (searchQuery.trim()) {
                params.set("search", searchQuery.trim());
            }

            const res = await fetch(`/api/postingan?${params.toString()}`);
            const result = await res.json();

            if (result.ok) {
                setPostinganList(result.data || []);
            } else {
                setErrorMessage(result.error || "Gagal mengambil data postingan.");
            }
        } catch {
            setErrorMessage("Koneksi ke server terganggu.");
        } finally {
            setLoading(false);
        }
    }, [user, selectedDesaFilter, statusFilter, searchQuery]);

    useEffect(() => {
        if (user !== null) {
            void Promise.resolve().then(() => loadPostingan());
        }
    }, [user, loadPostingan]);

    // Handle Image Upload
    async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            showErrorToast("File yang diunggah harus berupa gambar (JPG, PNG, WebP).");
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            showErrorToast("Ukuran gambar maksimal 5 MB.");
            return;
        }

        setUploadingImage(true);
        try {
            const formData = new FormData();
            formData.append("file", file);

            const res = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            });
            const data = await res.json();

            if (data.ok && data.publicUrl) {
                setForm((prev) => ({ ...prev, gambar_url: data.publicUrl }));
                showSuccessToast("Foto produk berhasil diunggah!");
            } else {
                showErrorToast(data.error || "Gagal mengunggah gambar.");
            }
        } catch {
            showErrorToast("Terjadi kesalahan saat mengunggah gambar.");
        } finally {
            setUploadingImage(false);
        }
    }

    // Modal helpers
    function openCreateModal() {
        setErrorMessage("");
        setForm({
            ...initialForm,
            desa_id: user?.role === "admin" ? desaList[0]?.id || "" : user?.desaId || "",
        });
        setModalMode("create");
    }

    function openEditModal(post: Postingan) {
        setErrorMessage("");
        setActivePost(post);
        setForm({
            id: post.id,
            judul: post.judul,
            deskripsi: post.deskripsi,
            gambar_url: post.gambar_url,
            status: post.status,
            desa_id: post.desa_id,
        });
        setModalMode("edit");
    }

    function openDeleteModal(post: Postingan) {
        setActivePost(post);
        setModalMode("delete");
    }

    function openPreviewModal(post: Postingan) {
        setActivePost(post);
        setModalMode("preview");
    }

    function closeModal() {
        setModalMode(null);
        setActivePost(null);
        setErrorMessage("");
    }

    // Submit form (Create / Edit)
    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setErrorMessage("");

        if (!form.judul.trim()) {
            setErrorMessage("Judul produk wajib diisi.");
            return;
        }

        if (!form.deskripsi.trim()) {
            setErrorMessage("Deskripsi produk wajib diisi.");
            return;
        }

        if (!form.gambar_url.trim()) {
            setErrorMessage("Foto produk wajib diunggah.");
            return;
        }

        const desaTarget = user?.role === "admin" ? form.desa_id : user?.desaId;
        if (!desaTarget) {
            setErrorMessage("Desa asal produk wajib ditentukan.");
            return;
        }

        setSubmitting(true);
        try {
            const method = modalMode === "create" ? "POST" : "PUT";
            const payload = {
                ...form,
                desa_id: desaTarget,
            };

            const res = await fetch("/api/postingan", {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const result = await res.json();

            if (result.ok) {
                showSuccessToast(
                    modalMode === "create"
                        ? "Postingan produk berhasil dibuat!"
                        : "Postingan produk berhasil diperbarui!",
                );
                closeModal();
                loadPostingan();
            } else {
                setErrorMessage(result.error || "Gagal menyimpan postingan.");
            }
        } catch {
            setErrorMessage("Terjadi kesalahan jaringan.");
        } finally {
            setSubmitting(false);
        }
    }

    // Delete post
    async function handleDelete() {
        if (!activePost) return;
        setSubmitting(true);
        try {
            const res = await fetch(`/api/postingan?id=${activePost.id}`, {
                method: "DELETE",
            });
            const result = await res.json();

            if (result.ok) {
                showSuccessToast("Postingan berhasil dihapus.");
                closeModal();
                loadPostingan();
            } else {
                showErrorToast(result.error || "Gagal menghapus postingan.");
            }
        } catch {
            showErrorToast("Terjadi kesalahan saat menghapus data.");
        } finally {
            setSubmitting(false);
        }
    }

    const isAdmin = user?.role === "admin";

    return (
        <main className="content-wrap">
            {/* Header Section */}
            <div className="page-heading">
                <div>
                    <p className="eyebrow">
                        <span className="live-dot" /> INFORMASI & PRODUK TPS3R
                    </p>
                    <h1>Postingan & Produk</h1>
                    <p className="heading-copy">
                        Kelola publikasi produk olahan TPS3R (pupuk kompos, pakan maggot, dll) yang muncul di landing page publik.
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
                        <span>Buat Postingan Baru</span>
                    </button>
                    <button
                        type="button"
                        className="secondary-button"
                        onClick={() => void loadPostingan()}
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
                            placeholder="Cari judul atau isi produk..."
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
                        <option value="Publik">Publik (Aktif di Web)</option>
                        <option value="Draft">Draft (Arsip)</option>
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

            {/* Cards Grid */}
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
                    <span style={{ fontSize: "14px" }}>Memuat postingan produk...</span>
                </div>
            ) : postinganList.length === 0 ? (
                <EmptyState
                    title="Belum Ada Postingan Produk"
                    description="Belum ada informasi atau produk yang diposting. Klik tombol '+ Buat Postingan Baru' untuk menambahkan."
                />
            ) : (
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                        gap: "24px",
                    }}
                >
                    {postinganList.map((item) => {
                        const desaNama = item.desa?.nama || "Desa";
                        const isPublik = item.status === "Publik";
                        const formattedDate = new Date(item.created_at).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                        });

                        return (
                            <div
                                key={item.id}
                                style={{
                                    background: "#fff",
                                    border: "1px solid var(--line)",
                                    borderRadius: "14px",
                                    overflow: "hidden",
                                    boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                                    display: "flex",
                                    flexDirection: "column",
                                    transition: "box-shadow 0.2s, transform 0.2s",
                                }}
                            >
                                {/* Image Container */}
                                <div
                                    style={{
                                        position: "relative",
                                        width: "100%",
                                        height: "200px",
                                        background: "#e8ecea",
                                        overflow: "hidden",
                                    }}
                                >
                                    <Image
                                        src={item.gambar_url}
                                        alt={item.judul}
                                        fill
                                        style={{ objectFit: "cover" }}
                                        sizes="(max-width: 768px) 100vw, 360px"
                                        unoptimized
                                    />
                                    {/* Desa Badge */}
                                    <div
                                        style={{
                                            position: "absolute",
                                            top: "12px",
                                            left: "12px",
                                            background: "rgba(11, 143, 130, 0.9)",
                                            backdropFilter: "blur(6px)",
                                            color: "#fff",
                                            padding: "4px 10px",
                                            borderRadius: "100px",
                                            fontSize: "11px",
                                            fontWeight: 700,
                                            letterSpacing: "0.5px",
                                        }}
                                    >
                                        {desaNama}
                                    </div>
                                    {/* Status Badge */}
                                    <div
                                        style={{
                                            position: "absolute",
                                            top: "12px",
                                            right: "12px",
                                            background: isPublik ? "#dcfce7" : "#fef3c7",
                                            color: isPublik ? "#166534" : "#92400e",
                                            border: `1px solid ${isPublik ? "#bbf7d0" : "#fde68a"}`,
                                            padding: "4px 10px",
                                            borderRadius: "100px",
                                            fontSize: "11px",
                                            fontWeight: 700,
                                        }}
                                    >
                                        {item.status}
                                    </div>
                                </div>

                                {/* Content Body */}
                                <div
                                    style={{
                                        padding: "18px",
                                        display: "flex",
                                        flexDirection: "column",
                                        flex: 1,
                                    }}
                                >
                                    <div
                                        style={{
                                            fontSize: "11px",
                                            color: "var(--muted)",
                                            marginBottom: "6px",
                                        }}
                                    >
                                        Dibuat pada {formattedDate}
                                    </div>
                                    <h3
                                        style={{
                                            margin: "0 0 10px 0",
                                            fontSize: "16px",
                                            fontWeight: 700,
                                            color: "var(--ink)",
                                            lineHeight: 1.3,
                                        }}
                                    >
                                        {item.judul}
                                    </h3>
                                    <p
                                        style={{
                                            margin: "0 0 16px 0",
                                            fontSize: "13px",
                                            color: "#52605b",
                                            lineHeight: 1.5,
                                            display: "-webkit-box",
                                            WebkitLineClamp: 3,
                                            WebkitBoxOrient: "vertical",
                                            overflow: "hidden",
                                            flex: 1,
                                        }}
                                    >
                                        {item.deskripsi}
                                    </p>

                                    {/* Action Buttons */}
                                    <div
                                        style={{
                                            display: "flex",
                                            gap: "8px",
                                            paddingTop: "14px",
                                            borderTop: "1px solid #f0f4f2",
                                        }}
                                    >
                                        <button
                                            type="button"
                                            onClick={() => openPreviewModal(item)}
                                            style={{
                                                flex: 1,
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                gap: "6px",
                                                padding: "8px",
                                                background: "#f8faf9",
                                                border: "1px solid var(--line)",
                                                borderRadius: "8px",
                                                fontSize: "12px",
                                                fontWeight: 600,
                                                color: "var(--ink)",
                                                cursor: "pointer",
                                            }}
                                        >
                                            <Eye size={14} /> Detail
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => openEditModal(item)}
                                            style={{
                                                flex: 1,
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                gap: "6px",
                                                padding: "8px",
                                                background: "rgba(11, 143, 130, 0.08)",
                                                border: "1px solid rgba(11, 143, 130, 0.2)",
                                                borderRadius: "8px",
                                                fontSize: "12px",
                                                fontWeight: 600,
                                                color: "var(--teal)",
                                                cursor: "pointer",
                                            }}
                                        >
                                            <Edit3 size={14} /> Edit
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => openDeleteModal(item)}
                                            style={{
                                                padding: "8px 12px",
                                                background: "#fff1f2",
                                                border: "1px solid #fecdd3",
                                                borderRadius: "8px",
                                                color: "#e11d48",
                                                cursor: "pointer",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                            }}
                                            aria-label="Hapus postingan"
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
                            maxWidth: "560px",
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
                                        ? "Buat Postingan Produk Baru"
                                        : "Edit Postingan Produk"}
                                </h2>
                                <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "var(--muted)" }}>
                                    Informasi ini akan ditampilkan untuk member & warga desa di landing page.
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
                                    gap: "18px",
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

                                {/* Judul Produk */}
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
                                        Nama / Judul Produk *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Contoh: Pupuk Kompos Organik Super / Pakan Maggot BSF"
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

                                {/* Upload Foto Produk */}
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
                                        Foto Produk *
                                    </label>

                                    {/* Live Image Preview */}
                                    {form.gambar_url ? (
                                        <div
                                            style={{
                                                marginBottom: "12px",
                                                position: "relative",
                                                borderRadius: "10px",
                                                overflow: "hidden",
                                                border: "1px solid var(--line)",
                                                height: "180px",
                                                background: "#f4f7f4",
                                            }}
                                        >
                                            <Image
                                                src={form.gambar_url}
                                                alt="Preview"
                                                fill
                                                style={{ objectFit: "cover" }}
                                                unoptimized
                                            />
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setForm({ ...form, gambar_url: "" })
                                                }
                                                style={{
                                                    position: "absolute",
                                                    top: "10px",
                                                    right: "10px",
                                                    background: "rgba(0,0,0,0.6)",
                                                    color: "#fff",
                                                    border: "none",
                                                    borderRadius: "50%",
                                                    width: "28px",
                                                    height: "28px",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    cursor: "pointer",
                                                }}
                                                title="Hapus foto"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    ) : null}

                                    {/* Upload trigger */}
                                    <div
                                        style={{
                                            border: "2px dashed #d0dcd6",
                                            borderRadius: "10px",
                                            padding: "20px",
                                            textAlign: "center",
                                            background: "#fcfdfc",
                                            position: "relative",
                                            cursor: uploadingImage ? "not-allowed" : "pointer",
                                        }}
                                    >
                                        <input
                                            type="file"
                                            accept="image/*"
                                            disabled={uploadingImage}
                                            onChange={handleFileUpload}
                                            style={{
                                                position: "absolute",
                                                inset: 0,
                                                opacity: 0,
                                                cursor: uploadingImage ? "not-allowed" : "pointer",
                                                width: "100%",
                                                height: "100%",
                                            }}
                                        />
                                        <div
                                            style={{
                                                display: "flex",
                                                flexDirection: "column",
                                                alignItems: "center",
                                                gap: "8px",
                                                color: "var(--muted)",
                                            }}
                                        >
                                            {uploadingImage ? (
                                                <>
                                                    <Loader2 size={24} className="animate-spin text-[var(--teal)]" />
                                                    <span style={{ fontSize: "12px", fontWeight: 600 }}>
                                                        Mengunggah gambar ke server...
                                                    </span>
                                                </>
                                            ) : (
                                                <>
                                                    <UploadCloud size={28} color="var(--teal)" />
                                                    <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--ink)" }}>
                                                        Pilih file foto produk
                                                    </span>
                                                    <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                                                        Mendukung JPG, PNG, atau WebP (Maks. 5MB)
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Deskripsi Produk */}
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
                                        Deskripsi & Informasi Produk *
                                    </label>
                                    <textarea
                                        required
                                        rows={5}
                                        placeholder="Tuliskan informasi produk olahan ini: manfaat pupuk, kadar nutrisi, cara pemakaian, asal bahan olahan, dll..."
                                        value={form.deskripsi}
                                        onChange={(e) =>
                                            setForm({ ...form, deskripsi: e.target.value })
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

                                {/* Status Postingan */}
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
                                        Status Publikasi
                                    </label>
                                    <div style={{ display: "flex", gap: "12px" }}>
                                        <label
                                            style={{
                                                flex: 1,
                                                padding: "10px 14px",
                                                borderRadius: "8px",
                                                border: `1.5px solid ${form.status === "Publik" ? "var(--teal)" : "var(--line)"}`,
                                                background: form.status === "Publik" ? "rgba(11, 143, 130, 0.05)" : "#fff",
                                                cursor: "pointer",
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "8px",
                                                fontSize: "13px",
                                                fontWeight: 600,
                                                color: form.status === "Publik" ? "var(--teal)" : "var(--ink)",
                                            }}
                                        >
                                            <input
                                                type="radio"
                                                name="status"
                                                value="Publik"
                                                checked={form.status === "Publik"}
                                                onChange={() => setForm({ ...form, status: "Publik" })}
                                                style={{ accentColor: "var(--teal)" }}
                                            />
                                            <span>Publik (Tampil di Web)</span>
                                        </label>

                                        <label
                                            style={{
                                                flex: 1,
                                                padding: "10px 14px",
                                                borderRadius: "8px",
                                                border: `1.5px solid ${form.status === "Draft" ? "var(--amber)" : "var(--line)"}`,
                                                background: form.status === "Draft" ? "rgba(242, 164, 93, 0.08)" : "#fff",
                                                cursor: "pointer",
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "8px",
                                                fontSize: "13px",
                                                fontWeight: 600,
                                                color: form.status === "Draft" ? "#b45309" : "var(--ink)",
                                            }}
                                        >
                                            <input
                                                type="radio"
                                                name="status"
                                                value="Draft"
                                                checked={form.status === "Draft"}
                                                onChange={() => setForm({ ...form, status: "Draft" })}
                                                style={{ accentColor: "var(--amber)" }}
                                            />
                                            <span>Draft (Simpan Internal)</span>
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
                                    disabled={submitting || uploadingImage}
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
                                        cursor: submitting || uploadingImage ? "not-allowed" : "pointer",
                                        opacity: submitting || uploadingImage ? 0.7 : 1,
                                    }}
                                >
                                    {submitting ? (
                                        <>
                                            <Loader2 size={16} className="animate-spin" /> Menyimpan...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle size={16} /> Simpan Postingan
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </section>
                </div>
            )}

            {/* ── MODAL PREVIEW DETAIL ── */}
            {modalMode === "preview" && activePost && (
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
                            maxWidth: "600px",
                            width: "100%",
                            overflow: "hidden",
                            boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div
                            style={{
                                position: "relative",
                                width: "100%",
                                height: "280px",
                                background: "#000",
                            }}
                        >
                            <Image
                                src={activePost.gambar_url}
                                alt={activePost.judul}
                                fill
                                style={{ objectFit: "cover" }}
                                unoptimized
                            />
                            <button
                                type="button"
                                onClick={closeModal}
                                style={{
                                    position: "absolute",
                                    top: "14px",
                                    right: "14px",
                                    background: "rgba(0,0,0,0.6)",
                                    color: "#fff",
                                    border: "none",
                                    borderRadius: "50%",
                                    width: "32px",
                                    height: "32px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    cursor: "pointer",
                                }}
                            >
                                <X size={18} />
                            </button>
                            <div
                                style={{
                                    position: "absolute",
                                    bottom: "14px",
                                    left: "14px",
                                    background: "rgba(11, 143, 130, 0.95)",
                                    color: "#fff",
                                    padding: "6px 14px",
                                    borderRadius: "100px",
                                    fontSize: "12px",
                                    fontWeight: 700,
                                }}
                            >
                                {activePost.desa?.nama || "Desa"}
                            </div>
                        </div>

                        <div style={{ padding: "24px" }}>
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    marginBottom: "12px",
                                }}
                            >
                                <span
                                    style={{
                                        fontSize: "12px",
                                        color: "var(--muted)",
                                    }}
                                >
                                    Dipublikasikan:{" "}
                                    {new Date(activePost.created_at).toLocaleDateString("id-ID", {
                                        dateStyle: "long",
                                    })}
                                </span>
                                <span
                                    style={{
                                        fontSize: "11px",
                                        fontWeight: 700,
                                        padding: "4px 10px",
                                        borderRadius: "100px",
                                        background:
                                            activePost.status === "Publik" ? "#dcfce7" : "#fef3c7",
                                        color:
                                            activePost.status === "Publik" ? "#166534" : "#92400e",
                                    }}
                                >
                                    {activePost.status}
                                </span>
                            </div>

                            <h2
                                style={{
                                    margin: "0 0 16px 0",
                                    fontSize: "20px",
                                    fontWeight: 800,
                                    color: "var(--ink)",
                                    lineHeight: 1.3,
                                }}
                            >
                                {activePost.judul}
                            </h2>

                            <div
                                style={{
                                    fontSize: "14px",
                                    color: "#4a5a55",
                                    lineHeight: 1.7,
                                    whiteSpace: "pre-line",
                                    maxHeight: "220px",
                                    overflowY: "auto",
                                    paddingRight: "6px",
                                }}
                            >
                                {activePost.deskripsi}
                            </div>

                            <div
                                style={{
                                    marginTop: "24px",
                                    display: "flex",
                                    justifyContent: "flex-end",
                                }}
                            >
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
                </div>
            )}

            {/* ── MODAL DELETE CONFIRMATION ── */}
            {modalMode === "delete" && activePost && (
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
                            Hapus Postingan Produk?
                        </h3>
                        <p
                            style={{
                                margin: "0 0 20px 0",
                                fontSize: "13px",
                                color: "var(--muted)",
                                lineHeight: 1.5,
                            }}
                        >
                            Apakah Anda yakin ingin menghapus postingan{" "}
                            <strong>&ldquo;{activePost.judul}&rdquo;</strong>? Tindakan ini tidak dapat
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
                                    "Ya, Hapus Postingan"
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}

export default function PostinganPage() {
    return (
        <FormShell title="Postingan & Produk" activeLabel="Postingan & Produk">
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
                <PostinganContent />
            </Suspense>
        </FormShell>
    );
}
