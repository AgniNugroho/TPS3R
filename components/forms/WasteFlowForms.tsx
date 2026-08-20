"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type FormValues = Record<string, string>;
const initialIncoming: FormValues = { tanggal: new Date().toISOString().slice(0, 10), asal_sampah: "", wilayah_id: "", total_berat_kg: "", keterangan: "" };
const initialSorting: FormValues = { sampah_masuk_id: "", tanggal: new Date().toISOString().slice(0, 10), organik_kg: "", anorganik_kg: "", residu_kg: "", kardus_kg: "", kaca_kg: "", besi_kg: "", anorganik_lainnya_kg: "", keterangan: "" };

type FormMode = "incoming" | "sorting";

export default function WasteFlowForm({ mode }: { mode: FormMode }) {
  const router = useRouter();
  const [values, setValues] = useState<FormValues>(mode === "incoming" ? initialIncoming : initialSorting);
  const [wilayahRows, setWilayahRows] = useState<Array<{ id: string; kode: string; dusun: string; rt: string | null; rw: string | null; status: string }>>([]);
  const [incomingRows, setIncomingRows] = useState<Array<{ id: string; tanggal: string; asal_sampah: string; total_berat_kg: number }>>([]);
  const fields = mode === "incoming"
    ? [{ key: "tanggal", label: "Tanggal", type: "date" }, { key: "wilayah_id", label: "Asal sampah", type: "select" }, { key: "total_berat_kg", label: "Total berat (kg)", type: "number", placeholder: "0" }, { key: "keterangan", label: "Keterangan", type: "text", placeholder: "Catatan tambahan" }]
    : [{ key: "sampah_masuk_id", label: "ID sampah masuk", type: "text", placeholder: "UUID dari data sampah masuk" }, { key: "tanggal", label: "Tanggal", type: "date" }, { key: "organik_kg", label: "Organik (kg)", type: "number", placeholder: "0" }, { key: "residu_kg", label: "Residu (kg)", type: "number", placeholder: "0" }, { key: "kardus_kg", label: "Anorganik: kardus (kg)", type: "number", placeholder: "0" }, { key: "kaca_kg", label: "Anorganik: kaca (kg)", type: "number", placeholder: "0" }, { key: "besi_kg", label: "Anorganik: besi (kg)", type: "number", placeholder: "0" }, { key: "anorganik_lainnya_kg", label: "Anorganik: lainnya (kg)", type: "number", placeholder: "0" }, { key: "keterangan", label: "Keterangan", type: "text", placeholder: "Catatan tambahan" }];

  useEffect(() => {
    if (mode === "sorting") {
      Promise.all([fetch("/api/sampah-masuk").then((response) => response.json()), fetch("/api/pemilahan").then((response) => response.json())])
        .then(([incomingResult, sortingResult]) => {
          if (!incomingResult.ok || !sortingResult.ok) {
            console.error(incomingResult.error || sortingResult.error || "Data pemilahan gagal dimuat.");
            return;
          }
          const sortedIds = new Set((sortingResult.rows ?? []).map((row: { sampah_masuk_id: string }) => row.sampah_masuk_id));
          setIncomingRows((incomingResult.rows ?? []).filter((row: { id: string }) => !sortedIds.has(row.id)));
        })
        .catch((error) => console.error("Data sampah untuk pemilahan gagal dimuat.", error));
      return;
    }
    fetch("/api/wilayah").then((response) => response.json()).then((result) => {
      if (!result.ok) {
        console.error(result.error || "Data wilayah gagal dimuat.");
        return;
      }
      setWilayahRows((result.rows ?? []).filter((row: { status?: string }) => !row.status || row.status.toLowerCase() === "aktif"));
    }).catch((error) => console.error("Data wilayah gagal dimuat.", error));
  }, [mode]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const endpoint = mode === "incoming" ? "/api/sampah-masuk" : "/api/pemilahan";
    if (mode === "sorting") {
      const anorganik = Number(values.kardus_kg || 0) + Number(values.kaca_kg || 0) + Number(values.besi_kg || 0) + Number(values.anorganik_lainnya_kg || 0);
      const total = Number(values.organik_kg || 0) + anorganik + Number(values.residu_kg || 0);
      const selected = incomingRows.find((row) => row.id === values.sampah_masuk_id);
      if (!selected || total !== Number(selected.total_berat_kg)) {
        console.error(`Total pemilahan harus sama dengan ${selected?.total_berat_kg ?? 0} kg.`);
        return;
      }
      const valuesWithSortingTotal = { ...values, anorganik_kg: String(anorganik) };
      const payload = Object.fromEntries(Object.entries(valuesWithSortingTotal).map(([key, value]) => [key, key === "tanggal" || key.includes("id") || key === "keterangan" ? value : Number(value || 0)]));
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!result.ok) console.error(result.error || "Data gagal disimpan.");
      else {
        setValues(initialSorting);
        router.back();
      }
      return;
    }
    const selectedWilayah = wilayahRows.find((row) => row.id === values.wilayah_id);
    const valuesWithOrigin = mode === "incoming" ? { ...values, asal_sampah: selectedWilayah?.dusun ?? "" } : values;
    const payload = Object.fromEntries(Object.entries(valuesWithOrigin).map(([key, value]) => [key, key === "tanggal" || key.includes("id") || key === "asal_sampah" || key === "keterangan" ? value : Number(value || 0)]));
    const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const result = await response.json();
    if (!result.ok) console.error(result.error || "Data gagal disimpan.");
    else {
      setValues(mode === "incoming" ? initialIncoming : initialSorting);
      router.back();
    }
  }

  return <form className="data-form" onSubmit={submit}><div className="form-grid">{fields.map((field) => <label key={field.key}>{field.label}{field.key === "sampah_masuk_id" ? <select required value={values[field.key]} onChange={(event) => setValues({ ...values, [field.key]: event.target.value })}><option value="">Pilih sampah masuk</option>{incomingRows.map((row) => <option key={row.id} value={row.id}>{row.tanggal.slice(8, 10)}-{row.tanggal.slice(5, 7)}-{row.tanggal.slice(0, 4)} · {row.asal_sampah} · {row.total_berat_kg} kg</option>)}</select> : field.key === "wilayah_id" ? <select required value={values[field.key]} onChange={(event) => setValues({ ...values, wilayah_id: event.target.value })}><option value="">Pilih wilayah asal</option>{wilayahRows.map((row) => <option key={row.id} value={row.id}>{row.dusun}</option>)}</select> : <input required={field.key !== "keterangan"} type={field.type} placeholder={field.placeholder} value={values[field.key]} onChange={(event) => setValues({ ...values, [field.key]: event.target.value })} min={field.type === "number" ? "0" : undefined} step={field.type === "number" ? "0.01" : undefined} />}</label>)}</div><button className="primary-button" type="submit">Simpan data</button></form>;
}
