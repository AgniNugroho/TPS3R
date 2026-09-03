"use client";

import { FormEvent, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
    AlertCircle,
    Calendar,
    Edit3,
    FileSpreadsheet,
    FileText,
    Layers,
    MapPin,
    Plus,
    RefreshCw,
    Search,
    Trash2,
    TrendingUp,
    UserCheck,
    Users,
    X,
    Zap,
} from "lucide-react";
import FormShell from "@/components/dashboard/FormShell";
import { showErrorToast, showSuccessToast } from "@/components/ui/Toast";
import { exportWorkbook } from "@/lib/utils/exportExcel";

// Types
export type BankSampahRecord = {
    id: string;
    member_id: string | null;
    tanggal: string; // YYYY-MM-DD
    nasabah_id: string | null;
    nama_nasabah: string;
    jenis_sampah: string | null;
    berat_kg: number;
    harga_per_kg: number;
    nilai_transaksi: number;
    jenis_transaksi: string;
    petugas_id: string | null;
    desa_id: string | null;
    created_at: string;
};

export type MemberItem = {
    id: string;
    kode_member: string | null;
    nama: string;
    desa_id: string;
    wilayah_id: string | null;
    nomor_hp: string | null;
    alamat: string | null;
    status: string;
    wilayah?: {
        id: string;
        kode: string;
        dusun: string;
    } | null;
};

type Desa = { id: string; kode: string; nama: string };
type Wilayah = { id: string; kode: string; dusun: string; desa_id?: string };
type Petugas = { id: string; nama: string; desa_id: string | null };

type ModalMode = "create" | "edit" | "delete" | "cellQuickEdit" | null;

const BULAN_LIST = [
    { value: 1, label: "Januari" },
    { value: 2, label: "Februari" },
    { value: 3, label: "Maret" },
    { value: 4, label: "April" },
    { value: 5, label: "Mei" },
    { value: 6, label: "Juni" },
    { value: 7, label: "Juli" },
    { value: 8, label: "Agustus" },
    { value: 9, label: "September" },
    { value: 10, label: "Oktober" },
    { value: 11, label: "November" },
    { value: 12, label: "Desember" },
];

const JENIS_SAMPAH_LIST = [
    "Campur",
    "Organik",
    "Anorganik: Kardus/Kertas",
    "Anorganik: Plastik",
    "Anorganik: Kaca/Botol",
    "Anorganik: Besi/Logam",
    "Residu",
];

function formatRupiah(val: number): string {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(val);
}

function getDaysInMonth(year: number, month: number): number {
    return new Date(year, month, 0).getDate();
}

function formatTglIndo(isoStr: string): string {
    if (!isoStr) return "-";
    const parts = isoStr.split("-");
    if (parts.length < 3) return isoStr;
    const d = parseInt(parts[2], 10);
    const m = parseInt(parts[1], 10);
    const y = parts[0];
    const namaBulan = [
        "",
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "Mei",
        "Jun",
        "Jul",
        "Agu",
        "Sep",
        "Okt",
        "Nov",
        "Des",
    ];
    return `${d} ${namaBulan[m] || parts[1]} ${y}`;
}

export default function PengumpulanPage() {
    return (
        <Suspense fallback={<div>Memuat halaman pengumpulan...</div>}>
            <PengumpulanContent />
        </Suspense>
    );
}

