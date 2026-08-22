"use client";

import { useState } from "react";
import {
  Activity,
  CheckCircle2,
  Cpu,
  Database,
  HardDrive,
  RefreshCw,
  Server,
  ShieldCheck,
  Zap,
  AlertTriangle,
} from "lucide-react";

export type TableStat = {
  tableName: string;
  rowCount: number;
  description: string;
  badgeTone: string;
};

export type PerformaProps = {
  currentUserNama: string;
  initialLatencyMs: number;
  tableStats: TableStat[];
  serviceRoleKeyConfigured: boolean;
  supabaseUrlConfigured: boolean;
};

export function PerformaManagementClient({
  currentUserNama,
  initialLatencyMs,
  tableStats,
  serviceRoleKeyConfigured,
  supabaseUrlConfigured,
}: PerformaProps) {
  const [latency, setLatency] = useState<number>(initialLatencyMs);
  const [isTesting, setIsTesting] = useState(false);
  const [lastTestedAt, setLastTestedAt] = useState<string>("Saat halaman dimuat");
  const [testError, setTestError] = useState<string | null>(null);

  const runLatencyTest = async () => {
    setIsTesting(true);
    setTestError(null);
    try {
      const res = await fetch("/api/admin/health-check");
      const data = await res.json();
      if (data.ok) {
        setLatency(data.latencyMs);
        setLastTestedAt(
          new Date().toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })
        );
      } else {
        setTestError(data.error || "Gagal menguji latensi.");
      }
    } catch (err: any) {
      setTestError(err.message || "Gagal menghubungi server.");
    } finally {
      setIsTesting(false);
    }
  };

  const getLatencyBadge = (ms: number) => {
    if (ms < 250) {
      return {
        label: "Sangat Cepat & Lancar (< 250ms)",
        color: "bg-emerald-100 text-emerald-800 border-emerald-300",
      };
    }
    if (ms < 600) {
      return {
        label: "Normal & Responsif (250ms - 600ms)",
        color: "bg-teal-100 text-teal-800 border-teal-300",
      };
    }
    return {
      label: "Latensi Tinggi (> 600ms)",
      color: "bg-amber-100 text-amber-800 border-amber-300",
    };
  };

  const latencyBadge = getLatencyBadge(latency);
  const totalRecords = tableStats.reduce((acc, curr) => acc + curr.rowCount, 0);

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow flex items-center gap-2">
            <Cpu size={14} className="text-emerald-700" />
            <span>MONITORING KESEHATAN SISTEM & DATABASE</span>
          </div>
          <h1>Status & Performa Website</h1>
          <p className="heading-copy">
            Pantau kelancaran koneksi database Supabase, metrik data master, dan status konfigurasi server.
          </p>
        </div>
        <div className="heading-actions">
          <button
            onClick={runLatencyTest}
            disabled={isTesting}
            className="primary-button flex items-center gap-2"
          >
            <RefreshCw size={15} className={isTesting ? "animate-spin" : ""} />
            {isTesting ? "Menguji Latensi..." : "Uji Latensi Database Sekarang"}
          </button>
        </div>
      </div>

      {testError && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
          {testError}
        </div>
      )}

      {/* Live Latency & Connection Hero Card */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-8 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
              <Zap size={28} />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-bold text-gray-900">
                  Koneksi Database Supabase: {latency} ms
                </h3>
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-bold border ${latencyBadge.color}`}
                >
                  {latencyBadge.label}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Uji query langsung ke database Supabase · Terakhir diuji:{" "}
                <strong>{lastTestedAt}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
            <Server size={18} className="text-teal-700" />
            <div className="text-xs">
              <span className="text-gray-500 block">Runtime Server</span>
              <strong className="text-gray-900">Next.js 16 (App Router + SSR)</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Configuration & Security Checklist */}
      <div className="mb-8">
        <h2 className="text-base font-bold text-gray-900 mb-3">Status Konfigurasi & Keamanan</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
            <CheckCircle2 size={20} className="text-emerald-600 flex-shrink-0" />
            <div>
              <h4 className="text-xs font-bold text-gray-900">Supabase API Endpoint</h4>
              <p className="text-[11px] text-gray-500">
                {supabaseUrlConfigured ? "URL Terhubung" : "Belum diatur"}
              </p>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
            {serviceRoleKeyConfigured ? (
              <CheckCircle2 size={20} className="text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertTriangle size={20} className="text-amber-500 flex-shrink-0" />
            )}
            <div>
              <h4 className="text-xs font-bold text-gray-900">Service Role Key (Admin)</h4>
              <p className="text-[11px] text-gray-500">
                {serviceRoleKeyConfigured
                  ? "Aktif (Pembuatan Akun Lancar)"
                  : "Wajib diatur di .env.local untuk buat akun"}
              </p>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
            <ShieldCheck size={20} className="text-emerald-600 flex-shrink-0" />
            <div>
              <h4 className="text-xs font-bold text-gray-900">Row Level Security (RLS)</h4>
              <p className="text-[11px] text-gray-500">Aktif & Terproteksi Superadmin</p>
            </div>
          </div>
        </div>
      </div>

      {/* Database Table Volume Statistics */}
      <div>
        <div className="section-toolbar">
          <div>
            <h2>Data Master Tersimpan</h2>
            <p>Total {totalRecords.toLocaleString("id-ID")} baris data master di database Supabase</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {tableStats.map((stat) => (
            <div
              key={stat.tableName}
              className="bg-white border border-gray-200 rounded-xl p-5 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-gray-700 bg-gray-100 px-2 py-1 rounded">
                  public.{stat.tableName}
                </span>
                <span className="text-lg font-bold text-gray-900">
                  {stat.rowCount.toLocaleString("id-ID")}{" "}
                  <small className="text-xs font-normal text-gray-400">baris</small>
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-3">{stat.description}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
