"use client";

import { FormEvent, Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
    AlertCircle,
    Edit3,
    MapPin,
    PackageCheck,
    Plus,
    RefreshCw,
    Search,
    Trash2,
    X,
} from "lucide-react";
import FormShell from "@/components/dashboard/FormShell";
import { showSuccessToast } from "@/components/ui/Toast";

type Residu = {
    id: string;
    tanggal: string;
    lokasi: string | null;
    sumber: string | null;
    berat_kg: number;
    jenis_residu: string | null;
    tujuan_akhir: string | null;
    keterangan: string | null;
    desa_id: string;
};

type Desa = { id: string; kode: string; nama: string };
type ModalMode = "create" | "edit" | "delete" | null;

const emptyForm = {
    tanggal: new Date().toISOString().slice(0, 10),
    lokasi: "",
    sumber: "",
    berat_kg: "0",
    jenis_residu: "",
    tujuan_akhir: "",
    keterangan: "",
    desa_id: "",
};

function formatTanggal(tanggal: string) {
    if (!tanggal) return "-";
    return `${tanggal.slice(8, 10)}-${tanggal.slice(5, 7)}-${tanggal.slice(0, 4)}`;
}

function ResiduContent() {
    const searchParams = useSearchParams();
    const selectedDesaId = searchParams.get("desa_id");
    const [residuRows, setResiduRows] = useState<Residu[]>([]);
    const [desaRows, setDesaRows] = useState<Desa[]>([]);
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [jenisFilter, setJenisFilter] = useState("Semua");
    const [modalMode, setModalMode] = useState<ModalMode>(null);
    const [selectedResidu, setSelectedResidu] = useState<Residu | null>(null);
    const [form, setForm] = useState(emptyForm);
    const [errorMessage, setErrorMessage] = useState("");

    const loadData = useCallback(
        async (desaId = selectedDesaId) => {
            setLoading(true);
            setErrorMessage("");
            try {
                const [residuResponse, desaResponse, meResponse] =
                    await Promise.all([
                        fetch(
                            desaId
                                ? `/api/residu?desa_id=${encodeURIComponent(desaId)}`
                                : "/api/residu",
                        ),
                        fetch("/api/desa"),
                        fetch("/api/me"),
                    ]);
                const [residuData, desaData, meData] = await Promise.all([
                    residuResponse.json(),
                    desaResponse.json(),
                    meResponse.json(),
                ]);
                if (!residuData.ok) {
                    setErrorMessage(
                        residuData.error || "Gagal memuat data residu.",
                    );
                    return;
                }
                setResiduRows(residuData.rows ?? []);
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
        setSelectedResidu(null);
        setErrorMessage("");
    }

    function openCreateModal() {
        setErrorMessage("");
        setForm({ ...emptyForm, desa_id: desaRows[0]?.id ?? "" });
        setModalMode("create");
    }

    function openEditModal(residu: Residu) {
        setErrorMessage("");
        setSelectedResidu(residu);
        setForm({
            tanggal: residu.tanggal,
            lokasi: residu.lokasi ?? "",
            sumber: residu.sumber ?? "",
            berat_kg: String(residu.berat_kg ?? 0),
            jenis_residu: residu.jenis_residu ?? "",
            tujuan_akhir: residu.tujuan_akhir ?? "",
            keterangan: residu.keterangan ?? "",
            desa_id: residu.desa_id,
        });
        setModalMode("edit");
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setSubmitting(true);
        setErrorMessage("");
        try {
            const response = await fetch("/api/residu", {
                method: modalMode === "create" ? "POST" : "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...form, id: selectedResidu?.id }),
            });
            const data = await response.json();
            if (!data.ok) {
                setErrorMessage(data.error || "Gagal menyimpan residu.");
                return;
            }
            showSuccessToast(
                modalMode === "create"
                    ? "Data residu berhasil ditambahkan."
                    : "Data residu berhasil diperbarui.",
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
        if (!selectedResidu) return;
        setSubmitting(true);
        setErrorMessage("");
        try {
            const response = await fetch(
                `/api/residu?id=${selectedResidu.id}`,
                { method: "DELETE" },
            );
            const data = await response.json();
            if (!data.ok) {
                setErrorMessage(data.error || "Gagal menghapus residu.");
                return;
            }
            showSuccessToast("Data residu berhasil dihapus.");
            closeModal();
            await loadData();
        } catch {
            setErrorMessage("Gagal menghubungi server untuk menghapus data.");
        } finally {
            setSubmitting(false);
        }
    }

    const jenisOptions = Array.from(
        new Set(
            residuRows
                .map((row) => row.jenis_residu)
                .filter((jenis): jenis is string => Boolean(jenis)),
        ),
    ).sort((a, b) => a.localeCompare(b, "id"));

    const filteredRows = residuRows.filter((residu) => {
        const query = searchQuery.toLowerCase();
        const matchesQuery =
            (residu.lokasi ?? "").toLowerCase().includes(query) ||
            (residu.sumber ?? "").toLowerCase().includes(query) ||
            (residu.jenis_residu ?? "").toLowerCase().includes(query) ||
            (residu.tujuan_akhir ?? "").toLowerCase().includes(query);
        const matchesJenis =
            jenisFilter === "Semua" || residu.jenis_residu === jenisFilter;
        return matchesQuery && matchesJenis;
    });
    const totalBerat = residuRows.reduce(
        (total, row) => total + (row.berat_kg ?? 0),
        0,
    );
    const desaNameById = new Map(desaRows.map((desa) => [desa.id, desa.nama]));

    return (
        <FormShell title="Residu" activeLabel="Residu">
            <main className="content-wrap">
                <div className="page-heading">
                    <div>
                        <p className="eyebrow">
                            <span className="live-dot" /> PROSES MATERIAL
                        </p>
                        <h1>Data Residu</h1>
                        <p className="heading-copy">
                            Pencatatan residu dan tujuan akhir pembuangan.
                        </p>
                    </div>
                    <div className="heading-actions">
                        <button
                            className="primary-button"
                            onClick={openCreateModal}
                        >
                            <Plus size={16} /> Tambah Residu
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
                                <p>Total Catatan</p>
                                <h2>
                                    {residuRows.length}
                                    <small>catatan</small>
                                </h2>
                            </div>
                            <div className="stat-icon">
                                <PackageCheck size={20} />
                            </div>
                        </div>
                        <div className="stat-note">Residu tercatat</div>
                    </article>
                    <article className="stat-card amber">
                        <div className="stat-top">
                            <div>
                                <p>Total Berat Residu</p>
                                <h2>
                                    {totalBerat}
                                    <small>kg</small>
                                </h2>
                            </div>
                            <div className="stat-icon">
                                <Trash2 size={20} />
                            </div>
                        </div>
                        <div className="stat-note">
                            Akumulasi seluruh catatan
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
                            placeholder="Cari lokasi, sumber, jenis, atau tujuan..."
                            className="w-full pl-10 pr-4 py-2 text-sm bg-[#f4f7f4]/60 border border-[var(--line)] rounded-lg outline-none focus:border-[var(--teal)] focus:bg-white"
                            value={searchQuery}
                            onChange={(event) =>
                                setSearchQuery(event.target.value)
                            }
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <label
                            htmlFor="jenis-filter"
                            className="text-xs font-semibold text-gray-500"
                        >
                            Jenis:
                        </label>
                        <select
                            id="jenis-filter"
                            className="px-3 py-1.5 text-xs bg-white border border-[var(--line)] rounded-lg outline-none"
                            value={jenisFilter}
                            onChange={(event) =>
                                setJenisFilter(event.target.value)
                            }
                        >
                            <option value="Semua">Semua</option>
                            {jenisOptions.map((jenis) => (
                                <option key={jenis} value={jenis}>
                                    {jenis}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <article className="panel">
                    <div className="panel-heading mb-4">
                        <div>
                            <h3 className="text-base font-bold text-[var(--ink)]">
                                Daftar Residu
                            </h3>
                            <p className="text-xs text-gray-500">
                                Menampilkan {filteredRows.length} dari{" "}
                                {residuRows.length} catatan.
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
                                Memuat data residu...
                            </p>
                        </div>
                    ) : filteredRows.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="p-4 bg-gray-50 text-gray-400 rounded-full mb-4">
                                <Trash2 size={40} />
                            </div>
                            <h4 className="text-base font-bold text-gray-700">
                                Belum ada data residu
                            </h4>
                            <p className="text-xs text-gray-400 max-w-xs mt-1">
                                Tambahkan catatan residu baru atau ubah kata
                                kunci pencarian.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-[var(--line)] text-xs font-bold text-gray-500 uppercase tracking-wider bg-gray-50/50">
                                        <th className="py-3.5 px-4 font-semibold">
                                            Tanggal
                                        </th>
                                        <th className="py-3.5 px-4 font-semibold">
                                            Lokasi / Sumber
                                        </th>
                                        {isAdmin && (
                                            <th className="py-3.5 px-4 font-semibold">
                                                Desa
                                            </th>
                                        )}
                                        <th className="py-3.5 px-4 font-semibold">
                                            Jenis Residu
                                        </th>
                                        <th className="py-3.5 px-4 font-semibold text-right">
                                            Berat
                                        </th>
                                        <th className="py-3.5 px-4 font-semibold">
                                            Tujuan Akhir
                                        </th>
                                        <th className="py-3.5 px-4 font-semibold text-right">
                                            Aksi
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 text-sm">
                                    {filteredRows.map((residu) => (
                                        <tr
                                            key={residu.id}
                                            className="hover:bg-gray-50/50 transition-colors"
                                        >
                                            <td className="py-4 px-4 text-gray-600 whitespace-nowrap">
                                                {formatTanggal(residu.tanggal)}
                                            </td>
                                            <td className="py-4 px-4">
                                                <div className="font-semibold text-gray-800 flex items-center gap-1.5">
                                                    <MapPin
                                                        size={13}
                                                        className="text-gray-400 shrink-0"
                                                    />
                                                    {residu.lokasi || "-"}
                                                </div>
                                                <div className="text-xs text-gray-400 mt-0.5">
                                                    {residu.sumber || "-"}
                                                </div>
                                            </td>
                                            {isAdmin && (
                                                <td className="py-4 px-4 text-gray-600">
                                                    {desaNameById.get(
                                                        residu.desa_id,
                                                    ) ?? "-"}
                                                </td>
                                            )}
                                            <td className="py-4 px-4">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-100">
                                                    {residu.jenis_residu || "-"}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4 text-right text-gray-600 whitespace-nowrap">
                                                {residu.berat_kg ?? 0} kg
                                            </td>
                                            <td className="py-4 px-4 text-gray-600">
                                                {residu.tujuan_akhir || "-"}
                                            </td>
                                            <td className="py-4 px-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        className="p-1.5 text-gray-500 hover:text-[var(--teal)] hover:bg-teal-50 rounded-lg transition-all"
                                                        onClick={() =>
                                                            openEditModal(
                                                                residu,
                                                            )
                                                        }
                                                        title="Edit residu"
                                                        aria-label={`Edit residu ${residu.lokasi ?? ""}`}
                                                    >
                                                        <Edit3 size={16} />
                                                    </button>
                                                    <button
                                                        className="p-1.5 text-gray-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                                        onClick={() => {
                                                            setSelectedResidu(
                                                                residu,
                                                            );
                                                            setErrorMessage("");
                                                            setModalMode(
                                                                "delete",
                                                            );
                                                        }}
                                                        title="Hapus residu"
                                                        aria-label={`Hapus residu ${residu.lokasi ?? ""}`}
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
                        aria-labelledby="residu-modal-title"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="modal-header border-b border-gray-100 p-5 bg-teal-50/50">
                            <div>
                                <h2
                                    id="residu-modal-title"
                                    className="text-lg font-extrabold text-[var(--ink)]"
                                >
                                    {modalMode === "create"
                                        ? "Tambah Residu"
                                        : "Edit Data Residu"}
                                </h2>
                                <p className="text-xs text-gray-500 mt-1">
                                    Catat residu yang tidak bisa diolah dan
                                    tujuan pembuangannya.
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
                                            Tanggal
                                        </span>
                                        <input
                                            required
                                            type="date"
                                            className="w-full px-3.5 py-2.5 text-sm bg-[#f4f7f4]/40 border border-gray-200 rounded-lg focus:border-[var(--teal)] outline-none focus:bg-white"
                                            value={form.tanggal}
                                            onChange={(event) =>
                                                setForm({
                                                    ...form,
                                                    tanggal: event.target.value,
                                                })
                                            }
                                        />
                                    </label>
                                    <label className="space-y-1.5">
                                        <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                                            Berat (kg)
                                        </span>
                                        <input
                                            required
                                            min="0"
                                            step="0.01"
                                            type="number"
                                            className="w-full px-3.5 py-2.5 text-sm bg-[#f4f7f4]/40 border border-gray-200 rounded-lg focus:border-[var(--teal)] outline-none focus:bg-white"
                                            placeholder="0"
                                            value={form.berat_kg}
                                            onChange={(event) =>
                                                setForm({
                                                    ...form,
                                                    berat_kg:
                                                        event.target.value,
                                                })
                                            }
                                        />
                                    </label>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <label className="space-y-1.5">
                                        <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                                            Lokasi
                                        </span>
                                        <input
                                            className="w-full px-3.5 py-2.5 text-sm bg-[#f4f7f4]/40 border border-gray-200 rounded-lg focus:border-[var(--teal)] outline-none focus:bg-white"
                                            placeholder="Mis. TPS3R Dusun 1"
                                            value={form.lokasi}
                                            onChange={(event) =>
                                                setForm({
                                                    ...form,
                                                    lokasi: event.target.value,
                                                })
                                            }
                                        />
                                    </label>
                                    <label className="space-y-1.5">
                                        <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                                            Sumber
                                        </span>
                                        <input
                                            className="w-full px-3.5 py-2.5 text-sm bg-[#f4f7f4]/40 border border-gray-200 rounded-lg focus:border-[var(--teal)] outline-none focus:bg-white"
                                            placeholder="Mis. Hasil pemilahan"
                                            value={form.sumber}
                                            onChange={(event) =>
                                                setForm({
                                                    ...form,
                                                    sumber: event.target.value,
                                                })
                                            }
                                        />
                                    </label>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <label className="space-y-1.5">
                                        <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                                            Jenis Residu
                                        </span>
                                        <input
                                            required
                                            className="w-full px-3.5 py-2.5 text-sm bg-[#f4f7f4]/40 border border-gray-200 rounded-lg focus:border-[var(--teal)] outline-none focus:bg-white"
                                            placeholder="Mis. Popok, styrofoam"
                                            value={form.jenis_residu}
                                            onChange={(event) =>
                                                setForm({
                                                    ...form,
                                                    jenis_residu:
                                                        event.target.value,
                                                })
                                            }
                                        />
                                    </label>
                                    <label className="space-y-1.5">
                                        <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                                            Tujuan Akhir
                                        </span>
                                        <input
                                            className="w-full px-3.5 py-2.5 text-sm bg-[#f4f7f4]/40 border border-gray-200 rounded-lg focus:border-[var(--teal)] outline-none focus:bg-white"
                                            placeholder="Mis. TPA Kabupaten"
                                            value={form.tujuan_akhir}
                                            onChange={(event) =>
                                                setForm({
                                                    ...form,
                                                    tujuan_akhir:
                                                        event.target.value,
                                                })
                                            }
                                        />
                                    </label>
                                </div>
                                {isAdmin && (
                                    <label className="space-y-1.5 block">
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
                                                    desa_id: event.target.value,
                                                })
                                            }
                                        >
                                            <option value="">Pilih desa</option>
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
                                <label className="space-y-1.5 block">
                                    <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                                        Keterangan
                                    </span>
                                    <input
                                        className="w-full px-3.5 py-2.5 text-sm bg-[#f4f7f4]/40 border border-gray-200 rounded-lg focus:border-[var(--teal)] outline-none focus:bg-white"
                                        placeholder="Catatan tambahan"
                                        value={form.keterangan}
                                        onChange={(event) =>
                                            setForm({
                                                ...form,
                                                keterangan: event.target.value,
                                            })
                                        }
                                    />
                                </label>
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
                                        "Simpan Residu"
                                    )}
                                </button>
                            </div>
                        </form>
                    </section>
                </div>
            )}

            {modalMode === "delete" && selectedResidu && (
                <div
                    className="modal-backdrop z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs"
                    role="presentation"
                    onClick={closeModal}
                >
                    <section
                        className="max-w-md w-full bg-white rounded-lg shadow-2xl overflow-hidden border border-gray-100"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="delete-residu-title"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="modal-header border-b border-gray-100 p-5 bg-rose-50/30">
                            <div>
                                <h2
                                    id="delete-residu-title"
                                    className="text-lg font-extrabold text-rose-950 flex items-center gap-2"
                                >
                                    <AlertCircle
                                        size={20}
                                        className="text-rose-600"
                                    />{" "}
                                    Hapus Residu?
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
                                Hapus catatan residu di{" "}
                                <strong>{selectedResidu.lokasi}</strong> (
                                {selectedResidu.berat_kg} kg,{" "}
                                {selectedResidu.jenis_residu})? Data yang
                                dihapus tidak dapat dikembalikan.
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
                                    "Hapus Residu"
                                )}
                            </button>
                        </div>
                    </section>
                </div>
            )}
        </FormShell>
    );
}

export default function ResiduPage() {
    return (
        <Suspense fallback={null}>
            <ResiduContent />
        </Suspense>
    );
}