function PengumpulanContent() {
    const searchParams = useSearchParams();

    // Navigation & View Mode
    const [viewTab, setViewTab] = useState<"matrix" | "transactions">("matrix");

    // Month & Year Filter - defaults to current month/year
    const [bulan, setBulan] = useState<number>(() => {
        const paramBulan = searchParams.get("bulan");
        return paramBulan ? parseInt(paramBulan, 10) : new Date().getMonth() + 1;
    });
    const [tahun, setTahun] = useState<number>(() => {
        const paramTahun = searchParams.get("tahun");
        return paramTahun ? parseInt(paramTahun, 10) : new Date().getFullYear();
    });

    // Master data & transactions
    const [records, setRecords] = useState<BankSampahRecord[]>([]);
    const [memberList, setMemberList] = useState<MemberItem[]>([]);
    const [wilayahList, setWilayahList] = useState<Wilayah[]>([]);
    const [desaList, setDesaList] = useState<Desa[]>([]);
    const [petugasList, setPetugasList] = useState<Petugas[]>([]);
    const [selectedDesaId, setSelectedDesaId] = useState<string>("");
    const [isAdmin, setIsAdmin] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    // Filters
    const [searchFilter, setSearchFilter] = useState<string>("");
    const [wilayahFilter, setWilayahFilter] = useState<string>("");

    // Modal state
    const [modalMode, setModalMode] = useState<ModalMode>(null);
    const [editItem, setEditItem] = useState<BankSampahRecord | null>(null);
    const [deleteItem, setDeleteItem] = useState<BankSampahRecord | null>(null);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    // Form inputs for single record create/edit
    const [form, setForm] = useState({
        member_id: "",
        nama_nasabah: "",
        nasabah_id: "",
        tanggal: new Date().toISOString().slice(0, 10),
        jenis_sampah: "Campur",
        berat_kg: "",
        harga_per_kg: "0",
        petugas_id: "",
    });

    // Cell quick edit state
    const [cellTarget, setCellTarget] = useState<{
        rowId: string | null;
        labelName: string;
        day: number;
        existingRecordId?: string;
        currentWeight: number;
    } | null>(null);
    const [cellWeight, setCellWeight] = useState<string>("");

    const daysInMonth = useMemo(() => getDaysInMonth(tahun, bulan), [tahun, bulan]);

    // Active Desa detection
    const currentDesa = useMemo(() => {
        return desaList.find((d) => d.id === selectedDesaId) || desaList[0] || null;
    }, [desaList, selectedDesaId]);

    // Desa Dukun uses Member mode, while Kalibening & Banyubiru use Dusun mode
    const isDesaDukun = useMemo(() => {
        if (!currentDesa) return true;
        return currentDesa.nama.toLowerCase().includes("dukun");
    }, [currentDesa]);

    // Load initial reference data (Desa, Petugas)
    useEffect(() => {
        let mounted = true;
        async function fetchInit() {
            try {
                const [desaRes, petugasRes] = await Promise.all([
                    fetch("/api/desa", { cache: "no-store" }),
                    fetch("/api/petugas", { cache: "no-store" }),
                ]);

                const [desaData, petugasData] = await Promise.all([
                    desaRes.json(),
                    petugasRes.json(),
                ]);

                if (!mounted) return;

                if (desaData.ok && Array.isArray(desaData.rows)) {
                    setDesaList(desaData.rows);
                    if (desaData.rows.length > 0) {
                        setIsAdmin(true);
                        const desaDukun = desaData.rows.find((d: Desa) =>
                            d.nama.toLowerCase().includes("dukun")
                        );
                        setSelectedDesaId(desaDukun ? desaDukun.id : desaData.rows[0].id);
                    }
                }

                if (petugasData.ok && Array.isArray(petugasData.rows)) {
                    setPetugasList(petugasData.rows);
                }
            } catch (err) {
                console.error("Error loading reference data:", err);
            }
        }

        void Promise.resolve().then(() => fetchInit());
        return () => {
            mounted = false;
        };
    }, []);

    // Load bank sampah records, wilayah, and members for current month/year & desa
    const loadData = useCallback(
        async (targetBulan = bulan, targetTahun = tahun, targetDesa = selectedDesaId) => {
            setIsLoading(true);
            try {
                const bankParams = new URLSearchParams({
                    bulan: String(targetBulan),
                    tahun: String(targetTahun),
                    _t: String(Date.now()),
                });
                if (targetDesa) bankParams.set("desa_id", targetDesa);

                const wilayahParams = new URLSearchParams({ _t: String(Date.now()) });
                if (targetDesa) wilayahParams.set("desa_id", targetDesa);

                const memberParams = new URLSearchParams({ _t: String(Date.now()) });
                if (targetDesa) memberParams.set("desa_id", targetDesa);

                const [res, wilayahRes, memberRes] = await Promise.all([
                    fetch(`/api/bank-sampah?${bankParams.toString()}`, { cache: "no-store" }),
                    fetch(`/api/wilayah?${wilayahParams.toString()}`, { cache: "no-store" }),
                    fetch(`/api/member-bank-sampah?${memberParams.toString()}`, { cache: "no-store" }),
                ]);

                const data = await res.json();
                const wilayahData = await wilayahRes.json();
                const memberData = await memberRes.json();

                if (data.ok && Array.isArray(data.rows)) {
                    setRecords(data.rows);
                } else {
                    setRecords([]);
                    if (data.error) showErrorToast(data.error);
                }

                if (wilayahData.ok && Array.isArray(wilayahData.rows)) {
                    setWilayahList(wilayahData.rows);
                }

                if (memberData.ok && Array.isArray(memberData.rows)) {
                    setMemberList(memberData.rows);
                }
            } catch (err) {
                showErrorToast(
                    err instanceof Error ? err.message : "Gagal memuat data sampah."
                );
            } finally {
                setIsLoading(false);
            }
        },
        [bulan, tahun, selectedDesaId]
    );

    useEffect(() => {
        void Promise.resolve().then(() => loadData(bulan, tahun, selectedDesaId));
    }, [bulan, tahun, selectedDesaId, loadData]);

    // Map member to their wilayah/dusun
    const memberWilayahMap = useMemo(() => {
        const map = new Map<string, string>();
        memberList.forEach((m) => {
            const dusun = m.wilayah?.dusun || "";
            if (m.nama) map.set(m.nama.toLowerCase().trim(), dusun);
            if (m.id) map.set(m.id, dusun);
        });
        return map;
    }, [memberList]);

    // Matrix calculation (Member mode for Dukun, Dusun mode for Kalibening/Banyubiru)
    const matrixRows = useMemo(() => {
        if (isDesaDukun) {
            const memberMap = new Map<
                string,
                {
                    rowId: string | null;
                    nama: string;
                    dusun: string;
                    dailyMap: Map<number, { id: string; berat: number; nilai: number }>;
                    totalBerat: number;
                    totalNilai: number;
                    freqSetor: number;
                }
            >();

            memberList.forEach((m) => {
                const dusun = m.wilayah?.dusun || "-";
                memberMap.set(m.nama.trim().toLowerCase(), {
                    rowId: m.id,
                    nama: m.nama,
                    dusun,
                    dailyMap: new Map(),
                    totalBerat: 0,
                    totalNilai: 0,
                    freqSetor: 0,
                });
            });

            records.forEach((rec) => {
                const rawName = rec.nama_nasabah?.trim() || "Tanpa Nama";
                const key = rawName.toLowerCase();

                if (!memberMap.has(key)) {
                    const dusun = memberWilayahMap.get(key) || "-";
                    memberMap.set(key, {
                        rowId: rec.member_id,
                        nama: rawName,
                        dusun,
                        dailyMap: new Map(),
                        totalBerat: 0,
                        totalNilai: 0,
                        freqSetor: 0,
                    });
                }

                const row = memberMap.get(key)!;
                if (rec.member_id && !row.rowId) {
                    row.rowId = rec.member_id;
                }

                const day = parseInt(rec.tanggal.split("-")[2], 10);
                if (!isNaN(day)) {
                    const existing = row.dailyMap.get(day);
                    if (existing) {
                        existing.berat += Number(rec.berat_kg);
                        existing.nilai += Number(rec.nilai_transaksi);
                    } else {
                        row.dailyMap.set(day, {
                            id: rec.id,
                            berat: Number(rec.berat_kg),
                            nilai: Number(rec.nilai_transaksi),
                        });
                    }
                }
            });

            const result = Array.from(memberMap.values()).map((row) => {
                let sumBerat = 0;
                let sumNilai = 0;
                let count = 0;
                row.dailyMap.forEach((entry) => {
                    sumBerat += entry.berat;
                    sumNilai += entry.nilai;
                    count++;
                });
                return {
                    ...row,
                    totalBerat: Number(sumBerat.toFixed(2)),
                    totalNilai: sumNilai,
                    freqSetor: count,
                };
            });

            return result.sort((a, b) => {
                if (b.totalBerat !== a.totalBerat) return b.totalBerat - a.totalBerat;
                return a.nama.localeCompare(b.nama, "id", { sensitivity: "base" });
            });
        } else {
            const dusunMap = new Map<
                string,
                {
                    rowId: string | null;
                    nama: string;
                    dusun: string;
                    dailyMap: Map<number, { id: string; berat: number; nilai: number }>;
                    totalBerat: number;
                    totalNilai: number;
                    freqSetor: number;
                }
            >();

            wilayahList.forEach((w) => {
                const key = w.dusun.trim().toLowerCase();
                dusunMap.set(key, {
                    rowId: w.id,
                    nama: w.dusun,
                    dusun: w.dusun,
                    dailyMap: new Map(),
                    totalBerat: 0,
                    totalNilai: 0,
                    freqSetor: 0,
                });
            });

            records.forEach((rec) => {
                const rawName = rec.nama_nasabah?.trim() || "";
                let key = rawName.toLowerCase();

                let targetDusun = wilayahList.find(
                    (w) => w.id === rec.nasabah_id || w.dusun.toLowerCase() === key
                );

                if (!targetDusun && rawName) {
                    targetDusun = wilayahList.find((w) =>
                        rawName.toLowerCase().includes(w.dusun.toLowerCase())
                    );
                }

                if (targetDusun) {
                    key = targetDusun.dusun.trim().toLowerCase();
                } else if (!dusunMap.has(key)) {
                    dusunMap.set(key, {
                        rowId: rec.nasabah_id,
                        nama: rawName || "Dusun Lainnya",
                        dusun: rawName || "Dusun Lainnya",
                        dailyMap: new Map(),
                        totalBerat: 0,
                        totalNilai: 0,
                        freqSetor: 0,
                    });
                }

                const row = dusunMap.get(key);
                if (row) {
                    const day = parseInt(rec.tanggal.split("-")[2], 10);
                    if (!isNaN(day)) {
                        const existing = row.dailyMap.get(day);
                        if (existing) {
                            existing.berat += Number(rec.berat_kg);
                            existing.nilai += Number(rec.nilai_transaksi);
                        } else {
                            row.dailyMap.set(day, {
                                id: rec.id,
                                berat: Number(rec.berat_kg),
                                nilai: Number(rec.nilai_transaksi),
                            });
                        }
                    }
                }
            });

            const result = Array.from(dusunMap.values()).map((row) => {
                let sumBerat = 0;
                let sumNilai = 0;
                let count = 0;
                row.dailyMap.forEach((entry) => {
                    sumBerat += entry.berat;
                    sumNilai += entry.nilai;
                    count++;
                });
                return {
                    ...row,
                    totalBerat: Number(sumBerat.toFixed(2)),
                    totalNilai: sumNilai,
                    freqSetor: count,
                };
            });

            return result.sort((a, b) => {
                if (b.totalBerat !== a.totalBerat) return b.totalBerat - a.totalBerat;
                return a.nama.localeCompare(b.nama, "id", { sensitivity: "base" });
            });
        }
    }, [isDesaDukun, memberList, wilayahList, records, memberWilayahMap]);

    // Filter matrix rows based on search & dusun
    const filteredMatrixRows = useMemo(() => {
        return matrixRows.filter((r) => {
            const query = searchFilter.toLowerCase().trim();
            const matchSearch =
                !query ||
                r.nama.toLowerCase().includes(query) ||
                (r.dusun && r.dusun.toLowerCase().includes(query));

            const matchDusun = !wilayahFilter || r.dusun === wilayahFilter;
            return matchSearch && matchDusun;
        });
    }, [matrixRows, searchFilter, wilayahFilter]);

    // Daily column sums for matrix footer
    const dailyColumnTotals = useMemo(() => {
        const totals: number[] = new Array(daysInMonth).fill(0);
        filteredMatrixRows.forEach((row) => {
            row.dailyMap.forEach((entry, day) => {
                if (day >= 1 && day <= daysInMonth) {
                    totals[day - 1] += entry.berat;
                }
            });
        });
        return totals.map((v) => Number(v.toFixed(2)));
    }, [filteredMatrixRows, daysInMonth]);

    // Filtered transaction list
    const filteredTransactions = useMemo(() => {
        return records
            .filter((rec) => {
                const matchSearch =
                    !searchFilter ||
                    rec.nama_nasabah.toLowerCase().includes(searchFilter.toLowerCase()) ||
                    (rec.jenis_sampah &&
                        rec.jenis_sampah.toLowerCase().includes(searchFilter.toLowerCase()));
                const dusun = isDesaDukun
                    ? (rec.member_id && memberWilayahMap.get(rec.member_id)) ||
                      memberWilayahMap.get(rec.nama_nasabah.toLowerCase().trim()) ||
                      "-"
                    : rec.nama_nasabah;
                const matchDusun = !wilayahFilter || dusun === wilayahFilter;
                return matchSearch && matchDusun;
            })
            .sort((a, b) => b.tanggal.localeCompare(a.tanggal));
    }, [records, searchFilter, wilayahFilter, memberWilayahMap, isDesaDukun]);

    // KPI Metrics
    const kpi = useMemo(() => {
        const totalKg = records.reduce((acc, r) => acc + Number(r.berat_kg), 0);
        const uniqueEntries = new Set(
            records.filter((r) => Number(r.berat_kg) > 0).map((r) => r.nama_nasabah.toLowerCase())
        );

        const currentMonthDays =
            tahun === new Date().getFullYear() && bulan === new Date().getMonth() + 1
                ? new Date().getDate()
                : daysInMonth;
        const avgPerHari = currentMonthDays > 0 ? totalKg / currentMonthDays : 0;

        let topContributor = "-";
        let topKg = 0;
        matrixRows.forEach((m) => {
            if (m.totalBerat > topKg) {
                topKg = m.totalBerat;
                topContributor = `${m.nama} (${m.totalBerat} kg)`;
            }
        });

        return {
            totalKg: Number(totalKg.toFixed(2)),
            activeEntities: uniqueEntries.size,
            avgPerHari: Number(avgPerHari.toFixed(1)),
            topContributor,
        };
    }, [records, daysInMonth, tahun, bulan, matrixRows]);

    // Handlers
    function openCreateModal(defaultName = "", defaultRowId = "") {
        setEditItem(null);
        setForm({
            member_id: isDesaDukun ? defaultRowId : "",
            nasabah_id: !isDesaDukun ? defaultRowId : "",
            nama_nasabah: defaultName,
            tanggal: `${tahun}-${String(bulan).padStart(2, "0")}-${String(
                Math.min(new Date().getDate(), daysInMonth)
            ).padStart(2, "0")}`,
            jenis_sampah: "Campur",
            berat_kg: "",
            harga_per_kg: "0",
            petugas_id: petugasList[0]?.id || "",
        });
        setModalMode("create");
    }

    function openEditModal(record: BankSampahRecord) {
        setEditItem(record);
        setForm({
            member_id: record.member_id || "",
            nasabah_id: record.nasabah_id || "",
            nama_nasabah: record.nama_nasabah,
            tanggal: record.tanggal,
            jenis_sampah: record.jenis_sampah || "Campur",
            berat_kg: String(record.berat_kg),
            harga_per_kg: String(record.harga_per_kg),
            petugas_id: record.petugas_id || "",
        });
        setModalMode("edit");
    }

    function openDeleteModal(record: BankSampahRecord) {
        setDeleteItem(record);
        setModalMode("delete");
    }

    function handleCellClick(
        row: (typeof matrixRows)[0],
        day: number,
        entry?: { id: string; berat: number; nilai: number }
    ) {
        setCellTarget({
            rowId: row.rowId,
            labelName: row.nama,
            day,
            existingRecordId: entry?.id,
            currentWeight: entry?.berat || 0,
        });
        setCellWeight(entry ? String(entry.berat) : "");
        setModalMode("cellQuickEdit");
    }

    async function handleCellQuickSave(e: FormEvent) {
        e.preventDefault();
        if (!cellTarget) return;

        const weightNum = parseFloat(cellWeight);
        if (isNaN(weightNum) || weightNum < 0) {
            showErrorToast("Berat sampah tidak valid.");
            return;
        }

        setIsSubmitting(true);
        const dayStr = String(cellTarget.day).padStart(2, "0");
        const monthStr = String(bulan).padStart(2, "0");
        const targetTanggal = `${tahun}-${monthStr}-${dayStr}`;

        try {
            if (weightNum === 0 && cellTarget.existingRecordId) {
                const res = await fetch(`/api/bank-sampah?id=${cellTarget.existingRecordId}`, {
                    method: "DELETE",
                });
                const data = await res.json();
                if (!data.ok) throw new Error(data.error);
                showSuccessToast("Data berhasil dihapus.");
            } else if (cellTarget.existingRecordId) {
                const res = await fetch("/api/bank-sampah", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        id: cellTarget.existingRecordId,
                        member_id: isDesaDukun ? cellTarget.rowId : null,
                        nasabah_id: !isDesaDukun ? cellTarget.rowId : null,
                        nama_nasabah: cellTarget.labelName,
                        tanggal: targetTanggal,
                        berat_kg: weightNum,
                        jenis_sampah: "Campur",
                        harga_per_kg: 0,
                    }),
                });
                const data = await res.json();
                if (!data.ok) throw new Error(data.error);
                showSuccessToast("Berat berhasil diperbarui.");
            } else if (weightNum > 0) {
                const res = await fetch("/api/bank-sampah", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        member_id: isDesaDukun ? cellTarget.rowId : null,
                        nasabah_id: !isDesaDukun ? cellTarget.rowId : null,
                        nama_nasabah: cellTarget.labelName,
                        tanggal: targetTanggal,
                        berat_kg: weightNum,
                        jenis_sampah: "Campur",
                        harga_per_kg: 0,
                        desa_id: selectedDesaId,
                    }),
                });
                const data = await res.json();
                if (!data.ok) throw new Error(data.error);
                showSuccessToast("Catatan sampah berhasil disimpan.");
            }

            setModalMode(null);
            setCellTarget(null);
            await loadData(bulan, tahun);
        } catch (err) {
            showErrorToast(err instanceof Error ? err.message : "Gagal menyimpan data.");
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleSingleSubmit(e: FormEvent) {
        e.preventDefault();
        const beratNum = parseFloat(form.berat_kg);
        const hargaNum = parseFloat(form.harga_per_kg || "0");

        if (!form.nama_nasabah.trim()) {
            showErrorToast(
                isDesaDukun
                    ? "Nama member wajib dipilih atau diisi."
                    : "Nama dusun wajib dipilih."
            );
            return;
        }
        if (isNaN(beratNum) || beratNum <= 0) {
            showErrorToast("Berat sampah harus lebih besar dari 0 kg.");
            return;
        }

        setIsSubmitting(true);
        try {
            const formYear = parseInt(form.tanggal.slice(0, 4), 10);
            const formMonth = parseInt(form.tanggal.slice(5, 7), 10);

            const payload = {
                member_id: isDesaDukun ? form.member_id || null : null,
                nasabah_id: !isDesaDukun ? form.nasabah_id || null : null,
                nama_nasabah: form.nama_nasabah.trim(),
                tanggal: form.tanggal,
                jenis_sampah: form.jenis_sampah,
                berat_kg: beratNum,
                harga_per_kg: hargaNum,
                petugas_id: form.petugas_id || null,
                desa_id: selectedDesaId,
            };

            if (modalMode === "edit" && editItem) {
                const res = await fetch("/api/bank-sampah", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        id: editItem.id,
                        ...payload,
                    }),
                });
                const data = await res.json();
                if (!data.ok) throw new Error(data.error);
                showSuccessToast("Data sampah berhasil diperbarui.");
            } else {
                const res = await fetch("/api/bank-sampah", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });
                const data = await res.json();
                if (!data.ok) throw new Error(data.error);
                showSuccessToast("Catatan sampah berhasil ditambahkan.");
            }

            setModalMode(null);

            if (formMonth !== bulan || formYear !== tahun) {
                setBulan(formMonth);
                setTahun(formYear);
                await loadData(formMonth, formYear);
            } else {
                await loadData(bulan, tahun);
            }
        } catch (err) {
            showErrorToast(err instanceof Error ? err.message : "Gagal menyimpan data.");
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleDeleteConfirm() {
        if (!deleteItem) return;
        setIsSubmitting(true);
        try {
            const res = await fetch(`/api/bank-sampah?id=${deleteItem.id}`, {
                method: "DELETE",
            });
            const data = await res.json();
            if (!data.ok) throw new Error(data.error);
            showSuccessToast("Data berhasil dihapus.");
            setModalMode(null);
            setDeleteItem(null);
            await loadData(bulan, tahun);
        } catch (err) {
            showErrorToast(err instanceof Error ? err.message : "Gagal menghapus data.");
        } finally {
            setIsSubmitting(false);
        }
    }

    // Export to Excel (.xlsx)
    function handleExportExcel() {
        if (matrixRows.length === 0) {
            showErrorToast("Tidak ada data untuk diekspor.");
            return;
        }

        const namaBulanStr = BULAN_LIST.find((b) => b.value === bulan)?.label || String(bulan);

        const matrixHeaders = isDesaDukun
            ? [
                  "No",
                  "Nama Member",
                  "Dusun / Wilayah",
                  ...Array.from({ length: daysInMonth }, (_, i) => `Tgl ${i + 1}`),
                  "Total (kg)",
                  "Frekuensi (hari)",
              ]
            : [
                  "No",
                  "Nama Dusun",
                  ...Array.from({ length: daysInMonth }, (_, i) => `Tgl ${i + 1}`),
                  "Total (kg)",
                  "Frekuensi (hari)",
              ];

        const matrixData = filteredMatrixRows.map((r, idx) => {
            const rowArr: (string | number)[] = isDesaDukun
                ? [idx + 1, r.nama, r.dusun]
                : [idx + 1, r.nama];

            for (let d = 1; d <= daysInMonth; d++) {
                rowArr.push(r.dailyMap.get(d)?.berat || 0);
            }
            rowArr.push(r.totalBerat);
            rowArr.push(r.freqSetor);
            return rowArr;
        });

        const footerRow: (string | number)[] = isDesaDukun
            ? ["", "TOTAL HARIAN (KG)", ""]
            : ["", "TOTAL HARIAN (KG)"];

        let grandTotal = 0;
        dailyColumnTotals.forEach((val) => {
            footerRow.push(val);
            grandTotal += val;
        });
        footerRow.push(Number(grandTotal.toFixed(2)));
        footerRow.push("");
        matrixData.push(footerRow);

        const txHeaders = isDesaDukun
            ? [
                  "No",
                  "Tanggal",
                  "Nama Member",
                  "Dusun / Wilayah",
                  "Jenis Sampah",
                  "Berat (kg)",
                  "Harga / kg (Rp)",
                  "Nilai Transaksi (Rp)",
                  "Petugas",
              ]
            : [
                  "No",
                  "Tanggal",
                  "Nama Dusun",
                  "Jenis Sampah",
                  "Berat (kg)",
                  "Harga / kg (Rp)",
                  "Nilai Transaksi (Rp)",
                  "Petugas",
              ];

        const txData = filteredTransactions.map((rec, idx) => {
            if (isDesaDukun) {
                return [
                    idx + 1,
                    rec.tanggal,
                    rec.nama_nasabah,
                    (rec.member_id && memberWilayahMap.get(rec.member_id)) ||
                        memberWilayahMap.get(rec.nama_nasabah.toLowerCase().trim()) ||
                        "-",
                    rec.jenis_sampah || "Campur",
                    rec.berat_kg,
                    rec.harga_per_kg,
                    rec.nilai_transaksi,
                    petugasList.find((p) => p.id === rec.petugas_id)?.nama || "-",
                ];
            } else {
                return [
                    idx + 1,
                    rec.tanggal,
                    rec.nama_nasabah,
                    rec.jenis_sampah || "Campur",
                    rec.berat_kg,
                    rec.harga_per_kg,
                    rec.nilai_transaksi,
                    petugasList.find((p) => p.id === rec.petugas_id)?.nama || "-",
                ];
            }
        });

        const desaSlug = currentDesa?.nama ? currentDesa.nama.replace(/\s+/g, "_") : "Desa";

        exportWorkbook(
            [
                {
                    sheetName: `Matriks ${namaBulanStr} ${tahun}`,
                    columns: matrixHeaders.map((h, i) => ({
                        header: h,
                        accessor: (row: (string | number)[]) => row[i],
                    })),
                    rows: matrixData,
                },
                {
                    sheetName: "Riwayat Transaksi",
                    columns: txHeaders.map((h, i) => ({
                        header: h,
                        accessor: (row: (string | number)[]) => row[i],
                    })),
                    rows: txData,
                },
            ],
            `Pengumpulan_Sampah_${desaSlug}_${namaBulanStr}_${tahun}`
        );

        showSuccessToast("Laporan Excel berhasil diunduh.");
    }

    return (
        <FormShell title="Pengumpulan" activeLabel="Pengumpulan">
            <main className="content-wrap" style={{ display: "flex", flexDirection: "column", gap: "20px", paddingBottom: "48px" }}>
                {/* Header & Primary Actions */}
                <div className="page-header-clean">
                    <div>
                        <p className="eyebrow">INPUT OPERASIONAL TPS-3R</p>
                        <h1>
                            {isDesaDukun
                                ? "Pengumpulan Sampah Member"
                                : `Pengumpulan Sampah Dusun - ${currentDesa?.nama || "Desa"}`}
                        </h1>
                        <p className="heading-copy">
                            {isDesaDukun
                                ? "Format matriks harian TPS-3R Nawasena untuk mencatat dan memantau setoran sampah dari para member."
                                : `Format matriks harian untuk mencatat dan memantau setoran sampah per dusun di ${currentDesa?.nama || "desa"}.`}
                        </p>
                    </div>

                    <div className="header-actions-clean">
                        <button
                            type="button"
                            className="btn-export-clean"
                            onClick={handleExportExcel}
                            title="Unduh Lembar Rekap Excel"
                        >
                            <FileSpreadsheet size={15} />
                            <span>Export Excel</span>
                        </button>

                        <button
                            type="button"
                            className="btn-primary-clean"
                            onClick={() => openCreateModal()}
                        >
                            <Plus size={15} />
                            <span>
                                {isDesaDukun
                                    ? "Catat Sampah Member"
                                    : "Catat Sampah Dusun"}
                            </span>
                        </button>
                    </div>
                </div>

                {/* KPI Summary Cards */}
                <div className="kpi-grid-clean">
                    <div className="kpi-card-clean">
                        <div className="kpi-icon-wrap-clean kpi-icon-blue">
                            <Layers size={20} />
                        </div>
                        <div className="kpi-text-clean">
                            <span className="kpi-label-clean">Total Sampah Bulan Ini</span>
                            <span className="kpi-value-clean">
                                {kpi.totalKg.toLocaleString("id-ID")}{" "}
                                <span className="kpi-unit-clean">kg</span>
                            </span>
                        </div>
                    </div>

                    <div className="kpi-card-clean">
                        <div className="kpi-icon-wrap-clean kpi-icon-green">
                            {isDesaDukun ? <UserCheck size={20} /> : <MapPin size={20} />}
                        </div>
                        <div className="kpi-text-clean">
                            <span className="kpi-label-clean">
                                {isDesaDukun ? "Member Aktif Setor" : "Dusun Aktif Setor"}
                            </span>
                            <span className="kpi-value-clean">
                                {kpi.activeEntities}{" "}
                                <span className="kpi-unit-clean">
                                    {isDesaDukun ? "orang" : "dusun"}
                                </span>
                            </span>
                        </div>
                    </div>

                    <div className="kpi-card-clean">
                        <div className="kpi-icon-wrap-clean kpi-icon-purple">
                            <TrendingUp size={20} />
                        </div>
                        <div className="kpi-text-clean">
                            <span className="kpi-label-clean">Rata-Rata Harian</span>
                            <span className="kpi-value-clean">
                                {kpi.avgPerHari}{" "}
                                <span className="kpi-unit-clean">kg/hari</span>
                            </span>
                        </div>
                    </div>

                    <div className="kpi-card-clean">
                        <div className="kpi-icon-wrap-clean kpi-icon-orange">
                            <Zap size={20} />
                        </div>
                        <div className="kpi-text-clean">
                            <span className="kpi-label-clean">
                                {isDesaDukun ? "Top Kontributor" : "Top Dusun Kontributor"}
                            </span>
                            <span className="kpi-value-clean" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "160px" }} title={kpi.topContributor}>
                                {kpi.topContributor}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Filter Toolbar (Clean & Neatly Aligned) */}
                <div className="toolbar-card-clean">
                    <div className="toolbar-row-clean">
                        {/* Period & Desa Selectors */}
                        <div className="period-group-clean">
                            <div className="period-badge-clean">
                                <Calendar size={14} />
                                <span>Periode</span>
                            </div>

                            <select
                                value={bulan}
                                onChange={(e) => setBulan(parseInt(e.target.value, 10))}
                                className="custom-select-clean"
                            >
                                {BULAN_LIST.map((b) => (
                                    <option key={b.value} value={b.value}>
                                        {b.label}
                                    </option>
                                ))}
                            </select>

                            <select
                                value={tahun}
                                onChange={(e) => setTahun(parseInt(e.target.value, 10))}
                                className="custom-select-clean"
                                style={{ minWidth: "85px" }}
                            >
                                {[2024, 2025, 2026, 2027].map((y) => (
                                    <option key={y} value={y}>
                                        {y}
                                    </option>
                                ))}
                            </select>

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
                                className="btn-refresh-clean"
                                onClick={() => loadData(bulan, tahun)}
                                title="Segarkan Data"
                            >
                                <RefreshCw size={15} className={isLoading ? "spin" : ""} />
                            </button>
                        </div>

                        {/* Search & Dusun Filter */}
                        <div className="search-filter-group-clean">
                            <div className="search-bar-clean">
                                <Search size={15} className="search-icon-inside" />
                                <input
                                    type="text"
                                    placeholder={
                                        isDesaDukun
                                            ? "Cari member atau dusun..."
                                            : "Cari dusun..."
                                    }
                                    value={searchFilter}
                                    onChange={(e) => setSearchFilter(e.target.value)}
                                />
                                {searchFilter && (
                                    <button
                                        type="button"
                                        className="clear-search-btn"
                                        onClick={() => setSearchFilter("")}
                                        title="Hapus pencarian"
                                    >
                                        <X size={13} />
                                    </button>
                                )}
                            </div>

                            {isDesaDukun && wilayahList.length > 0 && (
                                <select
                                    value={wilayahFilter}
                                    onChange={(e) => setWilayahFilter(e.target.value)}
                                    className="custom-select-clean"
                                    style={{ minWidth: "150px" }}
                                >
                                    <option value="">Semua Wilayah</option>
                                    {wilayahList.map((w) => (
                                        <option key={w.id} value={w.dusun}>
                                            {w.dusun}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>
                    </div>

                    {/* View Switcher Tabs */}
                    <div className="tabs-row-clean">
                        <button
                            type="button"
                            className={`tab-pill ${viewTab === "matrix" ? "active" : ""}`}
                            onClick={() => setViewTab("matrix")}
                        >
                            <FileSpreadsheet size={15} />
                            <span>Matriks Harian (1 - {daysInMonth})</span>
                            <span className="tab-pill-badge">{filteredMatrixRows.length}</span>
                        </button>

                        <button
                            type="button"
                            className={`tab-pill ${viewTab === "transactions" ? "active" : ""}`}
                            onClick={() => setViewTab("transactions")}
                        >
                            <FileText size={15} />
                            <span>Riwayat Transaksi</span>
                            <span className="tab-pill-badge">{filteredTransactions.length}</span>
                        </button>
                    </div>
                </div>

                {/* View 1: Matriks Harian */}
                {viewTab === "matrix" && (
                    <div className="matrix-card-clean">
                        <div className="matrix-table-container-clean">
                            <table className="matrix-table-clean">
                                <thead>
                                    <tr>
                                        <th className="sticky-col-no">NO</th>
                                        <th
                                            className="sticky-col-nama"
                                            style={!isDesaDukun ? { left: "44px", minWidth: "200px" } : {}}
                                        >
                                            {isDesaDukun ? "NAMA MEMBER" : "NAMA DUSUN"}
                                        </th>
                                        {isDesaDukun && (
                                            <th className="sticky-col-dusun">DUSUN</th>
                                        )}
                                        {Array.from({ length: daysInMonth }, (_, i) => {
                                            const dayNum = i + 1;
                                            const isToday =
                                                dayNum === new Date().getDate() &&
                                                bulan === new Date().getMonth() + 1 &&
                                                tahun === new Date().getFullYear();
                                            return (
                                                <th
                                                    key={dayNum}
                                                    style={isToday ? { backgroundColor: "#fffbeb", color: "#b45309" } : {}}
                                                    title={`Hari ke-${dayNum}`}
                                                >
                                                    {dayNum}
                                                </th>
                                            );
                                        })}
                                        <th className="sticky-col-total">TOTAL (KG)</th>
                                        <th style={{ width: "55px" }}>HARI</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {isLoading ? (
                                        <tr>
                                            <td
                                                colSpan={daysInMonth + (isDesaDukun ? 5 : 4)}
                                                style={{ textAlign: "center", padding: "48px 16px", color: "#94a3b8" }}
                                            >
                                                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                                                    <RefreshCw size={18} className="spin" />
                                                    <span>Memuat data matriks harian...</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : filteredMatrixRows.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={daysInMonth + (isDesaDukun ? 5 : 4)}
                                                style={{ textAlign: "center", padding: "48px 16px", color: "#94a3b8" }}
                                            >
                                                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                                                    {isDesaDukun ? (
                                                        <Users size={32} style={{ color: "#cbd5e1" }} />
                                                    ) : (
                                                        <MapPin size={32} style={{ color: "#cbd5e1" }} />
                                                    )}
                                                    <p style={{ fontWeight: 700, color: "#334155", margin: 0 }}>
                                                        {isDesaDukun
                                                            ? "Belum ada member terdaftar"
                                                            : "Belum ada dusun terdaftar"}
                                                    </p>
                                                    <p style={{ fontSize: "13px", color: "#64748b", margin: 0, maxWidth: "420px" }}>
                                                        {isDesaDukun
                                                            ? "Tambahkan member di menu Bank Sampah atau catat sampah member baru."
                                                            : "Tambahkan dusun di menu Bank Sampah atau catat sampah dusun."}
                                                    </p>
                                                    <button
                                                        type="button"
                                                        className="btn-primary-clean"
                                                        style={{ marginTop: "8px" }}
                                                        onClick={() => openCreateModal()}
                                                    >
                                                        <Plus size={14} />
                                                        <span>
                                                            {isDesaDukun
                                                                ? "Catat Sampah Member"
                                                                : "Catat Sampah Dusun"}
                                                        </span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredMatrixRows.map((row, idx) => (
                                            <tr key={row.rowId || row.nama}>
                                                <td className="sticky-col-no" style={{ color: "#94a3b8", fontWeight: 500 }}>
                                                    {idx + 1}
                                                </td>
                                                <td
                                                    className="sticky-col-nama font-medium"
                                                    style={!isDesaDukun ? { left: "44px", minWidth: "200px" } : {}}
                                                >
                                                    <span
                                                        style={{ color: "#0f172a", cursor: "pointer", fontWeight: 600 }}
                                                        onClick={() =>
                                                            openCreateModal(row.nama, row.rowId || "")
                                                        }
                                                        title={`Klik untuk catat sampah ${row.nama}`}
                                                    >
                                                        {!isDesaDukun && (
                                                            <MapPin size={13} style={{ display: "inline", marginRight: "4px", color: "#0b8f82" }} />
                                                        )}
                                                        {row.nama}
                                                    </span>
                                                </td>
                                                {isDesaDukun && (
                                                    <td className="sticky-col-dusun" style={{ color: "#64748b", fontSize: "12px" }}>
                                                        {row.dusun}
                                                    </td>
                                                )}

                                                {Array.from({ length: daysInMonth }, (_, i) => {
                                                    const day = i + 1;
                                                    const entry = row.dailyMap.get(day);
                                                    const isToday =
                                                        day === new Date().getDate() &&
                                                        bulan === new Date().getMonth() + 1 &&
                                                        tahun === new Date().getFullYear();

                                                    return (
                                                        <td
                                                            key={day}
                                                            className={`cell-interactive-clean ${
                                                                entry ? "cell-has-data" : ""
                                                            } ${isToday ? "cell-today-highlight" : ""}`}
                                                            onClick={() =>
                                                                handleCellClick(row, day, entry)
                                                            }
                                                            title={
                                                                entry
                                                                    ? `${row.nama}, Tgl ${day}: ${entry.berat} kg (Klik untuk edit)`
                                                                    : `Klik untuk input sampah ${row.nama} tgl ${day}`
                                                            }
                                                        >
                                                            {entry ? (
                                                                <span className="weight-badge-clean">
                                                                    {entry.berat}
                                                                </span>
                                                            ) : (
                                                                <span className="cell-dash-muted">-</span>
                                                            )}
                                                        </td>
                                                    );
                                                })}

                                                <td className="sticky-col-total" style={{ fontWeight: 700, color: "#0b8f82" }}>
                                                    {row.totalBerat > 0 ? (
                                                        <span>{row.totalBerat}</span>
                                                    ) : (
                                                        <span style={{ color: "#cbd5e1" }}>0</span>
                                                    )}
                                                </td>
                                                <td style={{ color: "#64748b", fontSize: "12px" }}>
                                                    {row.freqSetor}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                                {filteredMatrixRows.length > 0 && (
                                    <tfoot>
                                        <tr style={{ background: "#f8fafc", borderTop: "2px solid #cbd5e1" }}>
                                            <td
                                                colSpan={isDesaDukun ? 3 : 2}
                                                className="sticky-col-no"
                                                style={{ textAlign: "right", fontWeight: 700, paddingRight: "12px" }}
                                            >
                                                TOTAL HARIAN (KG):
                                            </td>
                                            {dailyColumnTotals.map((tot, idx) => (
                                                <td
                                                    key={idx}
                                                    style={{ fontWeight: 700, color: tot > 0 ? "#0284c7" : "#cbd5e1" }}
                                                >
                                                    {tot > 0 ? tot : "-"}
                                                </td>
                                            ))}
                                            <td className="sticky-col-total" style={{ fontWeight: 800, color: "#0b8f82" }}>
                                                {kpi.totalKg}
                                            </td>
                                            <td style={{ color: "#94a3b8" }}>-</td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                        <div className="matrix-footer-clean">
                            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#16a34a" }}></span> Angka hijau: Berat sampah (kg)
                            </span>
                            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#cbd5e1" }}></span> Klik sel tanggal untuk input / edit cepat
                            </span>
                            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#f59e0b" }}></span> Kolom highlight: Hari ini
                            </span>
                        </div>
                    </div>
                )}

                {/* View 2: Riwayat Transaksi */}
                {viewTab === "transactions" && (
                    <div className="table-card-clean">
                        <div style={{ overflowX: "auto" }}>
                            <table className="table-clean">
                                <thead>
                                    <tr>
                                        <th style={{ width: "50px" }}>NO</th>
                                        <th>TANGGAL</th>
                                        <th>{isDesaDukun ? "MEMBER / NASABAH" : "NAMA DUSUN"}</th>
                                        {isDesaDukun && <th>DUSUN</th>}
                                        <th>JENIS SAMPAH</th>
                                        <th>BERAT (KG)</th>
                                        <th>HARGA / KG</th>
                                        <th>NILAI TRANSAKSI</th>
                                        <th>PETUGAS</th>
                                        <th style={{ width: "100px", textAlign: "center" }}>AKSI</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {isLoading ? (
                                        <tr>
                                            <td colSpan={isDesaDukun ? 10 : 9} style={{ textAlign: "center", padding: "48px 16px", color: "#94a3b8" }}>
                                                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                                                    <RefreshCw size={18} className="spin" />
                                                    <span>Memuat riwayat transaksi...</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : filteredTransactions.length === 0 ? (
                                        <tr>
                                            <td colSpan={isDesaDukun ? 10 : 9} style={{ textAlign: "center", padding: "48px 16px", color: "#94a3b8" }}>
                                                <AlertCircle size={28} style={{ margin: "0 auto 8px auto", color: "#cbd5e1" }} />
                                                <p style={{ margin: 0, fontWeight: 600 }}>Tidak ada data transaksi untuk filter ini.</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredTransactions.map((rec, idx) => {
                                            const dusun = isDesaDukun
                                                ? (rec.member_id && memberWilayahMap.get(rec.member_id)) ||
                                                  memberWilayahMap.get(rec.nama_nasabah.toLowerCase().trim()) ||
                                                  "-"
                                                : rec.nama_nasabah;
                                            const petugas = petugasList.find(
                                                (p) => p.id === rec.petugas_id
                                            );

                                            return (
                                                <tr key={rec.id}>
                                                    <td style={{ color: "#94a3b8" }}>{idx + 1}</td>
                                                    <td style={{ fontFamily: "monospace", fontSize: "12px" }}>
                                                        {formatTglIndo(rec.tanggal)}
                                                    </td>
                                                    <td style={{ fontWeight: 600, color: "#0f172a" }}>{rec.nama_nasabah}</td>
                                                    {isDesaDukun && (
                                                        <td style={{ color: "#64748b" }}>{dusun}</td>
                                                    )}
                                                    <td>
                                                        <span className="badge-code-clean">
                                                            {rec.jenis_sampah || "Campur"}
                                                        </span>
                                                    </td>
                                                    <td style={{ fontWeight: 700, color: "#0b8f82" }}>
                                                        {rec.berat_kg} kg
                                                    </td>
                                                    <td>
                                                        {rec.harga_per_kg > 0
                                                            ? formatRupiah(rec.harga_per_kg)
                                                            : "-"}
                                                    </td>
                                                    <td style={{ fontWeight: 600 }}>
                                                        {rec.nilai_transaksi > 0
                                                            ? formatRupiah(rec.nilai_transaksi)
                                                            : "-"}
                                                    </td>
                                                    <td style={{ color: "#64748b" }}>
                                                        {petugas ? petugas.nama : "-"}
                                                    </td>
                                                    <td>
                                                        <div style={{ display: "flex", justifyContent: "center", gap: "6px" }}>
                                                            <button
                                                                type="button"
                                                                className="action-btn-clean edit"
                                                                onClick={() => openEditModal(rec)}
                                                                title="Edit Transaksi"
                                                            >
                                                                <Edit3 size={14} />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="action-btn-clean delete"
                                                                onClick={() => openDeleteModal(rec)}
                                                                title="Hapus Transaksi"
                                                            >
                                                                <Trash2 size={14} />
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
                )}

                {/* MODAL 1: Catat / Edit Transaksi Sampah */}
                {(modalMode === "create" || modalMode === "edit") && (
                    <div className="modal-backdrop-clean">
                        <div className="modal-dialog-clean">
                            <div className="modal-header-clean">
                                <h3>
                                    {modalMode === "create"
                                        ? isDesaDukun
                                            ? "Catat Sampah Member"
                                            : "Catat Sampah Dusun"
                                        : "Edit Transaksi Sampah"}
                                </h3>
                                <button
                                    type="button"
                                    style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}
                                    onClick={() => setModalMode(null)}
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <form onSubmit={handleSingleSubmit} className="modal-form-clean">
                                {isDesaDukun ? (
                                    <>
                                        <div className="form-group-clean">
                                            <label>Pilih Member / Nasabah *</label>
                                            <select
                                                value={form.member_id}
                                                onChange={(e) => {
                                                    const selectedId = e.target.value;
                                                    const selectedM = memberList.find((m) => m.id === selectedId);
                                                    setForm({
                                                        ...form,
                                                        member_id: selectedId,
                                                        nama_nasabah: selectedM ? selectedM.nama : form.nama_nasabah,
                                                    });
                                                }}
                                                className="form-control-clean"
                                            >
                                                <option value="">-- Pilih dari Daftar Member --</option>
                                                {memberList.map((m) => (
                                                    <option key={m.id} value={m.id}>
                                                        {m.nama} {m.wilayah?.dusun ? `(${m.wilayah.dusun})` : ""}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="form-group-clean">
                                            <label>Nama Member (Manual / Teks Bebas) *</label>
                                            <input
                                                type="text"
                                                required
                                                placeholder="Ketik nama jika belum terdaftar..."
                                                value={form.nama_nasabah}
                                                onChange={(e) =>
                                                    setForm({ ...form, nama_nasabah: e.target.value })
                                                }
                                                className="form-control-clean"
                                            />
                                        </div>
                                    </>
                                ) : (
                                    <div className="form-group-clean">
                                        <label>Pilih Dusun *</label>
                                        <select
                                            required
                                            value={form.nasabah_id}
                                            onChange={(e) => {
                                                const selectedId = e.target.value;
                                                const selectedW = wilayahList.find((w) => w.id === selectedId);
                                                setForm({
                                                    ...form,
                                                    nasabah_id: selectedId,
                                                    nama_nasabah: selectedW ? selectedW.dusun : form.nama_nasabah,
                                                });
                                            }}
                                            className="form-control-clean"
                                        >
                                            <option value="">-- Pilih Dusun di {currentDesa?.nama || "Desa"} --</option>
                                            {wilayahList.map((w) => (
                                                <option key={w.id} value={w.id}>
                                                    {w.dusun} {w.kode ? `(${w.kode})` : ""}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                                    <div className="form-group-clean">
                                        <label>Tanggal Pencatatan *</label>
                                        <input
                                            type="date"
                                            required
                                            value={form.tanggal}
                                            onChange={(e) =>
                                                setForm({ ...form, tanggal: e.target.value })
                                            }
                                            className="form-control-clean"
                                        />
                                    </div>

                                    <div className="form-group-clean">
                                        <label>Jenis Sampah</label>
                                        <select
                                            value={form.jenis_sampah}
                                            onChange={(e) =>
                                                setForm({ ...form, jenis_sampah: e.target.value })
                                            }
                                            className="form-control-clean"
                                        >
                                            {JENIS_SAMPAH_LIST.map((j) => (
                                                <option key={j} value={j}>
                                                    {j}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                                    <div className="form-group-clean">
                                        <label>Berat Sampah (kg) *</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0.01"
                                            required
                                            placeholder="Contoh: 1.5"
                                            value={form.berat_kg}
                                            onChange={(e) =>
                                                setForm({ ...form, berat_kg: e.target.value })
                                            }
                                            className="form-control-clean"
                                        />
                                    </div>

                                    <div className="form-group-clean">
                                        <label>Harga per kg (Rp, Opsional)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            placeholder="0"
                                            value={form.harga_per_kg}
                                            onChange={(e) =>
                                                setForm({ ...form, harga_per_kg: e.target.value })
                                            }
                                            className="form-control-clean"
                                        />
                                    </div>
                                </div>

                                <div className="form-group-clean">
                                    <label>Petugas Pencatat</label>
                                    <select
                                        value={form.petugas_id}
                                        onChange={(e) =>
                                            setForm({ ...form, petugas_id: e.target.value })
                                        }
                                        className="form-control-clean"
                                    >
                                        <option value="">Pilih Petugas (Opsional)</option>
                                        {petugasList.map((p) => (
                                            <option key={p.id} value={p.id}>
                                                {p.nama}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="modal-actions-clean">
                                    <button
                                        type="button"
                                        className="btn-secondary-clean"
                                        onClick={() => setModalMode(null)}
                                        disabled={isSubmitting}
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn-primary-clean"
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? "Menyimpan..." : "Simpan Data"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* MODAL 2: Quick Edit Cell */}
                {modalMode === "cellQuickEdit" && cellTarget && (
                    <div className="modal-backdrop-clean">
                        <div className="modal-dialog-clean modal-dialog-sm-clean">
                            <div className="modal-header-clean">
                                <h3>Quick Edit Berat Sampah</h3>
                                <button
                                    type="button"
                                    style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}
                                    onClick={() => setModalMode(null)}
                                >
                                    <X size={18} />
                                </button>
                            </div>
                            <form onSubmit={handleCellQuickSave} className="modal-form-clean">
                                <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "10px 14px", fontSize: "13px" }}>
                                    <p style={{ margin: "2px 0", color: "#334155" }}>
                                        {isDesaDukun ? "Member" : "Dusun"}:{" "}
                                        <strong>{cellTarget.labelName}</strong>
                                    </p>
                                    <p style={{ margin: "2px 0", color: "#64748b" }}>
                                        Tanggal:{" "}
                                        <strong>
                                            {cellTarget.day} {BULAN_LIST[bulan - 1]?.label} {tahun}
                                        </strong>
                                    </p>
                                </div>

                                <div className="form-group-clean">
                                    <label>Berat Sampah (kg)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        autoFocus
                                        placeholder="0"
                                        value={cellWeight}
                                        onChange={(e) => setCellWeight(e.target.value)}
                                        className="form-control-clean"
                                        style={{ textAlign: "center", fontSize: "18px", fontWeight: 700 }}
                                    />
                                    <small style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px" }}>
                                        Isi 0 untuk menghapus catatan sampah hari ini.
                                    </small>
                                </div>

                                <div className="modal-actions-clean">
                                    <button
                                        type="button"
                                        className="btn-secondary-clean"
                                        onClick={() => setModalMode(null)}
                                        disabled={isSubmitting}
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn-primary-clean"
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? "Menyimpan..." : "Simpan"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* MODAL 3: Konfirmasi Hapus */}
                {modalMode === "delete" && deleteItem && (
                    <div className="modal-backdrop-clean">
                        <div className="modal-dialog-clean modal-dialog-sm-clean">
                            <div className="modal-header-clean">
                                <h3>Hapus Catatan Sampah</h3>
                                <button
                                    type="button"
                                    style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}
                                    onClick={() => setModalMode(null)}
                                >
                                    <X size={18} />
                                </button>
                            </div>
                            <div style={{ padding: "16px 20px", fontSize: "14px", color: "#334155", lineHeight: 1.5 }}>
                                <p style={{ margin: 0 }}>
                                    Apakah Anda yakin ingin menghapus data sampah untuk{" "}
                                    <strong>{deleteItem.nama_nasabah}</strong> sebesar{" "}
                                    <strong>{deleteItem.berat_kg} kg</strong> pada tanggal{" "}
                                    <strong>{formatTglIndo(deleteItem.tanggal)}</strong>?
                                </p>
                            </div>
                            <div className="modal-actions-clean" style={{ padding: "0 20px 16px 20px" }}>
                                <button
                                    type="button"
                                    className="btn-secondary-clean"
                                    onClick={() => setModalMode(null)}
                                    disabled={isSubmitting}
                                >
                                    Batal
                                </button>
                                <button
                                    type="button"
                                    className="btn-danger-clean"
                                    onClick={handleDeleteConfirm}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? "Menghapus..." : "Hapus Data"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </FormShell>
    );
}
