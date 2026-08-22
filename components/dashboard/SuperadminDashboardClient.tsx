"use client";

import Link from "next/link";
import {
  ArrowRight,
  Cpu,
  Database,
  MapPin,
  ShieldCheck,
  UserPlus,
  Users,
  Zap,
} from "lucide-react";

export type SuperadminDashboardProps = {
  profileNama: string;
  role: "superadmin" | "petugas";
  counts: {
    totalPetugas: number;
    totalSuperadmin: number;
    totalAnggota: number;
    totalWilayah: number;
  };
  dbLatencyMs: number;
  recentPetugas: Array<{
    id: string;
    nama: string;
    email: string;
    role: string;
    created_at?: string;
  }>;
};

export function SuperadminDashboardClient({
  profileNama,
  counts,
  dbLatencyMs,
  recentPetugas,
}: SuperadminDashboardProps) {
  return (
    <>
      {/* Page Heading */}
      <div className="page-heading">
        <div>
          <div className="eyebrow flex items-center gap-2">
            <span className="live-dot" />
            <span className="font-semibold text-emerald-800 tracking-wider">
              PORTAL SUPERADMIN · KONTROL DATABASE & PERFORMA SISTEM
            </span>
          </div>
          <h1>Halo, {profileNama}</h1>
          <p className="heading-copy">
            Kelola akun petugas TPS3R, master data dusun/warga, dan pantau kelancaran performa website.
          </p>
        </div>
        <div className="heading-actions flex-wrap">
          <Link href="/petugas" className="primary-button">
            <UserPlus size={16} /> Buat Akun Petugas
          </Link>
          <Link href="/performa" className="secondary-button">
            <Cpu size={16} /> Cek Performa
          </Link>
        </div>
      </div>

      {/* Database Health Hero Card */}
      <div className="mb-8 p-5 rounded-2xl border border-emerald-200 bg-white shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
            <Database size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base text-gray-900">
                Status Database Supabase
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                Online & Lancar
              </span>
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Latensi respons: <strong className="text-emerald-700">{dbLatencyMs} ms</strong> · Akses manajemen database aktif
            </p>
          </div>
        </div>
        <Link
          href="/performa"
          className="text-xs font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1.5 bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-300 shadow-xs"
        >
          Uji & Pantau Performa <ArrowRight size={14} />
        </Link>
      </div>

      {/* Key Stats Grid */}
      <section className="stat-grid">
        <article className="stat-card teal">
          <div className="stat-top">
            <div>
              <p>Akun Pengguna</p>
              <h2>
                {counts.totalPetugas + counts.totalSuperadmin}
                <small>akun</small>
              </h2>
            </div>
            <div className="stat-icon">
              <ShieldCheck size={20} />
            </div>
          </div>
          <div className="stat-note up flex justify-between items-center">
            <span>{counts.totalPetugas} Petugas · {counts.totalSuperadmin} Superadmin</span>
            <Link href="/petugas" className="text-xs font-bold text-teal-700 hover:underline">
              Kelola &rarr;
            </Link>
          </div>
        </article>

        <article className="stat-card blue">
          <div className="stat-top">
            <div>
              <p>Dusun / Wilayah</p>
              <h2>
                {counts.totalWilayah}
                <small>dusun</small>
              </h2>
            </div>
            <div className="stat-icon">
              <MapPin size={20} />
            </div>
          </div>
          <div className="stat-note up flex justify-between items-center">
            <span>Cakupan layanan TPS3R</span>
            <Link href="/wilayah" className="text-xs font-bold text-sky-700 hover:underline">
              Atur &rarr;
            </Link>
          </div>
        </article>

        <article className="stat-card lime">
          <div className="stat-top">
            <div>
              <p>Warga / Anggota Terdaftar</p>
              <h2>
                {counts.totalAnggota}
                <small>orang</small>
              </h2>
            </div>
            <div className="stat-icon">
              <Users size={20} />
            </div>
          </div>
          <div className="stat-note up flex justify-between items-center">
            <span>Terdata di sistem</span>
            <Link href="/anggota" className="text-xs font-bold text-emerald-800 hover:underline">
              Kelola &rarr;
            </Link>
          </div>
        </article>

        <article className="stat-card amber">
          <div className="stat-top">
            <div>
              <p>Performa Website</p>
              <h2>
                {dbLatencyMs}
                <small>ms</small>
              </h2>
            </div>
            <div className="stat-icon">
              <Zap size={20} />
            </div>
          </div>
          <div className="stat-note up flex justify-between items-center">
            <span>Koneksi responsif</span>
            <Link href="/performa" className="text-xs font-bold text-amber-800 hover:underline">
              Detail &rarr;
            </Link>
          </div>
        </article>
      </section>

      {/* Master Management Cards Grid */}
      <div className="mt-8">
        <div className="section-toolbar">
          <div>
            <h2>Modul Pengelolaan Superadmin</h2>
            <p>Kelola seluruh akun dan master data langsung tanpa membuka Supabase manual</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1: Akun & Petugas */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-md transition-shadow flex flex-col justify-between">
            <div>
              <div className="w-11 h-11 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center mb-4">
                <UserPlus size={22} />
              </div>
              <h3 className="font-bold text-gray-900 text-sm">Kelola Akun & Petugas TPS3R</h3>
              <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                Buat akun baru untuk orang TPS3R (sistem tanpa registrasi publik), reset password akun, dan atur hak akses.
              </p>
            </div>
            <Link
              href="/petugas"
              className="mt-5 inline-flex items-center gap-1.5 text-xs font-bold text-teal-700 hover:text-teal-900"
            >
              Buka Manajemen Akun &rarr;
            </Link>
          </div>

          {/* Card 2: Dusun / Wilayah */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-md transition-shadow flex flex-col justify-between">
            <div>
              <div className="w-11 h-11 rounded-xl bg-sky-100 text-sky-800 flex items-center justify-center mb-4">
                <MapPin size={22} />
              </div>
              <h3 className="font-bold text-gray-900 text-sm">Master Wilayah & Dusun</h3>
              <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                Tambah, edit, atau hapus nama dusun dan kode wilayah layanan pengelolaan TPS3R desa.
              </p>
            </div>
            <Link
              href="/wilayah"
              className="mt-5 inline-flex items-center gap-1.5 text-xs font-bold text-sky-700 hover:text-sky-900"
            >
              Buka Master Wilayah &rarr;
            </Link>
          </div>

          {/* Card 3: Warga / Anggota */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-md transition-shadow flex flex-col justify-between">
            <div>
              <div className="w-11 h-11 rounded-xl bg-lime-100 text-lime-800 flex items-center justify-center mb-4">
                <Users size={22} />
              </div>
              <h3 className="font-bold text-gray-900 text-sm">Master Warga & Anggota</h3>
              <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                Daftarkan warga baru, ubah dusun/alamat, atau hapus data anggota nasabah TPS3R.
              </p>
            </div>
            <Link
              href="/anggota"
              className="mt-5 inline-flex items-center gap-1.5 text-xs font-bold text-lime-800 hover:text-lime-950"
            >
              Buka Master Anggota &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Accounts List */}
      <div className="panel mt-8">
        <div className="panel-heading">
          <div>
            <h3>Daftar Akun Pengguna Aktif</h3>
            <p>Akun yang telah dibuat oleh Superadmin di sistem</p>
          </div>
          <Link href="/petugas" className="text-xs font-bold text-teal-700 hover:underline">
            Kelola Semua Akun
          </Link>
        </div>

        <div className="divide-y divide-gray-100 mt-4">
          {recentPetugas.map((p) => (
            <div key={p.id} className="py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-teal-100 text-teal-900 font-bold text-xs flex items-center justify-center">
                  {p.nama.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <strong className="text-xs text-gray-900 block">{p.nama}</strong>
                  <span className="text-[11px] text-gray-500">{p.email}</span>
                </div>
              </div>
              <span
                className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                  p.role === "superadmin"
                    ? "bg-purple-100 text-purple-800 border border-purple-200"
                    : "bg-teal-100 text-teal-800 border border-teal-200"
                }`}
              >
                {p.role === "superadmin" ? "Super Admin" : "Petugas TPS3R"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
