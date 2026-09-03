"use client";

import { useEffect, useState, FormEvent } from "react";
import FormShell from "@/components/dashboard/FormShell";
import { Users, Plus, CreditCard, Pencil, X, Save } from "lucide-react";
import toast from "react-hot-toast";
import EmptyState from "@/components/dashboard/EmptyState";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

// ── Types (aligned with Supabase SQL schema) ──────────────────────────────
type Kategori = "Rumah Tangga" | "Industri";
type Metode = "Cash" | "Transfer";
type StatusBayar = "Lunas" | "Belum Lunas";

interface Member {
  id: string;
  nama: string;
  kategori: Kategori;
  tarif_bulanan: number;   // SQL: tarif_bulanan
  jadwal_angkut: string;   // SQL: jadwal_angkut
  alamat: string;
  created_at: string;
}

interface Pembayaran {
  id: string;
  member_id: string;
  bulan_tahun: string;     // SQL: bulan_tahun TEXT e.g. "Agustus 2026"
  nominal: number;
  metode: Metode | null;
  status: StatusBayar;
  members?: { nama: string; kategori: Kategori; tarif_bulanan: number };
}

// ── Constants ─────────────────────────────────────────────────────────────
const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const TARIF_DEFAULT: Record<Kategori, number> = { "Rumah Tangga": 30000, "Industri": 150000 };
const JADWAL_DEFAULT: Record<Kategori, string> = { "Rumah Tangga": "Selasa & Kamis", "Industri": "Tiap Hari" };

function formatRupiah(n: number) { return "Rp " + n.toLocaleString("id-ID"); }

// ── Badges ────────────────────────────────────────────────────────────────
function KategoriBadge({ kategori }: { kategori: Kategori }) {
  const ind = kategori === "Industri";
  return (
    <span style={{
      padding: "2px 8px", borderRadius: "4px", fontSize: "10px", fontWeight: 700,
      backgroundColor: ind ? "#e4f3f8" : "#f3f9e7", color: ind ? "#347f9f" : "#71902c"
    }}>{kategori}</span>
  );
}

