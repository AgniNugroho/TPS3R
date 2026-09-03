"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { showErrorToast } from "@/components/ui/Toast";

type FormValues = Record<string, string>;
const initialIncoming: FormValues = {
    tanggal: new Date().toISOString().slice(0, 10),
    asal_sampah: "",
    wilayah_id: "",
    member_id: "",
    total_berat_kg: "",
    keterangan: "",
};
const initialSorting: FormValues = {
    sampah_masuk_id: "",
    tanggal: new Date().toISOString().slice(0, 10),
    organik_kg: "",
    anorganik_kg: "",
    residu_kg: "",
    kardus_kg: "",
    kaca_kg: "",
    besi_kg: "",
    anorganik_lainnya_kg: "",
    keterangan: "",
};

type FormMode = "incoming" | "sorting";

type FormField = {
    key: string;
    label: string;
    type: string;
    required: boolean;
    placeholder?: string;
};

export default function WasteFlowForm({ mode }: { mode: FormMode }) {
    const router = useRouter();
    const [values, setValues] = useState<FormValues>(
        mode === "incoming" ? initialIncoming : initialSorting,
    );
    const [wilayahRows, setWilayahRows] = useState<
        Array<{
            id: string;
            kode: string;
            dusun: string;
            rt: string | null;
            rw: string | null;
            status: string;
        }>
    >([]);
    const [memberRows, setMemberRows] = useState<
        Array<{
            id: string;
            nama: string;
            wilayah_id: string | null;
            desa_id: string;
            status: string;
        }>
    >([]);
    const [incomingRows, setIncomingRows] = useState<
        Array<{
            id: string;
            tanggal: string;
            asal_sampah: string;
            total_berat_kg: number;
            remaining_berat_kg?: number;
            total_sorted_kg?: number;
        }>
    >([]);

    // Filter members based on selected wilayah_id (Cascading)
    const filteredMembers = useMemo(() => {
        if (!values.wilayah_id) return [];
        return memberRows.filter((m) => m.wilayah_id === values.wilayah_id);
    }, [memberRows, values.wilayah_id]);

    const fields: FormField[] =
        mode === "incoming"
            ? [
                  {
                      key: "tanggal",
                      label: "Tanggal",
                      type: "date",
                      required: true,
                  },
                  {
                      key: "wilayah_id",
                      label: "Asal wilayah / dusun",
                      type: "select",
                      required: true,
                  },
                  {
                      key: "member_id",
                      label: "Member / Nasabah (Opsional)",
                      type: "select",
                      required: false,
                  },
                  {
                      key: "total_berat_kg",
                      label: "Total berat (kg)",
                      type: "number",
                      placeholder: "0",
                      required: false,
                  },
                  {
                      key: "keterangan",
                      label: "Keterangan",
                      type: "text",
                      placeholder: "Catatan tambahan",
                      required: false,
                  },
              ]
            : [
                  {
                      key: "sampah_masuk_id",
                      label: "ID sampah masuk",
                      type: "text",
                      placeholder: "UUID dari data sampah masuk",
                      required: true,
                  },
                  {
                      key: "tanggal",
                      label: "Tanggal",
                      type: "date",
                      required: true,
                  },
                  {
                      key: "organik_kg",
                      label: "Organik (kg)",
                      type: "number",
                      placeholder: "0",
                      required: false,
                  },
                  {
                      key: "residu_kg",
                      label: "Residu (kg)",
                      type: "number",
                      placeholder: "0",
                      required: false,
                  },
                  {
                      key: "kardus_kg",
                      label: "Anorganik: kardus (kg)",
                      type: "number",
                      placeholder: "0",
                      required: false,
                  },
                  {
                      key: "kaca_kg",
                      label: "Anorganik: kaca (kg)",
                      type: "number",
                      placeholder: "0",
                      required: false,
                  },
                  {
                      key: "besi_kg",
                      label: "Anorganik: besi (kg)",
                      type: "number",
                      placeholder: "0",
                      required: false,
                  },
                  {
                      key: "anorganik_lainnya_kg",
                      label: "Anorganik: lainnya (kg)",
                      type: "number",
                      placeholder: "0",
                      required: false,
                  },
                  {
                      key: "keterangan",
                      label: "Keterangan",
                      type: "text",
                      placeholder: "Catatan tambahan",
                      required: false,
                  },
              ];

    useEffect(() => {
        if (mode === "sorting") {
            Promise.all([
                fetch(`/api/sampah-masuk?_t=${Date.now()}`, { cache: "no-store" }).then((response) => response.json()),
                fetch(`/api/pemilahan?_t=${Date.now()}`, { cache: "no-store" }).then((response) => response.json()),
            ])
                .then(([incomingResult, sortingResult]) => {
                    if (!incomingResult.ok || !sortingResult.ok) {
                        showErrorToast(
                            incomingResult.error ||
                                sortingResult.error ||
                                "Data pemilahan gagal dimuat.",
                        );
                        return;
                    }

                    // Hitung total pemilahan per sampah_masuk_id
                    const sortingByIncomingId = new Map<
                        string,
                        { organik: number; anorganik: number; residu: number }
                    >();
                    (sortingResult.rows ?? []).forEach(
                        (row: {
                            sampah_masuk_id: string;
                            organik_kg: number;
                            anorganik_kg: number;
                            residu_kg: number;
                        }) => {
                            const existing = sortingByIncomingId.get(
                                row.sampah_masuk_id,
                            ) || {
                                organik: 0,
                                anorganik: 0,
                                residu: 0,
                            };
                            sortingByIncomingId.set(row.sampah_masuk_id, {
                                organik: existing.organik + row.organik_kg,
                                anorganik:
                                    existing.anorganik + row.anorganik_kg,
                                residu: existing.residu + row.residu_kg,
                            });
                        },
                    );

                    // Filter hanya sampah yang belum dipilah sepenuhnya
                    const processedIncomingRows = (
                        incomingResult.rows ?? []
                    ).map(
                        (row: {
                            id: string;
                            total_berat_kg: number;
                            tanggal: string;
                            asal_sampah: string;
                        }) => {
                            const sorted = sortingByIncomingId.get(row.id);
                            const totalSorted = sorted
                                ? sorted.organik +
                                  sorted.anorganik +
                                  sorted.residu
                                : 0;
                            const remaining = row.total_berat_kg - totalSorted;

                            return {
                                ...row,
                                remaining_berat_kg: remaining,
                                total_sorted_kg: totalSorted,
                            };
                        },
                    );

                    // Hanya tampilkan yang masih punya sisa
                    setIncomingRows(
                        processedIncomingRows.filter(
                            (row: { remaining_berat_kg: number }) =>
                                row.remaining_berat_kg > 0,
                        ),
                    );
                })
                .catch((error) =>
                    showErrorToast(
                        error instanceof Error
                            ? error
                            : "Data sampah untuk pemilahan gagal dimuat.",
                    ),
                );
            return;
        }
        Promise.all([
            fetch("/api/wilayah").then((res) => res.json()),
            fetch("/api/member-bank-sampah").then((res) => res.json()),
        ])
            .then(([wilayahResult, memberResult]) => {
                if (!wilayahResult.ok) {
                    showErrorToast(
                        wilayahResult.error || "Data wilayah gagal dimuat.",
                    );
                    return;
                }
                setWilayahRows(
                    (wilayahResult.rows ?? [])
                        .filter(
                            (row: { status?: string }) =>
                                !row.status ||
                                row.status.toLowerCase() === "aktif",
                        )
                        .sort((a: { dusun: string }, b: { dusun: string }) =>
                            a.dusun.localeCompare(b.dusun, "id", {
                                sensitivity: "base",
                            }),
                        ),
                );

                if (memberResult.ok) {
                    setMemberRows(
                        (memberResult.rows ?? [])
                            .filter(
                                (row: { status?: string }) =>
                                    !row.status ||
                                    row.status.toLowerCase() === "aktif",
                            )
                            .sort((a: { nama: string }, b: { nama: string }) =>
                                a.nama.localeCompare(b.nama, "id", {
                                    sensitivity: "base",
                                }),
                            ),
                    );
                }
            })
            .catch((error) => showErrorToast(error));
    }, [mode]);

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const endpoint =
            mode === "incoming" ? "/api/sampah-masuk" : "/api/pemilahan";
        if (mode === "sorting") {
            const anorganik =
                Number(values.kardus_kg || 0) +
                Number(values.kaca_kg || 0) +
                Number(values.besi_kg || 0) +
                Number(values.anorganik_lainnya_kg || 0);
            const total =
                Number(values.organik_kg || 0) +
                anorganik +
                Number(values.residu_kg || 0);

            // Validasi: tolak jika semua berat adalah 0
            if (total === 0) {
                showErrorToast(
                    "Minimal ada satu berat sampah yang harus diisi (tidak boleh semua 0).",
                );
                return;
            }

            const selected = incomingRows.find(
                (row) => row.id === values.sampah_masuk_id,
            );
            if (!selected) {
                showErrorToast("Sampah masuk tidak ditemukan.");
                return;
            }

            const sisaSampah =
                selected.remaining_berat_kg ?? selected.total_berat_kg;
            if (total > sisaSampah) {
                showErrorToast(
                    `Total pemilahan tidak boleh melebihi sisa sampah ${sisaSampah} kg.`,
                );
                return;
            }
            const valuesWithSortingTotal = {
                ...values,
                anorganik_kg: String(anorganik),
            };
            const payload = Object.fromEntries(
                Object.entries(valuesWithSortingTotal).map(([key, value]) => [
                    key,
                    key === "tanggal" ||
                    key.includes("id") ||
                    key === "keterangan"
                        ? value
                        : Number(value || 0),
                ]),
            );
            const response = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const result = await response.json();
            if (!result.ok)
                showErrorToast(result.error || "Data gagal disimpan.");
            else {
                setValues(initialSorting);
                router.back();
            }
            return;
        }
        const selectedWilayah = wilayahRows.find(
            (row) => row.id === values.wilayah_id,
        );
        const selectedMember = memberRows.find(
            (row) => row.id === values.member_id,
        );

        // Validasi untuk mode incoming: tolak jika total berat adalah 0
        if (mode === "incoming" && Number(values.total_berat_kg || 0) === 0) {
            showErrorToast("Berat sampah tidak boleh kosong.");
            return;
        }

        const originText = selectedMember
            ? `${selectedWilayah?.dusun ?? ""} - ${selectedMember.nama}`
            : selectedWilayah?.dusun ?? "";

        const valuesWithOrigin =
            mode === "incoming"
                ? {
                      ...values,
                      asal_sampah: originText,
                      member_id: values.member_id || null,
                  }
                : values;
        const payload = Object.fromEntries(
            Object.entries(valuesWithOrigin).map(([key, value]) => [
                key,
                key === "tanggal" ||
                key.includes("id") ||
                key === "asal_sampah" ||
                key === "keterangan"
                    ? value || null
                    : Number(value || 0),
            ]),
        );
        const response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        const result = await response.json();
        if (!result.ok) showErrorToast(result.error || "Data gagal disimpan.");
        else {
            setValues(mode === "incoming" ? initialIncoming : initialSorting);
            router.back();
        }
    }

    return (
        <form className="data-form" onSubmit={submit}>
            <div className="form-grid">
                {fields.map((field) => (
                    <label key={field.key}>
                        {field.label}
                        {field.key === "sampah_masuk_id" ? (
                            <select
                                required={field.required}
                                value={values[field.key]}
                                onChange={(event) =>
                                    setValues({
                                        ...values,
                                        [field.key]: event.target.value,
                                    })
                                }
                            >
                                <option value="">Pilih sampah masuk</option>
                                {incomingRows.map((row) => (
                                    <option key={row.id} value={row.id}>
                                        {row.tanggal.slice(8, 10)}-
                                        {row.tanggal.slice(5, 7)}-
                                        {row.tanggal.slice(0, 4)} ·{" "}
                                        {row.asal_sampah} · Sisa:{" "}
                                        {row.remaining_berat_kg ??
                                            row.total_berat_kg}{" "}
                                        kg
                                    </option>
                                ))}
                            </select>
                        ) : field.key === "wilayah_id" ? (
                            <select
                                required={field.required}
                                value={values[field.key]}
                                onChange={(event) =>
                                    setValues({
                                        ...values,
                                        wilayah_id: event.target.value,
                                        member_id: "",
                                    })
                                }
                            >
                                <option value="">Pilih wilayah asal (dusun)</option>
                                {wilayahRows.map((row) => (
                                    <option key={row.id} value={row.id}>
                                        {row.dusun}
                                    </option>
                                ))}
                            </select>
                        ) : field.key === "member_id" ? (
                            <select
                                value={values.member_id}
                                disabled={!values.wilayah_id}
                                onChange={(event) =>
                                    setValues({
                                        ...values,
                                        member_id: event.target.value,
                                    })
                                }
                            >
                                {!values.wilayah_id ? (
                                    <option value="">
                                        -- Pilih wilayah asal terlebih dahulu --
                                    </option>
                                ) : (
                                    <>
                                        <option value="">
                                            Kolektif Wilayah (Tanpa Member Khusus)
                                        </option>
                                        {filteredMembers.length > 0 ? (
                                            filteredMembers.map((m) => (
                                                <option key={m.id} value={m.id}>
                                                    {m.nama}
                                                </option>
                                            ))
                                        ) : (
                                            <option value="" disabled>
                                                Belum ada member terdaftar di wilayah ini
                                            </option>
                                        )}
                                    </>
                                )}
                            </select>
                        ) : (
                            <input
                                required={field.required}
                                type={field.type}
                                placeholder={field.placeholder}
                                value={values[field.key]}
                                onChange={(event) =>
                                    setValues({
                                        ...values,
                                        [field.key]: event.target.value,
                                    })
                                }
                                min={field.type === "number" ? "0" : undefined}
                                step={
                                    field.type === "number" ? "0.01" : undefined
                                }
                            />
                        )}
                    </label>
                ))}
            </div>
            <button className="primary-button" type="submit">
                Simpan data
            </button>
        </form>
    );
}
