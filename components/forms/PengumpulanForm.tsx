"use client";

import { useActionState, useMemo, useState } from "react";
import { submitPengumpulan } from "@/app/(dashboard)/pengumpulan/actions";

type Anggota = {
  id: number;
  nama: string;
  wilayah_id: number | null;
  wilayah: { id?: number; nama_dusun: string } | { id?: number; nama_dusun: string }[] | null;
};

function dusunNama(item: Anggota | undefined) {
  if (!item?.wilayah) return null;
  if (Array.isArray(item.wilayah)) {
    return item.wilayah[0]?.nama_dusun ?? null;
  }
  return item.wilayah.nama_dusun ?? null;
}

export function PengumpulanForm({ anggotaList }: { anggotaList: Anggota[] }) {
  const [state, formAction, pending] = useActionState(submitPengumpulan, undefined);
  const [anggotaId, setAnggotaId] = useState("");

  const dusunTerpilih = useMemo(
    () => dusunNama(anggotaList.find((item) => String(item.id) === anggotaId)) ?? "-",
    [anggotaId, anggotaList]
  );

  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="flex flex-col gap-4 max-w-md">
      <label className="flex flex-col gap-1 text-sm">
        Anggota / Member
        <select
          name="anggota_id"
          required
          value={anggotaId}
          onChange={(event) => setAnggotaId(event.target.value)}
          className="border rounded-md px-3 py-2 text-sm"
        >
          <option value="">Pilih anggota...</option>
          {anggotaList.map((item) => (
            <option key={item.id} value={item.id}>
              {item.nama} — {dusunNama(item) ?? "Tanpa dusun"}
            </option>
          ))}
        </select>
      </label>

      <input
        type="hidden"
        name="wilayah_id"
        value={anggotaList.find((item) => String(item.id) === anggotaId)?.wilayah_id ?? ""}
      />

      <p className="text-sm text-muted">
        Dusun: <strong>{dusunTerpilih}</strong>
      </p>

      <label className="flex flex-col gap-1 text-sm">
        Tanggal
        <input
          type="date"
          name="tanggal"
          required
          defaultValue={today}
          className="border rounded-md px-3 py-2 text-sm"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Total sampah (kg)
        <input
          type="number"
          name="berat_kg"
          required
          min={0.1}
          step={0.1}
          placeholder="Contoh: 12.5"
          className="border rounded-md px-3 py-2 text-sm"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Catatan (opsional)
        <textarea
          name="catatan"
          rows={3}
          className="border rounded-md px-3 py-2 text-sm"
        />
      </label>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.success && <p className="text-sm text-emerald-600">Data berhasil disimpan.</p>}

      <button
        type="submit"
        disabled={pending}
        className="primary-button justify-center disabled:opacity-60"
      >
        {pending ? "Menyimpan..." : "Simpan"}
      </button>
    </form>
  );
}
