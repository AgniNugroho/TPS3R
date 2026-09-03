"use client";

import { FormEvent, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import {
    CheckCircle2,
    Edit2,
    Home,
    MapPin,
    Phone,
    Plus,
    RefreshCw,
    Search,
    Trash2,
    UserCheck,
    Users,
    UserX,
    X,
} from "lucide-react";
import FormShell from "@/components/dashboard/FormShell";
import { showErrorToast, showSuccessToast } from "@/components/ui/Toast";

export type MemberItem = {
    id: string;
    kode_member: string | null;
    nama: string;
    desa_id: string;
    wilayah_id: string | null;
    nomor_hp: string | null;
    alamat: string | null;
    status: string;
    created_at: string;
    wilayah?: {
        id: string;
        kode: string;
        dusun: string;
        rt: string | null;
        rw: string | null;
    } | null;
};

type Wilayah = {
    id: string;
    kode: string;
    dusun: string;
    rt: string | null;
    rw: string | null;
    jumlah_kk?: number | null;
    jumlah_jiwa?: number | null;
    status?: string | null;
    desa_id?: string | null;
};

type Desa = {
    id: string;
    kode: string;
    nama: string;
};

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

export default function BankSampahPage() {
    return (
        <Suspense fallback={<div>Memuat data bank sampah...</div>}>
            <BankSampahContent />
        </Suspense>
    );
}

function BankSampahContent() {
    // Data state
    const [members, setMembers] = useState<MemberItem[]>([]);
    const [wilayahList, setWilayahList] = useState<Wilayah[]>([]);
    const [desaList, setDesaList] = useState<Desa[]>([]);
    const [selectedDesaId, setSelectedDesaId] = useState<string>("");
    const [isAdmin, setIsAdmin] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    // Filters
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [wilayahFilter, setWilayahFilter] = useState<string>("");
    const [statusFilter, setStatusFilter] = useState<string>("");

    // Active Desa
    const currentDesa = useMemo(() => {
        return desaList.find((d) => d.id === selectedDesaId) || desaList[0] || null;
    }, [desaList, selectedDesaId]);

    // Desa Dukun uses Member mode, while Kalibening & Banyubiru use Dusun mode
    const isDesaDukun = useMemo(() => {
        if (!currentDesa) return true;
        return currentDesa.nama.toLowerCase().includes("dukun");
    }, [currentDesa]);

    // Modal state for Member (Desa Dukun)
    const [memberModalMode, setMemberModalMode] = useState<"create" | "edit" | "delete" | null>(null);
    const [editMember, setEditMember] = useState<MemberItem | null>(null);
    const [deleteMember, setDeleteMember] = useState<MemberItem | null>(null);
    const [memberForm, setMemberForm] = useState({
        nama: "",
        kode_member: "",
        wilayah_id: "",
        nomor_hp: "",
        alamat: "",
        status: "Aktif",
    });

    // Modal state for Dusun (Desa Kalibening & Banyubiru)
    const [dusunModalMode, setDusunModalMode] = useState<"create" | "edit" | "delete" | null>(null);
    const [editDusun, setEditDusun] = useState<Wilayah | null>(null);
    const [deleteDusun, setDeleteDusun] = useState<Wilayah | null>(null);
    const [dusunForm, setDusunForm] = useState({
        kode: "",
        dusun: "",
        rt: "",
        rw: "",
        jumlah_kk: "",
        jumlah_jiwa: "",
        status: "Aktif",
    });

    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    // Load initial reference data (Desa)
    useEffect(() => {
        let mounted = true;
        async function fetchDesa() {
            try {
                const res = await fetch("/api/desa", { cache: "no-store" });
                const data = await res.json();
                if (!mounted) return;

                if (data.ok && Array.isArray(data.rows)) {
                    setDesaList(data.rows);
                    if (data.rows.length > 0) {
                        setIsAdmin(true);
                        const dukun = data.rows.find((d: Desa) =>
                            d.nama.toLowerCase().includes("dukun")
                        );
                        setSelectedDesaId(dukun ? dukun.id : data.rows[0].id);
                    }
                }
            } catch (err) {
                console.error("Error loading desa:", err);
            }
        }

        void Promise.resolve().then(() => fetchDesa());
        return () => {
            mounted = false;
        };
    }, []);

    // Load members & wilayah based on active desa
    const loadData = useCallback(
        async (targetDesa = selectedDesaId) => {
            setIsLoading(true);
            try {
                const params = new URLSearchParams({ _t: String(Date.now()) });
                if (targetDesa) params.set("desa_id", targetDesa);

                const [memberRes, wilayahRes] = await Promise.all([
                    fetch(`/api/member-bank-sampah?${params.toString()}`, { cache: "no-store" }),
                    fetch(`/api/wilayah?${params.toString()}`, { cache: "no-store" }),
                ]);

                const [memberData, wilayahData] = await Promise.all([
                    memberRes.json(),
                    wilayahRes.json(),
                ]);

                if (memberData.ok && Array.isArray(memberData.rows)) {
                    setMembers(memberData.rows);
                } else {
                    setMembers([]);
                }

                if (wilayahData.ok && Array.isArray(wilayahData.rows)) {
                    setWilayahList(wilayahData.rows);
                } else {
                    setWilayahList([]);
                }
            } catch (err) {
                showErrorToast(
                    err instanceof Error ? err.message : "Gagal memuat data bank sampah."
                );
            } finally {
                setIsLoading(false);
            }
        },
        [selectedDesaId]
    );

    useEffect(() => {
        void Promise.resolve().then(() => loadData(selectedDesaId));
    }, [selectedDesaId, loadData]);

    // KPI Metrics for Member Mode (Desa Dukun)
    const kpiMember = useMemo(() => {
        const total = members.length;
        const aktif = members.filter((m) => m.status === "Aktif").length;
        const nonaktif = members.filter((m) => m.status === "Nonaktif").length;
        const uniqueWilayah = new Set(
            members.filter((m) => m.wilayah_id).map((m) => m.wilayah_id)
        );

        return {
            total,
            aktif,
            nonaktif,
            wilayahTerlayani: uniqueWilayah.size,
        };
    }, [members]);

    // KPI Metrics for Dusun Mode (Kalibening & Banyubiru)
    const kpiDusun = useMemo(() => {
        const total = wilayahList.length;
        const aktif = wilayahList.filter(
            (w) => !w.status || w.status.toLowerCase() === "aktif"
        ).length;
        const totalKK = wilayahList.reduce((acc, w) => acc + Number(w.jumlah_kk || 0), 0);
        const totalJiwa = wilayahList.reduce((acc, w) => acc + Number(w.jumlah_jiwa || 0), 0);

        return {
            total,
            aktif,
            totalKK,
            totalJiwa,
        };
    }, [wilayahList]);

    // Filtered members (Desa Dukun)
    const filteredMembers = useMemo(() => {
        return members.filter((m) => {
            const query = searchQuery.toLowerCase().trim();
            const matchQuery =
                !query ||
                m.nama.toLowerCase().includes(query) ||
                (m.kode_member && m.kode_member.toLowerCase().includes(query)) ||
                (m.nomor_hp && m.nomor_hp.includes(query)) ||
                (m.alamat && m.alamat.toLowerCase().includes(query)) ||
                (m.wilayah?.dusun && m.wilayah.dusun.toLowerCase().includes(query));

            const matchWilayah = !wilayahFilter || m.wilayah_id === wilayahFilter;
            const matchStatus = !statusFilter || m.status === statusFilter;

            return matchQuery && matchWilayah && matchStatus;
        });
    }, [members, searchQuery, wilayahFilter, statusFilter]);

    // Filtered Dusun (Kalibening & Banyubiru)
    const filteredDusuns = useMemo(() => {
        return wilayahList.filter((w) => {
            const query = searchQuery.toLowerCase().trim();
            const matchQuery =
                !query ||
                w.dusun.toLowerCase().includes(query) ||
                w.kode.toLowerCase().includes(query) ||
                (w.rt && w.rt.toLowerCase().includes(query)) ||
                (w.rw && w.rw.toLowerCase().includes(query));

            const status = w.status || "Aktif";
            const matchStatus = !statusFilter || status.toLowerCase() === statusFilter.toLowerCase();

            return matchQuery && matchStatus;
        });
    }, [wilayahList, searchQuery, statusFilter]);

    // Member Handlers (Desa Dukun)
    function openCreateMemberModal() {
        setEditMember(null);
        const nextCode = `MBR-${String(members.length + 1).padStart(3, "0")}`;
        setMemberForm({
            nama: "",
            kode_member: nextCode,
            wilayah_id: wilayahList[0]?.id || "",
            nomor_hp: "",
            alamat: "",
            status: "Aktif",
        });
        setMemberModalMode("create");
    }

    function openEditMemberModal(member: MemberItem) {
        setEditMember(member);
        setMemberForm({
            nama: member.nama,
            kode_member: member.kode_member || "",
            wilayah_id: member.wilayah_id || "",
            nomor_hp: member.nomor_hp || "",
            alamat: member.alamat || "",
            status: member.status || "Aktif",
        });
        setMemberModalMode("edit");
    }

    function openDeleteMemberModal(member: MemberItem) {
        setDeleteMember(member);
        setMemberModalMode("delete");
    }

    async function handleMemberSubmit(e: FormEvent) {
        e.preventDefault();
        if (!memberForm.nama.trim()) {
            showErrorToast("Nama member wajib diisi.");
            return;
        }

        setIsSubmitting(true);
        try {
            if (memberModalMode === "edit" && editMember) {
                const res = await fetch("/api/member-bank-sampah", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        id: editMember.id,
                        nama: memberForm.nama.trim(),
                        kode_member: memberForm.kode_member.trim() || null,
                        wilayah_id: memberForm.wilayah_id || null,
                        nomor_hp: memberForm.nomor_hp.trim() || null,
                        alamat: memberForm.alamat.trim() || null,
                        status: memberForm.status,
                        desa_id: selectedDesaId,
                    }),
                });
                const data = await res.json();
                if (!data.ok) throw new Error(data.error);
                showSuccessToast("Data member berhasil diperbarui.");
            } else {
                const res = await fetch("/api/member-bank-sampah", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        nama: memberForm.nama.trim(),
                        kode_member: memberForm.kode_member.trim() || null,
                        wilayah_id: memberForm.wilayah_id || null,
                        nomor_hp: memberForm.nomor_hp.trim() || null,
                        alamat: memberForm.alamat.trim() || null,
                        status: memberForm.status,
                        desa_id: selectedDesaId,
                    }),
                });
                const data = await res.json();
                if (!data.ok) throw new Error(data.error);
                showSuccessToast("Member baru berhasil ditambahkan.");
            }

            setMemberModalMode(null);
            await loadData(selectedDesaId);
        } catch (err) {
            showErrorToast(err instanceof Error ? err.message : "Gagal menyimpan data member.");
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleMemberDeleteConfirm() {
        if (!deleteMember) return;
        setIsSubmitting(true);
        try {
            const res = await fetch(`/api/member-bank-sampah?id=${deleteMember.id}`, {
                method: "DELETE",
            });
            const data = await res.json();
            if (!data.ok) throw new Error(data.error);
            showSuccessToast(`Member ${deleteMember.nama} berhasil dihapus.`);
            setMemberModalMode(null);
            setDeleteMember(null);
            await loadData(selectedDesaId);
        } catch (err) {
            showErrorToast(err instanceof Error ? err.message : "Gagal menghapus member.");
        } finally {
            setIsSubmitting(false);
        }
    }

    // Dusun Handlers (Kalibening & Banyubiru)
    function openCreateDusunModal() {
        setEditDusun(null);
        const prefix = currentDesa?.nama.toLowerCase().includes("kalibening")
            ? "KLB"
            : currentDesa?.nama.toLowerCase().includes("banyubiru")
            ? "BYB"
            : "DSN";
        const nextKode = `${prefix}-${String(wilayahList.length + 1).padStart(2, "0")}`;
        setDusunForm({
            kode: nextKode,
            dusun: "",
            rt: "",
            rw: "",
            jumlah_kk: "",
            jumlah_jiwa: "",
            status: "Aktif",
        });
        setDusunModalMode("create");
    }

    function openEditDusunModal(dusun: Wilayah) {
        setEditDusun(dusun);
        setDusunForm({
            kode: dusun.kode,
            dusun: dusun.dusun,
            rt: dusun.rt || "",
            rw: dusun.rw || "",
            jumlah_kk: dusun.jumlah_kk ? String(dusun.jumlah_kk) : "",
            jumlah_jiwa: dusun.jumlah_jiwa ? String(dusun.jumlah_jiwa) : "",
            status: dusun.status || "Aktif",
        });
        setDusunModalMode("edit");
    }

    function openDeleteDusunModal(dusun: Wilayah) {
        setDeleteDusun(dusun);
        setDusunModalMode("delete");
    }

    async function handleDusunSubmit(e: FormEvent) {
        e.preventDefault();
        if (!dusunForm.dusun.trim()) {
            showErrorToast("Nama dusun wajib diisi.");
            return;
        }
        if (!dusunForm.kode.trim()) {
            showErrorToast("Kode dusun wajib diisi.");
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = {
                kode: dusunForm.kode.trim().toUpperCase(),
                dusun: dusunForm.dusun.trim(),
                rt: dusunForm.rt.trim() || null,
                rw: dusunForm.rw.trim() || null,
                jumlah_kk: dusunForm.jumlah_kk ? parseInt(dusunForm.jumlah_kk, 10) : 0,
                jumlah_jiwa: dusunForm.jumlah_jiwa ? parseInt(dusunForm.jumlah_jiwa, 10) : 0,
                status: dusunForm.status,
                desa_id: selectedDesaId,
            };

            if (dusunModalMode === "edit" && editDusun) {
                const res = await fetch("/api/wilayah", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        id: editDusun.id,
                        ...payload,
                    }),
                });
                const data = await res.json();
                if (!data.ok) throw new Error(data.error);
                showSuccessToast("Data dusun berhasil diperbarui.");
            } else {
                const res = await fetch("/api/wilayah", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });
                const data = await res.json();
                if (!data.ok) throw new Error(data.error);
                showSuccessToast("Dusun baru berhasil ditambahkan.");
            }

            setDusunModalMode(null);
            await loadData(selectedDesaId);
        } catch (err) {
            showErrorToast(err instanceof Error ? err.message : "Gagal menyimpan data dusun.");
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleDusunDeleteConfirm() {
        if (!deleteDusun) return;
        setIsSubmitting(true);
        try {
            const res = await fetch(`/api/wilayah?id=${deleteDusun.id}`, {
                method: "DELETE",
            });
            const data = await res.json();
            if (!data.ok) throw new Error(data.error);
            showSuccessToast(`Dusun ${deleteDusun.dusun} berhasil dihapus.`);
            setDusunModalMode(null);
            setDeleteDusun(null);
            await loadData(selectedDesaId);
        } catch (err) {
            showErrorToast(err instanceof Error ? err.message : "Gagal menghapus dusun.");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <FormShell title="Bank Sampah" activeLabel="Bank Sampah">
            <main className="content-wrap" style={{ display: "flex", flexDirection: "column", gap: "20px", paddingBottom: "48px" }}>
                {/* Page Header */}
                <div className="page-header-clean">
                    <div>
                        <p className="eyebrow">
                            {isDesaDukun ? "MASTER DATA & KEANGGOTAAN" : "MASTER DATA & WILAYAH"}
                        </p>
                        <h1>
                            {isDesaDukun
                                ? "Member Bank Sampah"
                                : `Dusun Bank Sampah - ${currentDesa?.nama || "Desa"}`}
                        </h1>
                        <p className="heading-copy">
                            {isDesaDukun
                                ? "Kelola data member/nasabah TPS-3R, wilayah domisili, nomor kontak, dan status keanggotaan."
                                : `Kelola data dusun dan wilayah operasional bank sampah di ${currentDesa?.nama || "desa"}.`}
                        </p>
                    </div>

                    <div className="header-actions-clean">
                        {isAdmin && desaList.length > 0 && (
                            <select
                                value={selectedDesaId}
                                onChange={(e) => setSelectedDesaId(e.target.value)}
                                className="custom-select-clean"
                            >
                                {desaList.map((d) => (
                                    <option key={d.id} value={d.id}>
                                        {d.nama.startsWith("Desa") ? d.nama : `Desa ${d.nama}`}
                                    </option>
                                ))}
                            </select>
                        )}

                        <button
                            type="button"
                            className="btn-primary-clean"
                            onClick={isDesaDukun ? openCreateMemberModal : openCreateDusunModal}
                        >
                            <Plus size={15} />
                            <span>
                                {isDesaDukun ? "Tambah Member Baru" : "Tambah Dusun Baru"}
                            </span>
                        </button>
                    </div>
                </div>

                {/* KPI Summary Cards */}
                {isDesaDukun ? (
                    <div className="kpi-grid-clean">
                        <div className="kpi-card-clean">
                            <div className="kpi-icon-wrap-clean kpi-icon-blue">
                                <Users size={20} />
                            </div>
                            <div className="kpi-text-clean">
                                <span className="kpi-label-clean">Total Member</span>
                                <span className="kpi-value-clean">
                                    {kpiMember.total} <span className="kpi-unit-clean">orang</span>
                                </span>
                            </div>
                        </div>

                        <div className="kpi-card-clean">
                            <div className="kpi-icon-wrap-clean kpi-icon-green">
                                <UserCheck size={20} />
                            </div>
                            <div className="kpi-text-clean">
                                <span className="kpi-label-clean">Member Aktif</span>
                                <span className="kpi-value-clean">
                                    {kpiMember.aktif} <span className="kpi-unit-clean">orang</span>
                                </span>
                            </div>
                        </div>

                        <div className="kpi-card-clean">
                            <div className="kpi-icon-wrap-clean kpi-icon-orange">
                                <UserX size={20} />
                            </div>
                            <div className="kpi-text-clean">
                                <span className="kpi-label-clean">Member Nonaktif</span>
                                <span className="kpi-value-clean">
                                    {kpiMember.nonaktif} <span className="kpi-unit-clean">orang</span>
                                </span>
                            </div>
                        </div>

                        <div className="kpi-card-clean">
                            <div className="kpi-icon-wrap-clean kpi-icon-purple">
                                <MapPin size={20} />
                            </div>
                            <div className="kpi-text-clean">
                                <span className="kpi-label-clean">Wilayah / Dusun Terlayani</span>
                                <span className="kpi-value-clean">
                                    {kpiMember.wilayahTerlayani} <span className="kpi-unit-clean">dusun</span>
                                </span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="kpi-grid-clean">
                        <div className="kpi-card-clean">
                            <div className="kpi-icon-wrap-clean kpi-icon-blue">
                                <MapPin size={20} />
                            </div>
                            <div className="kpi-text-clean">
                                <span className="kpi-label-clean">Total Dusun Terdaftar</span>
                                <span className="kpi-value-clean">
                                    {kpiDusun.total} <span className="kpi-unit-clean">dusun</span>
                                </span>
                            </div>
                        </div>

                        <div className="kpi-card-clean">
                            <div className="kpi-icon-wrap-clean kpi-icon-green">
                                <CheckCircle2 size={20} />
                            </div>
                            <div className="kpi-text-clean">
                                <span className="kpi-label-clean">Dusun Aktif</span>
                                <span className="kpi-value-clean">
                                    {kpiDusun.aktif} <span className="kpi-unit-clean">dusun</span>
                                </span>
                            </div>
                        </div>

                        <div className="kpi-card-clean">
                            <div className="kpi-icon-wrap-clean kpi-icon-purple">
                                <Home size={20} />
                            </div>
                            <div className="kpi-text-clean">
                                <span className="kpi-label-clean">Total Kepala Keluarga</span>
                                <span className="kpi-value-clean">
                                    {kpiDusun.totalKK.toLocaleString("id-ID")}{" "}
                                    <span className="kpi-unit-clean">KK</span>
                                </span>
                            </div>
                        </div>

                        <div className="kpi-card-clean">
                            <div className="kpi-icon-wrap-clean kpi-icon-orange">
                                <Users size={20} />
                            </div>
                            <div className="kpi-text-clean">
                                <span className="kpi-label-clean">Total Jiwa Terlayani</span>
                                <span className="kpi-value-clean">
                                    {kpiDusun.totalJiwa.toLocaleString("id-ID")}{" "}
                                    <span className="kpi-unit-clean">jiwa</span>
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Toolbar Section (Clean & Neatly Aligned - Screenshot 2 Fix) */}
                <div className="toolbar-card-clean">
                    <div className="toolbar-row-clean">
                        {/* Clean Integrated Search Bar */}
                        <div className="search-bar-clean" style={{ flex: 1, minWidth: "280px", maxWidth: "none" }}>
                            <Search size={16} className="search-icon-inside" />
                            <input
                                type="text"
                                placeholder={
                                    isDesaDukun
                                        ? "Cari berdasarkan nama, kode, no. hp, atau alamat..."
                                        : "Cari nama dusun, kode dusun, RT/RW..."
                                }
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    className="clear-search-btn"
                                    onClick={() => setSearchQuery("")}
                                    title="Hapus pencarian"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>

                        {/* Filters Group */}
                        <div className="search-filter-group-clean">
                            {isDesaDukun && (
                                <select
                                    value={wilayahFilter}
                                    onChange={(e) => setWilayahFilter(e.target.value)}
                                    className="custom-select-clean"
                                    style={{ minWidth: "160px" }}
                                >
                                    <option value="">Semua Dusun / Wilayah</option>
                                    {wilayahList.map((w) => (
                                        <option key={w.id} value={w.id}>
                                            {w.dusun}
                                        </option>
                                    ))}
                                </select>
                            )}

                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="custom-select-clean"
                                style={{ minWidth: "130px" }}
                            >
                                <option value="">Semua Status</option>
                                <option value="Aktif">Aktif</option>
                                <option value="Nonaktif">Nonaktif</option>
                            </select>

                            <button
                                type="button"
                                className="btn-refresh-clean"
                                onClick={() => loadData(selectedDesaId)}
                                title="Segarkan Data"
                            >
                                <RefreshCw size={15} className={isLoading ? "spin" : ""} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* TABLE SECTION */}
                {isDesaDukun ? (
                    <div className="table-card-clean">
                        <div style={{ overflowX: "auto" }}>
                            <table className="table-clean">
                                <thead>
                                    <tr>
                                        <th style={{ width: "50px" }}>NO</th>
                                        <th style={{ width: "110px" }}>KODE</th>
                                        <th>NAMA MEMBER</th>
                                        <th>DUSUN / WILAYAH</th>
                                        <th>KONTAK / NO. HP</th>
                                        <th>ALAMAT</th>
                                        <th style={{ width: "110px" }}>STATUS</th>
                                        <th>TERDAFTAR</th>
                                        <th style={{ width: "100px", textAlign: "center" }}>AKSI</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {isLoading ? (
                                        <tr>
                                            <td colSpan={9} style={{ textAlign: "center", padding: "48px 16px", color: "#94a3b8" }}>
                                                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                                                    <RefreshCw size={18} className="spin" />
                                                    <span>Memuat data member bank sampah...</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : filteredMembers.length === 0 ? (
                                        <tr>
                                            <td colSpan={9} style={{ textAlign: "center", padding: "48px 16px", color: "#94a3b8" }}>
                                                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                                                    <Users size={32} style={{ color: "#cbd5e1" }} />
                                                    <p style={{ fontWeight: 700, color: "#334155", margin: 0 }}>
                                                        Tidak ada data member yang ditemukan
                                                    </p>
                                                    <p style={{ fontSize: "13px", color: "#64748b", margin: 0, maxWidth: "420px" }}>
                                                        {searchQuery || wilayahFilter || statusFilter
                                                            ? "Coba ubah filter atau kata kunci pencarian Anda."
                                                            : "Belum ada member yang terdaftar di bank sampah desa ini."}
                                                    </p>
                                                    <button
                                                        type="button"
                                                        className="btn-primary-clean"
                                                        style={{ marginTop: "8px" }}
                                                        onClick={openCreateMemberModal}
                                                    >
                                                        <Plus size={14} />
                                                        <span>Tambah Member Sekarang</span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredMembers.map((member, idx) => (
                                            <tr key={member.id}>
                                                <td style={{ color: "#94a3b8" }}>{idx + 1}</td>
                                                <td>
                                                    <span className="badge-code-clean">
                                                        {member.kode_member || "-"}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                                        <div style={{ width: "30px", height: "30px", borderRadius: "50%", background: "#e2e8f0", color: "#0f172a", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "13px", flexShrink: 0 }}>
                                                            {member.nama.slice(0, 1).toUpperCase()}
                                                        </div>
                                                        <span style={{ fontWeight: 600, color: "#0f172a" }}>
                                                            {member.nama}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td>
                                                    {member.wilayah?.dusun ? (
                                                        <div style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "#0f172a" }}>
                                                            <MapPin size={13} style={{ color: "#0b8f82" }} />
                                                            <span>{member.wilayah.dusun}</span>
                                                        </div>
                                                    ) : (
                                                        <span style={{ color: "#94a3b8" }}>-</span>
                                                    )}
                                                </td>
                                                <td>
                                                    {member.nomor_hp ? (
                                                        <div style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "#334155", fontFamily: "monospace", fontSize: "12px" }}>
                                                            <Phone size={13} style={{ color: "#94a3b8" }} />
                                                            <span>{member.nomor_hp}</span>
                                                        </div>
                                                    ) : (
                                                        <span style={{ color: "#94a3b8" }}>-</span>
                                                    )}
                                                </td>
                                                <td style={{ color: "#64748b", maxWidth: "200px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={member.alamat || ""}>
                                                    {member.alamat || "-"}
                                                </td>
                                                <td>
                                                    <span
                                                        className={`badge-status-clean ${
                                                            member.status === "Aktif"
                                                                ? "badge-status-aktif"
                                                                : "badge-status-nonaktif"
                                                        }`}
                                                    >
                                                        {member.status === "Aktif" ? (
                                                            <CheckCircle2 size={12} />
                                                        ) : (
                                                            <UserX size={12} />
                                                        )}
                                                        <span>{member.status}</span>
                                                    </span>
                                                </td>
                                                <td style={{ color: "#64748b", fontSize: "12px", fontFamily: "monospace" }}>
                                                    {formatTglIndo(member.created_at)}
                                                </td>
                                                <td>
                                                    <div style={{ display: "flex", justifyContent: "center", gap: "6px" }}>
                                                        <button
                                                            type="button"
                                                            className="action-btn-clean edit"
                                                            onClick={() => openEditMemberModal(member)}
                                                            title="Edit Data Member"
                                                        >
                                                            <Edit2 size={14} />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="action-btn-clean delete"
                                                            onClick={() => openDeleteMemberModal(member)}
                                                            title="Hapus Member"
                                                        >
                                                            <Trash2 size={14} />
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
                ) : (
                    <div className="table-card-clean">
                        <div style={{ overflowX: "auto" }}>
                            <table className="table-clean">
                                <thead>
                                    <tr>
                                        <th style={{ width: "50px" }}>NO</th>
                                        <th style={{ width: "130px" }}>KODE DUSUN</th>
                                        <th>NAMA DUSUN</th>
                                        <th>RT / RW</th>
                                        <th>JUMLAH KK</th>
                                        <th>JUMLAH JIWA</th>
                                        <th style={{ width: "110px" }}>STATUS</th>
                                        <th style={{ width: "100px", textAlign: "center" }}>AKSI</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {isLoading ? (
                                        <tr>
                                            <td colSpan={8} style={{ textAlign: "center", padding: "48px 16px", color: "#94a3b8" }}>
                                                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                                                    <RefreshCw size={18} className="spin" />
                                                    <span>Memuat data dusun bank sampah...</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : filteredDusuns.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} style={{ textAlign: "center", padding: "48px 16px", color: "#94a3b8" }}>
                                                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                                                    <MapPin size={32} style={{ color: "#cbd5e1" }} />
                                                    <p style={{ fontWeight: 700, color: "#334155", margin: 0 }}>
                                                        Tidak ada data dusun yang ditemukan
                                                    </p>
                                                    <p style={{ fontSize: "13px", color: "#64748b", margin: 0, maxWidth: "420px" }}>
                                                        {searchQuery || statusFilter
                                                            ? "Coba ubah kata kunci pencarian atau filter status Anda."
                                                            : "Belum ada dusun yang terdaftar untuk desa ini."}
                                                    </p>
                                                    <button
                                                        type="button"
                                                        className="btn-primary-clean"
                                                        style={{ marginTop: "8px" }}
                                                        onClick={openCreateDusunModal}
                                                    >
                                                        <Plus size={14} />
                                                        <span>Tambah Dusun Sekarang</span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredDusuns.map((dusun, idx) => (
                                            <tr key={dusun.id}>
                                                <td style={{ color: "#94a3b8" }}>{idx + 1}</td>
                                                <td>
                                                    <span className="badge-code-clean">
                                                        {dusun.kode}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                                        <MapPin size={14} style={{ color: "#0b8f82" }} />
                                                        <span style={{ fontWeight: 600, color: "#0f172a" }}>
                                                            {dusun.dusun}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td style={{ color: "#64748b" }}>
                                                    {dusun.rt || dusun.rw
                                                        ? `RT ${dusun.rt || "-"} / RW ${dusun.rw || "-"}`
                                                        : "-"}
                                                </td>
                                                <td style={{ fontFamily: "monospace", fontSize: "12px" }}>
                                                    {dusun.jumlah_kk ? `${dusun.jumlah_kk} KK` : "-"}
                                                </td>
                                                <td style={{ fontFamily: "monospace", fontSize: "12px" }}>
                                                    {dusun.jumlah_jiwa ? `${dusun.jumlah_jiwa} Jiwa` : "-"}
                                                </td>
                                                <td>
                                                    <span
                                                        className={`badge-status-clean ${
                                                            !dusun.status ||
                                                            dusun.status.toLowerCase() === "aktif"
                                                                ? "badge-status-aktif"
                                                                : "badge-status-nonaktif"
                                                        }`}
                                                    >
                                                        {!dusun.status ||
                                                        dusun.status.toLowerCase() === "aktif" ? (
                                                            <CheckCircle2 size={12} />
                                                        ) : (
                                                            <UserX size={12} />
                                                        )}
                                                        <span>{dusun.status || "Aktif"}</span>
                                                    </span>
                                                </td>
                                                <td>
                                                    <div style={{ display: "flex", justifyContent: "center", gap: "6px" }}>
                                                        <button
                                                            type="button"
                                                            className="action-btn-clean edit"
                                                            onClick={() => openEditDusunModal(dusun)}
                                                            title="Edit Dusun"
                                                        >
                                                            <Edit2 size={14} />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="action-btn-clean delete"
                                                            onClick={() => openDeleteDusunModal(dusun)}
                                                            title="Hapus Dusun"
                                                        >
                                                            <Trash2 size={14} />
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
                )}

                {/* MODALS FOR MEMBER (Desa Dukun) */}
                {(memberModalMode === "create" || memberModalMode === "edit") && (
                    <div className="modal-backdrop-clean">
                        <div className="modal-dialog-clean">
                            <div className="modal-header-clean">
                                <h3>
                                    {memberModalMode === "create"
                                        ? "Tambah Member Baru"
                                        : "Edit Data Member"}
                                </h3>
                                <button
                                    type="button"
                                    style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}
                                    onClick={() => setMemberModalMode(null)}
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <form onSubmit={handleMemberSubmit} className="modal-form-clean">
                                <div className="form-group-clean">
                                    <label>Nama Lengkap Member *</label>
                                    <input
                                        type="text"
                                        required
                                        autoFocus
                                        placeholder="Contoh: Budi Santoso"
                                        value={memberForm.nama}
                                        onChange={(e) =>
                                            setMemberForm({ ...memberForm, nama: e.target.value })
                                        }
                                        className="form-control-clean"
                                    />
                                </div>

                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                                    <div className="form-group-clean">
                                        <label>Kode Member (Opsional)</label>
                                        <input
                                            type="text"
                                            placeholder="Contoh: MBR-001"
                                            value={memberForm.kode_member}
                                            onChange={(e) =>
                                                setMemberForm({
                                                    ...memberForm,
                                                    kode_member: e.target.value,
                                                })
                                            }
                                            className="form-control-clean font-mono"
                                        />
                                    </div>

                                    <div className="form-group-clean">
                                        <label>Status Keanggotaan</label>
                                        <select
                                            value={memberForm.status}
                                            onChange={(e) =>
                                                setMemberForm({ ...memberForm, status: e.target.value })
                                            }
                                            className="form-control-clean"
                                        >
                                            <option value="Aktif">Aktif</option>
                                            <option value="Nonaktif">Nonaktif</option>
                                        </select>
                                    </div>
                                </div>

                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                                    <div className="form-group-clean">
                                        <label>Wilayah / Dusun Domisili</label>
                                        <select
                                            value={memberForm.wilayah_id}
                                            onChange={(e) =>
                                                setMemberForm({
                                                    ...memberForm,
                                                    wilayah_id: e.target.value,
                                                })
                                            }
                                            className="form-control-clean"
                                        >
                                            <option value="">-- Pilih Dusun (Opsional) --</option>
                                            {wilayahList.map((w) => (
                                                <option key={w.id} value={w.id}>
                                                    {w.dusun}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="form-group-clean">
                                        <label>No. HP / WhatsApp (Opsional)</label>
                                        <input
                                            type="tel"
                                            placeholder="08123456789"
                                            value={memberForm.nomor_hp}
                                            onChange={(e) =>
                                                setMemberForm({
                                                    ...memberForm,
                                                    nomor_hp: e.target.value,
                                                })
                                            }
                                            className="form-control-clean"
                                        />
                                    </div>
                                </div>

                                <div className="form-group-clean">
                                    <label>Alamat / Keterangan (Opsional)</label>
                                    <textarea
                                        rows={2}
                                        placeholder="RT/RW atau catatan domisili..."
                                        value={memberForm.alamat}
                                        onChange={(e) =>
                                            setMemberForm({ ...memberForm, alamat: e.target.value })
                                        }
                                        className="form-control-clean"
                                        style={{ height: "auto", padding: "8px 12px", resize: "vertical" }}
                                    />
                                </div>

                                <div className="modal-actions-clean">
                                    <button
                                        type="button"
                                        className="btn-secondary-clean"
                                        onClick={() => setMemberModalMode(null)}
                                        disabled={isSubmitting}
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn-primary-clean"
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? "Menyimpan..." : "Simpan Member"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {memberModalMode === "delete" && deleteMember && (
                    <div className="modal-backdrop-clean">
                        <div className="modal-dialog-clean modal-dialog-sm-clean">
                            <div className="modal-header-clean">
                                <h3>Hapus Member</h3>
                                <button
                                    type="button"
                                    style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}
                                    onClick={() => setMemberModalMode(null)}
                                >
                                    <X size={18} />
                                </button>
                            </div>
                            <div style={{ padding: "16px 20px", fontSize: "14px", color: "#334155", lineHeight: 1.5 }}>
                                <p style={{ margin: 0 }}>
                                    Apakah Anda yakin ingin menghapus member{" "}
                                    <strong>{deleteMember.nama}</strong>{" "}
                                    {deleteMember.kode_member ? `(${deleteMember.kode_member})` : ""}?
                                </p>
                                <small style={{ color: "#94a3b8", fontSize: "12px", display: "block", marginTop: "6px" }}>
                                    Catatan: Data transaksi sampah yang sudah tersimpan tetap aman di database.
                                </small>
                            </div>
                            <div className="modal-actions-clean" style={{ padding: "0 20px 16px 20px" }}>
                                <button
                                    type="button"
                                    className="btn-secondary-clean"
                                    onClick={() => setMemberModalMode(null)}
                                    disabled={isSubmitting}
                                >
                                    Batal
                                </button>
                                <button
                                    type="button"
                                    className="btn-danger-clean"
                                    onClick={handleMemberDeleteConfirm}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? "Menghapus..." : "Hapus Member"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* MODALS FOR DUSUN (Kalibening & Banyubiru) */}
                {(dusunModalMode === "create" || dusunModalMode === "edit") && (
                    <div className="modal-backdrop-clean">
                        <div className="modal-dialog-clean">
                            <div className="modal-header-clean">
                                <h3>
                                    {dusunModalMode === "create"
                                        ? "Tambah Dusun Baru"
                                        : "Edit Data Dusun"}
                                </h3>
                                <button
                                    type="button"
                                    style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}
                                    onClick={() => setDusunModalMode(null)}
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <form onSubmit={handleDusunSubmit} className="modal-form-clean">
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                                    <div className="form-group-clean">
                                        <label>Kode Dusun *</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="Contoh: KLB-ARG"
                                            value={dusunForm.kode}
                                            onChange={(e) =>
                                                setDusunForm({ ...dusunForm, kode: e.target.value })
                                            }
                                            className="form-control-clean font-mono"
                                            style={{ textTransform: "uppercase" }}
                                        />
                                    </div>

                                    <div className="form-group-clean">
                                        <label>Status Dusun</label>
                                        <select
                                            value={dusunForm.status}
                                            onChange={(e) =>
                                                setDusunForm({ ...dusunForm, status: e.target.value })
                                            }
                                            className="form-control-clean"
                                        >
                                            <option value="Aktif">Aktif</option>
                                            <option value="Nonaktif">Nonaktif</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="form-group-clean">
                                    <label>Nama Dusun *</label>
                                    <input
                                        type="text"
                                        required
                                        autoFocus
                                        placeholder="Contoh: ARGOSONO"
                                        value={dusunForm.dusun}
                                        onChange={(e) =>
                                            setDusunForm({ ...dusunForm, dusun: e.target.value })
                                        }
                                        className="form-control-clean"
                                    />
                                </div>

                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                                    <div className="form-group-clean">
                                        <label>RT (Opsional)</label>
                                        <input
                                            type="text"
                                            placeholder="01"
                                            value={dusunForm.rt}
                                            onChange={(e) =>
                                                setDusunForm({ ...dusunForm, rt: e.target.value })
                                            }
                                            className="form-control-clean"
                                        />
                                    </div>

                                    <div className="form-group-clean">
                                        <label>RW (Opsional)</label>
                                        <input
                                            type="text"
                                            placeholder="02"
                                            value={dusunForm.rw}
                                            onChange={(e) =>
                                                setDusunForm({ ...dusunForm, rw: e.target.value })
                                            }
                                            className="form-control-clean"
                                        />
                                    </div>
                                </div>

                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                                    <div className="form-group-clean">
                                        <label>Jumlah KK (Opsional)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            placeholder="0"
                                            value={dusunForm.jumlah_kk}
                                            onChange={(e) =>
                                                setDusunForm({
                                                    ...dusunForm,
                                                    jumlah_kk: e.target.value,
                                                })
                                            }
                                            className="form-control-clean"
                                        />
                                    </div>

                                    <div className="form-group-clean">
                                        <label>Jumlah Jiwa (Opsional)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            placeholder="0"
                                            value={dusunForm.jumlah_jiwa}
                                            onChange={(e) =>
                                                setDusunForm({
                                                    ...dusunForm,
                                                    jumlah_jiwa: e.target.value,
                                                })
                                            }
                                            className="form-control-clean"
                                        />
                                    </div>
                                </div>

                                <div className="modal-actions-clean">
                                    <button
                                        type="button"
                                        className="btn-secondary-clean"
                                        onClick={() => setDusunModalMode(null)}
                                        disabled={isSubmitting}
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn-primary-clean"
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? "Menyimpan..." : "Simpan Dusun"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {dusunModalMode === "delete" && deleteDusun && (
                    <div className="modal-backdrop-clean">
                        <div className="modal-dialog-clean modal-dialog-sm-clean">
                            <div className="modal-header-clean">
                                <h3>Hapus Dusun</h3>
                                <button
                                    type="button"
                                    style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}
                                    onClick={() => setDusunModalMode(null)}
                                >
                                    <X size={18} />
                                </button>
                            </div>
                            <div style={{ padding: "16px 20px", fontSize: "14px", color: "#334155", lineHeight: 1.5 }}>
                                <p style={{ margin: 0 }}>
                                    Apakah Anda yakin ingin menghapus dusun{" "}
                                    <strong>{deleteDusun.dusun}</strong> ({deleteDusun.kode})?
                                </p>
                            </div>
                            <div className="modal-actions-clean" style={{ padding: "0 20px 16px 20px" }}>
                                <button
                                    type="button"
                                    className="btn-secondary-clean"
                                    onClick={() => setDusunModalMode(null)}
                                    disabled={isSubmitting}
                                >
                                    Batal
                                </button>
                                <button
                                    type="button"
                                    className="btn-danger-clean"
                                    onClick={handleDusunDeleteConfirm}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? "Menghapus..." : "Hapus Dusun"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </FormShell>
    );
}