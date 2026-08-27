"use client";

import { useEffect, useState } from "react";

export type CurrentUser = {
    nama: string;
    role: "admin" | "petugas";
    roleLabel: string;
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
                        role: result.role,
                        roleLabel: result.roleLabel,
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
