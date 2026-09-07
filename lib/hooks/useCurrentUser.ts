"use client";

import { useEffect, useState } from "react";

export type CurrentUser = {
    nama: string;
    nomorHp: string | null;
    role: "admin" | "petugas";
    roleLabel: string;
    desaId: string | null;
    desaNama: string | null;
};

export function useCurrentUser() {
    const [user, setUser] = useState<CurrentUser | null>(null);

    useEffect(() => {
        let cancelled = false;
        fetch("/api/me")
            .then((response) => response.json())
            .then((result) => {
                if (!cancelled && result.ok) {
                    setUser({
                        nama: result.nama,
                        nomorHp: result.nomorHp ?? null,
                        role: result.role,
                        roleLabel: result.roleLabel,
                        desaId: result.desaId,
                        desaNama: result.desaNama,
                    });
                }
            })
            .catch(() => undefined);
        return () => {
            cancelled = true;
        };
    }, []);

    return user;
}
