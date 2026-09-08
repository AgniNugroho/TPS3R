"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import FormShell from "@/components/dashboard/FormShell";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { exportWorkbook } from "@/lib/utils/exportExcel";
import {
    Calendar,
    Download,
    FileSpreadsheet,
    Landmark,
    Scale,
    TrendingUp,
    CheckCircle2,
    Clock,
    Truck,
} from "lucide-react";
import toast from "react-hot-toast";

type DesaItem = {
    id: string;
    kode: string;
    nama: string;
};

type SampahMasukRecord = {
    id: string;
    member_id: string | null;
    tanggal: string;
    nasabah_id: string | null;
    nama_nasabah: string;
    jenis_sampah: string | null;
    berat_kg: number;
    harga_per_kg: number;
    nilai_transaksi: number;
    petugas_id: string | null;
};

type WilayahDusunItem = { id: string; dusun: string; status?: string | null };
type MemberBankSampahItem = {
    id: string;
    nama: string;
    wilayah?: { dusun: string } | null;
};
type PetugasItem = { id: string; nama: string };

type PaymentRow = {
    id: string;
    member_id?: string | null;
    wilayah_id?: string | null;
    periode_bulan: string;
    tanggal_bayar: string;
    nominal: number;
    metode_pembayaran: string;
    status: string;
    catatan?: string | null;
    member?: {
        id: string;
        kode_member?: string | null;
        nama: string;
        nik?: string | null;
        kategori?: string | null;
        wilayah?: {
            dusun: string;
        } | null;
    } | null;
    wilayah?: {
        id: string;
        kode: string;
        dusun: string;
        rt: string | null;
        rw: string | null;
    } | null;
    desa?: {
        id: string;
        nama: string;
    } | null;
};

type ExpenseRow = {
    id: string;
    periode_bulan: string;
    tanggal: string;
    kategori: string;
    keterangan: string;
    nominal: number;
    desa?: {
        id: string;
        nama: string;
    } | null;
};

type PenjualanRow = {
    id: string;
    tanggal: string;
    pembeli: string;
    kontak_pembeli?: string | null;
    kategori: string;
    berat_kg: number;
    harga_per_kg: number;
    total_pendapatan: number;
    status_setoran: string;
    tanggal_setor?: string | null;
    catatan?: string | null;
    desa?: {
        id: string;
        nama: string;
    } | null;
};

export default function LaporanPage() {
    return (
        <Suspense fallback={<div>Memuat halaman laporan...</div>}>
            <LaporanContent />
        </Suspense>
    );
}

