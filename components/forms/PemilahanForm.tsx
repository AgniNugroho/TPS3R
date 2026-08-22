"use client";

import { useActionState } from "react";
import { submitPemilahan } from "@/app/(dashboard)/pemilahan/actions";

type Kategori = { id: number; nama: string; beratKg: number };

export function PemilahanForm({ bulan, kategoriList }: { bulan: string; kategoriList: Kategori[] }) {
  const [state, formAction, pending] = useActionState(submitPemilahan, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4 max-w-md">
      <input type="hidden" name="bulan" value={bulan} />

      {kategoriList.map((kategori) => (
        <label key={kategori.id} className="flex flex-col gap-1 text-sm">
          {kategori.nama} (kg)
          <input type="hidden" name="jenis_sampah_id" value={kategori.id} />
          <input
            type="number"
            name={`berat_${kategori.id}`}
            min={0}
            step={0.1}
            defaultValue={kategori.beratKg}
            className="border rounded-md px-3 py-2 text-sm"
          />
        </label>
      ))}

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.success && <p className="text-sm text-emerald-600">Data pemilahan bulan ini berhasil disimpan.</p>}

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
