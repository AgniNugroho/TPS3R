"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, UserRound } from "lucide-react";
import FormShell from "@/components/dashboard/FormShell";
import { getSupabaseBrowserClient } from "@/lib/supabase/browserClient";
import { showErrorToast, showSuccessToast } from "@/components/ui/Toast";

export default function PengaturanPage() {
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [email, setEmail] = useState("");
    const [nama, setNama] = useState("");
    const [nomorHp, setNomorHp] = useState("");
    const [savingProfil, setSavingProfil] = useState(false);

    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [savingPassword, setSavingPassword] = useState(false);

    useEffect(() => {
        let cancelled = false;
        fetch("/api/me")
            .then((response) => response.json())
            .then((result) => {
                if (cancelled || !result.ok) return;
                setEmail(result.email ?? "");
                setNama(result.nama ?? "");
                setNomorHp(result.nomorHp ?? "");
            })
            .catch(() => undefined)
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    async function handleSaveProfil(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setSavingProfil(true);
        try {
            const response = await fetch("/api/me", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nama, nomorHp }),
            });
            const result = await response.json();
            if (!result.ok) {
                showErrorToast(result.error ?? "Gagal menyimpan profil.");
                return;
            }
            setNama(result.nama);
            setNomorHp(result.nomorHp ?? "");
            showSuccessToast("Profil diperbarui.");
            router.refresh();
        } catch {
            showErrorToast("Tidak dapat terhubung ke server.");
        } finally {
            setSavingProfil(false);
        }
    }

    async function handleChangePassword(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (newPassword.length < 6) {
            showErrorToast("Kata sandi baru minimal 6 karakter.");
            return;
        }
        if (newPassword !== confirmPassword) {
            showErrorToast("Konfirmasi kata sandi tidak cocok.");
            return;
        }
        if (newPassword === currentPassword) {
            showErrorToast("Kata sandi baru harus berbeda dari yang lama.");
            return;
        }

        setSavingPassword(true);
        try {
            const supabase = getSupabaseBrowserClient();
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (!user?.email) {
                showErrorToast("Sesi tidak valid. Silakan masuk ulang.");
                return;
            }

            const { error: reauthError } =
                await supabase.auth.signInWithPassword({
                    email: user.email,
                    password: currentPassword,
                });
            if (reauthError) {
                showErrorToast("Kata sandi saat ini salah.");
                return;
            }

            const { error: updateError } = await supabase.auth.updateUser({
                password: newPassword,
            });
            if (updateError) {
                showErrorToast("Gagal mengganti kata sandi.");
                return;
            }

            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
            showSuccessToast("Kata sandi berhasil diganti.");
        } catch {
            showErrorToast("Tidak dapat terhubung ke server.");
        } finally {
            setSavingPassword(false);
        }
    }

    return (
        <FormShell title="Pengaturan" activeLabel="Pengaturan">
            <main className="content-wrap">
                <div className="page-heading">
                    <div>
                        <p className="eyebrow">
                            <span className="live-dot" /> AKUN SAYA
                        </p>
                        <h1>Pengaturan</h1>
                        <p className="heading-copy">
                            Kelola data profil dan kata sandi akun Anda.
                        </p>
                    </div>
                </div>

                <div
                    style={{
                        display: "grid",
                        gap: "18px",
                        maxWidth: "560px",
                    }}
                >
                    <section className="panel">
                        <div className="panel-heading">
                            <div style={{ display: "flex", gap: "10px" }}>
                                <div
                                    style={{
                                        width: "34px",
                                        height: "34px",
                                        borderRadius: "8px",
                                        background: "var(--lime)",
                                        color: "var(--teal)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        flexShrink: 0,
                                    }}
                                >
                                    <UserRound size={17} />
                                </div>
                                <div>
                                    <h3>Profil</h3>
                                    <p>Nama dan nomor HP yang tampil di sistem.</p>
                                </div>
                            </div>
                        </div>

                        <form
                            onSubmit={handleSaveProfil}
                            style={{ marginTop: "18px" }}
                        >
                            <div
                                className="form-grid"
                                style={{
                                    gridTemplateColumns: "1fr",
                                    marginBottom: "16px",
                                }}
                            >
                                <label>
                                    Email
                                    <input
                                        type="email"
                                        value={email}
                                        disabled
                                        readOnly
                                        style={{
                                            background: "#f0f4f2",
                                            color: "#7c8a85",
                                            cursor: "not-allowed",
                                        }}
                                    />
                                    <span
                                        style={{
                                            fontWeight: 500,
                                            fontSize: "10px",
                                            color: "#8b9994",
                                        }}
                                    >
                                        Email tidak dapat diubah sendiri.
                                        Hubungi admin bila perlu diganti.
                                    </span>
                                </label>
                                <label>
                                    Nama lengkap
                                    <input
                                        type="text"
                                        required
                                        value={nama}
                                        disabled={loading}
                                        onChange={(event) =>
                                            setNama(event.target.value)
                                        }
                                        placeholder="Nama lengkap"
                                    />
                                </label>
                                <label>
                                    Nomor HP / WhatsApp
                                    <input
                                        type="tel"
                                        value={nomorHp}
                                        disabled={loading}
                                        onChange={(event) =>
                                            setNomorHp(event.target.value)
                                        }
                                        placeholder="0812xxxxxxxx (opsional)"
                                    />
                                </label>
                            </div>
                            <button
                                type="submit"
                                className="primary-button"
                                disabled={loading || savingProfil}
                            >
                                {savingProfil
                                    ? "Menyimpan..."
                                    : "Simpan Profil"}
                            </button>
                        </form>
                    </section>

                    <section className="panel">
                        <div className="panel-heading">
                            <div style={{ display: "flex", gap: "10px" }}>
                                <div
                                    style={{
                                        width: "34px",
                                        height: "34px",
                                        borderRadius: "8px",
                                        background: "#e6f2f7",
                                        color: "var(--blue)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        flexShrink: 0,
                                    }}
                                >
                                    <KeyRound size={17} />
                                </div>
                                <div>
                                    <h3>Ganti Kata Sandi</h3>
                                    <p>
                                        Masukkan kata sandi saat ini untuk
                                        konfirmasi.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <form
                            onSubmit={handleChangePassword}
                            style={{ marginTop: "18px" }}
                        >
                            <div
                                className="form-grid"
                                style={{
                                    gridTemplateColumns: "1fr",
                                    marginBottom: "16px",
                                }}
                            >
                                <label>
                                    Kata sandi saat ini
                                    <input
                                        type="password"
                                        required
                                        autoComplete="current-password"
                                        value={currentPassword}
                                        onChange={(event) =>
                                            setCurrentPassword(
                                                event.target.value,
                                            )
                                        }
                                    />
                                </label>
                                <label>
                                    Kata sandi baru
                                    <input
                                        type="password"
                                        required
                                        autoComplete="new-password"
                                        value={newPassword}
                                        onChange={(event) =>
                                            setNewPassword(event.target.value)
                                        }
                                        placeholder="Minimal 6 karakter"
                                    />
                                </label>
                                <label>
                                    Konfirmasi kata sandi baru
                                    <input
                                        type="password"
                                        required
                                        autoComplete="new-password"
                                        value={confirmPassword}
                                        onChange={(event) =>
                                            setConfirmPassword(
                                                event.target.value,
                                            )
                                        }
                                    />
                                </label>
                            </div>
                            <button
                                type="submit"
                                className="primary-button"
                                disabled={savingPassword}
                            >
                                {savingPassword
                                    ? "Menyimpan..."
                                    : "Ganti Kata Sandi"}
                            </button>
                        </form>
                    </section>
                </div>
            </main>
        </FormShell>
    );
}
