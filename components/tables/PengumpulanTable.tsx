"use client";

import { useActionState, useEffect, useState } from "react";
import { deletePengumpulan, updatePengumpulan } from "@/app/(dashboard)/pengumpulan/actions";

export type PengumpulanHistoryRow = {
  id: number;
  tanggal: string;
  berat_kg: number;
  catatan: string | null;
  petugasId: string;
  anggotaNama: string;
  dusunNama: string;
  petugasNama: string;
};

export function PengumpulanTable({ rows, currentPetugasId }: { rows: PengumpulanHistoryRow[]; currentPetugasId: string }) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [updateState, updateAction, updatePending] = useActionState(updatePengumpulan, undefined);

  useEffect(() => {
    if (updateState?.success) {
      setEditingId(null);
    }
  }, [updateState]);

  if (rows.length === 0) {
    return <p className="heading-copy mt-4">Belum ada data pengumpulan yang tercatat.</p>;
  }

  return (
    <div className="mt-8 overflow-x-auto">
      {updateState?.error && <p className="text-sm text-red-600 mb-2">{updateState.error}</p>}
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="text-left border-b border-[var(--line)]">
            <th className="py-2 pr-4 font-semibold">Tanggal</th>
            <th className="py-2 pr-4 font-semibold">Anggota</th>
            <th className="py-2 pr-4 font-semibold">Dusun</th>
            <th className="py-2 pr-4 font-semibold text-right">Berat (kg)</th>
            <th className="py-2 pr-4 font-semibold">Petugas</th>
            <th className="py-2 pr-4 font-semibold">Catatan</th>
            <th className="py-2 pr-4 font-semibold">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isOwner = row.petugasId === currentPetugasId;

            if (editingId === row.id) {
              return (
                <tr key={row.id} className="border-b border-[var(--line)]">
                  <td className="py-2 pr-4" colSpan={7}>
                    <form action={updateAction} className="flex flex-wrap items-end gap-3">
                      <input type="hidden" name="id" value={row.id} />
                      <label className="flex flex-col gap-1 text-xs">
                        Tanggal
                        <input
                          type="date"
                          name="tanggal"
                          required
                          defaultValue={row.tanggal.slice(0, 10)}
                          className="border rounded-md px-2 py-1 text-sm"
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-xs">
                        Berat (kg)
                        <input
                          type="number"
                          name="berat_kg"
                          required
                          min={0.1}
                          step={0.1}
                          defaultValue={row.berat_kg}
                          className="border rounded-md px-2 py-1 text-sm w-24"
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-xs">
                        Catatan
                        <input
                          type="text"
                          name="catatan"
                          defaultValue={row.catatan ?? ""}
                          className="border rounded-md px-2 py-1 text-sm"
                        />
                      </label>
                      <button type="submit" disabled={updatePending} className="primary-button disabled:opacity-60">
                        {updatePending ? "Menyimpan..." : "Simpan"}
                      </button>
                      <button type="button" className="secondary-button" onClick={() => setEditingId(null)}>
                        Batal
                      </button>
                    </form>
                  </td>
                </tr>
              );
            }

            return (
              <tr key={row.id} className="border-b border-[var(--line)]">
                <td className="py-2 pr-4 whitespace-nowrap">
                  {new Date(row.tanggal).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                </td>
                <td className="py-2 pr-4">{row.anggotaNama}</td>
                <td className="py-2 pr-4">{row.dusunNama}</td>
                <td className="py-2 pr-4 text-right">{row.berat_kg.toLocaleString("id-ID")}</td>
                <td className="py-2 pr-4">{row.petugasNama}</td>
                <td className="py-2 pr-4 text-[var(--muted)]">{row.catatan ?? "-"}</td>
                <td className="py-2 pr-4">
                  {isOwner ? (
                    <div className="flex gap-2">
                      <button type="button" className="text-button" onClick={() => setEditingId(row.id)}>
                        Edit
                      </button>
                      <DeleteButton id={row.id} />
                    </div>
                  ) : (
                    <span className="text-[var(--muted)]">-</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function DeleteButton({ id }: { id: number }) {
  const [pending, setPending] = useState(false);

  return (
    <form
      action={async () => {
        if (!confirm("Hapus data pengumpulan ini?")) return;
        setPending(true);
        await deletePengumpulan(id);
        setPending(false);
      }}
    >
      <button type="submit" disabled={pending} className="text-button text-red-600 disabled:opacity-60">
        {pending ? "Menghapus..." : "Hapus"}
      </button>
    </form>
  );
}