// ── Member Form Modal ─────────────────────────────────────────────────────
function MemberFormModal({ initial, onClose, onSave }: {
  initial?: Partial<Member>;
  onClose: () => void;
  onSave: (data: Partial<Member>) => Promise<void>;
}) {
  const [form, setForm] = useState<Partial<Member>>({
    nama: "", alamat: "", kategori: "Rumah Tangga",
    tarif_bulanan: TARIF_DEFAULT["Rumah Tangga"],
    jadwal_angkut: JADWAL_DEFAULT["Rumah Tangga"],
    ...initial,
  });
  const [saving, setSaving] = useState(false);

  function handleKategori(k: Kategori) {
    setForm(f => ({ ...f, kategori: k, tarif_bulanan: TARIF_DEFAULT[k], jadwal_angkut: JADWAL_DEFAULT[k] }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    await onSave(form);
    setSaving(false);
  }

  const inputStyle: React.CSSProperties = {
    padding: "9px 10px", borderRadius: "7px", border: "1px solid var(--line)", fontSize: "12px", outline: "none"
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(13,81,77,0.35)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
      <div style={{ background: "white", borderRadius: "12px", padding: "24px", width: "100%", maxWidth: "480px", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "16px", fontWeight: 800 }}>
            {initial?.id ? "Edit Member" : "Tambah Member Baru"}
          </h2>
          <button onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer", color: "#95a39e" }}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <label style={{ fontSize: "11px", fontWeight: 600, color: "#62736d", display: "flex", flexDirection: "column", gap: "5px" }}>
            Nama Lengkap / Nama Usaha
            <input required value={form.nama} onChange={e => setForm(f => ({ ...f, nama: e.target.value }))}
              style={inputStyle} placeholder="Contoh: Bapak Budi / Geprek Wow" />
          </label>

          <label style={{ fontSize: "11px", fontWeight: 600, color: "#62736d", display: "flex", flexDirection: "column", gap: "5px" }}>
            Alamat / Lokasi
            <input required value={form.alamat} onChange={e => setForm(f => ({ ...f, alamat: e.target.value }))}
              style={inputStyle} placeholder="Contoh: RT 01 Tegalurung" />
          </label>

          <div>
            <p style={{ fontSize: "11px", fontWeight: 600, color: "#62736d", marginBottom: "8px" }}>Kategori Member</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              {(["Rumah Tangga", "Industri"] as Kategori[]).map(k => (
                <button key={k} type="button" onClick={() => handleKategori(k)} style={{
                  padding: "10px", borderRadius: "8px", border: "2px solid",
                  borderColor: form.kategori === k ? "var(--teal)" : "var(--line)",
                  background: form.kategori === k ? "#e5f4ef" : "white",
                  cursor: "pointer", fontSize: "11px", fontWeight: 700,
                  color: form.kategori === k ? "var(--teal)" : "#62736d"
                }}>
                  {k}<br />
                  <span style={{ fontSize: "9px", fontWeight: 400, color: "#8b9994" }}>{JADWAL_DEFAULT[k]}</span>
                </button>
              ))}
            </div>
          </div>

          <label style={{ fontSize: "11px", fontWeight: 600, color: "#62736d", display: "flex", flexDirection: "column", gap: "5px" }}>
            Jadwal Angkut
            <input required value={form.jadwal_angkut} onChange={e => setForm(f => ({ ...f, jadwal_angkut: e.target.value }))}
              style={inputStyle} placeholder="Selasa & Kamis" />
          </label>

          <label style={{ fontSize: "11px", fontWeight: 600, color: "#62736d", display: "flex", flexDirection: "column", gap: "5px" }}>
            Tarif Bulanan (Rp)
            <input required type="number" value={form.tarif_bulanan} min={0} step={1000}
              onChange={e => setForm(f => ({ ...f, tarif_bulanan: Number(e.target.value) }))}
              style={inputStyle} />
            <span style={{ fontSize: "9px", color: "#a0aaa6" }}>Default: {formatRupiah(TARIF_DEFAULT[form.kategori ?? "Rumah Tangga"])}</span>
          </label>

          <button type="submit" disabled={saving} className="primary-button" style={{ marginTop: "4px", justifyContent: "center" }}>
            <Save size={16} /> {saving ? "Menyimpan..." : "Simpan Member"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Iuran / Pembayaran Tab ────────────────────────────────────────────────
function IuranTab({ members }: { members: Member[] }) {
  const now = new Date();
  const [bulan, setBulan] = useState(now.getMonth() + 1);
  const [tahun, setTahun] = useState(now.getFullYear());
  const [rows, setRows] = useState<Pembayaran[]>([]);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function loadIuran() {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from("pembayaran")
      .select("*")
      .eq("bulan_tahun", `${MONTHS[bulan - 1]} ${tahun}`);

    if (error) {
      toast.error("Gagal memuat iuran");
    }
    setRows(data ?? []);
    setLoading(false);
  }

  useEffect(() => { loadIuran(); }, [bulan, tahun]);

  const iuranMap = new Map(rows.map(r => [r.member_id, r]));
  const grid = members.map(m => ({ member: m, pembayaran: iuranMap.get(m.id) ?? null }));

  async function generateTagihan() {
    const missing = grid.filter(g => !g.pembayaran);
    if (missing.length === 0) {
      toast.success("Semua tagihan sudah digenerate!");
      return;
    }
    
    const supabase = getSupabaseBrowserClient();
    const payloads = missing.map(({ member }) => ({
      member_id: member.id,
      bulan_tahun: `${MONTHS[bulan - 1]} ${tahun}`,
      nominal: member.tarif_bulanan,
      status: "Belum Lunas",
    }));

    const { error } = await supabase.from("pembayaran").insert(payloads);
    if (error) {
      toast.error("Gagal generate tagihan: " + error.message);
    } else {
      toast.success(`${payloads.length} tagihan berhasil dibuat!`);
    }
    await loadIuran();
  }

  async function updateStatus(id: string, status: StatusBayar, metode: Metode | null) {
    setUpdatingId(id);
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.from("pembayaran").update({ status, metode }).eq("id", id);
    if (error) {
      toast.error("Gagal update status.");
    } else {
      toast.success("Status pembayaran diperbarui.");
    }
    setUpdatingId(null);
    await loadIuran();
  }

  const totalTagihan = grid.reduce((s, g) => s + g.member.tarif_bulanan, 0);
  const totalLunas = grid.filter(g => g.pembayaran?.status === "Lunas").reduce((s, g) => s + g.member.tarif_bulanan, 0);
  const totalBelum = totalTagihan - totalLunas;

  return (
    <div>
      {/* Filter bar */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "16px", alignItems: "center" }}>
        <select value={bulan} onChange={e => setBulan(Number(e.target.value))}
          style={{ padding: "7px 10px", borderRadius: "6px", border: "1px solid var(--line)", fontSize: "11px", outline: "none" }}>
          {MONTHS_SHORT.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
        <select value={tahun} onChange={e => setTahun(Number(e.target.value))}
          style={{ padding: "7px 10px", borderRadius: "6px", border: "1px solid var(--line)", fontSize: "11px", outline: "none" }}>
          {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <p style={{ fontSize: "11px", color: "#8b9994", margin: 0 }}>
          Periode: <strong>{MONTHS[bulan - 1]} {tahun}</strong>
        </p>
        <button onClick={generateTagihan} className="secondary-button" style={{ marginLeft: "auto" }}>
          <Plus size={14} /> Generate Tagihan
        </button>
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "10px", marginBottom: "20px" }}>
        {[
          { label: "Total Tagihan", val: totalTagihan, cls: "teal", color: undefined },
          { label: "Sudah Lunas", val: totalLunas, cls: "lime", color: "#4ca67d" },
          { label: "Belum Lunas", val: totalBelum, cls: "amber", color: "#c2783a" },
        ].map(c => (
          <div key={c.label} className={`stat-card ${c.cls}`} style={{ minHeight: "auto", padding: "14px 16px" }}>
            <p style={{ fontSize: "10px", color: "#778580", fontWeight: 600 }}>{c.label}</p>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: "18px", marginTop: "6px", color: c.color }}>{formatRupiah(c.val)}</h3>
          </div>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <p style={{ fontSize: "11px", color: "#8b9994", padding: "20px", textAlign: "center" }}>Memuat tagihan...</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--line)", color: "#8b9994" }}>
                {["Nama Member", "Kategori", "Tarif", "Status", "Metode", "Aksi"].map(h => (
                  <th key={h} style={{ padding: "10px", fontWeight: 600, textAlign: h === "Tarif" ? "right" : "center", ...(h === "Nama Member" || h === "Kategori" ? { textAlign: "left" } : {}) }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grid.map(({ member, pembayaran }) => {
                const isLunas = pembayaran?.status === "Lunas";
                return (
                  <tr key={member.id} style={{ borderBottom: "1px solid #eef2ef" }}>
                    <td style={{ padding: "10px", fontWeight: 600 }}>{member.nama}</td>
                    <td style={{ padding: "10px" }}><KategoriBadge kategori={member.kategori} /></td>
                    <td style={{ padding: "10px", textAlign: "right", fontWeight: 600 }}>{formatRupiah(member.tarif_bulanan)}</td>
                    <td style={{ padding: "10px", textAlign: "center" }}>
                      {pembayaran ? (
                        <span style={{
                          padding: "3px 8px", borderRadius: "4px", fontSize: "10px", fontWeight: 700,
                          backgroundColor: isLunas ? "#eaf7ef" : "#fff0de",
                          color: isLunas ? "#4ca67d" : "#c2783a"
                        }}>{pembayaran.status}</span>
                      ) : <span style={{ color: "#a0aaa6", fontSize: "10px" }}>—</span>}
                    </td>
                    <td style={{ padding: "10px", textAlign: "center", color: "#71807b" }}>
                      {pembayaran?.metode ?? "—"}
                    </td>
                    <td style={{ padding: "10px", textAlign: "center" }}>
                      {pembayaran && !isLunas ? (
                        <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                          {(["Cash", "Transfer"] as Metode[]).map(m => (
                            <button key={m} disabled={updatingId === pembayaran.id}
                              onClick={() => updateStatus(pembayaran.id, "Lunas", m)}
                              style={{ padding: "4px 8px", borderRadius: "5px", border: "1px solid var(--teal)", background: "white", color: "var(--teal)", fontSize: "10px", fontWeight: 700, cursor: "pointer" }}>
                              {m}
                            </button>
                          ))}
                        </div>
                      ) : pembayaran && isLunas ? (
                        <button onClick={() => updateStatus(pembayaran.id, "Belum Lunas", null)}
                          style={{ border: "none", background: "none", cursor: "pointer", color: "#a0aaa6", fontSize: "9px" }}>
                          Batal
                        </button>
                      ) : <span style={{ color: "#a0aaa6", fontSize: "10px" }}>Belum di-generate</span>}
                    </td>
                  </tr>
                );
              })}
              {grid.length === 0 && (
                <tr><td colSpan={6} style={{ padding: 0 }}>
                  <EmptyState title="Belum Ada Member" description="Tambahkan member terlebih dahulu untuk mengelola tagihan iuran bulanan." />
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

import { useAuth } from "@/components/providers/AuthProvider";
import { useRouter } from "next/navigation";

export default function MemberPage() {
  const { role } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<"daftar" | "iuran">("daftar");
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Member | null>(null);

  async function loadMembers() {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase.from("members").select("*").order("created_at", { ascending: false });
    if (error) toast.error("Gagal memuat data member.");
    setMembers(data ?? []);
    setLoading(false);
  }

  useEffect(() => { loadMembers(); }, []);

  async function saveMember(data: Partial<Member>) {
    const supabase = getSupabaseBrowserClient();
    let error;

    if (editTarget) {
      const res = await supabase.from("members").update(data).eq("id", editTarget.id);
      error = res.error;
    } else {
      const res = await supabase.from("members").insert([data]);
      error = res.error;
    }

    if (error) {
      toast.error(error.message || "Gagal menyimpan member.");
      return;
    }

    toast.success("Data member berhasil disimpan!");
    setShowModal(false);
    setEditTarget(null);
    await loadMembers();
  }

  useEffect(() => {
    if (role === "pengelola_sampah") {
      router.replace("/pengumpulan");
    }
  }, [role, router]);

  const rtCount = members.filter(m => m.kategori === "Rumah Tangga").length;
  const indCount = members.filter(m => m.kategori === "Industri").length;

  return (
    <FormShell title="Member & Iuran" activeLabel="Member">
      <main className="content-wrap">
        <div className="page-heading">
          <div>
            <p className="eyebrow"><span className="live-dot" /> MANAJEMEN MEMBER</p>
            <h1>Member & Iuran</h1>
            <p className="heading-copy">Kelola daftar member dan catat status pembayaran iuran bulanan.</p>
          </div>
          <div className="heading-actions">
            <button className="primary-button" onClick={() => { setEditTarget(null); setShowModal(true); }}>
              <Plus size={16} /> Tambah Member
            </button>
          </div>
        </div>

        {/* Summary KPI */}
        <section className="stat-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", marginBottom: "24px" }}>
          <article className="stat-card teal" style={{ minHeight: "auto" }}>
            <div className="stat-top">
              <div><p>Total Member</p><h2>{members.length}</h2></div>
              <div className="stat-icon"><Users size={20} /></div>
            </div>
          </article>
          <article className="stat-card lime" style={{ minHeight: "auto" }}>
            <div className="stat-top">
              <div><p>Rumah Tangga</p><h2>{rtCount}</h2></div>
              <div className="stat-icon"><Users size={20} /></div>
            </div>
          </article>
          <article className="stat-card blue" style={{ minHeight: "auto" }}>
            <div className="stat-top">
              <div><p>Industri</p><h2>{indCount}</h2></div>
              <div className="stat-icon"><Users size={20} /></div>
            </div>
          </article>
        </section>

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: "2px solid var(--line)", marginBottom: "20px" }}>
          {(["daftar", "iuran"] as const).map(key => (
            <button key={key} onClick={() => setTab(key)} style={{
              padding: "10px 18px", border: "none", background: "none", cursor: "pointer",
              fontSize: "12px", fontWeight: tab === key ? 800 : 500,
              color: tab === key ? "var(--teal)" : "#71807b",
              borderBottom: tab === key ? "2px solid var(--teal)" : "2px solid transparent",
              marginBottom: "-2px", display: "flex", alignItems: "center", gap: "6px"
            }}>
              {key === "daftar" ? <><Users size={14} /> Daftar Member</> : <><CreditCard size={14} /> Pembayaran Iuran</>}
            </button>
          ))}
        </div>

        {/* Tab Daftar */}
        {tab === "daftar" && (
          <div className="panel">
            {loading ? (
              <p style={{ color: "#8b9994", fontSize: "11px", padding: "20px", textAlign: "center" }}>Memuat data member...</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--line)", color: "#8b9994" }}>
                      <th style={{ padding: "10px", textAlign: "left", fontWeight: 600 }}>Nama</th>
                      <th style={{ padding: "10px", textAlign: "left", fontWeight: 600 }}>Alamat</th>
                      <th style={{ padding: "10px", textAlign: "left", fontWeight: 600 }}>Kategori</th>
                      <th style={{ padding: "10px", textAlign: "left", fontWeight: 600 }}>Jadwal</th>
                      <th style={{ padding: "10px", textAlign: "right", fontWeight: 600 }}>Tarif/Bln</th>
                      <th style={{ padding: "10px", textAlign: "center", fontWeight: 600 }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map(m => (
                      <tr key={m.id} style={{ borderBottom: "1px solid #eef2ef" }}>
                        <td style={{ padding: "10px", fontWeight: 600 }}>{m.nama}</td>
                        <td style={{ padding: "10px", color: "#71807b" }}>{m.alamat}</td>
                        <td style={{ padding: "10px" }}><KategoriBadge kategori={m.kategori} /></td>
                        <td style={{ padding: "10px", color: "#71807b", fontSize: "10px" }}>{m.jadwal_angkut}</td>
                        <td style={{ padding: "10px", textAlign: "right", fontWeight: 600 }}>{formatRupiah(m.tarif_bulanan)}</td>
                        <td style={{ padding: "10px", textAlign: "center" }}>
                          <button onClick={() => { setEditTarget(m); setShowModal(true); }}
                            style={{ border: "none", background: "none", cursor: "pointer", color: "var(--teal)" }}>
                            <Pencil size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {members.length === 0 && (
                      <tr><td colSpan={6} style={{ padding: 0 }}>
                        <EmptyState title="Belum Ada Member" description="Klik '+ Tambah Member' untuk memulai manajemen data pelanggan TPS3R." />
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab Iuran */}
        {tab === "iuran" && (
          <div className="panel">
            <IuranTab members={members} />
          </div>
        )}
      </main>

      {showModal && (
        <MemberFormModal
          initial={editTarget ?? undefined}
          onClose={() => { setShowModal(false); setEditTarget(null); }}
          onSave={saveMember}
        />
      )}
    </FormShell>
  );
}
