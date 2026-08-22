"use client";

import { useState, useActionState } from "react";
import { MapPin, Plus, Search, Trash2, Edit2, X, Users } from "lucide-react";
import {
  createWilayahAction,
  updateWilayahAction,
  deleteWilayahAction,
  type WilayahActionState,
} from "@/app/(dashboard)/wilayah/actions";

export type WilayahItem = {
  id: number;
  nama_dusun: string;
  kode_wilayah: string | null;
  created_at: string;
  totalAnggota?: number;
};

export type WilayahManagementProps = {
  currentUserNama: string;
  wilayahList: WilayahItem[];
};

export function WilayahManagementClient({
  currentUserNama,
  wilayahList,
}: WilayahManagementProps) {
  const [search, setSearch] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<WilayahItem | null>(null);

  const [addState, addAction, isAddPending] = useActionState<WilayahActionState, FormData>(
    async (prev: WilayahActionState, formData: FormData) => {
      const res = await createWilayahAction(prev, formData);
      if (res?.success) setIsAddModalOpen(false);
      return res;
    },
    undefined
  );

  const [editState, editAction, isEditPending] = useActionState<WilayahActionState, FormData>(
    async (prev: WilayahActionState, formData: FormData) => {
      const res = await updateWilayahAction(prev, formData);
      if (res?.success) setEditItem(null);
      return res;
    },
    undefined
  );

  const [deleteState, deleteAction, isDeletePending] = useActionState<WilayahActionState, FormData>(
    deleteWilayahAction,
    undefined
  );

  const filtered = wilayahList.filter(
    (w) =>
      w.nama_dusun.toLowerCase().includes(search.toLowerCase()) ||
      (w.kode_wilayah && w.kode_wilayah.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow flex items-center gap-2">
            <MapPin size={14} className="text-sky-700" />
            <span>MASTER DATA WILAYAH</span>
          </div>
          <h1>Daftar Dusun & Wilayah TPS3R</h1>
          <p className="heading-copy">
            Atur cakupan dusun dan kode wilayah layanan pengelolaan sampah desa.
          </p>
        </div>
        <div className="heading-actions">
          <button onClick={() => setIsAddModalOpen(true)} className="primary-button">
            <Plus size={16} /> Tambah Dusun Baru
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

      {/* Search */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 flex items-center gap-3">
        <Search size={18} className="text-gray-400" />
        <input
          type="text"
          placeholder="Cari nama dusun atau kode wilayah..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-transparent border-none text-xs outline-none text-gray-800 placeholder-gray-400"
        />
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-4">Nama Dusun</th>
                <th className="py-3.5 px-4">Kode Wilayah</th>
                <th className="py-3.5 px-4">Warga Terdaftar</th>
                <th className="py-3.5 px-4">Tanggal Dibuat</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-400">
                    Tidak ada dusun yang ditemukan.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <strong className="text-gray-900 block font-semibold">
                        {item.nama_dusun}
                      </strong>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-sky-50 text-sky-800 border border-sky-200">
                        {item.kode_wilayah || "-"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      <span className="flex items-center gap-1">
                        <Users size={13} className="text-gray-400" />
                        {item.totalAnggota ?? 0} warga
                      </span>
                    </td>
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
                          title="Edit Dusun"
                        >
                          <Edit2 size={15} />
                        </button>
                        <form
                          action={deleteAction}
                          onSubmit={(e) => {
                            if (
                              !confirm(
                                `Hapus dusun "${item.nama_dusun}"? Warga di dusun ini tidak akan terhapus namun relasi wilayahnya menjadi kosong.`
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
                            title="Hapus Dusun"
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

      {/* Modal: Tambah Dusun */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-base">Tambah Dusun Baru</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>

            <form action={addAction} className="flex flex-col gap-4 mt-4">
              <label className="flex flex-col gap-1 text-xs font-semibold text-gray-700">
                Nama Dusun
                <input
                  type="text"
                  name="nama_dusun"
                  required
                  placeholder="Contoh: Dusun Karang Anyar"
                  className="border border-gray-300 rounded-lg px-3 py-2 text-xs focus:border-sky-600 outline-none"
                />
              </label>

              <label className="flex flex-col gap-1 text-xs font-semibold text-gray-700">
                Kode Wilayah (Opsional)
                <input
                  type="text"
                  name="kode_wilayah"
                  placeholder="Contoh: DKA"
                  className="border border-gray-300 rounded-lg px-3 py-2 text-xs focus:border-sky-600 outline-none uppercase"
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
                  {isAddPending ? "Menyimpan..." : "Simpan Dusun"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Dusun */}
      {editItem && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-base">Edit Dusun</h3>
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
                Nama Dusun
                <input
                  type="text"
                  name="nama_dusun"
                  required
                  defaultValue={editItem.nama_dusun}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-xs focus:border-sky-600 outline-none"
                />
              </label>

              <label className="flex flex-col gap-1 text-xs font-semibold text-gray-700">
                Kode Wilayah
                <input
                  type="text"
                  name="kode_wilayah"
                  defaultValue={editItem.kode_wilayah || ""}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-xs focus:border-sky-600 outline-none uppercase"
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
                  {isEditPending ? "Menyimpan..." : "Update Dusun"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
