"use client";

import { useState, useActionState } from "react";
import {
  KeyRound,
  Plus,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import {
  createPetugasAction,
  deletePetugasAction,
  resetPasswordAction,
  updateRoleAction,
  type AccountActionState,
} from "@/app/(dashboard)/petugas/actions";

export type PetugasItem = {
  id: string;
  nama: string;
  email: string;
  role: "superadmin" | "petugas";
  created_at: string;
};

export type PetugasManagementClientProps = {
  currentUserNama: string;
  currentUserId: string;
  petugasList: PetugasItem[];
};

export function PetugasManagementClient({
  currentUserNama,
  currentUserId,
  petugasList,
}: PetugasManagementClientProps) {
  const [search, setSearch] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [resetModalUser, setResetModalUser] = useState<PetugasItem | null>(null);

  const [addState, addAction, isAddPending] = useActionState<AccountActionState, FormData>(
    async (prev: AccountActionState, formData: FormData) => {
      const res = await createPetugasAction(prev, formData);
      if (res?.success) {
        setIsAddModalOpen(false);
      }
      return res;
    },
    undefined
  );

  const [deleteState, deleteAction, isDeletePending] = useActionState<AccountActionState, FormData>(
    deletePetugasAction,
    undefined
  );

  const [resetState, resetAction, isResetPending] = useActionState<AccountActionState, FormData>(
    async (prev: AccountActionState, formData: FormData) => {
      const res = await resetPasswordAction(prev, formData);
      if (res?.success) {
        setResetModalUser(null);
      }
      return res;
    },
    undefined
  );

  const [roleState, roleAction, isRolePending] = useActionState<AccountActionState, FormData>(
    updateRoleAction,
    undefined
  );

  const filtered = petugasList.filter(
    (p) =>
      p.nama.toLowerCase().includes(search.toLowerCase()) ||
      p.email.toLowerCase().includes(search.toLowerCase())
  );

  const totalSuperadmin = petugasList.filter((p) => p.role === "superadmin").length;
  const totalPetugas = petugasList.filter((p) => p.role === "petugas").length;

  return (
    <>
      {/* Heading */}
      <div className="page-heading">
        <div>
          <div className="eyebrow flex items-center gap-2">
            <ShieldCheck size={14} className="text-emerald-700" />
            <span>MANAJEMEN AKUN & PETUGAS LAPANGAN</span>
          </div>
          <h1>Daftar Akun TPS3R</h1>
          <p className="heading-copy">
            Sistem ini tanpa registrasi publik. Semua akun dibuat langsung oleh Super Admin.
          </p>
        </div>
        <div className="heading-actions">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="primary-button"
          >
            <UserPlus size={16} /> Buat Akun Baru
          </button>
        </div>
      </div>

      {/* Global Alert Notification */}
      {(addState?.error || deleteState?.error || resetState?.error || roleState?.error) && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
          {addState?.error || deleteState?.error || resetState?.error || roleState?.error}
        </div>
      )}
      {(addState?.message || deleteState?.message || resetState?.message || roleState?.message) && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
          {addState?.message || deleteState?.message || resetState?.message || roleState?.message}
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 font-medium">Total Akun Terdaftar</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">{petugasList.length}</h3>
          </div>
          <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
            <Users size={20} />
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 font-medium">Petugas Lapangan</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">{totalPetugas}</h3>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <UserCheck size={20} />
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 font-medium">Super Admin</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">{totalSuperadmin}</h3>
          </div>
          <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
            <ShieldCheck size={20} />
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 flex items-center gap-3">
        <Search size={18} className="text-gray-400" />
        <input
          type="text"
          placeholder="Cari berdasarkan nama atau email petugas..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-transparent border-none text-xs outline-none text-gray-800 placeholder-gray-400"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            Bersihkan
          </button>
        )}
      </div>

      {/* Table List */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-4">Pengguna</th>
                <th className="py-3.5 px-4">Email</th>
                <th className="py-3.5 px-4">Role Akses</th>
                <th className="py-3.5 px-4">Tanggal Dibuat</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-400">
                    Tidak ada data petugas yang cocok dengan pencarian.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const isSelf = item.id === currentUserId;
                  return (
                    <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-800 font-bold text-xs flex items-center justify-center">
                            {item.nama.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <strong className="text-gray-900 block font-semibold">
                              {item.nama}
                            </strong>
                            {isSelf && (
                              <span className="text-[10px] text-teal-700 font-bold">
                                (Akun Anda)
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-600">{item.email}</td>
                      <td className="py-3 px-4">
                        <form action={roleAction} className="inline-flex items-center gap-2">
                          <input type="hidden" name="userId" value={item.id} />
                          <select
                            name="role"
                            defaultValue={item.role}
                            disabled={isSelf || isRolePending}
                            onChange={(e) => {
                              if (confirm(`Ubah role ${item.nama} menjadi ${e.target.value}?`)) {
                                e.currentTarget.form?.requestSubmit();
                              } else {
                                e.currentTarget.value = item.role;
                              }
                            }}
                            className={`text-[11px] font-bold px-2 py-1 rounded-md border outline-none cursor-pointer ${
                              item.role === "superadmin"
                                ? "bg-purple-50 text-purple-800 border-purple-200"
                                : "bg-teal-50 text-teal-800 border-teal-200"
                            }`}
                          >
                            <option value="petugas">Petugas</option>
                            <option value="superadmin">Super Admin</option>
                          </select>
                        </form>
                      </td>
                      <td className="py-3 px-4 text-gray-500">
                        {item.created_at
                          ? new Date(item.created_at).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })
                          : "-"}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          {/* Reset Password Button */}
                          <button
                            type="button"
                            onClick={() => setResetModalUser(item)}
                            className="px-2.5 py-1 rounded text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 flex items-center gap-1 transition-colors"
                            title="Reset Password Akun"
                          >
                            <KeyRound size={13} />
                            <span>Reset PW</span>
                          </button>

                          {/* Delete User Button */}
                          {!isSelf && (
                            <form
                              action={deleteAction}
                              onSubmit={(e) => {
                                if (
                                  !confirm(
                                    `Yakin ingin menghapus akun "${item.nama}" (${item.email})? Akun ini tidak akan dapat login lagi.`
                                  )
                                ) {
                                  e.preventDefault();
                                }
                              }}
                            >
                              <input type="hidden" name="userId" value={item.id} />
                              <button
                                type="submit"
                                disabled={isDeletePending}
                                className="p-1.5 rounded text-red-600 hover:bg-red-50 transition-colors"
                                title="Hapus Akun"
                              >
                                <Trash2 size={15} />
                              </button>
                            </form>
                          )}
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

      {/* Modal: Tambah Akun Baru */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <UserPlus size={20} className="text-teal-700" />
                <h3 className="font-bold text-gray-900 text-base">Buat Akun Petugas Baru</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>

            <form action={addAction} className="flex flex-col gap-4 mt-4">
              <label className="flex flex-col gap-1 text-xs font-semibold text-gray-700">
                Nama Lengkap Petugas
                <input
                  type="text"
                  name="nama"
                  required
                  placeholder="Contoh: Budi Santoso"
                  className="border border-gray-300 rounded-lg px-3 py-2 text-xs focus:border-teal-600 outline-none"
                />
              </label>

              <label className="flex flex-col gap-1 text-xs font-semibold text-gray-700">
                Alamat Email (Digunakan untuk Login)
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="petugas@tps3r.desa.id"
                  className="border border-gray-300 rounded-lg px-3 py-2 text-xs focus:border-teal-600 outline-none"
                />
              </label>

              <label className="flex flex-col gap-1 text-xs font-semibold text-gray-700">
                Password Baru
                <input
                  type="password"
                  name="password"
                  required
                  minLength={6}
                  placeholder="Minimal 6 karakter"
                  className="border border-gray-300 rounded-lg px-3 py-2 text-xs focus:border-teal-600 outline-none"
                />
              </label>

              <label className="flex flex-col gap-1 text-xs font-semibold text-gray-700">
                Peran / Role
                <select
                  name="role"
                  defaultValue="petugas"
                  className="border border-gray-300 rounded-lg px-3 py-2 text-xs focus:border-teal-600 outline-none bg-white"
                >
                  <option value="petugas">Petugas Lapangan (Input & Laporan)</option>
                  <option value="superadmin">Super Admin (Kontrol Penuh Database)</option>
                </select>
              </label>

              {addState?.error && (
                <p className="text-xs text-red-600 font-medium">{addState.error}</p>
              )}

              <div className="flex gap-2 justify-end mt-4 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="secondary-button"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isAddPending}
                  className="primary-button"
                >
                  {isAddPending ? "Menyimpan..." : "Buat Akun"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Reset Password */}
      {resetModalUser && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <KeyRound size={20} className="text-amber-600" />
                <h3 className="font-bold text-gray-900 text-base">Reset Password Akun</h3>
              </div>
              <button
                onClick={() => setResetModalUser(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>

            <form action={resetAction} className="flex flex-col gap-4 mt-4">
              <input type="hidden" name="userId" value={resetModalUser.id} />
              <p className="text-xs text-gray-600">
                Set password baru untuk akun <strong>{resetModalUser.nama}</strong> (
                {resetModalUser.email}).
              </p>

              <label className="flex flex-col gap-1 text-xs font-semibold text-gray-700">
                Password Baru
                <input
                  type="password"
                  name="newPassword"
                  required
                  minLength={6}
                  placeholder="Masukkan password baru minimal 6 karakter"
                  className="border border-gray-300 rounded-lg px-3 py-2 text-xs focus:border-amber-600 outline-none"
                />
              </label>

              {resetState?.error && (
                <p className="text-xs text-red-600 font-medium">{resetState.error}</p>
              )}

              <div className="flex gap-2 justify-end mt-4 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setResetModalUser(null)}
                  className="secondary-button"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isResetPending}
                  className="primary-button !bg-amber-600 hover:!bg-amber-700"
                >
                  {isResetPending ? "Memproses..." : "Simpan Password Baru"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
