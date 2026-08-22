"use client";

import { useActionState } from "react";
import { Leaf, Lock, Mail, ShieldCheck } from "lucide-react";
import { login } from "./actions";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, undefined);

  return (
    <main className="min-h-screen bg-[#f4f7f4] flex items-center justify-center p-4">
      <div className="bg-white border border-gray-200 rounded-2xl max-w-md w-full p-8 shadow-xl">
        {/* Brand */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-xl bg-[#cce77e] text-[#155b4d] flex items-center justify-center -rotate-6 shadow-xs">
            <Leaf size={24} />
          </div>
          <div>
            <h1 className="font-extrabold text-lg tracking-tight text-gray-900 leading-none">
              TPS3R DIGITAL
            </h1>
            <p className="text-[10px] text-gray-500 tracking-wider mt-1 uppercase font-bold">
              Desa Banyubiru
            </p>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-bold text-gray-900">Masuk ke Sistem</h2>
          <p className="text-xs text-gray-500 mt-1">
            Gunakan akun Petugas atau Superadmin yang telah didaftarkan.
          </p>
        </div>

        <form action={formAction} className="flex flex-col gap-4 mt-6">
          <label className="flex flex-col gap-1 text-xs font-semibold text-gray-700">
            Email
            <div className="relative flex items-center">
              <Mail size={16} className="absolute left-3 text-gray-400" />
              <input
                type="email"
                name="email"
                required
                placeholder="nama@tps3r.desa.id"
                className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg text-xs focus:border-[#0b8f82] focus:ring-1 focus:ring-[#0b8f82] outline-none transition-all"
              />
            </div>
          </label>

          <label className="flex flex-col gap-1 text-xs font-semibold text-gray-700">
            Password
            <div className="relative flex items-center">
              <Lock size={16} className="absolute left-3 text-gray-400" />
              <input
                type="password"
                name="password"
                required
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg text-xs focus:border-[#0b8f82] focus:ring-1 focus:ring-[#0b8f82] outline-none transition-all"
              />
            </div>
          </label>

          {state?.error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600 font-medium">
              {state.error}
            </div>
          )}

          <button
            type="submit"
            disabled={pending}
            className="primary-button justify-center py-2.5 mt-2 text-xs disabled:opacity-60 cursor-pointer shadow-md"
          >
            {pending ? "Memverifikasi..." : "Masuk"}
          </button>
        </form>

        <div className="mt-8 pt-4 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
          <span className="flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-teal-600" /> Akun Dikelola Super Admin
          </span>
          <span>v1.0.0</span>
        </div>
      </div>
    </main>
  );
}
