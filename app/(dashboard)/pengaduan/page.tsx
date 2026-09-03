"use client";

import { useEffect, useState } from "react";
import FormShell from "@/components/dashboard/FormShell";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/providers/AuthProvider";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import EmptyState from "@/components/dashboard/EmptyState";
import { MessageSquareWarning, CheckCircle, Clock } from "lucide-react";

interface Pengaduan {
  id: string;
  nama_pelapor: string;
  kategori: string;
  deskripsi: string;
  status: string;
  created_at: string;
}

export default function PengaduanPage() {
  const { role } = useAuth();
  const router = useRouter();
  
  const [data, setData] = useState<Pengaduan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (role === "pengelola_sampah") {
      router.replace("/pengumpulan");
      return;
    }
    fetchData();
  }, [role, router]);

  async function fetchData() {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { data: records, error } = await supabase
      .from("pengaduan")
      .select("*")
      .order("created_at", { ascending: false });
      
    if (error) {
      toast.error("Gagal memuat data pengaduan");
    } else {
      setData(records || []);
    }
    setLoading(false);
  }

  async function updateStatus(id: string, newStatus: string) {
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase
      .from("pengaduan")
      .update({ status: newStatus })
      .eq("id", id);
      
    if (error) {
      toast.error("Gagal memperbarui status");
    } else {
      toast.success(`Status diubah menjadi ${newStatus}`);
      setData(data.map(item => item.id === id ? { ...item, status: newStatus } : item));
    }
  }

  const getStatusBadge = (status: string) => {
    if (status === "Diterima") return <span style={{ padding: "4px 8px", borderRadius: "4px", fontSize: "10px", fontWeight: 700, backgroundColor: "#fee2e2", color: "#b91c1c" }}>Diterima</span>;
    if (status === "Selesai") return <span style={{ padding: "4px 8px", borderRadius: "4px", fontSize: "10px", fontWeight: 700, backgroundColor: "#dcfce7", color: "#15803d" }}>Selesai</span>;
    return <span style={{ padding: "4px 8px", borderRadius: "4px", fontSize: "10px", fontWeight: 700, backgroundColor: "#fef3c7", color: "#b45309" }}>{status}</span>;
  };

  return (
    <FormShell title="Daftar Pengaduan" activeLabel="Pengaduan">
      <main className="content-wrap">
        <div className="page-heading">
          <div>
            <p className="eyebrow"><span className="live-dot" /> KELUHAN WARGA</p>
            <h1>Daftar Pengaduan</h1>
            <p className="heading-copy">Pantau dan tindaklanjuti laporan keluhan dari warga desa.</p>
          </div>
        </div>

        <div className="panel">
          {loading ? (
            <p style={{ textAlign: "center", padding: "20px", color: "#8b9994", fontSize: "12px" }}>Memuat pengaduan...</p>
          ) : data.length === 0 ? (
            <EmptyState title="Belum Ada Laporan" description="Belum ada keluhan atau laporan dari warga." />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {data.map((item) => (
                <div key={item.id} style={{ border: "1px solid var(--line)", borderRadius: "12px", padding: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                    <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                      <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "var(--lime)", color: "var(--teal)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <MessageSquareWarning size={18} />
                      </div>
                      <div>
                        <h3 style={{ fontSize: "14px", fontWeight: 700, color: "var(--teal)", marginBottom: "2px" }}>{item.kategori}</h3>
                        <p style={{ fontSize: "11px", color: "#71807b" }}>Oleh: <strong>{item.nama_pelapor || "Warga Anonim"}</strong> • {new Date(item.created_at).toLocaleDateString("id-ID")}</p>
                      </div>
                    </div>
                    <div>
                      {getStatusBadge(item.status)}
                    </div>
                  </div>
                  
                  <div style={{ background: "#f8faf9", padding: "12px", borderRadius: "8px", fontSize: "13px", color: "#4a5a55", lineHeight: 1.5, marginBottom: "16px" }}>
                    {item.deskripsi}
                  </div>
                  
                  <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                    <button 
                      disabled={item.status === "Sedang Diproses"}
                      onClick={() => updateStatus(item.id, "Sedang Diproses")}
                      style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #fcd34d", background: item.status === "Sedang Diproses" ? "#fef3c7" : "white", color: "#b45309", fontSize: "11px", fontWeight: 600, cursor: item.status === "Sedang Diproses" ? "default" : "pointer", display: "flex", alignItems: "center", gap: "6px", opacity: item.status === "Sedang Diproses" ? 0.5 : 1 }}
                    >
                      <Clock size={14} /> Proses Laporan
                    </button>
                    <button 
                      disabled={item.status === "Selesai"}
                      onClick={() => updateStatus(item.id, "Selesai")}
                      style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #86efac", background: item.status === "Selesai" ? "#dcfce7" : "white", color: "#15803d", fontSize: "11px", fontWeight: 600, cursor: item.status === "Selesai" ? "default" : "pointer", display: "flex", alignItems: "center", gap: "6px", opacity: item.status === "Selesai" ? 0.5 : 1 }}
                    >
                      <CheckCircle size={14} /> Tandai Selesai
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </FormShell>
  );
}
