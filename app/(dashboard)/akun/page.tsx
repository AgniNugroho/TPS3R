"use client";

import { useEffect, useState } from "react";
import FormShell from "@/components/dashboard/FormShell";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import EmptyState from "@/components/dashboard/EmptyState";
import { useAuth } from "@/components/providers/AuthProvider";

interface Profile {
  id: string;
  nama_lengkap: string;
  role: string;
}

export default function AkunPage() {
  const { role } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", nama_lengkap: "", role: "pengelola_sampah" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadProfiles();
  }, []);

  async function loadProfiles() {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    setProfiles(data || []);
    setLoading(false);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/akun", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      toast.success("Akun berhasil dibuat!");
      setShowModal(false);
      setForm({ email: "", password: "", nama_lengkap: "", role: "pengelola_sampah" });
      loadProfiles();
    } catch (err: any) {
      toast.error(err.message || "Gagal membuat akun.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus akun ini?")) return;
    try {
      const res = await fetch(`/api/akun?id=${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      toast.success("Akun dihapus!");
      loadProfiles();
    } catch (err: any) {
      toast.error(err.message || "Gagal menghapus akun.");
    }
  }

  if (role !== "super_admin" && role !== null) {
    return (
      <FormShell title="Akses Ditolak" activeLabel="Akun Petugas">
        <main className="content-wrap">
          <div style={{ textAlign: "center", padding: "50px", color: "#dc2626" }}>
            <h2>Hanya Super Admin yang dapat mengakses halaman ini.</h2>
          </div>
        </main>
      </FormShell>
    );
  }

  return (
    <FormShell title="Manajemen Akun" activeLabel="Akun Petugas">
      <main className="content-wrap">
        <div className="page-heading">
          <div>
            <p className="eyebrow"><span className="live-dot" /> PENGATURAN SISTEM</p>
            <h1>Manajemen Akun</h1>
            <p className="heading-copy">Kelola akun untuk petugas TPS3R dan lapangan.</p>
          </div>
          <div className="heading-actions">
            <button className="primary-button" onClick={() => setShowModal(true)}>
              <Plus size={16} /> Buat Akun Baru
            </button>
          </div>
        </div>

        <div className="panel">
          {loading ? (
            <p style={{ textAlign: "center", padding: "20px", color: "#8b9994", fontSize: "12px" }}>Memuat data akun...</p>
          ) : profiles.length === 0 ? (
            <EmptyState title="Belum Ada Akun" description="Klik Buat Akun Baru untuk mendaftarkan petugas." />
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--line)", color: "#8b9994", textAlign: "left" }}>
                    <th style={{ padding: "10px", fontWeight: 600 }}>Nama Lengkap</th>
                    <th style={{ padding: "10px", fontWeight: 600 }}>Role / Hak Akses</th>
                    <th style={{ padding: "10px", fontWeight: 600, textAlign: "right" }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {profiles.map(p => (
                    <tr key={p.id} style={{ borderBottom: "1px solid #eef2ef" }}>
                      <td style={{ padding: "10px", fontWeight: 600 }}>{p.nama_lengkap}</td>
                      <td style={{ padding: "10px" }}>
                        <span style={{ 
                          padding: "3px 8px", borderRadius: "4px", fontSize: "10px", fontWeight: 700,
                          backgroundColor: p.role === "super_admin" ? "#eaf7ef" : p.role === "pengelola_tps3r" ? "#fff0de" : "#e0f2fe",
                          color: p.role === "super_admin" ? "#4ca67d" : p.role === "pengelola_tps3r" ? "#c2783a" : "#0284c7"
                        }}>
                          {p.role === "super_admin" ? "Super Admin" : p.role === "pengelola_tps3r" ? "Pengelola TPS3R" : "Petugas Lapangan"}
                        </span>
                      </td>
                      <td style={{ padding: "10px", textAlign: "right" }}>
                        {p.role !== "super_admin" && (
                          <button onClick={() => handleDelete(p.id)} style={{ border: "none", background: "none", color: "#dc2626", cursor: "pointer" }}>
                            <Trash2 size={16} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Modal */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(10,15,13,0.3)", backdropFilter: "blur(2px)" }}>
          <div style={{ background: "white", width: "100%", maxWidth: "400px", borderRadius: "14px", padding: "20px" }}>
            <h3 style={{ fontSize: "16px", marginBottom: "16px" }}>Buat Akun Petugas</h3>
            <form onSubmit={handleAdd} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <input required type="text" placeholder="Nama Lengkap" value={form.nama_lengkap} onChange={e => setForm({ ...form, nama_lengkap: e.target.value })} style={{ padding: "10px", borderRadius: "8px", border: "1px solid var(--line)", fontSize: "12px" }} />
              <input required type="email" placeholder="Email Login" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} style={{ padding: "10px", borderRadius: "8px", border: "1px solid var(--line)", fontSize: "12px" }} />
              <input required type="password" placeholder="Password (Min 6 Karakter)" minLength={6} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} style={{ padding: "10px", borderRadius: "8px", border: "1px solid var(--line)", fontSize: "12px" }} />
              
              <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} style={{ padding: "10px", borderRadius: "8px", border: "1px solid var(--line)", fontSize: "12px" }}>
                <option value="pengelola_sampah">Pengelola Sampah (Petugas Lapangan)</option>
                <option value="pengelola_tps3r">Pengelola TPS3R (Keuangan & Dasbor)</option>
                <option value="super_admin">Super Admin (IT/Pimpinan)</option>
              </select>

              <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, padding: "10px", border: "1px solid var(--line)", borderRadius: "8px", background: "white", cursor: "pointer", fontSize: "12px" }}>Batal</button>
                <button type="submit" disabled={submitting} className="primary-button" style={{ flex: 1, justifyContent: "center", fontSize: "12px" }}>{submitting ? "Membuat..." : "Simpan"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </FormShell>
  );
}
