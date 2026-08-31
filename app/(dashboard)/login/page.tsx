"use client";

import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, LogIn, Mail } from "lucide-react";
import Image from "next/image";
import { getSupabaseBrowserClient } from "@/lib/supabase/browserClient";

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setSubmitting(true);
        setError(null);
        try {
            const supabase = getSupabaseBrowserClient();
            const { error: signInError } =
                await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
            if (signInError) {
                setError("Email atau kata sandi salah.");
                return;
            }
            const redirectedFrom =
                searchParams.get("redirectedFrom") ?? "/dashboard";
            router.replace(redirectedFrom);
            router.refresh();
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <main className="auth-shell">
            <aside className="auth-aside">
                <div className="brand-row">
                    <div className="brand-mark">
                        <Image
                            src="/logo_kab_mgl.png"
                            alt="Logo Kabupaten Magelang"
                            width={34}
                            height={42}
                            className="brand-logo"
                            priority
                        />
                    </div>
                    <div>
                        <p className="brand-name">DASH-SAMPAH</p>
                        <p className="brand-subtitle">KECAMATAN DUKUN</p>
                    </div>
                </div>
                <div className="auth-aside-copy">
                    <h2>
                        Pantau pengelolaan sampah desa dalam satu dashboard.
                    </h2>
                    <p>
                        Catat sampah masuk, pemilahan, bank sampah, hingga
                        residu — data selalu terpisah rapi per desa.
                    </p>
                </div>
                <p className="auth-aside-foot">
                    © {new Date().getFullYear()} DASH-SAMPAH DESA
                </p>
            </aside>
            <div className="auth-main">
                <div className="auth-card">
                    <p className="eyebrow">
                        <span className="live-dot" /> MASUK KE AKUN
                    </p>
                    <h1>Selamat datang kembali</h1>
                    <p className="heading-copy">
                        Masuk menggunakan akun petugas untuk mengelola data desa
                        Anda.
                    </p>
                    <form className="auth-form" onSubmit={handleSubmit}>
                        <label>
                            Email
                            <div className="input-with-icon">
                                <Mail size={16} />
                                <input
                                    type="email"
                                    required
                                    placeholder="email@gmail.com"
                                    value={email}
                                    onChange={(event) =>
                                        setEmail(event.target.value)
                                    }
                                    autoComplete="username"
                                />
                            </div>
                        </label>
                        <label>
                            Kata sandi
                            <div className="input-with-icon">
                                <Lock size={16} />
                                <input
                                    type="password"
                                    required
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(event) =>
                                        setPassword(event.target.value)
                                    }
                                    autoComplete="current-password"
                                />
                            </div>
                        </label>
                        {error && <p className="auth-error">{error}</p>}
                        <button
                            className="primary-button auth-submit"
                            type="submit"
                            disabled={submitting}
                        >
                            <LogIn size={16} />
                            {submitting ? "Memproses..." : "Masuk"}
                        </button>
                    </form>
                    <p className="auth-foot">
                        Butuh akses? Hubungi admin desa Anda.
                    </p>
                </div>
            </div>
        </main>
    );
}

export default function LoginPage() {
    return (
        <Suspense
            fallback={
                <main className="content-wrap">
                    <h1>Login</h1>
                </main>
            }
        >
            <LoginForm />
        </Suspense>
    );
}
