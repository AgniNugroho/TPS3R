"use client";

import { FormEvent, useState } from "react";
import { Send, CheckCircle2, AlertTriangle, Leaf } from "lucide-react";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type FormState = "idle" | "submitting" | "success" | "error";

const KATEGORI_OPTIONS = [
  { value: "Polusi Asap (Insinerator/Warga)", label: "🌫️ Polusi Asap (Insinerator/Warga)" },
  { value: "Bau Tidak Sedap dari TPS3R", label: "👃 Bau Tidak Sedap dari TPS3R" },
  { value: "Pembuangan Sampah ke Sungai", label: "🚯 Pembuangan Sampah ke Sungai" },
  { value: "Keterlambatan Jadwal", label: "🕐 Keterlambatan Jadwal" },
  { value: "Lainnya", label: "📋 Lainnya (Jelaskan di deskripsi)" },
];

interface FormValues {
  nama_pelapor: string;
  no_hp: string;
  alamat: string;
  kategori: string;
  deskripsi: string;
}

const initialForm: FormValues = {
  nama_pelapor: "",
  no_hp: "",
  alamat: "",
  kategori: "",
  deskripsi: "",
};

export default function PublikPage() {
  const [form, setForm] = useState<FormValues>(initialForm);
  const [state, setState] = useState<FormState>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  function set(field: keyof FormValues, value: string) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("submitting");
    setErrorMsg("");
    
    try {
      const supabase = getSupabaseBrowserClient();
      const payload = {
        nama_pelapor: form.nama_pelapor,
        kategori: form.kategori,
        deskripsi: form.deskripsi
      };

      const { error } = await supabase.from("pengaduan").insert(payload);
      if (error) { 
        setState("error"); 
        setErrorMsg(error.message || "Pengaduan gagal dikirim."); 
        return; 
      }
      
      setState("success");
      setForm(initialForm);
    } catch (err: any) {
      setState("error");
      setErrorMsg("Terjadi kesalahan koneksi. Coba lagi.");
    }
  }

  // ── Success screen ────────────────────────────────────────────────────
  if (state === "success") {
    return (
      <div style={{ minHeight: "100vh", background: "var(--background)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
        <div style={{ background: "white", borderRadius: "14px", padding: "40px 30px", maxWidth: "420px", width: "100%", textAlign: "center", boxShadow: "0 10px 40px rgba(0,0,0,0.08)" }}>
          <CheckCircle2 size={52} color="#0b8f82" style={{ margin: "0 auto 16px" }} />
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "22px", marginBottom: "10px" }}>
            Laporan Terkirim!
          </h2>
          <p style={{ color: "#71807b", fontSize: "13px", lineHeight: 1.6, marginBottom: "24px" }}>
            Terima kasih atas laporan Anda. Tim TPS3R BUMDes Banyubiru akan menindaklanjuti
            secepatnya. Anda akan dihubungi jika diperlukan keterangan tambahan.
          </p>
          <button onClick={() => setState("idle")} className="primary-button" style={{ width: "100%", justifyContent: "center" }}>
            Kirim Laporan Lain
          </button>
        </div>
      </div>
    );
  }

  // ── Form ──────────────────────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "11px 12px", borderRadius: "8px",
    border: "1px solid var(--line)", fontSize: "13px", outline: "none",
    background: "white"
  };
  const labelStyle: React.CSSProperties = {
    display: "flex", flexDirection: "column", gap: "6px",
    fontSize: "12px", fontWeight: 600, color: "#4a5a55"
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--background)", padding: "24px 16px" }}>
      {/* Header */}
      <div style={{ maxWidth: "520px", margin: "0 auto 20px", display: "flex", alignItems: "center", gap: "12px" }}>
        <div className="brand-mark" style={{ width: "36px", height: "36px", borderRadius: "10px 10px 10px 3px", background: "var(--lime)", color: "#155b4d", display: "grid", placeItems: "center", transform: "rotate(-8deg)", flexShrink: 0 }}>
          <Leaf size={19} />
        </div>
        <div>
          <p style={{ fontFamily: "var(--font-display)", fontSize: "14px", fontWeight: 800, lineHeight: 1.2 }}>TPS3R BUMDes</p>
          <p style={{ fontSize: "10px", color: "var(--teal)", letterSpacing: ".1em", fontWeight: 600 }}>DESA BANYUBIRU</p>
        </div>
      </div>

      <div style={{ maxWidth: "520px", margin: "0 auto", background: "white", borderRadius: "14px", padding: "28px 24px", boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "22px", fontWeight: 800, marginBottom: "6px" }}>
          Lapor Masalah
        </h1>
        <p style={{ color: "#71807b", fontSize: "12px", marginBottom: "24px", lineHeight: 1.5, borderBottom: "1px solid var(--line)", paddingBottom: "16px" }}>
          Sampaikan keluhan atau laporan terkait pengelolaan sampah di lingkungan Desa Banyubiru.
          Laporan Anda sangat membantu petugas TPS3R.
        </p>

        {state === "error" && (
          <div style={{ background: "#fff5f5", border: "1px solid #fca5a5", borderRadius: "8px", padding: "12px 14px", marginBottom: "20px", display: "flex", gap: "10px", alignItems: "flex-start", fontSize: "12px", color: "#b91c1c" }}>
            <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: "2px" }} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <label style={labelStyle}>
            Nama Pelapor
            <input style={inputStyle} required placeholder="Nama lengkap Anda"
              value={form.nama_pelapor} onChange={e => set("nama_pelapor", e.target.value)} />
          </label>

          <label style={labelStyle}>
            No. HP / WhatsApp <span style={{ fontWeight: 400, color: "#a0aaa6" }}>(opsional, untuk tindak lanjut)</span>
            <input style={inputStyle} type="tel" placeholder="08xxxxxxxxxx"
              value={form.no_hp} onChange={e => set("no_hp", e.target.value)} />
          </label>

          <label style={labelStyle}>
            Lokasi Kejadian (RT/Dusun)
            <input style={inputStyle} placeholder="Contoh: RT 01 Dusun Tegalurung"
              value={form.alamat} onChange={e => set("alamat", e.target.value)} />
          </label>

          <label style={labelStyle}>
            Jenis Laporan / Keluhan
            <select required style={{ ...inputStyle, background: "white" }}
              value={form.kategori} onChange={e => set("kategori", e.target.value)}>
              <option value="">— Pilih jenis keluhan —</option>
              {KATEGORI_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </label>

          <label style={labelStyle}>
            Deskripsi Kejadian
            <textarea required rows={4} style={{ ...inputStyle, resize: "vertical" }}
              placeholder="Ceritakan detail kejadian: waktu, lokasi tepat, frekuensi, dan dampak yang dirasakan..."
              value={form.deskripsi} onChange={e => set("deskripsi", e.target.value)} />
          </label>

          <button type="submit" disabled={state === "submitting"} className="primary-button"
            style={{ justifyContent: "center", height: "46px", fontSize: "13px", marginTop: "4px" }}>
            <Send size={16} /> {state === "submitting" ? "Mengirim..." : "Kirim Laporan"}
          </button>
        </form>

        <p style={{ fontSize: "10px", color: "#a0aaa6", textAlign: "center", marginTop: "16px" }}>
          TPS3R BUMDes Banyubiru · Desa Banyubiru, Kab. Semarang
        </p>
      </div>
    </div>
  );
}