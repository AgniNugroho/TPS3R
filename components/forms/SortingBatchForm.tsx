"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import {
    ArrowLeft,
    CheckCircle2,
    Loader2,
    Package,
    AlertTriangle,
    ChevronRight,
    Scale,
    AlertCircle,
} from "lucide-react";
import { showErrorToast, showSuccessToast } from "@/components/ui/Toast";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type IncomingRow = {
    id: string;
    tanggal: string;
    asal_sampah: string;
    total_berat_kg: number;
};

type SortingRecord = {
    sampah_masuk_id: string;
    organik_kg?: number;
    anorganik_kg?: number;
    residu_kg?: number;
    kardus_kg?: number;
    kaca_kg?: number;
    besi_kg?: number;
    anorganik_lainnya_kg?: number;
};

type SortedBreakdown = {
    organik_kg: number;
    anorganik_kg: number;
    residu_kg: number;
    kardus_kg: number;
    kaca_kg: number;
    besi_kg: number;
    anorganik_lainnya_kg: number;
};

const emptyBreakdown: SortedBreakdown = {
    organik_kg: 0,
    anorganik_kg: 0,
    residu_kg: 0,
    kardus_kg: 0,
    kaca_kg: 0,
    besi_kg: 0,
    anorganik_lainnya_kg: 0,
};

type EnrichedRow = IncomingRow & {
    totalSorted: number;
    remaining: number;
    isComplete: boolean;
    previouslySorted: SortedBreakdown;
};

type CardWeights = {
    organik_kg: string;
    residu_kg: string;
    kardus_kg: string;
    kaca_kg: string;
    besi_kg: string;
    anorganik_lainnya_kg: string;
    keterangan: string;
};

const emptyWeights: CardWeights = {
    organik_kg: "",
    residu_kg: "",
    kardus_kg: "",
    kaca_kg: "",
    besi_kg: "",
    anorganik_lainnya_kg: "",
    keterangan: "",
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function num(v: string) {
    const n = Number(v || 0);
    return Number.isFinite(n) && n >= 0 ? n : 0;
}

function weightTotal(w: CardWeights) {
    return (
        num(w.organik_kg) +
        num(w.residu_kg) +
        num(w.kardus_kg) +
        num(w.kaca_kg) +
        num(w.besi_kg) +
        num(w.anorganik_lainnya_kg)
    );
}

function anorganikTotal(w: CardWeights) {
    return (
        num(w.kardus_kg) +
        num(w.kaca_kg) +
        num(w.besi_kg) +
        num(w.anorganik_lainnya_kg)
    );
}

function fmtDate(iso: string) {
    if (!iso) return "-";
    try {
        const d = new Date(iso + "T00:00:00");
        return new Intl.DateTimeFormat("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric",
        }).format(d);
    } catch {
        return iso;
    }
}

