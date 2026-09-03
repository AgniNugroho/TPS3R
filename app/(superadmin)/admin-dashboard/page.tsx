"use client";

import { useEffect, useState } from "react";
import {
    Plus,
    Search,
    Edit3,
    Trash2,
    UserPlus,
    Shield,
    MapPin,
    Activity,
    X,
    Bell,
    CalendarDays,
    Menu,
    RefreshCw,
    Lock,
    Mail,
    User,
    CheckCircle,
    AlertCircle,
    Info,
    Phone,
} from "lucide-react";
import SidebarSuperAdmin from "@/components/dashboard/SidebarSuperAdmin";
import ProfileMenu from "@/components/dashboard/ProfileMenu";

type UserAccount = {
    id: string;
    email: string;
    nama: string;
    peran: string;
    status: string;
    desa_id: string | null;
    desa_nama: string;
    nomor_hp?: string;
    created_at: string;
};

type Desa = {
    id: string;
    kode: string;
    nama: string;
    kecamatan: string;
    kabupaten: string;
};

export default function AdminPage() {
    const [mobileOpen, setMobileOpen] = useState(false);
    const [localDate, setLocalDate] = useState("");
    const [users, setUsers] = useState<UserAccount[]>([]);
    const [desaList, setDesaList] = useState<Desa[]>([]);

    // UI States
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    // Filters & Search
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("Semua");
    const [roleFilter, setRoleFilter] = useState("Semua");

    // Modal Control
    const [modalMode, setModalMode] = useState<
        "create" | "edit" | "delete" | null
    >(null);
    const [selectedUser, setSelectedUser] = useState<UserAccount | null>(null);

    // Form inputs
    const [formNama, setFormNama] = useState("");
    const [formEmail, setFormEmail] = useState("");
    const [formNomorHp, setFormNomorHp] = useState("");
    const [formPassword, setFormPassword] = useState("");
    const [formPeran, setFormPeran] = useState("Pengelola TPS3R");
    const [formDesaId, setFormDesaId] = useState("");
    const [formStatus, setFormStatus] = useState("Aktif");

    // Load dynamic village date
    useEffect(() => {
        setLocalDate(
            new Intl.DateTimeFormat("id-ID", {
                dateStyle: "long",
            }).format(new Date()),
        );
    }, []);

    // Fetch data
    const fetchData = async () => {
        setLoading(true);
        setErrorMessage("");
        try {
            const [usersRes, desaRes] = await Promise.all([
                fetch("/api/superadmin/users"),
                fetch("/api/desa"),
            ]);

            const usersData = await usersRes.json();
            const desaData = await desaRes.json();

            if (usersData.ok) {
                setUsers(usersData.users);
            } else {
                setErrorMessage(
                    usersData.error || "Gagal memuat data pengguna.",
                );
            }

            if (desaData.ok) {
                setDesaList(desaData.rows || []);
            }
        } catch (err: any) {
            setErrorMessage("Gagal menghubungkan ke server.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Trigger actions
    const openCreateModal = () => {
        setErrorMessage("");
        setFormNama("");
        setFormEmail("");
        setFormNomorHp("");
        setFormPassword("");
        setFormPeran("Pengelola TPS3R");
        setFormDesaId(desaList[0]?.id || "");
        setFormStatus("Aktif");
        setModalMode("create");
    };

    const openEditModal = (user: UserAccount) => {
        setErrorMessage("");
        setSelectedUser(user);
        setFormNama(user.nama);
        setFormEmail(user.email);
        setFormNomorHp(user.nomor_hp || "");
        setFormPassword(""); // Leave empty for optional change
        setFormPeran(user.peran);
        setFormDesaId(user.desa_id || "");
        setFormStatus(user.status);
        setModalMode("edit");
    };

    const openDeleteModal = (user: UserAccount) => {
        setErrorMessage("");
        setSelectedUser(user);
        setModalMode("delete");
    };

    const closeModal = () => {
        setModalMode(null);
        setSelectedUser(null);
        setErrorMessage("");
    };

    // Auto dismiss success messages
    useEffect(() => {
        if (successMessage) {
            const timer = setTimeout(() => setSuccessMessage(""), 4000);
            return () => clearTimeout(timer);
        }
    }, [successMessage]);

    // Handle Form Submit
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage("");
        setSubmitting(true);

        const payload = {
            id: selectedUser?.id,
            email: formEmail,
            password: formPassword,
            nama: formNama,
            peran: formPeran,
            status: formStatus,
            desa_id: formDesaId || null,
            nomor_hp: formNomorHp,
        };

        try {
            let res;
            if (modalMode === "create") {
                res = await fetch("/api/superadmin/users", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });
            } else {
                res = await fetch("/api/superadmin/users", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });
            }

            const data = await res.json();
            if (data.ok) {
                setSuccessMessage(
                    modalMode === "create"
                        ? "Akun pengelola baru berhasil dibuat!"
                        : "Akun pengelola berhasil diperbarui!",
                );
                closeModal();
                fetchData();
            } else {
                setErrorMessage(data.error || "Terjadi kesalahan.");
            }
        } catch (err) {
            setErrorMessage("Gagal menghubungi server untuk menyimpan data.");
        } finally {
            setSubmitting(false);
        }
    };

    // Handle Delete
    const handleDelete = async () => {
        if (!selectedUser) return;
        setErrorMessage("");
        setSubmitting(true);

        try {
            const res = await fetch(
                `/api/superadmin/users?id=${selectedUser.id}`,
                {
                    method: "DELETE",
                },
            );
            const data = await res.json();
            if (data.ok) {
                setSuccessMessage("Akun pengelola berhasil dihapus!");
                closeModal();
                fetchData();
            } else {
                setErrorMessage(data.error || "Gagal menghapus akun.");
            }
        } catch (err) {
            setErrorMessage("Gagal menghubungi server untuk menghapus data.");
        } finally {
            setSubmitting(false);
        }
    };

    // Filtered users list
    const filteredUsers = users.filter((user) => {
        const matchesSearch =
            user.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (user.desa_nama || "")
                .toLowerCase()
                .includes(searchQuery.toLowerCase());

        const matchesStatus =
            statusFilter === "Semua" || user.status === statusFilter;
        const matchesRole = roleFilter === "Semua" || user.peran === roleFilter;

        return matchesSearch && matchesStatus && matchesRole;
    });

    // Stats calculations
    const totalUsers = users.length;
    const activeUsers = users.filter((u) => u.status === "Aktif").length;
    const inactiveUsers = users.filter((u) => u.status === "Nonaktif").length;
    const adminCount = users.filter((u) => u.peran === "Admin").length;

    return (
        <main className="app-shell">
            <SidebarSuperAdmin
                mobileOpen={mobileOpen}
                onMobileChange={setMobileOpen}
                activeLabel="Kelola Pengguna"
            />
            <section className="main-area">
                {/* Header Topbar */}
                <header className="topbar">
                    <button
                        className="icon-button menu-trigger"
                        onClick={() => setMobileOpen(true)}
                        aria-label="Buka menu"
                    >
                        <Menu size={21} />
                    </button>
                    <div className="breadcrumb">
                        <span>Admin</span>
                        <span className="crumb-slash">/</span>
                        <strong>Kelola Pengguna</strong>
                    </div>
                    <div className="topbar-actions">
                        <button
                            className="icon-button notification"
                            aria-label="Notifikasi"
                        >
                            <Bell size={19} />
                            <i />
                        </button>
                        <div className="topbar-date">
                            <CalendarDays size={16} /> {localDate}
                        </div>
                        <ProfileMenu adminArea />
                    </div>
                </header>

                <div className="content-wrap">
                    {/* Page heading */}
                    <div className="page-heading">
                        <div>
                            <p className="eyebrow">
                                <span
                                    className="live-dot"
                                    style={{ backgroundColor: "#efaa6d" }}
                                />{" "}
                                PORTAL ADMIN
                            </p>
                            <h1>Kelola Pengguna TPS3R</h1>
                            <p className="heading-copy">
                                Manajemen kredensial, peran, dan wilayah tugas
                                untuk pengelola TPS3R Kecamatan Dukun.
                            </p>
                        </div>
                        <div className="heading-actions">
                            <button
                                className="primary-button"
                                onClick={openCreateModal}
                                style={{ background: "#0b8f82" }}
                            >
                                <Plus size={16} /> Tambah Pengguna
                            </button>
                            <button
                                className="secondary-button"
                                onClick={fetchData}
                                title="Muat ulang data"
                            >
                                <RefreshCw
                                    size={14}
                                    className={loading ? "animate-spin" : ""}
                                />{" "}
                                Refresh
                            </button>
                        </div>
                    </div>

                    {/* Success alert banner */}
                    {successMessage && (
                        <div className="flex items-center gap-3 p-4 mb-6 text-sm text-emerald-800 rounded-lg bg-emerald-50 border border-emerald-200 shadow-sm transition-all duration-300">
                            <CheckCircle
                                size={18}
                                className="text-emerald-600 flex-shrink-0"
                            />
                            <span>{successMessage}</span>
                        </div>
                    )}

                    {/* Stats cards grid */}
                    <section className="stat-grid">
                        <article className="stat-card">
                            <div className="stat-top">
                                <div>
                                    <p>Total Pengguna</p>
                                    <h2>
                                        {totalUsers}
                                        <small>Akun</small>
                                    </h2>
                                </div>
                                <div className="stat-icon">
                                    <User size={20} />
                                </div>
                            </div>
                            <div className="stat-note">
                                Kredensial terdaftar di sistem
                            </div>
                        </article>
                        <article className="stat-card lime">
                            <div className="stat-top">
                                <div>
                                    <p>Pengelola Aktif</p>
                                    <h2>
                                        {activeUsers}
                                        <small>Akun</small>
                                    </h2>
                                </div>
                                <div className="stat-icon">
                                    <Activity size={20} />
                                </div>
                            </div>
                            <div className="stat-note">
                                Dapat mengakses dashboard
                            </div>
                        </article>
                        <article className="stat-card amber">
                            <div className="stat-top">
                                <div>
                                    <p>Pengelola Nonaktif</p>
                                    <h2>
                                        {inactiveUsers}
                                        <small>Akun</small>
                                    </h2>
                                </div>
                                <div className="stat-icon">
                                    <X size={20} />
                                </div>
                            </div>
                            <div className="stat-note">
                                Hak akses ditangguhkan sementara
                            </div>
                        </article>
                        <article className="stat-card blue">
                            <div className="stat-top">
                                <div>
                                    <p>Admin</p>
                                    <h2>
                                        {adminCount}
                                        <small>Akun</small>
                                    </h2>
                                </div>
                                <div className="stat-icon">
                                    <Shield size={20} />
                                </div>
                            </div>
                            <div className="stat-note">
                                Akses kontrol sistem penuh
                            </div>
                        </article>
                    </section>

                    {/* Toolbar filter */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 mb-4 bg-white rounded-xl border border-[var(--line)] shadow-sm">
                        <div className="relative flex-1 max-w-md">
                            <span className="absolute inset-y-0 left-3 flex items-center text-gray-400">
                                <Search size={16} />
                            </span>
                            <input
                                type="text"
                                placeholder="Cari nama, email, desa..."
                                className="w-full pl-10 pr-4 py-2 text-sm bg-[#f4f7f4]/60 border border-[var(--line)] rounded-lg outline-none focus:border-[var(--teal)] focus:bg-white transition-all"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-2">
                                <label className="text-xs font-semibold text-gray-500">
                                    Peran:
                                </label>
                                <select
                                    className="px-3 py-1.5 text-xs bg-white border border-[var(--line)] rounded-lg outline-none"
                                    value={roleFilter}
                                    onChange={(e) =>
                                        setRoleFilter(e.target.value)
                                    }
                                >
                                    <option value="Semua">Semua</option>
                                    <option value="Pengelola TPS3R">
                                        Pengelola TPS3R
                                    </option>
                                    <option value="Admin">Admin</option>
                                </select>
                            </div>
                            <div className="flex items-center gap-2">
                                <label className="text-xs font-semibold text-gray-500">
                                    Status:
                                </label>
                                <select
                                    className="px-3 py-1.5 text-xs bg-white border border-[var(--line)] rounded-lg outline-none"
                                    value={statusFilter}
                                    onChange={(e) =>
                                        setStatusFilter(e.target.value)
                                    }
                                >
                                    <option value="Semua">Semua</option>
                                    <option value="Aktif">Aktif</option>
                                    <option value="Nonaktif">Nonaktif</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Table list panel */}
                    <article className="panel">
                        <div className="panel-heading mb-4">
                            <div>
                                <h3 className="text-base font-bold text-[var(--ink)]">
                                    Daftar Pengguna Sistem
                                </h3>
                                <p className="text-xs text-gray-500">
                                    Menampilkan {filteredUsers.length} dari
                                    total {totalUsers} akun terdaftar.
                                </p>
                            </div>
                        </div>

                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-3">
                                <RefreshCw
                                    className="animate-spin text-[var(--teal)]"
                                    size={32}
                                />
                                <p className="text-sm font-medium text-gray-500">
                                    Memuat data pengguna...
                                </p>
                            </div>
                        ) : filteredUsers.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                <div className="p-4 bg-gray-50 text-gray-400 rounded-full mb-4">
                                    <User size={40} />
                                </div>
                                <h4 className="text-base font-bold text-gray-700">
                                    Tidak ada data ditemukan
                                </h4>
                                <p className="text-xs text-gray-400 max-w-xs mt-1">
                                    Coba cari dengan kata kunci lain atau
                                    bersihkan filter pencarian.
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-[var(--line)] text-xs font-bold text-gray-500 uppercase tracking-wider bg-gray-50/50">
                                            <th className="py-3.5 px-4 font-semibold">
                                                Nama Pengguna
                                            </th>
                                            <th className="py-3.5 px-4 font-semibold">
                                                Email
                                            </th>
                                            <th className="py-3.5 px-4 font-semibold">
                                                Peran
                                            </th>
                                            <th className="py-3.5 px-4 font-semibold">
                                                Wilayah Tugas (Desa)
                                            </th>
                                            <th className="py-3.5 px-4 font-semibold">
                                                Status
                                            </th>
                                            <th className="py-3.5 px-4 font-semibold">
                                                Tanggal Daftar
                                            </th>
                                            <th className="py-3.5 px-4 font-semibold text-right">
                                                Aksi
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 text-sm">
                                        {filteredUsers.map((user) => (
                                            <tr
                                                key={user.id}
                                                className="hover:bg-gray-50/50 transition-colors"
                                            >
                                                <td className="py-4 px-4 font-semibold text-gray-800">
                                                    {user.nama}
                                                </td>
                                                <td className="py-4 px-4 text-gray-600 font-mono text-xs">
                                                    <div>{user.email}</div>
                                                    {user.nomor_hp && (
                                                        <div className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1 font-sans">
                                                            <Phone
                                                                size={10}
                                                                className="text-gray-400"
                                                            />{" "}
                                                            {user.nomor_hp}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="py-4 px-4">
                                                    <span
                                                        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold ${
                                                            user.peran ===
                                                            "Admin"
                                                                ? "bg-amber-50 text-amber-700 border border-amber-100"
                                                                : "bg-teal-50 text-teal-700 border border-teal-100"
                                                        }`}
                                                    >
                                                        {user.peran ===
                                                        "Admin" ? (
                                                            <Shield size={12} />
                                                        ) : (
                                                            <User size={12} />
                                                        )}
                                                        {user.peran}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-4 text-gray-600">
                                                    <div className="flex items-center gap-1">
                                                        <MapPin
                                                            size={14}
                                                            className="text-gray-400 flex-shrink-0"
                                                        />
                                                        <span
                                                            className="truncate max-w-[200px]"
                                                            title={
                                                                user.desa_nama
                                                            }
                                                        >
                                                            {user.desa_nama}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-4">
                                                    <span
                                                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                                            user.status ===
                                                            "Aktif"
                                                                ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                                                : "bg-gray-100 text-gray-600 border border-gray-200"
                                                        }`}
                                                    >
                                                        <span
                                                            className={`w-1.5 h-1.5 rounded-full ${
                                                                user.status ===
                                                                "Aktif"
                                                                    ? "bg-emerald-500"
                                                                    : "bg-gray-400"
                                                            }`}
                                                        />
                                                        {user.status}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-4 text-xs text-gray-400">
                                                    {new Date(
                                                        user.created_at,
                                                    ).toLocaleDateString(
                                                        "id-ID",
                                                        {
                                                            year: "numeric",
                                                            month: "short",
                                                            day: "numeric",
                                                        },
                                                    )}
                                                </td>
                                                <td className="py-4 px-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            className="p-1.5 text-gray-500 hover:text-[var(--teal)] hover:bg-teal-50 rounded-lg transition-all"
                                                            onClick={() =>
                                                                openEditModal(
                                                                    user,
                                                                )
                                                            }
                                                            title="Edit Pengguna"
                                                        >
                                                            <Edit3 size={16} />
                                                        </button>
                                                        <button
                                                            className="p-1.5 text-gray-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                                            onClick={() =>
                                                                openDeleteModal(
                                                                    user,
                                                                )
                                                            }
                                                            title="Hapus Pengguna"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </article>

                    <footer className="footer-note mt-8">
                        <span>
                            <span className="status-pulse" /> Sesi Admin Aktif
                        </span>
                        <span>
                            Dashboard Admin <b>•</b> v1.0.0
                        </span>
                    </footer>
                </div>
            </section>

            {/* Create & Edit Modal Popup */}
            {(modalMode === "create" || modalMode === "edit") && (
                <div
                    className="modal-backdrop z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs"
                    role="presentation"
                    onClick={closeModal}
                >
                    <section
                        className="activity-modal max-w-lg w-full bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-100 transition-all duration-300"
                        role="dialog"
                        aria-modal="true"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="modal-header border-b border-gray-100 p-5 bg-gradient-to-r from-teal-50/50 to-emerald-50/50">
                            <div>
                                <h2 className="text-lg font-extrabold text-[var(--ink)]">
                                    {modalMode === "create"
                                        ? "Tambah Akun Pengelola"
                                        : "Edit Kredensial Pengguna"}
                                </h2>
                                <p className="text-xs text-gray-500 mt-1">
                                    {modalMode === "create"
                                        ? "Buat akun login baru dan tentukan wilayah otoritas kerjanya."
                                        : "Ubah data akun, peran, wilayah, atau ganti kata sandi."}
                                </p>
                            </div>
                            <button
                                className="icon-button hover:bg-gray-100 rounded-full p-1"
                                onClick={closeModal}
                                aria-label="Tutup form"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                                {/* Error panel */}
                                {errorMessage && (
                                    <div className="flex items-start gap-2 p-3.5 bg-rose-50 text-rose-800 border border-rose-200 rounded-lg text-xs">
                                        <AlertCircle
                                            size={16}
                                            className="text-rose-600 flex-shrink-0 mt-0.5"
                                        />
                                        <span>{errorMessage}</span>
                                    </div>
                                )}

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-600 uppercase tracking-wider flex items-center gap-1">
                                        <User
                                            size={12}
                                            className="text-gray-400"
                                        />{" "}
                                        Nama Lengkap
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Contoh: Agni Nugroho"
                                        className="w-full px-3.5 py-2.5 text-sm bg-[#f4f7f4]/40 border border-gray-200 rounded-lg focus:border-[var(--teal)] outline-none focus:bg-white transition-all"
                                        value={formNama}
                                        onChange={(e) =>
                                            setFormNama(e.target.value)
                                        }
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-600 uppercase tracking-wider flex items-center gap-1">
                                        <Mail
                                            size={12}
                                            className="text-gray-400"
                                        />{" "}
                                        Email Akun (Surel)
                                    </label>
                                    <input
                                        type="email"
                                        required
                                        placeholder="Contoh: agni@desa.go.id"
                                        className="w-full px-3.5 py-2.5 text-sm bg-[#f4f7f4]/40 border border-gray-200 rounded-lg focus:border-[var(--teal)] outline-none focus:bg-white transition-all"
                                        value={formEmail}
                                        onChange={(e) =>
                                            setFormEmail(e.target.value)
                                        }
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-600 uppercase tracking-wider flex items-center gap-1">
                                        <Phone
                                            size={12}
                                            className="text-gray-400"
                                        />{" "}
                                        Nomor HP / WhatsApp
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Contoh: 08123456789"
                                        className="w-full px-3.5 py-2.5 text-sm bg-[#f4f7f4]/40 border border-gray-200 rounded-lg focus:border-[var(--teal)] outline-none focus:bg-white transition-all"
                                        value={formNomorHp}
                                        onChange={(e) =>
                                            setFormNomorHp(e.target.value)
                                        }
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-600 uppercase tracking-wider flex items-center gap-1">
                                        <Lock
                                            size={12}
                                            className="text-gray-400"
                                        />{" "}
                                        Password (Kata Sandi)
                                    </label>
                                    <input
                                        type="password"
                                        required={modalMode === "create"}
                                        placeholder={
                                            modalMode === "create"
                                                ? "Minimal 6 karakter"
                                                : "Kosongkan jika tidak diubah"
                                        }
                                        className="w-full px-3.5 py-2.5 text-sm bg-[#f4f7f4]/40 border border-gray-200 rounded-lg focus:border-[var(--teal)] outline-none focus:bg-white transition-all"
                                        value={formPassword}
                                        onChange={(e) =>
                                            setFormPassword(e.target.value)
                                        }
                                    />
                                    {modalMode === "edit" && (
                                        <p className="text-[10px] text-gray-400 flex items-center gap-1 mt-1">
                                            <Info size={10} /> Biarkan kosong
                                            kecuali Anda ingin mereset password
                                            akun ini.
                                        </p>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-gray-600 uppercase tracking-wider flex items-center gap-1">
                                            <Shield
                                                size={12}
                                                className="text-gray-400"
                                            />{" "}
                                            Peran Otoritas
                                        </label>
                                        <select
                                            className="w-full px-3.5 py-2.5 text-sm bg-[#f4f7f4]/40 border border-gray-200 rounded-lg focus:border-[var(--teal)] outline-none focus:bg-white transition-all"
                                            value={formPeran}
                                            onChange={(e) =>
                                                setFormPeran(e.target.value)
                                            }
                                        >
                                            <option value="Pengelola TPS3R">
                                                Pengelola TPS3R
                                            </option>
                                            <option value="Admin">Admin</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-gray-600 uppercase tracking-wider flex items-center gap-1">
                                            <Activity
                                                size={12}
                                                className="text-gray-400"
                                            />{" "}
                                            Status Akun
                                        </label>
                                        <select
                                            className="w-full px-3.5 py-2.5 text-sm bg-[#f4f7f4]/40 border border-gray-200 rounded-lg focus:border-[var(--teal)] outline-none focus:bg-white transition-all"
                                            value={formStatus}
                                            onChange={(e) =>
                                                setFormStatus(e.target.value)
                                            }
                                        >
                                            <option value="Aktif">Aktif</option>
                                            <option value="Nonaktif">
                                                Nonaktif
                                            </option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-600 uppercase tracking-wider flex items-center gap-1">
                                        <MapPin
                                            size={12}
                                            className="text-gray-400"
                                        />{" "}
                                        Wilayah Tugas Otoritas (Desa)
                                    </label>
                                    <select
                                        className="w-full px-3.5 py-2.5 text-sm bg-[#f4f7f4]/40 border border-gray-200 rounded-lg focus:border-[var(--teal)] outline-none focus:bg-white transition-all disabled:opacity-50"
                                        value={
                                            formPeran === "Admin"
                                                ? ""
                                                : formDesaId
                                        }
                                        onChange={(e) =>
                                            setFormDesaId(e.target.value)
                                        }
                                        disabled={formPeran === "Admin"}
                                    >
                                        <option value="">
                                            -- Tanpa Otoritas Wilayah Khusus --
                                        </option>
                                        {desaList.map((desa) => (
                                            <option
                                                key={desa.id}
                                                value={desa.id}
                                            >
                                                {desa.nama} - Kode: {desa.kode}
                                            </option>
                                        ))}
                                    </select>
                                    <p className="text-[10px] text-gray-400">
                                        {formPeran === "Admin"
                                            ? "Akun Admin secara default memiliki akses ke seluruh desa."
                                            : "Menentukan wilayah administrasi desa asal pencatatan sampah bagi pengelola."}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-100 bg-gray-50/50">
                                <button
                                    type="button"
                                    className="px-4 py-2 text-xs font-bold text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all"
                                    onClick={closeModal}
                                    disabled={submitting}
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 text-xs font-bold text-white bg-[var(--teal)] rounded-lg hover:bg-[var(--deep-teal)] shadow-md transition-all flex items-center gap-2"
                                    disabled={submitting}
                                >
                                    {submitting ? (
                                        <>
                                            <RefreshCw
                                                size={14}
                                                className="animate-spin"
                                            />{" "}
                                            Menyimpan...
                                        </>
                                    ) : (
                                        "Simpan Akun"
                                    )}
                                </button>
                            </div>
                        </form>
                    </section>
                </div>
            )}

            {/* Delete Confirmation Modal Popup */}
            {modalMode === "delete" && selectedUser && (
                <div
                    className="modal-backdrop z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs"
                    role="presentation"
                    onClick={closeModal}
                >
                    <section
                        className="activity-modal max-w-md w-full bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-100"
                        role="dialog"
                        aria-modal="true"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="modal-header border-b border-gray-100 p-5 bg-rose-50/30">
                            <div>
                                <h2 className="text-lg font-extrabold text-rose-950 flex items-center gap-2">
                                    <AlertCircle
                                        size={20}
                                        className="text-rose-600"
                                    />{" "}
                                    Hapus Akun Pengguna?
                                </h2>
                                <p className="text-xs text-rose-700/80 mt-1">
                                    Konfirmasi pembersihan akses kredensial
                                    pengguna secara permanen.
                                </p>
                            </div>
                            <button
                                className="icon-button hover:bg-gray-100 rounded-full p-1"
                                onClick={closeModal}
                                aria-label="Tutup dialog"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            {/* Error panel */}
                            {errorMessage && (
                                <div className="p-3.5 bg-rose-50 text-rose-800 border border-rose-200 rounded-lg text-xs">
                                    {errorMessage}
                                </div>
                            )}

                            <p className="text-sm text-gray-600 leading-relaxed">
                                Apakah Anda yakin ingin menghapus akun{" "}
                                <strong>{selectedUser.nama}</strong> (
                                <code>{selectedUser.email}</code>)? Tindakan ini{" "}
                                <strong>tidak dapat dibatalkan</strong>.
                                Pengguna ini akan langsung kehilangan akses
                                login ke sistem dashboard.
                            </p>
                        </div>

                        <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-100 bg-gray-50/50">
                            <button
                                type="button"
                                className="px-4 py-2 text-xs font-bold text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all"
                                onClick={closeModal}
                                disabled={submitting}
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                className="px-5 py-2 text-xs font-bold text-white bg-rose-600 rounded-lg hover:bg-rose-700 shadow-md transition-all flex items-center gap-2"
                                onClick={handleDelete}
                                disabled={submitting}
                            >
                                {submitting ? (
                                    <>
                                        <RefreshCw
                                            size={14}
                                            className="animate-spin"
                                        />{" "}
                                        Menghapus...
                                    </>
                                ) : (
                                    "Ya, Hapus Akun"
                                )}
                            </button>
                        </div>
                    </section>
                </div>
            )}
        </main>
    );
}
