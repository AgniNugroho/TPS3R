"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
    Activity,
    AlertCircle,
    Edit3,
    Home,
    MapPin,
    Plus,
    RefreshCw,
    Search,
    Trash2,
    Users,
    X,
} from "lucide-react";
import FormShell from "@/components/dashboard/FormShell";
import { showSuccessToast } from "@/components/ui/Toast";

type Wilayah = {
    id: string;
    kode: string;
    dusun: string;
    rt: string | null;
    rw: string | null;
    jumlah_kk: number;
    jumlah_jiwa: number;
    status: string;
    desa_id: string;
};

type Desa = { id: string; kode: string; nama: string };
type ModalMode = "create" | "edit" | "delete" | null;

const emptyForm = {
    kode: "",
    dusun: "",
    rt: "",
    rw: "",
    jumlah_kk: "0",
    jumlah_jiwa: "0",
    status: "Aktif",
    desa_id: "",
};

export default function WilayahPage() {
    const searchParams = useSearchParams();
    const selectedDesaId = searchParams.get("desa_id");
    const [wilayahRows, setWilayahRows] = useState<Wilayah[]>([]);
    const [desaRows, setDesaRows] = useState<Desa[]>([]);
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("Semua");
    const [modalMode, setModalMode] = useState<ModalMode>(null);
    const [selectedWilayah, setSelectedWilayah] = useState<Wilayah | null>(
        null,
    );
    const [form, setForm] = useState(emptyForm);
    const [errorMessage, setErrorMessage] = useState("");

    const loadData = useCallback(
        async (desaId = selectedDesaId) => {
            setLoading(true);
            setErrorMessage("");
            try {
                const [wilayahResponse, desaResponse, meResponse] =
                    await Promise.all([
                        fetch(
                            desaId
                                ? `/api/wilayah?desa_id=${encodeURIComponent(desaId)}`
                                : "/api/wilayah",
                        ),
                        fetch("/api/desa"),
                        fetch("/api/me"),
                    ]);
                const [wilayahData, desaData, meData] = await Promise.all([
                    wilayahResponse.json(),
                    desaResponse.json(),
                    meResponse.json(),
                ]);
                if (!wilayahData.ok) {
                    setErrorMessage(
                        wilayahData.error || "Gagal memuat data wilayah.",
                    );
                    return;
                }
                setWilayahRows(wilayahData.rows ?? []);
                setDesaRows(desaData.ok ? (desaData.rows ?? []) : []);
                setIsAdmin(meData.ok && meData.role === "admin");
            } catch {
                setErrorMessage("Gagal menghubungkan ke server.");
            } finally {
                setLoading(false);
            }
        },
        [selectedDesaId],
    );

    useEffect(() => {
        void Promise.resolve().then(() => loadData(selectedDesaId));
    }, [loadData, selectedDesaId]);

    function closeModal() {
        setModalMode(null);
        setSelectedWilayah(null);
        setErrorMessage("");
    }

    function openCreateModal() {
        setErrorMessage("");
        setForm({ ...emptyForm, desa_id: desaRows[0]?.id ?? "" });
        setModalMode("create");
    }

    function openEditModal(wilayah: Wilayah) {
        setErrorMessage("");
        setSelectedWilayah(wilayah);
        setForm({
            kode: wilayah.kode,
            dusun: wilayah.dusun,
            rt: wilayah.rt ?? "",
            rw: wilayah.rw ?? "",
            jumlah_kk: String(wilayah.jumlah_kk ?? 0),
            jumlah_jiwa: String(wilayah.jumlah_jiwa ?? 0),
            status: wilayah.status,
            desa_id: wilayah.desa_id,
        });
        setModalMode("edit");
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setSubmitting(true);
        setErrorMessage("");
        try {
            const response = await fetch("/api/wilayah", {
                method: modalMode === "create" ? "POST" : "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...form, id: selectedWilayah?.id }),
            });
            const data = await response.json();
            if (!data.ok) {
                setErrorMessage(data.error || "Gagal menyimpan wilayah.");
                return;
            }
            showSuccessToast(
                modalMode === "create"
                    ? "Dusun berhasil ditambahkan."
                    : "Data dusun berhasil diperbarui.",
            );
            closeModal();
            await loadData();
        } catch {
            setErrorMessage("Gagal menghubungi server untuk menyimpan data.");
        } finally {
            setSubmitting(false);
        }
    }

    async function handleDelete() {
        if (!selectedWilayah) return;
        setSubmitting(true);
        setErrorMessage("");
        try {
            const response = await fetch(
                `/api/wilayah?id=${selectedWilayah.id}`,
                {
                    method: "DELETE",
                },
            );
            const data = await response.json();
            if (!data.ok) {
                setErrorMessage(data.error || "Gagal menghapus wilayah.");
                return;
            }
            showSuccessToast("Dusun berhasil dihapus.");
            closeModal();
            await loadData();
        } catch {
            setErrorMessage("Gagal menghubungi server untuk menghapus data.");
        } finally {
            setSubmitting(false);
        }
    }

    const filteredRows = wilayahRows.filter((wilayah) => {
        const query = searchQuery.toLowerCase();
        return (
            (wilayah.dusun.toLowerCase().includes(query) ||
                wilayah.kode.toLowerCase().includes(query) ||
                (wilayah.rt ?? "").toLowerCase().includes(query) ||
                (wilayah.rw ?? "").toLowerCase().includes(query)) &&
            (statusFilter === "Semua" || wilayah.status === statusFilter)
        );
    });
    const activeCount = wilayahRows.filter(
        (row) => row.status === "Aktif",
    ).length;
    const totalKk = wilayahRows.reduce(
        (total, row) => total + (row.jumlah_kk ?? 0),
        0,
    );
    const totalJiwa = wilayahRows.reduce(
        (total, row) => total + (row.jumlah_jiwa ?? 0),
        0,
    );
    const desaNameById = new Map(desaRows.map((desa) => [desa.id, desa.nama]));

    return (
        <FormShell title="Manajemen Wilayah">
            <main className="content-wrap">
                <div className="page-heading">
                    <div>
                        <p className="eyebrow">
                            <span className="live-dot" /> MASTER DATA
                        </p>
                        <h1>Manajemen Wilayah</h1>
                        <p className="heading-copy">
                            Kelola data dusun sebagai dasar pencatatan layanan
                            TPS3R.
                        </p>
                    </div>
                    <div className="heading-actions">
                        <button
                            className="primary-button"
                            onClick={openCreateModal}
                        >
                            <Plus size={16} /> Tambah Dusun
                        </button>
                        <button
                            className="secondary-button"
                            onClick={() => void loadData()}
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

                {errorMessage && !modalMode && (
                    <div className="flex items-center gap-3 p-4 mb-6 text-sm text-rose-800 rounded-lg bg-rose-50 border border-rose-200 shadow-sm">
                        <AlertCircle
                            size={18}
                            className="text-rose-600 shrink-0"
                        />
                        <span>{errorMessage}</span>
                    </div>
                )}

                <section className="stat-grid">
                    <article className="stat-card">
                        <div className="stat-top">
                            <div>
                                <p>Total Dusun</p>
                                <h2>
                                    {wilayahRows.length}
                                    <small>Dusun</small>
                                </h2>
                            </div>
                            <div className="stat-icon">
                                <MapPin size={20} />
                            </div>
                        </div>
                        <div className="stat-note">Wilayah terdaftar</div>
                    </article>
                    <article className="stat-card lime">
                        <div className="stat-top">
                            <div>
                                <p>Dusun Aktif</p>
                                <h2>
                                    {activeCount}
                                    <small>Dusun</small>
                                </h2>
                            </div>
                            <div className="stat-icon">
                                <Activity size={20} />
                            </div>
                        </div>
                        <div className="stat-note">
                            Siap digunakan dalam pencatatan
                        </div>
                    </article>
                    <article className="stat-card amber">
                        <div className="stat-top">
                            <div>
                                <p>Total Keluarga</p>
                                <h2>
                                    {totalKk}
                                    <small>KK</small>
                                </h2>
                            </div>
                            <div className="stat-icon">
                                <Home size={20} />
                            </div>
                        </div>
                        <div className="stat-note">
                            Akumulasi keluarga terlayani
                        </div>
                    </article>
                    <article className="stat-card blue">
                        <div className="stat-top">
                            <div>
                                <p>Total Penduduk</p>
                                <h2>
                                    {totalJiwa}
                                    <small>Jiwa</small>
                                </h2>
                            </div>
                            <div className="stat-icon">
                                <Users size={20} />
                            </div>
                        </div>
                        <div className="stat-note">
                            Akumulasi data penduduk dusun
                        </div>
                    </article>
                </section>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 mb-4 bg-white rounded-lg border border-[var(--line)] shadow-sm">
                    <div className="relative flex-1 max-w-md">
                        <span className="absolute inset-y-0 left-3 flex items-center text-gray-400">
                            <Search size={16} />
                        </span>
                        <input
                            type="search"
                            placeholder="Cari nama dusun, kode, RT, atau RW..."
                            className="w-full pl-10 pr-4 py-2 text-sm bg-[#f4f7f4]/60 border border-[var(--line)] rounded-lg outline-none focus:border-[var(--teal)] focus:bg-white"
                            value={searchQuery}
                            onChange={(event) =>
                                setSearchQuery(event.target.value)
                            }
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <label
                            htmlFor="status-filter"
                            className="text-xs font-semibold text-gray-500"
                        >
                            Status:
                        </label>
                        <select
                            id="status-filter"
                            className="px-3 py-1.5 text-xs bg-white border border-[var(--line)] rounded-lg outline-none"
                            value={statusFilter}
                            onChange={(event) =>
                                setStatusFilter(event.target.value)
                            }
                        >
                            <option value="Semua">Semua</option>
                            <option value="Aktif">Aktif</option>
                            <option value="Nonaktif">Nonaktif</option>
                        </select>
                    </div>
                </div>

                <article className="panel">
                    <div className="panel-heading mb-4">
                        <div>
                            <h3 className="text-base font-bold text-[var(--ink)]">
                                Daftar Dusun
                            </h3>
                            <p className="text-xs text-gray-500">
                                Menampilkan {filteredRows.length} dari{" "}
                                {wilayahRows.length} dusun.
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
                                Memuat data wilayah...
                            </p>
                        </div>
                    ) : filteredRows.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="p-4 bg-gray-50 text-gray-400 rounded-full mb-4">
                                <MapPin size={40} />
                            </div>
                            <h4 className="text-base font-bold text-gray-700">
                                Tidak ada dusun ditemukan
                            </h4>
                            <p className="text-xs text-gray-400 max-w-xs mt-1">
                                Tambahkan dusun baru atau ubah kata kunci
                                pencarian.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-[var(--line)] text-xs font-bold text-gray-500 uppercase tracking-wider bg-gray-50/50">
                                        <th className="py-3.5 px-4 font-semibold">
                                            Dusun
                                        </th>
                                        {isAdmin && (
                                            <th className="py-3.5 px-4 font-semibold">
                                                Desa
                                            </th>
                                        )}
                                        <th className="py-3.5 px-4 font-semibold">
                                            RT / RW
                                        </th>
                                        <th className="py-3.5 px-4 font-semibold text-right">
                                            Jumlah KK
                                        </th>
                                        <th className="py-3.5 px-4 font-semibold text-right">
                                            Jumlah Penduduk
                                        </th>
                                        <th className="py-3.5 px-4 font-semibold">
                                            Status
                                        </th>
                                        <th className="py-3.5 px-4 font-semibold text-right">
                                            Aksi
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 text-sm">
                                    {filteredRows.map((wilayah) => (
                                        <tr
                                            key={wilayah.id}
                                            className="hover:bg-gray-50/50 transition-colors"
                                        >
                                            <td className="py-4 px-4">
                                                <div className="font-semibold text-gray-800">
                                                    {wilayah.dusun}
                                                </div>
                                                <div className="text-xs text-gray-400 font-mono mt-0.5">
                                                    {wilayah.kode}
                                                </div>
                                            </td>
                                            {isAdmin && (
                                                <td className="py-4 px-4 text-gray-600">
                                                    {desaNameById.get(
                                                        wilayah.desa_id,
                                                    ) ?? "-"}
                                                </td>
                                            )}
                                            <td className="py-4 px-4 text-gray-600">
                                                {wilayah.rt || "-"} /{" "}
                                                {wilayah.rw || "-"}
                                            </td>
                                            <td className="py-4 px-4 text-right text-gray-600">
                                                {wilayah.jumlah_kk ?? 0}
                                            </td>
                                            <td className="py-4 px-4 text-right text-gray-600">
                                                {wilayah.jumlah_jiwa ?? 0}
                                            </td>
                                            <td className="py-4 px-4">
                                                <span
                                                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${wilayah.status === "Aktif" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-gray-100 text-gray-600 border border-gray-200"}`}
                                                >
                                                    <span
                                                        className={`w-1.5 h-1.5 rounded-full ${wilayah.status === "Aktif" ? "bg-emerald-500" : "bg-gray-400"}`}
                                                    />
                                                    {wilayah.status}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        className="p-1.5 text-gray-500 hover:text-[var(--teal)] hover:bg-teal-50 rounded-lg transition-all"
                                                        onClick={() =>
                                                            openEditModal(
                                                                wilayah,
                                                            )
                                                        }
                                                        title="Edit dusun"
                                                        aria-label={`Edit ${wilayah.dusun}`}
                                                    >
                                                        <Edit3 size={16} />
                                                    </button>
                                                    <button
                                                        className="p-1.5 text-gray-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                                        onClick={() => {
                                                            setSelectedWilayah(
                                                                wilayah,
                                                            );
                                                            setErrorMessage("");
                                                            setModalMode(
                                                                "delete",
                                                            );
                                                        }}
                                                        title="Hapus dusun"
                                                        aria-label={`Hapus ${wilayah.dusun}`}
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
            </main>

            {(modalMode === "create" || modalMode === "edit") && (
                <div
                    className="modal-backdrop z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs"
                    role="presentation"
                    onClick={closeModal}
                >
                    <section
                        className="activity-modal max-w-lg w-full bg-white rounded-lg shadow-2xl overflow-hidden border border-gray-100"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="wilayah-modal-title"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="modal-header border-b border-gray-100 p-5 bg-teal-50/50">
                            <div>
                                <h2
                                    id="wilayah-modal-title"
                                    className="text-lg font-extrabold text-[var(--ink)]"
                                >
                                    {modalMode === "create"
                                        ? "Tambah Dusun"
                                        : "Edit Data Dusun"}
                                </h2>
                                <p className="text-xs text-gray-500 mt-1">
                                    Lengkapi informasi wilayah untuk pencatatan
                                    layanan TPS3R.
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
                                {errorMessage && (
                                    <div className="flex items-start gap-2 p-3.5 bg-rose-50 text-rose-800 border border-rose-200 rounded-lg text-xs">
                                        <AlertCircle
                                            size={16}
                                            className="text-rose-600 shrink-0 mt-0.5"
                                        />
                                        <span>{errorMessage}</span>
                                    </div>
                                )}
                                <div className="grid grid-cols-2 gap-4">
                                    <label className="space-y-1.5">
                                        <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                                            Kode Dusun
                                        </span>
                                        <input
                                            required
                                            className="w-full px-3.5 py-2.5 text-sm bg-[#f4f7f4]/40 border border-gray-200 rounded-lg focus:border-[var(--teal)] outline-none focus:bg-white"
                                            placeholder="NAMA DUSUN"
                                            value={form.kode}
                                            onChange={(event) =>
                                                setForm({
                                                    ...form,
                                                    kode: event.target.value,
                                                })
                                            }
                                        />
                                    </label>
                                    <label className="space-y-1.5">
                                        <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                                            Nama Dusun
                                        </span>
                                        <input
                                            required
                                            className="w-full px-3.5 py-2.5 text-sm bg-[#f4f7f4]/40 border border-gray-200 rounded-lg focus:border-[var(--teal)] outline-none focus:bg-white"
                                            placeholder="Dusun Karangrejo"
                                            value={form.dusun}
                                            onChange={(event) =>
                                                setForm({
                                                    ...form,
                                                    dusun: event.target.value,
                                                })
                                            }
                                        />
                                    </label>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <label className="space-y-1.5">
                                        <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                                            RT
                                        </span>
                                        <input
                                            className="w-full px-3.5 py-2.5 text-sm bg-[#f4f7f4]/40 border border-gray-200 rounded-lg focus:border-[var(--teal)] outline-none focus:bg-white"
                                            placeholder="Jumlah RT"
                                            value={form.rt}
                                            onChange={(event) =>
                                                setForm({
                                                    ...form,
                                                    rt: event.target.value,
                                                })
                                            }
                                        />
                                    </label>
                                    <label className="space-y-1.5">
                                        <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                                            RW
                                        </span>
                                        <input
                                            className="w-full px-3.5 py-2.5 text-sm bg-[#f4f7f4]/40 border border-gray-200 rounded-lg focus:border-[var(--teal)] outline-none focus:bg-white"
                                            placeholder="Jumlah RW"
                                            value={form.rw}
                                            onChange={(event) =>
                                                setForm({
                                                    ...form,
                                                    rw: event.target.value,
                                                })
                                            }
                                        />
                                    </label>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <label className="space-y-1.5">
                                        <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                                            Jumlah KK
                                        </span>
                                        <input
                                            min="0"
                                            type="number"
                                            className="w-full px-3.5 py-2.5 text-sm bg-[#f4f7f4]/40 border border-gray-200 rounded-lg focus:border-[var(--teal)] outline-none focus:bg-white"
                                            value={form.jumlah_kk}
                                            onChange={(event) =>
                                                setForm({
                                                    ...form,
                                                    jumlah_kk:
                                                        event.target.value,
                                                })
                                            }
                                        />
                                    </label>
                                    <label className="space-y-1.5">
                                        <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                                            Jumlah Penduduk
                                        </span>
                                        <input
                                            min="0"
                                            type="number"
                                            className="w-full px-3.5 py-2.5 text-sm bg-[#f4f7f4]/40 border border-gray-200 rounded-lg focus:border-[var(--teal)] outline-none focus:bg-white"
                                            value={form.jumlah_jiwa}
                                            onChange={(event) =>
                                                setForm({
                                                    ...form,
                                                    jumlah_jiwa:
                                                        event.target.value,
                                                })
                                            }
                                        />
                                    </label>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <label className="space-y-1.5">
                                        <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                                            Status
                                        </span>
                                        <select
                                            className="w-full px-3.5 py-2.5 text-sm bg-[#f4f7f4]/40 border border-gray-200 rounded-lg focus:border-[var(--teal)] outline-none focus:bg-white"
                                            value={form.status}
                                            onChange={(event) =>
                                                setForm({
                                                    ...form,
                                                    status: event.target.value,
                                                })
                                            }
                                        >
                                            <option value="Aktif">Aktif</option>
                                            <option value="Nonaktif">
                                                Nonaktif
                                            </option>
                                        </select>
                                    </label>
                                    {isAdmin && (
                                        <label className="space-y-1.5">
                                            <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                                                Desa
                                            </span>
                                            <select
                                                required
                                                className="w-full px-3.5 py-2.5 text-sm bg-[#f4f7f4]/40 border border-gray-200 rounded-lg focus:border-[var(--teal)] outline-none focus:bg-white"
                                                value={form.desa_id}
                                                onChange={(event) =>
                                                    setForm({
                                                        ...form,
                                                        desa_id:
                                                            event.target.value,
                                                    })
                                                }
                                            >
                                                <option value="">
                                                    Pilih desa
                                                </option>
                                                {desaRows.map((desa) => (
                                                    <option
                                                        key={desa.id}
                                                        value={desa.id}
                                                    >
                                                        {desa.nama}
                                                    </option>
                                                ))}
                                            </select>
                                        </label>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-100 bg-gray-50/50">
                                <button
                                    type="button"
                                    className="px-4 py-2 text-xs font-bold text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
                                    onClick={closeModal}
                                    disabled={submitting}
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 text-xs font-bold text-white bg-[var(--teal)] rounded-lg hover:bg-[var(--deep-teal)] shadow-md flex items-center gap-2"
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
                                        "Simpan Dusun"
                                    )}
                                </button>
                            </div>
                        </form>
                    </section>
                </div>
            )}

            {modalMode === "delete" && selectedWilayah && (
                <div
                    className="modal-backdrop z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs"
                    role="presentation"
                    onClick={closeModal}
                >
                    <section
                        className="max-w-md w-full bg-white rounded-lg shadow-2xl overflow-hidden border border-gray-100"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="delete-wilayah-title"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="modal-header border-b border-gray-100 p-5 bg-rose-50/30">
                            <div>
                                <h2
                                    id="delete-wilayah-title"
                                    className="text-lg font-extrabold text-rose-950 flex items-center gap-2"
                                >
                                    <AlertCircle
                                        size={20}
                                        className="text-rose-600"
                                    />{" "}
                                    Hapus Dusun?
                                </h2>
                                <p className="text-xs text-rose-700/80 mt-1">
                                    Tindakan ini tidak dapat dibatalkan.
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
                            {errorMessage && (
                                <div className="p-3.5 bg-rose-50 text-rose-800 border border-rose-200 rounded-lg text-xs">
                                    {errorMessage}
                                </div>
                            )}
                            <p className="text-sm text-gray-600 leading-relaxed">
                                Hapus dusun{" "}
                                <strong>{selectedWilayah.dusun}</strong> (
                                <code>{selectedWilayah.kode}</code>)? Pastikan
                                belum ada data operasional yang menggunakan
                                wilayah ini.
                            </p>
                        </div>
                        <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-100 bg-gray-50/50">
                            <button
                                type="button"
                                className="px-4 py-2 text-xs font-bold text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
                                onClick={closeModal}
                                disabled={submitting}
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                className="px-5 py-2 text-xs font-bold text-white bg-rose-600 rounded-lg hover:bg-rose-700 shadow-md flex items-center gap-2"
                                onClick={() => void handleDelete()}
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
                                    "Hapus Dusun"
                                )}
                            </button>
                        </div>
                    </section>
                </div>
            )}
        </FormShell>
    );
}