function fmtDateShort(iso: string) {
    return fmtDate(iso);
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function SortingBatchForm() {
    const [step, setStep] = useState<"select" | "form">("select");
    const [loading, setLoading] = useState(true);

    const [allRows, setAllRows] = useState<EnrichedRow[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    // Form state
    const [weights, setWeights] = useState<CardWeights>({ ...emptyWeights });
    const [submitting, setSubmitting] = useState(false);

    /* ---- Fetch data ---- */
    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [incomingRes, sortingRes] = await Promise.all([
                fetch("/api/sampah-masuk").then((r) => r.json()),
                fetch("/api/pemilahan").then((r) => r.json()),
            ]);
            if (!incomingRes.ok || !sortingRes.ok) {
                showErrorToast(
                    incomingRes.error ||
                        sortingRes.error ||
                        "Data gagal dimuat.",
                );
                return;
            }

            const sortedMap = new Map<string, SortedBreakdown>();
            (sortingRes.rows ?? []).forEach((row: SortingRecord) => {
                const existing = sortedMap.get(row.sampah_masuk_id) || {
                    ...emptyBreakdown,
                };
                sortedMap.set(row.sampah_masuk_id, {
                    organik_kg:
                        existing.organik_kg + Number(row.organik_kg || 0),
                    anorganik_kg:
                        existing.anorganik_kg + Number(row.anorganik_kg || 0),
                    residu_kg: existing.residu_kg + Number(row.residu_kg || 0),
                    kardus_kg: existing.kardus_kg + Number(row.kardus_kg || 0),
                    kaca_kg: existing.kaca_kg + Number(row.kaca_kg || 0),
                    besi_kg: existing.besi_kg + Number(row.besi_kg || 0),
                    anorganik_lainnya_kg:
                        existing.anorganik_lainnya_kg +
                        Number(row.anorganik_lainnya_kg || 0),
                });
            });

            const enriched: EnrichedRow[] = (incomingRes.rows ?? [])
                .map((row: IncomingRow) => {
                    const sorted = sortedMap.get(row.id) || {
                        ...emptyBreakdown,
                    };
                    const totalSorted =
                        sorted.organik_kg +
                        sorted.anorganik_kg +
                        sorted.residu_kg;
                    const remaining = Math.max(
                        0,
                        row.total_berat_kg - totalSorted,
                    );
                    return {
                        ...row,
                        totalSorted,
                        remaining,
                        isComplete: remaining <= 0.005,
                        previouslySorted: sorted,
                    };
                })
                .sort((a: EnrichedRow, b: EnrichedRow) => {
                    if (a.isComplete !== b.isComplete)
                        return a.isComplete ? 1 : -1;
                    return b.tanggal.localeCompare(a.tanggal);
                });

            setAllRows(enriched);
        } catch (e) {
            showErrorToast(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    /* ---- Derived State for Form ---- */
    const unsortedRows = allRows.filter((r) => !r.isComplete);
    const completedRows = allRows.filter((r) => r.isComplete);
    const activeRow = allRows.find((r) => r.id === selectedId) ?? null;

    const inputTotal = weightTotal(weights);
    const target = activeRow?.remaining ?? 0;
    const totalIncoming = activeRow?.total_berat_kg ?? 0;
    const prevSorted = activeRow?.totalSorted ?? 0;
    const totalCumulative = prevSorted + inputTotal;
    const overLimit = inputTotal > target + 0.01;
    const isExact = Math.abs(inputTotal - target) < 0.01 && target > 0;
    const isValidSubmit = inputTotal > 0 && !overLimit;

    const prev = activeRow?.previouslySorted ?? emptyBreakdown;
    const totOrganik = prev.organik_kg + num(weights.organik_kg);
    const totResidu = prev.residu_kg + num(weights.residu_kg);
    const totKardus = prev.kardus_kg + num(weights.kardus_kg);
    const totKaca = prev.kaca_kg + num(weights.kaca_kg);
    const totBesi = prev.besi_kg + num(weights.besi_kg);
    const totLainnya =
        prev.anorganik_lainnya_kg + num(weights.anorganik_lainnya_kg);

    // Cumulative progress out of total incoming waste
    const cumulativeRatio =
        totalIncoming > 0 ? totalCumulative / totalIncoming : 0;
    const progressPercent = Math.min(
        Math.max(cumulativeRatio * 100, 0),
        100,
    );

    // Dynamic progress bar color
    const progressBarColor = overLimit
        ? "#ef4444"
        : totalCumulative >= totalIncoming - 0.01
          ? "var(--teal)"
          : "var(--amber)";

    /* ---- Handlers ---- */
    function selectAndProceed(id: string) {
        setSelectedId(id);
        setWeights({ ...emptyWeights });
        setStep("form");
    }

    function goBack() {
        setSelectedId(null);
        setWeights({ ...emptyWeights });
        setStep("select");
    }

    function updateWeight(key: keyof CardWeights, value: string) {
        setWeights((prev) => ({ ...prev, [key]: value }));
    }

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        if (!activeRow) return;

        if (!isValidSubmit) {
            if (inputTotal <= 0) {
                showErrorToast("Harap masukkan berat pemilahan (minimal > 0 kg).");
            } else if (overLimit) {
                showErrorToast(
                    `Total pemilahan (${inputTotal.toFixed(2)} kg) melebihi sisa kuota ${target.toFixed(2)} kg.`,
                );
            }
            return;
        }

        setSubmitting(true);
        const payload = {
            sampah_masuk_id: activeRow.id,
            tanggal: activeRow.tanggal,
            organik_kg: num(weights.organik_kg),
            anorganik_kg: anorganikTotal(weights),
            residu_kg: num(weights.residu_kg),
            kardus_kg: num(weights.kardus_kg),
            kaca_kg: num(weights.kaca_kg),
            besi_kg: num(weights.besi_kg),
            anorganik_lainnya_kg: num(weights.anorganik_lainnya_kg),
            keterangan: weights.keterangan || "",
        };

        try {
            const res = await fetch("/api/pemilahan", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const result = await res.json();
            if (result.ok) {
                showSuccessToast(
                    `Pemilahan ${activeRow.asal_sampah} (+${inputTotal.toFixed(2)} kg) berhasil disimpan.`,
                );
                goBack();
                await loadData();
            } else {
                showErrorToast(
                    result.error || "Gagal menyimpan data pemilahan.",
                );
            }
        } catch {
            showErrorToast("Gagal menyimpan data pemilahan.");
        } finally {
            setSubmitting(false);
        }
    }

    /* ================================================================ */
    /*  Step 1: Select ONE item (No batching)                           */
    /* ================================================================ */
    if (step === "select") {
        return (
            <div className="sorting-select-step">
                {/* Summary */}
                <div className="sorting-batch-summary">
                    <div className="sorting-summary-card">
                        <span className="sorting-summary-value">
                            {unsortedRows.length}
                        </span>
                        <span className="sorting-summary-label">
                            Belum dipilah
                        </span>
                    </div>
                    <div className="sorting-summary-card completed">
                        <span className="sorting-summary-value">
                            {completedRows.length}
                        </span>
                        <span className="sorting-summary-label">Selesai</span>
                    </div>
                    <div className="sorting-summary-card">
                        <span className="sorting-summary-value">
                            {unsortedRows
                                .reduce((s, r) => s + r.remaining, 0)
                                .toFixed(1)}{" "}
                            kg
                        </span>
                        <span className="sorting-summary-label">
                            Sisa total kuota
                        </span>
                    </div>
                </div>

                {loading && (
                    <div className="sorting-empty">
                        <Loader2 size={24} className="sorting-spinner" />
                        <p>Memuat data sampah masuk...</p>
                    </div>
                )}

                {!loading && allRows.length === 0 && (
                    <div className="sorting-empty">
                        <Package size={36} />
                        <p>Belum ada data sampah masuk.</p>
                    </div>
                )}

                {/* Unsorted items - Click to process one item */}
                {!loading && unsortedRows.length > 0 && (
                    <>
                        <div className="sorting-section-header">
                            <p className="sorting-select-hint">
                                Pilih <strong>satu</strong> sampah masuk yang ingin dipilah:
                            </p>
                        </div>
                        <div className="sorting-select-list">
                            {unsortedRows.map((row) => {
                                const rowRatio =
                                    row.total_berat_kg > 0
                                        ? row.totalSorted / row.total_berat_kg
                                        : 0;
                                return (
                                    <button
                                        key={row.id}
                                        type="button"
                                        className="sorting-select-item"
                                        onClick={() => selectAndProceed(row.id)}
                                        title={`Klik untuk memilah sampah dari ${row.asal_sampah}`}
                                    >
                                        <div className="sorting-select-item-body">
                                            <div className="sorting-select-item-top">
                                                <div className="sorting-select-item-title-wrap">
                                                    <span className="sorting-select-item-origin">
                                                        {row.asal_sampah}
                                                    </span>
                                                    <span className="sorting-select-item-date">
                                                        {fmtDateShort(row.tanggal)}
                                                    </span>
                                                </div>
                                                <span className="sorting-select-item-badge">
                                                    Kuota: {row.remaining.toFixed(1)} kg
                                                </span>
                                            </div>

                                            <div className="sorting-progress">
                                                <div
                                                    className="sorting-progress-fill"
                                                    style={{
                                                        width: `${Math.min(rowRatio * 100, 100)}%`,
                                                        background:
                                                            rowRatio >= 0.7
                                                                ? "var(--amber)"
                                                                : "var(--teal)",
                                                    }}
                                                />
                                            </div>

                                            <div className="sorting-select-item-meta">
                                                <span>
                                                    {row.totalSorted.toFixed(1)} / {row.total_berat_kg.toFixed(1)} kg terpilah
                                                </span>
                                                <span className="sorting-select-item-remaining">
                                                    Sisa kuota: {row.remaining.toFixed(1)} kg
                                                </span>
                                            </div>
                                        </div>
                                        <div className="sorting-select-action-cue">
                                            <span>Pilah</span>
                                            <ChevronRight size={16} />
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </>
                )}

                {/* Completed section */}
                {!loading && completedRows.length > 0 && (
                    <div className="sorting-completed-section">
                        <span className="sorting-group-label">
                            Sudah selesai dipilah
                        </span>
                        <div className="sorting-select-list">
                            {completedRows.map((row) => (
                                <div
                                    key={row.id}
                                    className="sorting-select-item completed"
                                >
                                    <CheckCircle2
                                        size={20}
                                        className="sorting-complete-icon"
                                    />
                                    <div className="sorting-select-item-body">
                                        <div className="sorting-select-item-top">
                                            <strong>{row.asal_sampah}</strong>
                                            <span className="sorting-select-item-date">
                                                {fmtDateShort(row.tanggal)}
                                            </span>
                                        </div>
                                        <div className="sorting-progress">
                                            <div
                                                className="sorting-progress-fill"
                                                style={{
                                                    width: "100%",
                                                    background: "var(--teal)",
                                                }}
                                            />
                                        </div>
                                        <div className="sorting-select-item-meta">
                                            <span>
                                                {row.total_berat_kg.toFixed(1)} / {row.total_berat_kg.toFixed(1)} kg terpilah
                                            </span>
                                            <span className="sorting-badge-complete">
                                                Selesai
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    /* ================================================================ */
    /*  Step 2: Sort single item (Exact Quota & Live Progress Bar)      */
    /* ================================================================ */
    if (!activeRow) {
        goBack();
        return null;
    }

    return (
        <form className="sorting-batch" onSubmit={handleSubmit}>
            {/* Back button */}
            <div className="sorting-batch-header">
                <button
                    type="button"
                    className="secondary-button sorting-back-btn"
                    onClick={goBack}
                >
                    <ArrowLeft size={18} /> Kembali ke Daftar Sampah
                </button>
            </div>

            {/* ---- HERO CAPACITY PROGRESS CARD (Top of the form) ---- */}
            <div
                className={`sorting-hero ${
                    overLimit
                        ? "is-over"
                        : totalCumulative >= totalIncoming - 0.01
                          ? "is-complete"
                          : ""
                }`}
            >
                <div className="sorting-hero-top">
                    <div className="sorting-hero-info">
                        <div className="sorting-hero-badge-row">
                            <span className="sorting-hero-badge">
                                {activeRow.asal_sampah}
                            </span>
                            <span className="sorting-hero-date">
                                {fmtDate(activeRow.tanggal)}
                            </span>
                        </div>
                        <h2 className="sorting-hero-title">
                            Pemilahan Sampah Masuk
                        </h2>
                    </div>

                    <div className="sorting-hero-numbers-wrap">
                        <div className="sorting-hero-numbers">
                            <span className="sorting-hero-current">
                                {totalCumulative.toFixed(2)}
                            </span>
                            <span className="sorting-hero-separator">/</span>
                            <span className="sorting-hero-target">
                                {totalIncoming.toFixed(2)} kg
                            </span>
                        </div>
                        <span
                            className={`sorting-hero-percent ${
                                overLimit
                                    ? "percent-over"
                                    : totalCumulative >= totalIncoming - 0.01
                                      ? "percent-exact"
                                      : ""
                            }`}
                        >
                            {overLimit
                                ? `${((totalCumulative / totalIncoming) * 100).toFixed(0)}% (Melebihi Sisa)`
                                : `${(cumulativeRatio * 100).toFixed(0)}% Terpilah`}
                        </span>
                        <div className="sorting-hero-subinfo">
                            <span>
                                Sebelumnya: <strong>{prevSorted.toFixed(2)} kg</strong>
                            </span>
                            <span className="dot">•</span>
                            <span>
                                Sesi ini: <strong>+{inputTotal.toFixed(2)} kg</strong>
                            </span>
                        </div>
                    </div>
                </div>

                {/* Animated Progress Bar */}
                <div
                    className="sorting-hero-bar"
                    role="progressbar"
                    aria-valuenow={totalCumulative}
                    aria-valuemin={0}
                    aria-valuemax={totalIncoming}
                >
                    <div
                        className="sorting-hero-bar-fill"
                        style={{
                            width: `${progressPercent}%`,
                            background: progressBarColor,
                        }}
                    />
                </div>

                {/* Status and instruction message */}
                <div className="sorting-hero-status">
                    {overLimit && (
                        <div className="sorting-hero-status-msg warning">
                            <AlertTriangle size={15} />
                            <span>
                                <strong>Melebihi sisa kuota!</strong>{" "}
                                Total input kelebihan {(inputTotal - target).toFixed(2)} kg dari sisa yang tersedia ({target.toFixed(2)} kg). Harap kurangi nilai input.
                            </span>
                        </div>
                    )}
                    {!overLimit && isExact && (
                        <div className="sorting-hero-status-msg ready">
                            <CheckCircle2 size={15} />
                            <span>
                                <strong>Sisa kuota {target.toFixed(2)} kg terpenuhi penuh!</strong>{" "}
                                Seluruh sampah masuk ({totalIncoming.toFixed(2)} kg) telah selesai dipilah.
                            </span>
                        </div>
                    )}
                    {!overLimit && !isExact && inputTotal === 0 && (
                        <div className="sorting-hero-status-msg neutral">
                            <Scale size={15} />
                            <span>
                                {prevSorted > 0 ? (
                                    <>
                                        Sebelumnya sudah dipilah <strong>{prevSorted.toFixed(2)} kg</strong>. Sisa kuota yang belum dipilah: <strong>{target.toFixed(2)} kg</strong>. Masukkan berat sampah yang baru dipilah.
                                    </>
                                ) : (
                                    <>
                                        Total target pemilahan: <strong>{target.toFixed(2)} kg</strong>. Masukkan berat sampah pada kolom di bawah.
                                    </>
                                )}
                            </span>
                        </div>
                    )}
                    {!overLimit && !isExact && inputTotal > 0 && (
                        <div className="sorting-hero-status-msg remaining">
                            <AlertCircle size={15} />
                            <span>
                                Input sesi ini: <strong>+{inputTotal.toFixed(2)} kg</strong>. Total terpilah menjadi <strong>{totalCumulative.toFixed(2)} kg</strong> dari <strong>{totalIncoming.toFixed(2)} kg</strong> (Sisa: <strong>{(target - inputTotal).toFixed(2)} kg</strong>).
                            </span>
                        </div>
                    )}
                </div>

            </div>

            {/* ---- REALTIME TOTAL BREAKDOWN CARD ---- */}
            <div className="sorting-prev-history-card">
                <div className="sorting-prev-history-header">
                    <span className="sorting-prev-history-title">
                        Total Hasil Pemilahan Sampah ({totalCumulative.toFixed(2)} kg)
                    </span>
                    <span className="sorting-prev-history-sisa">
                        Sisa kuota: <strong>{Math.max(0, target - inputTotal).toFixed(2)} kg</strong>
                    </span>
                </div>
                <div className="sorting-prev-history-grid">
                    <div
                        className={`sorting-prev-history-item ${
                            num(weights.organik_kg) > 0 ? "has-input" : ""
                        }`}
                    >
                        <span className="sorting-prev-history-label">Organik</span>
                        <span
                            className={`sorting-prev-history-val ${
                                num(weights.organik_kg) > 0 ? "highlight" : ""
                            }`}
                        >
                            {totOrganik.toFixed(2)} kg
                        </span>
                    </div>
                    <div
                        className={`sorting-prev-history-item ${
                            num(weights.residu_kg) > 0 ? "has-input" : ""
                        }`}
                    >
                        <span className="sorting-prev-history-label">Residu</span>
                        <span
                            className={`sorting-prev-history-val ${
                                num(weights.residu_kg) > 0 ? "highlight" : ""
                            }`}
                        >
                            {totResidu.toFixed(2)} kg
                        </span>
                    </div>
                    <div
                        className={`sorting-prev-history-item ${
                            num(weights.kardus_kg) > 0 ? "has-input" : ""
                        }`}
                    >
                        <span className="sorting-prev-history-label">Kardus</span>
                        <span
                            className={`sorting-prev-history-val ${
                                num(weights.kardus_kg) > 0 ? "highlight" : ""
                            }`}
                        >
                            {totKardus.toFixed(2)} kg
                        </span>
                    </div>
                    <div
                        className={`sorting-prev-history-item ${
                            num(weights.kaca_kg) > 0 ? "has-input" : ""
                        }`}
                    >
                        <span className="sorting-prev-history-label">Kaca</span>
                        <span
                            className={`sorting-prev-history-val ${
                                num(weights.kaca_kg) > 0 ? "highlight" : ""
                            }`}
                        >
                            {totKaca.toFixed(2)} kg
                        </span>
                    </div>
                    <div
                        className={`sorting-prev-history-item ${
                            num(weights.besi_kg) > 0 ? "has-input" : ""
                        }`}
                    >
                        <span className="sorting-prev-history-label">Besi</span>
                        <span
                            className={`sorting-prev-history-val ${
                                num(weights.besi_kg) > 0 ? "highlight" : ""
                            }`}
                        >
                            {totBesi.toFixed(2)} kg
                        </span>
                    </div>
                    <div
                        className={`sorting-prev-history-item ${
                            num(weights.anorganik_lainnya_kg) > 0
                                ? "has-input"
                                : ""
                        }`}
                    >
                        <span className="sorting-prev-history-label">Lainnya</span>
                        <span
                            className={`sorting-prev-history-val ${
                                num(weights.anorganik_lainnya_kg) > 0
                                    ? "highlight"
                                    : ""
                            }`}
                        >
                            {totLainnya.toFixed(2)} kg
                        </span>
                    </div>
                </div>
            </div>

            {/* ---- INPUT FIELDS CARD ---- */}
            <div className={`sorting-card ${overLimit ? "over-limit" : ""}`}>
                <div className="sorting-card-body" style={{ borderTop: "none" }}>
                    <div className="sorting-inputs">
                        <label>
                            <div className="sorting-input-header">
                                <span>Organik (kg)</span>
                                {activeRow.previouslySorted.organik_kg > 0 && (
                                    <span className="sorting-prev-badge">
                                        Sudah: <strong>{activeRow.previouslySorted.organik_kg.toFixed(2)} kg</strong>
                                        {num(weights.organik_kg) > 0 && (
                                            <span className="sorting-total-badge">
                                                {" "}➔ Total: {(activeRow.previouslySorted.organik_kg + num(weights.organik_kg)).toFixed(2)} kg
                                            </span>
                                        )}
                                    </span>
                                )}
                            </div>
                            <input
                                type="number"
                                min="0"
                                max={target}
                                step="0.01"
                                placeholder="0.00"
                                value={weights.organik_kg}
                                onChange={(e) =>
                                    updateWeight("organik_kg", e.target.value)
                                }
                            />
                        </label>
                        <label>
                            <div className="sorting-input-header">
                                <span>Residu (kg)</span>
                                {activeRow.previouslySorted.residu_kg > 0 && (
                                    <span className="sorting-prev-badge">
                                        Sudah: <strong>{activeRow.previouslySorted.residu_kg.toFixed(2)} kg</strong>
                                        {num(weights.residu_kg) > 0 && (
                                            <span className="sorting-total-badge">
                                                {" "}➔ Total: {(activeRow.previouslySorted.residu_kg + num(weights.residu_kg)).toFixed(2)} kg
                                            </span>
                                        )}
                                    </span>
                                )}
                            </div>
                            <input
                                type="number"
                                min="0"
                                max={target}
                                step="0.01"
                                placeholder="0.00"
                                value={weights.residu_kg}
                                onChange={(e) =>
                                    updateWeight("residu_kg", e.target.value)
                                }
                            />
                        </label>
                    </div>

                    <div className="sorting-anorganik-group">
                        <span className="sorting-group-label">Kategori Anorganik</span>
                        <div className="sorting-inputs">
                            <label>
                                <div className="sorting-input-header">
                                    <span>Kardus (kg)</span>
                                    {activeRow.previouslySorted.kardus_kg > 0 && (
                                        <span className="sorting-prev-badge">
                                            Sudah: <strong>{activeRow.previouslySorted.kardus_kg.toFixed(2)} kg</strong>
                                            {num(weights.kardus_kg) > 0 && (
                                                <span className="sorting-total-badge">
                                                    {" "}➔ Total: {(activeRow.previouslySorted.kardus_kg + num(weights.kardus_kg)).toFixed(2)} kg
                                                </span>
                                            )}
                                        </span>
                                    )}
                                </div>
                                <input
                                    type="number"
                                    min="0"
                                    max={target}
                                    step="0.01"
                                    placeholder="0.00"
                                    value={weights.kardus_kg}
                                    onChange={(e) =>
                                        updateWeight(
                                            "kardus_kg",
                                            e.target.value,
                                        )
                                    }
                                />
                            </label>
                            <label>
                                <div className="sorting-input-header">
                                    <span>Kaca (kg)</span>
                                    {activeRow.previouslySorted.kaca_kg > 0 && (
                                        <span className="sorting-prev-badge">
                                            Sudah: <strong>{activeRow.previouslySorted.kaca_kg.toFixed(2)} kg</strong>
                                            {num(weights.kaca_kg) > 0 && (
                                                <span className="sorting-total-badge">
                                                    {" "}➔ Total: {(activeRow.previouslySorted.kaca_kg + num(weights.kaca_kg)).toFixed(2)} kg
                                                </span>
                                            )}
                                        </span>
                                    )}
                                </div>
                                <input
                                    type="number"
                                    min="0"
                                    max={target}
                                    step="0.01"
                                    placeholder="0.00"
                                    value={weights.kaca_kg}
                                    onChange={(e) =>
                                        updateWeight("kaca_kg", e.target.value)
                                    }
                                />
                            </label>
                            <label>
                                <div className="sorting-input-header">
                                    <span>Besi (kg)</span>
                                    {activeRow.previouslySorted.besi_kg > 0 && (
                                        <span className="sorting-prev-badge">
                                            Sudah: <strong>{activeRow.previouslySorted.besi_kg.toFixed(2)} kg</strong>
                                            {num(weights.besi_kg) > 0 && (
                                                <span className="sorting-total-badge">
                                                    {" "}➔ Total: {(activeRow.previouslySorted.besi_kg + num(weights.besi_kg)).toFixed(2)} kg
                                                </span>
                                            )}
                                        </span>
                                    )}
                                </div>
                                <input
                                    type="number"
                                    min="0"
                                    max={target}
                                    step="0.01"
                                    placeholder="0.00"
                                    value={weights.besi_kg}
                                    onChange={(e) =>
                                        updateWeight("besi_kg", e.target.value)
                                    }
                                />
                            </label>
                            <label>
                                <div className="sorting-input-header">
                                    <span>Lainnya (kg)</span>
                                    {activeRow.previouslySorted.anorganik_lainnya_kg > 0 && (
                                        <span className="sorting-prev-badge">
                                            Sudah: <strong>{activeRow.previouslySorted.anorganik_lainnya_kg.toFixed(2)} kg</strong>
                                            {num(weights.anorganik_lainnya_kg) > 0 && (
                                                <span className="sorting-total-badge">
                                                    {" "}➔ Total: {(activeRow.previouslySorted.anorganik_lainnya_kg + num(weights.anorganik_lainnya_kg)).toFixed(2)} kg
                                                </span>
                                            )}
                                        </span>
                                    )}
                                </div>
                                <input
                                    type="number"
                                    min="0"
                                    max={target}
                                    step="0.01"
                                    placeholder="0.00"
                                    value={weights.anorganik_lainnya_kg}
                                    onChange={(e) =>
                                        updateWeight(
                                            "anorganik_lainnya_kg",
                                            e.target.value,
                                        )
                                    }
                                />
                            </label>
                        </div>
                    </div>

                    {/* Keterangan */}
                    <label className="sorting-keterangan">
                        <span>Keterangan (Opsional)</span>
                        <input
                            type="text"
                            placeholder="Catatan tambahan hasil pemilahan..."
                            value={weights.keterangan}
                            onChange={(e) =>
                                updateWeight("keterangan", e.target.value)
                            }
                        />
                    </label>
                </div>
            </div>

            {/* ---- SUBMIT ACTION ---- */}
            <div className="sorting-actions">
                <div className="sorting-submit-hint">
                    {inputTotal === 0 ? (
                        <span>
                            * Masukkan berat sampah yang telah dipilah pada kolom di atas (maksimal sisa <strong>{target.toFixed(2)} kg</strong>).
                        </span>
                    ) : !overLimit && !isExact ? (
                        <span>
                            * Pemilahan parsial: Menyimpan <strong>+{inputTotal.toFixed(2)} kg</strong>. Sisa sampah setelah disimpan: <strong>{(target - inputTotal).toFixed(2)} kg</strong>.
                        </span>
                    ) : isExact ? (
                        <span>
                            * Kuota penuh <strong>{totalIncoming.toFixed(2)} kg</strong> akan terpenuhi lengkap setelah disimpan.
                        </span>
                    ) : (
                        <span style={{ color: "#ef4444" }}>
                            * Input melebihi sisa kuota yang tersedia ({target.toFixed(2)} kg).
                        </span>
                    )}
                </div>

                <button
                    type="submit"
                    className="primary-button sorting-submit-btn"
                    disabled={!isValidSubmit || submitting}
                >
                    {submitting ? (
                        <>
                            <Loader2 size={20} className="sorting-spinner" />
                            <span>Menyimpan ke Database...</span>
                        </>
                    ) : isExact ? (
                        <>
                            <CheckCircle2 size={20} />
                            <span>Simpan Pemilahan ({target.toFixed(2)} kg - Selesai Penuh)</span>
                        </>
                    ) : isValidSubmit ? (
                        <>
                            <CheckCircle2 size={20} />
                            <span>Simpan Pemilahan (+{inputTotal.toFixed(2)} kg)</span>
                        </>
                    ) : overLimit ? (
                        `Melebihi Sisa Kuota (+${(inputTotal - target).toFixed(2)} kg)`
                    ) : (
                        "Masukkan Berat Pemilahan"
                    )}
                </button>
            </div>
        </form>
    );
}