function LaporanContent() {
    const searchParams = useSearchParams();
    const user = useCurrentUser();

    const [bulan, setBulan] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    });

    const [desaList, setDesaList] = useState<DesaItem[]>([]);
    const [downloading, setDownloading] = useState<string | null>(null);

    // Admins pick a desa via the sidebar (desa_id query param); petugas has no
    // selector and is always scoped to their own desa, so fall back to it here
    // instead of showing a misleading "Semua Desa" label.
    const selectedDesaId =
        user?.role === "admin"
            ? searchParams.get("desa_id") || "all"
            : user?.desaId || "all";

    // Summary data for preview cards
    const [summary, setSummary] = useState<{
        // Keuangan Member & Operasional
        totalIuran: number;
        memberCount: number;
        totalOperasional: number;
        netIuranBUMDes: number;
        // Keuangan Penjualan Anorganik
        totalPenjualan: number;
        totalBeratPenjualan: number;
        penjualanCount: number;
        totalPenjualanDisetor: number;
        totalPenjualanBelumDisetor: number;
        loading: boolean;
    }>({
        totalIuran: 0,
        memberCount: 0,
        totalOperasional: 0,
        netIuranBUMDes: 0,
        totalPenjualan: 0,
        totalBeratPenjualan: 0,
        penjualanCount: 0,
        totalPenjualanDisetor: 0,
        totalPenjualanBelumDisetor: 0,
        loading: false,
    });

    // Load desa list
    useEffect(() => {
        async function fetchDesa() {
            try {
                const res = await fetch("/api/desa");
                const json = await res.json();
                if (json.ok && Array.isArray(json.rows)) {
                    setDesaList(json.rows);
                }
            } catch (err) {
                console.error("Gagal memuat desa", err);
            }
        }
        void Promise.resolve().then(() => fetchDesa());
    }, []);

    // Load monthly financial summary preview
    const loadSummaryPreview = useCallback(async () => {
        setSummary((prev) => ({ ...prev, loading: true }));
        try {
            const params = new URLSearchParams({ periode_bulan: bulan });
            if (selectedDesaId && selectedDesaId !== "all") {
                params.set("desa_id", selectedDesaId);
            }

            const pjParams = new URLSearchParams({ bulan });
            if (selectedDesaId && selectedDesaId !== "all") {
                pjParams.set("desa_id", selectedDesaId);
            }

            const [resBayar, resOpr, resPj] = await Promise.all([
                fetch(`/api/pembayaran-member?${params.toString()}`).then((r) =>
                    r.json(),
                ),
                fetch(`/api/operasional-tps3r?${params.toString()}`).then((r) =>
                    r.json(),
                ),
                fetch(`/api/penjualan-anorganik?${pjParams.toString()}`).then(
                    (r) => r.json(),
                ),
            ]);

            const bayarRows: PaymentRow[] =
                resBayar.ok && Array.isArray(resBayar.rows)
                    ? resBayar.rows
                    : [];
            const oprRows: ExpenseRow[] =
                resOpr.ok && Array.isArray(resOpr.rows) ? resOpr.rows : [];
            const pjRows: PenjualanRow[] =
                resPj.ok && Array.isArray(resPj.rows) ? resPj.rows : [];

            const totalIuran = bayarRows.reduce(
                (acc, r) => acc + Number(r.nominal || 0),
                0,
            );
            const totalOperasional = oprRows.reduce(
                (acc, r) => acc + Number(r.nominal || 0),
                0,
            );
            const netIuranBUMDes = totalIuran - totalOperasional;

            const totalPenjualan = pjRows.reduce(
                (acc, r) => acc + Number(r.total_pendapatan || 0),
                0,
            );
            const totalBeratPenjualan = pjRows.reduce(
                (acc, r) => acc + Number(r.berat_kg || 0),
                0,
            );
            const totalPenjualanDisetor = pjRows
                .filter((r) => r.status_setoran === "sudah_disetor")
                .reduce((acc, r) => acc + Number(r.total_pendapatan || 0), 0);
            const totalPenjualanBelumDisetor = pjRows
                .filter((r) => r.status_setoran !== "sudah_disetor")
                .reduce((acc, r) => acc + Number(r.total_pendapatan || 0), 0);

            setSummary({
                totalIuran,
                memberCount: bayarRows.length,
                totalOperasional,
                netIuranBUMDes,
                totalPenjualan,
                totalBeratPenjualan:
                    Math.round(totalBeratPenjualan * 100) / 100,
                penjualanCount: pjRows.length,
                totalPenjualanDisetor,
                totalPenjualanBelumDisetor,
                loading: false,
            });
        } catch (err) {
            console.error("Gagal memuat ringkasan", err);
            setSummary((prev) => ({ ...prev, loading: false }));
        }
    }, [bulan, selectedDesaId]);

    useEffect(() => {
        void Promise.resolve().then(() => loadSummaryPreview());
    }, [loadSummaryPreview]);

    // Format nama bulan Indo helper
    const getNamaBulanIndo = (periodeStr: string) => {
        const [year, month] = periodeStr.split("-");
        const namaBulanArr = [
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
        return `${namaBulanArr[parseInt(month, 10)] || month} ${year}`;
    };

    // Resolve the report's desa name from the actual (already desa-scoped) rows
    // returned by the API, rather than trusting the client-side selectedDesaId,
    // which can briefly be "all" for petugas while useCurrentUser() is loading.
    function resolveDesaName(
        rowsGroups: Array<
            Array<{ desa?: { id: string; nama: string } | null }>
        >,
        fallbackDesaObj: DesaItem | undefined,
    ): string {
        const distinctDesa = new Map<string, string>();
        for (const rows of rowsGroups) {
            for (const row of rows) {
                if (row.desa) distinctDesa.set(row.desa.id, row.desa.nama);
            }
        }
        if (distinctDesa.size === 1) {
            return Array.from(distinctDesa.values())[0];
        }
        if (distinctDesa.size > 1) return "Semua Desa";
        if (fallbackDesaObj) return fallbackDesaObj.nama;
        return selectedDesaId === "all" ? "Semua Desa" : "Desa";
    }

    // ─────────────────────────────────────────────────────────────
    // 0. EXPORT EXCEL LAPORAN SAMPAH (MATRIKS HARIAN & RIWAYAT TRANSAKSI)
    // ─────────────────────────────────────────────────────────────
    async function exportExcelLaporanSampah() {
        if (!selectedDesaId || selectedDesaId === "all") {
            toast.error(
                "Pilih desa terlebih dahulu di sidebar untuk mengekspor laporan sampah.",
            );
            return;
        }

        setDownloading("sampah_excel");
        try {
            const [yearStr, monthStr] = bulan.split("-");
            const year = parseInt(yearStr, 10);
            const month = parseInt(monthStr, 10);

            const bankParams = new URLSearchParams({
                bulan: String(month),
                tahun: String(year),
                desa_id: selectedDesaId,
            });
            const wilayahParams = new URLSearchParams({
                desa_id: selectedDesaId,
            });
            const memberParams = new URLSearchParams({
                desa_id: selectedDesaId,
            });

            const [resBank, resWilayah, resMember, resPetugas] =
                await Promise.all([
                    fetch(`/api/bank-sampah?${bankParams.toString()}`).then(
                        (r) => r.json(),
                    ),
                    fetch(`/api/wilayah?${wilayahParams.toString()}`).then(
                        (r) => r.json(),
                    ),
                    fetch(
                        `/api/member-bank-sampah?${memberParams.toString()}`,
                    ).then((r) => r.json()),
                    fetch("/api/petugas").then((r) => r.json()),
                ]);

            const records: SampahMasukRecord[] =
                resBank.ok && Array.isArray(resBank.rows) ? resBank.rows : [];
            const wilayahRows: WilayahDusunItem[] = (
                resWilayah.ok && Array.isArray(resWilayah.rows)
                    ? resWilayah.rows
                    : []
            ).filter(
                (w: WilayahDusunItem) =>
                    !w.status || w.status.toLowerCase() === "aktif",
            );
            const memberRows: MemberBankSampahItem[] =
                resMember.ok && Array.isArray(resMember.rows)
                    ? resMember.rows
                    : [];
            const petugasRows: PetugasItem[] =
                resPetugas.ok && Array.isArray(resPetugas.rows)
                    ? resPetugas.rows
                    : [];

            if (records.length === 0) {
                toast.error(
                    `Belum ada data pengumpulan sampah pada periode ${getNamaBulanIndo(bulan)}.`,
                );
                setDownloading(null);
                return;
            }

            const currentDesaObj = desaList.find(
                (d) => d.id === selectedDesaId,
            );
            const isDesaDukun = Boolean(
                currentDesaObj?.nama.toLowerCase().includes("dukun"),
            );
            const daysInMonth = new Date(year, month, 0).getDate();

            const memberWilayahMap = new Map<string, string>();
            memberRows.forEach((m) => {
                const dusun = m.wilayah?.dusun || "";
                if (m.nama)
                    memberWilayahMap.set(m.nama.toLowerCase().trim(), dusun);
                if (m.id) memberWilayahMap.set(m.id, dusun);
            });

            type MatrixRow = {
                rowId: string | null;
                nama: string;
                dusun: string;
                dailyMap: Map<number, { berat: number; nilai: number }>;
                totalBerat: number;
                freqSetor: number;
            };

            const matrixMap = new Map<string, MatrixRow>();

            if (isDesaDukun) {
                memberRows.forEach((m) => {
                    matrixMap.set(m.nama.trim().toLowerCase(), {
                        rowId: m.id,
                        nama: m.nama,
                        dusun: m.wilayah?.dusun || "-",
                        dailyMap: new Map(),
                        totalBerat: 0,
                        freqSetor: 0,
                    });
                });

                records.forEach((rec) => {
                    const rawName = rec.nama_nasabah?.trim() || "Tanpa Nama";
                    const key = rawName.toLowerCase();
                    if (!matrixMap.has(key)) {
                        matrixMap.set(key, {
                            rowId: rec.member_id,
                            nama: rawName,
                            dusun: memberWilayahMap.get(key) || "-",
                            dailyMap: new Map(),
                            totalBerat: 0,
                            freqSetor: 0,
                        });
                    }
                    const row = matrixMap.get(key)!;
                    const day = parseInt(rec.tanggal.split("-")[2], 10);
                    if (!isNaN(day)) {
                        const existing = row.dailyMap.get(day);
                        if (existing) {
                            existing.berat += Number(rec.berat_kg);
                        } else {
                            row.dailyMap.set(day, {
                                berat: Number(rec.berat_kg),
                                nilai: Number(rec.nilai_transaksi),
                            });
                        }
                    }
                });
            } else {
                wilayahRows.forEach((w) => {
                    matrixMap.set(w.dusun.trim().toLowerCase(), {
                        rowId: w.id,
                        nama: w.dusun,
                        dusun: w.dusun,
                        dailyMap: new Map(),
                        totalBerat: 0,
                        freqSetor: 0,
                    });
                });

                records.forEach((rec) => {
                    const rawName = rec.nama_nasabah?.trim() || "";
                    let key = rawName.toLowerCase();

                    let targetDusun = wilayahRows.find(
                        (w) =>
                            w.id === rec.nasabah_id ||
                            w.dusun.toLowerCase() === key,
                    );
                    if (!targetDusun && rawName) {
                        targetDusun = wilayahRows.find((w) =>
                            rawName
                                .toLowerCase()
                                .includes(w.dusun.toLowerCase()),
                        );
                    }

                    if (targetDusun) {
                        key = targetDusun.dusun.trim().toLowerCase();
                    } else if (!matrixMap.has(key)) {
                        matrixMap.set(key, {
                            rowId: rec.nasabah_id,
                            nama: rawName || "Dusun Lainnya",
                            dusun: rawName || "Dusun Lainnya",
                            dailyMap: new Map(),
                            totalBerat: 0,
                            freqSetor: 0,
                        });
                    }

                    const row = matrixMap.get(key);
                    if (row) {
                        const day = parseInt(rec.tanggal.split("-")[2], 10);
                        if (!isNaN(day)) {
                            const existing = row.dailyMap.get(day);
                            if (existing) {
                                existing.berat += Number(rec.berat_kg);
                            } else {
                                row.dailyMap.set(day, {
                                    berat: Number(rec.berat_kg),
                                    nilai: Number(rec.nilai_transaksi),
                                });
                            }
                        }
                    }
                });
            }

            const matrixRows = Array.from(matrixMap.values())
                .map((row) => {
                    let sumBerat = 0;
                    let count = 0;
                    row.dailyMap.forEach((entry) => {
                        sumBerat += entry.berat;
                        count++;
                    });
                    return {
                        ...row,
                        totalBerat: Number(sumBerat.toFixed(2)),
                        freqSetor: count,
                    };
                })
                .sort((a, b) => {
                    if (b.totalBerat !== a.totalBerat)
                        return b.totalBerat - a.totalBerat;
                    return a.nama.localeCompare(b.nama, "id", {
                        sensitivity: "base",
                    });
                });

            const dailyColumnTotals = new Array(daysInMonth).fill(0);
            matrixRows.forEach((row) => {
                row.dailyMap.forEach((entry, day) => {
                    if (day >= 1 && day <= daysInMonth) {
                        dailyColumnTotals[day - 1] += entry.berat;
                    }
                });
            });
            const dailyTotalsRounded = dailyColumnTotals.map((v) =>
                Number(v.toFixed(2)),
            );

            const namaBulanArr = [
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
            const namaBulanStr = namaBulanArr[month] || String(month);

            const matrixHeaders = isDesaDukun
                ? [
                      "No",
                      "Nama Member",
                      "Dusun / Wilayah",
                      ...Array.from(
                          { length: daysInMonth },
                          (_, i) => `Tgl ${i + 1}`,
                      ),
                      "Total (kg)",
                      "Frekuensi (hari)",
                  ]
                : [
                      "No",
                      "Nama Dusun",
                      ...Array.from(
                          { length: daysInMonth },
                          (_, i) => `Tgl ${i + 1}`,
                      ),
                      "Total (kg)",
                      "Frekuensi (hari)",
                  ];

            const matrixData = matrixRows.map((r, idx) => {
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
            dailyTotalsRounded.forEach((val) => {
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

            const sortedTransactions = [...records].sort((a, b) =>
                b.tanggal.localeCompare(a.tanggal),
            );

            const txData = sortedTransactions.map((rec, idx) => {
                const petugasNama =
                    petugasRows.find((p) => p.id === rec.petugas_id)?.nama ||
                    "-";
                if (isDesaDukun) {
                    return [
                        idx + 1,
                        rec.tanggal,
                        rec.nama_nasabah,
                        (rec.member_id &&
                            memberWilayahMap.get(rec.member_id)) ||
                            memberWilayahMap.get(
                                rec.nama_nasabah.toLowerCase().trim(),
                            ) ||
                            "-",
                        rec.jenis_sampah || "Campur",
                        rec.berat_kg,
                        rec.harga_per_kg,
                        rec.nilai_transaksi,
                        petugasNama,
                    ];
                }
                return [
                    idx + 1,
                    rec.tanggal,
                    rec.nama_nasabah,
                    rec.jenis_sampah || "Campur",
                    rec.berat_kg,
                    rec.harga_per_kg,
                    rec.nilai_transaksi,
                    petugasNama,
                ];
            });

            const desaSlug = (currentDesaObj?.nama || "Desa").replace(
                /\s+/g,
                "_",
            );

            await exportWorkbook(
                [
                    {
                        sheetName: `Matriks ${namaBulanStr} ${year}`,
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
                `Pengumpulan_Sampah_${desaSlug}_${namaBulanStr}_${year}.xlsx`,
            );

            toast.success("Laporan Sampah (.xlsx) berhasil diunduh!");
        } catch (err) {
            console.error("Gagal mengekspor Excel Laporan Sampah", err);
            toast.error("Terjadi kesalahan saat membuat file Excel.");
        } finally {
            setDownloading(null);
        }
    }

    // ─────────────────────────────────────────────────────────────
    // 1. EXPORT EXCEL LAPORAN KEUANGAN MEMBER & OPERASIONAL
    // ─────────────────────────────────────────────────────────────
    async function exportExcelKeuanganMember() {
        setDownloading("member_excel");
        try {
            const params = new URLSearchParams({ periode_bulan: bulan });
            if (selectedDesaId && selectedDesaId !== "all") {
                params.set("desa_id", selectedDesaId);
            }

            const [resBayar, resOpr] = await Promise.all([
                fetch(`/api/pembayaran-member?${params.toString()}`).then((r) =>
                    r.json(),
                ),
                fetch(`/api/operasional-tps3r?${params.toString()}`).then((r) =>
                    r.json(),
                ),
            ]);

            const bayarRows: PaymentRow[] =
                resBayar.ok && Array.isArray(resBayar.rows)
                    ? resBayar.rows
                    : [];
            const oprRows: ExpenseRow[] =
                resOpr.ok && Array.isArray(resOpr.rows) ? resOpr.rows : [];

            if (bayarRows.length === 0 && oprRows.length === 0) {
                toast.error(
                    `Belum ada data pembayaran iuran atau operasional pada periode ${bulan}.`,
                );
                setDownloading(null);
                return;
            }

            const totalIuran = bayarRows.reduce(
                (acc, r) => acc + Number(r.nominal || 0),
                0,
            );
            const totalOperasional = oprRows.reduce(
                (acc, r) => acc + Number(r.nominal || 0),
                0,
            );
            const netIuranBUMDes = totalIuran - totalOperasional;

            const currentDesaObj = desaList.find(
                (d) => d.id === selectedDesaId,
            );
            const desaName = resolveDesaName(
                [bayarRows, oprRows],
                currentDesaObj,
            );

            const isDusunMode =
                selectedDesaId !== "all" &&
                Boolean(
                    currentDesaObj &&
                    !currentDesaObj.nama.toLowerCase().includes("dukun"),
                );
            const bulanNama = getNamaBulanIndo(bulan);

            // Sheet 1: Rekapitulasi Keuangan Member & Operasional
            type RekapIuranRow = {
                uraian: string;
                keterangan: string;
                nominal: number | string;
            };
            const titleUraian = isDusunMode
                ? "LAPORAN REKAPITULASI IURAN DUSUN & OPERASIONAL TPS3R"
                : selectedDesaId === "all"
                  ? "LAPORAN REKAPITULASI IURAN (MEMBER & DUSUN) & OPERASIONAL TPS3R"
                  : "LAPORAN REKAPITULASI IURAN MEMBER & OPERASIONAL TPS3R";
            const countLabel = isDusunMode
                ? "1. Total Dusun Membayar"
                : selectedDesaId === "all"
                  ? "1. Total Entitas Membayar"
                  : "1. Total Member Membayar";
            const countKet = isDusunMode
                ? `${bayarRows.length} Dusun`
                : selectedDesaId === "all"
                  ? `${bayarRows.length} Data`
                  : `${bayarRows.length} Orang`;
            const iuranLabel = isDusunMode
                ? "2. Total Penerimaan Iuran Dusun"
                : selectedDesaId === "all"
                  ? "2. Total Penerimaan Iuran"
                  : "2. Total Penerimaan Iuran Member";

            const rekapRows: RekapIuranRow[] = [
                { uraian: titleUraian, keterangan: "", nominal: "" },
                {
                    uraian: "Wilayah / Unit",
                    keterangan: `TPS3R ${desaName}`,
                    nominal: "",
                },
                { uraian: "Periode Bulan", keterangan: bulanNama, nominal: "" },
                {
                    uraian: "Tanggal Dicetak",
                    keterangan: new Date().toLocaleDateString("id-ID"),
                    nominal: "",
                },
                {
                    uraian: "----------------------------------------",
                    keterangan: "--------------------",
                    nominal: "------------",
                },
                { uraian: countLabel, keterangan: countKet, nominal: "" },
                {
                    uraian: iuranLabel,
                    keterangan: "Pemasukan Iuran",
                    nominal: totalIuran,
                },
                {
                    uraian: "3. Total Biaya Operasional TPS3R",
                    keterangan: "Pengeluaran (BBM, Listrik, Dapur, dll)",
                    nominal: totalOperasional,
                },
                {
                    uraian: "----------------------------------------",
                    keterangan: "--------------------",
                    nominal: "------------",
                },
                {
                    uraian: "SISA SETORAN BERSIH IURAN KE BENDAHARA BUMDES",
                    keterangan: "Iuran - Operasional",
                    nominal: netIuranBUMDes,
                },
            ];

            // Sheet 2: Rincian Pembayaran Iuran
            let sheet2Name = "Iuran Member";
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let sheet2Rows: any[] = [];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let sheet2Columns: any[] = [];

            if (isDusunMode) {
                sheet2Name = "Iuran Dusun";
                type DusunExportRow = {
                    no: number;
                    kode: string;
                    dusun: string;
                    rt_rw: string;
                    periode: string;
                    tanggal: string;
                    nominal: number;
                    metode: string;
                    status: string;
                    catatan: string;
                };
                sheet2Rows = bayarRows.map((r, i) => {
                    const rt = r.wilayah?.rt ? `RT ${r.wilayah.rt}` : "";
                    const rw = r.wilayah?.rw ? `RW ${r.wilayah.rw}` : "";
                    const rtrw = [rt, rw].filter(Boolean).join(" / ") || "-";
                    return {
                        no: i + 1,
                        kode: r.wilayah?.kode || "-",
                        dusun:
                            r.wilayah?.dusun ||
                            r.member?.wilayah?.dusun ||
                            "Dusun",
                        rt_rw: rtrw,
                        periode: r.periode_bulan,
                        tanggal: r.tanggal_bayar,
                        nominal: Number(r.nominal || 0),
                        metode: r.metode_pembayaran,
                        status: r.status,
                        catatan: r.catatan || "-",
                    };
                });
                sheet2Columns = [
                    { header: "No", accessor: (r: DusunExportRow) => r.no },
                    {
                        header: "Kode Dusun",
                        accessor: (r: DusunExportRow) => r.kode,
                    },
                    {
                        header: "Nama Dusun",
                        accessor: (r: DusunExportRow) => r.dusun,
                    },
                    {
                        header: "RT / RW",
                        accessor: (r: DusunExportRow) => r.rt_rw,
                    },
                    {
                        header: "Periode Tagihan",
                        accessor: (r: DusunExportRow) => r.periode,
                    },
                    {
                        header: "Tanggal Bayar",
                        accessor: (r: DusunExportRow) => r.tanggal,
                    },
                    {
                        header: "Nominal (Rp)",
                        accessor: (r: DusunExportRow) => r.nominal,
                    },
                    {
                        header: "Metode Pembayaran",
                        accessor: (r: DusunExportRow) => r.metode,
                    },
                    {
                        header: "Status",
                        accessor: (r: DusunExportRow) => r.status,
                    },
                    {
                        header: "Catatan",
                        accessor: (r: DusunExportRow) => r.catatan,
                    },
                ];
            } else if (selectedDesaId === "all") {
                sheet2Name = "Rincian Iuran";
                type MixedExportRow = {
                    no: number;
                    tipe: string;
                    kode: string;
                    nama_entitas: string;
                    wilayah: string;
                    periode: string;
                    tanggal: string;
                    nominal: number;
                    metode: string;
                    status: string;
                    catatan: string;
                };
                sheet2Rows = bayarRows.map((r, i) => {
                    const isDusunRow = Boolean(
                        r.wilayah_id || (!r.member_id && r.wilayah),
                    );
                    const rt = r.wilayah?.rt ? `RT ${r.wilayah.rt}` : "";
                    const rw = r.wilayah?.rw ? `RW ${r.wilayah.rw}` : "";
                    const rtrw = [rt, rw].filter(Boolean).join(" / ");
                    return {
                        no: i + 1,
                        tipe: isDusunRow ? "Dusun" : "Member",
                        kode: isDusunRow
                            ? r.wilayah?.kode || "-"
                            : r.member?.kode_member || "-",
                        nama_entitas: isDusunRow
                            ? r.wilayah?.dusun || "-"
                            : r.member?.nama || "-",
                        wilayah: isDusunRow
                            ? rtrw || "-"
                            : r.member?.wilayah?.dusun || "-",
                        periode: r.periode_bulan,
                        tanggal: r.tanggal_bayar,
                        nominal: Number(r.nominal || 0),
                        metode: r.metode_pembayaran,
                        status: r.status,
                        catatan: r.catatan || "-",
                    };
                });
                sheet2Columns = [
                    { header: "No", accessor: (r: MixedExportRow) => r.no },
                    {
                        header: "Kategori",
                        accessor: (r: MixedExportRow) => r.tipe,
                    },
                    { header: "Kode", accessor: (r: MixedExportRow) => r.kode },
                    {
                        header: "Nama / Dusun",
                        accessor: (r: MixedExportRow) => r.nama_entitas,
                    },
                    {
                        header: "Wilayah / RT RW",
                        accessor: (r: MixedExportRow) => r.wilayah,
                    },
                    {
                        header: "Periode Tagihan",
                        accessor: (r: MixedExportRow) => r.periode,
                    },
                    {
                        header: "Tanggal Bayar",
                        accessor: (r: MixedExportRow) => r.tanggal,
                    },
                    {
                        header: "Nominal (Rp)",
                        accessor: (r: MixedExportRow) => r.nominal,
                    },
                    {
                        header: "Metode Pembayaran",
                        accessor: (r: MixedExportRow) => r.metode,
                    },
                    {
                        header: "Status",
                        accessor: (r: MixedExportRow) => r.status,
                    },
                    {
                        header: "Catatan",
                        accessor: (r: MixedExportRow) => r.catatan,
                    },
                ];
            } else {
                sheet2Name = "Iuran Member";
                type MemberExportRow = {
                    no: number;
                    kode: string;
                    nama: string;
                    nik: string;
                    kategori: string;
                    dusun: string;
                    periode: string;
                    tanggal: string;
                    nominal: number;
                    metode: string;
                    status: string;
                    catatan: string;
                };
                sheet2Rows = bayarRows.map((r, i) => ({
                    no: i + 1,
                    kode: r.member?.kode_member || "-",
                    nama: r.member?.nama || "Tanpa Nama",
                    nik: r.member?.nik || "-",
                    kategori: r.member?.kategori || "Rumahan",
                    dusun: r.member?.wilayah?.dusun || "-",
                    periode: r.periode_bulan,
                    tanggal: r.tanggal_bayar,
                    nominal: Number(r.nominal || 0),
                    metode: r.metode_pembayaran,
                    status: r.status,
                    catatan: r.catatan || "-",
                }));
                sheet2Columns = [
                    { header: "No", accessor: (r: MemberExportRow) => r.no },
                    {
                        header: "Kode Member",
                        accessor: (r: MemberExportRow) => r.kode,
                    },
                    {
                        header: "Nama Member",
                        accessor: (r: MemberExportRow) => r.nama,
                    },
                    { header: "NIK", accessor: (r: MemberExportRow) => r.nik },
                    {
                        header: "Kategori (Rumahan/Industri)",
                        accessor: (r: MemberExportRow) => r.kategori,
                    },
                    {
                        header: "Dusun / Wilayah",
                        accessor: (r: MemberExportRow) => r.dusun,
                    },
                    {
                        header: "Periode Tagihan",
                        accessor: (r: MemberExportRow) => r.periode,
                    },
                    {
                        header: "Tanggal Bayar",
                        accessor: (r: MemberExportRow) => r.tanggal,
                    },
                    {
                        header: "Nominal (Rp)",
                        accessor: (r: MemberExportRow) => r.nominal,
                    },
                    {
                        header: "Metode Pembayaran",
                        accessor: (r: MemberExportRow) => r.metode,
                    },
                    {
                        header: "Status",
                        accessor: (r: MemberExportRow) => r.status,
                    },
                    {
                        header: "Catatan",
                        accessor: (r: MemberExportRow) => r.catatan,
                    },
                ];
            }

            // Sheet 3: Rincian Biaya Operasional
            type OprExportRow = {
                no: number;
                tanggal: string;
                kategori: string;
                keterangan: string;
                nominal: number;
            };
            const oprExportRows: OprExportRow[] = oprRows.map((r, i) => ({
                no: i + 1,
                tanggal: r.tanggal,
                kategori: r.kategori,
                keterangan: r.keterangan,
                nominal: Number(r.nominal || 0),
            }));

            await exportWorkbook(
                [
                    {
                        sheetName: "Rekap Iuran BUMDes",
                        rows: rekapRows,
                        columns: [
                            {
                                header: "Uraian / Komponen",
                                accessor: (r: RekapIuranRow) => r.uraian,
                            },
                            {
                                header: "Keterangan",
                                accessor: (r: RekapIuranRow) => r.keterangan,
                            },
                            {
                                header: "Jumlah (Rp)",
                                accessor: (r: RekapIuranRow) => r.nominal,
                            },
                        ],
                    },
                    {
                        sheetName: sheet2Name,
                        rows: sheet2Rows,
                        columns: sheet2Columns,
                    },
                    {
                        sheetName: "Biaya Operasional",
                        rows: oprExportRows,
                        columns: [
                            {
                                header: "No",
                                accessor: (r: OprExportRow) => r.no,
                            },
                            {
                                header: "Tanggal",
                                accessor: (r: OprExportRow) => r.tanggal,
                            },
                            {
                                header: "Kategori Pengeluaran",
                                accessor: (r: OprExportRow) => r.kategori,
                            },
                            {
                                header: "Keterangan Pengeluaran",
                                accessor: (r: OprExportRow) => r.keterangan,
                            },
                            {
                                header: "Nominal (Rp)",
                                accessor: (r: OprExportRow) => r.nominal,
                            },
                        ],
                    },
                ],
                `Laporan_Keuangan_Iuran_${desaName.replace(/\s+/g, "_")}_${bulan}.xlsx`,
            );

            toast.success("Laporan Keuangan Member (.xlsx) berhasil diunduh!");
        } catch (err) {
            console.error("Gagal mengekspor Excel Keuangan Member", err);
            toast.error("Terjadi kesalahan saat membuat file Excel.");
        } finally {
            setDownloading(null);
        }
    }

    // ─────────────────────────────────────────────────────────────
    // 2. EXPORT EXCEL LAPORAN PENJUALAN SAMPAH ANORGANIK
    // ─────────────────────────────────────────────────────────────
    async function exportExcelPenjualanAnorganik() {
        setDownloading("anorganik_excel");
        try {
            const pjParams = new URLSearchParams({ bulan });
            if (selectedDesaId && selectedDesaId !== "all") {
                pjParams.set("desa_id", selectedDesaId);
            }

            const resPj = await fetch(
                `/api/penjualan-anorganik?${pjParams.toString()}`,
            ).then((r) => r.json());
            const pjRows: PenjualanRow[] =
                resPj.ok && Array.isArray(resPj.rows) ? resPj.rows : [];

            if (pjRows.length === 0) {
                toast.error(
                    `Belum ada transaksi penjualan sampah anorganik pada periode ${bulan}.`,
                );
                setDownloading(null);
                return;
            }

            const totalPenjualan = pjRows.reduce(
                (acc, r) => acc + Number(r.total_pendapatan || 0),
                0,
            );
            const totalBeratPenjualan = pjRows.reduce(
                (acc, r) => acc + Number(r.berat_kg || 0),
                0,
            );
            const totalDisetor = pjRows
                .filter((r) => r.status_setoran === "sudah_disetor")
                .reduce((acc, r) => acc + Number(r.total_pendapatan || 0), 0);
            const totalBelumDisetor = pjRows
                .filter((r) => r.status_setoran !== "sudah_disetor")
                .reduce((acc, r) => acc + Number(r.total_pendapatan || 0), 0);

            const currentDesaObj = desaList.find(
                (d) => d.id === selectedDesaId,
            );
            const desaName = resolveDesaName([pjRows], currentDesaObj);

            const bulanNama = getNamaBulanIndo(bulan);

            // Sheet 1: Rekapitulasi Penjualan Anorganik
            type RekapPjRow = {
                uraian: string;
                keterangan: string;
                nilai: number | string;
            };
            const rekapPjRows: RekapPjRow[] = [
                {
                    uraian: "LAPORAN REKAPITULASI PENJUALAN SAMPAH ANORGANIK",
                    keterangan: "",
                    nilai: "",
                },
                {
                    uraian: "Wilayah / Unit",
                    keterangan: `TPS3R ${desaName}`,
                    nilai: "",
                },
                { uraian: "Periode Bulan", keterangan: bulanNama, nilai: "" },
                {
                    uraian: "Tanggal Dicetak",
                    keterangan: new Date().toLocaleDateString("id-ID"),
                    nilai: "",
                },
                {
                    uraian: "----------------------------------------",
                    keterangan: "--------------------",
                    nilai: "------------",
                },
                {
                    uraian: "1. Total Frekuensi Transaksi Pengepul",
                    keterangan: `${pjRows.length} Transaksi`,
                    nilai: pjRows.length,
                },
                {
                    uraian: "2. Total Berat Sampah Terjual",
                    keterangan: "Kilogram (kg)",
                    nilai: Math.round(totalBeratPenjualan * 100) / 100,
                },
                {
                    uraian: "3. Total Omset / Pendapatan Penjualan",
                    keterangan: "Pemasukan Kas Penjualan",
                    nilai: totalPenjualan,
                },
                {
                    uraian: "----------------------------------------",
                    keterangan: "--------------------",
                    nilai: "------------",
                },
                {
                    uraian: "4. Status Setoran: Sudah Disetor ke BUMDes",
                    keterangan: "Telah Diserahkan",
                    nilai: totalDisetor,
                },
                {
                    uraian: "5. Status Setoran: Belum Disetor ke BUMDes",
                    keterangan: "Menunggu Penyetoran",
                    nilai: totalBelumDisetor,
                },
            ];

            // Sheet 2: Rincian Transaksi Penjualan ke Pengepul
            type PenjualanExportRow = {
                no: number;
                tanggal: string;
                pembeli: string;
                kontak: string;
                kategori: string;
                berat_kg: number;
                harga_per_kg: number;
                total: number;
                status_setoran: string;
                tanggal_setor: string;
                catatan: string;
            };
            const pjExportRows: PenjualanExportRow[] = pjRows.map((r, i) => ({
                no: i + 1,
                tanggal: r.tanggal,
                pembeli: r.pembeli,
                kontak: r.kontak_pembeli || "-",
                kategori: r.kategori,
                berat_kg: Number(r.berat_kg || 0),
                harga_per_kg: Number(r.harga_per_kg || 0),
                total: Number(r.total_pendapatan || 0),
                status_setoran:
                    r.status_setoran === "sudah_disetor"
                        ? "Sudah Disetor"
                        : "Belum Disetor",
                tanggal_setor: r.tanggal_setor || "-",
                catatan: r.catatan || "-",
            }));

            // Sheet 3: Rekap Penjualan per Kategori Sampah
            const kategoriList = [
                "Plastik",
                "Kardus",
                "Kaca",
                "Besi",
                "Medis",
                "Lainnya",
            ];
            type KategoriSummaryRow = {
                no: number;
                kategori: string;
                transaksi: number;
                total_berat_kg: number;
                total_nilai: number;
            };
            const kategoriSummaryRows: KategoriSummaryRow[] = kategoriList
                .map((kat, idx) => {
                    const matched = pjRows.filter(
                        (r) => r.kategori.toLowerCase() === kat.toLowerCase(),
                    );
                    const totalKg = matched.reduce(
                        (sum, r) => sum + Number(r.berat_kg || 0),
                        0,
                    );
                    const totalNilai = matched.reduce(
                        (sum, r) => sum + Number(r.total_pendapatan || 0),
                        0,
                    );
                    return {
                        no: idx + 1,
                        kategori: kat,
                        transaksi: matched.length,
                        total_berat_kg: Math.round(totalKg * 100) / 100,
                        total_nilai: totalNilai,
                    };
                })
                .filter((k) => k.transaksi > 0 || pjRows.length === 0);

            await exportWorkbook(
                [
                    {
                        sheetName: "Rekap Penjualan",
                        rows: rekapPjRows,
                        columns: [
                            {
                                header: "Uraian / Komponen",
                                accessor: (r: RekapPjRow) => r.uraian,
                            },
                            {
                                header: "Keterangan",
                                accessor: (r: RekapPjRow) => r.keterangan,
                            },
                            {
                                header: "Nilai / Jumlah",
                                accessor: (r: RekapPjRow) => r.nilai,
                            },
                        ],
                    },
                    {
                        sheetName: "Rincian Transaksi Pengepul",
                        rows: pjExportRows,
                        columns: [
                            {
                                header: "No",
                                accessor: (r: PenjualanExportRow) => r.no,
                            },
                            {
                                header: "Tanggal Penjualan",
                                accessor: (r: PenjualanExportRow) => r.tanggal,
                            },
                            {
                                header: "Nama Pengepul (Pembeli)",
                                accessor: (r: PenjualanExportRow) => r.pembeli,
                            },
                            {
                                header: "No. HP / Kontak",
                                accessor: (r: PenjualanExportRow) => r.kontak,
                            },
                            {
                                header: "Kategori Sampah",
                                accessor: (r: PenjualanExportRow) => r.kategori,
                            },
                            {
                                header: "Berat (kg)",
                                accessor: (r: PenjualanExportRow) => r.berat_kg,
                            },
                            {
                                header: "Harga / kg (Rp)",
                                accessor: (r: PenjualanExportRow) =>
                                    r.harga_per_kg,
                            },
                            {
                                header: "Total Pendapatan (Rp)",
                                accessor: (r: PenjualanExportRow) => r.total,
                            },
                            {
                                header: "Status Setoran BUMDes",
                                accessor: (r: PenjualanExportRow) =>
                                    r.status_setoran,
                            },
                            {
                                header: "Tanggal Setor",
                                accessor: (r: PenjualanExportRow) =>
                                    r.tanggal_setor,
                            },
                            {
                                header: "Catatan",
                                accessor: (r: PenjualanExportRow) => r.catatan,
                            },
                        ],
                    },
                    {
                        sheetName: "Rekap Kategori Sampah",
                        rows: kategoriSummaryRows,
                        columns: [
                            {
                                header: "No",
                                accessor: (r: KategoriSummaryRow) => r.no,
                            },
                            {
                                header: "Kategori Sampah",
                                accessor: (r: KategoriSummaryRow) => r.kategori,
                            },
                            {
                                header: "Jumlah Transaksi",
                                accessor: (r: KategoriSummaryRow) =>
                                    r.transaksi,
                            },
                            {
                                header: "Total Berat Terjual (kg)",
                                accessor: (r: KategoriSummaryRow) =>
                                    r.total_berat_kg,
                            },
                            {
                                header: "Total Nilai Penjualan (Rp)",
                                accessor: (r: KategoriSummaryRow) =>
                                    r.total_nilai,
                            },
                        ],
                    },
                ],
                `Laporan_Penjualan_Anorganik_${desaName.replace(/\s+/g, "_")}_${bulan}.xlsx`,
            );

            toast.success(
                "Laporan Penjualan Anorganik (.xlsx) berhasil diunduh!",
            );
        } catch (err) {
            console.error("Gagal mengekspor Excel Penjualan Anorganik", err);
            toast.error("Terjadi kesalahan saat membuat file Excel.");
        } finally {
            setDownloading(null);
        }
    }

    const selectedDesaObj = desaList.find((d) => d.id === selectedDesaId);
    const isDusunView =
        selectedDesaId !== "all" &&
        Boolean(
            selectedDesaObj &&
            !selectedDesaObj.nama.toLowerCase().includes("dukun"),
        );

    return (
        <FormShell title="Cetak Laporan" activeLabel="Laporan">
            <main
                className="content-wrap"
                style={{ maxWidth: "1050px", paddingBottom: "60px" }}
            >
                <div className="page-heading" style={{ marginBottom: "28px" }}>
                    <div>
                        <p className="eyebrow">
                            <span className="live-dot" /> PELAPORAN & KEUANGAN
                        </p>
                        <h1>Cetak Laporan Keuangan</h1>
                        <p className="heading-copy">
                            Unduh laporan terpisah untuk penerimaan iuran member
                            & operasional, serta laporan transaksi penjualan
                            sampah anorganik dalam format Excel resmi (.xlsx)
                            multi-sheet siap serah terima ke BUMDes.
                        </p>
                    </div>
                </div>

                {/* Toolbar Periode & Filter Desa */}
                <div
                    style={{
                        background: "white",
                        padding: "20px 24px",
                        borderRadius: "16px",
                        border: "1px solid var(--line)",
                        marginBottom: "28px",
                        display: "flex",
                        alignItems: "center",
                        gap: "20px",
                        flexWrap: "wrap",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.02)",
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "6px",
                        }}
                    >
                        <span
                            style={{
                                fontSize: "12px",
                                fontWeight: 700,
                                color: "#4a5a55",
                            }}
                        >
                            Pilih Periode Bulan
                        </span>
                        <div
                            style={{
                                position: "relative",
                                width: "fit-content",
                            }}
                        >
                            <Calendar
                                size={16}
                                color="#a0aaa6"
                                style={{
                                    position: "absolute",
                                    left: "14px",
                                    top: "50%",
                                    transform: "translateY(-50%)",
                                }}
                            />
                            <input
                                type="month"
                                value={bulan}
                                onChange={(e) => setBulan(e.target.value)}
                                style={{
                                    padding: "10px 14px 10px 40px",
                                    borderRadius: "10px",
                                    border: "1px solid var(--line)",
                                    fontSize: "13px",
                                    outline: "none",
                                    background: "#fbfdfb",
                                }}
                            />
                        </div>
                    </div>
                </div>

                {/* ── CARD 0: LAPORAN SAMPAH (PENGUMPULAN) ── */}
                <div
                    style={{
                        background:
                            "linear-gradient(135deg, #ffffff 0%, #fff7ed 100%)",
                        borderRadius: "20px",
                        border: "2px solid #fed7aa",
                        padding: "28px",
                        marginBottom: "28px",
                        boxShadow: "0 10px 30px rgba(234, 88, 12, 0.08)",
                        position: "relative",
                        overflow: "hidden",
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            gap: "20px",
                            flexWrap: "wrap",
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                gap: "16px",
                                alignItems: "flex-start",
                            }}
                        >
                            <div
                                style={{
                                    width: "48px",
                                    height: "48px",
                                    borderRadius: "14px",
                                    background: "#ea580c",
                                    color: "white",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexShrink: 0,
                                }}
                            >
                                <Truck size={24} />
                            </div>
                            <div>
                                <div
                                    style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "6px",
                                        background: "rgba(234, 88, 12, 0.12)",
                                        color: "#ea580c",
                                        padding: "4px 10px",
                                        borderRadius: "100px",
                                        fontSize: "11px",
                                        fontWeight: 800,
                                        textTransform: "uppercase",
                                        marginBottom: "6px",
                                    }}
                                >
                                    <Truck size={12} /> PENGUMPULAN SAMPAH
                                </div>
                                <h2
                                    style={{
                                        fontSize: "20px",
                                        fontWeight: 800,
                                        color: "#1a2522",
                                        margin: "0 0 6px 0",
                                    }}
                                >
                                    Laporan Sampah{" "}
                                    {isDusunView ? "Dusun" : "Member"}
                                </h2>
                                <p
                                    style={{
                                        fontSize: "14px",
                                        color: "#556b63",
                                        margin: 0,
                                        maxWidth: "600px",
                                        lineHeight: 1.5,
                                    }}
                                >
                                    Menghasilkan file Excel (.xlsx) berisi
                                    matriks harian setoran sampah (
                                    {isDusunView ? "per dusun" : "per member"})
                                    dan riwayat rincian transaksi pengumpulan
                                    sampah untuk periode terpilih.
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={exportExcelLaporanSampah}
                            disabled={downloading !== null}
                            className="hover-lift"
                            style={{
                                background: "#ea580c",
                                color: "white",
                                border: "none",
                                padding: "13px 24px",
                                borderRadius: "100px",
                                fontSize: "13.5px",
                                fontWeight: 700,
                                cursor:
                                    downloading !== null
                                        ? "not-allowed"
                                        : "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "10px",
                                boxShadow: "0 6px 18px rgba(234, 88, 12, 0.3)",
                                transition: "transform 0.2s, background 0.2s",
                            }}
                        >
                            <Download size={16} />
                            <span>
                                {downloading === "sampah_excel"
                                    ? "Menyiapkan File..."
                                    : "Unduh Excel Laporan Sampah (.xlsx)"}
                            </span>
                        </button>
                    </div>
                </div>

                {/* ── CARD 1: LAPORAN KEUANGAN MEMBER & OPERASIONAL ── */}
                <div
                    style={{
                        background:
                            "linear-gradient(135deg, #ffffff 0%, #f0fdf9 100%)",
                        borderRadius: "20px",
                        border: "2px solid #a7f3d0",
                        padding: "28px",
                        marginBottom: "28px",
                        boxShadow: "0 10px 30px rgba(11, 143, 130, 0.08)",
                        position: "relative",
                        overflow: "hidden",
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            gap: "20px",
                            flexWrap: "wrap",
                            marginBottom: "20px",
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                gap: "16px",
                                alignItems: "flex-start",
                            }}
                        >
                            <div
                                style={{
                                    width: "48px",
                                    height: "48px",
                                    borderRadius: "14px",
                                    background: "var(--teal)",
                                    color: "white",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexShrink: 0,
                                }}
                            >
                                <FileSpreadsheet size={24} />
                            </div>
                            <div>
                                <div
                                    style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "6px",
                                        background: "rgba(11, 143, 130, 0.12)",
                                        color: "var(--teal)",
                                        padding: "4px 10px",
                                        borderRadius: "100px",
                                        fontSize: "11px",
                                        fontWeight: 800,
                                        textTransform: "uppercase",
                                        marginBottom: "6px",
                                    }}
                                >
                                    <Landmark size={12} /> IURAN & OPERASIONAL
                                    BUMDES
                                </div>
                                <h2
                                    style={{
                                        fontSize: "20px",
                                        fontWeight: 800,
                                        color: "#1a2522",
                                        margin: "0 0 6px 0",
                                    }}
                                >
                                    Laporan Keuangan{" "}
                                    {isDusunView
                                        ? "Iuran Dusun"
                                        : "Iuran Member"}{" "}
                                    & Operasional
                                </h2>
                                <p
                                    style={{
                                        fontSize: "14px",
                                        color: "#556b63",
                                        margin: 0,
                                        maxWidth: "600px",
                                        lineHeight: 1.5,
                                    }}
                                >
                                    Menghasilkan file Excel (.xlsx) terpisah
                                    berisi rekap penerimaan iuran warga (
                                    {isDusunView ? "per dusun" : "per member"}),
                                    rincian pengeluaran operasional TPS3R (BBM,
                                    listrik, dapur), dan sisa setoran bersih ke
                                    BUMDes.
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={exportExcelKeuanganMember}
                            disabled={downloading !== null}
                            className="hover-lift"
                            style={{
                                background: "var(--teal)",
                                color: "white",
                                border: "none",
                                padding: "13px 24px",
                                borderRadius: "100px",
                                fontSize: "13.5px",
                                fontWeight: 700,
                                cursor:
                                    downloading !== null
                                        ? "not-allowed"
                                        : "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "10px",
                                boxShadow: "0 6px 18px rgba(11, 143, 130, 0.3)",
                                transition: "transform 0.2s, background 0.2s",
                            }}
                        >
                            <Download size={16} />
                            <span>
                                {downloading === "member_excel"
                                    ? "Menyiapkan File..."
                                    : `Unduh Excel Keuangan ${isDusunView ? "Dusun" : "Member"} (.xlsx)`}
                            </span>
                        </button>
                    </div>

                    {/* Preview Ringkasan Angka Keuangan Member */}
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns:
                                "repeat(auto-fit, minmax(200px, 1fr))",
                            gap: "14px",
                            background: "white",
                            padding: "18px 20px",
                            borderRadius: "14px",
                            border: "1px solid #d1fae5",
                        }}
                    >
                        <div>
                            <span
                                style={{
                                    fontSize: "11px",
                                    fontWeight: 700,
                                    color: "#64748b",
                                    textTransform: "uppercase",
                                }}
                            >
                                Iuran Terkumpul
                            </span>
                            <div
                                style={{
                                    fontSize: "19px",
                                    fontWeight: 800,
                                    color: "var(--teal)",
                                    marginTop: "2px",
                                }}
                            >
                                Rp {summary.totalIuran.toLocaleString("id-ID")}
                            </div>
                            <span
                                style={{ fontSize: "11px", color: "#94a3b8" }}
                            >
                                {summary.memberCount}{" "}
                                {isDusunView
                                    ? "dusun terdata bayar"
                                    : "member terdata bayar"}
                            </span>
                        </div>
                        <div>
                            <span
                                style={{
                                    fontSize: "11px",
                                    fontWeight: 700,
                                    color: "#dc2626",
                                    textTransform: "uppercase",
                                }}
                            >
                                Biaya Operasional TPS3R
                            </span>
                            <div
                                style={{
                                    fontSize: "19px",
                                    fontWeight: 800,
                                    color: "#dc2626",
                                    marginTop: "2px",
                                }}
                            >
                                - Rp{" "}
                                {summary.totalOperasional.toLocaleString(
                                    "id-ID",
                                )}
                            </div>
                            <span
                                style={{ fontSize: "11px", color: "#94a3b8" }}
                            >
                                BBM, listrik, dapur, perawatan
                            </span>
                        </div>
                        <div
                            style={{
                                borderLeft: "2px dashed #e2e8f0",
                                paddingLeft: "14px",
                            }}
                        >
                            <span
                                style={{
                                    fontSize: "11px",
                                    fontWeight: 700,
                                    color: "#0d9488",
                                    textTransform: "uppercase",
                                }}
                            >
                                Sisa Setoran Iuran ke BUMDes
                            </span>
                            <div
                                style={{
                                    fontSize: "21px",
                                    fontWeight: 900,
                                    color:
                                        summary.netIuranBUMDes >= 0
                                            ? "#0f766e"
                                            : "#dc2626",
                                    marginTop: "2px",
                                }}
                            >
                                = Rp{" "}
                                {summary.netIuranBUMDes.toLocaleString("id-ID")}
                            </div>
                            <span
                                style={{
                                    fontSize: "11px",
                                    color:
                                        summary.netIuranBUMDes >= 0
                                            ? "#16a34a"
                                            : "#dc2626",
                                    fontWeight: 600,
                                }}
                            >
                                {summary.netIuranBUMDes >= 0
                                    ? "Surplus kas siap setor"
                                    : "Defisit biaya operasional"}
                            </span>
                        </div>
                    </div>
                </div>

                {/* ── CARD 2: LAPORAN KEUANGAN PENJUALAN SAMPAH ANORGANIK ── */}
                <div
                    style={{
                        background:
                            "linear-gradient(135deg, #ffffff 0%, #eff6ff 100%)",
                        borderRadius: "20px",
                        border: "2px solid #bfdbfe",
                        padding: "28px",
                        marginBottom: "32px",
                        boxShadow: "0 10px 30px rgba(37, 99, 235, 0.08)",
                        position: "relative",
                        overflow: "hidden",
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            gap: "20px",
                            flexWrap: "wrap",
                            marginBottom: "20px",
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                gap: "16px",
                                alignItems: "flex-start",
                            }}
                        >
                            <div
                                style={{
                                    width: "48px",
                                    height: "48px",
                                    borderRadius: "14px",
                                    background: "#2563eb",
                                    color: "white",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexShrink: 0,
                                }}
                            >
                                <Scale size={24} />
                            </div>
                            <div>
                                <div
                                    style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "6px",
                                        background: "rgba(37, 99, 235, 0.12)",
                                        color: "#2563eb",
                                        padding: "4px 10px",
                                        borderRadius: "100px",
                                        fontSize: "11px",
                                        fontWeight: 800,
                                        textTransform: "uppercase",
                                        marginBottom: "6px",
                                    }}
                                >
                                    <TrendingUp size={12} /> PENJUALAN SAMPAH
                                    ANORGANIK
                                </div>
                                <h2
                                    style={{
                                        fontSize: "20px",
                                        fontWeight: 800,
                                        color: "#1e293b",
                                        margin: "0 0 6px 0",
                                    }}
                                >
                                    Laporan Keuangan Penjualan Sampah Anorganik
                                </h2>
                                <p
                                    style={{
                                        fontSize: "14px",
                                        color: "#475569",
                                        margin: 0,
                                        maxWidth: "600px",
                                        lineHeight: 1.5,
                                    }}
                                >
                                    Menghasilkan file Excel (.xlsx) terpisah
                                    untuk rekap transaksi penjualan sampah
                                    anorganik (plastik, kardus, kaca, besi, dll)
                                    ke pengepul, volume berat tonase (kg), omset
                                    penerimaan, dan status setoran ke BUMDes.
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={exportExcelPenjualanAnorganik}
                            disabled={downloading !== null}
                            className="hover-lift"
                            style={{
                                background: "#2563eb",
                                color: "white",
                                border: "none",
                                padding: "13px 24px",
                                borderRadius: "100px",
                                fontSize: "13.5px",
                                fontWeight: 700,
                                cursor:
                                    downloading !== null
                                        ? "not-allowed"
                                        : "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "10px",
                                boxShadow: "0 6px 18px rgba(37, 99, 235, 0.3)",
                                transition: "transform 0.2s, background 0.2s",
                            }}
                        >
                            <Download size={16} />
                            <span>
                                {downloading === "anorganik_excel"
                                    ? "Menyiapkan File..."
                                    : "Unduh Excel Penjualan Anorganik (.xlsx)"}
                            </span>
                        </button>
                    </div>

                    {/* Preview Ringkasan Angka Penjualan Anorganik */}
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns:
                                "repeat(auto-fit, minmax(180px, 1fr))",
                            gap: "14px",
                            background: "white",
                            padding: "18px 20px",
                            borderRadius: "14px",
                            border: "1px solid #dbeafe",
                        }}
                    >
                        <div>
                            <span
                                style={{
                                    fontSize: "11px",
                                    fontWeight: 700,
                                    color: "#64748b",
                                    textTransform: "uppercase",
                                }}
                            >
                                Total Omset Penjualan
                            </span>
                            <div
                                style={{
                                    fontSize: "19px",
                                    fontWeight: 800,
                                    color: "#2563eb",
                                    marginTop: "2px",
                                }}
                            >
                                Rp{" "}
                                {summary.totalPenjualan.toLocaleString("id-ID")}
                            </div>
                            <span
                                style={{ fontSize: "11px", color: "#94a3b8" }}
                            >
                                {summary.penjualanCount} transaksi pengepul
                            </span>
                        </div>
                        <div>
                            <span
                                style={{
                                    fontSize: "11px",
                                    fontWeight: 700,
                                    color: "#64748b",
                                    textTransform: "uppercase",
                                }}
                            >
                                Volume Sampah Terjual
                            </span>
                            <div
                                style={{
                                    fontSize: "19px",
                                    fontWeight: 800,
                                    color: "#0f172a",
                                    marginTop: "2px",
                                }}
                            >
                                {summary.totalBeratPenjualan.toLocaleString(
                                    "id-ID",
                                )}{" "}
                                kg
                            </div>
                            <span
                                style={{ fontSize: "11px", color: "#94a3b8" }}
                            >
                                Total material terpilah terjual
                            </span>
                        </div>
                        <div>
                            <span
                                style={{
                                    fontSize: "11px",
                                    fontWeight: 700,
                                    color: "#16a34a",
                                    textTransform: "uppercase",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "4px",
                                }}
                            >
                                <CheckCircle2 size={12} /> Sudah Disetor BUMDes
                            </span>
                            <div
                                style={{
                                    fontSize: "19px",
                                    fontWeight: 800,
                                    color: "#16a34a",
                                    marginTop: "2px",
                                }}
                            >
                                Rp{" "}
                                {summary.totalPenjualanDisetor.toLocaleString(
                                    "id-ID",
                                )}
                            </div>
                            <span
                                style={{ fontSize: "11px", color: "#86efac" }}
                            >
                                Telah diserahkan ke kas BUMDes
                            </span>
                        </div>
                        <div
                            style={{
                                borderLeft: "2px dashed #e2e8f0",
                                paddingLeft: "14px",
                            }}
                        >
                            <span
                                style={{
                                    fontSize: "11px",
                                    fontWeight: 700,
                                    color: "#d97706",
                                    textTransform: "uppercase",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "4px",
                                }}
                            >
                                <Clock size={12} /> Belum Disetor BUMDes
                            </span>
                            <div
                                style={{
                                    fontSize: "19px",
                                    fontWeight: 800,
                                    color: "#d97706",
                                    marginTop: "2px",
                                }}
                            >
                                Rp{" "}
                                {summary.totalPenjualanBelumDisetor.toLocaleString(
                                    "id-ID",
                                )}
                            </div>
                            <span
                                style={{ fontSize: "11px", color: "#f59e0b" }}
                            >
                                Menunggu transfer / penyerahan
                            </span>
                        </div>
                    </div>
                </div>
            </main>
        </FormShell>
    );
}
