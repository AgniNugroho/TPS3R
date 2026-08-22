"use client";

import { useState, useActionState } from "react";
import { Users, Plus, Search, Trash2, Edit2, X, MapPin } from "lucide-react";
import {
  createAnggotaAction,
  updateAnggotaAction,
  deleteAnggotaAction,
  type AnggotaActionState,
} from "@/app/(dashboard)/anggota/actions";

export type AnggotaItem = {
  id: number;
  nama: string;
  wilayah_id: number | null;
  alamat: string | null;
  created_at: string;
  dusunNama: string;
};

export type WilayahOption = {
  id: number;
  nama_dusun: string;
};

export type AnggotaManagementProps = {
  currentUserNama: string;
  anggotaList: AnggotaItem[];
  wilayahList: WilayahOption[];
};

export function AnggotaManagementClient({
  currentUserNama,
  anggotaList,
  wilayahList,
}: AnggotaManagementProps) {
  const [search, setSearch] = useState("");
  const [selectedWilayah, setSelectedWilayah] = useState<string>("ALL");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<AnggotaItem | null>(null);

  const [addState, addAction, isAddPending] = useActionState<AnggotaActionState, FormData>(
    async (prev: AnggotaActionState, formData: FormData) => {
      const res = await createAnggotaAction(prev, formData);
      if (res?.success) setIsAddModalOpen(false);
      return res;
    },
    undefined
  );

  const [editState, editAction, isEditPending] = useActionState<AnggotaActionState, FormData>(
    async (prev: AnggotaActionState, formData: FormData) => {
      const res = await updateAnggotaAction(prev, formData);
      if (res?.success) setEditItem(null);
      return res;
    },
    undefined
  );

  const [deleteState, deleteAction, isDeletePending] = useActionState<AnggotaActionState, FormData>(
    deleteAnggotaAction,
    undefined
  );

  const filtered = anggotaList.filter((a) => {
    const matchSearch =
      a.nama.toLowerCase().includes(search.toLowerCase()) ||
      (a.alamat && a.alamat.toLowerCase().includes(search.toLowerCase())) ||
      a.dusunNama.toLowerCase().includes(search.toLowerCase());

    const matchWilayah =
      selectedWilayah === "ALL" ||
      (selectedWilayah === "NONE" && !a.wilayah_id) ||
      String(a.wilayah_id) === selectedWilayah;

    return matchSearch && matchWilayah;
  });

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow flex items-center gap-2">
            <Users size={14} className="text-lime-700" />
            <span>MASTER DATA WARGA / NASABAH</span>
          </div>
          <h1>Daftar Warga & Anggota TPS3R</h1>
          <p className="heading-copy">
            Kelola data warga pelanggan pengumpulan sampah desa per dusun.
          </p>
        </div>
        <div className="heading-actions">
          <button onClick={() => setIsAddModalOpen(true)} className="primary-button">
            <Plus size={16} /> Tambah Warga Baru
          </button>
        </div>
      </div>

      {/* Global Feedback Alert */}
      {(addState?.error || editState?.error || deleteState?.error) && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
          {addState?.error || editState?.error || deleteState?.error}
        </div>
      )}
      {(addState?.message || editState?.message || deleteState?.message) && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
          {addState?.message || editState?.message || deleteState?.message}
        </div>
      )}

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <div className="md:col-span-2 bg-white border border-gray-200 rounded-xl p-3 flex items-center gap-3">
          <Search size={18} className="text-gray-400" />
          <input
            type="text"
            placeholder="Cari nama warga atau alamat..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent border-none text-xs outline-none text-gray-800 placeholder-gray-400"
          />
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-3 flex items-center gap-2">
          <MapPin size={16} className="text-gray-400" />
          <select
            value={selectedWilayah}
            onChange={(e) => setSelectedWilayah(e.target.value)}
            className="flex-1 bg-transparent text-xs text-gray-700 outline-none cursor-pointer"
          >
            <option value="ALL">Semua Dusun ({anggotaList.length})</option>
            {wilayahList.map((w) => (
              <option key={w.id} value={String(w.id)}>
                {w.nama_dusun}
              </option>
            ))}
            <option value="NONE">Tanpa Dusun</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-4">Nama Warga</th>
                <th className="py-3.5 px-4">Dusun / Wilayah</th>
                <th className="py-3.5 px-4">Alamat / RT RW</th>
                <th className="py-3.5 px-4">Terdaftar Sejak</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-400">
                    Tidak ada data warga yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <strong className="text-gray-900 block font-semibold">
                        {item.nama}
                      </strong>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {item.dusunNama}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600">{item.alamat || "-"}</td>
                    <td className="py-3 px-4 text-gray-500">
                      {new Date(item.created_at).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => setEditItem(item)}
                          className="p-1.5 rounded text-gray-600 hover:bg-gray-100 transition-colors"
                          title="Edit Data Warga"
                        >
                          <Edit2 size={15} />
                        </button>
                        <form
                          action={deleteAction}
                          onSubmit={(e) => {
                            if (
                              !confirm(
                                `Hapus data warga "${item.nama}"? Riwayat masa lalu tetap aman.`
                              )
                            ) {
                              e.preventDefault();
                            }
                          }}
                        >
                          <input type="hidden" name="id" value={item.id} />
                          <button
                            type="submit"
                            disabled={isDeletePending}
                            className="p-1.5 rounded text-red-600 hover:bg-red-50 transition-colors"
                            title="Hapus Warga"
                          >
                            <Trash2 size={15} />
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Tambah Warga */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-base">Daftarkan Warga Baru</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>

            <form action={addAction} className="flex flex-col gap-4 mt-4">
              <label className="flex flex-col gap-1 text-xs font-semibold text-gray-700">
                Nama Lengkap Warga / KK
                <input
                  type="text"
                  name="nama"
                  required
                  placeholder="Contoh: Pak Supriyanto"
                  className="border border-gray-300 rounded-lg px-3 py-2 text-xs focus:border-lime-600 outline-none"
                />
              </label>

              <label className="flex flex-col gap-1 text-xs font-semibold text-gray-700">
                Pilih Dusun
                <select
                  name="wilayah_id"
                  className="border border-gray-300 rounded-lg px-3 py-2 text-xs focus:border-lime-600 outline-none bg-white"
                >
                  <option value="">-- Tanpa Dusun / Umum --</option>
                  {wilayahList.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.nama_dusun}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 text-xs font-semibold text-gray-700">
                Alamat Lengkap / RT RW
                <input
                  type="text"
                  name="alamat"
                  placeholder="Contoh: RT 02 / RW 01, No 15"
                  className="border border-gray-300 rounded-lg px-3 py-2 text-xs focus:border-lime-600 outline-none"
                />
              </label>

              <div className="flex gap-2 justify-end mt-4 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="secondary-button"
                >
                  Batal
                </button>
                <button type="submit" disabled={isAddPending} className="primary-button">
                  {isAddPending ? "Menyimpan..." : "Daftarkan Warga"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Warga */}
      {editItem && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-base">Edit Data Warga</h3>
              <button
                onClick={() => setEditItem(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>

            <form action={editAction} className="flex flex-col gap-4 mt-4">
              <input type="hidden" name="id" value={editItem.id} />

              <label className="flex flex-col gap-1 text-xs font-semibold text-gray-700">
                Nama Lengkap Warga
                <input
                  type="text"
                  name="nama"
                  required
                  defaultValue={editItem.nama}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-xs focus:border-lime-600 outline-none"
                />
              </label>

              <label className="flex flex-col gap-1 text-xs font-semibold text-gray-700">
                Dusun
                <select
                  name="wilayah_id"
                  defaultValue={editItem.wilayah_id ? String(editItem.wilayah_id) : ""}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-xs focus:border-lime-600 outline-none bg-white"
                >
                  <option value="">-- Tanpa Dusun --</option>
                  {wilayahList.map((w) => (
                    <option key={w.id} value={String(w.id)}>
                      {w.nama_dusun}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 text-xs font-semibold text-gray-700">
                Alamat / RT RW
                <input
                  type="text"
                  name="alamat"
                  defaultValue={editItem.alamat || ""}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-xs focus:border-lime-600 outline-none"
                />
              </label>

              <div className="flex gap-2 justify-end mt-4 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditItem(null)}
                  className="secondary-button"
                >
                  Batal
                </button>
                <button type="submit" disabled={isEditPending} className="primary-button">
                  {isEditPending ? "Menyimpan..." : "Update Warga"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
